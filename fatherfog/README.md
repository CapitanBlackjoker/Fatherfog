**Tot el README està primer en català i, a continuació, en anglès. / The entire README is first in Catalan, then in English below.**

---

# Fatherfog – Sistema per a Foundry VTT

**Versió:** 0.20.14

Sistema de rol de terror de contes de fades per a [Foundry Virtual Tabletop](https://foundryvtt.com/).

Implementa les mecàniques del manual: fitxes de personatge i PNJ, creadors guiats (PJ i PNJ), tirades d100 amb avantatge/desavantatge i Dice So Nice, combat amb Cors, Hope / Desesperació, Mort, supervivència, trets de classe, habilitats oficials, equip, motxilles i artefactes llegendaris. Compatible amb Foundry v12–v14.

## Instal·lació

1. Descarrega el zip del sistema.
2. Extreu la carpeta `fatherfog`.
3. Col·loca-la a:

```
FoundryVTT/Data/systems/fatherfog/
```

4. Reinicia Foundry VTT (o recarrega el llistat de sistemes).
5. Crea un món nou i tria el sistema **Fatherfog**.

**Requisits:** Foundry VTT 12 o superior (verificat fins a 14.369).

## Què fa el sistema a Foundry

| Element | Comportament |
|-|-|
| **Actors** | Tipus `character` (PC) i `npc` (enemics / PNJ). Fitxes pròpies. |
| **Items** | `weapon`, `armor`, `equipment`, `skill`, `legacy`, `trinket`, `cloak`, `brooch`. |
| **Tirades** | d100 amb Avantatge / Desavantatge (4 daus a Dice So Nice); crítics (dobles, 99, 100); Bits = dígit de les unitats. |
| **Combat** | Dany a Salut (PC) amb Defensa; Cors als enemics (10 dany/ronda = 1 Cor); el Guia no tira. |
| **Hope** | Pèrdua en fracàs; Salvació d'Esperança → Desesperació; trets de classe. |
| **Mort** | A 0 Salut → Salvació de Cos → Preu de la Mort o mort definitiva. |
| **Supervivència** | Waterskin, Racions, Set / Fam / Esgotament, activitats de descans. |
| **Import** | Equip oficial, enemics d'exemple, catàleg d'habilitats i artefactes llegendaris. |

## Creador de personatge i PNJ

Al directori **Actors**, el botó **Creador** obre un diàleg:

- **Personatge (PJ)** — assistent de 9 passos del manual (stats, saves, classe, motxilla, capa/fermall/record/monedes, artefacte, habilitats, nom).
- **Enemic / PNJ** — assistent (identitat, Cors, stats opcionals, atacs, habilitats per llindar, motiu i truc).

Consola:

```js
game.fatherfog.openCreatorChooser()
game.fatherfog.openChargen()
game.fatherfog.openNpcChargen()
```

## Fitxa de personatge

Capçalera amb Salut, Esperança (botó Salvació d'Esperança), Defensa i Punts d'Habilitat. Pestanya principal: atributs i salvacions, classe i tret, identitat, motxilla, habilitats, artefacte llegendari, supervivència (Beure / Menjar / Descansar) i inventari. Pestanya de biografia i notes. Els Estranys tenen el botó Presència Estranya (−2 Hope).

## Fitxa de PNJ

Pensada per al Guia (no tira daus). Cors actuals/màxims, atacs (resolució amb Bits del jugador), habilitats per llindar, motiu i truc, inventari opcional.

## Tirades (d100)

Manual p.26–27:

- Èxit si la tirada és **estrictament inferior** a l'objectiu.
- **100** sempre èxit crític; **99** sempre fracàs crític.
- Crítics: dobles (00, 11, 22…); també 99 i 100.
- Bits = dígit de les unitats (94 → 4, 00 → 0).

Cada tirada permet Normal / Avantatge [+] / Desavantatge [−]. Amb avantatge o desavantatge es mostren els **dos** resultats i quin s'ha usat. Amb Set, Fam o Esgotament el diàleg preselecciona Desavantatge. En fracàs (excepte Hope Save) es perd 1 Esperança.

## Combat

**Atac del jugador:** prova de Voluntat; dany = tirada amb èxit ± modificador d'arma; botons al xat per aplicar dany al token objectiu.

**Atac d'enemic:** el Guia no tira; s'introdueix el d100 (o Bits) del jugador; sempre almenys Bits (Enemies Never Miss).

**Cors:** 1 Cor per cada 10 de dany a la mateixa ronda; la resta no es traspassa.

## Hope, Desesperació i Mort

Salvació d'Esperança fallida → recuperar Hope = tirada, marcar Desesperació, nota al GM; Caçador: «Caure com a Presa». A 0 Salut → flux de Mort amb Salvació de Cos i Preu de la Mort.

## Supervivència

Beure (treu Set), Menjar (treu Fam), marcar Set/Fam/Esgotament, Descansar (guàrdia, nit completa, mitja nit, somnis febrils, nit dura).

## Classes

Treballador (Tenacitat), Filòsof (Raó / Pèrdua de Raó), Estrany (Presència Estranya), Caçador (Emoció de la Caça / Caure com a Presa).

## Imports oficials (només GM)

Configuració del sistema → Fatherfog, o botons a les pestanyes Items / Actors. També:

```js
game.fatherfog.importOfficialGear()
game.fatherfog.importOfficialEnemies()
```

## Estructura de fitxers

```
fatherfog/
├── system.json
├── fatherfog.mjs
├── styles/fatherfog.css
├── lang/ca.json, en.json
├── module/data/, sheets/, combat.mjs, mechanics.mjs, chargen.mjs
├── templates/actor/, chargen.html, npc-chargen.html
├── packs/*.json
└── assets/
```

## Resum ràpid

1. **Creador** → tria PJ o PNJ i completa l'assistent.
2. **Importar** equip i enemics (GM).
3. **Tirades** des de la fitxa; avantatge/desavantatge mostra els dos resultats.
4. **Combat** amb botons de dany al xat; enemics amb ⚔️ a la fitxa NPC.
5. **Supervivència** i fluxos de Hope / Mort automàtics quan cal.

---

# Fatherfog – Foundry VTT System

**Version:** 0.20.14

Fairy-tale horror RPG system for [Foundry Virtual Tabletop](https://foundryvtt.com/).

Implements the rulebook mechanics: PC/NPC sheets, guided creators (PC and NPC), d100 rolls with advantage/disadvantage and Dice So Nice, Hearts combat, Hope / Despair, Death, survival, class traits, official skills, gear, rucksacks, and legacy artifacts. Compatible with Foundry v12–v14.

## Installation

1. Download the system zip.
2. Extract the `fatherfog` folder.
3. Place it in:

```
FoundryVTT/Data/systems/fatherfog/
```

4. Restart Foundry VTT (or refresh the systems list).
5. Create a new world and select the **Fatherfog** system.

**Requirements:** Foundry VTT 12 or higher (verified up to 14.369).

## What the system does in Foundry

| Element | Behaviour |
|-|-|
| **Actors** | Types `character` (PC) and `npc` (enemies / NPCs). Custom sheets. |
| **Items** | `weapon`, `armor`, `equipment`, `skill`, `legacy`, `trinket`, `cloak`, `brooch`. |
| **Rolls** | d100 with Advantage / Disadvantage (4 dice in Dice So Nice); criticals (doubles, 99, 100); Bits = units digit. |
| **Combat** | Damage to Health (PCs) with Defense; Hearts for enemies (10 damage/round = 1 Heart); the Guide never rolls. |
| **Hope** | Loss on failure; Hope Save → Despair; class traits. |
| **Death** | At 0 Health → Body Save → Death's Price or permanent death. |
| **Survival** | Waterskin, Rations, Thirst / Hunger / Exhaustion, resting activities. |
| **Import** | Official gear, sample enemies, skill catalog, legacy artifacts. |

## Character & NPC creators

In the **Actors** directory, the **Create** button opens a dialog:

- **Character (PC)** — full 9-step rulebook wizard (stats, saves, class, rucksack, cloak/brooch/trinket/coin, artifact, skills, name).
- **Enemy / NPC** — wizard (identity, Hearts, optional stats, attacks, threshold abilities, motive & trick).

Console:

```js
game.fatherfog.openCreatorChooser()
game.fatherfog.openChargen()
game.fatherfog.openNpcChargen()
```

## Character sheet

Header with Health, Hope (Hope Save button), Defense, and Skill Points. Main tab: stats and saves, class and trait, identity, rucksack, skills, legacy artifact, survival (Drink / Eat / Rest), and inventory. Biography tab. Strangers get the Odd Presence (−2 Hope) button.

## NPC sheet

Built for the Guide (no dice rolls). Current/max Hearts, attacks (resolve with the player's Bits), threshold abilities, motive and trick, optional inventory.

## Rolls (d100)

Rulebook p.26–27:

- Success if the roll is **strictly less than** the target.
- **100** always critical success; **99** always critical failure.
- Criticals: doubles (00, 11, 22…); also 99 and 100.
- Bits = units digit (94 → 4, 00 → 0).

Every roll offers Normal / Advantage [+] / Disadvantage [−]. With advantage or disadvantage, **both** results are shown and which one was used. With Thirst, Hunger or Exhaustion the dialog preselects Disadvantage. On failure (except Hope Save) lose 1 Hope.

## Combat

**Player attack:** Will check; damage = successful roll ± weapon modifier; chat buttons apply damage to the target token.

**Enemy attack:** Guide never rolls; enter the player's d100 (or Bits); always at least Bits (Enemies Never Miss).

**Hearts:** 1 Heart per 10 damage in the same round; remainder does not carry over.

## Hope, Despair & Death

Failed Hope Save → regain Hope equal to the roll, mark Despair, note to GM; Hunter: Falling Prey. At 0 Health → Death flow with Body Save and Death's Price.

## Survival

Drink (clear Thirst), Eat (clear Hunger), mark Thirst/Hunger/Exhaustion, Rest (keep watch, full night, half night, fevered dreams, rough night).

## Classes

Worker (Tenacity), Philosopher (Rational / Loss of Reason), Stranger (Odd Presence), Hunter (Thrill of the Hunt / Falling Prey).

## Official imports (GM only)

System settings → Fatherfog, or buttons on the Items / Actors tabs. Also:

```js
game.fatherfog.importOfficialGear()
game.fatherfog.importOfficialEnemies()
```

## File structure

```
fatherfog/
├── system.json
├── fatherfog.mjs
├── styles/fatherfog.css
├── lang/ca.json, en.json
├── module/data/, sheets/, combat.mjs, mechanics.mjs, chargen.mjs
├── templates/actor/, chargen.html, npc-chargen.html
├── packs/*.json
└── assets/
```

## Quick table summary

1. **Create** → choose PC or NPC and complete the wizard.
2. **Import** gear and enemies (GM).
3. **Rolls** from the sheet; advantage/disadvantage shows both results.
4. **Combat** with damage buttons in chat; enemies via ⚔️ on the NPC sheet.
5. **Survival** and automatic Hope / Death flows when needed.

---

*Fatherfog per a Foundry VTT — versió 0.20.14. Mecàniques alineades amb el manual.*  
*Fatherfog for Foundry VTT — version 0.20.14. Mechanics aligned with the rulebook.*
