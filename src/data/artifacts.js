// Legendary artifacts: hand-made weapons and armour with lore and unique
// effects. Each world hides some of them with dungeon bosses, and every
// Abyssal shrine's master carries one.
//
// base/material build the item; the rest overrides it. `unique` names a
// special effect handled in combat code:
//   banish      small chance to kill a non-boss outright
//   paralyze    chance to freeze the target briefly
//   stagger     every hit staggers
//   absorbMagicka  strikes restore your magicka
//   absorbFatigue  strikes restore your fatigue
//   regen       restore health over time while worn
//   fireShield  melee attackers are burned
//   blinding    huge speed, but your attacks miss more often
//   shadow      constant chameleon while equipped
export const ARTIFACTS = {
  razor: {
    name: "Vharog's Razor", kind: "weapon", base: "dagger", material: "abyssal", damage: [8, 18], weight: 2,
    unique: "banish", chance: 0.05,
    lore: "An abyssal blade of Vharog the Ruiner, Hollow Lord of destruction. Its edge can cut a mortal soul loose from the world in one stroke.",
  },
  sunbrand: {
    name: "Sunbrand", kind: "weapon", base: "katana", material: "obsidian", color: 0xd8a830, damage: [22, 42],
    enchant: { key: "fire", element: "fire", amount: 18 }, indestructible: true,
    lore: "A golden katana forged by Seraphe of Thorns for a champion who passed her trial. It never dulls, and its edge is wreathed in fire.",
  },
  nightdrinker: {
    name: "Nightdrinker", kind: "weapon", base: "claymore", material: "obsidian", color: 0x303048, damage: [26, 46],
    enchant: { key: "absorb", absorb: true, amount: 9 },
    lore: "The sword of a warrior who became the blade. It drinks the life of whatever it cuts.",
  },
  iceBlade: {
    name: "Ice Blade of the Frost King", kind: "weapon", base: "claymore", material: "crystal", color: 0xa0e0ff, damage: [24, 44],
    enchant: { key: "frost", element: "frost", amount: 16 }, unique: "paralyze", chance: 0.15,
    lore: "A crystal greatsword of an ancient Hrothi king. Frost spreads from its wounds and locks muscles rigid.",
  },
  lastMercy: {
    name: "Spear of Last Mercy", kind: "weapon", base: "long spear", material: "abyssal", damage: [20, 40],
    enchant: { key: "shock", element: "shock", amount: 20 },
    lore: "A long abyssal spear that hums with stored lightning. Its mercy is a quick death.",
  },
  chainMace: {
    name: "Mace of Mal'Garoth", kind: "weapon", base: "mace", material: "abyssal", color: 0x3a0a18, damage: [16, 30],
    unique: "absorbMagicka", amount: 8,
    lore: "The cudgel of Mal'Garoth, King of Chains. Each blow steals the victim's magical strength for its bearer.",
  },
  skullCrusher: {
    name: "Skull Crusher", kind: "weapon", base: "warhammer", material: "kaldur", color: 0x9a7030, damage: [30, 52],
    unique: "stagger",
    lore: "A Kaldur warhammer weighted with a core of dense brass. No creature stands firm against it.",
  },
  fang: {
    name: "Fang of Ssarvetha", kind: "weapon", base: "dagger", material: "crystal", color: 0xd0ffd0, damage: [7, 15],
    enchant: { key: "poison", element: "poison", amount: 14 },
    lore: "A tooth of the legendary serpent, set into a hilt. Its venom never runs dry.",
  },
  bowOfShadows: {
    name: "Bow of Shadows", kind: "weapon", base: "long bow", material: "abyssal", color: 0x201828, damage: [14, 30],
    unique: "shadow", amount: 0.4,
    lore: "Nyxa's gift to thieves. Its bearer fades into the dark while it is drawn.",
  },
  durnaghRepeater: {
    name: "Durnagh's Repeater", kind: "weapon", base: "crossbow", material: "kaldur", color: 0xc09a40, damage: [18, 34],
    speedMult: 1.8,
    lore: "A Kaldur crossbow whose clockwork cranks itself. It reloads almost as fast as you can aim.",
  },
  flayedSaint: {
    name: "Cuirass of the Flayed Saint", kind: "armor", slot: "cuirass", material: "drifter leather", color: 0xb09070, ar: 30,
    enchant: { key: "resistMagic", resist: "magic", amount: 0.6 },
    lore: "The flayed skin of a hero, tanned by the Huntmother. Spells slide from it like rain.",
  },
  wardensMail: {
    name: "Warden's Mail", kind: "armor", slot: "cuirass", material: "steel", color: 0xc0c8d0, ar: 40,
    unique: "regen", amount: 1.2,
    lore: "The armour of the first Warden of the Temple, blessed by Saint Ardent. Wounds close on their own beneath it.",
  },
  obsidianMail: {
    name: "Obsidian Mail", kind: "armor", slot: "cuirass", material: "obsidian", ar: 52,
    unique: "fireShield", amount: 10,
    lore: "Seraphe of Thorns gives it to her champions. Those who strike its wearer are scorched by black fire.",
  },
  blindingSpeed: {
    name: "Boots of Blinding Haste", kind: "armor", slot: "boots", material: "drifter leather", color: 0x8a5040, ar: 6,
    unique: "blinding", amount: 0.8,
    lore: "Boots that make you fly across the land, at the cost of seeing clearly what you swing at.",
  },
  // the frozen isle's reward (never placed in dungeons)
  rimeBlade: {
    name: "Ancestor's Rime Blade", kind: "weapon", base: "longsword", material: "crystal", color: 0xb8e8ff, damage: [18, 34],
    enchant: { key: "frost", element: "frost", amount: 14 }, unique: "paralyze", chance: 0.08, reward: true,
    lore: "Enchanted ice, forged by the village smiths of the frozen isle and given to those who return the Horn of the Ancestors.",
  },
}

// Rare unique swords: lesser one-of-a-kind blades, found now and then in
// dungeon chests and on bosses rather than placed with the world. `minTier`
// is the loot tier from which they can turn up. Their looks come from the
// pack models assigned to the artifact.<id> roles (assets/manifest.json).
export const RARE_SWORDS = {
  cogblade: {
    name: "Cogwright's Edge", base: "broadsword", material: "kaldur", damage: [12, 24], minTier: 3, unique: "stagger",
    lore: "A Kaldur blade with a geared guard that still turns. Its weighted strikes knock foes off balance.",
  },
  sporeblade: {
    name: "Sporecap Cleaver", base: "scimitar", material: "chitin", damage: [9, 18], minTier: 1,
    enchant: { key: "poison", element: "poison", amount: 7 },
    lore: "A Sorvenn mushroom-grower's blade, its hilt overgrown with living caps that weep poison.",
  },
  inkfang: {
    name: "Inkfang", base: "shortsword", material: "steel", damage: [8, 16], minTier: 2, unique: "paralyze", chance: 0.08,
    lore: "Brine-crawler hunters of the Brine Coast carry these. The tentacled hilt grips back.",
  },
  bloodvein: {
    name: "Bloodvein", base: "saber", material: "abyssal", damage: [16, 30], minTier: 5,
    enchant: { key: "absorb", absorb: true, amount: 5 },
    lore: "A pale curved blade threaded with red veins. It thirsts, and it shares what it drinks.",
  },
  bloomsword: {
    name: "Bloom of Lady Vesper", base: "longsword", material: "silver", damage: [11, 22], minTier: 2, unique: "regen", amount: 0.5,
    lore: "Flowers grow from this blade's hilt in every season. Lady Vesper's faithful say it mends its bearer.",
  },
  stormglass: {
    name: "Stormglass", base: "broadsword", material: "crystal", damage: [15, 28], minTier: 4,
    enchant: { key: "shock", element: "shock", amount: 12 },
    lore: "Crystal that caught a lightning strike on the Verdant Isles and kept it. It glows in the dark.",
  },
  wickerblade: {
    name: "Ashwalker Wickerblade", base: "longsword", material: "chitin", damage: [10, 19], minTier: 1, unique: "absorbFatigue", amount: 4,
    lore: "Woven from treated reed and chitin by an Ashwalker wise woman. It never tires the arm that swings it.",
  },
  conchblade: {
    name: "Conch of the Tides", base: "shortsword", material: "chitin", damage: [8, 15], minTier: 1,
    enchant: { key: "frost", element: "frost", amount: 6 },
    lore: "A spiralled shell honed to an edge, cold as the sea it came from.",
  },
  oldHouse: {
    name: "Heirloom of the Old House", base: "longsword", material: "steel", damage: [12, 22], minTier: 2, indestructible: true,
    lore: "Passed down nine generations of a fallen Great House. It has never needed a smith.",
  },
  leafblade: {
    name: "Greenleaf", base: "longsword", material: "tuskar", damage: [13, 25], minTier: 3, speedMult: 1.2,
    lore: "A Wyldren-forged blade shaped like a leaf. It moves as lightly as one.",
  },
  huntmotherAntler: {
    name: "Antler of the Hunt", base: "claymore", material: "obsidian", damage: [24, 42], minTier: 5, unique: "stagger",
    lore: "A greatsword grown from the antlers of a beast the Huntmother herself ran down.",
  },
  coralThorn: {
    name: "Coral Thorn", base: "scimitar", material: "starmetal", damage: [14, 26], minTier: 4,
    enchant: { key: "poison", element: "poison", amount: 10 },
    lore: "Cut from a red reef off the Vesper Coast. Its barbs break off in the wound.",
  },
  driftwood: {
    name: "Driftwood Saint", base: "katana", material: "chitin", damage: [10, 20], minTier: 1, unique: "absorbMagicka", amount: 4,
    lore: "A pilgrim carved it from wood washed up at the Wardwall. Spells seem to drain into its grain.",
  },
  runeblade: {
    name: "Runed Longsword", base: "longsword", material: "starmetal", damage: [15, 27], minTier: 4,
    enchant: { key: "fire", element: "fire", amount: 10 },
    lore: "Every inch of the blade is cut with Abyssal script. The words burn when it strikes.",
  },
  sawtooth: {
    name: "Sawtooth", base: "broadsword", material: "iron", damage: [11, 21], minTier: 1, unique: "stagger",
    lore: "A crooked, toothed blade made for tearing, not cutting. Crude, but nobody stands up to it.",
  },
  crownblade: {
    name: "Crown of the Iron Emperor", base: "saber", material: "obsidian", damage: [17, 31], minTier: 5, unique: "banish", chance: 0.03,
    lore: "Its golden guard is a crown, said to be cast from one the Barrow King wore.",
  },
}

export const RARE_IDS = Object.keys(RARE_SWORDS)

// Every unique item, for looking one up by id (item.artifact).
export const UNIQUES = { ...ARTIFACTS, ...Object.fromEntries(Object.entries(RARE_SWORDS).map(([id, s]) => [id, { ...s, kind: "weapon", rare: true }])) }

export const ARTIFACT_IDS = Object.keys(ARTIFACTS).filter(id => !ARTIFACTS[id].reward)
