// The roles a pack model can fill. The world generator asks for a role (with
// some context, such as the region or a town's style) and gets a pack model
// if assets/manifest.json assigns one; otherwise it builds its own.
//
// Shared by the asset build tool (tools/assets) and the game.
//
//   fit      how the model is sized when placed:
//              none       native size (after the pack's unit fix) times `scale`
//              height     scaled so its height matches `height`
//              footprint  scaled to sit inside the generator's w × d footprint
//              cell       stretched to one dungeon cell (and the wall height)
//              length     weapons: scaled so the part above the grip (the
//                         origin) is as long as the game's weapon of that kind
//   height   typical height in metres, for `fit: "height"` and sanity checks
//   where    context keys an entry may filter on
//   words    file-name keywords the build tool uses to suggest the role

const FLORA = {
  parasol: { height: 12, words: ["parasol", "mushroom", "fungus", "shroom"], about: "Giant emperor-parasol mushroom tree" },
  gashTree: { height: 9, words: ["tree", "oak", "birch", "ash_tree"], about: "Broadleaf or conifer tree of the West Rift" },
  pine: { height: 10, words: ["pine", "fir", "spruce", "conifer"], about: "Snowy pine (northern isle)" },
  swampTree: { height: 8, words: ["swamp", "mangrove", "willow"], about: "Rooted swamp tree (Brine Coast)" },
  deadTree: { height: 7, words: ["dead", "bare", "dry_tree", "snag"], about: "Dead, leafless tree" },
  shrub: { height: 1.2, words: ["bush", "shrub", "plant", "fern"], about: "Bush or fern" },
  grass: { height: 0.6, words: ["grass", "weed", "reed"], about: "Grass tuft (scattered flora, not the grass carpet)" },
  thornroot: { height: 1.4, words: ["thorn", "bramble", "thornroot", "root"], about: "Thorny thornroot" },
  rock: { height: 0.8, words: ["rock", "stone", "pebble"], about: "Small rock" },
  boulder: { height: 3, words: ["boulder", "cliff", "big_rock", "rock_large"], about: "Large boulder (has a collider)" },
}

const PROPS = {
  altar: 1.1, anvil: 0.8, banner: 3, barrel: 1.2, bed: 0.7, bedroll: 0.3, bones: 0.4, bookshelf: 2.2, brazier: 1.2,
  bunk: 1.8, candles: 0.4, chair: 1, chest: 0.8, chestOpen: 1.2, counter: 1.1, crate: 1.1, coffin: 0.8, dummy: 1.8,
  firepit: 0.6, fleshpillar: 6, forge: 1.6, gear: 2, hearth: 1.6, lamp: 0.6, longtable: 0.85, loom: 1.8, pew: 1,
  pipe: 1, rack: 1.8, rug: 0.05, sack: 0.7, shelf: 2, stalagmite: 2, statue: 2.6, stool: 0.5, table: 0.85, throne: 2.2,
  totem: 2.5, urn: 1.1, well: 3, stall: 2.6, lamppost: 3.2,
  workbench: 1, whetstone: 1.1, cauldron: 0.9, bookstand: 1.4, candlestand: 1.3, kegs: 1.3, nightstand: 1.2, stairs: 3, chandelier: 1.4, pilaster: 3,
}
const PROP_WORDS = {
  bookshelf: ["bookshelf", "bookcase"], candles: ["candle"], chest: ["chest"], chestOpen: ["chest_open", "chestopen"],
  longtable: ["long_table", "banquet"], rug: ["rug", "carpet"], urn: ["urn", "vase", "pot"], lamp: ["lamp", "lantern"],
  lamppost: ["lamp_post", "lamppost", "streetlight"], stall: ["stall", "market"], well: ["well"], statue: ["statue"],
  bones: ["bone", "skull"], firepit: ["firepit", "campfire"], sack: ["sack", "bag"], banner: ["banner", "flag"],
}

export const ROLES = {}

for (const [type, r] of Object.entries(FLORA))
  ROLES[`flora.${type}`] = { group: "flora", fit: "none", height: r.height, where: ["region"], words: r.words, about: r.about }
for (const [kind, h] of Object.entries(PROPS))
  ROLES[`prop.${kind}`] = { group: "prop", fit: "none", height: h, where: ["theme", "style"], words: PROP_WORDS[kind] || [kind], about: `Prop: ${kind}` }

ROLES.building = {
  group: "building",
  fit: "footprint",
  height: 7,
  where: ["style", "type"],
  words: ["house", "building", "bld_", "hut", "cottage", "shop", "tavern", "inn", "temple", "tower", "hall"],
  about: "A town building. Filter with style (merovan, durath, sorvenn, vessari, ashwalker, hrothi) and type (house, shop, smithy, temple, guild, manor, fort, hall, yurt)",
}

for (const piece of ["wall", "floor", "ceiling", "pillar"])
  ROLES[`dungeon.${piece}`] = {
    group: "dungeon",
    fit: "cell",
    height: piece === "floor" || piece === "ceiling" ? 0.3 : 4,
    where: ["theme"],
    words: { wall: ["wall"], floor: ["floor", "tile"], ceiling: ["ceiling", "roof"], pillar: ["pillar", "column"] }[piece],
    about: `Modular dungeon ${piece}. Filter with theme (cave, barrow, tomb, kaldur, abyssal, citadel)`,
  }

ROLES.npc = {
  group: "character",
  fit: "height",
  height: 1.8,
  where: ["race", "sex", "role"],
  words: ["character", "chr_", "man", "woman", "male", "female", "villager", "npc", "human"],
  about: "A person. Filter with race, sex (male, female) and role (commoner, guard, trader, smith, priest, guildmaster, ...). Needs a rig and an animation set",
}

// Dressing: props scattered where the world would otherwise look bare.
const DECOR = {
  town: { where: ["style"], about: "Clutter beside town buildings and around the plaza: crates, barrels, sacks, carts, benches, fences. Filter with style" },
  entrance: { where: ["theme"], about: "Props on the ground around dungeon entrances: crates, urns, torches, rocks. Filter with theme (cave, tomb, barrow, kaldur, abyssal, citadel)" },
  wild: { where: ["region"], about: "Small ground cover scattered through the wilds: pebbles, flowers, clover, mushrooms. Filter with region" },
}
for (const [k, d] of Object.entries(DECOR)) ROLES[`decor.${k}`] = { group: "decor", fit: "none", height: 1, where: d.where, words: [], about: d.about }

// Interior dressing (loaded with each building's interior):
const ROOM = {
  dining: "Tableware on a home's table: plates, mugs, cutlery, a candle",
  tavern: "On den and barracks tables and bars: mugs, bottles, coins",
  feast: "On a hall's long table: plates, chalices, candles, food",
  study: "On a mage's table: books, scrolls, potions, a candle",
  goods: "On a shop counter: coin piles, pouches, potions, books",
  tools: "On a smith's counter or workbench: buckets, pots, keys, pouches",
  shelf: "On shelves: book groups, bottles, potions, pots",
  books: "On bookcases: book groups and stacks",
  altar: "On an altar: chalice, candles, a book",
  wall: "Hung on walls: shields, peg racks (their back against the wall, front +Z)",
  light: "Lights hung on walls: lanterns, torches. They light the room",
  floor: "Odds and ends by the walls: buckets, sacks, rope, crates",
  railing: "Railing along the front of a hall's gallery, about 2 m wide",
}
for (const [k, about] of Object.entries(ROOM)) ROLES[`room.${k}`] = { group: "room", fit: "none", height: 0.3, where: ["style"], words: [], about }

ROLES.player = {
  group: "character",
  fit: "height",
  height: 1.8,
  where: ["sex"],
  words: [],
  about: "The player's body, one entry per sex. Every model listed in each parts slot (outfit, hair, beard) is offered in character creation; null means \"none\". Needs a rig and an animation set",
}

// creature.<id> roles are added from the creature list (see creatureRoles)
export function creatureRoles(creatures) {
  for (const [id, def] of Object.entries(creatures))
    ROLES[`creature.${id}`] = {
      group: "creature",
      fit: "none",
      height: 1.6 * (def.scale || 1),
      where: [],
      words: [id.toLowerCase(), (def.name || "").toLowerCase()].filter(Boolean),
      about: `Creature: ${def.name || id}`,
    }
}

// Held items. Weapon models are placed with the grip at the origin and the
// blade (or head) pointing up +Y, the game's own convention; a pack model's
// origin should sit where the hand holds it (use `offset` when it doesn't).
//   weapon.<base>    any weapon of that base, filtered by material
//   shield           shields, filtered by material
//   artifact.<id>    one legendary artifact or rare unique sword
export function weaponRoles(bases, uniques) {
  for (const [base, b] of Object.entries(bases)) {
    if (b.thrown) continue
    ROLES[`weapon.${base}`] = {
      group: "weapon",
      fit: "length",
      height: 1,
      where: ["material"],
      words: [base.replace(/ /g, "_"), base.replace(/ /g, "")],
      about: `Weapon: ${base}. Filter with material (iron, chitin, steel, silver, tuskar, kaldur, starmetal, crystal, obsidian, abyssal). Grip at the origin, blade up +Y`,
    }
  }
  ROLES.shield = { group: "weapon", fit: "none", height: 0.7, where: ["material"], words: ["shield"], about: "Shield, worn on the left arm. Filter with material. Front facing +Z" }
  for (const [id, u] of Object.entries(uniques))
    if (u.kind === "weapon")
      ROLES[`artifact.${id}`] = { group: "weapon", fit: "length", height: 1, where: [], words: [], about: `${u.rare ? "Rare unique sword" : "Artifact"}: ${u.name} (${u.base})` }
}

// Animation clip names an animation set maps for characters and creatures.
// `attack`, `cast`, `hit` and `die` are played to match the game's own timing.
export const CLIPS = ["idle", "walk", "run", "attack", "attack2", "attack3", "cast", "hit", "die", "talk", "work"]

// Does this manifest entry match the context?  Entry `where` values may be a
// string or a list; context keys the entry doesn't mention always match.
export function matches(entry, ctx = {}) {
  const w = entry.where
  if (!w) return true
  for (const [k, v] of Object.entries(w)) {
    if (ctx[k] === undefined) continue
    const list = Array.isArray(v) ? v : [v]
    if (!list.includes(ctx[k])) return false
  }
  return true
}
