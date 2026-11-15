Fatherfog – Foundry VTT System
Version: 0.20.14
Fairy-tale horror RPG system for Foundry Virtual Tabletop.
Implements the rulebook mechanics: PC/NPC sheets, guided creators (PC and NPC), d100 rolls with advantage/disadvantage and Dice So Nice, Hearts combat, Hope / Despair, Death, survival, class traits, official skills, gear, rucksacks, and legacy artifacts. Compatible with Foundry v12–v14.
Installation
Download the system zip.
Extract the `fatherfog` folder.
Place it in:
```
FoundryVTT/Data/systems/fatherfog/
```
Restart Foundry VTT (or refresh the systems list).
Create a new world and select the Fatherfog system.
Requirements: Foundry VTT 12 or higher (verified up to 14.369).
What the system does in Foundry
Element	Behaviour
Actors	Types `character` (PC) and `npc` (enemies / NPCs). Custom sheets.
Items	`weapon`, `armor`, `equipment`, `skill`, `legacy`, `trinket`, `cloak`, `brooch`.
Rolls	d100 with Advantage / Disadvantage (4 dice in Dice So Nice); criticals (doubles, 99, 100); Bits = units digit.
Combat	Damage to Health (PCs) with Defense; Hearts for enemies (10 damage/round = 1 Heart); the Guide never rolls.
Hope	Loss on failure; Hope Save → Despair; class traits.
Death	At 0 Health → Body Save → Death's Price or permanent death.
Survival	Waterskin, Rations, Thirst / Hunger / Exhaustion, resting activities.
Import	Official gear, sample enemies, skill catalog, legacy artifacts.
Character & NPC creators
In the Actors directory, the Create button opens a dialog:
Character (PC) — full 9-step rulebook wizard (stats, saves, class, rucksack, cloak/brooch/trinket/coin, artifact, skills, name).
Enemy / NPC — wizard (identity, Hearts, optional stats, attacks, threshold abilities, motive & trick).
Console:
```js
game.fatherfog.openCreatorChooser()
game.fatherfog.openChargen()
game.fatherfog.openNpcChargen()
```
Character sheet
Header with Health, Hope (Hope Save button), Defense, and Skill Points. Main tab: stats and saves, class and trait, identity, rucksack, skills, legacy artifact, survival (Drink / Eat / Rest), and inventory. Biography tab. Strangers get the Odd Presence (−2 Hope) button.
NPC sheet
Built for the Guide (no dice rolls). Current/max Hearts, attacks (resolve with the player's Bits), threshold abilities, motive and trick, optional inventory.
Rolls (d100)
Rulebook p.26–27:
Success if the roll is strictly less than the target.
100 always critical success; 99 always critical failure.
Criticals: doubles (00, 11, 22…); also 99 and 100.
Bits = units digit (94 → 4, 00 → 0).
Every roll offers Normal / Advantage [+] / Disadvantage [−]. With advantage or disadvantage,(different colour dice+ regular dices)  both results are shown and which one was used. With Thirst, Hunger or Exhaustion the dialog preselects Disadvantage. On failure (except Hope Save) lose 1 Hope.
Combat
Player attack: Will check; damage = successful roll ± weapon modifier; chat buttons apply damage to the target token.
Enemy attack: Guide never rolls; enter the player's d100 (or Bits); always at least Bits (Enemies Never Miss).
Hearts: 1 Heart per 10 damage in the same round; remainder does not carry over.
Hope, Despair & Death
Failed Hope Save → regain Hope equal to the roll, mark Despair, note to GM; Hunter: Falling Prey. At 0 Health → Death flow with Body Save and Death's Price.
Survival
Drink (clear Thirst), Eat (clear Hunger), mark Thirst/Hunger/Exhaustion, Rest (keep watch, full night, half night, fevered dreams, rough night).
Classes
Worker (Tenacity), Philosopher (Rational / Loss of Reason), Stranger (Odd Presence), Hunter (Thrill of the Hunt / Falling Prey).
Official imports (GM only)
System settings → Fatherfog, or buttons on the Items / Actors tabs. Also:
```js
game.fatherfog.importOfficialGear()
game.fatherfog.importOfficialEnemies()
```
File structure
```
fatherfog/
├── system.json
├── fatherfog.mjs
├── styles/fatherfog.css
├── lang/ca.json, en.json
├── module/data/, sheets/, combat.mjs, mechanics.mjs, chargen.mjs
├── templates/actor/, chargen.html, npc-chargen.html
├── packs/\\\\\\\\\\\\\\\*.json
└── assets/
```
Quick table summary
Create → choose PC or NPC and complete the wizard.
Import gear and enemies (GM).
Rolls from the sheet; advantage/disadvantage shows both results.
Combat with damage buttons in chat; enemies via ⚔️ on the NPC sheet.
Survival and automatic Hope / Death flows when needed.
---  
Fatherfog for Foundry VTT — version 0.20.16. Mechanics aligned with the rulebook.
