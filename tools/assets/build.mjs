// Asset pack pipeline: `npm run assets`
//
//   assets/packs/<pack>/...      the packs as downloaded (FBX, glTF or GLB, plus textures)
//   assets/manifest.json         which models fill which roles (see src/assets/roles.js)
//
// 1. Converts every model to an optimised, metre-scaled, Y-up GLB in
//    assets/.cache/ (FBX goes through FBX2glTF; unchanged files are skipped).
// 2. Writes assets/catalog.json (size, triangles, rig, clips and suggested
//    roles for every model) and assets/manifest.suggested.json.
// 3. Checks the manifest and publishes only the models it uses to
//    public/packs/, with public/packs/index.json for the game to read.
//
// Options: --force (reconvert everything), --pack <name> (only that pack).
import { NodeIO, Logger } from "@gltf-transform/core"
import { ALL_EXTENSIONS } from "@gltf-transform/extensions"
import { dedup, prune, weld, resample, meshopt, textureCompress, getBounds, simplify, dequantize } from "@gltf-transform/functions"
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from "meshoptimizer"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createRequire } from "node:module"
import { ROLES, CLIPS, creatureRoles } from "../../src/assets/roles.js"
import { CREATURES } from "../../src/data/creatures.js"

creatureRoles(CREATURES)

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const PACKS = path.join(ROOT, "assets/packs")
const CACHE = path.join(ROOT, "assets/.cache")
const RAW = path.join(CACHE, "raw")
const OUT = path.join(CACHE, "models")
const PUBLIC = path.join(ROOT, "public/packs")
const MANIFEST = path.join(ROOT, "assets/manifest.json")
const args = process.argv.slice(2)
const FORCE = args.includes("--force")
const ONLY = args.includes("--pack") ? args[args.indexOf("--pack") + 1] : null
const MODEL_EXT = new Set([".fbx", ".glb", ".gltf"])
const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp"])
const VERSION = 1 // bump to reconvert everything after changing the conversion

const warnings = []
const untextured = {} // pack -> material names left without a texture
const warn = (id, msg) => warnings.push(`${id}: ${msg}`)

// ---------------------------------------------------------------- helpers

const readJSON = (p, fallback) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : fallback)
const writeJSON = (p, v) => {
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, JSON.stringify(v, null, 2) + "\n")
}
const hash = s => createHash("sha1").update(s).digest("hex").slice(0, 12)
const posix = p => p.split(path.sep).join("/")

// glob with * (within a path segment) and ** (any depth), case-insensitive
function globRe(glob) {
  let re = ""
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]
    if (c === "*" && glob[i + 1] === "*") (re += ".*"), i++
    else if (c === "*") re += "[^/]*"
    else if (c === "?") re += "[^/]"
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&")
  }
  return new RegExp(`^${re}$`, "i")
}
const globMatch = (glob, s) => globRe(glob).test(s)

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".") || e.name === "__MACOSX") continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

// "Medieval Village MegaKit[Standard]" -> "Medieval-Village-MegaKit"
const packKey = name =>
  name
    .replace(/\[[^\]]*\]|\([^)]*\)/g, "")
    .trim()
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "pack"

// "Models/SM Env Tree 01.fbx" -> "Models/SM_Env_Tree_01"
const modelKey = rel =>
  posix(rel)
    .replace(/\.[^.]+$/, "")
    .replace(/[^A-Za-z0-9/_-]+/g, "_")
    .replace(/_+/g, "_")

function fbx2gltfBinary() {
  const pkg = path.dirname(createRequire(import.meta.url).resolve("fbx2gltf/package.json"))
  const dir = path.join(pkg, "bin", os.type())
  const bin = path.join(dir, os.type() === "Windows_NT" ? "FBX2glTF.exe" : "FBX2glTF")
  if (!fs.existsSync(bin)) throw new Error(`FBX2glTF not found for ${os.type()} (npm install should provide ${bin})`)
  try {
    fs.chmodSync(bin, 0o755)
  } catch {
    /* read-only installs */
  }
  return bin
}

// ---------------------------------------------------------------- stats

function stats(doc) {
  const root = doc.getRoot()
  let tris = 0
  for (const mesh of root.listMeshes())
    for (const prim of mesh.listPrimitives()) {
      const idx = prim.getIndices()
      const pos = prim.getAttribute("POSITION")
      const n = idx ? idx.getCount() : pos ? pos.getCount() : 0
      if (prim.getMode() === 4) tris += n / 3
    }
  const scene = root.getDefaultScene() || root.listScenes()[0]
  const b = scene ? bounds(doc, scene) : { min: [0, 0, 0], max: [0, 0, 0] }
  const skins = root.listSkins()
  const clips = root.listAnimations().map(a => {
    let duration = 0
    for (const s of a.listSamplers()) {
      const input = s.getInput()
      if (input) duration = Math.max(duration, input.getMax([])[0] || 0)
    }
    return { name: a.getName() || "clip", duration: +duration.toFixed(3) }
  })
  const materials = root.listMaterials().map(m => m.getName())
  return {
    tris: Math.round(tris),
    min: b.min.map(v => +v.toFixed(3)),
    max: b.max.map(v => +v.toFixed(3)),
    size: b.max.map((v, i) => +(v - b.min[i]).toFixed(3)),
    skinned: skins.length > 0,
    joints: skins.reduce((n, s) => Math.max(n, s.listJoints().length), 0),
    jointNames: skins[0] ? skins[0].listJoints().map(j => j.getName()) : [],
    clips,
    materials,
    textures: root.listTextures().length,
  }
}

// Scene bounds in metres. Skinned meshes are measured in their bind pose
// (each vertex placed by its main joint), which is what the game shows.
function bounds(doc, scene) {
  let hasSkin = false
  scene.traverse(n => n.getSkin() && (hasSkin = true))
  if (!hasSkin) return getBounds(scene)
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  const v = [0, 0, 0]
  const add = (m, x, y, z) => {
    v[0] = m[0] * x + m[4] * y + m[8] * z + m[12]
    v[1] = m[1] * x + m[5] * y + m[9] * z + m[13]
    v[2] = m[2] * x + m[6] * y + m[10] * z + m[14]
    for (let k = 0; k < 3; k++) (min[k] = Math.min(min[k], v[k])), (max[k] = Math.max(max[k], v[k]))
  }
  scene.traverse(node => {
    const mesh = node.getMesh()
    if (!mesh) return
    const skin = node.getSkin()
    let jointMats = null
    if (skin) {
      const ibm = skin.getInverseBindMatrices()
      jointMats = skin.listJoints().map((j, i) => mul(j.getWorldMatrix(), ibm ? ibm.getElement(i, []) : identity()))
    }
    const world = node.getWorldMatrix()
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute("POSITION")
      if (!pos) continue
      const joints = prim.getAttribute("JOINTS_0")
      const weights = prim.getAttribute("WEIGHTS_0")
      const p = []
      const jt = []
      const wt = []
      for (let i = 0; i < pos.getCount(); i++) {
        pos.getElement(i, p)
        let m = world
        if (jointMats && joints) {
          joints.getElement(i, jt)
          weights ? weights.getElement(i, wt) : wt.splice(0, 4, 1, 0, 0, 0)
          let best = 0
          for (let k = 1; k < 4; k++) if (wt[k] > wt[best]) best = k
          m = jointMats[jt[best]] || world
        }
        add(m, p[0], p[1], p[2])
      }
    }
  })
  return min[0] === Infinity ? { min: [0, 0, 0], max: [0, 0, 0] } : { min, max }
}
const identity = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
function mul(a, b) {
  const o = new Array(16)
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]
  return o
}

// ---------------------------------------------------------------- texture repair

const normName = s =>
  s
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/(material|mat|texture|tex|albedo|basecolor|base_color|diffuse|color|colour)/g, "")
    .replace(/[^a-z0-9]/g, "")
const isAuxMap = f => /(normal|_nrm|_n\.|rough|metal|_ao|occlusion|emiss|_mask|height|spec|preview|thumb|icon|screenshot|cover)/i.test(path.basename(f))

// Synty and similar packs ship materials whose texture paths point into a
// Unity project; give each untextured material the pack image that matches.
function repairTextures(doc, pack, packCfg, images, id) {
  const root = doc.getRoot()
  const colourImages = images.filter(f => !isAuxMap(f))
  const cache = new Map()
  const texFor = file => {
    if (cache.has(file)) return cache.get(file)
    const ext = path.extname(file).toLowerCase()
    const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg"
    const t = doc.createTexture(path.basename(file)).setImage(fs.readFileSync(file)).setMimeType(mime).setURI(path.basename(file))
    cache.set(file, t)
    return t
  }
  for (const m of root.listMaterials()) {
    if (m.getBaseColorTexture()) continue
    const name = m.getName() || ""
    let file = null
    for (const [glob, rel] of Object.entries(packCfg.textures || {})) {
      if (glob === "*" || globMatch(glob, name)) {
        file = path.join(PACKS, pack, rel)
        if (glob !== "*") break
      }
    }
    if (!file) {
      const key = normName(name)
      file = colourImages.find(f => key && normName(path.basename(f)) === key)
    }
    if (file && fs.existsSync(file)) m.setBaseColorTexture(texFor(file))
    else if (name && !/^(default|lambert|phong)/i.test(name) && colourImages.length) (untextured[pack] ||= new Set()).add(name)
  }
  // plain look: no shiny defaults from FBX materials
  for (const m of root.listMaterials()) {
    if (!m.getMetallicRoughnessTexture()) {
      m.setMetallicFactor(Math.min(m.getMetallicFactor(), 0.1))
      m.setRoughnessFactor(Math.max(m.getRoughnessFactor(), 0.8))
    }
  }
}

// ---------------------------------------------------------------- conversion

const io = new NodeIO().setLogger(new Logger(Logger.Verbosity.WARN)).registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder, "meshopt.decoder": MeshoptDecoder })

let sharp = null
try {
  sharp = (await import("sharp")).default
} catch {
  /* textures are kept at full size without sharp */
}

// Step 1: any source file -> raw GLB (no changes beyond the format)
// A .gltf whose external files may have moved: find each buffer and image by
// its path, else by file name anywhere in the pack. Images that can't be
// found are dropped from their materials instead of failing the model.
const BLANK_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
async function readGltf(src, packFiles, id) {
  const json = JSON.parse(fs.readFileSync(src, "utf8"))
  const dir = path.dirname(src)
  const byName = new Map()
  for (const f of packFiles) byName.set(path.basename(f).toLowerCase(), f)
  const find = uri => {
    const rel = decodeURIComponent(uri)
    const direct = path.resolve(dir, rel)
    if (fs.existsSync(direct)) return direct
    const base = path.basename(rel).toLowerCase()
    for (const name of [base, base.replace(/_(png|jpe?g|tga)\.(png|jpe?g)$/, ".$1"), base.replace(/_(png|jpe?g|tga)\.(png|jpe?g)$/, ".png")]) if (byName.has(name)) return byName.get(name)
    return null
  }
  const resources = {}
  for (const b of json.buffers || []) {
    if (!b.uri || b.uri.startsWith("data:")) continue
    const file = find(b.uri)
    if (!file) throw new Error(`missing buffer ${b.uri}`)
    resources[b.uri] = new Uint8Array(fs.readFileSync(file))
  }
  const missing = new Set()
  ;(json.images || []).forEach((img, i) => {
    if (!img.uri || img.uri.startsWith("data:")) return
    const file = find(img.uri)
    if (file) resources[img.uri] = new Uint8Array(fs.readFileSync(file))
    else {
      missing.add(i)
      img.uri = BLANK_PNG
    }
  })
  if (missing.size) {
    const deadTex = new Set((json.textures || []).map((t, i) => (missing.has(t.source) ? i : -1)).filter(i => i >= 0))
    const strip = o => {
      if (!o || typeof o !== "object") return
      for (const k of Object.keys(o)) {
        if (o[k] && typeof o[k] === "object" && typeof o[k].index === "number" && /texture/i.test(k) && deadTex.has(o[k].index)) delete o[k]
        else strip(o[k])
      }
    }
    for (const m of json.materials || []) strip(m)
    warn(id, `${missing.size} texture file(s) not found in the pack; left untextured`)
  }
  return io.readJSON({ json, resources })
}

async function toRaw(src, rawFile, packFiles = [], id = src) {
  fs.mkdirSync(path.dirname(rawFile), { recursive: true })
  const ext = path.extname(src).toLowerCase()
  if (ext === ".fbx") {
    const base = rawFile.replace(/\.glb$/, "")
    try {
      execFileSync(fbx2gltfBinary(), ["--binary", "--input", src, "--output", base, "--anim-framerate", "bake30", "--pbr-metallic-roughness"], { stdio: "pipe", cwd: path.dirname(src) })
    } catch (e) {
      throw new Error(`FBX2glTF failed: ${String(e.stderr || e.message).trim().split("\n").slice(-2).join(" ")}`)
    }
    if (!fs.existsSync(rawFile)) throw new Error("FBX2glTF produced no output")
  } else {
    const doc = path.extname(src).toLowerCase() === ".gltf" ? await readGltf(src, packFiles, id) : await io.read(src)
    await io.write(rawFile, doc)
  }
}

// Step 2: raw GLB -> game-ready GLB
async function normalize(rawFile, outFile, { pack, packCfg, images, scale, rotate, id }) {
  const doc = await io.read(rawFile)
  doc.setLogger(new Logger(Logger.Verbosity.ERROR))
  const root = doc.getRoot()
  repairTextures(doc, pack, packCfg, images, id)
  // one root node carries the unit and axis fix
  const scene = root.getDefaultScene() || root.listScenes()[0]
  const fix = doc.createNode("pack_root").setScale([scale, scale, scale])
  if (rotate.some(Boolean)) {
    const [rx, ry, rz] = rotate.map(d => (d * Math.PI) / 180)
    const c1 = Math.cos(rx / 2), s1 = Math.sin(rx / 2), c2 = Math.cos(ry / 2), s2 = Math.sin(ry / 2), c3 = Math.cos(rz / 2), s3 = Math.sin(rz / 2)
    // XYZ Euler -> quaternion
    fix.setRotation([s1 * c2 * c3 + c1 * s2 * s3, c1 * s2 * c3 - s1 * c2 * s3, c1 * c2 * s3 + s1 * s2 * c3, c1 * c2 * c3 - s1 * s2 * s3])
  }
  for (const child of scene.listChildren()) {
    scene.removeChild(child)
    fix.addChild(child)
  }
  scene.addChild(fix)
  // drop cameras and lights that FBX exports bring along
  for (const n of root.listNodes()) {
    if (n.getCamera()) n.setCamera(null)
    if (n.getExtension("KHR_lights_punctual")) n.setExtension("KHR_lights_punctual", null)
  }
  const st0 = { clips: root.listAnimations() }
  const maxTex = packCfg.maxTexture || 1024
  const transforms = [dedup(), prune({ keepLeaves: false }), weld()]
  if (st0.clips.length) transforms.push(resample())
  if (sharp && root.listTextures().length) transforms.push(textureCompress({ encoder: sharp, targetFormat: "webp", resize: [maxTex, maxTex], quality: 85 }))
  await doc.transform(...transforms)
  const st = stats(doc) // measured before quantisation
  await doc.transform(meshopt({ encoder: MeshoptEncoder, level: "medium" }))
  fs.mkdirSync(path.dirname(outFile), { recursive: true })
  await io.write(outFile, doc)
  return { ...st, bytes: fs.statSync(outFile).size }
}

// ---------------------------------------------------------------- suggestions

function suggestRoles(id, st) {
  const name = id.toLowerCase().split("/").pop()
  const out = []
  const height = st.size[1]
  if (st.skinned) {
    if (ROLES.npc.words.some(w => name.includes(w))) out.push("npc")
    for (const [role, r] of Object.entries(ROLES)) if (r.group === "creature" && r.words.some(w => w.length > 2 && name.includes(w))) out.push(role)
    return out
  }
  for (const [role, r] of Object.entries(ROLES)) {
    if (r.group === "character" || r.group === "creature") continue
    if (r.words.some(w => name.includes(w))) out.push(role)
  }
  // rocks: split small and large by size
  if (out.includes("flora.rock") && height > 1.8) out.splice(out.indexOf("flora.rock"), 1, "flora.boulder")
  if (out.includes("flora.boulder") && height < 1) out.splice(out.indexOf("flora.boulder"), 1, "flora.rock")
  // a "tree" that matched several tree roles: keep the most specific
  const trees = out.filter(r => ["flora.gashTree", "flora.pine", "flora.swampTree", "flora.deadTree", "flora.parasol"].includes(r))
  if (trees.length > 1 && trees.includes("flora.gashTree")) out.splice(out.indexOf("flora.gashTree"), 1)
  return [...new Set(out)]
}

// ---------------------------------------------------------------- main

async function main() {
  const t0 = Date.now()
  const manifest = readJSON(MANIFEST, { packs: {}, animations: {}, roles: {} })
  manifest.packs ||= {}
  manifest.animations ||= {}
  manifest.roles ||= {}
  const state = readJSON(path.join(CACHE, "state.json"), { version: VERSION, files: {} })
  if (state.version !== VERSION) (state.files = {}), (state.version = VERSION)
  const catalog = readJSON(path.join(ROOT, "assets/catalog.json"), { models: {} })
  const packs = fs.existsSync(PACKS) ? fs.readdirSync(PACKS, { withFileTypes: true }).filter(d => d.isDirectory() && !d.name.startsWith(".")).map(d => d.name) : []
  let converted = 0
  let skipped = 0
  let failed = 0
  const seen = new Set()

  for (const pack of packs) {
    if (ONLY && pack !== ONLY) {
      for (const id of Object.keys(catalog.models)) if (id.startsWith(`${packKey(pack)}/`)) seen.add(id)
      continue
    }
    if (!manifest.packs[pack]) manifest.packs[pack] = { license: "", textures: {} }
    const packCfg = manifest.packs[pack]
    const ignore = ["**/unity/**", "**/unreal/**", "**/*.meta", ...(packCfg.ignore || [])]
    const files = walk(path.join(PACKS, pack)).filter(f => !ignore.some(g => globMatch(g, posix(path.relative(path.join(PACKS, pack), f)))))
    const images = files.filter(f => IMAGE_EXT.has(path.extname(f).toLowerCase()))
    const models = files.filter(f => MODEL_EXT.has(path.extname(f).toLowerCase()))
    // a .gltf and its .glb twin: keep the .glb
    const keys = new Map()
    for (const f of models) {
      const k = modelKey(path.relative(path.join(PACKS, pack), f))
      if (!keys.has(k) || path.extname(f).toLowerCase() === ".glb") keys.set(k, f)
    }
    console.log(`\n${pack}: ${keys.size} models, ${images.length} images`)

    // pass 1: raw conversion, so the pack's units can be judged from all models
    const raws = []
    for (const [key, src] of keys) {
      const id = `${packKey(pack)}/${key}`
      const rawFile = path.join(RAW, `${id}.glb`)
      const st = fs.statSync(src)
      const sig = `${st.size}:${st.mtimeMs}`
      try {
        if (FORCE || !fs.existsSync(rawFile) || state.files[id]?.raw !== sig) {
          await toRaw(src, rawFile, files, id)
          state.files[id] = { raw: sig }
        }
        if (state.files[id].height == null) state.files[id].height = stats(await io.read(rawFile)).size[1]
        raws.push({ id, key, src, rawFile, height: state.files[id].height })
      } catch (e) {
        failed++
        warn(id, e.message)
      }
    }
    // units: FBX from Unity/Max often arrives in centimetres
    let scale = packCfg.scale
    if (scale == null) {
      const hs = raws.map(r => r.height).filter(h => h > 0).sort((a, b) => a - b)
      const median = hs.length ? hs[Math.floor(hs.length / 2)] : 1
      scale = median > 25 ? 0.01 : 1
      if (scale !== 1) console.log(`  median height ${median.toFixed(1)}: treating ${pack} as centimetres (set packs.${pack}.scale to override)`)
    }
    const rotate = packCfg.rotate || [0, 0, 0]
    const cfgSig = hash(JSON.stringify({ scale, rotate, textures: packCfg.textures, maxTexture: packCfg.maxTexture, sharp: !!sharp }))

    // pass 2: game-ready models
    for (const r of raws) {
      const outFile = path.join(OUT, `${r.id}.glb`)
      seen.add(r.id)
      const sigs = state.files[r.id]
      if (!FORCE && fs.existsSync(outFile) && sigs?.out === `${sigs.raw}:${cfgSig}` && catalog.models[r.id]) {
        skipped++
        continue
      }
      try {
        const st = await normalize(r.rawFile, outFile, { pack, packCfg, images, scale, rotate, id: r.id })
        if (st.tris > 60000) warn(r.id, `${st.tris} triangles: heavy for scattering`)
        catalog.models[r.id] = { pack, source: posix(path.relative(ROOT, r.src)), ...st, suggested: suggestRoles(r.id, st) }
        state.files[r.id].out = `${sigs.raw}:${cfgSig}`
        converted++
        process.stdout.write(`  ${r.id}  ${st.tris} tris${st.skinned ? `, rig (${st.joints} joints)` : ""}${st.clips.length ? `, ${st.clips.length} clips` : ""}\n`)
      } catch (e) {
        failed++
        warn(r.id, e.message)
      }
    }
  }
  for (const id of Object.keys(catalog.models)) if (!seen.has(id)) delete catalog.models[id]
  writeJSON(path.join(CACHE, "state.json"), state)
  writeJSON(path.join(ROOT, "assets/catalog.json"), catalog)

  // suggested manifest: every model under the roles its name suggests
  const suggested = { roles: {} }
  for (const [id, m] of Object.entries(catalog.models)) for (const role of m.suggested) (suggested.roles[role] ||= []).push({ model: id })
  writeJSON(path.join(ROOT, "assets/manifest.suggested.json"), suggested)

  // ---- check the manifest and publish what it uses
  const used = new Set()
  const errors = []
  const index = { models: {}, roles: {}, animations: {} }
  const clipsUsed = {} // model id -> clip names used by animation sets
  const clipRef = ref => {
    const [mid, clip] = ref.split("#")
    const m = catalog.models[mid]
    if (!m) return errors.push(`animation "${ref}": no model ${mid}`), null
    const c = clip ? m.clips.find(c2 => c2.name === clip) : m.clips[0]
    if (!c) return errors.push(`animation "${ref}": ${mid} has no clip "${clip}" (it has: ${m.clips.map(c2 => c2.name).join(", ") || "none"})`), null
    ;(clipsUsed[mid] ||= new Set()).add(c.name)
    return { model: mid, clip: c.name, duration: c.duration }
  }
  for (const [setName, set] of Object.entries(manifest.animations)) {
    index.animations[setName] = {}
    for (const [k, ref] of Object.entries(set)) {
      if (k.startsWith("_")) continue
      if (!CLIPS.includes(k)) errors.push(`animation set "${setName}": unknown clip "${k}" (use ${CLIPS.join(", ")})`)
      const r = clipRef(ref)
      if (r) index.animations[setName][k] = r
    }
    if (!index.animations[setName].idle) errors.push(`animation set "${setName}" needs at least "idle"`)
  }
  const shown = new Set()
  for (const [role, entries] of Object.entries(manifest.roles)) {
    if (role.startsWith("_")) continue
    if (!ROLES[role]) {
      errors.push(`unknown role "${role}" (see assets/ROLES.md)`)
      continue
    }
    const list = []
    for (const e of entries) {
      const m = catalog.models[e.model]
      if (!m) {
        errors.push(`${role}: no model "${e.model}" (ids look like <pack>/<path without extension>; see assets/catalog.json)`)
        continue
      }
      if ((ROLES[role].group === "character" || ROLES[role].group === "creature") && m.skinned && !e.anims && !m.clips.length) warn(e.model, `${role} has a rig but no animations (add "anims": "<set>")`)
      if (e.anims && !manifest.animations[e.anims]) errors.push(`${role}: unknown animation set "${e.anims}"`)
      for (const [slot, ids] of Object.entries(e.parts || {}))
        for (const id of ids) {
          if (id == null) continue
          if (!catalog.models[id]) errors.push(`${role}: part "${slot}" has no model "${id}"`)
          else used.add(id), shown.add(id)
        }
      used.add(e.model)
      shown.add(e.model)
      list.push(e)
    }
    if (list.length) index.roles[role] = list
  }
  // modular kits (whole buildings and rooms assembled from pieces)
  index.kits = {}
  for (const [name, kits] of Object.entries(manifest.kits || {})) {
    if (name.startsWith("_")) continue
    index.kits[name] = []
    for (const k of kits) {
      let ok = true
      for (const [key, v] of Object.entries(k)) {
        if (key === "where" || key === "stories" || key.startsWith("_") || typeof v !== "object") continue
        const ids = []
        const add = x => {
          if (!x) return
          if (typeof x === "string") return ids.push(x)
          if (x.oneOf) return x.oneOf.forEach(add)
          ids.push(x.model)
          for (const w of x.with || []) add(w)
        }
        if (Array.isArray(v)) v.forEach(add)
        else ids.push(...Object.values(v).filter(x => typeof x === "string"))
        for (const id of ids) {
          if (!catalog.models[id]) {
            errors.push(`kits.${name}.${key}: no model "${id}"`)
            ok = false
          } else used.add(id), shown.add(id)
        }
      }
      if (ok) index.kits[name].push(k)
    }
  }
  // models that only supply animation clips are published without meshes
  const animSources = new Set(Object.keys(clipsUsed))
  for (const id of animSources) used.add(id)
  fs.mkdirSync(PUBLIC, { recursive: true })
  const keep = new Set(["index.json"])
  let bytes = 0
  const textureBytes = new Map() // shared texture file -> size
  const LOD_RATIO = 0.12
  const needsLod = new Set()
  for (const [role, list] of Object.entries(index.roles)) if (ROLES[role]?.group === "flora") for (const e of list) needsLod.add(e.model)
  state.published ||= {}
  for (const id of used) {
    const m = catalog.models[id]
    const src = path.join(OUT, `${id}.glb`)
    if (!fs.existsSync(src)) {
      errors.push(`${id}: converted model missing (run npm run assets -- --force)`)
      continue
    }
    const animOnly = animSources.has(id) && !shown.has(id)
    // animation libraries: one .glb with just the clips in use; everything
    // else: .gltf + .bin with textures shared between models
    const sig = `${fs.statSync(src).mtimeMs}:${animOnly ? [...clipsUsed[id]].sort().join("|") : "shared"}`
    let pub = state.published[id]
    if (!pub || pub.sig !== sig || !pub.files.every(f => fs.existsSync(path.join(PUBLIC, f)))) {
      const files = animOnly ? await stripToClips(src, id, clipsUsed[id]) : await publishShared(src, id)
      pub = state.published[id] = { sig, files }
    }
    let b = 0
    for (const f of pub.files) {
      keep.add(f)
      const size = fs.statSync(path.join(PUBLIC, f)).size
      if (f.startsWith("textures/")) textureBytes.set(f, size)
      else b += size
    }
    bytes += b
    const { tris, min, max, size, skinned } = m
    const clips = animOnly ? m.clips.filter(c => clipsUsed[id].has(c.name)) : m.clips
    const tex = pub.files.filter(f => f.startsWith("textures/")).reduce((s, f) => s + textureBytes.get(f), 0)
    index.models[id] = { url: `packs/${pub.files[0]}`, tris: animOnly ? 0 : tris, min, max, size, skinned, clips, bytes: b + tex }
    // flora seen from afar gets a simplified version
    if (needsLod.has(id) && tris > 400) {
      const lodId = `${id}@lod`
      const lsig = `${sig}:lod${LOD_RATIO}`
      let lp = state.published[lodId]
      if (!lp || lp.sig !== lsig || !lp.files.every(f => fs.existsSync(path.join(PUBLIC, f)))) lp = state.published[lodId] = { sig: lsig, files: await publishShared(src, id, LOD_RATIO) }
      let lb = 0
      for (const f of lp.files) {
        keep.add(f)
        if (!f.startsWith("textures/")) lb += fs.statSync(path.join(PUBLIC, f)).size
      }
      bytes += lb
      index.models[lodId] = { url: `packs/${lp.files[0]}`, tris: Math.round(tris * LOD_RATIO), min, max, size, skinned: false, clips: [], bytes: lb }
      index.models[id].lod = lodId
    }
  }
  for (const s of textureBytes.values()) bytes += s
  // remove published files the manifest no longer uses
  for (const f of walk(PUBLIC)) {
    const rel = posix(path.relative(PUBLIC, f))
    if (!keep.has(rel)) fs.rmSync(f)
  }
  const prune = dir => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) if (e.isDirectory()) prune(path.join(dir, e.name))
    if (dir !== PUBLIC && !fs.readdirSync(dir).length) fs.rmdirSync(dir)
  }
  prune(PUBLIC)
  writeJSON(path.join(CACHE, "state.json"), state)
  index.version = hash(JSON.stringify(index))
  writeJSON(path.join(PUBLIC, "index.json"), index)

  // ---- report
  const roleCount = Object.keys(index.roles).length
  console.log(`\n${Object.keys(catalog.models).length} models in the catalog (${converted} converted, ${skipped} unchanged, ${failed} failed)`)
  console.log(`${roleCount} of ${Object.keys(ROLES).length} roles filled; ${used.size} models published (${(bytes / 1048576).toFixed(1)} MB) to public/packs`)
  if (!sharp) console.log("(sharp is not installed, so textures were not resized or compressed)")
  for (const [pack, names] of Object.entries(untextured))
    warnings.push(`${pack}: ${names.size} material(s) have no texture and use their plain colour (${[...names].slice(0, 4).join(", ")}${names.size > 4 ? ", ..." : ""}). If they should be textured, map them in packs.${pack}.textures`)
  if (warnings.length) console.log(`\nWarnings:\n  ${warnings.join("\n  ")}`)
  if (errors.length) {
    console.log(`\nManifest errors:\n  ${errors.join("\n  ")}`)
    process.exitCode = 1
  }
  console.log(`\nDone in ${((Date.now() - t0) / 1000).toFixed(1)} s`)
  writeRolesDoc()
}

// An animation library without its mesh and with only the clips in use; the
// skeleton's nodes stay so clips can be fitted to other rigs.
async function stripToClips(src, id, keepClips) {
  const rel = `${id}.glb`
  const dst = path.join(PUBLIC, rel)
  fs.mkdirSync(path.dirname(dst), { recursive: true })
  const doc = await io.read(src)
  doc.setLogger(new Logger(Logger.Verbosity.ERROR))
  const root = doc.getRoot()
  for (const a of root.listAnimations()) if (!keepClips.has(a.getName())) a.dispose()
  for (const n of root.listNodes()) {
    n.setMesh(null)
    n.setSkin(null)
  }
  await doc.transform(prune({ keepLeaves: true }), resample(), meshopt({ encoder: MeshoptEncoder, level: "medium" }))
  await io.write(dst, doc)
  return [rel]
}

// A model as <id>.gltf + <id>.bin, its images moved to public/packs/textures/
// under names taken from their content, so models sharing a texture atlas
// download it once. Returns the files written (the .gltf first).
async function publishShared(src, id, lod = 0) {
  const doc = await io.read(src)
  doc.setLogger(new Logger(Logger.Verbosity.ERROR))
  if (lod) {
    // the far version: same look, a fraction of the triangles
    await MeshoptSimplifier.ready
    await doc.transform(dequantize(), weld(), simplify({ simplifier: MeshoptSimplifier, ratio: lod, error: 0.02, lockBorder: false }), meshopt({ encoder: MeshoptEncoder, level: "medium" }))
    id = `${id}@lod`
  }
  const dir = path.dirname(path.join(PUBLIC, id))
  fs.mkdirSync(dir, { recursive: true })
  const toTextures = posix(path.relative(dir, path.join(PUBLIC, "textures")))
  const files = [`${id}.gltf`]
  for (const t of doc.getRoot().listTextures()) {
    const img = t.getImage()
    if (!img) continue
    const ext = { "image/webp": "webp", "image/png": "png", "image/jpeg": "jpg", "image/ktx2": "ktx2" }[t.getMimeType()] || "bin"
    const name = `${createHash("sha1").update(img).digest("hex").slice(0, 16)}.${ext}`
    const file = path.join(PUBLIC, "textures", name)
    if (!fs.existsSync(file)) {
      fs.mkdirSync(path.dirname(file), { recursive: true })
      fs.writeFileSync(file, img)
    }
    t.setURI(`${toTextures}/${name}`)
    files.push(`textures/${name}`)
  }
  const base = path.basename(id)
  for (const b of doc.getRoot().listBuffers()) b.setURI(`${base}.bin`)
  const { json, resources } = await io.writeJSON(doc, { format: "gltf", basename: base })
  for (const [uri, data] of Object.entries(resources)) {
    if (uri.startsWith(toTextures + "/")) continue // already written above
    fs.writeFileSync(path.join(dir, uri), data)
    files.push(posix(path.relative(PUBLIC, path.join(dir, uri))))
  }
  fs.writeFileSync(path.join(PUBLIC, `${id}.gltf`), JSON.stringify(json))
  return [...new Set(files)]
}

// assets/ROLES.md: the role list, regenerated each run
function writeRolesDoc() {
  const groups = {}
  for (const [role, r] of Object.entries(ROLES)) (groups[r.group] ||= []).push([role, r])
  let md = "# Asset roles\n\nGenerated by `npm run assets` from `src/assets/roles.js`. Assign models to these roles in `assets/manifest.json`.\n"
  for (const [g, list] of Object.entries(groups)) {
    md += `\n## ${g}\n\n| Role | Fit | Typical height | Filters | About |\n| --- | --- | --- | --- | --- |\n`
    for (const [role, r] of list) md += `| \`${role}\` | ${r.fit} | ${r.height} m | ${r.where.join(", ") || "-"} | ${r.about} |\n`
  }
  md += `\n## Animation clips\n\nAn animation set maps these names to clips: ${CLIPS.map(c => `\`${c}\``).join(", ")}. Only \`idle\` is required.\n`
  fs.writeFileSync(path.join(ROOT, "assets/ROLES.md"), md)
}

await main()
