import { CharacterData, NpcData } from "./module/data/actor.mjs";
import {
  WeaponData,
  ArmorData,
  EquipmentData,
  SkillData,
  LegacyData,
  FlavorItemData
} from "./module/data/item.mjs";
import { FatherfogCharacterSheet } from "./module/sheets/character-sheet.mjs";
import { FatherfogNpcSheet } from "./module/sheets/npc-sheet.mjs";
import {
  registerCombatHooks,
  applyDamageToActor,
  applyDamageToEnemy,
  resolveEnemyAttack,
  endCombatRound,
  beginCombatRound,
  getEnemyHearts,
  getBitsFromRoll
} from "./module/combat.mjs";
import {
  registerDeathHook,
  applyOddPresence,
  handleDeath,
  getNearbyPartyMembers,
  changeHope,
  changeHealth,
  drinkWaterskin,
  eatRation,
  markPeril,
  restDialog,
  performRest,
  hasPerilDisadvantage
} from "./module/mechanics.mjs";
import { registerChargen, FatherfogChargen, FatherfogNpcChargen } from "./module/chargen.mjs";

/** @type {Array<object>} */
let OFFICIAL_SKILLS = [];
/** @type {Array<object>} */
let LEGACY_ARTIFACTS = [];

Hooks.once("init", () => {
  console.log("Fatherfog | Initializing System v0.20.13");
  registerCombatHooks();
  registerDeathHook();

  // Handlebars helpers used by the chargen template
  Handlebars.registerHelper("eq", (a, b) => a === b);
  Handlebars.registerHelper("lt", (a, b) => a < b);

  CONFIG.Actor.dataModels = {
    character: CharacterData,
    npc: NpcData
  };

  CONFIG.Item.dataModels = {
    weapon: WeaponData,
    armor: ArmorData,
    equipment: EquipmentData,
    skill: SkillData,
    legacy: LegacyData,
    trinket: FlavorItemData,
    cloak: FlavorItemData,
    brooch: FlavorItemData
  };

  CONFIG.Actor.trackableAttributes = {
    character: {
      bar: ["health", "hope"],
      value: ["defense.value"]
    },
    npc: {
      bar: ["health", "hope"],
      value: ["defense.value", "hearts"]
    }
  };

  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("fatherfog", FatherfogCharacterSheet, {
    types: ["character"],
    makeDefault: true,
    label: "Fatherfog Character Sheet"
  });
  Actors.registerSheet("fatherfog", FatherfogNpcSheet, {
    types: ["npc"],
    makeDefault: true,
    label: "Fatherfog NPC Sheet"
  });

  game.settings.register("fatherfog", "officialGearImported", {
    name: "Official Gear Imported",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

  game.settings.register("fatherfog", "officialEnemiesImported", {
    name: "Official Enemies Imported",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

  // Settings menu (GM only) – import outside character sheets
  game.settings.registerMenu("fatherfog", "importMenu", {
    name: "FATHERFOG.ImportMenu",
    label: "FATHERFOG.ImportMenuLabel",
    hint: "FATHERFOG.ImportMenuHint",
    icon: "fas fa-download",
    type: FatherfogImportMenu,
    restricted: true
  });

  console.log("Fatherfog | System Ready");
});



async function loadLegacyArtifacts() {
  try {
    const path = "systems/fatherfog/packs/legacy-artifacts.json";
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Could not load ${path}`);
    LEGACY_ARTIFACTS = await response.json();
    console.log(`Fatherfog | Loaded ${LEGACY_ARTIFACTS.length} legacy artifacts`);
  } catch (err) {
    console.error("Fatherfog | Failed to load legacy artifacts", err);
    LEGACY_ARTIFACTS = [];
  }
}

export function getLegacyArtifacts() {
  return LEGACY_ARTIFACTS.slice();
}

export function getLegacyArtifact(id) {
  const n = Number(id);
  return LEGACY_ARTIFACTS.find(a => a.id === n) || null;
}

export function legacyArtifactDisplayName(art) {
  const lang = (game.i18n?.lang || "en").startsWith("ca") ? "ca" : "en";
  return art?.name?.[lang] || art?.name?.en || `Artifact ${art?.id ?? "?"}`;
}

export function legacyArtifactDescription(art) {
  const lang = (game.i18n?.lang || "en").startsWith("ca") ? "ca" : "en";
  return art?.description?.[lang] || art?.description?.en || "";
}

async function loadOfficialSkills() {
  try {
    const path = "systems/fatherfog/packs/official-skills.json";
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Could not load ${path}`);
    OFFICIAL_SKILLS = await response.json();
    console.log(`Fatherfog | Loaded ${OFFICIAL_SKILLS.length} official skills`);
  } catch (err) {
    console.error("Fatherfog | Failed to load official skills", err);
    OFFICIAL_SKILLS = [];
  }
}

function skillLang() {
  const lang = game.i18n?.lang || "en";
  return lang.startsWith("ca") ? "ca" : "en";
}

export function skillDisplayName(skill) {
  const lang = skillLang();
  return skill?.name?.[lang] || skill?.name?.en || skill?.id || "?";
}

export function getOfficialSkills(rank = null) {
  if (!rank) return OFFICIAL_SKILLS.slice();
  return OFFICIAL_SKILLS.filter(s => s.rank === rank);
}

/**
 * Collect every skillId the actor already owns (any tier).
 * @param {Actor} actor
 * @returns {Set<string>}
 */
export function getOwnedSkillIds(actor) {
  const owned = new Set();
  if (!actor?.system?.skills) return owned;
  for (const tier of ["common", "expert", "master"]) {
    const bag = actor.system.skills[tier] ?? {};
    for (const entry of Object.values(bag)) {
      if (entry?.skillId) owned.add(entry.skillId);
    }
  }
  return owned;
}

/**
 * Look up a skill definition by id from the official catalog.
 * @param {string} skillId
 * @returns {object|null}
 */
export function getSkillDef(skillId) {
  if (!skillId) return null;
  return OFFICIAL_SKILLS.find(s => s.id === skillId) || null;
}

/**
 * Whether the actor may take this skill given prerequisite rules.
 * @param {Actor|Set<string>} actorOrOwnedIds
 * @param {object|string} skillOrId
 * @returns {{ ok: boolean, prereq: string|null, prereqName: string|null }}
 */
export function canTakeSkill(actorOrOwnedIds, skillOrId) {
  const skill = typeof skillOrId === "string" ? getSkillDef(skillOrId) : skillOrId;
  if (!skill) {
    return { ok: false, prereq: null, prereqName: null };
  }
  const prereq = skill.prereq || null;
  if (!prereq) {
    return { ok: true, prereq: null, prereqName: null };
  }
  const owned =
    actorOrOwnedIds instanceof Set
      ? actorOrOwnedIds
      : getOwnedSkillIds(actorOrOwnedIds);
  const ok = owned.has(prereq);
  const prereqDef = getSkillDef(prereq);
  return {
    ok,
    prereq,
    prereqName: prereqDef ? skillDisplayName(prereqDef) : prereq
  };
}

/**
 * Filter skill defs: not owned + prerequisite met.
 * @param {Actor|Set<string>} actorOrOwnedIds
 * @param {object[]} skills
 * @returns {{ available: object[], locked: object[] }}
 */
export function filterSkillsByPrereq(actorOrOwnedIds, skills) {
  const owned =
    actorOrOwnedIds instanceof Set
      ? actorOrOwnedIds
      : getOwnedSkillIds(actorOrOwnedIds);
  const available = [];
  const locked = [];
  for (const s of skills || []) {
    if (owned.has(s.id)) continue;
    const check = canTakeSkill(owned, s);
    if (check.ok) available.push(s);
    else locked.push({ ...s, missingPrereq: check.prereq, missingPrereqName: check.prereqName });
  }
  return { available, locked };
}

export async function importOfficialGear() {
  const already = game.settings.get("fatherfog", "officialGearImported");
  if (already) {
    const redo = await Dialog.confirm({
      title: game.i18n.localize("FATHERFOG.ImportGear"),
      content: `<p>${game.i18n.localize("FATHERFOG.ImportGearAlready")}</p>`
    });
    if (!redo) return;
  }

  try {
    const paths = [
      "systems/fatherfog/packs/official-gear.json",
      "systems/fatherfog/packs/rucksack-gear.json"
    ];
    let itemsData = [];
    for (const path of paths) {
      try {
        const response = await fetch(path);
        if (response.ok) {
          const chunk = await response.json();
          if (Array.isArray(chunk)) itemsData = itemsData.concat(chunk);
        }
      } catch (e) {
        console.warn("Fatherfog | Could not load", path, e);
      }
    }
    if (!itemsData.length) throw new Error("No gear data loaded");

    // Deduplicate by name (prefer first occurrence)
    const seen = new Set();
    itemsData = itemsData.filter(d => {
      if (seen.has(d.name)) return false;
      seen.add(d.name);
      return true;
    });

    const folderName = "Equip oficial Fatherfog";
    let folder = game.folders.find(f => f.name === folderName && f.type === "Item");
    if (!folder) {
      folder = await Folder.create({
        name: folderName,
        type: "Item",
        color: "#3a2a1a"
      });
    }

    const existingNames = new Set(
      game.items.filter(i => i.folder?.id === folder.id).map(i => i.name)
    );

    const toCreate = itemsData
      .filter(d => !existingNames.has(d.name))
      .map(d => ({
        ...d,
        folder: folder.id
      }));

    if (toCreate.length === 0) {
      ui.notifications.info(game.i18n.localize("FATHERFOG.ImportGearNone"));
      return;
    }

    await Item.create(toCreate);
    await game.settings.set("fatherfog", "officialGearImported", true);

    ui.notifications.info(
      game.i18n.format("FATHERFOG.ImportGearDone", { count: toCreate.length })
    );
  } catch (err) {
    console.error("Fatherfog | Import Official Gear failed", err);
    ui.notifications.error(game.i18n.localize("FATHERFOG.ImportGearError"));
  }
}

/**
 * Import the 4 sample enemies from the rulebook as NPC actors.
 */
export async function importOfficialEnemies() {
  const already = game.settings.get("fatherfog", "officialEnemiesImported");
  if (already) {
    const redo = await Dialog.confirm({
      title: game.i18n.localize("FATHERFOG.ImportEnemies"),
      content: `<p>${game.i18n.localize("FATHERFOG.ImportEnemiesAlready")}</p>`
    });
    if (!redo) return;
  }

  try {
    const path = "systems/fatherfog/packs/official-enemies.json";
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Could not load ${path}`);
    const actorsData = await response.json();

    const folderName = "Enemics oficials Fatherfog";
    let folder = game.folders.find(f => f.name === folderName && f.type === "Actor");
    if (!folder) {
      folder = await Folder.create({
        name: folderName,
        type: "Actor",
        color: "#5a1a1a"
      });
    }

    const existingNames = new Set(
      game.actors.filter(a => a.folder?.id === folder.id).map(a => a.name)
    );

    const toCreate = actorsData
      .filter(d => !existingNames.has(d.name))
      .map(d => ({
        ...d,
        folder: folder.id
      }));

    if (toCreate.length === 0) {
      ui.notifications.info(game.i18n.localize("FATHERFOG.ImportEnemiesNone"));
      return;
    }

    await Actor.create(toCreate);
    await game.settings.set("fatherfog", "officialEnemiesImported", true);

    ui.notifications.info(
      game.i18n.format("FATHERFOG.ImportEnemiesDone", { count: toCreate.length })
    );
  } catch (err) {
    console.error("Fatherfog | Import Official Enemies failed", err);
    ui.notifications.error(game.i18n.localize("FATHERFOG.ImportEnemiesError"));
  }
}

/**
 * Settings menu Application – import official content without opening a PC sheet.
 */
class FatherfogImportMenu extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "fatherfog-import-menu",
      title: "Fatherfog – Official Imports",
      classes: ["fatherfog", "import-menu"],
      width: 420,
      height: "auto",
      closeOnSubmit: false,
      submitOnChange: false,
      template: null
    });
  }

  async _renderInner(_data) {
    const i18n = game.i18n;
    return $(`
      <form class="fatherfog-import-form" style="padding:0.75rem;">
        <p style="margin-bottom:0.75rem;opacity:0.9;">${i18n.localize("FATHERFOG.ImportMenuHint")}</p>
        <div style="display:flex;flex-direction:column;gap:0.6rem;">
          <button type="button" class="ff-import-gear" style="width:100%;">
            <i class="fas fa-shield-alt"></i> ${i18n.localize("FATHERFOG.ImportGear")}
          </button>
          <p style="font-size:0.85em;opacity:0.75;margin:0;">${i18n.localize("FATHERFOG.ImportGearHint")}</p>
          <button type="button" class="ff-import-enemies" style="width:100%;">
            <i class="fas fa-skull"></i> ${i18n.localize("FATHERFOG.ImportEnemies")}
          </button>
          <p style="font-size:0.85em;opacity:0.75;margin:0;">${i18n.localize("FATHERFOG.ImportEnemiesHint")}</p>
        </div>
      </form>
    `);
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".ff-import-gear").on("click", async (ev) => {
      ev.preventDefault();
      await importOfficialGear();
    });
    html.find(".ff-import-enemies").on("click", async (ev) => {
      ev.preventDefault();
      await importOfficialEnemies();
    });
  }

  async _updateObject() {}
}

/**
 * Inject import buttons into Items / Actors directory headers (GM only).
 */
function injectDirectoryImportButtons(app, html) {
  if (!game.user?.isGM) return;

  const root = html instanceof HTMLElement ? $(html) : html;
  if (!root?.find) return;
  if (root.find(".ff-dir-import").length) return;

  const tab = app.tabName || app.id || "";
  const isItems = tab === "items" || (typeof ItemDirectory !== "undefined" && app instanceof ItemDirectory);
  const isActors = tab === "actors" || (typeof ActorDirectory !== "undefined" && app instanceof ActorDirectory);

  let label, title, clickFn, icon;
  if (isItems) {
    label = game.i18n.localize("FATHERFOG.ImportGear");
    title = game.i18n.localize("FATHERFOG.ImportGearHint");
    clickFn = () => importOfficialGear();
    icon = "fa-shield-alt";
  } else if (isActors) {
    label = game.i18n.localize("FATHERFOG.ImportEnemies");
    title = game.i18n.localize("FATHERFOG.ImportEnemiesHint");
    clickFn = () => importOfficialEnemies();
    icon = "fa-skull";
  } else {
    return;
  }

  const btn = $(`
    <button type="button" class="ff-dir-import" title="${title}" style="margin-left:0.25rem;">
      <i class="fas ${icon}"></i> ${label}
    </button>
  `);
  btn.on("click", (ev) => {
    ev.preventDefault();
    clickFn();
  });

  const headerActions = root.find(".header-actions, .directory-header .header-actions, .directory-header");
  if (headerActions.length) {
    headerActions.first().append(btn);
  } else {
    root.prepend(btn);
  }
}

Hooks.once("ready", async () => {
  await loadOfficialSkills();
  await loadLegacyArtifacts();
  game.fatherfog = game.fatherfog || {};
  game.fatherfog.importOfficialGear = importOfficialGear;
  game.fatherfog.importOfficialEnemies = importOfficialEnemies;
  game.fatherfog.getOfficialSkills = getOfficialSkills;
  game.fatherfog.skillDisplayName = skillDisplayName;
  game.fatherfog.officialSkills = OFFICIAL_SKILLS;
  game.fatherfog.getOwnedSkillIds = getOwnedSkillIds;
  game.fatherfog.getSkillDef = getSkillDef;
  game.fatherfog.canTakeSkill = canTakeSkill;
  game.fatherfog.filterSkillsByPrereq = filterSkillsByPrereq;
  game.fatherfog.getLegacyArtifacts = getLegacyArtifacts;
  game.fatherfog.getLegacyArtifact = getLegacyArtifact;
  game.fatherfog.legacyArtifactDisplayName = legacyArtifactDisplayName;
  game.fatherfog.legacyArtifactDescription = legacyArtifactDescription;
  game.fatherfog.legacyArtifacts = LEGACY_ARTIFACTS;

  // Phase 1 + 2 mechanics API
  game.fatherfog.applyOddPresence = applyOddPresence;
  game.fatherfog.handleDeath = handleDeath;
  game.fatherfog.getNearbyPartyMembers = getNearbyPartyMembers;
  game.fatherfog.changeHope = changeHope;
  game.fatherfog.changeHealth = changeHealth;
  game.fatherfog.drinkWaterskin = drinkWaterskin;
  game.fatherfog.eatRation = eatRation;
  game.fatherfog.markPeril = markPeril;
  game.fatherfog.restDialog = restDialog;
  game.fatherfog.performRest = performRest;
  game.fatherfog.hasPerilDisadvantage = hasPerilDisadvantage;

  // Combat API (rules pp. 34–35, 45–46)
  game.fatherfog.applyDamageToActor = applyDamageToActor;
  game.fatherfog.applyDamageToEnemy = applyDamageToEnemy;
  game.fatherfog.resolveEnemyAttack = resolveEnemyAttack;
  game.fatherfog.endCombatRound = endCombatRound;
  game.fatherfog.beginCombatRound = beginCombatRound;
  game.fatherfog.getEnemyHearts = getEnemyHearts;
  game.fatherfog.getBitsFromRoll = getBitsFromRoll;

  // Character Creation Wizard
  registerChargen();
  game.fatherfog.FatherfogChargen = FatherfogChargen;
  game.fatherfog.FatherfogNpcChargen = FatherfogNpcChargen;
  console.log("Fatherfog | Character & NPC Creation Wizards registered");
});

Hooks.on("renderItemDirectory", injectDirectoryImportButtons);
Hooks.on("renderActorDirectory", injectDirectoryImportButtons);
Hooks.on("renderSidebarTab", (app, html) => {
  if (app.tabName === "items" || app.tabName === "actors") {
    injectDirectoryImportButtons(app, html);
  }
});
