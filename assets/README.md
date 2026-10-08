# Asset packs

Ashfall builds all of its art in code, but any part of the world can be
replaced with models from asset packs (Synty, Kenney, Quaternius and the like).
Anything a pack doesn't cover keeps the generated art, so packs can be added
one at a time.

```
assets/packs/<pack>/...     the packs, as downloaded (FBX, glTF or GLB, plus textures)
assets/manifest.json        which models fill which roles
assets/ROLES.md             every role the world asks for (generated)
public/packs/               the converted models the game loads (generated, committed)
```

To adjust models visually instead of editing JSON, run `npm run workbench`. See [docs/fixing-assets.md](../docs/fixing-assets.md).

## Adding a pack

1. **Check the licence.** Paid packs may only be committed to a **private** repository. CC0 packs (Kenney, Quaternius, Poly Pizza CC0) are fine anywhere.
2. **Copy the pack** into `assets/packs/<pack-name>/`, keeping its folders.
   - Include the FBX or glTF models and the textures.
   - Leave out engine-specific files (`.unitypackage`, `.prefab`, `.mat`, `.uasset`). They're ignored anyway.
   - For Synty, use the "Source Files" download.
   - Keep each file under 100 MB, which GitHub refuses above.
   - Avoid Git LFS: the cloud environment can't fetch LFS files.
3. **Run `npm run assets`.** This:
   - converts every model to an optimised, metre-scaled GLB (FBX through FBX2glTF, bundled with npm);
   - repairs Synty-style texture links;
   - writes `assets/catalog.json`, which lists each model's size, triangle count, rig and animation clips, plus a guess at its role;
   - writes `assets/manifest.suggested.json`, with every model listed under the role its name suggests.
4. **Look at the models** with `npm run assets:review`. It prints a local URL showing every model in a labelled grid with a 1 m floor grid. Add `-- --shots` to save the grids as images in `assets/review/` instead (needs Playwright).
5. **Assign models to roles** in `assets/manifest.json` (see below), then run `npm run assets` again. Only the models the manifest uses are copied to `public/packs/`. Commit `assets/packs`, `assets/manifest.json` and `public/packs`.

## The manifest

```jsonc
{
  "packs": {
    "fantasy-town": {
      "license": "Synty Store, single seat",
      "scale": 0.01,                 // optional; centimetre packs are detected automatically
      "rotate": [-90, 0, 0],         // optional axis fix in degrees (for Z-up exports)
      "textures": {                  // optional; material name (glob) -> image in the pack
        "*": "Textures/PolygonFantasyKingdom_Texture_01_A.png"
      },
      "ignore": ["Source/Old/**"],   // optional
      "maxTexture": 1024             // optional; textures are resized and turned into WebP
    }
  },
  "animations": {
    "humanoid": {                    // a set of clips: "<model id>#<clip name>"
      "idle": "fantasy-anims/Models/Idle#Idle",
      "walk": "fantasy-anims/Models/Walk#Walk",
      "run": "fantasy-anims/Models/Run#Run",
      "attack": "fantasy-anims/Models/Sword_Slash#Slash",
      "die": "fantasy-anims/Models/Death#Death"
    }
  },
  "roles": {
    "flora.parasol": [{ "model": "fantasy-town/Models/SM_Env_Mushroom_Large_01", "scale": 1.2 }],
    "flora.gashTree": [
      { "model": "nature/Models/Tree_01", "where": { "region": ["westRift", "verdant"] } },
      { "model": "nature/Models/Tree_02", "weight": 2 }
    ],
    "building": [{ "model": "fantasy-town/Models/SM_Bld_House_01", "where": { "style": ["merovan", "vessari"], "type": ["house", "shop"] } }],
    "npc": [{ "model": "fantasy-chars/Models/SK_Chr_Farmer_Male_01", "anims": "humanoid", "where": { "sex": "male", "role": ["commoner", "trader"] } }]
  }
}
```

**Model ids** are `<pack>/<path inside the pack without extension>`, with spaces turned into `_`. They're listed in `assets/catalog.json` and shown on the review page.

### Entry options

| Option | Meaning |
| --- | --- |
| `model` | Model id (required) |
| `where` | Context filter. A value can be a string or a list. Keys depend on the role: `region` for flora; `style` and `type` for buildings; `theme` or `style` for props; `theme` for dungeon pieces; `race`, `sex` and `role` for people |
| `weight` | Relative chance when several entries match (default 1) |
| `scale` | Multiplies the size (or a fitted size) |
| `fit` | Overrides the role's sizing: `none` (native size), `height`, `footprint` (fit the building plot), `cell` (stretch to a 4 m dungeon cell) or `length` (weapons: as long as the game's weapon of that kind, no wider than 0.34 m) |
| `height` | Target height in metres for `fit: "height"` |
| `front` | Which side of the model is its front: `+z` (default, the glTF convention), `-z`, `+x` or `-x` |
| `yaw`, `rotate`, `offset` | Extra turn (degrees), rotation `[x, y, z]` (degrees) and offset `[x, y, z]` (metres) |
| `align` | `base` (default: bottom centre on the ground), `top`, `center` or `pivot` (keep the model's own origin) |
| `collider` | Trunk radius for trees and boulders, in metres |
| `anims` | Animation set for a rigged person or creature |
| `strike` | Where in the attack clip the blow lands (0 to 1, default 0.45) |
| `handBone`, `handRotate` | Bone that holds weapons (found automatically) and its rotation fix |
| `lod: false` | Flora: hide far away instead of drawing the full model at a distance |
| `recolor: true` | With `tint`: the texture is turned grey before it is tinted, so a red monster can become a grey one (a plain tint only darkens or shifts the colour) |
| `metal: true` | Weapons: the model's metal parts (what its metalness map marks as metal) take the item material's colour, so one bronze sword serves as steel or silver too; the grip keeps its own colour |

### Roles

`assets/ROLES.md` lists every role with its typical size and filters. In short:

- `flora.*`: parasol, gashTree, pine, swampTree, deadTree, shrub, grass, thornroot, rock, boulder.
- `building`: sized to the plot, with the front toward the plaza. The game places the door at the front centre.
- `prop.*`:
  - furniture and clutter for interiors, dungeons and town plazas;
  - `chest` and `chestOpen` (shown once looted). A rigged chest with `close` and `open` clips needs no `chestOpen`: it plays its own lid;
  - plaza pieces `well`, `stall` and `lamppost`.
- `dungeon.wall`, `dungeon.floor`, `dungeon.ceiling` and `dungeon.pillar`: modular pieces stretched to 4 m cells. Ramps and uneven floors keep the generated floor.
- `npc`: people. Needs a rig and an animation set; only `idle` is required, and `walk`, `run`, `attack`, `hit`, `die` and `talk` are used when present.
- `player`: the player's body, one entry per sex. Character creation offers every model listed in each `parts` slot (outfit, hair, beard; `null` = none), and the first-person arms are cut from the same body.
- `weapon.<base>` (`weapon.longsword`, `weapon.war axe`, ...), filtered by `material`, and `shield`. Held items keep the file's orientation: the origin is where the hand grips, with the blade pointing up (+Y). They keep their shiny (PBR) materials.
- `artifact.<id>`: the look of one legendary artifact or rare unique sword (ids in `src/data/artifacts.js`).
- `decor.town`, `decor.entrance` and `decor.wild`: dressing so the world isn't bare. Town clutter goes beside each building's front wall and around the plaza (filter by `style`), entrance props around dungeon doors (by `theme`), and ground cover among the plants (by `region`). Props wider than half a metre are solid.
- `room.*`: interior dressing, loaded with each building's interior.
  - **On surfaces:** `room.dining`, `tavern`, `feast`, `study`, `goods`, `tools`, `shelf`, `books` and `altar` go on tables, counters, shelves and altars. They are set on the furniture model's actual flat surfaces (its top and every shelf board, found from the geometry) and fill each surface along its length.
  - **On walls:** `room.wall` (shields, racks) and `room.light` (lanterns and torches, which light the room).
  - **Elsewhere:** `room.floor` (odds and ends by the walls) and `room.railing` (the gallery railing in big halls).
  - **Interior furniture:** `prop.chandelier`, `prop.pilaster` (posts under the ceiling beams), `prop.stairs`, `prop.workbench`, `prop.whetstone`, `prop.cauldron`, `prop.bookstand`, `prop.candlestand`, `prop.kegs` and `prop.nightstand`.
  - Phones and Low quality get about half the small items.
- `creature.<id>`: one role per creature (`creature.loper`, `creature.skyscreamer`, ...). A creature's `tint` colour (in `src/data/creatures.js`) colours materials mapped to `"body"`, e.g. `"tint": { "MI_Imp": "body" }`.
  - Humanoid foes (bandits, smugglers) fall back to `npc` models with a matching `role` filter.

### Characters: parts and colours

A person can be built from several rigged files that share one skeleton. For example, an outfit body plus a hairstyle, eyebrows and an optional beard:

```jsonc
{ "model": "outfits/Male_Peasant", "anims": "humanoid",
  "parts": { "hair": ["hair/Hair_Buzzed", "hair/Hair_Long"], "beard": ["hair/Hair_Beard", null], "brows": ["hair/Eyebrows"] },
  "tint": { "MI_Regular_*": "skin", "MI_Hair*": "hair" } }
```

- **Parts:** one model per slot is chosen from each person's seed; `null` means nothing in that slot. Each part is bound to the main model's bones by name.
- **Tints:** a material whose name matches is coloured per person. `skin` follows the race's skin colour, relative to a Vessari (so Vessari are unchanged and Cindari turn grey-blue). `hair` takes the race's hair colour.

### Kits: buildings and rooms from modular pieces

Packs that come as modular kits (wall panels, roofs, doors) rather than whole buildings are listed under `kits`:
- `kits.building` assembles every town building to fit its plot. Each house gets one or two storeys of wall panels (windows chosen at random), with the doorway in the middle of the front wall facing the plaza, plus corner posts, a roof sized to the footprint, gable ends and sometimes a chimney.
- `kits.interior` builds room walls and floors.

Each kit has a `where` filter (for example by town `style`), so different towns can use different kits.

```jsonc
"kits": {
  "building": [{
    "where": { "style": ["merovan", "vessari"] },
    "grid": 2, "storey": 3.12,                       // panel width and height in metres
    "wall": [...], "wallBase": [...], "window": [...], "door": [...], "corner": [...],
    "doorLeaf": [{ "model": "...", "offset": [-0.56, 0, -0.12] }],   // the door, placed in the doorway panel
    "roofs": { "4x4": "...", "6x8": "..." },         // roof models by footprint, width (x) by depth (z)
    "gables": { "4": "...", "6": "..." },            // gable ends by roof width
    "chimney": [...],
    "stories": { "house": [1, 2], "temple": [2, 2] } // storeys per building type
  }],
  "interior": [{ "where": { "style": [...] }, "floor": [...], "wall": [...], "door": [...], "doorLeaf": [...] }]
}
```

Kit pieces are placed by their own origin, as the pack's authors set it up. Wall panels stand on the plot edge with their +Z face outward, and roofs sit on top of the walls.

### Animations

Clips from another file are fitted to the model that plays them:
- Rotations are moved between the two rigs' rest poses.
- The root bone's movement is rescaled by their hip heights.

Rigs from the same family (a Synty character pack and a Synty animation pack, or Mixamo models) share bone names, so their animations mix freely. Rigs with different bone names don't.

If an attack, hit or death clip is missing, the game's own timing still applies: a character without `die` topples over.

## What gets published

To keep downloads small:
- Models are published as `.gltf` + `.bin`, and their textures are stored once in `public/packs/textures/` under names taken from their content. A texture atlas shared by forty kit pieces downloads once.
- A file used only for its animations (an animation library) is published without its mesh and with only the clips the manifest uses.
- Every texture also gets a half-size copy in `public/packs/textures/lo/`. Phones (and the Low quality setting) load those, because a phone browser gives a page far less memory.
- Models that repeat (kit pieces, props) are drawn instanced: each is stored once, however many houses use it.

## How it loads

`public/packs/index.json` lists the published models. The game reads it at start-up and loads models per area, behind the loading bar:
- the overworld's flora, buildings, plaza props, people and creatures before the island is built;
- a dungeon's kit and props the first time you enter that kind of dungeon;
- furniture the first time you enter a building of that style.

Pack models are cached for offline play as they load. With no packs, nothing extra is downloaded.
