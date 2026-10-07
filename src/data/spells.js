// delivery: "target" fires a projectile, "touch" hits what's in front of you, "self" affects you.
export const SPELLS = {
  fireBite: { name: "Fire Bite", school: "destruction", cost: 6, delivery: "target", effects: [{ type: "damage", element: "fire", amount: [6, 14] }] },
  frostbite: { name: "Frostbite", school: "destruction", cost: 7, delivery: "target", effects: [{ type: "damage", element: "frost", amount: [7, 15] }] },
  sparks: { name: "Sparks", school: "destruction", cost: 5, delivery: "target", effects: [{ type: "damage", element: "shock", amount: [4, 12] }] },
  fireball: { name: "Fireball", school: "destruction", cost: 18, delivery: "target", effects: [{ type: "damage", element: "fire", amount: [18, 34] }], splash: 3 },
  lightningBolt: { name: "Lightning Bolt", school: "destruction", cost: 24, delivery: "target", effects: [{ type: "damage", element: "shock", amount: [22, 44] }] },
  poisonBloom: { name: "Poison Bloom", school: "destruction", cost: 14, delivery: "target", effects: [{ type: "damage", element: "poison", amount: [14, 26] }] },
  addersCurse: { name: "Adder's Curse", school: "destruction", cost: 10, delivery: "target", effects: [{ type: "damage", element: "poison", amount: [25, 40] }, { type: "selfDamage", amount: 8 }] },
  heal: { name: "Heal Minor Wounds", school: "restoration", cost: 5, delivery: "self", effects: [{ type: "heal", amount: [10, 18] }] },
  greatHeal: { name: "Hearth Heal", school: "restoration", cost: 15, delivery: "self", effects: [{ type: "heal", amount: [30, 50] }] },
  restoreFatigue: { name: "Rest of Saint Lira", school: "restoration", cost: 6, delivery: "self", effects: [{ type: "restoreFatigue", amount: [30, 60] }] },
  shield: { name: "Shield", school: "alteration", cost: 8, delivery: "self", effects: [{ type: "shield", amount: 15, duration: 30 }] },
  jump: { name: "Strong Legs", school: "alteration", cost: 6, delivery: "self", effects: [{ type: "jump", amount: 2, duration: 30 }] },
  openLock: { name: "The Unhinging", school: "alteration", cost: 10, delivery: "touch", effects: [{ type: "open", amount: 50 }] },
  light: { name: "Light", school: "illusion", cost: 4, delivery: "self", effects: [{ type: "light", duration: 90 }] },
  chameleon: { name: "Chameleon", school: "illusion", cost: 12, delivery: "self", effects: [{ type: "chameleon", amount: 0.5, duration: 30 }] },
  calm: { name: "Calm Creature", school: "illusion", cost: 10, delivery: "target", effects: [{ type: "calm", duration: 20 }] },
  paralyze: { name: "Paralysis", school: "illusion", cost: 20, delivery: "target", effects: [{ type: "paralyze", duration: 5 }] },
  detectCreature: { name: "Detect Creature", school: "mysticism", cost: 6, delivery: "self", effects: [{ type: "detect", duration: 60 }] },
  lightwardRecall: { name: "Lightward Recall", school: "mysticism", cost: 12, delivery: "self", effects: [{ type: "teleport", to: "vessari" }] },
  triuneRecall: { name: "Triune Recall", school: "mysticism", cost: 12, delivery: "self", effects: [{ type: "teleport", to: "temple" }] },
  boundDagger: { name: "Bound Dagger", school: "conjuration", cost: 8, delivery: "self", effects: [{ type: "bound", item: "abyssal dagger", duration: 60 }] },
  boundLongsword: { name: "Bound Longsword", school: "conjuration", cost: 18, delivery: "self", effects: [{ type: "bound", item: "abyssal longsword", duration: 60 }] },
  boundBattleAxe: { name: "Bound Battle Axe", school: "conjuration", cost: 20, delivery: "self", effects: [{ type: "bound", item: "abyssal battle axe", duration: 60 }] },
}

// Birthsign / racial powers: free, once per day.
export const POWERS = {
  ancestralWard: { name: "Ancestral Ward", power: true, delivery: "self", effects: [{ type: "shield", amount: 40, duration: 60 }] },
  heartwood: { name: "Heartwood", power: true, delivery: "self", effects: [{ type: "heal", amount: [60, 60] }] },
  chalicesGift: { name: "Chalice's Gift", power: true, delivery: "self", effects: [{ type: "heal", amount: [999, 999] }] },
  rosesKiss: { name: "Rose's Kiss", power: true, delivery: "target", effects: [{ type: "paralyze", duration: 8 }] },
  moonshadow: { name: "Moonshadow", power: true, delivery: "self", effects: [{ type: "chameleon", amount: 0.95, duration: 30 }] },
}

export function getSpell(id) {
  return SPELLS[id] ? { id, ...SPELLS[id] } : POWERS[id] ? { id, ...POWERS[id] } : null
}

export const SPELL_SHOP = Object.keys(SPELLS)

// Spell price in crowns when bought from a spell merchant.
export function spellPrice(id) {
  return Math.round((SPELLS[id]?.cost || 10) * 9)
}
