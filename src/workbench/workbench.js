// Asset workbench (npm run workbench): preview and adjust how pack models are
// used, with the game's own placement code, then save assets/manifest.json and
// rebuild the packs. Talks to the dev server's /__wb endpoints (vite.config.js).
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { assets } from "../assets/registry.js"
import { ROLES } from "../assets/roles.js"
import { assembleBuilding } from "../assets/kit.js"
import { Builder } from "../render/geom.js"
import { kitShell } from "../render/interiors.js"
import { RACES } from "../data/stats.js"

const $ = s => document.querySelector(s)
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c])
const short = id => id.split("/").slice(-1)[0]

// ---------------------------------------------------------------- state

let catalog = { models: {} }
let manifest = { packs: {}, animations: {}, roles: {}, kits: {} }
let tab = "roles"
let sel = null // { kind: "role"|"kit"|"model", role?, index?, kitName?, id? }
let dirty = false
const view = { race: "vessari", sex: "male", seed: 1, anim: "idle", plotW: 7, plotD: 6, type: "house", kitSeed: 1, room: [10, 9, 4] }

function setDirty(d = true) {
  dirty = d
  $("#status").textContent = d ? "Unsaved changes" : "Saved"
  $("#status").classList.toggle("dirty", d)
}
addEventListener("beforeunload", e => {
  if (dirty) e.preventDefault()
})

// The registry reads the manifest and the converted models straight from the
// dev server, so previews follow every edit.
function refreshIndex() {
  const models = {}
  for (const [id, m] of Object.entries(catalog.models)) models[id] = { url: `/__wb/model/${id}.glb`, min: m.min, max: m.max, size: m.size, skinned: m.skinned, clips: m.clips, tris: m.tris, bytes: m.bytes }
  const animations = {}
  for (const [set, clips] of Object.entries(manifest.animations || {})) {
    if (set.startsWith("_")) continue
    animations[set] = {}
    for (const [name, ref] of Object.entries(clips)) {
      if (name.startsWith("_") || typeof ref !== "string") continue
      const [model, clip] = ref.split("#")
      animations[set][name] = { model, clip: clip || catalog.models[model]?.clips?.[0]?.name }
    }
  }
  const roles = {}
  for (const [r, list] of Object.entries(manifest.roles || {})) if (!r.startsWith("_")) roles[r] = list
  assets.index = { models, roles, animations, kits: manifest.kits || {}, version: Date.now() }
  assets.partsCache.clear()
  assets.clipCache?.clear()
}

async function api(path, opts) {
  const res = await fetch(`/__wb/${path}`, opts)
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || res.statusText)
  return json
}

// ---------------------------------------------------------------- 3D view

const canvas = $("#view")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(2, devicePixelRatio))
renderer.outputColorSpace = THREE.SRGBColorSpace
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x2a231c)
scene.add(new THREE.HemisphereLight(0xfff2dc, 0x4a3a2a, 1.4))
const sun = new THREE.DirectionalLight(0xffffff, 2)
sun.position.set(6, 10, 8)
scene.add(sun)
const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 2000)
camera.position.set(4, 3, 6)
const controls = new OrbitControls(camera, canvas)
controls.target.set(0, 1, 0)
const grid = new THREE.GridHelper(40, 40, 0x7a6a50, 0x3e3428)
scene.add(grid)
// a 1.8 m person outline for scale
const person = new THREE.Group()
const pm = new THREE.MeshBasicMaterial({ color: 0x9fd08a, wireframe: true, transparent: true, opacity: 0.45 })
const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 1.1, 4, 8), pm)
torso.position.y = 0.77
const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), pm)
head.position.y = 1.67
person.add(torso, head)
scene.add(person)
const arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0.05, 0), 2, 0xe0b060, 0.4, 0.25)
scene.add(arrow)
const outline = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x80b0ff }))
scene.add(outline)
const stage = new THREE.Group()
scene.add(stage)

let live = null // animated preview: { anim, t }
const clock = new THREE.Clock()
function resize() {
  const r = canvas.parentElement.getBoundingClientRect()
  renderer.setSize(r.width, r.height, false)
  camera.aspect = r.width / Math.max(1, r.height)
  camera.updateProjectionMatrix()
}
addEventListener("resize", resize)
renderer.setAnimationLoop(() => {
  const dt = Math.min(0.05, clock.getDelta())
  if (live) {
    live.t += dt
    driveAnimation(live)
  }
  controls.update()
  renderer.render(scene, camera)
})

// The same inputs the game gives a character, for each preview animation.
function driveAnimation(l) {
  const t = l.t
  const cyc = (t % 1.4) / 1.4
  const swing = cyc < 0.45 ? cyc / 0.45 : Math.max(0, 1 - (cyc - 0.45) * 2.5)
  switch (view.anim) {
    case "walk": return l.anim(t, 0.3, 0)
    case "run": return l.anim(t, 1, 0)
    case "attack": return l.anim(t, 0, swing, { variant: 0 })
    case "attack2": return l.anim(t, 0, swing, { variant: 1 })
    case "attack3": return l.anim(t, 0, swing, { variant: 2 })
    case "hit": return l.anim(t, 0, 0, { flinch: 1 - (t % 1) })
    case "die": return l.anim(t, 0, 0, { dying: Math.min(1, (t % 3) / 1.5) })
    case "talk": return l.anim(t, 0, 0, { talk: true })
    case "work": return l.anim(t, 0, 0.5)
    default: return l.anim(t, 0, 0)
  }
}

function frame(obj, minSize = 2) {
  obj.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(obj)
  if (box.isEmpty()) return
  person.position.x = Math.min(-1, box.min.x - 0.7) // the scale figure stands beside the model
  const size = box.getSize(new THREE.Vector3())
  const c = box.getCenter(new THREE.Vector3())
  const r = Math.max(size.x, size.y, size.z, minSize)
  controls.target.copy(c)
  camera.position.set(c.x + r * 0.9, c.y + r * 0.6, c.z + r * 1.3)
  camera.near = r / 200
  camera.far = r * 100
  camera.updateProjectionMatrix()
}

function setOutline(w, d) {
  const pts = w ? [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]] : []
  const arr = []
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    arr.push(a[0], 0.03, a[1], b[0], 0.03, b[1])
  }
  outline.geometry.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3))
}

function clearStage() {
  live = null
  stage.clear()
  setOutline(0)
}

// ---------------------------------------------------------------- previews

const SKIN_REF = new THREE.Color(0xdcb08f)
const skinTint = hex => {
  const c = new THREE.Color(hex)
  return new THREE.Color(Math.min(1.25, c.r / SKIN_REF.r), Math.min(1.25, c.g / SKIN_REF.g), Math.min(1.25, c.b / SKIN_REF.b)).getHex()
}

function modelsOfEntry(e) {
  const ids = [e.model]
  for (const slot of Object.values(e.parts || {})) for (const id of slot) if (id) ids.push(id)
  const set = e.anims && assets.index.animations[e.anims]
  if (set) for (const c of Object.values(set)) ids.push(c.model)
  return ids.filter(id => assets.index.models[id])
}

let previewToken = 0
async function previewRole(role, index) {
  const token = ++previewToken
  clearStage()
  const entry = manifest.roles[role]?.[index]
  if (!entry || !assets.index.models[entry.model]) return
  refreshIndex()
  await assets.load(modelsOfEntry(entry), p => ($("#status").textContent = `Loading ${Math.round(p * 100)}%`))
  if (token !== previewToken) return
  setDirty(dirty)
  const r = ROLES[role] || {}
  const actor = r.group === "character" || r.group === "creature"
  arrow.setDirection(new THREE.Vector3(0, 0, actor ? 1 : -1))
  if (actor) {
    const race = RACES[view.race] || RACES.vessari
    const c = assets.character(entry, role, { h: 1.8 }, { seed: view.seed, tints: { skin: skinTint(race.skin), hair: race.hair } })
    stage.add(c.group)
    live = { anim: c.anim, t: 0 }
    frame(c.group, 2.2)
  } else {
    const dims = role === "building" ? { w: view.plotW, d: view.plotD } : role.startsWith("dungeon.") ? { w: 4, d: 4, h: 4 } : {}
    stage.add(assets.object(entry, role, dims))
    if (dims.w) setOutline(dims.w, dims.d)
    frame(stage)
  }
}

async function previewKit(name, index) {
  const token = ++previewToken
  clearStage()
  const kit = manifest.kits?.[name]?.[index]
  if (!kit) return
  refreshIndex()
  const { kitModels } = await import("../assets/registry.js")
  await assets.load(kitModels(kit).filter(id => assets.index.models[id]), p => ($("#status").textContent = `Loading ${Math.round(p * 100)}%`))
  if (token !== previewToken) return
  setDirty(dirty)
  arrow.setDirection(new THREE.Vector3(0, 0, -1))
  const b = new Builder()
  try {
    if (name === "building") {
      const built = assembleBuilding(kit, { w: view.plotW, d: view.plotD, type: view.type, seed: view.kitSeed })
      if (!built) throw new Error("No roof fits: check the roofs list")
      for (const p of built.pieces) if (assets.index.models[p.model]) assets.bakeModel(b, p.model, p.matrix)
      setOutline(view.plotW, view.plotD)
    } else {
      const [W, D, H] = view.room
      kitShell(b, kit, { W, D, H })
      setOutline(W, D)
    }
  } catch (e) {
    $("#props .err") && ($("#props .err").textContent = e.message)
  }
  stage.add(b.build())
  frame(stage)
}

async function previewModel(id) {
  const token = ++previewToken
  clearStage()
  refreshIndex()
  await assets.load([id])
  if (token !== previewToken) return
  setDirty(dirty)
  arrow.setDirection(new THREE.Vector3(0, 0, 1))
  stage.add(assets.object({ model: id, front: "-z", align: "pivot" }, "kit"))
  frame(stage)
}

// ---------------------------------------------------------------- left list

function renderList() {
  const q = $("#search").value.toLowerCase()
  const list = $("#list")
  let html = ""
  if (tab === "roles") {
    const groups = {}
    for (const [role, r] of Object.entries(ROLES)) if (!q || role.toLowerCase().includes(q)) (groups[r.group] ||= []).push(role)
    for (const [g, roles] of Object.entries(groups)) {
      html += `<div class="group">${esc(g)}</div>`
      for (const role of roles) {
        const n = manifest.roles?.[role]?.length || 0
        const s = sel?.kind === "role" && sel.role === role
        html += `<div class="item ${s ? "sel" : ""} ${n ? "filled" : ""}" data-role="${esc(role)}"><span>${esc(role)}</span><span class="n">${n || "–"}</span></div>`
      }
    }
  } else if (tab === "buildings") {
    for (const name of ["building", "interior"]) {
      html += `<div class="group">${name === "building" ? "Town buildings" : "Room interiors"}</div>`
      ;(manifest.kits?.[name] || []).forEach((k, i) => {
        const s = sel?.kind === "kit" && sel.kitName === name && sel.index === i
        html += `<div class="item ${s ? "sel" : ""}" data-kit="${name}" data-index="${i}"><span>Kit ${i + 1}</span><span class="n">${esc(JSON.stringify(k.where || {}).slice(0, 40))}</span></div>`
      })
      html += `<div class="item" data-newkit="${name}"><span>+ New ${name} kit</span></div>`
    }
  } else if (tab === "models") {
    const ids = Object.keys(catalog.models).filter(id => !q || id.toLowerCase().includes(q)).sort()
    html += `<div class="note">${ids.length} converted models</div>`
    for (const id of ids.slice(0, 600)) {
      const s = sel?.kind === "model" && sel.id === id
      html += `<div class="item ${s ? "sel" : ""}" data-model="${esc(id)}" title="${esc(id)}"><span>${esc(short(id))}</span><span class="n">${esc(id.split("/")[0].slice(0, 14))}</span></div>`
    }
  } else {
    html = `<div class="note">The whole manifest as JSON. Edit, then Apply. Nothing is written until you Save.</div>`
  }
  list.innerHTML = html
}

$("#list").addEventListener("click", e => {
  const it = e.target.closest(".item")
  if (!it) return
  if (it.dataset.role) select({ kind: "role", role: it.dataset.role, index: 0 })
  else if (it.dataset.kit) select({ kind: "kit", kitName: it.dataset.kit, index: Number(it.dataset.index) })
  else if (it.dataset.newkit) {
    const name = it.dataset.newkit
    manifest.kits ||= {}
    ;(manifest.kits[name] ||= []).push(name === "building" ? { where: {}, grid: 2, storey: 3, wall: [], window: [], door: [], corner: [], roofs: {}, gables: {} } : { where: {}, grid: 2, storey: 3, floor: [], wall: [], door: [] })
    setDirty()
    select({ kind: "kit", kitName: name, index: manifest.kits[name].length - 1 })
  } else if (it.dataset.model) select({ kind: "model", id: it.dataset.model })
})
$("#search").addEventListener("input", renderList)
document.querySelectorAll(".tabs button").forEach(b =>
  b.addEventListener("click", () => {
    tab = b.dataset.tab
    document.querySelectorAll(".tabs button").forEach(x => x.classList.toggle("sel", x === b))
    renderList()
    if (tab === "json") renderJson()
  }),
)

function select(s) {
  sel = s
  renderList()
  renderProps()
  refreshPreview()
}

function refreshPreview() {
  if (!sel) return
  if (sel.kind === "role") previewRole(sel.role, sel.index)
  else if (sel.kind === "kit") previewKit(sel.kitName, sel.index)
  else if (sel.kind === "model") previewModel(sel.id)
}
let previewTimer = 0
const refreshSoon = () => {
  clearTimeout(previewTimer)
  previewTimer = setTimeout(refreshPreview, 250)
}

// ---------------------------------------------------------------- right panel

const modelOptions = () => `<datalist id="modelids">${Object.keys(catalog.models).sort().map(id => `<option value="${esc(id)}">`).join("")}</datalist>`
const num = v => (v === "" || v == null || isNaN(Number(v)) ? undefined : Number(v))

function field(label, html, tip = "") {
  return `<label class="f" title="${esc(tip)}"><span>${esc(label)}</span>${html}</label>`
}

function renderProps() {
  const p = $("#props")
  $("#viewbar").innerHTML = ""
  if (!sel) return (p.innerHTML = `<p class="note">Pick a role, building kit or model on the left.</p>`)
  if (sel.kind === "role") return renderRoleProps(p)
  if (sel.kind === "kit") return renderKitProps(p)
  if (sel.kind === "model") return renderModelProps(p)
}

function renderRoleProps(p) {
  const role = sel.role
  const r = ROLES[role]
  const list = (manifest.roles[role] ||= [])
  const e = list[sel.index]
  const actor = r.group === "character" || r.group === "creature"
  let h = `<h3>${esc(role)}</h3><div class="note">${esc(r.about)}. Sizing: <b>${esc(r.fit)}</b>, typical height ${r.height} m${r.where.length ? `, filters: ${esc(r.where.join(", "))}` : ""}.</div>`
  h += `<div class="row">${list.map((x, i) => `<button data-pick="${i}" class="${i === sel.index ? "primary" : ""}" title="${esc(x.model)}">${i + 1}. ${esc(short(x.model)).slice(0, 18)}</button>`).join("")}</div>`
  h += `<div class="row"><input id="addmodel" list="modelids" placeholder="Add a model to this role…" style="flex:1">${modelOptions()}<button id="addbtn">Add</button></div>`
  if (!e) {
    p.innerHTML = h + `<p class="note">No models fill this role yet, so the game builds its own. Add one above.</p>`
    bindRoleButtons(list)
    return
  }
  const sets = Object.keys(manifest.animations || {}).filter(s => !s.startsWith("_"))
  h += `<hr><h3>Model ${sel.index + 1}</h3>`
  h += field("Model", `<input data-k="model" list="modelids" value="${esc(e.model)}">`, "The model id (see the All models tab)")
  h += field("Weight", `<input data-k="weight" type="number" step="0.1" value="${e.weight ?? ""}" placeholder="1">`, "How often this model is picked compared with the others")
  h += field("Scale", `<input data-k="scale" type="number" step="0.05" value="${e.scale ?? ""}" placeholder="1">`, "Multiplies the size")
  h += field("Fit", `<select data-k="fit"><option value="">role default (${r.fit})</option>${["none", "height", "footprint", "cell", "length"].map(f => `<option ${e.fit === f ? "selected" : ""}>${f}</option>`).join("")}</select>`, "How the model is sized")
  h += field("Height", `<input data-k="height" type="number" step="0.1" value="${e.height ?? ""}" placeholder="for fit: height">`)
  h += field("Front", `<select data-k="front">${["+z", "-z", "+x", "-x"].map(f => `<option ${(e.front || "+z") === f ? "selected" : ""}>${f}</option>`).join("")}</select>`, "Which side of the model is its front in the file")
  h += field("Turn (°)", `<input data-k="yaw" type="number" step="15" value="${e.yaw ?? ""}" placeholder="0">`)
  h += field("Rotate (°)", xyz("rotate", e.rotate))
  h += field("Offset (m)", xyz("offset", e.offset))
  h += field("Align", `<select data-k="align"><option value="">default</option>${["base", "top", "center", "pivot"].map(f => `<option ${e.align === f ? "selected" : ""}>${f}</option>`).join("")}</select>`, "base: bottom centre on the ground; pivot: keep the file's own origin")
  if (r.group === "flora") h += field("Collider", `<input data-k="collider" type="number" step="0.1" value="${e.collider ?? ""}" placeholder="trunk radius">`)
  if (actor) {
    h += field("Animations", `<select data-k="anims"><option value="">model's own clips</option>${sets.map(s => `<option ${e.anims === s ? "selected" : ""}>${esc(s)}</option>`).join("")}</select>`)
    h += field("Strike", `<input data-k="strike" type="number" step="0.05" value="${e.strike ?? ""}" placeholder="0.45">`, "Where in the attack clip the blow lands (0-1)")
  }
  h += `<div class="note">Filters (where): only use this model when the game's context matches.</div><textarea data-json="where">${esc(JSON.stringify(e.where || {}, null, 1))}</textarea>`
  if (actor) {
    h += `<div class="note">Parts: extra rigged models bound to this skeleton, one picked per slot (null = none).</div><textarea data-json="parts">${esc(JSON.stringify(e.parts || {}, null, 1))}</textarea>`
    h += `<div class="note">Tint: material name pattern → "skin" or "hair" (coloured by race). Keep: material pattern → bones whose part of the mesh is kept.</div><textarea data-json="tint">${esc(JSON.stringify(e.tint || {}, null, 1))}</textarea><textarea data-json="keep">${esc(JSON.stringify(e.keep || {}, null, 1))}</textarea>`
  }
  h += `<div class="err"></div><div class="row"><button id="dup">Duplicate</button><button id="del">Remove from role</button></div>`
  p.innerHTML = h
  bindRoleButtons(list)
  // live edits
  p.querySelectorAll("[data-k]").forEach(inp =>
    inp.addEventListener("input", () => {
      const k = inp.dataset.k
      const v = inp.type === "number" ? num(inp.value) : inp.value || undefined
      if (v === undefined) delete e[k]
      else e[k] = v
      setDirty()
      refreshSoon()
    }),
  )
  p.querySelectorAll("[data-xyz]").forEach(inp =>
    inp.addEventListener("input", () => {
      const k = inp.dataset.xyz
      const vals = [...p.querySelectorAll(`[data-xyz="${k}"]`)].map(i => num(i.value) || 0)
      if (vals.every(v => v === 0)) delete e[k]
      else e[k] = vals
      setDirty()
      refreshSoon()
    }),
  )
  p.querySelectorAll("[data-json]").forEach(ta =>
    ta.addEventListener("input", () => {
      const k = ta.dataset.json
      try {
        const v = JSON.parse(ta.value || "{}")
        if (!Object.keys(v).length) delete e[k]
        else e[k] = v
        p.querySelector(".err").textContent = ""
        setDirty()
        refreshSoon()
      } catch (err) {
        p.querySelector(".err").textContent = `${k}: ${err.message}`
      }
    }),
  )
  // preview controls
  if (actor) {
    const races = Object.keys(RACES)
    $("#viewbar").innerHTML = `<select id="v-race">${races.map(x => `<option ${x === view.race ? "selected" : ""}>${x}</option>`).join("")}</select><select id="v-anim">${["idle", "walk", "run", "attack", "attack2", "attack3", "hit", "die", "talk", "work"].map(x => `<option ${x === view.anim ? "selected" : ""}>${x}</option>`).join("")}</select><button id="v-seed" title="Pick other parts (hair, beard…)">Reroll parts</button>`
    $("#v-race").onchange = ev => ((view.race = ev.target.value), refreshPreview())
    $("#v-anim").onchange = ev => (view.anim = ev.target.value)
    $("#v-seed").onclick = () => ((view.seed = (view.seed * 48271) % 2147483647 || 7), refreshPreview())
  } else if (role === "building") {
    $("#viewbar").innerHTML = `Plot <input id="v-w" type="number" value="${view.plotW}" style="width:50px"> × <input id="v-d" type="number" value="${view.plotD}" style="width:50px"> m`
    $("#v-w").oninput = ev => ((view.plotW = num(ev.target.value) || 7), refreshSoon())
    $("#v-d").oninput = ev => ((view.plotD = num(ev.target.value) || 6), refreshSoon())
  }
}

function xyz(k, v = [0, 0, 0]) {
  return `<div class="xyz">${[0, 1, 2].map(i => `<input data-xyz="${k}" type="number" step="${k === "rotate" ? 15 : 0.05}" value="${v?.[i] ?? 0}">`).join("")}</div>`
}

function bindRoleButtons(list) {
  const p = $("#props")
  p.querySelectorAll("[data-pick]").forEach(b => (b.onclick = () => select({ ...sel, index: Number(b.dataset.pick) })))
  p.querySelector("#addbtn").onclick = () => {
    const id = p.querySelector("#addmodel").value.trim()
    if (!catalog.models[id]) return alert("Pick a model id from the list (type to search).")
    list.push({ model: id })
    setDirty()
    select({ ...sel, index: list.length - 1 })
  }
  const dup = p.querySelector("#dup")
  if (dup)
    dup.onclick = () => {
      list.splice(sel.index + 1, 0, JSON.parse(JSON.stringify(list[sel.index])))
      setDirty()
      select({ ...sel, index: sel.index + 1 })
    }
  const del = p.querySelector("#del")
  if (del)
    del.onclick = () => {
      list.splice(sel.index, 1)
      if (!list.length) delete manifest.roles[sel.role]
      setDirty()
      select({ ...sel, index: Math.max(0, sel.index - 1) })
    }
}

function renderKitProps(p) {
  const kit = manifest.kits[sel.kitName][sel.index]
  const isBuilding = sel.kitName === "building"
  let h = `<h3>${isBuilding ? "Building" : "Interior"} kit ${sel.index + 1}</h3>`
  h += `<div class="note">${
    isBuilding
      ? "Walls, doorways and windows are 'grid' wide and 'storey' tall, placed by their own origin with their outside facing +Z. A panel can be {model, with: [...]} to add pieces at the same spot (window frames, shutters; {oneOf: [...]} picks one, null for none). doorLeaf offsets move the door inside the doorway."
      : "floor tiles are laid on the grid and stretched to the room; wall panels are stacked to the room height; door/doorLeaf make the way out."
  } Preview updates as you type.</div>`
  h += `<textarea id="kitjson" style="min-height:360px">${esc(JSON.stringify(kit, null, 1))}</textarea><div class="err"></div>`
  h += `<div class="row"><button id="kitdel">Delete kit</button></div>${modelOptions()}`
  p.innerHTML = h
  p.querySelector("#kitjson").addEventListener("input", ev => {
    try {
      manifest.kits[sel.kitName][sel.index] = JSON.parse(ev.target.value)
      p.querySelector(".err").textContent = ""
      setDirty()
      refreshSoon()
    } catch (err) {
      p.querySelector(".err").textContent = err.message
    }
  })
  p.querySelector("#kitdel").onclick = () => {
    if (!confirm("Delete this kit?")) return
    manifest.kits[sel.kitName].splice(sel.index, 1)
    setDirty()
    sel = null
    renderList()
    renderProps()
    clearStage()
  }
  const types = ["house", "shop", "smithy", "guild", "temple", "manor", "hall", "fort", "yurt"]
  $("#viewbar").innerHTML = isBuilding
    ? `Plot <input id="v-w" type="number" value="${view.plotW}" style="width:50px"> × <input id="v-d" type="number" value="${view.plotD}" style="width:50px"> m <select id="v-type">${types.map(t => `<option ${t === view.type ? "selected" : ""}>${t}</option>`).join("")}</select><button id="v-kseed">Another layout</button>`
    : `Room <input id="v-rw" type="number" value="${view.room[0]}" style="width:46px"> × <input id="v-rd" type="number" value="${view.room[1]}" style="width:46px"> × <input id="v-rh" type="number" value="${view.room[2]}" style="width:46px"> m`
  if (isBuilding) {
    $("#v-w").oninput = ev => ((view.plotW = num(ev.target.value) || 7), refreshSoon())
    $("#v-d").oninput = ev => ((view.plotD = num(ev.target.value) || 6), refreshSoon())
    $("#v-type").onchange = ev => ((view.type = ev.target.value), refreshPreview())
    $("#v-kseed").onclick = () => ((view.kitSeed += 1), refreshPreview())
  } else
    ["#v-rw", "#v-rd", "#v-rh"].forEach((s, i) => ($(s).oninput = ev => ((view.room[i] = num(ev.target.value) || view.room[i]), refreshSoon())))
}

function renderModelProps(p) {
  const m = catalog.models[sel.id]
  const roles = Object.keys(ROLES)
  let h = `<h3>${esc(short(sel.id))}</h3><div class="note" style="word-break:break-all">${esc(sel.id)}</div>`
  h += `<div class="note">${m.size.map(v => v.toFixed(2)).join(" × ")} m · ${m.tris} triangles${m.skinned ? ` · rigged (${m.joints} bones)` : ""}${m.clips.length ? ` · ${m.clips.length} clips` : ""}<br>Materials: ${esc(m.materials.join(", "))}<br>From: ${esc(m.source)}</div>`
  if (m.suggested.length) h += `<div class="note">Suggested roles: ${esc(m.suggested.join(", "))}</div>`
  if (m.clips.length) h += `<div class="note">Clips: ${esc(m.clips.map(c => c.name).join(", "))}</div>`
  h += `<div class="note">Shown exactly as converted, from its own origin (the arrow is +Z, its front by default).</div>`
  h += `<div class="row"><select id="torole">${roles.map(r => `<option ${m.suggested[0] === r ? "selected" : ""}>${esc(r)}</option>`).join("")}</select><button id="toadd">Add to role</button></div>`
  p.innerHTML = h
  p.querySelector("#toadd").onclick = () => {
    const role = p.querySelector("#torole").value
    ;(manifest.roles[role] ||= []).push({ model: sel.id })
    setDirty()
    tab = "roles"
    document.querySelectorAll(".tabs button").forEach(x => x.classList.toggle("sel", x.dataset.tab === "roles"))
    select({ kind: "role", role, index: manifest.roles[role].length - 1 })
  }
}

function renderJson() {
  sel = null
  clearStage()
  const p = $("#props")
  $("#viewbar").innerHTML = ""
  p.innerHTML = `<h3>assets/manifest.json</h3><textarea id="mjson" style="min-height:70vh">${esc(JSON.stringify(manifest, null, 2))}</textarea><div class="err"></div><div class="row"><button id="mapply" class="primary">Apply</button></div>`
  p.querySelector("#mapply").onclick = () => {
    try {
      manifest = JSON.parse(p.querySelector("#mjson").value)
      manifest.roles ||= {}
      setDirty()
      refreshIndex()
      p.querySelector(".err").textContent = "Applied."
    } catch (err) {
      p.querySelector(".err").textContent = err.message
    }
  }
}

// ---------------------------------------------------------------- save / build

async function save() {
  await api("manifest", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(manifest) })
  setDirty(false)
}
$("#save").onclick = () => save().catch(e => alert(`Save failed: ${e.message}`))
$("#build").onclick = async () => {
  try {
    await save()
    $("#log").style.display = "flex"
    $("#logtext").textContent = "Running npm run assets… (a first conversion of new packs can take a few minutes)"
    const r = await api("build", { method: "POST" })
    $("#logtext").textContent = r.log + (r.code ? `\n\nFinished with errors (exit code ${r.code}). See "Manifest errors" above.` : "\n\nDone. Reload the game to see the changes.")
    catalog = await api("catalog")
    refreshIndex()
    renderList()
  } catch (e) {
    $("#logtext").textContent = `Failed: ${e.message}`
  }
}
$("#logclose").onclick = () => ($("#log").style.display = "none")

// ---------------------------------------------------------------- start

resize()
try {
  ;[catalog, manifest] = await Promise.all([api("catalog"), api("manifest")])
  manifest.roles ||= {}
  manifest.kits ||= {}
  refreshIndex()
  setDirty(false)
  renderList()
} catch (e) {
  $("#status").textContent = `Could not load: ${e.message}. Run npm run assets first, and open this page with npm run workbench.`
}
