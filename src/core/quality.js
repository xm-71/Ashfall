// Graphics quality presets. Changing quality reloads the page so textures and
// meshes are regenerated at the new detail level.
export const PRESETS = {
  low: { name: "Low", tex: 256, tile: 128, pixelRatio: 1, shadows: false, shadowMap: 1024, terrainRes: 320, grass: 0, floraMult: 0.6, drawDist: 0.8, seg: 0.6, charShadows: false, antialias: false, post: { bloom: false, ao: false, shafts: false } },
  medium: { name: "Medium", tex: 512, tile: 256, pixelRatio: 1.5, shadows: true, shadowMap: 2048, terrainRes: 640, grass: 1, floraMult: 1, drawDist: 1, seg: 1, charShadows: true, antialias: true, post: { bloom: true, ao: false, shafts: true } },
  high: { name: "High", tex: 1024, tile: 512, pixelRatio: 2, shadows: true, shadowMap: 4096, terrainRes: 960, grass: 2, floraMult: 1.5, drawDist: 1.3, seg: 1.4, charShadows: true, antialias: true, post: { bloom: true, ao: true, shafts: true } },
}

// Phones and tablets: a browser tab there gets far less memory (iOS Safari
// closes pages that pass roughly 1 GB), so they start on Low and always load
// the half-size pack textures.
export const isPhone = (() => {
  try {
    const ua = navigator.userAgent || ""
    return /iPhone|iPad|iPod|Android|Mobile/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  } catch {
    return false
  }
})()

function load() {
  try {
    return localStorage.getItem("ashfall-quality") || (isPhone ? "low" : "medium")
  } catch {
    return isPhone ? "low" : "medium"
  }
}

export let qualityName = PRESETS[load()] ? load() : "medium"
// packTex: "low" loads the half-size copies of pack textures
export const Q = { ...PRESETS[qualityName], maxAniso: 4, packTex: isPhone || qualityName === "low" ? "low" : "full" }

export function setQuality(name) {
  try {
    localStorage.setItem("ashfall-quality", name)
  } catch {
    /* storage unavailable */
  }
}

// segment count helper: scales geometry tessellation with quality
export const seg = n => Math.max(3, Math.round(n * Q.seg))
