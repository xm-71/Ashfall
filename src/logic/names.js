import * as N from "../data/names.js"

const cap = s => s.charAt(0).toUpperCase() + s.slice(1)

export function npcName(rng, race) {
  switch (race) {
    case "hrothi": return `${rng.pick(N.HROTHI_FIRST)} ${rng.pick(N.HROTHI_LAST)}`
    case "vessari":
    case "caldrin":
    case "qasiri": return `${rng.pick(N.VESSARI_FIRST)} ${rng.pick(N.VESSARI_LAST)}`
    case "rakhai": return rng.pick(N.RAKHAI)
    case "saurek": return `${rng.pick(N.SAUREK_A)}-${rng.pick(N.SAUREK_B)}`
    case "aurelin":
    case "wyldren": return cap(rng.pick(N.AURELIN_A) + rng.pick(N.AURELIN_B))
    case "tuskar": return `${rng.pick(N.TUSKAR_FIRST)} ${rng.pick(N.TUSKAR_LAST)}`
    default:
      return `${rng.pick(N.CINDARI_FIRST_A)}${rng.pick(N.CINDARI_FIRST_B)} ${rng.pick(N.CINDARI_LAST_A)}${rng.pick(N.CINDARI_LAST_B)}`
  }
}

const HROTHI_A = ["Skal", "Thir", "Hrot", "Frost", "Wolf", "Isin", "Brod", "Kolb", "Rav", "Hjal", "Storm", "Svar"]
const HROTHI_B = ["heim", "stad", "vik", "holm", "garth", "mund", "fjell", "rik"]

export function placeName(rng, used = new Set(), style = null) {
  if (style === "hrothi")
    for (let i = 0; i < 50; i++) {
      const name = rng.pick(HROTHI_A) + rng.pick(HROTHI_B)
      if (!used.has(name)) {
        used.add(name)
        return name
      }
    }
  for (let i = 0; i < 50; i++) {
    const a = rng.pick(N.PLACE_A)
    const b = rng.pick(N.PLACE_B)
    const name = rng.chance(0.25) ? `${a} ${cap(rng.pick(N.PLACE_A).toLowerCase() + b)}` : a + b
    if (!used.has(name)) {
      used.add(name)
      return name
    }
  }
  return `Cindhold ${used.size}`
}

export function dungeonName(rng, type, used = new Set()) {
  for (let i = 0; i < 50; i++) {
    let name
    if (type === "kaldur") name = rng.pick(N.KALDUR_A) + rng.pick(N.KALDUR_B)
    else if (type === "abyssal") name = `${rng.pick(N.ABYSSAL_A)}${rng.pick(N.ABYSSAL_B)} Shrine`.replace(/\s+/g, " ")
    else if (type === "tomb") name = `${rng.pick(N.TOMB_FAMILIES)} Ancestral Tomb`
    else if (type === "barrow") name = `${rng.pick(HROTHI_A)}${rng.pick(["mund", "grim", "vald", "hal"])} Barrow`
    else if (type === "citadel") name = "The Ember Citadel"
    else name = `${placeName(rng)} ${rng.pick(N.CAVE_SUFFIX)}`
    if (!used.has(name)) {
      used.add(name)
      return name
    }
  }
  return `Forgotten Vault ${used.size}`
}

export function artifactName(rng) {
  return `${rng.pick(N.ARTIFACT_NOUNS)} of ${rng.pick(N.ARTIFACT_OWNERS)}`
}

export function bossName(rng, baseName) {
  return `${baseName} ${rng.pick(N.BOSS_EPITHETS)}`
}

export function emberName(rng) {
  return `Vael ${rng.pick(N.EMBER_NAMES)}`
}
