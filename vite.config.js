import { defineConfig } from "vite"
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync, createReadStream } from "node:fs"
import { join, relative, resolve } from "node:path"
import { spawn } from "node:child_process"

// Workbench API (dev server only): the asset workbench (workbench.html) reads
// and saves assets/manifest.json, previews converted models from
// assets/.cache, and runs the asset build.
function workbenchApi() {
  const root = process.cwd()
  const send = (res, code, body, type = "application/json") => {
    res.writeHead(code, { "content-type": type, "cache-control": "no-cache" })
    res.end(body)
  }
  const readBody = req =>
    new Promise((ok, fail) => {
      let s = ""
      req.on("data", c => (s += c))
      req.on("end", () => ok(s))
      req.on("error", fail)
    })
  return {
    name: "ashfall-workbench",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__wb", async (req, res) => {
        try {
          const url = decodeURIComponent(req.url.split("?")[0])
          if (url === "/catalog") {
            const f = join(root, "assets/catalog.json")
            return existsSync(f) ? send(res, 200, readFileSync(f)) : send(res, 404, JSON.stringify({ error: "Run npm run assets first" }))
          }
          if (url === "/manifest" && req.method === "GET") return send(res, 200, readFileSync(join(root, "assets/manifest.json")))
          if (url === "/manifest" && req.method === "POST") {
            const text = await readBody(req)
            const json = JSON.parse(text) // refuse anything that isn't JSON
            writeFileSync(join(root, "assets/manifest.json"), JSON.stringify(json, null, 2) + "\n")
            return send(res, 200, JSON.stringify({ ok: true }))
          }
          if (url === "/build" && req.method === "POST") {
            const cmd = process.platform === "win32" ? "npm.cmd" : "npm"
            const child = spawn(cmd, ["run", "assets"], { cwd: root })
            let log = ""
            child.stdout.on("data", d => (log += d))
            child.stderr.on("data", d => (log += d))
            child.on("close", code => send(res, 200, JSON.stringify({ code, log })))
            return
          }
          if (url.startsWith("/model/")) {
            const base = resolve(root, "assets/.cache/models")
            const file = resolve(base, url.slice("/model/".length))
            if (!file.startsWith(base + "/") || !file.endsWith(".glb") || !existsSync(file)) return send(res, 404, "not found", "text/plain")
            res.writeHead(200, { "content-type": "model/gltf-binary", "cache-control": "no-cache" })
            return createReadStream(file).pipe(res)
          }
          send(res, 404, JSON.stringify({ error: "unknown" }))
        } catch (e) {
          send(res, 500, JSON.stringify({ error: e.message }))
        }
      })
    },
  }
}

// Write the list of built files into the service worker, so the whole game
// is cached for offline play on the first visit.
function precacheList() {
  let outDir
  return {
    name: "ashfall-precache",
    apply: "build",
    configResolved(c) {
      outDir = c.build.outDir
    },
    closeBundle() {
      const files = []
      const walk = d => {
        for (const f of readdirSync(d)) {
          const p = join(d, f)
          if (statSync(p).isDirectory()) walk(p)
          else if (f !== "sw.js") files.push(relative(outDir, p).split("\\").join("/"))
        }
      }
      walk(outDir)
      // pack models are cached as areas load them, not all up front
      for (let i = files.length - 1; i >= 0; i--) if (files[i].startsWith("packs/") && files[i] !== "packs/index.json") files.splice(i, 1)
      const sw = join(outDir, "sw.js")
      const version = files.filter(f => f.startsWith("assets/")).sort().join("|")
      let hash = 0
      for (let i = 0; i < version.length; i++) hash = (hash * 31 + version.charCodeAt(i)) | 0
      writeFileSync(
        sw,
        readFileSync(sw, "utf8")
          .replace("const PRECACHE = []", `const PRECACHE = ${JSON.stringify(["./", ...files.filter(f => f !== "index.html")])}`)
          .replace('const CACHE = "ashfall-dev"', `const CACHE = "ashfall-${(hash >>> 0).toString(36)}"`),
      )
    },
  }
}

export default defineConfig({
  base: "./",
  build: { chunkSizeWarningLimit: 1200 },
  plugins: [precacheList(), workbenchApi()],
})
