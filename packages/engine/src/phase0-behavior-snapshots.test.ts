/**
 * Phase 0 行为基线快照（PLAN-2026-11-23-icon-semantics-decoupling §Phase 0）。
 * 只冻结当前命令回放结果；不改产品逻辑。夹具风格对齐 encounter / four-core / cove-skills。
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { loadNormalizedCorebox } from "../../data/src/normalize/write";
import { applyCommand, createBattleState } from "./index";
import type {
  BattleEntity,
  BattleSetup,
  Command,
  GameEvent,
  GameState,
  HeroSkillCardView,
  SkillStance,
} from "./index";
import { heroSkillUsesSelfTarget, readPrintedRange, readPrintedTargets } from "./hero-skill";

const data = loadNormalizedCorebox();
const clean = <T>(v: unknown): T => JSON.parse(JSON.stringify(v));

function card(id: string): HeroSkillCardView & {
  hero: string;
  name: string;
  level: number;
  top_row_icons: readonly { key: string | null }[];
} {
  return clean(data.hero_skill.cards.find((c) => c.id === id)!) as HeroSkillCardView & {
    hero: string;
    name: string;
    level: number;
    top_row_icons: readonly { key: string | null }[];
  };
}

function soldier() {
  const monster = data.monster_medium.cards.find((c) => c.id === "monster_medium:p001")!;
  if (!("life" in monster)) throw new Error("测试需要已核实 Bone Soldier");
  return clean<NonNullable<BattleSetup["monsters"]>[number] & { life: number }>(monster);
}

/** 与 ii-natural-replay 同类的战斗进度摘要，用于稳定 hash。 */
function progress(s: GameState) {
  const b = s.battle!;
  return {
    seed: s.seed,
    rngCursor: b.rngCursor,
    light: b.light,
    entities: b.entities.map((e) => ({
      id: e.id,
      side: e.side,
      areaId: e.areaId,
      stance: e.stance,
      wounds: e.wounds,
      stress: e.stress,
      dead: e.dead,
      dodge: e.dodge,
      guard: e.guard,
      life: e.life,
      hero: e.hero,
      monsterCardId: e.monsterCardId,
      skillIds: e.skillIds,
      bleed: e.bleed,
      blight: e.blight,
      statusStacks: e.statusStacks,
      form: e.form,
    })),
    encounter: b.encounter
      ? {
          deck: b.encounter.deck,
          actedIds: b.encounter.actedIds,
          turn: b.encounter.turn,
        }
      : null,
    pending: b.pending,
    conditions: b.conditions,
    shuffleIntents: b.shuffleIntents,
  };
}

function stateHash(s: GameState): string {
  return createHash("sha256")
    .update(JSON.stringify(progress(s)))
    .digest("hex");
}

function ok(
  state: GameState,
  command: Command,
): { state: GameState; events: readonly GameEvent[] } {
  const result = applyCommand(state, command);
  expect(
    result.events.filter((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toEqual([]);
  return { state: result.state, events: result.events };
}

function replay(initial: GameState, commands: readonly Command[]) {
  let state = initial;
  const eventTypes: string[] = [];
  for (const command of commands) {
    const step = ok(state, command);
    state = step.state;
    eventTypes.push(...step.events.map((e) => e.type));
  }
  return { state, eventTypes, hash: stateHash(state) };
}

function litStance(skill: { top_row_icons: readonly { key: string | null }[] }): SkillStance {
  const lit = skill.top_row_icons.find((icon) => /^stance_.*_lit$/.test(icon.key ?? ""));
  return (lit?.key?.replace(/^stance_|_lit$/g, "") ?? "aggressive") as SkillStance;
}

function skillBattle(
  skill: ReturnType<typeof card>,
  seed: number,
  heroStatId: string,
  opts: { heroLevel?: number; light?: number } = {},
): { state: GameState; play: Command } {
  const heroStat = clean<NonNullable<BattleSetup["heroStats"]>[number] & { dodge: number }>(
    data.hero_stat.cards.find((c) => c.id === heroStatId)!,
  );
  const range = readPrintedRange(skill);
  const targets = readPrintedTargets(skill);
  const distance =
    range.kind === "exact" ? range.distance : range.kind === "interval" ? range.min : 0;
  const targetArea = ["a", "b", "c"][distance]!;
  const stance = litStance(skill);
  const self = heroSkillUsesSelfTarget(skill);
  const friendly =
    self ||
    (skill.stats_line ?? skill.effect_lines[0] ?? []).some(
      (s) =>
        s.type === "icon" && ["target_hero", "target_hero_or_monster"].includes(s.icon.key ?? ""),
    );
  const count = targets.kind === "exact" ? targets.max : 1;
  const monster = soldier();
  const common = {
    wounds: 0,
    guard: false,
    dead: false,
    bleed: [] as string[],
    blight: [] as string[],
    statusStacks: [] as const,
  };
  // 与 cove-skills / core-higher-skills 一致：实体只放已核实属性面英雄 + 目标。
  const entities: BattleEntity[] = [
    {
      ...common,
      id: "h0",
      side: "hero",
      hero: skill.hero,
      heroStatId,
      heroLevel: opts.heroLevel ?? skill.level,
      life: heroStat.life,
      dodge: heroStat.dodge,
      stress: 3,
      areaId: "a",
      stance,
      skillIds: [skill.id],
    },
  ];
  if (friendly && !self) {
    entities.push({
      ...common,
      id: "h1",
      side: "hero",
      hero: skill.hero,
      heroStatId,
      heroLevel: opts.heroLevel ?? skill.level,
      life: heroStat.life,
      dodge: heroStat.dodge,
      stress: 4,
      areaId: targetArea,
      stance: "support",
      skillIds: [],
    });
  }
  for (let i = 0; i < Math.max(friendly ? 0 : count, friendly ? 0 : 1); i++) {
    entities.push({
      ...common,
      id: `m${i}`,
      side: "monster",
      hero: null,
      monsterCardId: monster.id,
      life: monster.life,
      dodge: 0,
      areaId: targetArea,
      stance: (["aggressive", "defensive", "ranged"] as const)[i % 3]!,
      stanceSlots: 1,
      skillIds: [],
    });
  }
  const state = createBattleState(seed, {
    heroStats: [heroStat],
    monsters: friendly && !self ? [] : [monster],
    skills: [skill],
    entities,
    light: opts.light ?? 5,
    areas: [
      { id: "a", elevation: "normal", adjacent: ["b"], capacity: 12 },
      { id: "b", elevation: "normal", adjacent: ["a", "c"], capacity: 12 },
      { id: "c", elevation: "normal", adjacent: ["b"], capacity: 12 },
    ],
  });
  const ids = self
    ? ["h0"]
    : Array.from({ length: count }, (_, i) => (friendly ? `h${Math.min(i + 1, 1)}` : `m${i}`));
  const play: Command =
    count > 1
      ? { type: "playHeroSkillTargets", actorId: "h0", skillId: skill.id, targetIds: ids }
      : { type: "playHeroSkill", actorId: "h0", skillId: skill.id, targetId: ids[0]! };
  return { state, play };
}

/** 核心遭遇：开战 + 抽到英雄回合 + 打出 Smite I（完整一轮英雄行动）。 */
function coreCombatRound(seed: number) {
  const smite = card("hero_skill:core:h01:p001");
  const stances: readonly SkillStance[] = ["aggressive", "defensive", "ranged", "support"];
  const heroes: BattleEntity[] = stances.map((stance, index) => ({
    id: `h${index}`,
    side: "hero",
    areaId: "a",
    stance,
    hero: "CRUSADER",
    skillIds: index === 0 ? [smite.id] : [],
    wounds: 0,
    stress: 0,
    dodge: 0,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  }));
  const enemies: BattleEntity[] = [
    {
      id: "m0",
      side: "monster",
      areaId: "a",
      stance: "aggressive",
      stanceSlots: 1,
      hero: null,
      skillIds: [],
      wounds: 0,
      life: 100,
      dodge: 0,
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
      monsterCardId: "m0",
    },
  ];
  let state = createBattleState(seed, {
    entities: [...heroes, ...enemies],
    monsters: [
      {
        id: "m0",
        life: 100,
        verification: { unverified: false },
        type_position_tags: ["Beast"],
        resistances: [],
        immunities: [],
        skills: [],
      },
    ],
    areas: [{ id: "a", elevation: "normal", adjacent: [] }],
    light: 5,
    skills: [smite],
  });
  const commands: Command[] = [{ type: "startBattle" }];
  const started = ok(state, commands[0]!);
  state = started.state;
  const eventTypes = started.events.map((e) => e.type);
  for (let i = 0; i < 8; i++) {
    const draw: Command = { type: "drawInitiative" };
    commands.push(draw);
    const step = ok(state, draw);
    state = step.state;
    eventTypes.push(...step.events.map((e) => e.type));
    const turn = state.battle!.encounter!.turn;
    if (turn.type === "hero") {
      const play: Command = {
        type: "playHeroSkill",
        actorId: turn.actorId,
        targetId: "m0",
        skillId: smite.id,
      };
      commands.push(play);
      const played = ok(state, play);
      state = played.state;
      eventTypes.push(...played.events.map((e) => e.type));
      break;
    }
    if (turn.type !== "monster") throw new Error("没有英雄回合");
    const finish: Command = { type: "finishMonsterTurn", actorId: turn.actorId };
    commands.push(finish);
    const finished = ok(state, finish);
    state = finished.state;
    eventTypes.push(...finished.events.map((e) => e.type));
  }
  return { state, commands, eventTypes, hash: stateHash(state) };
}

describe("Phase 0 引擎行为快照（冻结基线）", () => {
  it("核心战斗一轮：固定种子 + startBattle/抽先攻/Smite I → 事件序列与状态 hash", () => {
    const first = coreCombatRound(7);
    const second = coreCombatRound(7);
    expect(first.commands).toEqual(second.commands);
    expect(first.eventTypes).toEqual(second.eventTypes);
    expect(first.hash).toBe(second.hash);
    expect(first.eventTypes[0]).toBe("roundStarted");
    expect(first.eventTypes).toContain("heroSkillResolved");
    expect(first.eventTypes).toEqual(["roundStarted", "turnStarted", "heroSkillResolved"]);
    expect(first.hash).toBe("7fa33566ff846e14b3a4da067fd5a0a0ef213d176e3abdef65e5129944c96a15");
  });

  it("II 级技能：固定种子 + Smite II 命令 → 事件序列与状态 hash", () => {
    const skill = card("hero_skill:core:h01:p002");
    expect(skill.level).toBe(2);
    expect(skill.name).toBe("Smite");
    const { state, play } = skillBattle(skill, 42, "hero_stat:core:h01:p001:back", {
      heroLevel: 2,
    });
    const first = replay(state, [play]);
    const second = replay(state, [play]);
    expect(first.eventTypes).toEqual(second.eventTypes);
    expect(first.hash).toBe(second.hash);
    expect(first.eventTypes).toEqual(["heroSkillResolved"]);
    expect(first.hash).toBe("a9eca0da3fced85cb15c07648fc07d545b68b13164e8b0500d2671dedcfe2e16");
  });

  it("扩展英雄技能：固定种子 + Musketeer Aimed Shot I 命令 → 事件序列与状态 hash", () => {
    const skill = card("hero_skill:musketeer:h18:p358");
    expect(skill.hero).toBe("MUSKETEER");
    expect(skill.name).toBe("Aimed Shot");
    expect(skill.level).toBe(1);
    const { state, play } = skillBattle(skill, 18, "hero_stat:musketeer:h18:p036:front");
    // Aimed Shot 对 Mark 目标；无 Mark 时仍应可结算（命中/落空由骰决定）
    const first = replay(state, [play]);
    const second = replay(state, [play]);
    expect(first.eventTypes).toEqual(second.eventTypes);
    expect(first.hash).toBe(second.hash);
    expect(first.eventTypes).toEqual(["heroSkillResolved"]);
    expect(first.hash).toBe("20cab5baa8853791a8eed2e08d2267ddd7a59349c918c92b55ee4cae846ccdce");
  });
});
