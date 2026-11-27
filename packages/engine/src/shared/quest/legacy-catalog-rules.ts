const legacyRulePaths: Readonly<Record<string, readonly string[]>> = {
  actor_damage_bonus: ["actorDamage"],
  allies_stress: ["alliesStress"],
  bleed_blight_transfer: ["transfer"],
  buff_defence: ["buffDefence"],
  condition_defence: ["conditionDefence"],
  damage_bonus: ["damage"],
  damage_bonuses: ["damageBonuses"],
  effect_line_receipts: ["receipts"],
  higher_condition_defence: ["higherConditionDefence"],
  monster_effects: ["effects"],
  rallying_flare: ["rallyingFlare"],
  range: ["range"],
  self_heal: ["self", "heal"],
  self_range: ["self", "range"],
  self_stress: ["self", "stress"],
  status_effects: ["statuses"],
  target_header: ["target", "header"],
  target_heal: ["target", "heal"],
  target_stress: ["target", "stress"],
  target_support: ["target", "support"],
  turn_start: ["turnStart"],
  weald_attack: ["wealdAttack"],
  weald_profile: ["wealdProfile"],
};

type RecordView = Readonly<Record<string, unknown>>;
const record = (value: unknown): RecordView | undefined =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as RecordView) : undefined;

function at(value: unknown, path: readonly string[]): unknown {
  return path.reduce<unknown>((node, key) => record(node)?.[key], value);
}

export function upgradeLegacyCatalogRules(
  snapshot: unknown,
  replay: unknown,
  equal: (old: unknown, current: unknown) => boolean,
  legacyIds: boolean,
): unknown {
  const upgradeRows = (old: unknown, current: unknown): unknown => {
    if (!Array.isArray(old) || !Array.isArray(current) || old.length !== current.length) return old;
    return old.map((value, index) => upgradeCard(value, current[index]));
  };

  const upgradeCard = (old: unknown, current: unknown): unknown => {
    const before = record(old);
    const after = record(current);
    if (!before || !after || before.id !== after.id || before.name !== after.name) return old;
    const supplied = record(before.rules);
    if (!legacyIds) {
      const verified = record(after.rules);
      if (!supplied || !verified || "directAttack" in supplied || !("directAttack" in verified))
        return old;
      const { directAttack: _attack, ...previousRules } = verified;
      void _attack;
      return equal(supplied, previousRules) ? { ...before, rules: verified } : old;
    }
    if (
      "rules" in before &&
      (!supplied ||
        Object.entries(supplied).some(([key, field]) => !equal(field, record(after.rules)?.[key])))
    )
      return old;

    const next = { ...before };
    for (const [key, field] of Object.entries(before)) {
      if (!key.startsWith("verified_")) continue;
      const path = legacyRulePaths[key.slice("verified_".length)];
      if (!path || !equal(field, at(after.rules, path))) return old;
      delete next[key];
    }
    if (after.rules !== undefined) next.rules = after.rules;
    if (Array.isArray(before.skills)) next.skills = upgradeRows(before.skills, after.skills);
    return next;
  };

  // Only catalogue records are eligible. All remaining snapshot fields still compare verbatim.
  const upgradeFields = (
    old: unknown,
    current: unknown,
    transform: Readonly<Record<string, (a: unknown, b: unknown) => unknown>>,
  ): unknown => {
    const before = record(old);
    const after = record(current);
    if (!before || !after) return old;
    const result = { ...before };
    for (const [key, upgrade] of Object.entries(transform))
      if (key in before) result[key] = upgrade(before[key], after[key]);
    return result;
  };
  const catalog = (old: unknown, current: unknown) =>
    upgradeFields(old, current, {
      heroStats: upgradeRows,
      skills: upgradeRows,
      monsters: upgradeRows,
    });
  const upgradeBattle = (old: unknown, current: unknown): unknown =>
    upgradeFields(catalog(old, current), current, {
      resolveCards: upgradeRows,
      skillPrefix: (old, current) => upgradeFields(old, current, { original: upgradeBattle }),
      pending: (old, current) =>
        upgradeFields(old, current, {
          prefix: (old, current) => upgradeFields(old, current, { original: upgradeBattle }),
        }),
    });
  const upgradeGame = (old: unknown, current: unknown): unknown =>
    upgradeFields(old, current, {
      dungeon: (old, current) =>
        upgradeFields(old, current, { battleCatalog: catalog, resolveCards: upgradeRows }),
      battle: upgradeBattle,
      trinketChoice: (old, current) => upgradeFields(old, current, { original: upgradeGame }),
    });
  return upgradeGame(snapshot, replay);
}
