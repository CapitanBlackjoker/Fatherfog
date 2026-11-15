import { damageButtonsHtml } from "../combat.mjs";

/**
 * NPC sheet — the Guide does not roll dice.
 * Attacks resolve from the player's roll (Bits); Enemies Never Miss.
 */
export class FatherfogNpcSheet extends ActorSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["fatherfog", "sheet", "actor", "npc"],
      template: "systems/fatherfog/templates/actor/npc-sheet.html",
      width: 720,
      height: 820,
      resizable: true
    });
  }

  getData() {
    const context = super.getData();
    context.system = foundry.utils.deepClone(context.actor.system);
    context.system.health = context.system.health || {};
    context.system.health.value = Number(this.actor.system?.health?.value) || 0;
    context.system.health.max = Number(this.actor.system?.health?.max) || 1;

    const attacks = context.actor.system.attacks ?? {};
    context.attacksList = Object.entries(attacks).map(([id, a]) => ({ id, ...a }));

    const abilities = context.actor.system.abilities ?? {};
    context.abilitiesList = Object.entries(abilities).map(([id, a]) => ({ id, ...a }));

    const items = context.actor.items;
    context.weapons = items.filter(i => i.type === "weapon").sort((a, b) => a.name.localeCompare(b.name));
    context.armors = items.filter(i => i.type === "armor").sort((a, b) => a.name.localeCompare(b.name));
    context.equipment = items.filter(i => !["weapon", "armor"].includes(i.type));
    context.hasInventory = items.size > 0;

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
    if (context.healthStatus.isEmpty) context.healthClass = "health-empty";
    else if (context.healthStatus.isCritical) context.healthClass = "health-critical";
    else if (context.healthStatus.isLow) context.healthClass = "health-low";
    else context.healthClass = "health-ok";

    const maxH = Number(context.system.hearts) || 1;
    const curH = context.system.heartsCurrent;
    context.heartsCurrent = (curH === undefined || curH === null) ? maxH : Number(curH);
    context.heartsIcons = "♥".repeat(Math.max(0, context.heartsCurrent))
      + "♡".repeat(Math.max(0, maxH - context.heartsCurrent));

    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;

    html.find(".npc-attack").click(this._onNpcAttack.bind(this));
    html.find(".add-attack").click(this._onAddAttack.bind(this));
    html.find(".delete-attack").click(this._onDeleteAttack.bind(this));
    html.find(".add-ability").click(this._onAddAbility.bind(this));
    html.find(".delete-ability").click(this._onDeleteAbility.bind(this));
    html.find(".item-equip").click(this._onToggleEquip.bind(this));
    html.find(".item-delete").click(this._onItemDelete.bind(this));
    html.find(".item-edit").click(this._onItemEdit.bind(this));
    html.find(".create-item").click(this._onCreateItem.bind(this));
    html.find(".ff-reset-hearts").click(this._onResetHearts.bind(this));
    html.find(".weapon-attack").click(this._onWeaponAttack.bind(this));
    html.find(".npc-health-value-input").on("change", this._onHealthInput.bind(this));
    html.find(".npc-hearts-value-input").on("change", this._onHeartsInput.bind(this));
  }

  async _onHealthInput(event) {
    const raw = Number(event.currentTarget.value);
    let value = Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
    const max = Number(this.actor.system?.health?.max) || 1;
    if (value > max) value = max;
    await this.actor.update({ "system.health.value": value });
    this.render(true);
  }

  async _onHeartsInput(event) {
    const raw = Number(event.currentTarget.value);
    let value = Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
    const max = Number(this.actor.system?.hearts) || 1;
    if (value > max) value = max;
    await this.actor.update({ "system.heartsCurrent": value });
    this.render(true);
  }

  async _onResetHearts(event) {
    event.preventDefault();
    const max = Number(this.actor.system.hearts) || 1;
    await this.actor.update({ "system.heartsCurrent": max });
    this.render(true);
  }

  /* -------------------------------------------- */
  /*  ATTACKS / ABILITIES                         */
  /* -------------------------------------------- */

  async _onAddAttack(event) {
    event.preventDefault();
    const attacks = foundry.utils.deepClone(this.actor.system.attacks ?? {});
    const id = foundry.utils.randomID(8);
    attacks[id] = {
      name: game.i18n.localize("FATHERFOG.NewAttack"),
      damage: 10,
      notes: "",
      ignoresArmor: false
    };
    await this.actor.update({ "system.attacks": attacks });
  }

  async _onDeleteAttack(event) {
    event.preventDefault();
    const id = event.currentTarget.closest("[data-attack-id]")?.dataset.attackId;
    if (!id) return;
    const attacks = foundry.utils.deepClone(this.actor.system.attacks ?? {});
    delete attacks[id];
    await this.actor.update({ "system.attacks": attacks });
  }

  async _onAddAbility(event) {
    event.preventDefault();
    const abilities = foundry.utils.deepClone(this.actor.system.abilities ?? {});
    const id = foundry.utils.randomID(8);
    abilities[id] = {
      atHearts: 1,
      name: game.i18n.localize("FATHERFOG.NewAbility"),
      description: ""
    };
    await this.actor.update({ "system.abilities": abilities });
  }

  async _onDeleteAbility(event) {
    event.preventDefault();
    const id = event.currentTarget.closest("[data-ability-id]")?.dataset.abilityId;
    if (!id) return;
    const abilities = foundry.utils.deepClone(this.actor.system.abilities ?? {});
    delete abilities[id];
    await this.actor.update({ "system.abilities": abilities });
  }

  /**
   * NPC attack vs a target — Guide never rolls (manual p.44–45).
   * Bits come from the player's Save / Stat Check.
   * Enemies Never Miss → always at least Bits; full damage on failed Save.
   */
  async _onNpcAttack(event) {
    event.preventDefault();
    const id = event.currentTarget.closest("[data-attack-id]")?.dataset.attackId;
    const attack = this.actor.system.attacks?.[id];
    if (!attack) return;

    const actor = this.actor;
    const baseDamage = Number(attack.damage) || 0;
    const resolved = await this._promptPlayerRollBits(attack.name, baseDamage);
    if (!resolved) return;

    const { bits, rollTotal, fullDamage, glanceDamage } = resolved;
    const i18n = game.i18n;

    let content = `<div class="fatherfog-roll">`;
    content += `<h3>${actor.name} — ${attack.name}</h3>`;
    content += `<div class="roll-result">${i18n.localize("FATHERFOG.Bits")}: ${bits}`;
    if (rollTotal != null) content += ` <span style="opacity:0.7">(${i18n.localize("FATHERFOG.PlayerRoll")}: ${rollTotal})</span>`;
    content += `</div>`;
    content += `<div class="damage"><strong>${i18n.localize("FATHERFOG.DamageFull")}:</strong> ${fullDamage} <em>(${baseDamage} + ${bits})</em></div>`;
    content += `<div class="damage"><strong>${i18n.localize("FATHERFOG.DamageGlance")}:</strong> ${glanceDamage} <em>(${i18n.localize("FATHERFOG.EnemiesNeverMiss")})</em></div>`;
    content += `<p class="hint" style="opacity:0.8;font-size:0.85em;">${i18n.localize("FATHERFOG.GuideNoRollHint")}</p>`;
    if (attack.ignoresArmor) {
      content += `<div class="special">${i18n.localize("FATHERFOG.IgnoresArmor")}</div>`;
    }
    if (attack.notes) {
      content += `<div class="special">${attack.notes}</div>`;
    }
    content += damageButtonsHtml({
      full: fullDamage,
      glance: glanceDamage,
      ignoresArmor: !!attack.ignoresArmor
    });
    content += `</div>`;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content,
      flags: {
        fatherfog: {
          damage: { full: fullDamage, glance: glanceDamage, ignoresArmor: !!attack.ignoresArmor }
        }
      }
    });
  }

  /* -------------------------------------------- */
  /*  WEAPON FROM INVENTORY                       */
  /* -------------------------------------------- */

  async _onWeaponAttack(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item")?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item || item.type !== "weapon") return;

    const will = this.actor.system.stats.will?.value ?? 30;
    const weapon = item.system;
    const baseDamage = item.system.getBaseDamage
      ? item.system.getBaseDamage(will)
      : will + (weapon.damageBonus || 0);

    const resolved = await this._promptPlayerRollBits(item.name, baseDamage);
    if (!resolved) return;

    const { bits, rollTotal, fullDamage, glanceDamage } = resolved;
    const i18n = game.i18n;

    let content = `<div class="fatherfog-roll">`;
    content += `<h3>${this.actor.name} — ${item.name}</h3>`;
    content += `<div class="roll-result">${i18n.localize("FATHERFOG.Bits")}: ${bits}`;
    if (rollTotal != null) content += ` <span style="opacity:0.7">(${i18n.localize("FATHERFOG.PlayerRoll")}: ${rollTotal})</span>`;
    content += `</div>`;
    content += `<div class="damage"><strong>${i18n.localize("FATHERFOG.DamageFull")}:</strong> ${fullDamage}</div>`;
    content += `<div class="damage"><strong>${i18n.localize("FATHERFOG.DamageGlance")}:</strong> ${glanceDamage} <em>(${i18n.localize("FATHERFOG.EnemiesNeverMiss")})</em></div>`;
    content += `<p class="hint" style="opacity:0.8;font-size:0.85em;">${i18n.localize("FATHERFOG.GuideNoRollHint")}</p>`;
    if (weapon.ignoresArmor) {
      content += `<div class="special">${i18n.localize("FATHERFOG.IgnoresArmor")}</div>`;
    }
    content += damageButtonsHtml({
      full: fullDamage,
      glance: glanceDamage,
      ignoresArmor: !!weapon.ignoresArmor
    });
    content += `</div>`;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
      flags: {
        fatherfog: {
          damage: { full: fullDamage, glance: glanceDamage, ignoresArmor: !!weapon.ignoresArmor }
        }
      }
    });
  }

  /**
   * Ask the Guide for the player's d100 total (or Bits). No dice are rolled here.
   */
  async _promptPlayerRollBits(attackName, baseDamage) {
    const i18n = game.i18n;
    return new Promise(resolve => {
      new Dialog({
        title: `${attackName} — ${i18n.localize("FATHERFOG.ResolveAttack")}`,
        content: `
          <p>${i18n.localize("FATHERFOG.GuideNoRollHint")}</p>
          <p style="opacity:0.85;font-size:0.9em;">${i18n.localize("FATHERFOG.EnterPlayerRollHint")}</p>
          <div class="form-group">
            <label>${i18n.localize("FATHERFOG.PlayerRoll")} (d100)</label>
            <input type="number" name="playerRoll" min="0" max="100" value="" placeholder="0–100" style="width:100%;"/>
          </div>
          <div class="form-group">
            <label>${i18n.localize("FATHERFOG.Bits")} <span style="opacity:0.7;">(${i18n.localize("FATHERFOG.OptionalDirectBits")})</span></label>
            <input type="number" name="bitsDirect" min="0" max="9" value="" placeholder="" style="width:100%;"/>
          </div>
          <p style="opacity:0.75;font-size:0.85em;">${i18n.localize("FATHERFOG.BaseDamage")}: <strong>${baseDamage}</strong></p>
        `,
        buttons: {
          ok: {
            icon: '<i class="fas fa-check"></i>',
            label: i18n.localize("FATHERFOG.Resolve"),
            callback: html => {
              const rollRaw = html.find('input[name="playerRoll"]').val();
              const bitsRaw = html.find('input[name="bitsDirect"]').val();
              let bits;
              let rollTotal = null;
              if (bitsRaw !== "" && bitsRaw != null) {
                bits = Math.max(0, Math.min(9, Number(bitsRaw) || 0));
              } else if (rollRaw !== "" && rollRaw != null) {
                rollTotal = Math.max(0, Math.min(100, Number(rollRaw) || 0));
                bits = this._getBits(rollTotal);
              } else {
                ui.notifications.warn(i18n.localize("FATHERFOG.EnterPlayerRollRequired"));
                resolve(null);
                return;
              }
              resolve({
                bits,
                rollTotal,
                fullDamage: baseDamage + bits,
                glanceDamage: bits
              });
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: i18n.localize("Cancel"),
            callback: () => resolve(null)
          }
        },
        default: "ok"
      }).render(true);
    });
  }

  /* -------------------------------------------- */
  /*  INVENTORY                                   */
  /* -------------------------------------------- */

  async _onToggleEquip(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item")?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;
    await item.update({ "system.equipped": !item.system.equipped });
    this.render(false);
  }

  async _onItemDelete(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item")?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;
    const ok = await Dialog.confirm({
      title: game.i18n.localize("FATHERFOG.DeleteItem"),
      content: `<p>${game.i18n.localize("FATHERFOG.DeleteItemConfirm")} <strong>${item.name}</strong>?</p>`
    });
    if (ok) await item.delete();
  }

  _onItemEdit(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item")?.dataset.itemId;
    this.actor.items.get(itemId)?.sheet.render(true);
  }

  async _onCreateItem(event) {
    event.preventDefault();
    const type = event.currentTarget.dataset.type || "equipment";
    const name = game.i18n.localize(`FATHERFOG.New${type.charAt(0).toUpperCase() + type.slice(1)}`) || "Item";
    const data = { name, type, system: {} };
    if (type === "weapon") data.system = { damageType: "wil", weaponType: "melee", hands: 1 };
    if (type === "armor") data.system = { defense: 1 };
    await this.actor.createEmbeddedDocuments("Item", [data]);
  }

  /** Bits = one's digit (p.26): 94 → 4, 20 → 0, 00 → 0. */
  _getBits(total) {
    const t = Number(total) || 0;
    if (t === 100) return 0;
    return t % 10;
  }
}
