/**
 * Fatherfog – Phase 1 mechanical helpers
 * Class Traits, Hope Save / Despair, Death
 */

/** Grid units considered "nearby" for party effects */
const NEARBY_RANGE = 5;

/**
 * Roll a d100 (percentile) using d10s for tens and units so Dice So Nice
 * shows the physical dice. For advantage/disadvantage rolls two independent
 * d100 (four d10s total).
 *
 * Automatic colors for Dice So Nice:
 * - Advantage: first pair (one full d100) in green, second pair = player default
 * - Disadvantage: first pair in red, second pair = player default
 * - Normal: player default for both dice
 *
 * Faces: 10 → 0, 00 = 100. Lower total is better (success on roll < target).
 *
 * @param {"normal"|"advantage"|"disadvantage"} mode
 * @returns {Promise<{ roll: Roll, totals: number[], finalTotal: number, mode: string, faces: number[] }>}
 */
export async function rollPercentile(mode = "normal") {
  const isMulti = mode === "advantage" || mode === "disadvantage";
  const formula = isMulti ? "1d10 + 1d10 + 1d10 + 1d10" : "1d10 + 1d10";
  const roll = new Roll(formula);
  await roll.evaluate({ async: true });

  // Collect non-discarded face results in term order
  const faces = [];
  for (const term of roll.terms) {
    if (term.results) {
      for (const r of term.results) {
        if (!r.discarded) faces.push(Number(r.result) || 0);
      }
    }
  }

  const mapFace = (f) => (f === 10 ? 0 : f);

  const makeTotal = (tFace, uFace) => {
    const t = mapFace(tFace);
    const u = mapFace(uFace);
    const sum = t * 10 + u;
    return sum === 0 ? 100 : sum;
  };

  let totals = [];
  if (isMulti) {
    totals = [
      makeTotal(faces[0], faces[1]),
      makeTotal(faces[2], faces[3])
    ];
  } else {
    totals = [makeTotal(faces[0], faces[1])];
  }

  let finalTotal = totals[0];
  if (mode === "advantage") {
    finalTotal = Math.min(totals[0], totals[1]);
  } else if (mode === "disadvantage") {
    finalTotal = Math.max(totals[0], totals[1]);
  }

  // --- Dice So Nice automatic colors ---
  // Color the first pair (tens+units of one d100) to mark advantage/disadvantage.
  // The other pair keeps the player's default colorset.
  try {
    if (game.modules?.get("dice-so-nice")?.active && roll.dice?.length) {
      const markedColor =
        mode === "advantage" ? "green" :
        mode === "disadvantage" ? "red" :
        null;
      if (markedColor && roll.dice.length >= 4) {
        for (let i = 0; i < 2; i++) {
          const die = roll.dice[i];
          if (!die) continue;
          die.options = die.options || {};
          die.options.appearance = die.options.appearance || {};
          die.options.appearance.colorset = markedColor;
        }
        // dice[2] and dice[3] intentionally left without override → player default
      }
    }
  } catch (err) {
    console.warn("Fatherfog | Could not set Dice So Nice colors", err);
  }

  // Expose final total as roll.total for any code that reads it after the fact
  try {
    Object.defineProperty(roll, "total", {
      get: () => finalTotal,
      configurable: true
    });
  } catch (_) { /* ignore */ }
  roll._ffTotals = totals;
  roll._ffFinal = finalTotal;
  roll._ffMode = mode;
  roll._ffFaces = faces;

  return { roll, totals, finalTotal, mode, faces };
}

/**
 * Get player-character actors considered "nearby" the source actor.
 * Prefer tokens within NEARBY_RANGE; fall back to all other PCs if no canvas.
 */
export function getNearbyPartyMembers(sourceActor, { includeSelf = false } = {}) {
  const results = [];
  const sourceToken = sourceActor?.getActiveTokens?.()?.[0];

  const candidates = game.actors.filter(
    a => a.type === "character" && (includeSelf || a.id !== sourceActor?.id)
  );

  if (!sourceToken || !canvas?.ready) {
    // No token / no canvas → all other PCs
    return candidates;
  }

  const sx = sourceToken.center?.x ?? sourceToken.x;
  const sy = sourceToken.center?.y ?? sourceToken.y;
  const gridSize = canvas.grid?.size || 100;
  const maxDist = NEARBY_RANGE * gridSize;

  for (const actor of candidates) {
    const tokens = actor.getActiveTokens?.() || [];
    if (!tokens.length) {
      // No token on scene → still include (party camping, etc.)
      results.push(actor);
      continue;
    }
    for (const t of tokens) {
      const tx = t.center?.x ?? t.x;
      const ty = t.center?.y ?? t.y;
      const dist = Math.hypot(tx - sx, ty - sy);
      if (dist <= maxDist) {
        results.push(actor);
        break;
      }
    }
  }
  return results;
}

/**
 * Apply Hope change and return the actual delta applied.
 */
export async function changeHope(actor, delta) {
  if (!actor) return 0;
  const cur = Number(actor.system?.hope?.value) ?? 0;
  const max = Number(actor.system?.hope?.max) ?? 100;
  const next = Math.max(0, Math.min(max, cur + delta));
  const applied = next - cur;
  if (applied !== 0) {
    await actor.update({ "system.hope.value": next });
  }
  return applied;
}

/**
 * Apply Health change. Triggers Death flow if Health reaches 0.
 */
export async function changeHealth(actor, delta, { skipDeathCheck = false } = {}) {
  if (!actor) return 0;
  let cur = Number(actor.system?.health?.value);
  if (!Number.isFinite(cur)) cur = 0;
  let max = Number(actor.system?.health?.max);
  if (!Number.isFinite(max) || max <= 0) max = 30;
  const next = Math.max(0, Math.min(max, cur + delta));
  const applied = next - cur;
  await actor.update({ "system.health.value": next });
  for (const app of Object.values(actor.apps ?? {})) {
    try { app.render?.(false); } catch (_) { /* ignore */ }
  }
  try {
    for (const w of Object.values(ui?.windows ?? {})) {
      if (w?.actor?.id === actor.id) {
        try { w.render?.(false); } catch (_) { /* ignore */ }
      }
    }
  } catch (_) { /* ignore */ }
  if (!skipDeathCheck && next <= 0 && cur > 0) {
    await handleDeath(actor);
  }
  return applied;
}

/* ------------------------------------------------------------------ */
/*  CLASS TRAITS                                                      */
/* ------------------------------------------------------------------ */

/**
 * Called after any successful/failed check that may be critical.
 * @param {Actor} actor
 * @param {object} opts
 * @param {boolean} opts.success
 * @param {boolean} opts.isCritical
 * @param {string}  opts.type   - "stat" | "save" | "hope" | "attack"
 * @param {string}  [opts.stat] - "strength" | "intellect" | "will" (for stats/attacks)
 */
export async function applyClassTraits(actor, { success, isCritical, type, stat = null } = {}) {
  if (!actor || actor.type !== "character") return;
  const cls = actor.system?.class?.value || "";
  const i18n = game.i18n;

  // ----- Critical Success -----
  if (isCritical && success) {
    // Worker – Tenacity: +1 Skill Point
    if (cls === "worker") {
      const pts = Number(actor.system.skillPoints) || 0;
      await actor.update({ "system.skillPoints": pts + 1 });
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<div class="fatherfog-roll"><em>${i18n.localize("FATHERFOG.TraitWorkerTrigger")}</em></div>`
      });
    }

    // Philosopher – Rational: nearby party +5 Hope
    if (cls === "philosopher") {
      const nearby = getNearbyPartyMembers(actor);
      const lines = [];
      for (const other of nearby) {
        const applied = await changeHope(other, 5);
        if (applied !== 0) {
          lines.push(`<li><strong>${other.name}</strong>: +${applied} ${i18n.localize("FATHERFOG.Hope")}</li>`);
        }
      }
      if (lines.length) {
        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor }),
          content: `<div class="fatherfog-roll"><em>${i18n.localize("FATHERFOG.TraitPhilosopherSuccess")}</em><ul>${lines.join("")}</ul></div>`
        });
      }
    }

    // Hunter – Thrill of the Hunt: +1 Will on Will critical success
    if (cls === "hunter" && (stat === "will" || type === "attack")) {
      const will = Number(actor.system.stats?.will?.value) || 0;
      const newWill = Math.min(75, will + 1);
      if (newWill > will) {
        await actor.update({ "system.stats.will.value": newWill });
        // Health max follows Strength, not Will – no change needed
        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor }),
          content: `<div class="fatherfog-roll"><em>${i18n.localize("FATHERFOG.TraitHunterWill")}</em> (${will} → ${newWill})</div>`
        });
      }
    }
  }

  // ----- Critical Failure -----
  if (isCritical && !success) {
    // Philosopher – Loss of Reason: nearby party −5 Hope
    if (cls === "philosopher") {
      const nearby = getNearbyPartyMembers(actor);
      const lines = [];
      for (const other of nearby) {
        const applied = await changeHope(other, -5);
        if (applied !== 0) {
          lines.push(`<li><strong>${other.name}</strong>: ${applied} ${i18n.localize("FATHERFOG.Hope")}</li>`);
        }
      }
      if (lines.length) {
        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor }),
          content: `<div class="fatherfog-roll"><em>${i18n.localize("FATHERFOG.TraitPhilosopherFail")}</em><ul>${lines.join("")}</ul></div>`
        });
      }
    }
  }
}

/**
 * Stranger – Odd Presence.
 * Call when a non-Stranger touches the Stranger or wakes up near them.
 */
export async function applyOddPresence(strangerActor, targetActor) {
  if (!strangerActor || strangerActor.system?.class?.value !== "stranger") return;
  if (!targetActor || targetActor.id === strangerActor.id) return;
  if (targetActor.system?.class?.value === "stranger") return;

  const applied = await changeHope(targetActor, -2);
  if (applied === 0) return;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: strangerActor }),
    content: `<div class="fatherfog-roll"><em>${game.i18n.localize("FATHERFOG.TraitStrangerTrigger")}</em>
      <br><strong>${targetActor.name}</strong>: ${applied} ${game.i18n.localize("FATHERFOG.Hope")}</div>`
  });
}

/* ------------------------------------------------------------------ */
/*  HOPE SAVE / DESPAIR                                               */
/* ------------------------------------------------------------------ */

/**
 * After a failed Hope Save: regain Hope equal to the roll, mark Despair,
 * and trigger Hunter Falling Prey if applicable.
 * @param {Actor} actor
 * @param {number} rollTotal  - the d100 result
 */
export async function handleDespair(actor, rollTotal) {
  if (!actor) return;
  const i18n = game.i18n;
  const max = Number(actor.system.hope?.max) ?? 100;
  const cur = Number(actor.system.hope?.value) ?? 0;
  const regain = Math.min(rollTotal, max - cur);

  if (regain > 0) {
    await actor.update({ "system.hope.value": cur + regain });
  }

  // Record a despair entry (timestamp + roll)
  const despairList = foundry.utils.deepClone(actor.system.conditions?.despair || []);
  despairList.push(`${new Date().toLocaleString()} – roll ${rollTotal}`);
  await actor.update({ "system.conditions.despair": despairList });

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="fatherfog-roll warning">
      <h3>${i18n.localize("FATHERFOG.DespairTitle")}</h3>
      <p>${i18n.format("FATHERFOG.DespairRegain", { amount: regain, total: rollTotal })}</p>
      <p><em>${i18n.localize("FATHERFOG.DespairGuideNote")}</em></p>
    </div>`
  });

  // Whisper full result to GM for private Despair table lookup
  if (game.user.isGM || game.users.find(u => u.isGM)?.active) {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="fatherfog-roll"><strong>[GM]</strong> ${actor.name} Despair roll: <strong>${rollTotal}</strong>. Consult Guide p.56.</div>`,
      whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id)
    });
  }

  // Hunter – Falling Prey
  if (actor.system?.class?.value === "hunter") {
    const nearby = getNearbyPartyMembers(actor);
    if (nearby.length) {
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<div class="fatherfog-roll"><em>${i18n.localize("FATHERFOG.TraitHunterFallingPrey")}</em>
          <br>${nearby.map(a => a.name).join(", ")} ${i18n.localize("FATHERFOG.MustHopeSave")}</div>`
      });
      // Optionally auto-prompt each nearby player (non-blocking notification)
      for (const other of nearby) {
        if (other.isOwner || game.user.isGM) {
          ui.notifications.info(`${other.name}: ${i18n.localize("FATHERFOG.MustHopeSave")}`);
        }
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/*  DEATH                                                             */
/* ------------------------------------------------------------------ */

/** Death Table (Body Save success amount → price). Simplified entries. */
const DEATH_TABLE = [
  { max: 0,  key: "rebirth",     heal: "full" },
  { max: 1,  key: "scratch",     heal: "roll" },
  { max: 3,  key: "teeth",       heal: "roll" },
  { max: 5,  key: "faceScar",    heal: "roll" },
  { max: 7,  key: "toes",        heal: "roll" },
  { max: 9,  key: "reflection",  heal: "roll" },
  { max: 11, key: "cheat",       heal: "roll" },
  { max: 12, key: "organ",       heal: "roll" },
  { max: 14, key: "tears",       heal: "roll" },
  { max: 16, key: "fingers",     heal: "roll" },
  { max: 18, key: "ear",         heal: "roll" },
  { max: 20, key: "shadow",      heal: "roll" },
  { max: 22, key: "cheat",       heal: "roll" },
  { max: 23, key: "name",        heal: "roll" },
  { max: 25, key: "scalped",     heal: "roll" },
  { max: 27, key: "nose",        heal: "roll" },
  { max: 29, key: "flayed",      heal: "roll" },
  { max: 31, key: "patience",    heal: "roll" },
  { max: 33, key: "cheat",       heal: "roll" },
  { max: 34, key: "leftFoot",    heal: "roll" },
  { max: 36, key: "rightThumb",  heal: "roll" },
  { max: 38, key: "lies",        heal: "roll" },
  { max: 40, key: "eye",         heal: "roll" },
  { max: 42, key: "face",        heal: "roll" },
  { max: 44, key: "cheat",       heal: "roll" },
  { max: 45, key: "firstBorn",   heal: "roll" },
  { max: 47, key: "rectum",      heal: "roll" },
  { max: 49, key: "dreams",      heal: "roll" },
  { max: 51, key: "leftTibia",   heal: "roll" },
  { max: 53, key: "rightHand",   heal: "roll" },
  { max: 55, key: "cheat",       heal: "roll" },
  { max: 56, key: "hope",        heal: "roll" },
  { max: 58, key: "retches",     heal: "roll" },
  { max: 60, key: "breath",      heal: "roll" },
  { max: 62, key: "rightArm",    heal: "roll" },
  { max: 64, key: "leftFemur",   heal: "roll" },
  { max: 66, key: "cheat",       heal: "roll" },
  { max: 67, key: "spine",       heal: "roll" },
  { max: 68, key: "autonomy",    heal: "roll" },
  { max: 69, key: "tongue",      heal: "roll" },
  { max: 70, key: "tremors",     heal: "roll" },
  { max: 71, key: "warmth",      heal: "roll" },
  { max: 72, key: "organFail",   heal: "roll" },
  { max: 73, key: "dimmed",      heal: "roll" },
  { max: 74, key: "explosion",   heal: "roll" },
  { max: 100, key: "explosion",  heal: "roll" }
];

function deathEntryFor(roll) {
  for (const e of DEATH_TABLE) {
    if (roll <= e.max) return e;
  }
  return DEATH_TABLE[DEATH_TABLE.length - 1];
}

/**
 * Triggered when a character reaches 0 Health.
 * Rolls Body Save; on success heals & shows Death's price; on fail → dies.
 */
export async function handleDeath(actor) {
  if (!actor || actor.type !== "character") return;
  if (actor.getFlag("fatherfog", "deathInProgress")) return;
  await actor.setFlag("fatherfog", "deathInProgress", true);

  const i18n = game.i18n;
  const body = Number(actor.system.saves?.body?.value) ?? 25;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="fatherfog-roll warning">
      <h3>☠ ${i18n.localize("FATHERFOG.DeathVisits")}</h3>
      <p>${i18n.format("FATHERFOG.DeathBodySave", { name: actor.name, body })}</p>
    </div>`
  });

  // Automatic Body Save (normal mode – GM can re-roll with adv/dis if needed)
  // Use percentile helper so Dice So Nice shows tens + units dice
  const { roll, finalTotal: total } = await rollPercentile("normal");
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `<div class="fatherfog-roll"><strong>${i18n.localize("FATHERFOG.BodySave")} (${body})</strong></div>`
  });

  const success = total <= body;

  if (!success) {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="fatherfog-roll warning">
        <h3>${i18n.localize("FATHERFOG.DeathTakes")}</h3>
        <p>${i18n.localize("FATHERFOG.DeathTakesDesc")}</p>
        <p><em>${i18n.localize("FATHERFOG.DeathGiftNote")}</em></p>
      </div>`
    });
    // Leave health at 0; mark as dead via a simple status note
    const notes = (actor.system.notes || "") + `\n[${new Date().toLocaleDateString()}] ${i18n.localize("FATHERFOG.DeathTakes")}`;
    await actor.update({ "system.notes": notes });
  } else {
    // Heal up to the roll amount (skip re-triggering Death)
    const maxH = Number(actor.system.health?.max) ?? 30;
    const healAmount = Math.min(total, maxH);
    await actor.update(
      { "system.health.value": healAmount },
      { fatherfogSkipDeath: true }
    );

    const entry = deathEntryFor(total);
    const priceKey = `FATHERFOG.DeathPrice_${entry.key}`;
    const priceText = i18n.localize(priceKey);
    const priceLabel = priceText !== priceKey ? priceText : entry.key;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="fatherfog-roll">
        <h3>${i18n.localize("FATHERFOG.DeathBargains")}</h3>
        <p>${i18n.format("FATHERFOG.DeathHealed", { amount: healAmount })}</p>
        <p><strong>${i18n.localize("FATHERFOG.DeathPrice")}:</strong> ${priceLabel}</p>
        <p><em>${i18n.localize("FATHERFOG.DeathRefuseNote")}</em></p>
      </div>`
    });
  }

  await actor.unsetFlag("fatherfog", "deathInProgress");
}

/**
 * Hook: watch health updates and trigger Death only when health drops to 0.
 * Does not interfere with normal damage / healing above 0.
 */
export function registerDeathHook() {
  Hooks.on("updateActor", async (actor, changes, options, userId) => {
    if (game.user.id !== userId) return;
    if (actor.type !== "character") return;
    if (options?.fatherfogSkipDeath) return;
    if (actor.getFlag("fatherfog", "deathInProgress")) return;

    // Support both expanded and flattened change payloads
    let newHealth = changes?.system?.health?.value;
    if (newHealth === undefined && changes?.["system.health.value"] !== undefined) {
      newHealth = changes["system.health.value"];
    }
    if (newHealth === undefined) return;

    const hp = Number(newHealth);
    if (!Number.isFinite(hp) || hp > 0) return;

    // Defer so the health update is fully committed first
    setTimeout(() => {
      if (Number(actor.system?.health?.value) > 0) return; // healed in the meantime
      if (actor.getFlag("fatherfog", "deathInProgress")) return;
      handleDeath(actor);
    }, 150);
  });
}

/* ------------------------------------------------------------------ */
/*  PHASE 2 – REST, THIRST, HUNGER, CRIT HELPERS                      */
/* ------------------------------------------------------------------ */

/**
 * Toggle a named condition string in system.conditions.other
 */
async function setConditionFlag(actor, flag, active) {
  const list = foundry.utils.deepClone(actor.system.conditions?.other || []);
  const idx = list.indexOf(flag);
  if (active && idx === -1) list.push(flag);
  if (!active && idx !== -1) list.splice(idx, 1);
  await actor.update({ "system.conditions.other": list });
}

export function hasCondition(actor, flag) {
  const list = actor.system.conditions?.other || [];
  return list.includes(flag);
}

/**
 * Drink from waterskin: consume 1, clear Thirst.
 */
export async function drinkWaterskin(actor) {
  if (!actor) return false;
  const i18n = game.i18n;
  const cur = Number(actor.system.waterskin?.value) ?? 0;
  if (cur <= 0) {
    ui.notifications.warn(i18n.localize("FATHERFOG.WaterskinEmpty"));
    return false;
  }
  await actor.update({ "system.waterskin.value": cur - 1 });
  await setConditionFlag(actor, "thirst", false);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="fatherfog-roll"><em>${i18n.localize("FATHERFOG.DrinkOk")}</em></div>`
  });
  return true;
}

/**
 * Eat a ration: consume 1, clear Hunger.
 */
export async function eatRation(actor) {
  if (!actor) return false;
  const i18n = game.i18n;
  const cur = Number(actor.system.rations?.value) ?? 0;
  if (cur <= 0) {
    ui.notifications.warn(i18n.localize("FATHERFOG.RationsEmpty"));
    return false;
  }
  await actor.update({ "system.rations.value": cur - 1 });
  await setConditionFlag(actor, "hunger", false);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="fatherfog-roll"><em>${i18n.localize("FATHERFOG.EatOk")}</em></div>`
  });
  return true;
}

/**
 * Mark Thirst / Hunger / Exhaustion (Guide or daily check).
 */
export async function markPeril(actor, peril) {
  if (!actor || !["thirst", "hunger", "exhaustion"].includes(peril)) return;
  await setConditionFlag(actor, peril, true);
  const i18n = game.i18n;
  const key = {
    thirst: "FATHERFOG.MarkThirst",
    hunger: "FATHERFOG.MarkHunger",
    exhaustion: "FATHERFOG.MarkExhaustion"
  }[peril];
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="fatherfog-roll warning"><em>${i18n.localize(key)}</em></div>`
  });
}

/**
 * Does this actor currently suffer Disadvantage from perils?
 */
export function hasPerilDisadvantage(actor) {
  if (!actor) return false;
  return hasCondition(actor, "thirst")
    || hasCondition(actor, "hunger")
    || hasCondition(actor, "exhaustion");
}

/**
 * Rest activity dialog + application.
 * activities: keepWatch | fullNight | halfNight | feveredDreams | roughNight
 */
export async function performRest(actor, activity, options = {}) {
  if (!actor || actor.type !== "character") return;
  const i18n = game.i18n;
  const updates = {};
  const messages = [];

  const health = Number(actor.system.health?.value) ?? 0;
  const healthMax = Number(actor.system.health?.max) ?? 30;
  const hope = Number(actor.system.hope?.value) ?? 0;
  const hopeMax = Number(actor.system.hope?.max) ?? 100;
  const skillPts = Number(actor.system.skillPoints) ?? 0;

  switch (activity) {
    case "keepWatch": {
      updates["system.skillPoints"] = skillPts + 1;
      messages.push(i18n.localize("FATHERFOG.RestKeepWatchOk"));
      break;
    }
    case "fullNight": {
      updates["system.health.value"] = Math.min(healthMax, health + 10);
      updates["system.hope.value"] = Math.min(hopeMax, hope + 10);
      messages.push(i18n.localize("FATHERFOG.RestFullNightOk"));
      // Clear exhaustion (full rest)
      await setConditionFlag(actor, "exhaustion", false);
      // Optional +1 to a stat/save chosen by player
      if (options.statBoost) {
        const path = options.statBoost; // e.g. "stats.strength.value" or "saves.body.value"
        const cur = foundry.utils.getProperty(actor.system, path.replace(/^system\./, "")) 
          ?? foundry.utils.getProperty(actor, path);
        // path like "stats.will.value"
        const sysPath = path.startsWith("system.") ? path : `system.${path}`;
        const current = Number(foundry.utils.getProperty(actor, sysPath)) || 0;
        updates[sysPath] = Math.min(75, current + 1);
        messages.push(i18n.format("FATHERFOG.RestStatBoost", { path: path, value: current + 1 }));
      }
      break;
    }
    case "halfNight": {
      // options.halfChoice: "health" | "hope" | "stat"
      const choice = options.halfChoice || "health";
      if (choice === "health") {
        updates["system.health.value"] = Math.min(healthMax, health + 10);
        messages.push(i18n.localize("FATHERFOG.RestHalfHealth"));
      } else if (choice === "hope") {
        updates["system.hope.value"] = Math.min(hopeMax, hope + 10);
        messages.push(i18n.localize("FATHERFOG.RestHalfHope"));
      } else if (choice === "stat" && options.statBoost) {
        const sysPath = options.statBoost.startsWith("system.") ? options.statBoost : `system.${options.statBoost}`;
        const current = Number(foundry.utils.getProperty(actor, sysPath)) || 0;
        updates[sysPath] = Math.min(75, current + 1);
        messages.push(i18n.format("FATHERFOG.RestStatBoost", { path: options.statBoost, value: current + 1 }));
      }
      await setConditionFlag(actor, "exhaustion", false);
      messages.push(i18n.localize("FATHERFOG.RestHalfNightOk"));
      break;
    }
    case "feveredDreams": {
      updates["system.hope.value"] = Math.max(0, hope - 10);
      // Remove one despair / addiction / other malady
      const despair = foundry.utils.deepClone(actor.system.conditions?.despair || []);
      const addiction = foundry.utils.deepClone(actor.system.conditions?.addiction || []);
      const other = foundry.utils.deepClone(actor.system.conditions?.other || []);
      let removed = null;
      if (despair.length) {
        removed = despair.pop();
        updates["system.conditions.despair"] = despair;
      } else if (addiction.length) {
        removed = addiction.pop();
        updates["system.conditions.addiction"] = addiction;
      } else if (other.length) {
        removed = other.pop();
        updates["system.conditions.other"] = other;
      }
      messages.push(i18n.localize("FATHERFOG.RestFeveredOk"));
      if (removed) messages.push(i18n.format("FATHERFOG.RestRemovedMalady", { malady: removed }));
      break;
    }
    case "roughNight": {
      updates["system.hope.value"] = Math.max(0, hope - 1);
      updates["system.health.value"] = Math.max(0, health - 1);
      await setConditionFlag(actor, "exhaustion", false);
      messages.push(i18n.localize("FATHERFOG.RestRoughOk"));
      break;
    }
    default:
      return;
  }

  if (Object.keys(updates).length) {
    await actor.update(updates);
  }

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="fatherfog-roll"><h3>${i18n.localize("FATHERFOG.RestTitle")}</h3>
      ${messages.map(m => `<p>${m}</p>`).join("")}</div>`
  });
}

/**
 * Show rest activity picker dialog.
 */
export async function restDialog(actor) {
  if (!actor) return;
  const i18n = game.i18n;

  const activity = await new Promise((resolve) => {
    new Dialog({
      title: i18n.localize("FATHERFOG.RestTitle"),
      content: `<p>${i18n.localize("FATHERFOG.RestPick")}</p>
        <ul style="font-size:0.9em;opacity:0.85;margin:0.5em 0 0 1.2em;">
          <li><strong>${i18n.localize("FATHERFOG.RestKeepWatch")}</strong> – 4h, +1 SP</li>
          <li><strong>${i18n.localize("FATHERFOG.RestFullNight")}</strong> – 8h, +10 HP, +10 Hope, +1 Stat/Save</li>
          <li><strong>${i18n.localize("FATHERFOG.RestHalfNight")}</strong> – 4h, tria: +10 HP / +10 Hope / +1 Stat</li>
          <li><strong>${i18n.localize("FATHERFOG.RestFevered")}</strong> – 8h, −10 Hope, treu 1 malaltia</li>
          <li><strong>${i18n.localize("FATHERFOG.RestRough")}</strong> – 4h, −1 Hope, −1 HP (evita Exhaustion)</li>
        </ul>`,
      buttons: {
        keepWatch: { label: i18n.localize("FATHERFOG.RestKeepWatch"), callback: () => resolve("keepWatch") },
        fullNight: { label: i18n.localize("FATHERFOG.RestFullNight"), callback: () => resolve("fullNight") },
        halfNight: { label: i18n.localize("FATHERFOG.RestHalfNight"), callback: () => resolve("halfNight") },
        feveredDreams: { label: i18n.localize("FATHERFOG.RestFevered"), callback: () => resolve("feveredDreams") },
        roughNight: { label: i18n.localize("FATHERFOG.RestRough"), callback: () => resolve("roughNight") },
        cancel: { label: i18n.localize("FATHERFOG.RollCancel"), callback: () => resolve(null) }
      },
      default: "halfNight",
      close: () => resolve(null)
    }, { width: 480 }).render(true);
  });

  if (!activity) return;

  // Secondary choices
  let options = {};
  if (activity === "fullNight" || (activity === "halfNight")) {
    if (activity === "halfNight") {
      const halfChoice = await new Promise((resolve) => {
        new Dialog({
          title: i18n.localize("FATHERFOG.RestHalfNight"),
          content: `<p>${i18n.localize("FATHERFOG.RestHalfPick")}</p>`,
          buttons: {
            health: { label: "+10 Health", callback: () => resolve("health") },
            hope: { label: "+10 Hope", callback: () => resolve("hope") },
            stat: { label: "+1 Stat/Save", callback: () => resolve("stat") },
            cancel: { label: i18n.localize("FATHERFOG.RollCancel"), callback: () => resolve(null) }
          },
          default: "health",
          close: () => resolve(null)
        }).render(true);
      });
      if (!halfChoice) return;
      options.halfChoice = halfChoice;
      if (halfChoice !== "stat") {
        await performRest(actor, activity, options);
        return;
      }
    }

    // Stat/Save boost picker (full night always, or half when chosen)
    const statBoost = await new Promise((resolve) => {
      new Dialog({
        title: i18n.localize("FATHERFOG.RestStatPick"),
        content: `<p>${i18n.localize("FATHERFOG.RestStatPickHint")}</p>`,
        buttons: {
          str: { label: i18n.localize("FATHERFOG.Strength"), callback: () => resolve("stats.strength.value") },
          int: { label: i18n.localize("FATHERFOG.Intellect"), callback: () => resolve("stats.intellect.value") },
          wil: { label: i18n.localize("FATHERFOG.Will"), callback: () => resolve("stats.will.value") },
          body: { label: i18n.localize("FATHERFOG.Body"), callback: () => resolve("saves.body.value") },
          mind: { label: i18n.localize("FATHERFOG.Mind"), callback: () => resolve("saves.mind.value") },
          spirit: { label: i18n.localize("FATHERFOG.Spirit"), callback: () => resolve("saves.spirit.value") },
          cancel: { label: i18n.localize("FATHERFOG.RollCancel"), callback: () => resolve(null) }
        },
        default: "wil",
        close: () => resolve(null)
      }).render(true);
    });
    if (!statBoost && (activity === "fullNight" || options.halfChoice === "stat")) {
      // Full night still gives HP/Hope even without stat boost
      if (activity === "fullNight") {
        await performRest(actor, activity, {});
      }
      return;
    }
    options.statBoost = statBoost;
  }

  await performRest(actor, activity, options);
}
