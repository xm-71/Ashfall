// Buildings assembled from a modular kit (wall panels, corners, doors, roofs
// and gable ends on a fixed grid), for packs that have no whole houses.
//
// A kit, from assets/manifest.json "kits.building":
//   grid       panel width in metres (default 2)
//   storey     panel height (default 3)
//   wall, wallBase, window, door   wall panels: plain, ground floor, with a window, with a doorway.
//              A panel may be { model, with: [...] } to add pieces at the
//              panel's origin, e.g. the window frame that fills its opening;
//              a with-item is a model id, { model, offset }, or { oneOf: [...] }
//              to pick one (null = nothing), e.g. open, closed or no shutters.
//   doorLeaf   [{ model, offset: [x, y, z] }] the door in the doorway, from the doorway panel's origin
//   corner     corner posts
//   roofs      { "WxD": model } roofs sized W (across, x) by D (deep, z) in metres
//   gables     { "W": model } gable ends for a roof W wide
//   chimney    chimneys (optional)
//   stories    { type: [min, max] } storeys per building type (default 1-2, big buildings 2)
//
// Pieces are placed by their own origin: panels stand on the plot edge with
// their +Z face outward. The building's front (its door) faces -Z.
import * as THREE from "three"

const UP = new THREE.Vector3(0, 1, 0)
const BIG = { temple: true, fort: true, manor: true, hall: true, guild: true }

function choose(list, r) {
  if (!list || !list.length) return null
  return list[Math.floor(r() * list.length) % list.length]
}
const modelOf = x => (typeof x === "string" ? x : x?.model)

// Pick the roof footprint that best fills the plot without spilling far over it.
export function kitFootprint(kit, w, d) {
  const sizes = Object.keys(kit.roofs || {}).map(k => k.split("x").map(Number)).filter(([a, b]) => a > 0 && b > 0)
  if (!sizes.length) return null
  const fits = sizes.filter(([a, b]) => a <= w + 1.5 && b <= d + 1.5)
  const pool = fits.length ? fits : sizes
  pool.sort((p, q) => Math.abs(p[0] - w) + Math.abs(p[1] - d) - (Math.abs(q[0] - w) + Math.abs(q[1] - d)) || q[0] * q[1] - p[0] * p[1])
  return pool[0]
}

// -> { pieces: [{ model, matrix }], W, D, H } in the building's own frame
export function assembleBuilding(kit, { w, d, type = "house", seed = 1 }) {
  let s = seed >>> 0 || 1
  const r = () => ((s = (Math.imul(s ^ (s >>> 13), 1103515245) + 12345) >>> 0) % 100000) / 100000
  const fp = kitFootprint(kit, w, d)
  if (!fp) return null
  const [W, D] = fp
  const g = kit.grid || 2
  const h = kit.storey || 3
  const [lo, hi] = kit.stories?.[type] || (BIG[type] ? [2, 2] : [1, 2])
  const storeys = lo + Math.floor(r() * (hi - lo + 1))
  const pieces = []
  const put = (piece, x, y, z, yaw) => {
    const model = modelOf(piece)
    if (!model) return
    pieces.push({ model, matrix: new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(UP, yaw), new THREE.Vector3(1, 1, 1)) })
    // extra pieces that belong to this one (window frames, shutters)
    for (let item of piece.with || []) {
      if (item && item.oneOf) item = choose(item.oneOf, r)
      if (!item) continue
      const [ox, oy, oz] = item.offset || [0, 0, 0]
      const c = Math.cos(yaw)
      const sn = Math.sin(yaw)
      put(typeof item === "string" ? item : { model: item.model }, x + ox * c + oz * sn, y + oy, z - ox * sn + oz * c, yaw)
    }
  }
  // sides: [length, centre of the side, outward normal]
  const sides = [
    { n: [0, -1], len: W, at: t => [t, -D / 2], front: true },
    { n: [0, 1], len: W, at: t => [-t, D / 2] },
    { n: [-1, 0], len: D, at: t => [-W / 2, -t] },
    { n: [1, 0], len: D, at: t => [W / 2, t] },
  ]
  for (let st = 0; st < storeys; st++) {
    const y = st * h
    for (const side of sides) {
      const slots = Math.max(1, Math.round(side.len / g))
      const doorSlot = Math.floor((slots - 1) / 2)
      const yaw = Math.atan2(side.n[0], side.n[1])
      for (let i = 0; i < slots; i++) {
        const t = -side.len / 2 + g * (i + 0.5)
        const [x, z] = side.at(t)
        let model
        if (st === 0 && side.front && i === doorSlot) {
          model = choose(kit.door, r)
          const leaf = choose(kit.doorLeaf, r)
          if (leaf) {
            const [ox, oy, oz] = leaf.offset || [0, 0, 0]
            // the offset is in the doorway panel's frame
            const c = Math.cos(yaw)
            const sn = Math.sin(yaw)
            put(leaf.model, x + ox * c + oz * sn, y + oy, z - ox * sn + oz * c, yaw)
          }
        } else if (r() < (st === 0 ? (side.front ? 0.55 : 0.35) : 0.5)) model = choose(kit.window, r)
        else model = choose(st === 0 && kit.wallBase?.length ? kit.wallBase : kit.wall, r)
        put(model || choose(kit.wall, r), x, y, z, yaw)
      }
    }
    // posts at the corners
    const post = choose(kit.corner, r)
    for (const [cx, cz] of [[-W / 2, -D / 2], [W / 2, -D / 2], [W / 2, D / 2], [-W / 2, D / 2]]) put(post, cx, y, cz, 0)
  }
  const top = storeys * h
  put(kit.roofs[`${W}x${D}`], 0, top, 0, 0)
  const gable = kit.gables?.[String(W)]
  if (gable) {
    put(gable, 0, top, -D / 2, Math.PI)
    put(gable, 0, top, D / 2, 0)
  }
  if (kit.chimney?.length && r() < 0.6) put(choose(kit.chimney, r), W / 2 - 1, top - 0.6, D / 4, 0)
  return { pieces, W, D, H: top + 2 }
}
