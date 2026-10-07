// Pack models at run time. `npm run assets` publishes public/packs/index.json
// (which models fill which roles); this loads the models an area needs before
// it is built, and hands the generators ready-to-place geometry, objects and
// animated characters. With no packs, everything reports "none" and the game
// builds its own art as before.
import * as THREE from "three"
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js"
import { ROLES, matches, creatureRoles, weaponRoles } from "./roles.js"
import { CREATURES } from "../data/creatures.js"
import { Q } from "../core/quality.js"
import { WEAPON_BASES } from "../data/items.js"
import { UNIQUES } from "../data/artifacts.js"

creatureRoles(CREATURES)
weaponRoles(WEAPON_BASES, UNIQUES)

const DEG = Math.PI / 180

// The glTF loader is only fetched when there are packs to load.
let loaderPromise = null
function getLoader() {
  loaderPromise ||= Promise.all([import("three/examples/jsm/loaders/GLTFLoader.js"), import("three/examples/jsm/libs/meshopt_decoder.module.js")]).then(([{ GLTFLoader }, { MeshoptDecoder }]) => {
    const loader = new GLTFLoader()
    loader.setMeshoptDecoder(MeshoptDecoder)
    // phones and Low quality: the half-size textures the asset build publishes
    if (Q.packTex === "low" && assets.index.lowTextures) loader.manager.setURLModifier(url => url.replace(/\/textures\/(?!lo\/)/, "/textures/lo/"))
    return loader
  })
  return loaderPromise
}

// Copy a loaded geometry with plain float attributes (packs are quantised),
// so it can be transformed and merged like the game's own geometry.
function floatGeometry(src) {
  const geo = new THREE.BufferGeometry()
  for (const [name, a] of Object.entries(src.attributes)) {
    if (!["position", "normal", "uv", "color"].includes(name)) continue
    const size = name === "color" ? 3 : a.itemSize
    const arr = new Float32Array(a.count * size)
    for (let i = 0; i < a.count; i++) for (let k = 0; k < size; k++) arr[i * size + k] = a.getComponent(i, k)
    geo.setAttribute(name, new THREE.BufferAttribute(arr, size))
  }
  if (src.index) geo.setIndex(src.index.clone())
  if (!geo.attributes.normal) geo.computeVertexNormals()
  return geo
}

// Pack materials are re-made as the game's own (Lambert) materials, so they
// take the same light, fog and darkness as everything around them. Models
// that share a texture file (kit pieces on one atlas) share one texture and
// one material, so the pieces of a town merge into a few draw calls.
const converted = new WeakMap()
const sharedTextures = new Map() // texture file -> Texture
const sharedMaterials = new Map() // material signature -> material
function textureFile(gltf, tex) {
  const a = tex && gltf.parser.associations.get(tex)
  if (!a || a.textures == null) return null
  const t = gltf.parser.json.textures?.[a.textures]
  const img = t && (t.source ?? t.extensions?.EXT_texture_webp?.source)
  return gltf.parser.json.images?.[img]?.uri || null
}
function shareMaterial(gltf, src) {
  if (converted.has(src)) return converted.get(src)
  const files = {}
  for (const slot of ["map", "normalMap", "emissiveMap"]) {
    const file = textureFile(gltf, src[slot])
    files[slot] = file
    if (!file) continue
    if (sharedTextures.has(file)) src[slot] = sharedTextures.get(file)
    else sharedTextures.set(file, src[slot])
  }
  const key = [src.name, files.map, files.normalMap, files.emissiveMap, src.color?.getHex(), src.emissive?.getHex(), src.vertexColors, src.transparent, src.alphaTest, src.side, src.opacity].join("|")
  if (!files.map && !files.normalMap) return prepareMaterial(src) // nothing to share by
  if (!sharedMaterials.has(key)) sharedMaterials.set(key, prepareMaterial(src))
  const m = sharedMaterials.get(key)
  converted.set(src, m)
  return m
}
function prepareMaterial(src) {
  if (converted.has(src)) return converted.get(src)
  if (src.userData.packReady) return src
  const m = new THREE.MeshLambertMaterial({
    name: src.name,
    color: src.color ? src.color.clone() : 0xffffff,
    map: src.map || null,
    normalMap: src.normalMap || null,
    emissive: src.emissive ? src.emissive.clone() : 0x000000,
    emissiveMap: src.emissiveMap || null,
    emissiveIntensity: src.emissiveIntensity ?? 1,
    vertexColors: !!src.vertexColors,
    side: src.side,
    transparent: src.transparent,
    opacity: src.opacity,
    alphaTest: src.alphaTest,
  })
  if (src.normalScale && m.normalScale) m.normalScale.copy(src.normalScale)
  if (m.map) m.map.anisotropy = 4
  if (m.transparent && m.opacity >= 0.99) {
    // foliage cards: cut out instead of sorting
    m.transparent = false
    m.alphaTest = Math.max(m.alphaTest, 0.5)
  }
  m.userData.packReady = true
  converted.set(src, m)
  return m
}

// Held weapons keep their metal-and-gloss (PBR) look, which flat Lambert
// shading would wash out to white; clearcoat and the like are dropped.
function heldMaterial(src) {
  if (converted.has(src)) return converted.get(src)
  const m = new THREE.MeshStandardMaterial()
  for (const k of ["name", "map", "normalMap", "roughness", "metalness", "roughnessMap", "metalnessMap", "emissiveMap", "emissiveIntensity", "side", "transparent", "opacity", "alphaTest", "vertexColors"]) if (src[k] !== undefined) m[k] = src[k]
  m.color.copy(src.color)
  m.emissive.copy(src.emissive)
  // a mirror-bright blade right in front of the camera catches the sun and
  // floods the bloom: keep the metal response and glow subtle
  m.metalnessMap = null
  m.metalness = Math.min(m.metalness, 0.3)
  m.emissiveIntensity *= 0.25
  if (src.normalScale) m.normalScale.copy(src.normalScale)
  m.userData.packReady = true
  converted.set(src, m)
  return m
}

// entry.recolor: the texture is turned grey before the tint colours it, so a
// red imp can become a pale grey one (a plain tint only darkens or shifts).
function greyTexture(m) {
  m.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace(
      "#include <map_fragment>",
      "#include <map_fragment>\n  diffuseColor.rgb = diffuse * dot(diffuseColor.rgb / max(diffuse, vec3(1e-3)), vec3(0.299, 0.587, 0.114)) * 1.6;",
    )
  }
  m.customProgramCacheKey = () => "grey"
}

// ---------------------------------------------------------------- hands

// The bones of one hand (side "r" or "l"), named as in the Unreal mannequin
// rig the Quaternius characters use. null without at least a hand and elbow.
function handBones(model, side) {
  const all = []
  model.traverse(o => o.isBone && all.push(o))
  const f = n => all.find(b => new RegExp(`^${n}_?${side}$`, "i").test(b.name))
  const B = { hand: f("hand"), elbow: f("(lowerarm|forearm)"), index: f("index_01"), ring: f("ring_01") || f("pinky_01"), middle: f("middle_01"), tip: f("middle_03") || f("middle_02") }
  return B.hand && B.elbow && B.index && B.ring && B.middle && B.tip ? B : null
}

// Curl every finger joint into a fist (the thumb a little, across the grip).
const FIST = 1.35
function closeFist(hand) {
  hand.traverse(b => {
    if (b.isBone && b !== hand) b.rotateX(/thumb/i.test(b.name) ? -FIST * 0.35 : FIST)
  })
}

// Where a closed fist holds things, in the space `inv` maps world into: the
// grip line runs across the knuckles (index to ring), just inside the palm.
function gripFrame(B, inv) {
  const at = b => b.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv)
  const ki = at(B.index)
  const kr = at(B.ring)
  const km = at(B.middle)
  const h = at(B.hand)
  const tip = at(B.tip)
  const blade = ki.clone().sub(kr).normalize()
  const fingers = km.clone().sub(h)
  fingers.addScaledVector(blade, -fingers.dot(blade)).normalize()
  // the palm faces the way the curled fingers fold
  const palm = new THREE.Vector3().crossVectors(fingers, blade)
  if (palm.dot(tip.clone().sub(km)) < 0) palm.negate()
  const span = ki.distanceTo(kr)
  const center = ki.clone().add(kr).multiplyScalar(0.5).addScaledVector(palm, span * 0.75).addScaledVector(fingers, span * 0.25)
  return { center, blade, fingers, palm, span }
}

// "MI_Skin_*" -> /^MI_Skin_.*$/i
function globRe(glob) {
  return new RegExp(`^${glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`, "i")
}

// The triangles of a skinned mesh whose vertices mostly follow the given
// bones or their children. Cached per source geometry and bone list.
function keepBoneRegion(mesh, boneNames, cache) {
  const key = `${mesh.geometry.uuid}|${boneNames.join(",")}`
  if (cache.has(key)) return cache.get(key)
  const bones = mesh.skeleton.bones
  const keep = new Set()
  bones.forEach((b, i) => {
    for (let o = b; o; o = o.parent) if (boneNames.includes(o.name)) return keep.add(i)
  })
  const geo = mesh.geometry
  const si = geo.attributes.skinIndex
  const sw = geo.attributes.skinWeight
  const inRegion = new Uint8Array(si.count)
  for (let v = 0; v < si.count; v++) {
    let best = 0
    for (let k = 1; k < 4; k++) if (sw.getComponent(v, k) > sw.getComponent(v, best)) best = k
    inRegion[v] = keep.has(si.getComponent(v, best)) ? 1 : 0
  }
  const src = geo.index ? geo.index.array : Array.from({ length: si.count }, (_, i) => i)
  const out = []
  for (let t = 0; t < src.length; t += 3) if (inRegion[src[t]] + inRegion[src[t + 1]] + inRegion[src[t + 2]] >= 2) out.push(src[t], src[t + 1], src[t + 2])
  const trimmed = geo.clone()
  trimmed.setIndex(out)
  cache.set(key, trimmed)
  return trimmed
}

export class AssetRegistry {
  constructor() {
    this.index = { models: {}, roles: {}, animations: {} }
    this.gltf = new Map() // model id -> loaded glTF
    this.pending = new Map() // model id -> Promise
    this.partsCache = new Map()
  }

  // Read public/packs/index.json once at start-up. Missing or empty = no packs.
  async init() {
    try {
      const res = await fetch("packs/index.json", { cache: "no-cache" })
      if (res.ok) this.index = await res.json()
    } catch {
      /* no packs */
    }
    this.index.models ||= {}
    this.index.roles ||= {}
    this.index.animations ||= {}
    this.index.kits ||= {}
    this._held = null
    return this
  }

  get enabled() {
    return Object.keys(this.index.roles).length > 0
  }

  // ---------------------------------------------------------------- choosing

  // Entries for a role that match the context and whose model is loaded.
  entries(role, ctx = {}) {
    const list = this.index.roles[role]
    if (!list) return []
    return list.filter(e => this.gltf.has(e.model) && matches(e, ctx))
  }

  // A modular kit (see kit.js) whose models are loaded and that suits ctx.
  kit(name, ctx = {}, r = Math.random()) {
    const list = (this.index.kits[name] || []).filter(k => matches(k, ctx) && kitModels(k).every(id => this.gltf.has(id)))
    return list.length ? list[Math.floor(r * list.length) % list.length] : null
  }

  // Merge one model, placed by its own origin, into a geometry Builder.
  bakeModel(builder, id, matrix) {
    this.bake(builder, { model: id, front: "-z", align: "pivot" }, "kit", {}, matrix)
  }

  has(role, ctx) {
    return this.entries(role, ctx).length > 0
  }

  // Pick an entry by weight. `r` is a number in [0, 1) or an RNG with next().
  pick(role, ctx, r = Math.random()) {
    const list = this.entries(role, ctx)
    if (!list.length) return null
    const u = typeof r === "number" ? r : r.next()
    const total = list.reduce((s, e) => s + (e.weight ?? 1), 0)
    let acc = u * total
    for (const e of list) if ((acc -= e.weight ?? 1) < 0) return e
    return list[list.length - 1]
  }

  // ---------------------------------------------------------------- loading

  // Model ids (including animation clip sources) for the roles that pass `test`.
  modelsFor(test) {
    const ids = new Set()
    for (const [role, list] of Object.entries(this.index.roles)) {
      for (const e of list) {
        if (!test(role, e)) continue
        ids.add(e.model)
        const lod = this.index.models[e.model]?.lod
        if (lod) ids.add(lod)
        for (const slot of Object.values(e.parts || {})) for (const id of slot) if (id) ids.add(id)
        const set = e.anims && this.index.animations[e.anims]
        if (set) for (const c of Object.values(set)) ids.add(c.model)
      }
    }
    return [...ids]
  }

  // models used only as held weapons and shields
  heldModels() {
    if (!this._held) {
      const held = new Set(this.modelsFor(role => ROLES[role]?.group === "weapon"))
      for (const id of this.modelsFor(role => ROLES[role]?.group !== "weapon")) held.delete(id)
      this._held = held
    }
    return this._held
  }

  missing(ids) {
    return ids.filter(id => !this.gltf.has(id) && this.index.models[id])
  }

  // Load models; onProgress(fraction, label) follows the bytes downloaded.
  async load(ids, onProgress = () => {}) {
    const todo = this.missing(ids)
    if (!todo.length) return
    const loader = await getLoader()
    const total = todo.reduce((s, id) => s + (this.index.models[id].bytes || 1), 0)
    let done = 0
    onProgress(0, "Unpacking models")
    await Promise.all(
      todo.map(id => {
        if (!this.pending.has(id)) {
          const m = this.index.models[id]
          const url = `${m.url}?v=${this.index.version || 0}`
          this.pending.set(
            id,
            loader
              .loadAsync(url)
              .then(g => {
                const held = this.heldModels().has(id)
                const convert = m => (held ? heldMaterial(m) : shareMaterial(g, m))
                g.scene.traverse(o => {
                  if (o.isMesh) {
                    o.castShadow = true
                    o.receiveShadow = true
                    o.material = Array.isArray(o.material) ? o.material.map(convert) : convert(o.material)
                  }
                })
                g.scene.updateMatrixWorld(true)
                this.gltf.set(id, g)
              })
              .catch(e => console.warn(`Pack model ${id} failed to load:`, e.message)),
          )
        }
        return this.pending.get(id).then(() => {
          done += this.index.models[id].bytes || 1
          onProgress(done / total, "Unpacking models")
        })
      }),
    )
  }

  // ---------------------------------------------------------------- placing

  // The matrix that takes the model from its file into "placed" space: base
  // centred on the origin, front facing -Z (the game's convention), sized
  // according to the role's fit. `dims` gives the target size: {w, d, h}.
  entryMatrix(entry, role, dims = {}) {
    const m = this.index.models[entry.model]
    const r = ROLES[role] || {}
    const fit = entry.fit || r.fit || "none"
    const size = m.size
    const min = m.min
    const max = m.max
    let sx = 1
    let sy = 1
    let sz = 1
    const k = entry.scale ?? 1
    // the model's front: +Z by default (glTF). Placed objects face -Z (the
    // generators' convention); characters and creatures face +Z, like the
    // game's actors (yaw = atan2(dx, dz)).
    // Held items keep the file's orientation unless `front` says otherwise.
    const actor = r.group === "character" || r.group === "creature"
    const held = r.group === "weapon"
    const turn = held && !entry.front ? 0 : { "+z": Math.PI, "-z": 0, "+x": Math.PI / 2, "-x": -Math.PI / 2 }[entry.front || "+z"] + (actor ? Math.PI : 0)
    const yaw = (entry.yaw ?? 0) * DEG + turn
    const turned = Math.abs(Math.sin(yaw)) > 0.7 // footprint axes swap
    const w0 = turned ? size[2] : size[0]
    const d0 = turned ? size[0] : size[2]
    if (fit === "height") sx = sy = sz = ((entry.height ?? dims.h ?? r.height) / Math.max(1e-3, size[1])) * k
    else if (fit === "length") {
      // as long as the game's weapon, but no wider than a hand's span of guard
      const wide = Math.max(size[0], size[2])
      sx = sy = sz = Math.min((entry.height ?? dims.h ?? r.height) / Math.max(1e-3, max[1]), (dims.maxWidth ?? 0.34) / Math.max(1e-3, wide)) * k
    }
    else if (fit === "footprint" && dims.w) sx = sy = sz = Math.min(dims.w / Math.max(1e-3, w0), dims.d / Math.max(1e-3, d0)) * k
    else if (fit === "cell") {
      sx = (dims.w ?? w0) / Math.max(1e-3, w0)
      sz = dims.d != null ? dims.d / Math.max(1e-3, d0) : 1
      sy = dims.h != null ? dims.h / Math.max(1e-3, size[1]) : 1
      if (turned) [sx, sz] = [sz, sx]
    } else sx = sy = sz = k
    const align = entry.align || (held ? "pivot" : fit === "cell" && role === "dungeon.floor" ? "top" : "base")
    const ox = -(min[0] + max[0]) / 2
    const oz = -(min[2] + max[2]) / 2
    const oy = align === "top" ? -max[1] : align === "center" ? -(min[1] + max[1]) / 2 : align === "pivot" ? 0 : -min[1]
    const off = entry.offset || [0, 0, 0]
    const rot = entry.rotate || [0, 0, 0]
    return new THREE.Matrix4()
      .makeTranslation(off[0], off[1], off[2])
      .multiply(new THREE.Matrix4().makeRotationY(yaw))
      .multiply(new THREE.Matrix4().makeScale(sx, sy, sz))
      .multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rot[0] * DEG, rot[1] * DEG, rot[2] * DEG)))
      .multiply(new THREE.Matrix4().makeTranslation(align === "pivot" ? 0 : ox, oy, align === "pivot" ? 0 : oz))
  }

  // Placed size of an entry (after fit), for colliders.
  placedSize(entry, role, dims) {
    const m = this.index.models[entry.model]
    const box = new THREE.Box3(new THREE.Vector3(...m.min), new THREE.Vector3(...m.max)).applyMatrix4(this.entryMatrix(entry, role, dims))
    return box.getSize(new THREE.Vector3())
  }

  // The simplified far version of an entry's model, if the pack build made one.
  lodParts(entry, role, dims = {}) {
    const lod = this.index.models[entry.model]?.lod
    return lod && this.gltf.has(lod) ? this.parts(entry, role, dims, lod) : null
  }

  // Static model as merge-ready parts: [{geo, mat}] with the entry transform
  // baked in. Shared and cached; callers clone if they modify.
  parts(entry, role, dims = {}, modelId = entry.model) {
    const key = `${modelId}|${role}|${dims.w}|${dims.d}|${dims.h}|${JSON.stringify([entry.scale, entry.fit, entry.yaw, entry.front, entry.rotate, entry.offset, entry.align, entry.height])}`
    if (this.partsCache.has(key)) return this.partsCache.get(key)
    const g = this.gltf.get(modelId)
    const base = this.entryMatrix(entry, role, dims)
    const out = []
    g.scene.traverse(o => {
      // skinned props (a chest with an opening lid) bake in their rest pose
      if (!o.isMesh) return
      const geo = floatGeometry(o.geometry)
      geo.applyMatrix4(base.clone().multiply(o.matrixWorld))
      const mats = Array.isArray(o.material) ? o.material : [o.material]
      if (mats.length > 1 && geo.groups.length) {
        // split multi-material meshes into one part per material
        for (const grp of o.geometry.groups) {
          const sub = geo.index ? new THREE.BufferGeometry() : geo.clone()
          if (geo.index) {
            for (const [n, a] of Object.entries(geo.attributes)) sub.setAttribute(n, a)
            sub.setIndex(new THREE.BufferAttribute(geo.index.array.slice(grp.start, grp.start + grp.count), 1))
          }
          out.push({ geo: sub, mat: mats[grp.materialIndex] })
        }
      } else out.push({ geo, mat: mats[0] })
    })
    this.partsCache.set(key, out)
    return out
  }

  // The trunk of a placed tree or rock, measured from the model: where its
  // geometry meets the ground (0.2 to 1.2 m up) -> { x, z, r } in placed
  // space, or null when nothing stands there. Cached per entry.
  trunk(entry, role) {
    this.trunkCache ||= new Map()
    const key = `${entry.model}|${role}|${JSON.stringify([entry.scale, entry.yaw, entry.front, entry.rotate, entry.offset])}`
    if (this.trunkCache.has(key)) return this.trunkCache.get(key)
    const pts = []
    const v = new THREE.Vector3()
    for (const { geo } of this.parts(entry, role)) {
      const pos = geo.attributes.position
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i)
        if (v.y > 0.2 && v.y < 1.2) pts.push([v.x, v.z])
      }
    }
    let out = null
    if (pts.length >= 3) {
      const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length
      const cz = pts.reduce((a, p) => a + p[1], 0) / pts.length
      const d = pts.map(p => Math.hypot(p[0] - cx, p[1] - cz)).sort((a, b) => a - b)
      // most of the trunk, not a stray root or low branch
      out = { x: cx, z: cz, r: Math.max(0.15, d[Math.floor(d.length * 0.85)]) }
    }
    this.trunkCache.set(key, out)
    return out
  }

  // Merge a static model into a geometry Builder at `matrix` (placed space).
  bake(builder, entry, role, dims, matrix) {
    for (const part of this.parts(entry, role, dims)) builder.add(part.geo, part.mat, { matrix, uv: "keep" })
  }

  // A static model as an Object3D (shares geometry and materials). A rigged
  // prop gets its own skeleton; holder.userData.pose(name, f) then poses it
  // at fraction f of the clip whose name contains `name` (e.g. a chest lid).
  object(entry, role, dims = {}) {
    const g = this.gltf.get(entry.model)
    const holder = new THREE.Group()
    let rigged = false
    g.scene.traverse(o => (rigged ||= !!o.isSkinnedMesh))
    const inner = rigged ? cloneSkinned(g.scene) : g.scene.clone(true)
    inner.matrixAutoUpdate = false
    inner.matrix.copy(this.entryMatrix(entry, role, dims))
    holder.add(inner)
    if (rigged && g.animations.length) {
      inner.traverse(o => o.isSkinnedMesh && (o.frustumCulled = false))
      const mixer = new THREE.AnimationMixer(inner)
      holder.userData.pose = (name, f = 1) => {
        const clip = g.animations.find(c => c.name.toLowerCase().includes(name.toLowerCase()))
        if (!clip) return false
        mixer.stopAllAction()
        const a = mixer.clipAction(clip)
        a.play()
        a.paused = true
        a.time = Math.min(0.999, Math.max(0, f)) * clip.duration
        mixer.update(0)
        return true
      }
    }
    return holder
  }

  // ---------------------------------------------------------------- characters

  // A clip from an animation set, fitted to the model that plays it. Clips
  // borrowed from another file keep their rotations; the root's movement is
  // rescaled by the ratio of the two skeletons' hip heights (rigs exported in
  // centimetres and metres then agree), and other bones keep their own rest
  // positions.
  clip(set, name, targetId) {
    const ref = this.index.animations[set]?.[name]
    if (!ref) return null
    const g = this.gltf.get(ref.model)
    const clip = g?.animations.find(c => c.name === ref.clip) || null
    if (!clip || ref.model === targetId) return clip
    const key = `${set}|${name}|${targetId}`
    this.clipCache ||= new Map()
    if (this.clipCache.has(key)) return this.clipCache.get(key)
    const target = this.gltf.get(targetId)
    const boneOf = (scene, n) => scene.getObjectByName(n)
    const posTracks = clip.tracks.filter(t => t.name.endsWith(".position"))
    // the root: the moved bone highest up its hierarchy
    let root = null
    let rootDepth = Infinity
    for (const t of posTracks) {
      const bone = boneOf(g.scene, t.name.slice(0, -9))
      if (!bone) continue
      let d = 0
      for (let o = bone; o.parent; o = o.parent) d++
      if (d < rootDepth) (rootDepth = d), (root = t.name.slice(0, -9))
    }
    let k = 1
    const srcHip = root && boneOf(g.scene, root)
    const dstHip = root && boneOf(target.scene, root)
    if (srcHip && dstHip) {
      const a = srcHip.position.length()
      const b = dstHip.position.length()
      if (a > 1e-6 && b > 1e-6) k = b / a
    }
    const tracks = []
    for (const t of clip.tracks) {
      if (t.name.endsWith(".scale")) continue
      if (t.name.endsWith(".position")) {
        if (t.name.slice(0, -9) !== root) continue
        const c = t.clone()
        for (let i = 0; i < c.values.length; i++) c.values[i] *= k
        tracks.push(c)
      } else if (t.name.endsWith(".quaternion")) {
        // move the rotation from the source bone's rest pose onto the target's
        const n = t.name.slice(0, -11)
        const sb = boneOf(g.scene, n)
        const db = boneOf(target.scene, n)
        if (!sb || !db || sb.quaternion.angleTo(db.quaternion) < 1e-3) {
          tracks.push(t)
          continue
        }
        const fix = db.quaternion.clone().multiply(sb.quaternion.clone().invert())
        const c = t.clone()
        const q = new THREE.Quaternion()
        for (let i = 0; i < c.values.length; i += 4) {
          q.fromArray(c.values, i).premultiply(fix)
          q.toArray(c.values, i)
        }
        tracks.push(c)
      } else tracks.push(t)
    }
    const fitted = new THREE.AnimationClip(clip.name, clip.duration, tracks)
    this.clipCache.set(key, fitted)
    return fitted
  }

  // An animated character or creature with the same interface as the game's
  // own builders: { group, anim(t, speed, attack, opts), rig: { head } }.
  //   ctx.seed    picks one model per entry.parts slot (hair, beard, ...)
  //   ctx.parts   { slot: model id or null } chosen parts instead (the player)
  //   ctx.tints   { key: colour } applied to materials named in entry.tint
  character(entry, role, dims = {}, ctx = {}) {
    const g = this.gltf.get(entry.model)
    const holder = new THREE.Group()
    const inner = new THREE.Group()
    const model = cloneSkinned(g.scene)
    inner.add(model)
    inner.matrixAutoUpdate = false
    inner.matrix.copy(this.entryMatrix(entry, role, dims))
    holder.add(inner)
    holder.userData.pack = true

    // extra skinned parts (hair, eyebrows, beards) bound to this skeleton
    let s = (ctx.seed ?? Math.random() * 1e9) >>> 0
    const rnd = () => ((s = (Math.imul(s ^ (s >>> 15), 2246822519) + 0x9e3779b9) >>> 0) % 100000) / 100000
    if (entry.parts) {
      const bones = {}
      model.traverse(o => o.isBone && (bones[o.name] = o))
      let anchor = null
      model.traverse(o => !anchor && o.isSkinnedMesh && (anchor = o.parent))
      anchor ||= model
      for (const [name, slot] of Object.entries(entry.parts)) {
        const roll = slot[Math.floor(rnd() * slot.length)]
        const id = ctx.parts && name in ctx.parts ? ctx.parts[name] : roll
        const pg = id && this.gltf.get(id)
        if (!pg) continue
        const part = cloneSkinned(pg.scene)
        const meshes = []
        part.traverse(o => o.isSkinnedMesh && meshes.push(o))
        for (const m of meshes) {
          const skel = new THREE.Skeleton(m.skeleton.bones.map(b => bones[b.name] || b), m.skeleton.boneInverses)
          anchor.add(m)
          m.bind(skel, m.bindMatrix)
        }
      }
    }
    // entry.keep: { materialGlob: [bone names] } keeps only the part of those
    // meshes driven by the bones (and their children), e.g. just the head of a
    // base body, so it doesn't show through clothes made for another build
    if (entry.keep) {
      for (const [glob, boneNames] of Object.entries(entry.keep)) {
        const re = globRe(glob)
        model.traverse(o => {
          if (!o.isSkinnedMesh || !re.test(o.material.name)) return
          o.geometry = keepBoneRegion(o, boneNames, this.trimCache ||= new Map())
        })
      }
    }
    // per-character colours: skin by race, hair colour
    const tints = entry.tint ? Object.entries(entry.tint) : []
    model.traverse(o => {
      if (!o.isMesh) return
      o.castShadow = true
      o.frustumCulled = false // skinned bounds don't follow the pose
      for (const [glob, key] of tints) {
        const c = ctx.tints?.[key]
        if (c == null || !globRe(glob).test(o.material.name)) continue
        o.material = o.material.clone()
        o.material.color.multiply(new THREE.Color(c))
        if (entry.recolor) greyTexture(o.material)
      }
    })

    // clips: the entry's animation set, else the model's own clips by name
    const own = name => g.animations.find(c => c.name.toLowerCase().includes(name))
    const clips = {}
    for (const name of ["idle", "walk", "run", "attack", "attack2", "attack3", "cast", "hit", "die", "talk", "work"]) {
      const c = (entry.anims && this.clip(entry.anims, name, entry.model)) || own(name === "die" ? "death" : name) || (name === "die" ? own("die") : null)
      if (c) clips[name] = c
    }
    if (!clips.idle && g.animations[0]) clips.idle = g.animations[0]
    const mixer = new THREE.AnimationMixer(model)
    const actions = {}
    for (const [name, c] of Object.entries(clips)) {
      const a = mixer.clipAction(c)
      a.enabled = true
      a.setEffectiveWeight(0)
      a.play()
      if (["attack", "attack2", "attack3", "cast", "hit", "die"].includes(name)) {
        a.setLoop(THREE.LoopOnce, 1)
        a.clampWhenFinished = true
        a.paused = true // timed by the game below
      }
      actions[name] = a
    }
    const weights = { idle: 1, walk: 0, run: 0, talk: 0, work: 0 }
    if (actions.idle) actions.idle.setEffectiveWeight(1)
    const strike = entry.strike ?? 0.45 // where in the attack clip the blow lands
    let lastT = null
    let lastAttack = 0
    let rising = true

    // head: an unscaled anchor on the head bone, for the conversation camera
    let headBone = null
    model.traverse(o => {
      if (!headBone && o.isBone && /(^|[^a-z])head$|head$|_head|head_/i.test(o.name) && !/end|top|nub/i.test(o.name)) headBone = o
    })
    const head = new THREE.Object3D()
    if (headBone) {
      holder.updateMatrixWorld(true)
      const s = new THREE.Vector3()
      headBone.getWorldScale(s)
      head.scale.set(1 / s.x, 1 / s.y, 1 / s.z)
      headBone.add(head)
    } else {
      head.position.y = (dims.h || 1.7) - 0.12
      holder.add(head)
    }

    const timed = (name, f) => {
      const a = actions[name]
      if (!a) return false
      a.paused = true
      a.time = Math.max(0, Math.min(0.999, f)) * a.getClip().duration
      a.setEffectiveWeight(1)
      return true
    }
    const anim = (t, speed = 0, attack = 0, opts = {}) => {
      const dt = lastT == null ? 0 : Math.max(0, Math.min(0.1, t - lastT))
      lastT = t
      for (const n of ["attack", "attack2", "attack3", "cast", "hit", "die"]) actions[n]?.setEffectiveWeight(0)
      let override = false
      if (opts.dying !== undefined) {
        override = timed("die", opts.dying)
        // no death clip: topple over
        inner.matrix.copy(this.entryMatrix(entry, role, dims))
        if (!override) inner.matrix.premultiply(new THREE.Matrix4().makeRotationX(-Math.min(1, opts.dying) * Math.PI / 2))
      } else if (attack > 0.001) {
        if (attack > lastAttack + 1e-4) rising = true
        else if (attack < lastAttack - 1e-4) rising = false
        const variant = ["attack", "attack2", "attack3"][opts.variant || 0] || "attack"
        override = timed(actions[variant] ? variant : "attack", rising ? attack * strike : strike + (1 - attack) * (1 - strike))
      }
      lastAttack = attack
      if (!override && opts.flinch > 0.05) timed("hit", 1 - opts.flinch)
      // locomotion and idle layers, blended smoothly
      const target = { idle: 0, walk: 0, run: 0, talk: 0, work: 0 }
      if (override) target.idle = 0
      else if (speed > 0.05) {
        const runK = actions.run ? Math.min(1, Math.max(0, (speed - 0.45) / 0.35)) : 0
        target.run = runK
        target.walk = actions.walk ? 1 - runK : 0
        if (!actions.walk && !actions.run) target.idle = 1
      } else if (opts.talk && actions.talk) target.talk = 1
      else if (attack > 0 && actions.work && !actions.attack) target.work = 1
      else target.idle = 1
      const k = Math.min(1, dt * 8)
      for (const n of Object.keys(target)) {
        if (!actions[n]) continue
        weights[n] += (target[n] - weights[n]) * (dt ? k : 1)
        actions[n].setEffectiveWeight(weights[n])
        if (n === "walk" || n === "run") actions[n].setEffectiveTimeScale(Math.max(0.5, speed * 1.4))
      }
      mixer.update(dt)
    }
    anim(0)
    return { group: holder, anim, rig: { head, pack: true }, mixer, model }
  }

  // A forearm and hand cut from a character (its own outfit, skin and tints),
  // as static meshes for the first-person view. The fist is closed and its
  // grip is at the origin: a held item at the origin pointing up (+Y) passes
  // through the hand. The forearm runs back along +Z. side: "r" or "l";
  // length: forearm length in the result's units. userData.palm is the way
  // the palm faces.
  limb(char, side = "r", length = 0.47) {
    const model = char.model
    const B = handBones(model, side)
    if (!B) return null
    // bind pose with the fist closed
    model.traverse(o => o.isSkinnedMesh && o.skeleton.pose())
    closeFist(B.hand)
    char.group.updateMatrixWorld(true)
    const inv = new THREE.Matrix4().copy(char.group.matrixWorld).invert()
    const grip = gripFrame(B, inv)
    const e = B.elbow.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv)
    // basis: y along the grip, z back toward the elbow
    const y = grip.blade
    const z = e.clone().sub(grip.center)
    z.addScaledVector(y, -z.dot(y)).normalize()
    const x = y.clone().cross(z)
    const k = length / e.distanceTo(B.hand.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv))
    const rot = new THREE.Matrix4().makeBasis(x, y, z).transpose()
    const toArm = rot.clone().premultiply(new THREE.Matrix4().makeScale(k, k, k)).multiply(new THREE.Matrix4().makeTranslation(-grip.center.x, -grip.center.y, -grip.center.z))
    const region = new Set()
    B.elbow.traverse(b => b.isBone && region.add(b))
    const out = new THREE.Group()
    out.userData.palm = grip.palm.clone().applyMatrix4(rot)
    const v = new THREE.Vector3()
    model.traverse(o => {
      if (!o.isSkinnedMesh || !o.visible) return
      const geo = o.geometry
      const si = geo.attributes.skinIndex
      const sw = geo.attributes.skinWeight
      const pos = geo.attributes.position
      const inR = new Uint8Array(pos.count)
      for (let i = 0; i < pos.count; i++) {
        let best = 0
        for (let c = 1; c < 4; c++) if (sw.getComponent(i, c) > sw.getComponent(i, best)) best = c
        inR[i] = region.has(o.skeleton.bones[si.getComponent(i, best)]) ? 1 : 0
      }
      const idx = geo.index ? geo.index.array : Array.from({ length: pos.count }, (_, i) => i)
      const tris = []
      for (let t = 0; t < idx.length; t += 3) if (inR[idx[t]] && inR[idx[t + 1]] && inR[idx[t + 2]]) tris.push(idx[t], idx[t + 1], idx[t + 2])
      if (!tris.length) return
      const toLocal = new THREE.Matrix4().copy(o.matrixWorld).premultiply(inv).premultiply(toArm)
      const used = [...new Set(tris)]
      const remap = new Map(used.map((i, n) => [i, n]))
      const P = new Float32Array(used.length * 3)
      used.forEach((i, n) => {
        v.fromBufferAttribute(pos, i)
        o.applyBoneTransform(i, v)
        v.applyMatrix4(toLocal)
        P.set([v.x, v.y, v.z], n * 3)
      })
      const g = new THREE.BufferGeometry()
      g.setAttribute("position", new THREE.BufferAttribute(P, 3))
      // texture coordinates and vertex colours come along unchanged
      for (const name of ["uv", "color"]) {
        const a = geo.attributes[name]
        if (!a) continue
        const out = new Float32Array(used.length * a.itemSize)
        used.forEach((i, n) => {
          for (let c = 0; c < a.itemSize; c++) out[n * a.itemSize + c] = a.getComponent(i, c)
        })
        g.setAttribute(name, new THREE.BufferAttribute(out, a.itemSize))
      }
      g.setIndex(tris.map(i => remap.get(i)))
      g.computeVertexNormals()
      const m = new THREE.Mesh(g, o.material)
      m.castShadow = false
      m.receiveShadow = false // held in front of the camera, inside the player's own shadow
      out.add(m)
    })
    // back to the animated pose for whoever else uses the character
    model.traverse(o => o.isSkinnedMesh && o.skeleton.pose())
    return out.children.length ? out : null
  }

  // Put a held item in a character's hand. Weapons pass through the fist
  // (grip at the item's origin, blade up +Y, edge toward the knuckles); a
  // shield's handle sits in the fist with its face (+Z) on the back-of-hand
  // side. Rigs without finger bones fall back to the hand bone itself,
  // turned by entry.handRotate.
  attachToHand(char, obj, entry = {}, kind = "weapon", side = "r") {
    char.group.updateMatrixWorld(true)
    const B = !entry.handBone && handBones(char.model, side)
    let hand = B?.hand
    if (!hand)
      char.model.traverse(o => {
        if (!hand && o.isBone && (entry.handBone ? o.name === entry.handBone : side === "r" ? /(right.?hand$|hand.?r$|r.?hand$|hand_r$)/i.test(o.name) : /(left.?hand$|hand.?l$|l.?hand$|hand_l$)/i.test(o.name))) hand = o
      })
    if (!hand) return false
    const s = new THREE.Vector3()
    hand.getWorldScale(s)
    const anchor = new THREE.Group()
    anchor.scale.set(1 / s.x, 1 / s.y, 1 / s.z)
    if (B?.index && B.ring && B.middle && B.tip) {
      // the grip, measured with the fist closed, in the hand bone's own frame
      const saved = []
      hand.traverse(b => b.isBone && saved.push([b, b.quaternion.clone()]))
      closeFist(hand)
      hand.updateMatrixWorld(true)
      const inv = new THREE.Matrix4().copy(hand.matrixWorld).invert()
      const g = gripFrame(B, inv)
      for (const [b, q] of saved) b.quaternion.copy(q)
      hand.updateMatrixWorld(true)
      const front = kind === "shield" ? g.palm.clone().negate() : g.fingers.clone().cross(g.blade)
      const x = g.blade.clone().cross(front).normalize()
      anchor.position.copy(g.center)
      if (kind === "shield") anchor.position.addScaledVector(g.palm, -g.span * 0.9)
      anchor.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, g.blade, front))
    } else {
      const r = entry.handRotate || [0, 0, 0]
      obj.rotation.set(r[0] * DEG, r[1] * DEG, r[2] * DEG)
    }
    anchor.add(obj)
    hand.add(anchor)
    return true
  }
}

export const assets = new AssetRegistry()

// Many copies of pack models drawn as instanced meshes: one InstancedMesh per
// model part (geometry + material), so a model's geometry is stored once
// however often it repeats. Kit houses repeat the same wall panels, roofs
// and props dozens of times per town; merging copies of them used most of a
// phone's memory.
export class Instancer {
  constructor() {
    this.sets = new Map() // part -> matrices
  }
  // a model placed by its own origin (kit pieces)
  model(id, matrix) {
    this.add(assets.parts({ model: id, front: "-z", align: "pivot" }, "kit"), matrix)
  }
  // a role entry, as assets.bake would place it
  entry(entry, role, dims, matrix) {
    this.add(assets.parts(entry, role, dims), matrix)
  }
  add(parts, matrix) {
    for (const p of parts) {
      if (!this.sets.has(p)) this.sets.set(p, [])
      this.sets.get(p).push(matrix.clone())
    }
  }
  build() {
    const group = new THREE.Group()
    for (const [part, list] of this.sets) {
      const mesh = new THREE.InstancedMesh(part.geo, part.mat, list.length)
      list.forEach((m, i) => mesh.setMatrixAt(i, m))
      mesh.instanceMatrix.needsUpdate = true
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.computeBoundingSphere() // around all the copies, for culling
      group.add(mesh)
    }
    return group
  }
}

// ---------------------------------------------------------------- which models an area needs

// every model id a kit refers to
export function kitModels(k) {
  const ids = []
  for (const [key, v] of Object.entries(k)) {
    if (key === "where" || key === "stories") continue
    const add = x => {
      if (!x) return
      if (typeof x === "string") return ids.push(x)
      if (x.oneOf) return x.oneOf.forEach(add)
      ids.push(x.model)
      for (const w of x.with || []) add(w)
    }
    if (Array.isArray(v)) v.forEach(add)
    else if (v && typeof v === "object") ids.push(...Object.values(v).filter(x => typeof x === "string"))
  }
  return ids.filter(Boolean)
}

const TOWN_PROPS = new Set(["prop.well", "prop.stall", "prop.lamppost", "prop.barrel", "prop.crate"])

export function overworldModels() {
  const ids = assets.modelsFor(role => {
    const g = ROLES[role]?.group
    return g === "flora" || g === "building" || g === "character" || g === "creature" || g === "weapon" || g === "decor" || TOWN_PROPS.has(role)
  })
  for (const k of assets.index.kits.building || []) ids.push(...kitModels(k))
  return [...new Set(ids)]
}

export function dungeonModels(theme) {
  return assets.modelsFor((role, e) => (role.startsWith("dungeon.") || role.startsWith("prop.")) && matches(e, { theme }))
}

export function interiorModels(style) {
  const ids = assets.modelsFor((role, e) => role.startsWith("prop.") && matches(e, { style }))
  for (const k of assets.index.kits.interior || []) if (matches(k, { style })) ids.push(...kitModels(k))
  return [...new Set(ids)]
}
