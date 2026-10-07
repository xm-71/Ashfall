# Fixing how the asset packs look, on your own

This guide covers fixing models that look wrong in the game without writing code. The steps are for a Mac. You'll use:
- **The Workbench:** a visual editor that comes with the game.
- **Free online glTF viewers:** for looking inside model files.

Almost everything about how pack models appear is set in one file, `assets/manifest.json`. The Workbench edits that file for you and shows the result as you change it.

## One-time setup on a Mac

1. Install **Node.js** (the LTS version) from <https://nodejs.org>, or with Homebrew: `brew install node`.
2. Install **Google Chrome** if you don't have it. Some online viewers don't support drag-and-drop in Safari.
3. Get the project. In VS Code, run **Git: Clone** with `https://github.com/xm-71/Ashfall.git`, then check out the branch you're working on.
4. In VS Code's terminal (Terminal → New Terminal), run:
   ```bash
   npm install
   npm run assets     # converts the packs (the first run takes a few minutes)
   ```

## The Workbench

```bash
npm run workbench
```

This starts the game's development server and opens the Workbench in your browser. The game itself runs at the same address without `/workbench.html` (the **Open game ↗** button).

| Tab | What it's for |
| --- | --- |
| **Roles** | Every slot in the world that a model can fill: trees, rocks, buildings, props, dungeon pieces, people, each creature. The number shows how many models fill it, and `–` means the game builds its own. Click a role to preview its models and edit them. |
| **Buildings** | The kits that assemble town houses and room interiors from pieces. The preview builds a house for a plot size and building type you choose; **Another layout** tries a different arrangement. |
| **All models** | Every converted model, shown exactly as it comes out of the converter, with its size, triangle count, materials, bones and animation clips. **Add to role** puts it to use. |
| **Manifest** | The whole `assets/manifest.json` as text, for edits the forms don't cover. |

**Working with it:**
- **Moving the view:** drag to orbit, scroll to zoom, right-drag to pan.
- **Scale references:** the grid squares are 1 m and the green outline is a 1.8 m person.
- **The arrow** is the game's "front": where a building's door faces, or which way a character looks.
- **Seeing changes in the game:** edits preview straight away but aren't saved until you click **Save manifest**. To see them in the game, click **Save & rebuild packs**, then reload the game tab.
- **People and creatures:** pick a race (to check skin and hair tint) and an animation (idle, walk, run, attack, hit, die, talk) from the bar above the preview. **Reroll parts** shows other hairstyle and beard picks.

### Fields you'll use most

| Field | Use it when |
| --- | --- |
| **Scale** | A model is too big or too small. |
| **Fit / Height** | You want a model sized to a height (for example, every parasol 11 m tall) rather than its file size. |
| **Front / Turn** | A model faces the wrong way. Front says which side of the file is its front. Turn adds a rotation. |
| **Rotate** | A model is lying on its side (try 90 or −90 on X). |
| **Offset** | A model floats or sinks. Change the middle (Y) number. |
| **Align** | `base` stands the model on the ground, centred. `pivot` keeps the origin the artist set, which modular kit pieces need. |
| **Weight** | One model should appear more or less often than the others in the same role. |
| **Filters (where)** | A model belongs only in some places. For example `{"region": ["ashlands"]}` for a tree, or `{"style": ["redoran"]}` for a building. |
| **Animations** | Which animation set a person or creature uses. Sets are defined in the Manifest tab under `"animations"`. |
| **Parts / Tint / Keep** | People made of several files (see below). |

## Fixes for the problems you're likely to see

**A model is white, grey or flat-coloured.** Its texture wasn't found.
1. Open the original file in an online viewer (below). If it's untextured there too, the texture lives in a separate image in the pack.
2. In the Manifest tab, under `"packs"` → your pack → `"textures"`, map the material name to the image. For example `"MI_Plaster": "Textures/T_Plaster_BaseColor.png"`, or `"*"` for every material.
3. Click Save & rebuild.

**A building's windows are see-through holes.**
1. In modular kits, the window frame and glass are separate pieces. In Buildings → the kit, give each window panel its frame:
   ```json
   { "model": ".../Wall_Plaster_Window_Wide_Round", "with": [".../Window_Wide_Round1", { "oneOf": [".../WindowShutters_Wide_Round_Open", null] }] }
   ```
   `with` pieces are placed at the panel's own origin. `oneOf` picks one at random, and `null` means nothing.
2. To find the matching frame for a panel, look in the All models tab. The names usually match.

**A door is off-centre or sunk into the wall.**
1. Adjust `doorLeaf` → `offset` in the kit: `[sideways, up, in/out]` in metres.
2. Use **Another layout** and the plot size boxes to check it on several houses.

**People are missing skin, a head, or show skin through clothes.**
- **The model:** a person's `model` should be the **base body** (Universal Base Characters `Superhero_Male_FullBody` / `Superhero_Female_FullBody`).
- **The outfit:** worn as a part, in `parts` → `outfit`.
- **Hair and beards:** also parts. Use `null` in a slot for "sometimes none".
- **Keep:** `{"MI_Superhero_*": ["neck_01"]}` keeps only the head and neck of the base body, so its torso doesn't poke through clothes made for a different body shape.
- **Tint:** `{"MI_Superhero_*": "skin", "MI_Regular_*": "skin", "MI_Hair*": "hair"}` colours skin and hair by race. Material names are listed in the All models tab.

**A character slides, floats or plays the wrong animation.** In the Manifest tab, `"animations"` maps the game's moves to clips as `"model id#clip name"`. For example `"walk": "Universal-Animation-Library/Unreal-Godot/UAL1_Standard#Walk_Loop"`. The clip names of an animation library are listed in the All models tab. Preview each move with the animation picker.

**A tree is huge or tiny compared with the others.** Set **Scale** on that entry. To size all trees in a role the same way, use Fit `height` with a Height.

**Hoods show hair poking through.** Remove the `hair` slot from the hooded outfit's parts.

**The game feels slow.**
- The All models tab shows triangle counts. Very detailed models (over about 10,000 triangles) are costly when they repeat thousands of times, as trees do. Prefer lighter models for flora.
- Flora automatically gets a simplified far-away version.

## Online tools for looking inside model files

Drag a file onto the page; nothing is uploaded. There are two copies of each model you can drop in:
- **The original**, in `assets/packs/...` (for a `.gltf`, drop its folder or all its files together).
- **The converted version** the game uses, in `assets/.cache/models/...glb`. Comparing the two shows whether the converter changed something.

| Tool | Good for |
| --- | --- |
| [glTF Viewer](https://gltf-viewer.donmccurdy.com/) (Don McCurdy) | Quick look at a model, its animations and textures, with a validation report listing problems in the file. Built on three.js, the same engine as the game, so it renders closest to the game. |
| [Babylon.js Sandbox](https://sandbox.babylonjs.com/) | Its **Inspector** shows every material and texture, the skeleton, and each animation clip. You can also turn meshes on and off to find what's poking through. |
| [gltf.report](https://gltf.report/) | Triangle counts, texture sizes and memory: why a model is heavy. Its Script tab can also batch-fix files (glTF Transform). |
| [Khronos glTF Validator](https://github.khronos.org/glTF-Validator/) | The official checker. Use it when a model won't load or loads broken. |
| [three.js editor](https://threejs.org/editor/) | Light editing: move, rotate or delete parts of a model, combine pieces, then **File → Export GLB**. Put the edited file into your pack folder and run Save & rebuild. |

## Getting your changes onto the website

1. Commit and push in VS Code (Source Control panel). Include `assets/manifest.json` and the `public/packs` folder.
2. Deploy from the Vercel dashboard (your `ashfall` project → **Deployments**), or ask me to deploy.
3. If the project is connected to auto-deploy a branch, pushing to that branch is enough.

## When to ask me (Claude)

The Workbench and manifest cover how existing parts of the world use models. Ask me when you want the game itself to change: a new kind of thing in the world (new role), new behaviour (a door that opens, sitting animations in taverns), or support for a new kind of pack.
