# The world of Ashfall

Ashfall is set on **Cindermere**, a volcanic island at the edge of the **Emberreach**, the eastern province of the continent of **Aurenna**. Ash falls from the **Hearthpeak** most days. Giant mushroom forests grow in the warm, wet south.

The island is old, proud and suspicious of outsiders. The **Concord**, the empire that rules Aurenna from distant **Valecrest**, keeps forts and a Legion here, but its hold is thin.

This file is the reference for every name in the game. To rename something, change it here and in the code: the ids are listed in `code`.

## The story so far

- **Aethon**, a god who helped make the world, was cast down. His still-beating **Heart** fell into the Hearthpeak.
- The **Kaldur**, a vanished race of brass-working artificers, found the Heart in their deep halls. Their master artificer **Durnagh** forged three tools to draw on its power:
  - **Riven**, the hammer;
  - **Lament**, the blade;
  - **Soulward**, the gauntlet that keeps the wielder alive.
  The Kaldur disappeared overnight. Their brass ruins and clockwork guardians still dot the island.
- **The Ember Court**, once a noble house, drank from the Heart and became something else. Its lords, the **Vael**, dream under the mountain. Their servants (ash husks, ash thralls, rotstalkers) walk out of the ash storms carrying the **Cinderrot**, a sickness that turns flesh to ash and clay.
- The **Wardwall**, a ring of glowing pylons raised by the Temple, keeps the mountain's heart sealed in, until now.
- The **Lanterns**, the Concord's secret order, believe an outsider newly arrived on the island is **the Returned**: the hero the ash-elves' prophecies promised would take back Durnagh's tools and cut the Ember Court from the Heart. That outsider is you.

The final enemy is the Ember Lord in the **Ember Citadel** at the Hearthpeak's crater. Each world gives the Ember Lord its own name, such as *Vael Ashur*.

## Peoples (playable races)

| Race (`id`) | Who they are | Was |
| --- | --- | --- |
| Cindari (`cindari`) | Ash-elves, native to Cindermere. Grey skin, red eyes, fire-kissed. Mistrust outsiders | Dunmer |
| Aurelin (`aurelin`) | Sun-elves of the Sunward Isles. Gifted mages, fragile against magic | Altmer |
| Wyldren (`wyldren`) | Wood-elves of the Wyldwood. Archers and scouts | Bosmer |
| Saurek (`saurek`) | Scaled folk of the Saurek Fens. Breathe water, shrug off poison | Argonian |
| Rakhai (`rakhai`) | Feline people of the Rakhai Steppes. Quick, agile, see in the dark | Khajiit |
| Vessari (`vessari`) | Citizens of the Concord. Diplomats, traders and Legion soldiers | Imperial |
| Caldrin (`caldrin`) | Half-elven people of Caldmoor. Resist magic | Breton |
| Hrothi (`hrothi`) | Tall northern folk of Hrothmark. Shrug off frost | Nord |
| Tuskar (`tuskar`) | Tusked clans of the Tusk Holds. Smiths and berserkers | Orc |
| Qasiri (`qasiri`) | Desert sword-folk of Qasir | Redguard |

## Powers on the island

- **Great Houses** (town styles and factions):
  - **House Merovan** (`merovan`): merchants and fixers, plaster-and-timber towns.
  - **House Durath** (`durath`): warrior nobles, insect-shell manors.
  - **House Sorvenn** (`sorvenn`): reclusive wizards who grow their towers from giant mushrooms.
- **Ashwalkers** (`ashwalker`): Cindari nomads who live in yurt camps in the Ashlands and keep the old ways.
- **Vessari towns** (`vessari`): Concord forts and settlements. **Hrothi villages** (`hrothi`): on the frozen isle.
- **Temple of the Triune**: worships three living saints, **Saint Ilvara** (mercy), **Saint Corvane** (war and poetry) and **Saint Sethis** (artifice). *Triune Recall* returns a worshipper to the nearest Temple.
- **The Concord** worships **the Nine Lights**. *Lightward Recall* returns you to the nearest Concord fort.
- **Concord Legion**, **Fighters Guild**, **Mages Guild**, **Thieves Guild**, and **the Quiet Hand** (licensed assassins).
- **The Lanterns**: the Concord's secret order, who set you on the main quest.
- Travel: **longstriders** (towering insects ridden between towns), boats, guild guides, and the old **Waystones** (`waystone`) that link the Temple's island fortresses.
- Money: **crowns**.

## The Hollow

Demons are **the Hollowborn**, and their realm is **the Hollow**. Their weapons and armour are **abyssal**, the strongest material, and their ruined shrines (dungeon theme `abyssal`) are written in Abyssal script.

The princes of the Hollow are the **Hollow Lords**:

| Lord | Domain |
| --- | --- |
| Vharog the Ruiner | Destruction |
| Seraphe of Thorns | Deceit and trials |
| Mal'Garoth, King of Chains | Domination |
| The Huntmother | The hunt |
| Nyxa the Veiled | Shadows and thieves |
| Lady Vesper | Dusk and dawn; the Vesper Coast is named for her |
| Ixilith the Weaver | Secrets |

Mortal saints and heroes that legends mention are Saint Ardent, Mother Lira, the Iron Emperor and the Barrow King.

## Regions

| Region (`id`) | | Was |
| --- | --- | --- |
| The Ashlands (`ashlands`) | Grey ash wastes around the mountain | Ashlands |
| The Hearthpeak (`hearthpeak`) | The volcano and its crater | Red Mountain |
| The West Rift (`westRift`) | Rocky highlands of the west | West Gash |
| The Brine Coast (`brineCoast`) | Swampy south-west shore | Bitter Coast |
| The Verdant Isles (`verdant`) | Green farming lakelands | Ascadian Isles |
| The Mosslands (`mosslands`) | Rolling grassland of the north-east | Grazelands |
| The Vesper Coast (`vesperCoast`) | Eastern islands and cliffs | Azura's Coast |
| The Cinderfall (`cinderfall`) | Lava fields of the south-east | Molag Amur |
| Frostholm (`frostholm`) | The frozen isle to the north | |

## Creatures

| Creature (`id`) | | Was |
| --- | --- | --- |
| Shellback (`shellback`) | Giant shore crab | Mudcrab |
| Burrowgrub (`burrowgrub`) | Mine grub; grub eggs are a staple food | Kwama |
| Ash Mite (`mite`) | Small shelled scuttler; mite jelly | Scrib |
| Skyscreamer (`skyscreamer`) | Shrieking flying pest | Cliff Racer |
| Ash Hound (`ashHound`) | Long-legged hunting beast | Nix-Hound |
| Snapjaw (`snapjaw`) | Two-legged all-mouth predator | Alit |
| Tuskback (`tuskback`) | Charging tusked brute | Kagouti |
| Loper (`loper`) | Pack lizard used by caravans | Guar |
| Bull Drifter (`drifter`) | Floating jellyfish beast; drifter leather | Netch |
| Ancestral Shade (`ancestralShade`) | Restless family ghost of a tomb | Ancestor Ghost |
| Hollowbone, Bone Tyrant (`hollowbone`, `boneTyrant`) | Tomb undead | Bonewalker, Bonelord |
| Cinderling (`cinderling`) | Small fire-spitting Hollowborn | Scamp |
| Gnashclaw (`gnashclaw`) | Beaked Hollowborn beast | Clannfear |
| Abyssal Knight (`abyssKnight`) | Hollowborn warrior | Dremora |
| Rotmaw (`rotmaw`) | Crocodile-headed Hollowborn | Daedroth |
| Duskwing (`duskwing`) | Winged Hollowborn | Winged Twilight |
| Brass Spider, Brass Sentinel, Brass Colossus (`brassSpider`, `brassSentinel`, `brassColossus`) | Kaldur clockwork | Centurions |
| Kaldur Spectre (`kaldurShade`) | Ghost of a Kaldur | Dwarven Spectre |
| Ash Husk, Ash Thrall, Rotstalker, Ash Ghoul, Waking Dreamer (`ashHusk`, `ashThrall`, `rotstalker`, `ashGhoul`, `wakingDreamer`) | Servants of the Ember Court | Sixth House |
| Ember Lord (`emberlord`) | The final enemy | Dagoth Ur |
| Frostling (`frostling`) | Small blue frost-goblins of Frostholm | Riekling |
| Grimwight, Grimwight Lord (`grimwight`, `grimwightLord`) | Barrow undead | Draugr |
| Cave Imp, Grave Imp, Ember Imp, Puglin, Puglin Brute, Puglin Shaman | Dungeon dwellers | |

## Materials, weakest to strongest

Iron, chitin, steel, silver, tuskar, kaldur (brass), starmetal, crystal, obsidian, abyssal. Armour also comes in drifter leather, bonecast and warden plate.

## Birthsigns

| Sign (`id`) | Gift |
| --- | --- |
| The Anvil (`anvil`) | Strength and attack |
| The Lantern (`lantern`) | Magicka |
| The Magpie (`magpie`) | Agility and evasion |
| The Matron (`matron`) | Personality and endurance |
| The Hare (`hare`) | Speed |
| The Oak (`oak`) | Power: Heartwood. Weak to fire |
| The Candle (`candle`) | Great magicka, weak to magic |
| The Vessel (`vessel`) | Huge magicka, absorbs spells, no regeneration |
| The Chalice (`chalice`) | Power: Chalice's Gift |
| The Rose (`rose`) | Agility; power: Rose's Kiss |
| The Moth (`moth`) | Power: Moonshadow |
| The Key (`key`) | Security; spell: The Unhinging |
| The Adder (`adder`) | Spell: Adder's Curse |

## Legendary artifacts

| Artifact (`id`) | Legend | Was |
| --- | --- | --- |
| Vharog's Razor (`razor`) | Dagger that can cut a soul loose | Mehrunes' Razor |
| Sunbrand (`sunbrand`) | Golden fire katana | Goldbrand |
| Nightdrinker (`nightdrinker`) | Life-drinking greatsword | Umbra |
| Ice Blade of the Frost King (`iceBlade`) | Crystal greatsword | Ice Blade of the Monarch |
| Spear of Last Mercy (`lastMercy`) | Lightning spear | Spear of Bitter Mercy |
| Mace of Mal'Garoth (`chainMace`) | Steals magicka | Mace of Molag Bal |
| Skull Crusher (`skullCrusher`) | Kaldur warhammer | |
| Fang of Ssarvetha (`fang`) | Poison dagger | Fang of Haynekhtnamet |
| Bow of Shadows (`bowOfShadows`) | Nyxa's bow | |
| Durnagh's Repeater (`durnaghRepeater`) | Self-cranking crossbow | Kagrenac's Repeater |
| Cuirass of the Flayed Saint (`flayedSaint`) | Turns spells | Savior's Hide |
| Warden's Mail (`wardensMail`) | Heals its wearer | Lord's Mail |
| Obsidian Mail (`obsidianMail`) | Burns attackers | Ebony Mail |
| Boots of Blinding Haste (`blindingSpeed`) | Speed at the cost of aim | Boots of Blinding Speed |
| Ancestor's Rime Blade (`rimeBlade`) | Frostholm's reward | Stalhrim Blade |

The 16 rare unique swords are listed in `src/data/artifacts.js`.
