// body: which procedural mesh builder to use. habitat: biomes / dungeon types where they spawn.
export const CREATURES = {
  shellback: { name: "Shellback", level: 1, hp: 16, dmg: [1, 4], speed: 2.2, rate: 1.3, reach: 1.8, ar: 8, agility: 20, body: "crab", color: 0x7a5d44, scale: 0.9, habitat: ["brineCoast", "vesperCoast", "verdant"], loot: ["pearl"] },
  rat: { name: "Rat", level: 1, hp: 10, dmg: [1, 3], speed: 4.5, rate: 1.0, reach: 1.5, ar: 0, agility: 40, body: "quad", color: 0x4a3a30, scale: 0.45, habitat: ["cave", "tomb", "brineCoast", "verdant"] },
  burrowgrub: { name: "Burrowgrub", level: 1, hp: 14, dmg: [1, 5], speed: 3.5, rate: 1.1, reach: 1.6, ar: 0, agility: 30, body: "worm", color: 0xd8c8a0, scale: 0.6, habitat: ["cave", "mosslands"], loot: ["grub egg"] },
  mite: { name: "Ash Mite", level: 1, hp: 12, dmg: [1, 4], speed: 3.2, rate: 1.1, reach: 1.5, ar: 4, agility: 30, body: "spider", color: 0x6a7a8a, scale: 0.5, habitat: ["cave", "westRift"], loot: ["mite jelly"] },
  skyscreamer: { name: "Skyscreamer", level: 2, hp: 22, dmg: [2, 8], speed: 6, rate: 1.2, reach: 2.0, ar: 2, agility: 50, body: "flier", color: 0x8a7a5a, scale: 1.0, flying: true, habitat: ["ashlands", "westRift", "mosslands", "cinderfall", "vesperCoast", "verdant", "brineCoast", "hearthpeak"] },
  ashHound: { name: "Ash Hound", level: 3, hp: 32, dmg: [3, 8], speed: 5.6, rate: 1.0, reach: 1.9, ar: 6, agility: 40, body: "hound", color: 0x5e5a3c, scale: 0.9, habitat: ["ashlands", "westRift", "mosslands", "cinderfall"] },
  snapjaw: { name: "Snapjaw", level: 3, hp: 42, dmg: [3, 10], speed: 5.2, rate: 0.9, reach: 2.0, ar: 8, agility: 30, body: "snapjaw", color: 0x7a6a4a, scale: 1.0, habitat: ["ashlands", "cinderfall", "mosslands"] },
  tuskback: { name: "Tuskback", level: 4, hp: 58, dmg: [4, 12], speed: 5.0, rate: 0.9, reach: 2.1, ar: 10, agility: 30, body: "tuskback", color: 0x8a6a4a, scale: 1.1, habitat: ["mosslands", "verdant", "ashlands", "westRift"] },
  loper: { name: "Wild Loper", level: 2, hp: 40, dmg: [2, 6], speed: 3.8, rate: 1.0, reach: 2.0, ar: 6, agility: 20, body: "loper", color: 0x9a7a52, scale: 1.1, habitat: ["mosslands", "verdant", "westRift"] },
  drifter: { name: "Bull Drifter", level: 5, hp: 90, dmg: [4, 10], speed: 1.6, rate: 0.7, reach: 3.0, ar: 12, agility: 10, body: "drifter", color: 0x9a7aa8, scale: 1.6, floating: 3, element: "poison", habitat: ["brineCoast", "mosslands", "verdant"] },
  bandit: { name: "Bandit", level: 2, hp: 34, dmg: [3, 9], speed: 4.2, rate: 1.0, reach: 2.2, ar: 12, agility: 35, body: "humanoid", color: 0x6a4a30, scale: 1, humanoid: true, gold: [5, 40], habitat: ["cave", "westRift", "brineCoast", "verdant"] },
  smuggler: { name: "Smuggler", level: 3, hp: 40, dmg: [4, 10], speed: 4.2, rate: 1.1, reach: 2.2, ar: 14, agility: 40, body: "humanoid", color: 0x3a4a5a, scale: 1, humanoid: true, gold: [15, 60], habitat: ["cave", "brineCoast"] },
  necromancer: { name: "Necromancer", level: 5, hp: 40, dmg: [2, 6], speed: 3.6, rate: 1.0, reach: 2.2, ar: 6, agility: 35, body: "humanoid", color: 0x2a1a2a, scale: 1, humanoid: true, caster: "frostbite", gold: [20, 80], habitat: ["tomb"] },
  skeleton: { name: "Skeleton", level: 3, hp: 30, dmg: [3, 9], speed: 3.4, rate: 1.0, reach: 2.2, ar: 10, agility: 30, body: "skeleton", color: 0xd8d0b8, scale: 1, undead: true, habitat: ["tomb"], loot: ["bonemeal"] },
  ancestralShade: { name: "Ancestral Shade", level: 3, hp: 26, dmg: [2, 8], speed: 3.8, rate: 1.0, reach: 2.0, ar: 0, agility: 40, body: "ghost", color: 0x9ad0e0, scale: 1, undead: true, element: "frost", resist: { frost: 0.75, poison: 1 }, habitat: ["tomb"], loot: ["ectoplasm"] },
  hollowbone: { name: "Hollowbone", level: 5, hp: 55, dmg: [4, 11], speed: 3.0, rate: 0.9, reach: 2.2, ar: 8, agility: 20, body: "skeleton", color: 0x8a6a5a, scale: 1.1, undead: true, habitat: ["tomb"], loot: ["bonemeal"] },
  boneTyrant: { name: "Bone Tyrant", level: 9, hp: 80, dmg: [6, 14], speed: 3.2, rate: 0.9, reach: 2.4, ar: 10, agility: 30, body: "ghost", color: 0xb03030, scale: 1.3, undead: true, caster: "frostbite", resist: { frost: 0.75, poison: 1 }, habitat: ["tomb"] },
  cinderling: { name: "Cinderling", level: 3, hp: 30, dmg: [3, 8], speed: 4.5, rate: 1.1, reach: 1.8, ar: 6, agility: 40, body: "cinderling", color: 0xa0502a, scale: 0.8, hollowborn: true, caster: "fireBite", resist: { fire: 0.5 }, habitat: ["abyssal", "cinderfall"], loot: ["fire salts"] },
  gnashclaw: { name: "Gnashclaw", level: 6, hp: 70, dmg: [6, 14], speed: 5.5, rate: 1.0, reach: 2.2, ar: 14, agility: 40, body: "gnashclaw", color: 0x6a7a3a, scale: 1.1, hollowborn: true, habitat: ["abyssal", "cinderfall"] },
  abyssKnight: { name: "Abyssal Knight", level: 10, hp: 110, dmg: [9, 20], speed: 4.4, rate: 1.0, reach: 2.4, ar: 30, agility: 45, body: "humanoid", color: 0x5a1010, scale: 1.15, humanoid: true, hollowborn: true, resist: { fire: 0.5 }, gold: [30, 120], habitat: ["abyssal"], loot: ["hollowborn heart"] },
  rotmaw: { name: "Rotmaw", level: 12, hp: 150, dmg: [10, 22], speed: 4.0, rate: 0.9, reach: 2.5, ar: 24, agility: 35, body: "gnashclaw", color: 0x3a5a2a, scale: 1.5, hollowborn: true, caster: "poisonBloom", resist: { poison: 0.75 }, habitat: ["abyssal"], loot: ["hollowborn heart"] },
  duskwing: { name: "Duskwing", level: 14, hp: 140, dmg: [12, 24], speed: 5.5, rate: 1.1, reach: 2.4, ar: 20, agility: 60, body: "flier", color: 0x3a6a9a, scale: 1.3, flying: true, hollowborn: true, resist: { frost: 0.5 }, habitat: ["abyssal"] },
  brassSpider: { name: "Brass Spider", level: 3, hp: 34, dmg: [3, 9], speed: 4.4, rate: 1.1, reach: 1.9, ar: 18, agility: 40, body: "spider", color: 0xb08a3e, scale: 0.8, construct: true, resist: { poison: 1 }, habitat: ["kaldur"], loot: ["kaldur gear"] },
  brassSentinel: { name: "Brass Sentinel", level: 7, hp: 80, dmg: [7, 16], speed: 4.8, rate: 1.0, reach: 2.2, ar: 26, agility: 40, body: "sphere", color: 0xc09a4e, scale: 1.1, construct: true, resist: { poison: 1, shock: -0.5 }, habitat: ["kaldur"], loot: ["kaldur coherer"] },
  kaldurShade: { name: "Kaldur Spectre", level: 6, hp: 45, dmg: [4, 12], speed: 3.8, rate: 1.0, reach: 2.2, ar: 0, agility: 40, body: "ghost", color: 0xe0c070, scale: 1, undead: true, caster: "sparks", resist: { poison: 1, frost: 0.5 }, habitat: ["kaldur"], loot: ["ectoplasm"] },
  brassColossus: { name: "Brass Colossus", level: 12, hp: 170, dmg: [12, 24], speed: 3.6, rate: 0.9, reach: 2.6, ar: 36, agility: 30, body: "colossus", color: 0xb08a3e, scale: 1.6, construct: true, resist: { poison: 1, fire: 0.5, shock: -0.5 }, habitat: ["kaldur"], loot: ["kaldur coherer"] },
  ashHusk: { name: "Ash Husk", level: 6, hp: 70, dmg: [6, 13], speed: 3.0, rate: 0.9, reach: 2.2, ar: 10, agility: 20, body: "ash", color: 0x6a6660, scale: 1.1, emberCourt: true, habitat: ["hearthpeak", "ashlands", "citadel"], loot: ["ash salts"] },
  ashThrall: { name: "Ash Thrall", level: 5, hp: 50, dmg: [4, 9], speed: 3.8, rate: 1.0, reach: 2.2, ar: 8, agility: 30, body: "ash", color: 0x8a7a70, scale: 1.0, emberCourt: true, caster: "sparks", habitat: ["hearthpeak", "citadel"], loot: ["ash salts"] },
  rotstalker: { name: "Rotstalker", level: 8, hp: 95, dmg: [8, 16], speed: 3.6, rate: 1.0, reach: 2.3, ar: 14, agility: 25, body: "ash", color: 0x9a6a50, scale: 1.2, emberCourt: true, element: "poison", habitat: ["citadel", "hearthpeak"], loot: ["cinderrot weepings"] },
  ashGhoul: { name: "Ash Ghoul", level: 11, hp: 130, dmg: [10, 20], speed: 3.8, rate: 1.0, reach: 2.4, ar: 20, agility: 40, body: "ash", color: 0x4a3a34, scale: 1.25, emberCourt: true, caster: "fireball", habitat: ["citadel"], loot: ["ash salts"] },
  wakingDreamer: { name: "Waking Dreamer", level: 15, hp: 200, dmg: [14, 28], speed: 3.8, rate: 1.0, reach: 2.6, ar: 26, agility: 40, body: "sleeper", color: 0x6a3a2a, scale: 1.4, emberCourt: true, caster: "lightningBolt", resist: { fire: 0.5 }, habitat: ["citadel"], loot: ["ash salts"] },
  // imps and puglins: dungeon dwellers. `tint` colours a pack model (white =
  // unchanged); `weapon` is held in the right hand of a pack model
  caveImp: { name: "Cave Imp", level: 2, hp: 22, dmg: [2, 6], speed: 4.6, rate: 1.2, reach: 1.8, ar: 4, agility: 45, body: "cinderling", color: 0x7a6a4a, scale: 0.8, tint: 0xa88a5a, habitat: ["cave"], loot: ["mite jelly"] },
  graveImp: { name: "Grave Imp", level: 4, hp: 34, dmg: [3, 9], speed: 4.4, rate: 1.1, reach: 1.8, ar: 6, agility: 45, body: "cinderling", color: 0x6a7a8a, scale: 0.85, tint: 0xc0ccd8, undead: true, element: "frost", resist: { frost: 0.5, poison: 0.5 }, habitat: ["tomb"], loot: ["bonemeal"] },
  emberImp: { name: "Ember Imp", level: 6, hp: 48, dmg: [5, 12], speed: 4.8, rate: 1.1, reach: 1.9, ar: 10, agility: 50, body: "cinderling", color: 0xc04020, scale: 0.9, tint: 0xff7050, hollowborn: true, caster: "fireBite", resist: { fire: 0.75 }, habitat: ["abyssal"], loot: ["fire salts"] },
  puglin: { name: "Puglin", level: 1, hp: 18, dmg: [2, 5], speed: 4.2, rate: 1.2, reach: 1.9, ar: 4, agility: 40, body: "frostling", color: 0x9a8a6a, scale: 0.6, tint: 0xffffff, humanoid: true, gold: [1, 12], weapon: { base: "club", material: "iron" }, habitat: ["cave"] },
  puglinBrute: { name: "Puglin Brute", level: 4, hp: 46, dmg: [5, 11], speed: 3.8, rate: 0.95, reach: 2.1, ar: 10, agility: 30, body: "frostling", color: 0x7a5a40, scale: 0.72, tint: 0xd09a80, humanoid: true, gold: [5, 25], weapon: { base: "war axe", material: "iron" }, habitat: ["cave", "tomb"] },
  puglinShaman: { name: "Puglin Shaman", level: 5, hp: 34, dmg: [2, 6], speed: 3.8, rate: 1.0, reach: 2.0, ar: 4, agility: 40, body: "frostling", color: 0x6a7a5a, scale: 0.62, tint: 0xa8d0a0, humanoid: true, caster: "sparks", gold: [10, 30], habitat: ["cave", "tomb", "abyssal"] },
  // the frozen isle
  wolf: { name: "Wolf", level: 3, hp: 30, dmg: [3, 8], speed: 6, rate: 1.1, reach: 1.9, ar: 4, agility: 45, body: "hound", color: 0x8a8c90, scale: 0.85, resist: { frost: 0.5 }, habitat: ["frostholm"], loot: ["wolf pelt"] },
  snowBear: { name: "Snow Bear", level: 7, hp: 110, dmg: [8, 18], speed: 4.6, rate: 0.8, reach: 2.4, ar: 14, agility: 25, body: "hound", color: 0xe4e0d8, scale: 1.65, resist: { frost: 0.75 }, habitat: ["frostholm"], loot: ["bear pelt"] },
  frostling: { name: "Frostling", level: 3, hp: 28, dmg: [3, 8], speed: 4.4, rate: 1.2, reach: 2.2, ar: 8, agility: 45, body: "frostling", color: 0x7aa0c8, scale: 0.62, humanoid: true, gold: [2, 20], resist: { frost: 0.5 }, habitat: ["frostholm", "barrow"] },
  iceWraith: { name: "Ice Wraith", level: 6, hp: 55, dmg: [6, 12], speed: 5.8, rate: 1.1, reach: 2.2, ar: 6, agility: 60, body: "ghost", color: 0xb0e0ff, scale: 1, flying: true, undead: true, element: "frost", resist: { frost: 1, poison: 1 }, habitat: ["frostholm"], loot: ["ectoplasm"] },
  grimwight: { name: "Grimwight", level: 5, hp: 60, dmg: [5, 12], speed: 3.4, rate: 0.95, reach: 2.3, ar: 16, agility: 30, body: "grimwight", color: 0x6a7280, scale: 1.05, undead: true, element: "frost", resist: { frost: 0.75, poison: 1 }, habitat: ["barrow"], loot: ["bonemeal"] },
  grimwightLord: { name: "Grimwight Lord", level: 11, hp: 140, dmg: [10, 22], speed: 3.6, rate: 1.0, reach: 2.5, ar: 28, agility: 40, body: "grimwight", color: 0x4a5260, scale: 1.25, undead: true, element: "frost", caster: "frostbite", resist: { frost: 0.9, poison: 1 }, habitat: ["barrow"], loot: ["bonemeal"] },
  emberlord: { name: "Vael", level: 22, hp: 480, dmg: [18, 34], speed: 4.2, rate: 1.1, reach: 2.8, ar: 40, agility: 60, body: "emberlord", color: 0xc8a030, scale: 1.7, emberCourt: true, caster: "fireball", resist: { fire: 0.75, frost: 0.25, shock: 0.25, poison: 1 }, habitat: [], boss: true },
}

export function creaturesFor(habitat, maxLevel) {
  const list = Object.entries(CREATURES)
    .filter(([, c]) => c.habitat.includes(habitat) && c.level <= maxLevel)
    .map(([id, c]) => ({ id, ...c }))
  if (list.length) return list
  // Always offer something: fall back to the weakest native creatures.
  return Object.entries(CREATURES)
    .filter(([, c]) => c.habitat.includes(habitat))
    .sort((a, b) => a[1].level - b[1].level)
    .slice(0, 2)
    .map(([id, c]) => ({ id, ...c }))
}
