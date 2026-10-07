// Pack models at run time. `npm run assets` publishes public/packs/index.json
// (which models fill which roles); this loads the models an area needs before
// it is built, and hands the generators ready-to-place geometry, objects and
// animated characters. With no packs, everything reports "none" and the game
// builds its own art as before.
import * as THREE from "three"
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js"
import { ROLES, matches, creatureRoles } from "./roles.js"
import { CREATURES } from "../data/creatures.js"

creatureRoles(CREATURES)

const DEG = Math.PI / 180

// The glTF loader is only fetched when there are packs to load.
let loaderPromise = null
function getLoader() {
  loaderPromise ||= Promise.all([import("three/examples/jsm/loaders/GLTFLoader.js"), import("three/examples/jsm/libs/meshopt_decoder.module.js")]).then(([{ GLTFLoader }, { MeshoptDecoder }]) => {
    const loader = new GLTFLoader()
    loader.setMeshoptDecoder(MeshoptDecoder)
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
// take the same light, fog and darkness as everything around them.
const converted = new WeakMap()
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

class AssetRegistry {
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
        const set = e.anims && this.index.animations[e.anims]
        if (set) for (const c of Object.values(set)) ids.add(c.model)
      }
    }
    return [...ids]
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
                g.scene.traverse(o => {
                  if (o.isMesh) {
                    o.castShadow = true
                    o.receiveShadow = true
                    o.material = Array.isArray(o.material) ? o.material.map(prepareMaterial) : prepareMaterial(o.material)
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
    // the model's front: +Z by default (glTF); turn it to face -Z
    const yaw = (entry.yaw ?? 0) * DEG + (entry.front === "-z" ? 0 : entry.front === "+x" ? Math.PI / 2 : entry.front === "-x" ? -Math.PI / 2 : Math.PI)
    const turned = Math.abs(Math.sin(yaw)) > 0.7 // footprint axes swap
    const w0 = turned ? size[2] : size[0]
    const d0 = turned ? size[0] : size[2]
    if (fit === "height") sx = sy = sz = ((entry.height ?? dims.h ?? r.height) / Math.max(1e-3, size[1])) * k
    else if (fit === "footprint" && dims.w) sx = sy = sz = Math.min(dims.w / Math.max(1e-3, w0), dims.d / Math.max(1e-3, d0)) * k
    else if (fit === "cell") {
      sx = (dims.w ?? w0) / Math.max(1e-3, w0)
      sz = dims.d != null ? dims.d / Math.max(1e-3, d0) : 1
      sy = dims.h != null ? dims.h / Math.max(1e-3, size[1]) : 1
      if (turned) [sx, sz] = [sz, sx]
    } else sx = sy = sz = k
    const align = entry.align || (fit === "cell" && role === "dungeon.floor" ? "top" : "base")
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

  // Static model as merge-ready parts: [{geo, mat}] with the entry transform
  // baked in. Shared and cached; callers clone if they modify.
  parts(entry, role, dims = {}) {
    const key = `${entry.model}|${role}|${dims.w}|${dims.d}|${dims.h}|${JSON.stringify([entry.scale, entry.fit, entry.yaw, entry.front, entry.rotate, entry.offset, entry.align, entry.height])}`
    if (this.partsCache.has(key)) return this.partsCache.get(key)
    const g = this.gltf.get(entry.model)
    const base = this.entryMatrix(entry, role, dims)
    const out = []
    g.scene.traverse(o => {
      if (!o.isMesh || o.isSkinnedMesh) return
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

  // Merge a static model into a geometry Builder at `matrix` (placed space).
  bake(builder, entry, role, dims, matrix) {
    for (const part of this.parts(entry, role, dims)) builder.add(part.geo, part.mat, { matrix, uv: "keep" })
  }

  // A static model as an Object3D (shares geometry and materials).
  object(entry, role, dims = {}) {
    const g = this.gltf.get(entry.model)
    const holder = new THREE.Group()
    const inner = g.scene.clone(true)
    inner.matrixAutoUpdate = false
    inner.matrix.copy(this.entryMatrix(entry, role, dims))
    holder.add(inner)
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
  character(entry, role, dims = {}) {
    const g = this.gltf.get(entry.model)
    const holder = new THREE.Group()
    const inner = new THREE.Group()
    const model = cloneSkinned(g.scene)
    inner.add(model)
    inner.matrixAutoUpdate = false
    inner.matrix.copy(this.entryMatrix(entry, role, dims))
    holder.add(inner)
    holder.userData.pack = true
    model.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true
        o.frustumCulled = false // skinned bounds don't follow the pose
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

  // Bone to hang a held item on, with a scale-free anchor.
  attachToHand(char, obj, entry = {}) {
    let hand = null
    char.model.traverse(o => {
      if (!hand && o.isBone && (entry.handBone ? o.name === entry.handBone : /(right.?hand$|hand.?r$|r.?hand$|hand_r$)/i.test(o.name))) hand = o
    })
    if (!hand) return false
    char.group.updateMatrixWorld(true)
    const s = new THREE.Vector3()
    hand.getWorldScale(s)
    const anchor = new THREE.Group()
    anchor.scale.set(1 / s.x, 1 / s.y, 1 / s.z)
    const r = entry.handRotate || [0, 0, 0]
    obj.rotation.set(r[0] * DEG, r[1] * DEG, r[2] * DEG)
    anchor.add(obj)
    hand.add(anchor)
    return true
  }
}

export const assets = new AssetRegistry()

// ---------------------------------------------------------------- which models an area needs

const TOWN_PROPS = new Set(["prop.well", "prop.stall", "prop.lamppost", "prop.barrel", "prop.crate"])

export function overworldModels() {
  return assets.modelsFor(role => {
    const g = ROLES[role]?.group
    return g === "flora" || g === "building" || g === "character" || g === "creature" || TOWN_PROPS.has(role)
  })
}

export function dungeonModels(theme) {
  return assets.modelsFor((role, e) => (role.startsWith("dungeon.") || role.startsWith("prop.")) && matches(e, { theme }))
}

export function interiorModels(style) {
  return assets.modelsFor((role, e) => role.startsWith("prop.") && matches(e, { style }))
}
