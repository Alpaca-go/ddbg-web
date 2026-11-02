import { distance, rejectBattleCommand, type BattleEntity, type BattleState } from "../battle";
import type { ApplyResult, GameState } from "../command";
import { finishTurn } from "../encounter";
import type { SkillStance } from "../hero-skill";
import { readPrintedTargets } from "../hero-skill";
import type { MonsterCardView } from "../monster-skill";
import { readMonsterAttackView } from "../monster-skill";
import { selectMonsterTarget, type MonsterTargetHero } from "../monster-target";
import { passiveStress } from "../passive";
import { createRng } from "../rng";
import { readBossCombatEntry } from "./combat-entry";
import { resolveEncounterBossScriptId } from "./encounter-rules";
import { getBossScript } from "./registry";
import { DARKEST_SHUFFLING_HORROR_SCRIPT_ID } from "./darkest-mid-boss-scripts";

export const SHUFFLING_HORROR_COMBAT_MONSTER_CARD_ID = "monster_large:p017" as const;

export const SHUFFLING_HORROR_ECHOING_DISASSEMBLY_SKILL_SLOT = 3 as const;
export const SHUFFLING_HORROR_ECHOING_STRESS_AMOUNT = 2 as const;
export const SHUFFLING_HORROR_ECHOING_LIGHT_DELTA = -1 as const;

export const SHUFFLING_HORROR_ECHOING_SUMMON_CARD_IDS = [
  "monster_medium:p072",
  "monster_medium:p075",
] as const;

const STANCE_ORDER: readonly SkillStance[] = ["aggressive", "defensive", "ranged", "support"];
const heroStances = STANCE_ORDER;

function clampBattleLight(light: number): number {
  return Math.max(0, Math.min(5, light + SHUFFLING_HORROR_ECHOING_LIGHT_DELTA));
}

function selectEchoingDisassemblyPrimaryTarget(
  state: GameState,
  battle: BattleState,
  actor: BattleEntity,
): { readonly targetId: string; readonly areaId: string } | ApplyResult {
  const card = readMonsterCard(state, battle, actor.monsterCardId!);
  if (!card) return rejectBattleCommand(state, "Echoing Disassembly 战斗目录缺失（R-048）");
  const attack = readMonsterAttackView(card, SHUFFLING_HORROR_ECHOING_DISASSEMBLY_SKILL_SLOT);
  if (attack.status === "refused") return rejectBattleCommand(state, attack.reason);
  const heroes: MonsterTargetHero[] = [];
  for (const hero of battle.entities.filter((entry) => entry.side === "hero" && !entry.dead)) {
    if (
      !battle.areas.some((area) => area.id === actor.areaId) ||
      !battle.areas.some((area) => area.id === hero.areaId)
    )
      return rejectBattleCommand(state, "角色区域不在已核实几何内（R-048）");
    heroes.push({
      id: hero.id,
      areaId: hero.areaId,
      stance: hero.stance!,
      areaDistance: distance(battle.areas, actor.areaId, hero.areaId),
      wounds: hero.wounds,
      stress: hero.stress!,
      markStacks: hero.markStacks ?? 0,
      guard: hero.guard,
      dead: hero.dead,
    });
  }
  const picked = selectMonsterTarget(
    {
      verification: card.verification,
      skills: card.skills.map((skill) => ({ slot: skill.slot, target: skill.target ?? null })),
    },
    SHUFFLING_HORROR_ECHOING_DISASSEMBLY_SKILL_SLOT,
    heroes,
  );
  if (picked.status === "refused") return rejectBattleCommand(state, picked.reason);
  if (picked.status === "noFiniteTarget")
    return rejectBattleCommand(
      state,
      "Echoing Disassembly：无卡面目标优先级下的有限距离英雄（R-048）",
    );
  const primary = battle.entities.find((entry) => entry.id === picked.targetId);
  if (!primary?.areaId)
    return rejectBattleCommand(state, "Echoing Disassembly：Crowded 目标缺少区域（R-048）");
  return { targetId: picked.targetId, areaId: primary.areaId };
}

function crowdedStressTargets(battle: BattleState, areaId: string, max: number): BattleEntity[] {
  const candidates = battle.entities.filter(
    (entity) => entity.side === "hero" && !entity.dead && entity.areaId === areaId,
  );
  return [...candidates]
    .sort(
      (a, b) =>
        Number(b.guard) - Number(a.guard) ||
        heroStances.indexOf(a.stance!) - heroStances.indexOf(b.stance!),
    )
    .slice(0, max);
}

function applyEchoingDisassemblyTargetEffects(
  state: GameState,
  battle: BattleState,
  actor: BattleEntity,
): { readonly battle: BattleState } | ApplyResult {
  const card = readMonsterCard(state, battle, actor.monsterCardId!);
  if (
    !card?.skills.find((entry) => entry.slot === SHUFFLING_HORROR_ECHOING_DISASSEMBLY_SKILL_SLOT)
      ?.verified_monster_effects
  )
    return { battle };
  const targetPick = selectEchoingDisassemblyPrimaryTarget(state, battle, actor);
  if ("events" in targetPick) return targetPick;
  const attack = readMonsterAttackView(card, SHUFFLING_HORROR_ECHOING_DISASSEMBLY_SKILL_SLOT);
  if (attack.status === "refused") return rejectBattleCommand(state, attack.reason);
  const printedTargets = readPrintedTargets(attack.view);
  if (printedTargets.kind !== "exact")
    return rejectBattleCommand(state, "Echoing Disassembly 缺少已核实目标数（R-048）");
  const stressedIds = new Set(
    crowdedStressTargets(battle, targetPick.areaId, printedTargets.max).map((hero) => hero.id),
  );
  const light = clampBattleLight(battle.light);
  const entities = battle.entities.map((entity) => {
    if (!stressedIds.has(entity.id)) return entity;
    const delta = passiveStress(entity, SHUFFLING_HORROR_ECHOING_STRESS_AMOUNT, battle.light);
    return { ...entity, stress: (entity.stress ?? 0) + delta.amount };
  });
  return { battle: { ...battle, entities, light } };
}

export const DARKEST_MID_BOSS_HERO_STANCE_AREAS: Readonly<Record<SkillStance, string>> = {
  aggressive: "darkest-mid-boss-hero-aggressive",
  defensive: "darkest-mid-boss-hero-defensive",
  ranged: "darkest-mid-boss-hero-ranged",
  support: "darkest-mid-boss-hero-support",
};

/** 占位区域；专属 Room Tile 几何仍 hold（R-048）。 */
export const DARKEST_MID_BOSS_MONSTER_STANCE_AREAS: Readonly<Record<SkillStance, string>> = {
  aggressive: "darkest-mid-boss-aggressive",
  defensive: "darkest-mid-boss-defensive",
  ranged: "darkest-mid-boss-ranged",
  support: "darkest-mid-boss-support",
};

export function isShufflingHorrorMidBossBattle(state: GameState): boolean {
  return resolveEncounterBossScriptId(state) === DARKEST_SHUFFLING_HORROR_SCRIPT_ID;
}

function livingHeroes(battle: BattleState): BattleEntity[] {
  return battle.entities
    .filter(
      (entity) =>
        entity.side === "hero" &&
        !entity.dead &&
        entity.stance &&
        STANCE_ORDER.includes(entity.stance),
    )
    .sort(
      (a, b) =>
        STANCE_ORDER.indexOf(a.stance!) - STANCE_ORDER.indexOf(b.stance!) ||
        a.id.localeCompare(b.id),
    );
}

function livingMonsters(battle: BattleState): BattleEntity[] {
  return battle.entities.filter((entity) => entity.side === "monster" && !entity.dead);
}

function shufflingHorrorActor(
  state: GameState,
  actorId: string,
  skillLabel: string,
): { readonly battle: BattleState; readonly actor: BattleEntity } | ApplyResult {
  const battle = state.battle;
  if (!battle) return rejectBattleCommand(state, "尚未创建战斗沙盒");
  if (!isShufflingHorrorMidBossBattle(state))
    return rejectBattleCommand(
      state,
      `${skillLabel} 仅适用于 Shuffling Horror 最暗中途 Boss 战（R-048）`,
    );
  const script = getBossScript(DARKEST_SHUFFLING_HORROR_SCRIPT_ID);
  const entry = script ? readBossCombatEntry(script) : undefined;
  if (!entry || entry.combatMonsterCardId !== SHUFFLING_HORROR_COMBAT_MONSTER_CARD_ID)
    return rejectBattleCommand(state, "Shuffling Horror 战斗入口未声明（R-048）");
  const turn = battle.encounter?.turn;
  if (turn?.type !== "monster" || turn.actorId !== actorId)
    return rejectBattleCommand(
      state,
      `${skillLabel} 须于 Shuffling Horror 怪物回合执行（boss_ability:p033）`,
    );
  const actor = battle.entities.find((entity) => entity.id === actorId);
  if (
    !actor ||
    actor.side !== "monster" ||
    actor.dead ||
    actor.monsterCardId !== SHUFFLING_HORROR_COMBAT_MONSTER_CARD_ID
  )
    return rejectBattleCommand(state, `仅 Shuffling Horror 实体可执行 ${skillLabel}（R-048）`);
  return { battle, actor };
}

function shuffleHeroIds(
  seed: number,
  cursor: number,
  heroIds: readonly string[],
): { readonly order: string[]; readonly cursor: number } {
  const order = [...heroIds];
  let nextCursor = cursor;
  for (let i = order.length - 1; i > 0; i -= 1) {
    const rng = createRng(seed);
    for (let index = 0; index < nextCursor; index += 1) rng.next();
    const j = Math.floor(rng.next() * (i + 1));
    nextCursor += 1;
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return { order, cursor: nextCursor };
}

function occupiedMonsterStanceIndexes(battle: BattleState): Set<number> {
  const occupied = new Set<number>();
  for (const entity of livingMonsters(battle)) {
    const start = STANCE_ORDER.indexOf(entity.stance!);
    if (start < 0) continue;
    const width = entity.stanceSlots ?? 1;
    for (let slot = start; slot < start + width; slot += 1) occupied.add(slot);
  }
  return occupied;
}

function allMonsterStanceSlotsFilled(battle: BattleState): boolean {
  const occupied = occupiedMonsterStanceIndexes(battle);
  for (let slot = 0; slot < STANCE_ORDER.length; slot += 1) {
    if (!occupied.has(slot)) return false;
  }
  return true;
}

function pickOpenMonsterStance(occupied: Set<number>, width: 1 | 2): SkillStance | undefined {
  for (const stance of STANCE_ORDER) {
    const start = STANCE_ORDER.indexOf(stance);
    if (start + width > STANCE_ORDER.length) continue;
    let fits = true;
    for (let slot = start; slot < start + width; slot += 1) {
      if (occupied.has(slot)) fits = false;
    }
    if (fits) return stance;
  }
  return undefined;
}

function readMonsterCard(
  state: GameState,
  battle: BattleState,
  cardId: string,
): (MonsterCardView & { readonly dodge?: number; readonly life?: number }) | undefined {
  const fromBattle = battle.monsters?.find((entry) => entry.id === cardId);
  if (fromBattle)
    return fromBattle as MonsterCardView & { readonly dodge?: number; readonly life?: number };
  return state.dungeon?.battleCatalog?.monsters.find((entry) => entry.id === cardId) as
    (MonsterCardView & { readonly dodge?: number; readonly life?: number }) | undefined;
}

function readMonsterSpawnMeta(
  state: GameState,
  battle: BattleState,
  cardId: string,
): { readonly stanceSlots: 1 | 2 } | undefined {
  const card = readMonsterCard(state, battle, cardId);
  const tags = card?.type_position_tags;
  if (!tags?.length) return undefined;
  return { stanceSlots: tags.includes("Large") ? 2 : 1 };
}

function readMonsterDodge(card: MonsterCardView & { readonly dodge?: number }): number | undefined {
  if (Number.isSafeInteger(card.dodge) && card.dodge! >= 0) return card.dodge!;
  const printed = card.header_unlabeled_numbers?.find(
    (entry) => entry.anchor.type === "beside_icon" && entry.anchor.inside_icon?.key === "dodge",
  )?.numeric;
  return Number.isSafeInteger(printed) && printed! >= 0 ? printed! : undefined;
}

function monsterInPlay(battle: BattleState, cardId: string): boolean {
  return livingMonsters(battle).some((entity) => entity.monsterCardId === cardId);
}

/** boss_ability:p033：洗混全部英雄姿态牌，从 front（aggressive）起随机放回。 */
export function applyShufflingHorrorUndulations(state: GameState, actorId: string): ApplyResult {
  const resolved = shufflingHorrorActor(state, actorId, "Undulations");
  if ("events" in resolved) return resolved;
  const { battle } = resolved;
  const heroes = livingHeroes(battle);
  if (!heroes.length) return rejectBattleCommand(state, "Undulations：场上无可用英雄姿态（R-048）");
  const { order, cursor } = shuffleHeroIds(
    state.seed,
    battle.rngCursor,
    heroes.map((hero) => hero.id),
  );
  const assignment = new Map<string, { readonly stance: SkillStance; readonly areaId: string }>();
  for (let index = 0; index < order.length; index += 1) {
    const stance = STANCE_ORDER[index]!;
    assignment.set(order[index]!, {
      stance,
      areaId: DARKEST_MID_BOSS_HERO_STANCE_AREAS[stance],
    });
  }
  const entities = battle.entities.map((entity) => {
    const next = assignment.get(entity.id);
    return next ? { ...entity, stance: next.stance, areaId: next.areaId } : entity;
  });
  const nextBattle = {
    ...battle,
    entities,
    rngCursor: cursor,
    monsterAction: null,
  };
  return finishTurn({ ...state, battle: nextBattle }, actorId, [
    {
      type: "dungeonUpdated",
      message: `Shuffling Horror · Undulations：${order.join("→")} 自 front 重排英雄姿态（boss_ability:p033；Room Tile / combatReady 仍 hold）`,
    },
  ]);
}

/** boss_ability:p033：怪物姿态轨未满时召唤 Cultist Priest / Malignant Growth（已在场则跳过）。 */
export function applyShufflingHorrorEchoingDisassembly(
  state: GameState,
  actorId: string,
): ApplyResult {
  const resolved = shufflingHorrorActor(state, actorId, "Echoing Disassembly");
  if ("events" in resolved) return resolved;
  let battle = resolved.battle;
  const { actor } = resolved;
  const lightBefore = battle.light;
  if (allMonsterStanceSlotsFilled(battle))
    return rejectBattleCommand(
      state,
      "Echoing Disassembly：怪物姿态轨已满，不能使用该技能（boss_ability:p033）",
    );

  const effectApplied = applyEchoingDisassemblyTargetEffects(state, battle, actor);
  if ("events" in effectApplied) return effectApplied;
  battle = effectApplied.battle;

  const occupied = occupiedMonsterStanceIndexes(battle);
  const summoned: string[] = [];
  const skipped: string[] = [];
  const entities = [...battle.entities];
  let choiceSerial = battle.choiceCursor;

  for (const cardId of SHUFFLING_HORROR_ECHOING_SUMMON_CARD_IDS) {
    if (monsterInPlay(battle, cardId)) {
      skipped.push(cardId);
      continue;
    }
    const meta = readMonsterSpawnMeta(state, battle, cardId);
    if (!meta) return rejectBattleCommand(state, `${cardId} 缺少目录占格，不能伪造召唤（R-048）`);
    const stance = pickOpenMonsterStance(occupied, meta.stanceSlots);
    if (!stance) {
      return rejectBattleCommand(
        state,
        `Echoing Disassembly：${cardId} 无可用怪物姿态占位（darkest-mid-boss-* 占位；R-048）`,
      );
    }
    const card = readMonsterCard(state, battle, cardId);
    if (!card || !Number.isInteger(card.life) || card.life < 1)
      return rejectBattleCommand(state, `${cardId} 缺少 Life 或战斗目录条目（R-048）`);
    const dodge = readMonsterDodge(card);
    if (dodge === undefined)
      return rejectBattleCommand(state, `${cardId} 缺少已核实 Dodge，保留 hold（R-048）`);
    const start = STANCE_ORDER.indexOf(stance);
    for (let slot = start; slot < start + meta.stanceSlots; slot += 1) occupied.add(slot);
    const entity: BattleEntity = {
      id: `shuffling-echoing:${cardId}:${choiceSerial}`,
      side: "monster",
      hero: null,
      monsterCardId: cardId,
      life: card.life,
      dodge,
      areaId: DARKEST_MID_BOSS_MONSTER_STANCE_AREAS[stance],
      stance,
      stanceSlots: meta.stanceSlots,
      wounds: 0,
      skillIds: [],
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
      ...(card.innateProtection === undefined
        ? {}
        : { innateProtection: card.innateProtection, protection: card.innateProtection }),
    };
    choiceSerial += 1;
    entities.push(entity);
    summoned.push(cardId);
    battle = { ...battle, entities };
  }

  const parts = [
    summoned.length ? `召唤 ${summoned.join("、")}` : undefined,
    skipped.length ? `跳过已在场 ${skipped.join("、")}` : undefined,
    battle.light !== lightBefore
      ? `Torch ${SHUFFLING_HORROR_ECHOING_LIGHT_DELTA}（${battle.light}）`
      : undefined,
  ].filter(Boolean);
  const nextBattle = {
    ...battle,
    entities,
    choiceCursor: choiceSerial,
    monsterAction: null,
  };
  return finishTurn({ ...state, battle: nextBattle }, actorId, [
    {
      type: "dungeonUpdated",
      message: `Shuffling Horror · Echoing Disassembly：${parts.join("；")}（boss_ability:p033；占位区域 / combatReady 仍 hold）`,
    },
  ]);
}

export type ApplyShufflingHorrorUndulationsCommand = {
  readonly type: "applyShufflingHorrorUndulations";
  readonly actorId: string;
};

export type ApplyShufflingHorrorEchoingDisassemblyCommand = {
  readonly type: "applyShufflingHorrorEchoingDisassembly";
  readonly actorId: string;
};
