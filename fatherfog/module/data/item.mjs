const { NumberField, StringField, SchemaField, HTMLField, BooleanField } = foundry.data.fields;

class BaseItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new HTMLField({ initial: "" }),
      quantity: new NumberField({ required: true, integer: true, min: 0, initial: 1 }),
      weight: new NumberField({ required: true, min: 0, initial: 0 }),
      price: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      availability: new NumberField({ required: true, integer: true, min: 0, max: 100, initial: 80 }),
      equipped: new BooleanField({ initial: false }),
      special: new StringField({ initial: "" })
    };
  }
}

/**
 * Weapon data model – maps directly to the Melee / Ranged tables of Fatherfog.
 *
 * damageType values (applied to the *successful Will Check roll total*, rules p.35):
 *   "wil"      → DMG = roll total
 *   "wil+10"   → DMG = roll total + 10
 *   "wil+20"   → DMG = roll total + 20
 *   "wil-10"   → DMG = roll total − 10 (Surgical Knife, Whip)
 *   "wilx10"   → DMG = roll total × 10 (bombs)
 *   "bit"      → only Bits of the roll (unarmed)
 *   "none"     → no damage (net, etc.)
 *
 * Example (Hand Weapon, wil): succeed with 31 → 31 damage.
 */
export class WeaponData extends BaseItemData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      damageType: new StringField({ required: true, initial: "wil" }),
      damageBonus: new NumberField({ integer: true, initial: 0 }),
      weaponType: new StringField({ required: true, initial: "melee" }), // melee | ranged | thrown
      hands: new NumberField({ required: true, integer: true, min: 1, max: 2, initial: 1 }),
      reload: new NumberField({ integer: true, min: 0, initial: 0 }), // rounds needed to reload
      ignoresArmor: new BooleanField({ initial: false }),
      advantageOnCombat: new BooleanField({ initial: false }),
      disadvantageOnCombat: new BooleanField({ initial: false }),
      closeQuartersOnly: new BooleanField({ initial: false }),
      grantsDefense: new NumberField({ integer: true, min: 0, initial: 0 }), // Staff +1 Defense
      skillBonus: new StringField({ initial: "" }) // e.g. "Tinkering +5%"
    };
  }

  /**
   * Damage from a successful Will Check.
   * @param {number} rollTotal  The d100 result that succeeded (e.g. 31).
   * @param {number} [bits=0]   Units digit of the roll (for unarmed / "bit").
   * @returns {number}
   */
  getAttackDamage(rollTotal = 0, bits = 0) {
    const total = Number(rollTotal) || 0;
    const b = Number(bits) || 0;
    const extra = Number(this.damageBonus) || 0;
    switch (this.damageType) {
      case "wil":
        return Math.max(0, total + extra);
      case "wil+10":
        return Math.max(0, total + 10 + extra);
      case "wil+20":
        return Math.max(0, total + 20 + extra);
      case "wil-10":
        return Math.max(0, total - 10 + extra);
      case "wilx10":
        return Math.max(0, total * 10 + extra);
      case "bit":
        return Math.max(0, b + extra);
      case "none":
        return 0;
      default:
        return Math.max(0, total + extra);
    }
  }

  /**
   * @deprecated Use getAttackDamage(rollTotal, bits). Kept so old call sites don't crash.
   * Previously treated WIL as the character's Will *stat*; that contradicted p.35.
   */
  getBaseDamage(willValue = 0) {
    return this.getAttackDamage(willValue, 0);
  }
}

export class ArmorData extends BaseItemData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      defense: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      stealthPenalty: new BooleanField({ initial: false }),
      runningPenalty: new BooleanField({ initial: false }),
      loud: new BooleanField({ initial: false })
    };
  }
}

export class EquipmentData extends BaseItemData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      type: new StringField({ initial: "general" }), // general | tool | consumable | light
      uses: new NumberField({ integer: true, min: 0, initial: 0 }),
      maxUses: new NumberField({ integer: true, min: 0, initial: 0 })
    };
  }
}

export class SkillData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new HTMLField({ initial: "" }),
      rank: new StringField({ required: true, initial: "common" }),
      bonus: new NumberField({ required: true, integer: true, initial: 10 }),
      stat: new StringField({ initial: "" }),
      prerequisite: new StringField({ initial: "" })
    };
  }
}

export class LegacyData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new HTMLField({ initial: "" }),
      number: new NumberField({ integer: true, min: 1, max: 100 }),
      effect: new HTMLField({ initial: "" }),
      isSecret: new BooleanField({ initial: true })
    };
  }
}

export class FlavorItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new HTMLField({ initial: "" }),
      meaning: new StringField({ initial: "" })
    };
  }
}
