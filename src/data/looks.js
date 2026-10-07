// Appearance choices for the player character. `null` colours mean "the
// race's own"; the body parts (outfit, hairstyle, beard) come from the
// asset packs (the `player` role in assets/manifest.json).
export const HAIR_COLORS = [
  { name: "Race default", color: null },
  { name: "Black", color: 0x15110e },
  { name: "Dark brown", color: 0x3a2618 },
  { name: "Brown", color: 0x6a4428 },
  { name: "Auburn", color: 0x8a3a1c },
  { name: "Red", color: 0xb04a20 },
  { name: "Blond", color: 0xd8b878 },
  { name: "Ash grey", color: 0x9a948c },
  { name: "White", color: 0xe8e4dc },
]

// Skin tones are offsets from the race's skin: lighter or darker.
export const SKIN_SHADES = [
  { name: "Race default", k: 1 },
  { name: "Lighter", k: 1.15 },
  { name: "Light", k: 1.07 },
  { name: "Dark", k: 0.88 },
  { name: "Darker", k: 0.76 },
]

export const defaultLook = (female = false) => ({ sex: female ? "female" : "male", outfit: undefined, hair: undefined, beard: undefined, hairColor: 0, skin: 0 })

// "Universal-Base-Characters/.../Hair_SimpleParted" -> "Simple parted"
export function partLabel(id) {
  if (!id) return "None"
  const s = id
    .split("/")
    .pop()
    .replace(/^(Male|Female|Hair)_/, "")
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
  return s[0].toUpperCase() + s.slice(1).toLowerCase()
}
