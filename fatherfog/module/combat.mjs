/**
 * Fatherfog combat system (rules pp. 34–35, 45–46).
 *
 * Players:
 *   - Attack with a Will Check → damage = successful roll ± weapon modifier (p.35)
 *   - Take damage to Health; Defense subtracts from physical damage
 *
 * Enemies (Guide never rolls, p.44–45):
 *   - Never miss: failed Save → base + Bits; successful Save → Bits only
 *   - Tracked by Hearts: every 10 damage in a single round = 1 Heart lost
 *   - Remainder does NOT carry to the next round
 *   - Critical Success on a player attack typically kills the target
 */

/* ------------------------------------------------------------------ */
/*  Round damage tracker (Hearts: remainder does not carry over)      */
/* ------------------------------------------------------------------ */

/** @type {Map<string, { roundId: string, damage: number }>} */
const _roundDamage = new Map();

function _currentRoundId() {
  const c = game.combat;
  if (c?.started) return `${c.id}:${c.round}`;
  // Outside the Foundry combat tracker: one global “open” round until reset
  return game.fatherfog?._looseRoundId || "loose:0";
}

/**
 * Start / advance a loose combat round when not using Foundry's tracker.
 */
export function beginCombatRound() {
  const n = (game.fatherfog._looseRoundNum || 0) + 1;
  game.fatherfog._looseRoundNum = n;
  game.fatherfog._looseRoundId = `loose:${n}`;
  _roundDamage.clear();
  return n;
}

export function endCombatRound() {
  _roundDamage.clear();
  const n = beginCombatRound();
  ChatMessage.create({
    speaker: ChatMessage.getSpeaker(),
    content: `<div class="fatherfog-roll"><h3>${game.i18n.localize("FATHERFOG.RoundEnded")}</h3>
      <p>${game.i18n.localize("FATHERFOG.RoundEndedHint")} (#${n})</p></div>`
  });
  return n;
}

function _getRoundBucket(actorId) {
  const rid = _currentRoundId();
  let bucket = _roundDamage.get(actorId);
  if (!bucket || bucket.roundId !== rid) {
    bucket = { roundId: rid, damage: 0 };
    _roundDamage.set(actorId, bucket);
  }
  return bucket;
}

/* ------------------------------------------------------------------ */
/*  Damage buttons (chat)                                             */
/* ------------------------------------------------------------------ */

/**
 * HTML buttons for applying damage to targeted / selected tokens.
 * @param {{ full: number, glance?: number|null, ignoresArmor?: boolean, critical?: boolean }} opts
 */
export function damageButtonsHtml({ full, glance, ignoresArmor = false, critical = false }) {
  const i18n = game.i18n;
  const ign = ignoresArmor ? "1" : "0";
  const crit = critical ? "1" : "0";
  return `
    <div class="ff-damage-buttons">
      <button type="button" class="ff-apply-damage" data-amount="${full}" data-ignore-armor="${ign}" data-mode="full" data-critical="${crit}">
        ${i18n.localize("FATHERFOG.ApplyFull")} (${full})
      </button>
      ${glance !== null && glance !== undefined ? `
      <button type="button" class="ff-apply-damage" data-amount="${glance}" data-ignore-armor="${ign}" data-mode="glance" data-critical="0">
        ${i18n.localize("FATHERFOG.ApplyGlance")} (${glance})
      </button>` : ""}
      ${critical ? `
      <button type="button" class="ff-apply-damage" data-amount="0" data-ignore-armor="1" data-mode="critkill" data-critical="1">
        ${i18n.localize("FATHERFOG.ApplyCritKill")}
      </button>` : ""}
      <div class="ff-damage-hint">${i18n.localize("FATHERFOG.ApplyDamageHint")}</div>
    </div>`;
}

/**
 * Collect unique actors from token set / id list.
 */
function _actorsFromTokens(tokens, excludeActorId = null) {
  const out = [];
  const seen = new Set();
  for (const t of tokens || []) {
    const a = t?.actor;
    if (!a || a.id === excludeActorId || seen.has(a.id)) continue;
    seen.add(a.id);
    out.push(a);
  }
  return out;
}

/**
 * Resolve which actors should receive damage.
 * Priority:
 *  1) Explicit actorIds (from chat message flags)
 *  2) Current user targets (tokens marked with target tool)
 *  3) Controlled tokens
 *  4) Empty → caller may prompt
 */
export function getDamageTargets(excludeActorId = null, explicitActorIds = null) {
  if (explicitActorIds?.length) {
    const out = [];
    const seen = new Set();
    for (const id of explicitActorIds) {
      const a = game.actors.get(id) || canvas?.tokens?.placeables?.find(t => t.actor?.id === id)?.actor;
      if (!a || a.id === excludeActorId || seen.has(a.id)) continue;
      seen.add(a.id);
      out.push(a);
    }
    if (out.length) return out;
  }

  const targeted = _actorsFromTokens(Array.from(game.user.targets ?? []), excludeActorId);
  if (targeted.length) return targeted;

  const controlled = _actorsFromTokens(canvas?.tokens?.controlled ?? [], excludeActorId);
  if (controlled.length) return controlled;

  return [];
}

/** Snapshot current user targets as actor ids (store on chat flags). */
export function snapshotTargetActorIds(excludeActorId = null) {
  return getDamageTargets(excludeActorId).map(a => a.id);
}

/** Ask GM/player to pick character(s) when nothing is targeted. */
async function _promptDamageTargets(excludeActorId = null) {
  const chars = game.actors.filter(a => a.type === "character" && a.id !== excludeActorId);
  if (!chars.length) return [];

  const options = chars
    .map(a => `<option value="${a.id}">${foundry.utils.escapeHTML?.(a.name) ?? a.name}</option>`)
    .join("");

  return new Promise(resolve => {
    let settled = false;
    new Dialog({
      title: game.i18n.localize("FATHERFOG.PickDamageTarget") || "Choose target",
      content: `
        <p>${game.i18n.localize("FATHERFOG.PickDamageTargetHint") || "No token targeted. Choose a character:"}</p>
        <select id="ff-dmg-target" style="width:100%;">${options}</select>
      `,
      buttons: {
        ok: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize("FATHERFOG.AddSkill") === "Add" ? "OK" : (game.i18n.lang?.startsWith?.("ca") ? "Acceptar" : "OK"),
          callback: html => {
            settled = true;
            const id = html.find("#ff-dmg-target").val();
            const a = id ? game.actors.get(id) : null;
            resolve(a ? [a] : []);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("FATHERFOG.RollCancel") || "Cancel",
          callback: () => { settled = true; resolve([]); }
        }
      },
      default: "ok",
      close: () => { if (!settled) resolve([]); }
    }).render(true);
  });
}

/* ------------------------------------------------------------------ */
/*  Apply damage: Character (Health)                                  */
/* ------------------------------------------------------------------ */

/**
 * Apply damage to a PC / any actor that uses Health.
 * Defense reduces physical damage unless ignoresArmor.
 */
export async function applyDamageToActor(actor, amount, { ignoresArmor = false } = {}) {
  if (!actor) return null;

  // NPCs use Hearts, not Health pools from player attacks
  if (actor.type === "npc") {
    return applyDamageToEnemy(actor, amount, { critical: false });
  }

  const raw = Math.max(0, Number(amount) || 0);
  const defense = ignoresArmor ? 0 : Math.max(0, Number(actor.system?.defense?.value) || 0);
  const applied = Math.max(0, raw - defense);

  // Prefer document source (authoritative), then live system
  let before = Number(actor._source?.system?.health?.value);
  if (!Number.isFinite(before)) before = Number(actor.system?.health?.value);
  if (!Number.isFinite(before)) before = 0;

  const after = Math.max(0, before - applied);

  await actor.update({ "system.health.value": after });
  // Full refresh so CSS health states (colors/badges) recalculate
  await _refreshSheets(actor, true);

  return { type: "health", applied, defense, before, after, raw };
}

/* ------------------------------------------------------------------ */
/*  Apply damage: Enemy (Hearts) — rules p.46                         */
/* ------------------------------------------------------------------ */

/**
 * Read current / max hearts for an NPC.
 * Supports legacy flat `system.hearts` (max) and optional `heartsCurrent`.
 */
export function getEnemyHearts(actor) {
  const max = Number(actor.system?.hearts) || 1;
  const cur = actor.system?.heartsCurrent;
  const value = cur === undefined || cur === null ? max : Number(cur);
  return { value: Math.max(0, value), max: Math.max(0, max) };
}

/**
 * Apply damage to an enemy using the Hearts rule:
 * - Accumulate damage this round
 * - Hearts lost = floor(roundTotal / 10)
 * - Only the *newly* crossed thresholds this application matter for the delta
 * - Remainder does not carry to next round (handled by round bucket reset)
 * - critical: typically kills (set hearts to 0)
 */
export async function applyDamageToEnemy(actor, amount, { critical = false } = {}) {
  if (!actor || actor.type !== "npc") return null;

  const raw = Math.max(0, Number(amount) || 0);
  const { value: beforeHearts, max: maxHearts } = getEnemyHearts(actor);

  if (critical) {
    await actor.update({ "system.heartsCurrent": 0 });
    await _refreshSheets(actor, true);
    return {
      type: "hearts",
      critical: true,
      raw,
      before: beforeHearts,
      after: 0,
      heartsLost: beforeHearts,
      roundDamage: raw,
      max: maxHearts
    };
  }

  const bucket = _getRoundBucket(actor.id);
  const prevRound = bucket.damage;
  bucket.damage += raw;
  const newRound = bucket.damage;

  // Hearts lost from total round damage so far
  const heartsFromPrev = Math.floor(prevRound / 10);
  const heartsFromNew = Math.floor(newRound / 10);
  const heartsLostThisHit = Math.max(0, heartsFromNew - heartsFromPrev);

  const afterHearts = Math.max(0, beforeHearts - heartsLostThisHit);

  // Always persist heartsCurrent so open sheets show the value
  await actor.update({ "system.heartsCurrent": afterHearts });
  await _refreshSheets(actor, true);

  return {
    type: "hearts",
    critical: false,
    raw,
    before: beforeHearts,
    after: afterHearts,
    heartsLost: heartsLostThisHit,
    roundDamage: newRound,
    remainder: newRound % 10,
    max: maxHearts
  };
}

async function _refreshSheets(actor, force = false) {
  if (!actor) return;
  const renderApp = async (app) => {
    if (!app?.render) return;
    try {
      // force=true rebuilds the template so healthClass / badges update after heal/damage
      await app.render(force);
    } catch (_) {
      try { app.render?.(false); } catch (_) { /* ignore */ }
    }
  };
  for (const app of Object.values(actor.apps ?? {})) {
    await renderApp(app);
  }
  try {
    for (const w of Object.values(ui?.windows ?? {})) {
      if (w?.actor?.id === actor.id) await renderApp(w);
    }
  } catch (_) { /* ignore */ }
}

/* ------------------------------------------------------------------ */
/*  Chat button handler                                               */
/* ------------------------------------------------------------------ */

export async function onApplyDamageClick(event) {
  event.preventDefault();
  event.stopPropagation();

  const btn = event.currentTarget;
  const amount = Number(btn.dataset.amount) || 0;
  const ignoresArmor = btn.dataset.ignoreArmor === "1";
  const mode = btn.dataset.mode || "full";
  const critical = btn.dataset.critical === "1" || mode === "critkill";

  const messageEl = btn.closest(".chat-message, .message") || btn.closest("li");
  const messageId = messageEl?.dataset?.messageId;
  const message = messageId ? game.messages.get(messageId) : null;
  const speakerActorId = message?.speaker?.actor ?? null;
  const flaggedIds = message?.flags?.fatherfog?.targetActorIds || null;

  let targets = getDamageTargets(speakerActorId, flaggedIds);
  if (!targets.length) {
    targets = await _promptDamageTargets(speakerActorId);
  }
  if (!targets.length) {
    ui.notifications.warn(game.i18n.localize("FATHERFOG.NoDamageTarget"));
    return;
  }

  const results = [];
  for (const actor of targets) {
    if (!actor.isOwner && !game.user.isGM) continue;

    let r;
    if (mode === "critkill" || (critical && actor.type === "npc")) {
      r = await applyDamageToEnemy(actor, amount, { critical: true });
    } else if (actor.type === "npc") {
      r = await applyDamageToEnemy(actor, amount, { critical: false });
    } else {
      r = await applyDamageToActor(actor, amount, { ignoresArmor });
    }
    if (r) results.push({ actor, ...r, mode });
  }

  if (!results.length) {
    ui.notifications.warn(game.i18n.localize("FATHERFOG.NoDamageTarget"));
    return;
  }

  await _postDamageResults(results, ignoresArmor);
}

async function _postDamageResults(results, ignoresArmor) {
  const i18n = game.i18n;
  const lines = results.map(r => {
    if (r.type === "hearts") {
      const hearts = "♥".repeat(Math.max(0, r.after)) + "♡".repeat(Math.max(0, (r.max || 0) - r.after));
      if (r.critical) {
        return `<li><strong>${r.actor.name}</strong>: ${i18n.localize("FATHERFOG.EnemySlain")} (${r.before} → 0 ${i18n.localize("FATHERFOG.Hearts")})</li>`;
      }
      const rem = r.remainder != null ? ` · ${i18n.localize("FATHERFOG.RoundRemainder")}: ${r.remainder}` : "";
      return `<li><strong>${r.actor.name}</strong>: ${hearts} (−${r.heartsLost} ${i18n.localize("FATHERFOG.Hearts")}) · ${i18n.localize("FATHERFOG.RoundDamage")}: ${r.roundDamage}${rem}</li>`;
    }
    // health
    const defNote = r.defense > 0 && !ignoresArmor
      ? ` (−${r.defense} ${i18n.localize("FATHERFOG.Defense")})`
      : "";
    if (r.applied <= 0 && r.raw > 0) {
      return `<li><strong>${r.actor.name}</strong>: ${r.before} → ${r.after} (${i18n.localize("FATHERFOG.Defense")} ${i18n.localize("FATHERFOG.AbsorbsAll")}${defNote})</li>`;
    }
    return `<li><strong>${r.actor.name}</strong>: ${r.before} → ${r.after} (−${r.applied}${defNote})</li>`;
  }).join("");

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker(),
    content: `<div class="fatherfog-roll"><h3>${i18n.localize("FATHERFOG.DamageApplied")}</h3><ul>${lines}</ul></div>`
  });
}

/* ------------------------------------------------------------------ */
/*  Resolve enemy attack (Guide tool)                                 */
/* ------------------------------------------------------------------ */

/**
 * Resolve an enemy attack against player Saves.
 * Guide never rolls: Bits come from the player's Save / Stat Check.
 *
 * @param {Actor} enemy
 * @param {{ name: string, damage: number, ignoresArmor?: boolean, notes?: string }} attack
 * @param {{ rollTotal?: number, bits?: number }} playerRoll
 */
export async function resolveEnemyAttack(enemy, attack, playerRoll = {}) {
  const base = Number(attack.damage) || 0;
  let bits;
  let rollTotal = playerRoll.rollTotal ?? null;
  if (playerRoll.bits != null && playerRoll.bits !== "") {
    bits = Math.max(0, Math.min(10, Number(playerRoll.bits) || 0));
  } else if (rollTotal != null) {
    bits = getBitsFromRoll(rollTotal);
  } else {
    return null;
  }

  const fullDamage = base + bits;
  const glanceDamage = bits;
  const i18n = game.i18n;

  let content = `<div class="fatherfog-roll">`;
  content += `<h3>${enemy.name} — ${attack.name}</h3>`;
  content += `<div class="roll-result">${i18n.localize("FATHERFOG.Bits")}: ${bits}`;
  if (rollTotal != null) content += ` <span style="opacity:0.7">(${i18n.localize("FATHERFOG.PlayerRoll")}: ${rollTotal})</span>`;
  content += `</div>`;
  content += `<div class="damage"><strong>${i18n.localize("FATHERFOG.DamageFull")}:</strong> ${fullDamage} <em>(${base} + ${bits})</em></div>`;
  content += `<div class="damage"><strong>${i18n.localize("FATHERFOG.DamageGlance")}:</strong> ${glanceDamage} <em>(${i18n.localize("FATHERFOG.EnemiesNeverMiss")})</em></div>`;
  content += `<p class="hint" style="opacity:0.8;font-size:0.85em;">${i18n.localize("FATHERFOG.GuideNoRollHint")}</p>`;
  if (attack.ignoresArmor) content += `<div class="special">${i18n.localize("FATHERFOG.IgnoresArmor")}</div>`;
  if (attack.notes) content += `<div class="special">${attack.notes}</div>`;
  content += damageButtonsHtml({
    full: fullDamage,
    glance: glanceDamage,
    ignoresArmor: !!attack.ignoresArmor
  });
  content += `</div>`;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: enemy }),
    content,
    flags: {
      fatherfog: {
        damage: { full: fullDamage, glance: glanceDamage, ignoresArmor: !!attack.ignoresArmor },
        targetActorIds: snapshotTargetActorIds(enemy?.id)
      }
    }
  });

  return { fullDamage, glanceDamage, bits };
}

/** Units digit of a d100 (00 → 10). */
/** Units digit of a d100 (p.26): 94 → 4, 20 → 0, 00 → 0. */
export function getBitsFromRoll(total) {
  const t = Number(total) || 0;
  if (t === 100) return 0;
  return t % 10;
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                             */
/* ------------------------------------------------------------------ */

export function registerCombatHooks() {
  // Keep open character sheets in sync when Health changes (damage / heal)
  Hooks.on("updateActor", (actor, changes) => {
    const hp = changes?.system?.health?.value ?? changes?.["system.health.value"];
    const hearts =
      changes?.system?.heartsCurrent ??
      changes?.["system.heartsCurrent"] ??
      changes?.system?.hearts ??
      changes?.["system.hearts"];
    if (hp === undefined && hearts === undefined) return;
    _refreshSheets(actor, true);
  });

  Hooks.on("renderChatMessage", (message, html) => {
    html.find("button.ff-apply-damage").click(onApplyDamageClick);
  });

  Hooks.on("renderChatMessageHTML", (message, html) => {
    const root = html instanceof HTMLElement ? $(html) : html;
    root.find?.("button.ff-apply-damage")?.click(onApplyDamageClick);
    if (html instanceof HTMLElement) {
      html.querySelectorAll("button.ff-apply-damage").forEach(btn => {
        btn.addEventListener("click", onApplyDamageClick);
      });
    }
  });

  // When Foundry combat advances a round, clear heart damage remainders
  Hooks.on("updateCombat", (combat, changed) => {
    if (changed.round !== undefined) {
      _roundDamage.clear();
    }
  });

  Hooks.on("deleteCombat", () => {
    _roundDamage.clear();
  });
}
