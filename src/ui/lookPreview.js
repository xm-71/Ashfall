// The turning 3D preview of the player's look in character creation. It has
// its own small renderer and canvas, kept across the screen's re-renders.
import * as THREE from "three"
import { buildPlayerMesh } from "../render/creatures.js"

export class LookPreview {
  constructor() {
    this.canvas = document.createElement("canvas")
    this.canvas.className = "cg-look-view"
    this.canvas.title = "Drag to turn"
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.25
    this.scene = new THREE.Scene()
    this.scene.add(new THREE.HemisphereLight(0xfff2dc, 0x3a2e22, 2.2))
    const sun = new THREE.DirectionalLight(0xffe8c8, 2.4)
    sun.position.set(2, 4, 3)
    this.scene.add(sun)
    this.camera = new THREE.PerspectiveCamera(30, 0.7, 0.1, 50)
    this.turn = 0.4
    this.body = null
    this.key = null
    this.t = 0
    let drag = null
    this.canvas.addEventListener("pointerdown", e => (drag = e.clientX))
    window.addEventListener("pointerup", (this.onUp = () => (drag = null)))
    this.canvas.addEventListener("pointermove", e => {
      if (drag == null) return
      this.turn += (e.clientX - drag) * 0.012
      drag = e.clientX
    })
    let last = performance.now()
    const loop = now => {
      this.raf = requestAnimationFrame(loop)
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      this.draw(dt)
    }
    this.raf = requestAnimationFrame(loop)
  }

  // Show this look (rebuilt only when something changed).
  show(look, race, weapon) {
    const key = JSON.stringify([look, race.name, weapon?.base, weapon?.material])
    if (key === this.key) return
    this.key = key
    if (this.body) this.scene.remove(this.body.group)
    this.body = buildPlayerMesh(look, race, weapon)
    this.scene.add(this.body.group)
    const h = 1.8
    this.camera.position.set(0, h * 0.55, 3.9)
    this.camera.lookAt(0, h * 0.5, 0)
  }

  draw(dt) {
    if (!this.canvas.isConnected) return
    const w = this.canvas.clientWidth
    const h = this.canvas.clientHeight
    if (!w || !h) return
    if (this.canvas.width !== Math.round(w * this.renderer.getPixelRatio())) {
      this.renderer.setSize(w, h, false)
      this.camera.aspect = w / h
      this.camera.updateProjectionMatrix()
    }
    this.t += dt
    if (this.body) {
      this.body.group.rotation.y = this.turn
      this.body.anim(this.t, 0, 0)
    }
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    cancelAnimationFrame(this.raf)
    window.removeEventListener("pointerup", this.onUp)
    this.renderer.dispose()
    this.renderer.forceContextLoss()
    this.canvas.remove()
  }
}
