const { NumberField, StringField, SchemaField, HTMLField, ArrayField, BooleanField, ObjectField } = foundry.data.fields;

export class CharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      class: new SchemaField({
        value: new StringField({ required: true, initial: "worker" }),
        trait: new StringField({ initial: "" }),
        /** Which class's stat/save mods are currently baked into the numbers ("" = none yet) */
        modsApplied: new StringField({ initial: "" }),
        /** skillIds granted by the current class (removed when class changes) */
        grantedSkillIds: new ArrayField(new StringField(), { initial: [] })
      }),

      stats: new SchemaField({
        strength: new SchemaField({
          value: new NumberField({ required: true, integer: true, min: 0, max: 75, initial: 30 })
        }),
        intellect: new SchemaField({
          value: new NumberField({ required: true, integer: true, min: 0, max: 75, initial: 30 })
        }),
        will: new SchemaField({
          value: new NumberField({ required: true, integer: true, min: 0, max: 75, initial: 30 })
        })
      }),

      saves: new SchemaField({
        body: new SchemaField({
          value: new NumberField({ required: true, integer: true, min: 0, max: 75, initial: 25 })
        }),
        mind: new SchemaField({
          value: new NumberField({ required: true, integer: true, min: 0, max: 75, initial: 25 })
        }),
        spirit: new SchemaField({
          value: new NumberField({ required: true, integer: true, min: 0, max: 75, initial: 25 })
        })
      }),

      health: new SchemaField({
        value: new NumberField({ required: true, integer: true, min: 0, initial: 30 }),
        max: new NumberField({ required: true, integer: true, min: 0, initial: 30 })
      }),

      hope: new SchemaField({
        value: new NumberField({ required: true, integer: true, min: 0, initial: 100 }),
        max: new NumberField({ required: true, integer: true, min: 0, initial: 100 })
      }),

      // base = manual override; value = computed total (base + equipped armor/weapons)
      defense: new SchemaField({
        value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        base: new NumberField({ required: true, integer: true, min: 0, initial: 0 })
      }),

      cloak: new SchemaField({
        color: new StringField({ initial: "" }),
        meaning: new StringField({ initial: "" })
      }),

      brooch: new StringField({ initial: "" }),
      trinket: new StringField({ initial: "" }),

      coin: new SchemaField({
        value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        story: new StringField({ initial: "" })
      }),

      legacyArtifact: new SchemaField({
        name: new StringField({ initial: "" }),
        description: new HTMLField({ initial: "" }),
        number: new NumberField({ integer: true, min: 1, max: 100 })
      }),

      rucksack: new StringField({ initial: "" }),

      waterskin: new SchemaField({
        value: new NumberField({ required: true, integer: true, min: 0, initial: 1 }),
        max: new NumberField({ required: true, integer: true, min: 0, initial: 1 })
      }),

      rations: new SchemaField({
        value: new NumberField({ required: true, integer: true, min: 0, initial: 0 })
      }),

      skillPoints: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),

      skills: new SchemaField({
        common: new ObjectField({ initial: {} }),
        expert: new ObjectField({ initial: {} }),
        master: new ObjectField({ initial: {} }),
        unnatural: new StringField({ initial: "" })
      }),

      conditions: new SchemaField({
        despair: new ArrayField(new StringField()),
        addiction: new ArrayField(new StringField()),
        other: new ArrayField(new StringField())
      }),

      biography: new HTMLField({ initial: "" }),
      notes: new HTMLField({ initial: "" })
    };
  }

  /**
   * Derived values:
   * - Max Health = Strength
   * - Defense = base + sum of equipped armor.defense + weapons that grantDefense
   */
  prepareDerivedData() {
    super.prepareDerivedData();

    // Max Health is always derived from Strength.
    // Do NOT mutate health.value here — that can fight sheet/combat updates
    // and make damage appear to "not stick".
    const str = Number(this.stats?.strength?.value) || 30;
    this.health.max = str;

    // Defense from equipped items (derived)
    let totalDefense = Number(this.defense?.base) || 0;

    if (this.parent?.items) {
      for (const item of this.parent.items) {
        if (!item.system?.equipped) continue;

        if (item.type === "armor") {
          totalDefense += Number(item.system.defense) || 0;
        }
        if (item.type === "weapon" && item.system.grantsDefense) {
          totalDefense += Number(item.system.grantsDefense) || 0;
        }
      }
    }

    this.defense.value = totalDefense;
  }
}


/**
 * NPC / enemy data model – full mechanical support.
 * Matches Guide section samples: Health, attacks (base + Bits),
 * optional Stats/Saves, Defense, Motive, Trick, special abilities.
 */
export class NpcData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      // Optional class-like label (Bandit, Troll, Fog Beast…)
      category: new StringField({ initial: "" }),

      stats: new SchemaField({
        strength: new SchemaField({
          value: new NumberField({ required: true, integer: true, min: 0, max: 100, initial: 30 })
        }),
        intellect: new SchemaField({
          value: new NumberField({ required: true, integer: true, min: 0, max: 100, initial: 25 })
        }),
        will: new SchemaField({
          value: new NumberField({ required: true, integer: true, min: 0, max: 100, initial: 30 })
        })
      }),

      saves: new SchemaField({
        body: new SchemaField({
          value: new NumberField({ required: true, integer: true, min: 0, max: 100, initial: 25 })
        }),
        mind: new SchemaField({
          value: new NumberField({ required: true, integer: true, min: 0, max: 100, initial: 25 })
        }),
        spirit: new SchemaField({
          value: new NumberField({ required: true, integer: true, min: 0, max: 100, initial: 25 })
        })
      }),

      health: new SchemaField({
        value: new NumberField({ required: true, integer: true, min: 0, initial: 30 }),
        max: new NumberField({ required: true, integer: true, min: 0, initial: 30 })
      }),

      // Optional – some NPCs may track Hope / morale
      hope: new SchemaField({
        value: new NumberField({ required: true, integer: true, min: 0, initial: 50 }),
        max: new NumberField({ required: true, integer: true, min: 0, initial: 50 })
      }),

      defense: new SchemaField({
        value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        base: new NumberField({ required: true, integer: true, min: 0, initial: 0 })
      }),

      // Hearts (rules p.46): max hearts; current tracks wounds this fight
      // Every 10 damage in a single round = 1 Heart lost; remainder does not carry over
      hearts: new NumberField({ required: true, integer: true, min: 0, max: 20, initial: 1 }),
      heartsCurrent: new NumberField({ integer: true, min: 0, max: 20, initial: null, nullable: true }),

      // Attacks: { id: { name, damage, notes, ignoresArmor } }
      // damage is the base number before Bits (e.g. 10, 15, 20)
      attacks: new ObjectField({ initial: {} }),

      // Threshold abilities: activate when Health drops to certain hearts
      // { id: { atHearts, name, description } }
      abilities: new ObjectField({ initial: {} }),

      motive: new StringField({ initial: "" }),
      trick: new StringField({ initial: "" }),

      biography: new HTMLField({ initial: "" }),
      notes: new HTMLField({ initial: "" })
    };
  }

  prepareDerivedData() {
    super.prepareDerivedData();

    // If max health not set manually relative to hearts, leave as-is.
    // Defense from equipped items if any
    let totalDefense = this.defense.base ?? 0;
    if (this.parent?.items) {
      for (const item of this.parent.items) {
        if (!item.system?.equipped) continue;
        if (item.type === "armor") {
          totalDefense += Number(item.system.defense) || 0;
        }
        if (item.type === "weapon" && item.system.grantsDefense) {
          totalDefense += Number(item.system.grantsDefense) || 0;
        }
      }
    }
    this.defense.value = totalDefense;

    // Do not mutate health.value here (same reason as CharacterData).
  }
}
