// Furnished interiors for town buildings. Pure data: room size, furniture
// (type, position, rotation), where the people inside stand, and lights.
// The room is centred on the origin with the floor at y = 0 and the door in
// the wall at -z. A piece's rot is the way it faces: 0 = +z, so pieces
// against the back wall face the door with rot π.
import { RNG } from "../core/rng.js"

// Furniture footprints for collision: [half-width, half-depth] boxes, or a
// radius for round things. null means you can walk over it.
export const FOOTPRINT = {
  counter: [1.6, 0.4], shelf: [1.2, 0.3], bookshelf: [1.1, 0.3], rack: [1.1, 0.3], table: [0.9, 0.55], longtable: [2.6, 0.6],
  chair: 0.3, stool: 0.25, bed: [0.55, 1.05], bunk: [0.55, 1.05], barrel: 0.45, crate: [0.45, 0.45], anvil: [0.4, 0.25],
  forge: [0.9, 0.7], altar: [1.2, 0.5], pew: [1.4, 0.3], statue: 0.55, hearth: [1.1, 0.5], firepit: 0.9, throne: [0.6, 0.55],
  dummy: 0.35, chest: [0.5, 0.35], urn: 0.3, bedroll: null, rug: null, banner: null, candles: null, totem: 0.3, loom: [0.8, 0.4],
  workbench: [1.0, 0.45], whetstone: [0.55, 0.45], cauldron: 0.5, bookstand: 0.3, candlestand: 0.35, kegs: [0.7, 0.4], nightstand: [0.35, 0.2],
  stairs: [0.9, 2.35], gpost: 0.2, clutter: null, wall: null, chandelier: null, pilaster: null, gallery: null, floorclutter: 0.3,
}

// Pieces that only exist as pack models (no generated version).
export const PACK_ONLY = new Set(["workbench", "whetstone", "cauldron", "bookstand", "candlestand", "kegs", "nightstand", "stairs", "clutter", "wall", "chandelier", "pilaster", "gallery", "gpost", "floorclutter"])

// Tall pieces that stand against a wall; nothing hangs on the wall above them.
const TALL = new Set(["shelf", "bookshelf", "rack", "banner", "statue", "forge", "hearth", "bunk", "loom", "throne", "kegs", "stairs", "nightstand"])

export function generateInterior(town, b) {
  const rng = new RNG(`interior:${town.id}:${b.idx}:${town.x.toFixed(1)}`)
  const style = town.style
  const big = b.type === "temple" || b.type === "manor" || b.type === "fort" || b.type === "hall"
  const W = Math.round(Math.max(8, b.w * 1.25) + (big ? 4 : 0))
  const D = Math.round(Math.max(8, b.d * 1.35) + (big ? 5 : 0))
  const H = big ? 6 : 4
  const f = []
  const spots = [] // where the people inside stand: {x, z, yaw}
  const lights = []
  const add = (type, x, z, rot = 0, extra = {}) => f.push({ type, x, z, rot, ...extra })
  const back = D / 2 - 0.8
  const left = -W / 2 + 0.6
  const right = W / 2 - 0.6
  // facing the door (toward -z) is yaw π
  const facingDoor = Math.PI
  const kind = b.label === "Fighters Guild" ? "fighters" : b.label === "Mages Guild" ? "mages" : b.label === "Back-Alley Den" ? "thieves" : b.label === "Quiet Hand Guildhall" ? "quietHand" : b.type

  switch (kind) {
    case "shop":
      add("counter", 0, back - 1.6, Math.PI)
      spots.push({ x: 0, z: back - 0.6, yaw: facingDoor })
      for (let x = left + 1; x < right - 0.8; x += 2.4) add("shelf", x, back, Math.PI)
      for (let i = 0; i < 3; i++) add(rng.chance(0.5) ? "barrel" : "crate", left + 0.3, -D / 4 + i * 1.1)
      add("rug", 0, 0)
      add("kegs", right - 0.5, -D / 4 + 1, -Math.PI / 2)
      lights.push([0, H - 0.6, 0])
      break
    case "smithy":
      add("forge", right - 1, back - 0.8, Math.PI)
      add("anvil", right - 2.4, back - 2.2, Math.PI + 0.3)
      spots.push({ x: right - 2.4, z: back - 3.1, yaw: 0, work: "hammer" })
      add("rack", left, 0, Math.PI / 2)
      add("rack", left, 2.4, Math.PI / 2)
      add("counter", -0.5, back - 1.4, Math.PI)
      add("barrel", right - 0.4, -D / 4)
      add("workbench", left + 1.2, back - 0.55, Math.PI)
      add("whetstone", right - 1.2, 0.4, -Math.PI / 2)
      lights.push([right - 1, 1.2, back - 0.8, 0xff7a30])
      lights.push([0, H - 0.6, -1])
      break
    case "temple":
      add("altar", 0, back - 0.8, Math.PI)
      add("statue", -2.2, back - 0.5, Math.PI)
      add("statue", 2.2, back - 0.5, Math.PI)
      spots.push({ x: 0, z: back - 2, yaw: facingDoor })
      for (let z = -D / 2 + 3; z < back - 3.4; z += 1.8) for (const sx of [-1, 1]) add("pew", sx * (W / 4 + 0.2), z)
      add("candles", -1, back - 0.6)
      add("candles", 1, back - 0.6)
      for (const sx of [-1, 1]) add("candlestand", sx * 1.4, back - 2.2)
      for (const sx of [-1, 1]) add("banner", sx * (W / 2 - 0.05), 0, sx > 0 ? -Math.PI / 2 : Math.PI / 2)
      lights.push([0, H - 1, back - 2, 0xffd8a0], [0, H - 1, -1])
      break
    case "mages":
      for (let x = left + 1.1; x < right - 0.9; x += 2.3) add("bookshelf", x, back, Math.PI)
      add("bookshelf", left, 0, Math.PI / 2)
      add("table", 0, 0.5)
      add("candles", 0, 0.5)
      add("chair", 0, 1.4, Math.PI)
      spots.push({ x: 0, z: 2, yaw: facingDoor })
      add("rug", 0, 0.2)
      add("bookstand", right - 1, -0.5, -Math.PI / 2)
      add("cauldron", left + 1.6, -D / 4)
      lights.push([0, H - 0.8, 0.5, 0xc0d0ff])
      break
    case "fighters":
      add("rack", left, 0, Math.PI / 2)
      add("rack", right, 0, -Math.PI / 2)
      add("dummy", -1.8, 2)
      add("dummy", 1.8, 2)
      add("table", 0, back - 1, Math.PI)
      spots.push({ x: 0, z: back - 2, yaw: facingDoor })
      add("chest", right - 0.7, back - 0.5, Math.PI)
      lights.push([0, H - 0.6, 0])
      break
    case "thieves":
      add("counter", -W / 4, back - 1.2, Math.PI)
      spots.push({ x: -W / 4, z: back - 0.4, yaw: facingDoor })
      for (let i = 0; i < 3; i++) {
        const x = W / 4 - 0.4 + (i % 2) * 0.6
        const z = -D / 4 + i * 2
        add("table", x, z)
        add("stool", x - 1.1, z)
        add("stool", x + 1.1, z)
      }
      add("kegs", left + 0.8, back - 0.4, Math.PI)
      lights.push([0, H - 0.8, 0, 0xffb060])
      break
    case "quietHand":
      add("table", 0, back - 1.4, Math.PI)
      add("chair", 0, back - 0.6, facingDoor)
      spots.push({ x: 1.2, z: back - 1.6, yaw: facingDoor })
      add("banner", 0, back + 0.25, Math.PI)
      add("statue", left + 0.6, back - 0.6, Math.PI)
      lights.push([0, H - 1, back - 1.4, 0xff5a40])
      break
    case "manor":
    case "hall":
      add("longtable", 0, 0.5)
      for (let x = -2; x <= 2; x += 1.3) for (const sz of [-1, 1]) add("chair", x, 0.5 + sz * 1.1, sz > 0 ? Math.PI : 0)
      add("throne", 0, back - 0.8, Math.PI)
      spots.push({ x: 0, z: back - 1.8, yaw: facingDoor })
      if (style === "hrothi") add("hearth", 0, -1.2)
      for (const sx of [-1, 1]) add("banner", sx * (W / 2 - 0.05), 1, sx > 0 ? -Math.PI / 2 : Math.PI / 2)
      lights.push([0, H - 1, 0], [0, H - 1, back - 2])
      break
    case "fort":
      for (let z = -D / 2 + 2.5; z < back - 2; z += 2.4) add("bunk", left + 0.6, z)
      add("rack", right, 0, -Math.PI / 2)
      add("table", 0, back - 1.5, Math.PI)
      spots.push({ x: 0, z: back - 2.6, yaw: facingDoor })
      add("banner", 0, back + 0.25, Math.PI)
      lights.push([0, H - 0.8, 0])
      break
    case "yurt":
      add("firepit", 0, 0.3)
      add("bedroll", -W / 4, back - 0.8)
      add("bedroll", W / 4, back - 0.8)
      add("totem", right - 0.5, back - 0.5, Math.PI)
      spots.push({ x: 0, z: back - 1.8, yaw: facingDoor })
      lights.push([0, 1.2, 0.3, 0xff8a40])
      break
    default: {
      // a home: bed, table and chairs, a hearth or stove, a chest
      add("bed", right - 0.7, back - 1.1)
      add("nightstand", right - 1.6, back - 0.35, Math.PI)
      add("chest", right - 0.7, back - 2.6)
      add("table", -0.6, 0.6)
      add("chair", -0.6, 1.5, Math.PI)
      add("chair", -1.6, 0.6, Math.PI / 2)
      add(style === "hrothi" ? "hearth" : rng.chance(0.5) ? "loom" : "shelf", left + (style === "hrothi" ? 1.2 : 0.9), back - (style === "hrothi" ? 0.6 : 0), Math.PI)
      add("rug", 0.3, -0.5)
      if (rng.chance(0.6)) add("barrel", left + 0.3, -D / 2 + 1.2)
      if (rng.chance(0.6)) add("urn", right - 0.4, -D / 2 + 1)
      spots.push({ x: -1.4, z: 2, yaw: facingDoor, wander: true }, { x: 1.6, z: -0.8, yaw: -Math.PI / 2, wander: true })
      lights.push([0, H - 0.6, 0.4])
    }
  }
  dressRoom({ W, D, H, kind, style, f, lights, rng })
  // lanterns glow where the lights hang
  return { W, D, H, style, kind, furniture: f, spots, lights, name: b.label || "Home" }
}

// Which clutter set goes on a surface, by piece and room.
function clutterSet(type, kind) {
  if (type === "bookshelf") return "books"
  if (type === "shelf" || type === "nightstand") return kind === "mages" ? "books" : "shelf"
  if (type === "altar") return "altar"
  if (type === "workbench") return "tools"
  if (type === "counter") return kind === "smithy" ? "tools" : kind === "thieves" ? "tavern" : "goods"
  if (type === "table" || type === "longtable") return kind === "mages" ? "study" : kind === "manor" || kind === "hall" ? "feast" : kind === "thieves" || kind === "fighters" || kind === "fort" ? "tavern" : "dining"
  return null
}

// The finishing touches, added after the room's main furniture:
//   clutter     things on each table, counter, shelf and altar (`on` = the host's index)
//   wall        lanterns, torches, shields and racks on the walls (`y` = height)
//   chandelier  hangs where a ceiling light is
//   pilaster    posts up the side walls under the ceiling beams
//   gallery     a raised walkway across the back of a big hall, with stairs up
//   floorclutter  buckets, sacks and crates in free spots by the walls
function dressRoom({ W, D, H, kind, style, f, lights, rng }) {
  const add = (type, x, z, rot = 0, extra = {}) => f.push({ type, x, z, rot, ...extra })
  const hosts = f.length
  for (let i = 0; i < hosts; i++) {
    const set = clutterSet(f[i].type, kind)
    if (set) add("clutter", f[i].x, f[i].z, f[i].rot, { on: i, set })
  }
  const nearTall = (x, z, r) => f.some(o => TALL.has(o.type) && Math.hypot(o.x - x, o.z - z) < r)
  const nearAny = (x, z, r) => f.some(o => o.type !== "rug" && o.type !== "clutter" && Math.hypot(o.x - x, o.z - z) < r)
  // architecture: a gallery and stairs in big halls; posts under the beams
  const big = H >= 6
  if (big && (kind === "manor" || kind === "hall" || kind === "fort")) {
    add("gallery", 0, D / 2 - 1.1, 0, { y: 3, depth: 2.2, width: W })
    for (const x of [-W / 4, W / 4]) add("gpost", x, D / 2 - 2.2 + 0.15) // its posts, drawn with the gallery
    const sx = W / 2 - 1
    if (!nearAny(sx, D / 2 - 4.6, 1.2)) add("stairs", sx, D / 2 - 4.6, 0)
  }
  if (kind !== "yurt")
    for (let z = -D / 2 + 1.5; z < D / 2; z += 2.5) for (const sx of [-1, 1]) add("pilaster", sx * (W / 2 - 0.12), z, sx > 0 ? -Math.PI / 2 : Math.PI / 2)
  // walls: every couple of metres along the side and back walls, clear of tall pieces
  if (kind !== "yurt") {
    const slots = []
    for (let z = -D / 2 + 2.6; z < D / 2 - 1.5; z += 2.5) for (const sx of [-1, 1]) slots.push([sx * (W / 2 - 0.05), z + 1.25, sx > 0 ? -Math.PI / 2 : Math.PI / 2])
    for (let x = -W / 2 + 2; x < W / 2 - 1.5; x += 3) slots.push([x, D / 2 - 0.05, Math.PI])
    let lit = 0
    for (const [x, z, rot] of slots) {
      if (nearTall(x, z, 1.3) || rng.chance(0.35)) continue
      const light = lit < 2 && rng.chance(0.5)
      if (light) lit++
      add("wall", x, z, rot, { y: light ? 1.9 : 1.5, set: light ? "light" : "wall" })
    }
  }
  // a chandelier where a ceiling light hangs (not in yurts or mushroom towers)
  if (kind !== "yurt" && style !== "sorvenn") for (const [x, y, z] of lights) if (y > 2) add("chandelier", x, z, 0, { ceiling: H })
  // odds and ends by the walls
  for (let k = 0; k < 4; k++) {
    const x = (rng.chance(0.5) ? -1 : 1) * (W / 2 - 0.5)
    const z = rng.range(-D / 2 + 1.5, D / 2 - 1)
    if (!nearAny(x, z, 1.1)) add("floorclutter", x, z, rng.range(0, 6.28))
  }
}
