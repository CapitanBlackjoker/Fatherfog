import { damageButtonsHtml, snapshotTargetActorIds } from "../combat.mjs";
import {
  applyClassTraits,
  handleDespair,
  applyOddPresence,
  getNearbyPartyMembers,
  drinkWaterskin,
  eatRation,
  markPeril,
  restDialog,
  hasPerilDisadvantage,
  rollPercentile
} from "../mechanics.mjs";

export class FatherfogCharacterSheet extends ActorSheet {


  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["fatherfog", "sheet", "actor", "character"],
      template: "systems/fatherfog/templates/actor/character-sheet.html",
      width: 900,
      height: 980,
      resizable: true,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "main" }]
    });
  }

  getData() {
    const context = super.getData();
    // Always bind live actor system (avoids stale form snapshots for Health)
    context.system = foundry.utils.deepClone(context.actor.system);
    // Ensure displayed health matches the document source after combat updates
    context.system.health = context.system.health || {};
    context.system.health.value = Number(this.actor.system?.health?.value) || 0;
    context.system.health.max = Number(this.actor.system?.health?.max) || Number(this.actor.system?.stats?.strength?.value) || 30;

    // Organize inventory by type for the template
    const items = context.actor.items;
    context.weapons = items.filter(i => i.type === "weapon").sort((a, b) => a.name.localeCompare(b.name));
    context.armors = items.filter(i => i.type === "armor").sort((a, b) => a.name.localeCompare(b.name));
    context.equipment = items.filter(i => i.type === "equipment").sort((a, b) => a.name.localeCompare(b.name));
    context.otherItems = items.filter(i => !["weapon", "armor", "equipment", "skill"].includes(i.type));

    // Convenience flags
    context.hasInventory = items.size > 0;
    context.isStranger = (context.actor.system.class?.value === "stranger");

    // Active survival perils (shown under the character name)
    const other = context.actor.system.conditions?.other || [];
    context.perils = {
      thirst: other.includes("thirst"),
      hunger: other.includes("hunger"),
      exhaustion: other.includes("exhaustion")
    };
    context.hasAnyPeril = context.perils.thirst || context.perils.hunger || context.perils.exhaustion;

    // Health status for visual feedback on the sheet
    // Low when ≤ 50%, critical when ≤ 25%, empty/dead when 0
    const hpVal = Number(context.system.health?.value) || 0;
    const hpMax = Number(context.system.health?.max) || 1;
    const hpPct = hpMax > 0 ? (hpVal / hpMax) : 0;
    context.healthStatus = {
      value: hpVal,
      max: hpMax,
      pct: hpPct,
      isEmpty: hpVal <= 0,
      isCritical: hpVal > 0 && hpPct <= 0.25,
      isLow: hpVal > 0 && hpPct <= 0.5 && hpPct > 0.25,
      isOk: hpPct > 0.5
    };
    // CSS class string applied to the health resource box
    if (context.healthStatus.isEmpty) context.healthClass = "health-empty";
    else if (context.healthStatus.isCritical) context.healthClass = "health-critical";
    else if (context.healthStatus.isLow) context.healthClass = "health-low";
    else context.healthClass = "health-ok";

    // Class / rucksack / legacy are locked on the sheet (set via Character Creator)
    const classValue = context.actor.system.class?.value || "worker";
    const classKeys = {
      worker: "FATHERFOG.Worker",
      philosopher: "FATHERFOG.Philosopher",
      stranger: "FATHERFOG.Stranger",
      hunter: "FATHERFOG.Hunter"
    };
    context.classLabel = game.i18n.localize(classKeys[classValue] || classValue);

    const allRucksacks = FatherfogCharacterSheet.RUCKSACKS[classValue] || {};
    const ruckKey = context.actor.system.rucksack || "";
    if (ruckKey && allRucksacks[ruckKey]) {
      context.rucksackLabel = game.i18n.localize(allRucksacks[ruckKey].label);
    } else if (ruckKey) {
      context.rucksackLabel = ruckKey;
    } else {
      context.rucksackLabel = "—";
    }

    // Keep for any residual template refs; not shown as menus anymore
    context.rucksackOptions = [];
    context.currentRucksack = ruckKey;
    context.legacyArtifacts = [];
    context.legacyNumber = context.actor.system.legacyArtifact?.number ?? "";

    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;

    // Existing rolls
    html.find(".roll-stat").click(this._onRollStat.bind(this));
    html.find(".roll-save").click(this._onRollSave.bind(this));
    html.find(".roll-hope").click(this._onRollHope.bind(this));
    // Health is NOT a named form field — update directly so combat damage cannot be overwritten
    html.find(".health-value-input").on("change", this._onHealthInput.bind(this));
    html.find(".add-skill").click(this._onAddSkill.bind(this));
    html.find('select[name="system.class.value"]').change(this._onClassChange.bind(this));
        html.find('select.legacy-select').change(this._onLegacyChange.bind(this));
    html.find('select[name="system.rucksack"]').change(this._onRucksackChange.bind(this));
    html.find(".grant-rucksack").click(this._onGrantRucksack.bind(this));

    // Inventory
    html.find(".item-equip").click(this._onToggleEquip.bind(this));
    html.find(".item-delete").click(this._onItemDelete.bind(this));
    html.find(".item-edit").click(this._onItemEdit.bind(this));
    html.find(".weapon-attack").click(this._onWeaponAttack.bind(this));
    html.find(".create-item").click(this._onCreateItem.bind(this));

    // Phase 1: Odd Presence (Stranger)
    html.find(".ff-odd-presence").click(this._onOddPresence.bind(this));

    // Phase 2: Rest / Drink / Eat / Perils
    html.find(".ff-rest").click(this._onRest.bind(this));
    html.find(".ff-drink").click(this._onDrink.bind(this));
    html.find(".ff-eat").click(this._onEat.bind(this));
    html.find(".ff-mark-thirst").click(() => markPeril(this.actor, "thirst"));
    html.find(".ff-mark-hunger").click(() => markPeril(this.actor, "hunger"));
    html.find(".ff-mark-exhaustion").click(() => markPeril(this.actor, "exhaustion"));
  }

  async _onRest(event) {
    event.preventDefault();
    await restDialog(this.actor);
  }

  async _onDrink(event) {
    event.preventDefault();
    await drinkWaterskin(this.actor);
  }

  async _onEat(event) {
    event.preventDefault();
    await eatRation(this.actor);
  }

  /* -------------------------------------------- */
  /*  CLASS TRAITS AUTO-FILL                      */
  /* -------------------------------------------- */



  async _onClassChange(event) {
    const classValue = event.currentTarget.value;
    const traitKeys = {
      worker: "FATHERFOG.TraitWorker",
      philosopher: "FATHERFOG.TraitPhilosopher",
      stranger: "FATHERFOG.TraitStranger",
      hunter: "FATHERFOG.TraitHunter"
    };
    const key = traitKeys[classValue];
    if (!key) return;

    // Class Stat / Save modifiers from the official character sheet (pg. 62)
    const CLASS_MODS = {
      worker: {
        stats: { strength: 10 },
        saves: { body: 5, mind: 5, spirit: 5 }
      },
      philosopher: {
        stats: { intellect: 10 },
        saves: { mind: 5 }
      },
      stranger: {
        stats: { intellect: 5, will: 5 },
        saves: { body: -10, mind: 10, spirit: -10 }
      },
      hunter: {
        stats: { will: 10 },
        saves: { body: 5, spirit: 10 }
      }
    };

    // Class starting skills (official sheet pg. 62)
    // fixed = always granted; choices = groups where player picks ONE skill
    const CLASS_SKILLS = {
      worker: {
        fixed: ["tinkering"],
        choices: [["alchemy", "boating"]],
        skillPoints: 10
      },
      philosopher: {
        fixed: ["literacy"],
        choices: [["basic_care", "alchemy", "perception"]],
        skillPoints: 7
      },
      stranger: {
        fixed: ["foglore", "fog_vision"],
        choices: [],
        skillPoints: 7
      },
      hunter: {
        fixed: [],
        choices: [["archery", "firearms"], ["hiding", "animals"]],
        skillPoints: 7
      }
    };

    const actor = this.actor;
    const sys = actor.system;
    const previouslyApplied = sys.class?.modsApplied || "";
    const updates = {
      "system.class.value": classValue,
      "system.class.trait": game.i18n.localize(key),
      "system.class.modsApplied": classValue
    };

    // Start from current values
    let strength = Number(sys.stats?.strength?.value) || 0;
    let intellect = Number(sys.stats?.intellect?.value) || 0;
    let will = Number(sys.stats?.will?.value) || 0;
    let body = Number(sys.saves?.body?.value) || 0;
    let mind = Number(sys.saves?.mind?.value) || 0;
    let spirit = Number(sys.saves?.spirit?.value) || 0;

    // Reverse previous class mods (if any were applied)
    if (previouslyApplied && CLASS_MODS[previouslyApplied]) {
      const old = CLASS_MODS[previouslyApplied];
      strength -= old.stats?.strength || 0;
      intellect -= old.stats?.intellect || 0;
      will -= old.stats?.will || 0;
      body -= old.saves?.body || 0;
      mind -= old.saves?.mind || 0;
      spirit -= old.saves?.spirit || 0;
    }

    // Apply new class mods
    const neu = CLASS_MODS[classValue] || { stats: {}, saves: {} };
    strength += neu.stats?.strength || 0;
    intellect += neu.stats?.intellect || 0;
    will += neu.stats?.will || 0;
    body += neu.saves?.body || 0;
    mind += neu.saves?.mind || 0;
    spirit += neu.saves?.spirit || 0;

    // Clamp to schema min 0
    const clamp = (n) => Math.max(0, Math.round(n));
    strength = clamp(strength);
    intellect = clamp(intellect);
    will = clamp(will);
    body = clamp(body);
    mind = clamp(mind);
    spirit = clamp(spirit);

    updates["system.stats.strength.value"] = strength;
    updates["system.stats.intellect.value"] = intellect;
    updates["system.stats.will.value"] = will;
    updates["system.saves.body.value"] = body;
    updates["system.saves.mind.value"] = mind;
    updates["system.saves.spirit.value"] = spirit;

    // Max Health always equals Strength (rules)
    updates["system.health.max"] = strength;
    const curHp = Number(sys.health?.value) || 0;
    if (curHp > strength) updates["system.health.value"] = strength;

    // --- Class starting skills ---
    // Foundry ObjectField often keeps deleted keys if we only pass a filtered object.
    // Strategy: (1) remove old class skills with -= keys, (2) grant new ones in a second update.

    const displayName = game.fatherfog?.skillDisplayName
      || ((s) => (game.i18n?.lang || "en").startsWith("ca") ? (s.name?.ca || s.name?.en || s.id) : (s.name?.en || s.id));
    const allCatalog = game.fatherfog?.getOfficialSkills?.() || [];

    // Pool of skillIds that must be removed = previous granted list + previous class pool + ALL class pools
    // (any starting-class skill is treated as class-owned when switching)
    const removePool = new Set(Array.isArray(sys.class?.grantedSkillIds) ? sys.class.grantedSkillIds : []);
    for (const def of Object.values(CLASS_SKILLS)) {
      for (const id of (def.fixed || [])) removePool.add(id);
      for (const group of (def.choices || [])) {
        for (const id of group) removePool.add(id);
      }
    }

    // Names (en/ca/lowercase) for skills in the pool — fallback if skillId is missing on old entries
    const removeNames = new Set();
    for (const id of removePool) {
      const sk = allCatalog.find((s) => s.id === id);
      if (!sk) continue;
      if (sk.name?.en) removeNames.add(String(sk.name.en).toLowerCase());
      if (sk.name?.ca) removeNames.add(String(sk.name.ca).toLowerCase());
      removeNames.add(id.toLowerCase());
    }

    // 1) Explicit key deletion (Foundry -= syntax) + rebuild clean bags
    const deletionUpdate = {};
    const cleanBags = { common: {}, expert: {}, master: {} };
    for (const tier of ["common", "expert", "master"]) {
      const bag = sys.skills?.[tier] ?? {};
      for (const [entryId, skill] of Object.entries(bag)) {
        const sid = skill?.skillId || "";
        const nm = String(skill?.name || "").toLowerCase();
        const isClassSkill =
          skill?.fromClass === true ||
          (sid && removePool.has(sid)) ||
          (nm && removeNames.has(nm));
        if (isClassSkill) {
          deletionUpdate[`system.skills.${tier}.-=${entryId}`] = null;
        } else {
          cleanBags[tier][entryId] = foundry.utils.deepClone(skill);
        }
      }
    }

    // Apply stat/save/class updates first (without skills)
    await actor.update(updates);

    // Apply deletions if any
    if (Object.keys(deletionUpdate).length) {
      await actor.update(deletionUpdate);
    }

    // Force-replace skill bags with cleaned versions (guarantees no leftover keys)
    await actor.update({
      "system.skills.common": cleanBags.common,
      "system.skills.expert": cleanBags.expert,
      "system.skills.master": cleanBags.master,
      "system.class.grantedSkillIds": []
    });

    // Build list of skills to grant for the new class
    const classSkillDef = CLASS_SKILLS[classValue] || { fixed: [], choices: [], skillPoints: 0 };
    const skillIdsToGrant = [...(classSkillDef.fixed || [])];

    // Ask player for each choice group
    for (const group of (classSkillDef.choices || [])) {
      if (!group?.length) continue;
      const options = group.map((id) => {
        const skill = allCatalog.find((s) => s.id === id);
        const label = skill ? displayName(skill) : id;
        return `<option value="${id}">${label}</option>`;
      }).join("");

      const picked = await new Promise((resolve) => {
        new Dialog({
          title: game.i18n.localize("FATHERFOG.PickClassSkill") || "Tria una habilitat de classe",
          content: `
            <p>${game.i18n.localize("FATHERFOG.PickClassSkillHint") || "Aquesta classe et permet triar una d'aquestes habilitats inicials:"}</p>
            <div class="form-group">
              <select id="ff-class-skill-pick" style="width:100%;">${options}</select>
            </div>
          `,
          buttons: {
            ok: {
              label: game.i18n.localize("FATHERFOG.AddSkill") || "Afegir",
              callback: (html) => resolve(html.find("#ff-class-skill-pick").val() || null)
            },
            cancel: {
              label: game.i18n.localize("FATHERFOG.RollCancel") || "Cancel·lar",
              callback: () => resolve(null)
            }
          },
          default: "ok",
          close: () => resolve(null)
        }).render(true);
      });

      if (picked) skillIdsToGrant.push(picked);
    }

    // 2) Grant new class skills onto a fresh copy of the cleaned bags
    const grantedIds = [];
    const fresh = {
      common: foundry.utils.deepClone(this.actor.system.skills?.common ?? {}),
      expert: foundry.utils.deepClone(this.actor.system.skills?.expert ?? {}),
      master: foundry.utils.deepClone(this.actor.system.skills?.master ?? {})
    };

    // Grant prerequisites before dependents (e.g. foglore before fog_vision)
    skillIdsToGrant.sort((a, b) => {
      const depth = (id) => {
        let d = 0;
        let cur = allCatalog.find(s => s.id === id);
        const seen = new Set();
        while (cur?.prereq && !seen.has(cur.prereq)) {
          seen.add(cur.prereq);
          d += 1;
          cur = allCatalog.find(s => s.id === cur.prereq);
        }
        return d;
      };
      return depth(a) - depth(b);
    });

    for (const skillId of skillIdsToGrant) {
      // skip if somehow still present
      let already = false;
      for (const tier of ["common", "expert", "master"]) {
        for (const s of Object.values(fresh[tier])) {
          if (s?.skillId === skillId) { already = true; break; }
        }
        if (already) break;
      }
      if (already) {
        grantedIds.push(skillId);
        continue;
      }
      const skill = allCatalog.find((s) => s.id === skillId);
      if (!skill) continue;
      const tier = skill.rank === "expert" ? "expert" : skill.rank === "master" ? "master" : "common";
      const entryId = foundry.utils.randomID(8);
      const primaryStat = (skill.stats && skill.stats[0]) || "";
      fresh[tier][entryId] = {
        name: displayName(skill),
        stat: primaryStat,
        owned: true,
        skillId: skill.id,
        fromClass: true
      };
      grantedIds.push(skill.id);
    }

    const finalUpdate = {
      "system.skills.common": fresh.common,
      "system.skills.expert": fresh.expert,
      "system.skills.master": fresh.master,
      "system.class.grantedSkillIds": grantedIds
    };
    if (typeof classSkillDef.skillPoints === "number") {
      finalUpdate["system.skillPoints"] = classSkillDef.skillPoints;
    }
    await actor.update(finalUpdate);

    // Clear rucksack choice when class changes so the player picks one of the new class options
    if (sys.rucksack) {
      await actor.update({ "system.rucksack": "" });
    }
    // Re-render so Odd Presence button shows/hides with class and rucksack options update
    this.render(false);
  }

  /* -------------------------------------------- */
  /*  RUCKSACK (starting inventory package)       */
  /* -------------------------------------------- */

  /**
   * Official rucksack packages from the manual (pg. 10–13).
   * Each entry is a list of item descriptors that will be created as real Items.
   * quantity can be a number or a dice formula string (e.g. "1d10", "3d10").
   */
  static get RUCKSACKS() {
    const exploration = [
      { name: "Destral de mà", type: "weapon", quantity: 1 },
      { name: "Corda (50 peus)", type: "equipment", quantity: 1 },
      { name: "Torxa", type: "equipment", quantity: "1d10" },
      { name: "Caixa de foc", type: "equipment", quantity: 1 },
      { name: "Ració", type: "equipment", quantity: "1d10" }
    ];

    return {
      worker: {
        excavation: {
          label: "FATHERFOG.RucksackExcavation",
          items: [
            { name: "Cinturó d'eines", type: "equipment", quantity: 1 },
            { name: "Palanca", type: "weapon", quantity: 1 },
            { name: "Martell", type: "weapon", quantity: 1 },
            { name: "Escala", type: "equipment", quantity: 1 },
            { name: "Claus", type: "equipment", quantity: "3d10" },
            { name: "Torxa", type: "equipment", quantity: 1 },
            { name: "Ració", type: "equipment", quantity: 1 }
          ]
        },
        exertion: {
          label: "FATHERFOG.RucksackExertion",
          items: [
            { name: "Barca de rem", type: "equipment", quantity: 1 },
            { name: "Martell gran", type: "weapon", quantity: 1 },
            { name: "Pot de cuques de llum", type: "equipment", quantity: 1 },
            { name: "Ració", type: "equipment", quantity: 1 }
          ]
        },
        exploration: {
          label: "FATHERFOG.RucksackExploration",
          items: exploration
        }
      },
      philosopher: {
        examination: {
          label: "FATHERFOG.RucksackExamination",
          items: [
            { name: "Ganivet quirúrgic", type: "weapon", quantity: 1 },
            { name: "Pergamí medicinal", type: "equipment", quantity: 1 },
            { name: "Tinta i ploma", type: "equipment", quantity: 1 },
            { name: "Kit de cures bàsiques", type: "equipment", quantity: "1d10" }
          ]
        },
        experimentation: {
          label: "FATHERFOG.RucksackExperimentation",
          items: [
            { name: "Pala bona", type: "equipment", quantity: 1 },
            { name: "Tom de coneixement", type: "equipment", quantity: 3 },
            { name: "Pot de mostres", type: "equipment", quantity: 3 },
            { name: "Lupa", type: "equipment", quantity: 1 },
            { name: "Espelma", type: "equipment", quantity: 1 }
          ]
        },
        exploration: {
          label: "FATHERFOG.RucksackExploration",
          items: exploration
        }
      },
      stranger: {
        extraction: {
          label: "FATHERFOG.RucksackExtraction",
          items: [
            { name: "Fuete", type: "weapon", quantity: 1 },
            { name: "Dagues de llançar", type: "weapon", quantity: "1d10" },
            { name: "Núvols de ferro", type: "weapon", quantity: 1 },
            { name: "Kit de ganzues", type: "equipment", quantity: 1 },
            { name: "Torxa", type: "equipment", quantity: 1 },
            { name: "Bufanda facial", type: "equipment", quantity: 1 },
            { name: "Ració", type: "equipment", quantity: 2 }
          ]
        },
        excommunication: {
          label: "FATHERFOG.RucksackExcommunication",
          items: [
            { name: "Bastó", type: "weapon", quantity: 1 },
            { name: "Llanterna (oli)", type: "equipment", quantity: 1 },
            { name: "Oli de llanterna", type: "equipment", quantity: 1 },
            { name: "Flascó", type: "equipment", quantity: "1d10" },
            { name: "Ració", type: "equipment", quantity: 10 }
          ]
        },
        exploration: {
          label: "FATHERFOG.RucksackExploration",
          items: exploration
        }
      },
      hunter: {
        extermination: {
          label: "FATHERFOG.RucksackExtermination",
          items: [
            { name: "Arc", type: "weapon", quantity: 1 },
            { name: "Carcaix", type: "equipment", quantity: 1 },
            { name: "Fletxes", type: "equipment", quantity: "2d10" },
            { name: "Armadura de cuir", type: "armor", quantity: 1 },
            { name: "Espasa curta", type: "weapon", quantity: 1 },
            { name: "Torxa", type: "equipment", quantity: 3 },
            { name: "Ració", type: "equipment", quantity: 2 }
          ]
        },
        exhibition: {
          label: "FATHERFOG.RucksackExhibition",
          items: [
            { name: "Rifle", type: "weapon", quantity: 1 },
            { name: "Bossa de munició", type: "equipment", quantity: 1 },
            { name: "Tir de pólvora", type: "equipment", quantity: "1d10" },
            { name: "Florett", type: "weapon", quantity: 1 },
            { name: "Caixa de foc", type: "equipment", quantity: 1 },
            { name: "Ració", type: "equipment", quantity: 1 }
          ]
        },
        exploration: {
          label: "FATHERFOG.RucksackExploration",
          items: exploration
        }
      }
    };
  }

  /** Resolve a quantity that may be a number or a dice formula (e.g. "3d10"). */
  static async _resolveQuantity(qty) {
    if (typeof qty === "number") return Math.max(1, qty);
    if (typeof qty === "string" && /^\d+d\d+$/i.test(qty.trim())) {
      const roll = await new Roll(qty.trim()).evaluate();
      return Math.max(1, roll.total);
    }
    return 1;
  }

  /**
   * Build the list of Item data objects for a given class + rucksack key.
   * Looks up templates from the world (imported gear) or from the system pack JSON.
   */
  async _buildRucksackItemData(classValue, rucksackKey) {
    const packs = FatherfogCharacterSheet.RUCKSACKS;
    const classPacks = packs[classValue];
    if (!classPacks || !classPacks[rucksackKey]) return [];

    const descriptors = classPacks[rucksackKey].items;
    // Prefer already-imported world items so we reuse the same template
    const worldItems = game.items?.contents || [];
    const byName = new Map();
    for (const it of worldItems) {
      if (!byName.has(it.name)) byName.set(it.name, it);
    }

    // Fallback templates from the system pack
    let packTemplates = [];
    try {
      const path = "systems/fatherfog/packs/rucksack-gear.json";
      const resp = await fetch(path);
      if (resp.ok) packTemplates = await resp.json();
    } catch (e) {
      console.warn("Fatherfog | Could not load rucksack-gear.json", e);
    }
    const packByName = new Map(packTemplates.map(t => [t.name, t]));

    const result = [];
    let rationsTotal = 0;
    for (const desc of descriptors) {
      const qty = await FatherfogCharacterSheet._resolveQuantity(desc.quantity);

      // Rations go to the character's ration counter, not as inventory items
      const isRation = (desc.name === "Ració" || desc.name === "Ration");
      if (isRation) {
        rationsTotal += qty;
        continue;
      }

      let template = byName.get(desc.name);
      let data;
      if (template) {
        data = template.toObject();
        delete data._id;
        delete data.folder;
        data.system = foundry.utils.deepClone(template.system);
      } else {
        const packT = packByName.get(desc.name);
        if (packT) {
          data = foundry.utils.deepClone(packT);
        } else {
          // Minimal fallback so something still appears
          data = {
            name: desc.name,
            type: desc.type || "equipment",
            img: "icons/svg/item-bag.svg",
            system: {
              description: "",
              quantity: 1,
              weight: 0,
              price: 0,
              availability: 80,
              equipped: false,
              special: ""
            }
          };
        }
      }
      data.system.quantity = qty;
      // For ammo-style items that use uses, mirror quantity
      if (data.system.uses !== undefined && data.system.maxUses !== undefined) {
        data.system.uses = qty;
        data.system.maxUses = qty;
      }
      result.push(data);
    }
    return { items: result, rations: rationsTotal };
  }

  async _onRucksackChange(event) {
    const key = event.currentTarget.value;
    await this.actor.update({ "system.rucksack": key });
    this.render(false);
  }

  async _onGrantRucksack(event) {
    event.preventDefault();
    const actor = this.actor;
    const classValue = actor.system.class?.value || "worker";
    const rucksackKey = actor.system.rucksack;
    if (!rucksackKey) {
      ui.notifications.warn(game.i18n.localize("FATHERFOG.RucksackPickFirst"));
      return;
    }

    const built = await this._buildRucksackItemData(classValue, rucksackKey);
    const itemsData = built.items || [];
    const rationsFromPack = Number(built.rations) || 0;

    if (!itemsData.length && rationsFromPack <= 0) {
      ui.notifications.warn(game.i18n.localize("FATHERFOG.RucksackEmpty"));
      return;
    }

    // Confirm if actor already has items
    if (actor.items.size > 0 && itemsData.length > 0) {
      const ok = await Dialog.confirm({
        title: game.i18n.localize("FATHERFOG.RucksackGrantTitle"),
        content: `<p>${game.i18n.localize("FATHERFOG.RucksackGrantConfirm")}</p>`,
        yes: () => true,
        no: () => false
      });
      if (!ok) return;
    }

    if (itemsData.length > 0) {
      await actor.createEmbeddedDocuments("Item", itemsData);
    }

    // Rations go straight to the ration counter (not as inventory items)
    const updates = {};
    if (rationsFromPack > 0) {
      const current = Number(actor.system.rations?.value) || 0;
      updates["system.rations.value"] = current + rationsFromPack;
    }
    // Ensure waterskin starts full (manual finishing step)
    if ((Number(actor.system.waterskin?.value) || 0) === 0) {
      updates["system.waterskin.value"] = 1;
      updates["system.waterskin.max"] = 1;
    }
    if (Object.keys(updates).length) await actor.update(updates);

    const msgParts = [];
    if (itemsData.length > 0) {
      msgParts.push(game.i18n.format("FATHERFOG.RucksackGranted", { count: itemsData.length }));
    }
    if (rationsFromPack > 0) {
      msgParts.push(game.i18n.format("FATHERFOG.RucksackRationsAdded", { count: rationsFromPack }));
    }
    ui.notifications.info(msgParts.join(" "));
    this.render(false);
  }


  async _onHealthInput(event) {
    const raw = Number(event.currentTarget.value);
    let value = Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
    const max = Number(this.actor.system?.health?.max) || Number(this.actor.system?.stats?.strength?.value) || 30;
    if (value > max) value = max;
    await this.actor.update({ "system.health.value": value });
    this.render(true);
  }

  async _onCloakChange(event) {
    const color = event.currentTarget.value;
    const meaningKeys = {
      black: "FATHERFOG.CloakMeaningBlack",
      red: "FATHERFOG.CloakMeaningRed",
      orange: "FATHERFOG.CloakMeaningOrange",
      yellow: "FATHERFOG.CloakMeaningYellow",
      green: "FATHERFOG.CloakMeaningGreen",
      blue: "FATHERFOG.CloakMeaningBlue",
      purple: "FATHERFOG.CloakMeaningPurple",
      grey: "FATHERFOG.CloakMeaningGrey",
      white: "FATHERFOG.CloakMeaningWhite",
      brown: "FATHERFOG.CloakMeaningBrown"
    };
    const key = meaningKeys[color];
    const meaning = key ? game.i18n.localize(key) : "";
    await this.actor.update({
      "system.cloak.color": color,
      "system.cloak.meaning": meaning
    });
  }

  async _onLegacyChange(event) {
    const raw = event.currentTarget.value;
    if (!raw) {
      await this.actor.update({
        "system.legacyArtifact.number": null,
        "system.legacyArtifact.name": "",
        "system.legacyArtifact.description": ""
      });
      return;
    }
    const id = Number(raw);
    const art = game.fatherfog?.getLegacyArtifact?.(id);
    if (!art) return;
    const name = game.fatherfog.legacyArtifactDisplayName(art);
    const desc = (game.fatherfog.legacyArtifactDescription
      ? game.fatherfog.legacyArtifactDescription(art)
      : (art.description?.en || ""));
    await this.actor.update({
      "system.legacyArtifact.number": id,
      "system.legacyArtifact.name": name,
      "system.legacyArtifact.description": desc
    });
  }


  /* -------------------------------------------- */
  /*  SKILLS                                      */
  /* -------------------------------------------- */

  async _onAddSkill(event) {
    event.preventDefault();
    const tier = event.currentTarget.dataset.tier; // common | expert | master

    const catalog = game.fatherfog?.getOfficialSkills?.(tier) || [];
    if (!catalog.length) {
      // Fallback: empty free-text skill if catalog not loaded
      const skills = foundry.utils.deepClone(this.actor.system.skills[tier] ?? {});
      const id = foundry.utils.randomID(8);
      skills[id] = { name: "", stat: "", owned: true, skillId: "" };
      await this.actor.update({ [`system.skills.${tier}`]: skills });
      return;
    }

    const filterFn = game.fatherfog?.filterSkillsByPrereq;
    const displayName = game.fatherfog?.skillDisplayName || (s => s?.name?.en || s?.id);
    const lang = (game.i18n?.lang || "en").startsWith("ca") ? "ca" : "en";

    let available = [];
    let locked = [];
    if (typeof filterFn === "function") {
      ({ available, locked } = filterFn(this.actor, catalog));
    } else {
      // Fallback without prereq API: only exclude already owned by skillId
      const ownedIds = game.fatherfog?.getOwnedSkillIds?.(this.actor) || new Set();
      available = catalog.filter(s => !ownedIds.has(s.id));
    }

    if (!available.length && !locked.length) {
      ui.notifications.info(game.i18n.localize("FATHERFOG.NoSkillsLeft"));
      return;
    }

    if (!available.length && locked.length) {
      const names = locked
        .slice(0, 5)
        .map(s => `${displayName(s)} ← ${s.missingPrereqName || s.missingPrereq}`)
        .join("; ");
      ui.notifications.warn(
        game.i18n.format("FATHERFOG.SkillsLockedByPrereq", { list: names })
      );
      return;
    }

    // Build select options (available first; locked shown disabled if any)
    const availableOpts = available
      .slice()
      .sort((a, b) => displayName(a).localeCompare(displayName(b), lang))
      .map(s => {
        const label = displayName(s);
        const stats = (s.stats || []).join("/");
        const desc = (s.description?.[lang] || s.description?.en || "").replace(/"/g, "&quot;");
        return `<option value="${s.id}" title="${desc}">${label} (${stats})</option>`;
      })
      .join("");

    const lockedOpts = locked
      .slice()
      .sort((a, b) => displayName(a).localeCompare(displayName(b), lang))
      .map(s => {
        const label = displayName(s);
        const need = s.missingPrereqName || s.missingPrereq || "?";
        return `<option value="" disabled>${label} — ${game.i18n.format("FATHERFOG.RequiresSkill", { skill: need })}</option>`;
      })
      .join("");

    const lockedBlock = lockedOpts
      ? `<optgroup label="${game.i18n.localize("FATHERFOG.SkillsLockedGroup")}">${lockedOpts}</optgroup>`
      : "";

    const spCost = 5;
    const currentSP = Number(this.actor.system.skillPoints) || 0;
    const spendHint = game.i18n.format("FATHERFOG.SkillPointCostHint", {
      cost: spCost,
      current: currentSP
    });

    const picked = await new Promise((resolve) => {
      new Dialog({
        title: game.i18n.localize("FATHERFOG.PickSkill"),
        content: `
          <p>${game.i18n.localize("FATHERFOG.PickSkillHint")}</p>
          <p style="font-size:0.85em;opacity:0.85;">${spendHint}</p>
          <div class="form-group">
            <select id="ff-skill-pick" style="width:100%;">
              ${availableOpts}
              ${lockedBlock}
            </select>
          </div>
          <p style="font-size:0.85em;opacity:0.8;margin-top:0.4rem;" id="ff-skill-desc"></p>
        `,
        buttons: {
          ok: {
            label: game.i18n.localize("FATHERFOG.AddSkill"),
            callback: (html) => {
              const id = html.find("#ff-skill-pick").val();
              resolve(id || null);
            }
          },
          custom: {
            label: game.i18n.localize("FATHERFOG.CustomSkill"),
            callback: () => resolve("__custom__")
          },
          cancel: {
            label: game.i18n.localize("FATHERFOG.RollCancel"),
            callback: () => resolve(null)
          }
        },
        default: "ok",
        render: (html) => {
          const sel = html.find("#ff-skill-pick");
          const descEl = html.find("#ff-skill-desc");
          const updateDesc = () => {
            const id = sel.val();
            const skill = available.find(s => s.id === id);
            if (!skill) { descEl.text(""); return; }
            let text = skill.description?.[lang] || skill.description?.en || "";
            if (skill.prereq) {
              const pred = game.fatherfog?.getSkillDef?.(skill.prereq);
              const pname = pred ? displayName(pred) : skill.prereq;
              text += ` (${game.i18n.format("FATHERFOG.RequiresSkill", { skill: pname })})`;
            }
            descEl.text(text);
          };
          sel.on("change", updateDesc);
          updateDesc();
        },
        close: () => resolve(null)
      }).render(true);
    });

    if (!picked) return;

    const skills = foundry.utils.deepClone(this.actor.system.skills[tier] ?? {});
    const entryId = foundry.utils.randomID(8);
    const updates = {};

    if (picked === "__custom__") {
      skills[entryId] = { name: "", stat: "", owned: true, skillId: "" };
      updates[`system.skills.${tier}`] = skills;
    } else {
      // Re-validate prerequisite at commit time
      const check = game.fatherfog?.canTakeSkill?.(this.actor, picked);
      if (check && !check.ok) {
        ui.notifications.error(
          game.i18n.format("FATHERFOG.SkillPrereqMissing", {
            skill: picked,
            prereq: check.prereqName || check.prereq
          })
        );
        return;
      }
      const skill = catalog.find(s => s.id === picked) || available.find(s => s.id === picked);
      if (!skill) return;
      const primaryStat = (skill.stats && skill.stats[0]) || "";
      skills[entryId] = {
        name: displayName(skill),
        stat: primaryStat,
        owned: true,
        skillId: skill.id
      };
      updates[`system.skills.${tier}`] = skills;

      // Spend 5 Skill Points when buying from the sheet (manual rule)
      if (currentSP >= spCost) {
        updates["system.skillPoints"] = currentSP - spCost;
      } else {
        // Allow add but warn — GM may grant free skills
        ui.notifications.warn(
          game.i18n.format("FATHERFOG.SkillPointsInsufficient", {
            cost: spCost,
            current: currentSP
          })
        );
      }
    }

    await this.actor.update(updates);
  }


  /* -------------------------------------------- */
  /*  INVENTORY                                   */
  /* -------------------------------------------- */

  async _onToggleEquip(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item")?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;

    const newState = !item.system.equipped;
    await item.update({ "system.equipped": newState });

    // Force sheet re-render so defense updates
    this.render(false);
  }

  async _onItemDelete(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item")?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;

    const confirmed = await Dialog.confirm({
      title: game.i18n.localize("FATHERFOG.DeleteItem"),
      content: `<p>${game.i18n.localize("FATHERFOG.DeleteItemConfirm")} <strong>${item.name}</strong>?</p>`
    });
    if (confirmed) {
      await item.delete();
      this.render(false);
    }
  }

  _onItemEdit(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item")?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (item) item.sheet.render(true);
  }

  async _onCreateItem(event) {
    event.preventDefault();
    const type = event.currentTarget.dataset.type || "equipment";
    const name = game.i18n.localize(`FATHERFOG.New${type.charAt(0).toUpperCase() + type.slice(1)}`) || "New Item";

    const itemData = {
      name,
      type,
      system: {}
    };

    // Sensible defaults per type
    if (type === "weapon") {
      itemData.system = {
        damageType: "wil",
        weaponType: "melee",
        hands: 1,
        equipped: false
      };
    } else if (type === "armor") {
      itemData.system = {
        defense: 1,
        equipped: false
      };
    }

    await this.actor.createEmbeddedDocuments("Item", [itemData]);
    this.render(false);
  }

  /* -------------------------------------------- */
  /*  WEAPON ATTACK                               */
  /* -------------------------------------------- */

  async _onWeaponAttack(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item")?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item || item.type !== "weapon") return;

    const actor = this.actor;
    const will = actor.system.stats.will?.value ?? 30;
    const weapon = item.system;

    // Combat skills relevant to this weapon
    const combatSkills = this._getCombatSkillsForWeapon(weapon);
    const skillChoice = await this._askSkillBonus(combatSkills);

    let target = will;
    let skillName = null;
    let skillBonus = 0;
    if (skillChoice) {
      skillBonus = skillChoice.bonus;
      skillName = skillChoice.name;
      target = will + skillBonus;
    }

    // Determine roll mode (advantage from master-crafted, etc.)
    let forcedMode = null;
    if (weapon.advantageOnCombat) forcedMode = "advantage";
    if (weapon.disadvantageOnCombat) forcedMode = "disadvantage";

    let label = `${item.name} (${game.i18n.localize("FATHERFOG.WillCheck")})`;
    if (skillName) label += ` + ${skillName} (+${skillBonus})`;

    const mode = forcedMode || await this._askRollMode(label);
    if (mode === null) return;

    // Percentile dice (tens + units). Advantage/Disadvantage → 4 d10 with automatic colors:
    // green pair (advantage) or red pair (disadvantage) + player-default pair.
    const { roll: finalRoll, totals, finalTotal: total } = await rollPercentile(mode);
    const isCritical = this._isCritical(total);
    let success = total < target;
    if (total === 100) success = true;
    if (total === 99) success = false;
    const bits = this._getBits(total);

    // Rules p.35: damage = successful Will Check roll (± weapon modifier).
    // Fail → 0 damage (default: lose 1 Hope). Unarmed ("bit") = only Bits on success.
    let damage = 0;
    if (success) {
      damage = item.system.getAttackDamage
        ? item.system.getAttackDamage(total, bits)
        : Math.max(0, total + (Number(weapon.damageBonus) || 0));
    }

    // Build chat content
    const i18n = game.i18n;
    let content = `<div class="fatherfog-roll">`;
    content += `<h3>${item.name}</h3>`;
    content += `<div class="roll-result">${total} vs ${target} → <strong>${success ? i18n.localize("FATHERFOG.Success") : i18n.localize("FATHERFOG.Failure")}</strong></div>`;

    if (skillName && skillBonus) {
      content += `<div class="skill-bonus">${i18n.localize("FATHERFOG.SkillApplied")}: ${skillName} (+${skillBonus})</div>`;
    }
    if (mode === "advantage" || mode === "disadvantage") {
      const t0 = totals[0];
      const t1 = totals[1];
      const used = total;
      if (mode === "advantage") {
        content += `<div class="roll-mode"><strong>${i18n.localize("FATHERFOG.RollAdvantage")}</strong>: ${t0} / ${t1} → <strong>${used}</strong> <em>(${i18n.localize("FATHERFOG.AdvUsedLower") || "s'usa el més baix"})</em></div>`;
      } else {
        content += `<div class="roll-mode"><strong>${i18n.localize("FATHERFOG.RollDisadvantage")}</strong>: ${t0} / ${t1} → <strong>${used}</strong> <em>(${i18n.localize("FATHERFOG.DisUsedHigher") || "s'usa el més alt"})</em></div>`;
      }
    }
    if (isCritical) {
      content += `<div class="critical">${success ? i18n.localize("FATHERFOG.CriticalSuccess") : i18n.localize("FATHERFOG.CriticalFailure")}</div>`;
    }
    content += `<div class="bits">${i18n.localize("FATHERFOG.Bits")}: ${bits}</div>`;

    if (success) {
      // Show how damage was derived from the roll
      const formulaHint = this._damageFormulaHint(weapon.damageType, total, bits, damage);
      content += `<div class="damage"><strong>${i18n.localize("FATHERFOG.Damage")}:</strong> ${damage}`;
      if (formulaHint) content += ` <em>(${formulaHint})</em>`;
      if (weapon.ignoresArmor) {
        content += ` <em>(${i18n.localize("FATHERFOG.IgnoresArmor")})</em>`;
      }
      content += `</div>`;
      if (isCritical) {
        content += `<div class="effect critical">${i18n.localize("FATHERFOG.CritSuccessAttack")}</div>`;
      }
      if (weapon.special) {
        content += `<div class="special">${weapon.special}</div>`;
      }
      if (weapon.reload > 0) {
        content += `<div class="reload">${i18n.localize("FATHERFOG.Reload")}: ${weapon.reload} ${i18n.localize("FATHERFOG.Rounds")}</div>`;
      }
      // Apply full damage only (no "glance" — player attacks don't use Bits-as-extra)
      // Critical Success may outright kill (rules p.35 / p.46)
      content += damageButtonsHtml({
        full: damage,
        glance: null,
        ignoresArmor: !!weapon.ignoresArmor,
        critical: isCritical
      });
    } else {
      content += `<div class="effect">${i18n.localize("FATHERFOG.Miss")}</div>`;
      content += `<div class="effect extra">${i18n.localize("FATHERFOG.LoseHope")}</div>`;
    }
    if (isCritical && !success) {
      content += `<div class="effect warning">${i18n.localize("FATHERFOG.CritFailHope")}</div>`;
    }

    content += `</div>`;

    await finalRoll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      content,
      flags: {
        fatherfog: {
          damage: { full: damage, glance: null, ignoresArmor: !!weapon.ignoresArmor, critical: isCritical && success },
          targetActorIds: snapshotTargetActorIds(actor.id)
        }
      }
    });


    if (!success) {
      const currentHope = actor.system.hope.value ?? 0;
      await actor.update({ "system.hope.value": Math.max(0, currentHope - 1) });
    }

    // Class Traits (crit effects, Hunter Will, etc.)
    await applyClassTraits(actor, {
      success,
      isCritical,
      type: "attack",
      stat: "will"
    });

    // Critical Failure on attack forces a Hope Save reminder (already in chat)
    // Despair flow is triggered when the player actually rolls the Hope Save.
  }


  /* -------------------------------------------- */
  /*  GENERIC ROLL HANDLERS                       */
  /* -------------------------------------------- */

  async _onRollStat(event) {
    event.preventDefault();
    const stat = event.currentTarget.dataset.stat;
    const labels = {
      strength: "FATHERFOG.StrengthCheck",
      intellect: "FATHERFOG.IntellectCheck",
      will: "FATHERFOG.WillCheck"
    };
    const statLetter = { strength: "S", intellect: "I", will: "W" }[stat];
    const statValue = this.actor.system.stats[stat]?.value ?? 0;

    // Skills linked to this stat
    const matching = this._getOwnedSkills().filter(s => s.stat === statLetter);
    const skillChoice = await this._askSkillBonus(matching);

    let target = statValue;
    let label = game.i18n.localize(labels[stat] || stat);
    let skillName = null;
    let skillBonus = 0;

    if (skillChoice) {
      skillBonus = skillChoice.bonus;
      skillName = skillChoice.name;
      target = statValue + skillBonus;
      label = `${label} + ${skillName} (+${skillBonus})`;
    }

    await this._rollCheck({
      label,
      target,
      type: "stat",
      stat,
      skillName,
      skillBonus
    });
  }


  async _onRollSave(event) {
    event.preventDefault();
    const save = event.currentTarget.dataset.save;
    const labels = {
      body: "FATHERFOG.BodySave",
      mind: "FATHERFOG.MindSave",
      spirit: "FATHERFOG.SpiritSave"
    };
    const saveValue = this.actor.system.saves[save]?.value ?? 0;
    await this._rollCheck({
      label: game.i18n.localize(labels[save] || save),
      target: saveValue,
      type: "save"
    });
  }

  async _onRollHope(event) {
    event.preventDefault();
    const hopeValue = this.actor.system.hope?.value ?? 0;
    await this._rollCheck({
      label: game.i18n.localize("FATHERFOG.HopeSave"),
      target: hopeValue,
      type: "hope"
    });
  }

  async _rollCheck({ label, target, type, stat = null, skillName = null, skillBonus = 0 }) {
    const actor = this.actor;
    const mode = await this._askRollMode(label);
    if (mode === null) return;

    // Percentile dice: 2 d10 normal, 4 d10 for adv/dis.
    // Advantage → first pair green; Disadvantage → first pair red; other pair = player default.
    const { roll: finalRoll, totals, finalTotal: total } = await rollPercentile(mode);
    // p.27: success only if roll is *less than* target; 100 always succeeds, 99 always fails
    const isCritical = this._isCritical(total);
    let success = total < target;
    if (total === 100) success = true;
    if (total === 99) success = false;
    const bits = this._getBits(total);

    const i18n = game.i18n;
    let content = `<div class="fatherfog-roll">`;
    content += `<h3>${label}</h3>`;
    content += `<div class="roll-result">${total} vs ${target} → <strong>${success ? i18n.localize("FATHERFOG.Success") : i18n.localize("FATHERFOG.Failure")}</strong></div>`;

    if (skillName && skillBonus) {
      content += `<div class="skill-bonus">${i18n.localize("FATHERFOG.SkillApplied")}: ${skillName} (+${skillBonus})</div>`;
    }
    if (mode === "advantage" || mode === "disadvantage") {
      const t0 = totals[0];
      const t1 = totals[1];
      const used = total;
      if (mode === "advantage") {
        content += `<div class="roll-mode"><strong>${i18n.localize("FATHERFOG.RollAdvantage")}</strong>: ${t0} / ${t1} → <strong>${used}</strong> <em>(${i18n.localize("FATHERFOG.AdvUsedLower") || "s'usa el més baix"})</em></div>`;
      } else {
        content += `<div class="roll-mode"><strong>${i18n.localize("FATHERFOG.RollDisadvantage")}</strong>: ${t0} / ${t1} → <strong>${used}</strong> <em>(${i18n.localize("FATHERFOG.DisUsedHigher") || "s'usa el més alt"})</em></div>`;
      }
    }
    if (isCritical) {
      content += `<div class="critical">${success ? i18n.localize("FATHERFOG.CriticalSuccess") : i18n.localize("FATHERFOG.CriticalFailure")}</div>`;
    }
    content += `<div class="bits">${i18n.localize("FATHERFOG.Bits")}: ${bits}</div>`;

    if (!success && type !== "hope") {
      content += `<div class="effect">${i18n.localize("FATHERFOG.LoseHope")}</div>`;
    }
    if (type === "hope" && !success) {
      content += `<div class="effect warning">${i18n.localize("FATHERFOG.Despair")} ${total} ${i18n.localize("FATHERFOG.HopePoints")}</div>`;
    }
    if (isCritical && !success && type !== "hope") {
      content += `<div class="effect warning">${i18n.localize("FATHERFOG.CritFailHope")}</div>`;
    }
    content += `</div>`;

    await finalRoll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: content
    });

    // Default Hope loss on failed Stat/Save (not Hope Save)
    if (!success && type !== "hope") {
      const currentHope = actor.system.hope.value ?? 0;
      await actor.update({ "system.hope.value": Math.max(0, currentHope - 1) });
    }

    // Hope Save failure → Despair (regain Hope = roll total, mark Despair, Hunter cascade)
    if (type === "hope" && !success) {
      await handleDespair(actor, total);
    }

    // Class Traits
    await applyClassTraits(actor, {
      success,
      isCritical,
      type,
      stat
    });
  }

  /**
   * Stranger – Odd Presence: apply −2 Hope to a targeted / selected non-Stranger.
   */
  async _onOddPresence(event) {
    event.preventDefault();
    const actor = this.actor;
    if (actor.system?.class?.value !== "stranger") {
      ui.notifications.warn(game.i18n.localize("FATHERFOG.OddPresenceNotStranger"));
      return;
    }

    // Prefer targeted tokens, then controlled tokens that are not self
    let targets = Array.from(game.user.targets ?? [])
      .map(t => t.actor)
      .filter(a => a && a.id !== actor.id && a.type === "character");

    if (!targets.length) {
      targets = (canvas?.tokens?.controlled ?? [])
        .map(t => t.actor)
        .filter(a => a && a.id !== actor.id && a.type === "character");
    }

    if (!targets.length) {
      // Fallback: ask which nearby PC
      const nearby = getNearbyPartyMembers(actor);
      if (!nearby.length) {
        ui.notifications.warn(game.i18n.localize("FATHERFOG.NoDamageTarget"));
        return;
      }
      // Apply to all nearby non-Strangers
      for (const other of nearby) {
        await applyOddPresence(actor, other);
      }
      return;
    }

    for (const other of targets) {
      await applyOddPresence(actor, other);
    }
  }


  /**
   * Criticals (p.27): doubles on d100; 100 always Critical Success; 99 always Critical Failure.
   * 00 (0) counts as doubles.
   */
  _isCritical(total) {
    const t = Number(total) || 0;
    if (t === 100 || t === 99 || t === 0) return true;
    const str = t.toString().padStart(2, "0").slice(-2);
    return str[0] === str[1];
  }

  /**
   * Short formula string for chat (e.g. "31 + 10").
   */
  _damageFormulaHint(damageType, rollTotal, bits, damage) {
    switch (damageType) {
      case "wil":
        return `${rollTotal}`;
      case "wil+10":
        return `${rollTotal} + 10`;
      case "wil+20":
        return `${rollTotal} + 20`;
      case "wil-10":
        return `${rollTotal} − 10`;
      case "wilx10":
        return `${rollTotal} × 10`;
      case "bit":
        return `${game.i18n.localize("FATHERFOG.Bits")}: ${bits}`;
      case "none":
        return "—";
      default:
        return `${rollTotal}`;
    }
  }

  /**
   * Bits = one's digit of the d100 (p.26). Example: 94 → 4, 20 → 0, 00 → 0.
   * Not 10 on multiples of ten.
   */
  _getBits(total) {
    const t = Number(total) || 0;
    if (t === 100) return 0;
    return t % 10;
  }

  async _askRollMode(label) {
    const i18n = game.i18n;
    const peril = hasPerilDisadvantage(this.actor);
    const perilNote = peril
      ? `<p class="warning" style="color:#a33;font-size:0.9em;"><strong>${i18n.localize("FATHERFOG.PerilDisadvantage")}</strong></p>`
      : "";
    return new Promise((resolve) => {
      new Dialog({
        title: `${i18n.localize("FATHERFOG.Roll")} ${label}`,
        content: `<p>${i18n.localize("FATHERFOG.HowToRoll")}</p>
                  <p style="font-size:0.9em;opacity:0.8;">${i18n.localize("FATHERFOG.AdvantageHelp")}</p>
                  ${perilNote}`,
        buttons: {
          normal: {
            label: i18n.localize("FATHERFOG.RollNormal"),
            callback: () => resolve("normal")
          },
          advantage: {
            label: i18n.localize("FATHERFOG.RollAdvantage"),
            callback: () => resolve("advantage")
          },
          disadvantage: {
            label: i18n.localize("FATHERFOG.RollDisadvantage"),
            callback: () => resolve("disadvantage")
          },
          cancel: {
            label: i18n.localize("FATHERFOG.RollCancel"),
            callback: () => resolve(null)
          }
        },
        default: peril ? "disadvantage" : "normal",
        close: () => resolve(null)
      }).render(true);
    });
  }

  /* -------------------------------------------- */
  /*  SKILLS – mechanical helpers                 */
  /* -------------------------------------------- */

  /**
   * Return all owned skills with their tier bonus.
   * @returns {Array<{name:string, tier:string, bonus:number, stat:string}>}
   */
  _getOwnedSkills() {
    const tiers = {
      common: 10,
      expert: 15,
      master: 20
    };
    const result = [];
    for (const [tier, bonus] of Object.entries(tiers)) {
      const bag = this.actor.system.skills?.[tier] ?? {};
      for (const skill of Object.values(bag)) {
        if (!skill?.owned) continue;
        const name = (skill.name || "").trim();
        if (!name) continue;
        result.push({
          name,
          tier,
          bonus,
          stat: (skill.stat || "").toUpperCase(), // S / I / W
          skillId: skill.skillId || ""
        });
      }
    }
    return result;
  }


  /**
   * Skills that can apply to a given weapon (by type / keywords).
   */
  _getCombatSkillsForWeapon(weapon) {
    const all = this._getOwnedSkills();
    const type = (weapon.weaponType || "melee").toLowerCase();
    const nameHints = (weapon.special || "").toLowerCase();

    // Keyword groups (Catalan + English)
    const groups = {
      melee: [
        "fighting", "combat", "lluita", "combat cos", "weapon specialty", "weapon mastery",
        "especialitat d'arma", "especialitat d’arma", "mestratge d'arma", "mestratge d’arma",
        "unarmed", "desarmat", "melee", "espasa", "sword", "axe", "destral", "hammer", "martell"
      ],
      ranged: [
        "archery", "arc", "bow", "crossbow", "ballesta", "sling", "fona",
        "tir amb arc", "tir", "ranged"
      ],
      firearm: [
        "firearms", "firearm", "armes de foc", "rifle", "revolver", "revòlver",
        "gun", "blunderbuss", "trabuc"
      ],
      thrown: [
        "throwing", "llançar", "llançament", "thrown", "daga", "star", "bomb", "bomba",
        "net", "xarxa", "whip", "fuete"
      ]
    };

    // Also match by official skill id when present
    const idGroups = {
      melee: ["fighting", "unarmed_combat", "weapon_specialty", "weapon_mastery"],
      ranged: ["archery"],
      firearm: ["firearms"],
      thrown: ["throwing"]
    };


    const matchGroup = (nameKeys, idKeys = []) => {
      return all.filter(s => {
        if (s.skillId && idKeys.includes(s.skillId)) return true;
        const n = s.name.toLowerCase();
        return nameKeys.some(k => n.includes(k));
      });
    };

    let relevant = [];

    if (type === "melee") {
      relevant = matchGroup(groups.melee, idGroups.melee);
    } else if (type === "ranged") {
      // Distinguish firearms vs bows by ignoresArmor or name-ish special
      const isFirearm = weapon.ignoresArmor || /rifle|revolver|revòlver|blunderbuss|trabuc|firearm/i.test(nameHints + (weapon.skillBonus || ""));
      relevant = isFirearm
        ? matchGroup(groups.firearm, idGroups.firearm).concat(matchGroup(groups.ranged, idGroups.ranged))
        : matchGroup(groups.ranged, idGroups.ranged);
    } else if (type === "thrown") {
      relevant = matchGroup(groups.thrown, idGroups.thrown).concat(matchGroup(groups.ranged, idGroups.ranged));
    }


    // Always allow any Will-linked combat-ish skill as fallback if nothing matched
    if (relevant.length === 0) {
      relevant = all.filter(s => s.stat === "W");
    }

    // Deduplicate by name, keep highest bonus
    const byName = new Map();
    for (const s of relevant) {
      const prev = byName.get(s.name);
      if (!prev || s.bonus > prev.bonus) byName.set(s.name, s);
    }
    return Array.from(byName.values());
  }

  /**
   * Dialog: pick a skill bonus or none.
   * @param {Array} skills
   * @returns {Promise<null|{name,bonus,tier,stat}>}
   */
  async _askSkillBonus(skills) {
    if (!skills || skills.length === 0) return null;

    const i18n = game.i18n;
    // Single skill → quick confirm
    if (skills.length === 1) {
      const s = skills[0];
      const use = await Dialog.confirm({
        title: i18n.localize("FATHERFOG.UseSkill"),
        content: `<p>${i18n.format("FATHERFOG.UseSkillConfirm", { name: s.name, bonus: s.bonus })}</p>`
      });
      return use ? s : null;
    }

    // Multiple skills → choose
    return new Promise((resolve) => {
      const buttons = {
        none: {
          label: i18n.localize("FATHERFOG.NoSkill"),
          callback: () => resolve(null)
        }
      };
      for (const s of skills) {
        const id = foundry.utils.randomID(6);
        buttons[id] = {
          label: `${s.name} (+${s.bonus})`,
          callback: () => resolve(s)
        };
      }
      new Dialog({
        title: i18n.localize("FATHERFOG.UseSkill"),
        content: `<p>${i18n.localize("FATHERFOG.ChooseSkill")}</p>`,
        buttons,
        default: "none",
        close: () => resolve(null)
      }).render(true);
    });
  }
}

