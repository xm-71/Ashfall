// Look at converted models: `npm run assets:review`
//
// Serves a page (tools/assets/review.html) that draws every model from
// assets/.cache in a labelled grid with its size, triangle count, rig and
// suggested roles. Open the printed URL in a browser.
//
//   --shots   instead, save the grids as images in assets/review/
//             (needs Playwright: npm i -D playwright && npx playwright install chromium)
//   --port N  serve on another port (default 5180)
import http from "node:http"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const args = process.argv.slice(2)
const SHOTS = args.includes("--shots")
const PORT = args.includes("--port") ? Number(args[args.indexOf("--port") + 1]) : 5180
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".glb": "model/gltf-binary", ".wasm": "application/wasm" }
const ALLOWED = ["tools/assets/", "assets/catalog.json", "assets/.cache/models/", "node_modules/three/"]

const catalogFile = path.join(ROOT, "assets/catalog.json")
if (!fs.existsSync(catalogFile)) {
  console.log("No assets/catalog.json yet: run `npm run assets` first.")
  process.exit(1)
}

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/+/, "")
  const file = path.resolve(ROOT, url)
  const rel = path.relative(ROOT, file).split(path.sep).join("/")
  if (rel.startsWith("..") || !ALLOWED.some(a => rel === a || rel.startsWith(a)) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404).end("not found")
    return
  }
  res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream", "cache-control": "no-cache" })
  fs.createReadStream(file).pipe(res)
})
await new Promise(r => server.listen(PORT, "127.0.0.1", r))
const base = `http://127.0.0.1:${PORT}/tools/assets/review.html`

if (!SHOTS) {
  console.log(`Asset review: ${base}\n(Ctrl+C to stop)`)
} else {
  let pw
  try {
    pw = await import("playwright")
  } catch {
    try {
      pw = await import("playwright-core")
    } catch {
      console.log("--shots needs Playwright: npm i -D playwright && npx playwright install chromium")
      server.close()
      process.exit(1)
    }
  }
  const catalog = JSON.parse(fs.readFileSync(catalogFile, "utf8"))
  const ids = Object.keys(catalog.models)
  const packs = [...new Set(ids.map(id => id.split("/")[0]))]
  const per = 24
  const out = path.join(ROOT, "assets/review")
  fs.mkdirSync(out, { recursive: true })
  for (const f of fs.readdirSync(out)) if (f.endsWith(".jpg")) fs.rmSync(path.join(out, f))
  const browser = await pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] })
  const page = await browser.newPage({ viewport: { width: 1500, height: 1100 } })
  for (const pack of packs) {
    const n = Math.ceil(ids.filter(id => id.startsWith(pack + "/")).length / per)
    for (let i = 0; i < n; i++) {
      await page.goto(`${base}?pack=${encodeURIComponent(pack)}&page=${i}&per=${per}&cols=6`)
      await page.waitForFunction(() => window.reviewReady && window.reviewReady(), null, { timeout: 120000 })
      await page.waitForTimeout(300)
      const file = path.join(out, `${pack}-${String(i + 1).padStart(2, "0")}.jpg`)
      await page.screenshot({ path: file, type: "jpeg", quality: 80, fullPage: true })
      console.log(`  ${path.relative(ROOT, file)}`)
    }
  }
  await browser.close()
  server.close()
}
