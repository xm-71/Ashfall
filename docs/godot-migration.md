# Moving Ashfall to Godot, and building it from asset packs

Research notes, October 2026. Scope agreed:

- **Targets:** a web build that stays on Vercel, plus Windows, Mac and Linux desktop builds.
- **Art:** store asset packs such as Synty and Kenney.
- **World:** stays procedural, with the generator placing pack models instead of building meshes in code.

## Summary

- **Godot can do this.** One GDScript project exports to the web and to all three desktops. The web build uses the simpler Compatibility renderer and can't use C#. That's why this plan uses **GDScript**.
- **Only about a fifth of the code carries over directly.** The world, dungeon, quest, character and combat rules (about 3,900 lines in `src/core`, `src/data` and `src/logic`) never touch three.js. They translate line for line into GDScript. The rendering, game loop and UI (about 12,000 lines) are rewritten using Godot's own nodes. Godot already provides much of that: physics, animation, audio buses, UI controls, post effects and input mapping.
- **Asset packs don't require Godot.** The current three.js game can load the same glTF/FBX packs. If the main goal is better-looking art, adding packs to the current game is much cheaper than an engine port. The asset pipeline below works for either engine, so it can be built first.
- **To work in Godot here I need to run it.** This cloud environment currently blocks Godot downloads (`downloads.godotengine.org`, and release files on `github.com`). Without the engine I could write Godot code but not import assets, run tests or export builds. See "Setting up this environment" below.

## 1. The Godot port

### What Godot gives each target

| | Web (Vercel) | Desktop |
| --- | --- | --- |
| Renderer | Compatibility (WebGL 2) only | Forward+ (Vulkan/D3D12/Metal), or Compatibility |
| Scripting | GDScript only (C# can't export to web as of Godot 4.7) | GDScript or C# |
| Threads | Single-threaded by default; threads need cross-origin isolation headers or the PWA option | Full threading |
| Audio | Sample playback by default (no bus effects); stream mode adds effects but more latency | Full |
| Offline / install | Built-in PWA export option | Native installers |

**What this means for Ashfall:**

- **Graphics differ by platform.** The web build looks closer to today's Medium preset. Desktop gets real dynamic GI options, volumetric fog, SSAO/SSIL, and better shadows and LOD.
- **Effects must work in both renderers.** Bloom (glow) and fog do. AO and the light shafts are Forward+ features, so the web build keeps simpler versions.
- **World generation can't block the web build.** It currently runs in a Web Worker. In a single-threaded web export it must run in small slices per frame, behind the loading bar, so the page doesn't freeze. Desktop can use `WorkerThreadPool`.
- **Synthesized audio carries over.** The current sound and music are WebAudio synthesis. In Godot that becomes `AudioStreamGenerator` (generated samples) or pre-rendered loops. The web build's sample mode limits live effects, so the music system should mix its own reverb or echo instead of relying on bus effects.

### How the code maps

| Today (three.js) | Godot |
| --- | --- |
| `src/core` RNG and noise | GDScript port of the same algorithms. Godot's `FastNoiseLite` could replace the noise, but the same seed would then give a different island. |
| `src/data`, `src/logic` (worldgen, roads, dungeons, interiors, quests, character, combat) | Line-for-line GDScript ports into plain classes and `Resource`s. The existing `tests/logic.test.js` cases become GUT or gdUnit4 tests. |
| `src/render/terrain.js`, `terrainData.js` | Generated `ArrayMesh` chunks with a splat shader, or the Terrain3D add-on. |
| `src/render/flora.js`, instancing | `MultiMeshInstance3D` with visibility ranges for LOD. |
| `src/render/buildings.js`, `landmarks.js`, `interiors.js` | Scenes assembled from **pack models** (see part 2). The code builders stay only as a fallback. |
| `src/render/creatures.js`, `viewmodel.js` | Pack characters with `AnimationTree`. Synty's humanoid rigs retarget through Godot's `BoneMap` and humanoid skeleton profile. |
| `src/render/sky.js`, `post.js` | `WorldEnvironment` (sky shader, glow, fog, SSAO/SSIL on desktop). Weather particles use `GPUParticles3D`, falling back to `CPUParticles3D` on web if needed. |
| `src/game/*` (areas, actors, AI, player, saves, events) | Scenes and nodes per area. `CharacterBody3D` for the player and NPCs, `NavigationRegion3D` for dungeon pathing. Saves use `FileAccess` to `user://`, which maps to IndexedDB on web. |
| `src/game/input.js`, `gamepad.js`, `src/ui/touch.js` | `InputMap` actions (keyboard, gamepad and touch all built in) plus `TouchScreenButton` and a virtual joystick. |
| `src/ui/*` (HUD, menus, dialogue) | `Control` scenes with a shared `Theme`. |

### Suggested order

1. **Skeleton.** Create the Godot project, a web and desktop export preset, and CI that exports both and deploys the web build to Vercel. Deploy an empty scene first to prove the pipeline.
2. **Logic port.** Port the RNG, noise, data and logic with their tests. Check that a given seed produces the same towns, roads and dungeons as the JS version by comparing JSON dumps from both.
3. **Overworld.** Terrain chunks, water, sky, and the player controller, with flora and buildings placed from asset packs.
4. **Systems.** Actors, combat, magic, inventory, dialogue, quests and saves.
5. **Dungeons and interiors**, the remaining areas, then audio.
6. **UI, controls and polish.** Once the Godot web build matches the current game, switch the Vercel site over.

Until step 6, the current three.js game stays live on Vercel.

### Building and deploying

- **Exports run in CI.** Vercel's build machines don't have Godot, so a GitHub Actions job runs headless Godot to import assets and export:
  - the web build, uploaded to Vercel as a prebuilt static site;
  - the desktop builds, attached to a GitHub release or itch.io.
- **Headers:** a single-threaded web export needs no special headers. A threaded export needs `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`, which `vercel.json` can set.
- **Download size:** the engine itself is a sizeable WebAssembly download before any assets, and pack models and textures add more.
  - Serve `.wasm` and `.pck` files compressed.
  - Keep textures modest on web.
  - Consider splitting rarely used content (the northern isle, interiors) into packs that load on demand.

## 2. Giving me asset packs, and rebuilding the world from them

### How to get the files to me

I work in a cloud container that only sees this repository and the open internet (behind a proxy). The reliable route is the repository:

1. **The repository must be private.** Paid packs (Synty, most store packs) forbid redistributing their source files, and a public repo counts as redistribution. Kenney packs are CC0, so they're fine anywhere.
2. **Put each pack in its own folder**, keeping the license file:
   ```
   assets/packs/<pack-name>/
     LICENSE.txt or a link to the store page
     Models/ (FBX, glTF/GLB, or OBJ)
     Textures/
   ```
   Leave out Unity- or Unreal-specific files (`.unitypackage`, `.prefab`, `.mat`, `.uasset`); they're useless outside those engines. Synty packs ship a "Source Files" download with the FBX models and textures. Use that one.
3. **Large files:**
   - GitHub refuses files over 100 MB and warns above 50 MB.
   - Use **Git LFS** for textures and models (`git lfs track "*.fbx" "*.glb" "*.png"`).
   - Commit packs one at a time, so a single push doesn't run into size limits.
4. **Tell me which packs you added.** I pull the branch and start from there.

**Licensing to check per pack:**

- **Synty:** packs bought on Synty's own store can be used in Godot. Synty only gives official support for Unity and Unreal.
- **Unity Asset Store:** the store's standard license generally allows use in other engines. A few Unity-made packs are restricted to Unity.

All of these licenses allow shipping the assets inside a game build but not as loose files. A web build's assets are downloadable by design, so check each pack's terms on extraction. Godot can encrypt its `.pck`, but that needs custom export templates.

### What I do with a pack

1. **Inventory.** A script lists every model with:
   - its size and pivot;
   - triangle count, materials and textures;
   - whether it has a skeleton and animations.

   It also renders a thumbnail sheet, so I can look at the pack rather than guess from file names. I already have headless three.js rendering here for this. With Godot installed, its importer can do the same.
2. **Clean-up.** I convert to glTF where needed and fix scale and orientation (Synty FBX often arrives at ×100 scale or Z-up). Store-specific shaders get replaced with plain materials. Synty packs mostly share one colour-atlas texture per pack, which makes this easy.
3. **Tagging.** A manifest (`assets/manifest.json`) maps models to the roles the generator asks for. For example:
   ```json
   { "role": "building.merovan.house", "model": "packs/fantasy-town/SM_Bld_House_02.glb",
     "footprint": [8, 6], "door": [0, 0, 3.1], "styles": ["merovan", "vessari"] }
   ```
   Roles include:
   - `tree.parasol`, `rock.large`, `prop.barrel`, `wall.dungeon.straight`
   - `creature.loper`, `npc.body.male`, `weapon.longsword.steel`

   I propose the tags from the thumbnails, and you can correct any that are wrong.
4. **Generation.** The generator keeps deciding *what* goes *where*: town layouts, roads, dungeon grids, flora density per region. When it needs something it asks the manifest for a model with that role, chosen by the seeded RNG. Any role without a pack model falls back to today's procedural mesh, so packs can be added one at a time.
5. **Checking.** I screenshot towns, dungeons and regions from a few seeds, the way I've checked each milestone so far, and fix scale, clipping and placement problems before committing.

### Packs to look for

The game's look is Cindermere: mushroom trees, ash wastes, chitin and Kaldur brass. Few packs match it directly, so expect to mix them:

| Need | Where to look |
| --- | --- |
| Towns, interiors, props | Synty "Fantasy Kingdom" / "Fantasy Village" style packs, or Kenney's fantasy kits (CC0) |
| Dungeons | Synty dungeon packs, Kenney's modular dungeon kits |
| Nature | Synty nature packs. The giant mushrooms (emperor parasols) will probably stay procedural or need a dedicated fungus pack. |
| Characters and creatures | Synty modular fantasy characters, which share one rig and so share animations. Creatures such as loper, skyscreamers and tuskback will likely stay procedural unless a monster pack fits. |
| Animations | Synty animation packs, or Mixamo-style humanoid sets retargeted in Godot |

Low-poly packs mix well with each other. Mixing them with photo-scanned assets usually looks wrong.

## 3. Setting up this environment

For me to install and run Godot here (headless import, tests and exports), add these under **Network access → Allowed domains** in this cloud environment's settings. You reach them from the environment menu in the session's title bar, then **Edit**.

- `downloads.godotengine.org`
- `github.com` (the Godot releases redirect from here) and `objects.githubusercontent.com`

Steps: https://code.claude.com/docs/en/cloud-environments#network-access

Headless Godot can import, run scripts and tests, and export. It can't draw anything, so for screenshots I'd run the web export in the Chromium browser already installed here.

## Sources

- [Godot docs: Exporting for the Web](https://github.com/godotengine/godot-docs/blob/master/tutorials/export/exporting_for_web.rst): Compatibility renderer, no C#, single-threaded default, PWA option, audio modes, headers.
- [Godot forum: C# web export status](https://forum.godotengine.org/t/is-there-an-update-on-exporting-c-projects-to-web/128821)
- [Synty FAQ](https://syntystore.com/community/faq) and [Synty licences overview](https://syntystore.com/pages/licences-overview)
- [Unity support: using Asset Store assets with other engines](https://support.unity.com/hc/en-us/articles/34387186019988-Can-I-use-assets-from-the-Asset-Store-with-other-engines)
- [GameFromScratch: using Asset Store assets in other engines](https://gamefromscratch.com/using-asset-store-assets-in-other-engines-is-it-legal/)
- [Kenney asset packs (CC0)](https://kenney-assets.itch.io/)
