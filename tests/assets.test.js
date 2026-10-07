import { test } from "node:test"
import assert from "node:assert/strict"
import * as THREE from "three"
import { ROLES, matches } from "../src/assets/roles.js"
import { assets } from "../src/assets/registry.js"

// a fake published pack: one 8 x 5 x 6 m house (front +Z), one 4 x 4 x 0.4 m wall
assets.index = {
  models: {
    "p/house": { min: [-4, 0, -3], max: [4, 5, 3], size: [8, 5, 6], bytes: 1 },
    "p/wall": { min: [-2, 0, -0.2], max: [2, 4, 0.2], size: [4, 4, 0.4], bytes: 1 },
    "p/rock": { min: [10, 2, 10], max: [12, 3, 12], size: [2, 1, 2], bytes: 1 },
  },
  roles: {
    building: [{ model: "p/house", where: { style: ["merovan", "vessari"] } }, { model: "p/house", where: { style: "hrothi", type: "hall" }, weight: 3 }],
    "dungeon.wall": [{ model: "p/wall" }],
    "flora.rock": [{ model: "p/rock" }],
  },
  animations: {},
}
for (const id of Object.keys(assets.index.models)) assets.gltf.set(id, { scene: new THREE.Group(), animations: [] })

const apply = (m, x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(m)
const near = (v, x, y, z) => assert.ok(v.distanceTo(new THREE.Vector3(x, y, z)) < 1e-6, `${v.toArray()} vs ${[x, y, z]}`)

test("roles cover every group the generators ask for", () => {
  for (const r of ["flora.parasol", "flora.boulder", "prop.barrel", "prop.chest", "building", "dungeon.wall", "dungeon.floor", "npc", "creature.loper", "creature.bandit"]) assert.ok(ROLES[r], r)
})

test("entries filter on context, ignoring keys the entry does not mention", () => {
  assert.equal(matches({ where: { style: ["merovan"] } }, { style: "merovan", type: "shop" }), true)
  assert.equal(matches({ where: { style: ["merovan"] } }, { style: "hrothi" }), false)
  assert.equal(matches({ where: { style: "hrothi", type: "hall" } }, { style: "hrothi", type: "house" }), false)
  assert.equal(matches({}, { anything: 1 }), true)
  assert.equal(assets.entries("building", { style: "sorvenn" }).length, 0)
  assert.equal(assets.entries("building", { style: "vessari", type: "shop" }).length, 1)
  assert.equal(assets.has("prop.barrel"), false)
})

test("pick is weighted and deterministic for a given number", () => {
  const ctx = {}
  const a = assets.pick("building", ctx, 0.1)
  const b = assets.pick("building", ctx, 0.9)
  assert.equal(a, assets.index.roles.building[0])
  assert.equal(b, assets.index.roles.building[1])
  assert.equal(assets.pick("building", ctx, 0.1), a)
})

test("buildings fit the plot and turn their front (+Z) to face -Z", () => {
  const e = assets.index.roles.building[0]
  const m = assets.entryMatrix(e, "building", { w: 7, d: 6 })
  // 8 x 6 house into a 7 x 6 plot: uniform scale 7/8
  const s = assets.placedSize(e, "building", { w: 7, d: 6 })
  assert.ok(Math.abs(s.x - 7) < 1e-6 && Math.abs(s.z - 5.25) < 1e-6, s.toArray().join())
  // the door side (+Z in the file) ends up at -Z, base on the ground
  near(apply(m, 0, 0, 3), 0, 0, -3 * 7 / 8)
})

test("dungeon walls stretch to the cell and wall height", () => {
  const e = assets.index.roles["dungeon.wall"][0]
  const s = assets.placedSize(e, "dungeon.wall", { w: 4, h: 6 })
  assert.ok(Math.abs(s.x - 4) < 1e-6 && Math.abs(s.y - 6) < 1e-6 && Math.abs(s.z - 0.4) < 1e-6, s.toArray().join())
})

test("models are centred on their base, wherever their pivot was", () => {
  const e = assets.index.roles["flora.rock"][0]
  const m = assets.entryMatrix(e, "flora.rock", {})
  near(apply(m, 11, 2, 11), 0, 0, 0)
})
