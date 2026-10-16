import { describe, expect, it } from "vitest";
import { loadNormalizedCorebox } from "../../data/src/normalize/write";
import {
  applyCommand,
  createBattleState,
  heroSkillUsesSelfTarget,
  readPrintedTargets,
  resolveSkillHeroHealth,
} from "./index";
import { readPrintedRange, resolveHeroSkillEffects } from "./hero-skill";
import type {
  BattleEntity,
  BattleSetup,
  Command,
  SkillStance,
  HeroSkillCardView,
  MonsterCardView,
} from "./index";

const data = loadNormalizedCorebox();
// 已通过 Zod 的 JSON 在引擎边界只保留存在的可选属性。
const heroes = data.hero_stat.cards.filter(
  (c) => c.level === 1 && ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"].includes(c.name),
) as unknown as (NonNullable<BattleSetup["heroStats"]>[number] & { dodge: number })[];
const skills = data.hero_skill.cards.filter(
  (c) => "hero" in c && heroes.some((h) => h.name === c.hero),
) as unknown as (HeroSkillCardView & {
  hero: string;
  name: string;
  level: number;
  top_row_icons: readonly { key: string | null }[];
})[];
const skill = (page: number) =>
  skills.find((c) => c.id === `hero_skill:p${String(page).padStart(3, "0")}`)!;
const soldier = data.monster_medium.cards.find(
  (c) => c.id === "monster_medium:p001",
)! as unknown as MonsterCardView & { life: number };
if (!("skills" in soldier)) throw new Error("测试需要已核实 Bone Soldier");

function setup(card = skill(1), seed = 1, maxTargets = readPrintedTargets(card)) {
  const range = readPrintedRange(card);
  const targetArea =
    range.kind === "exact"
      ? ["a", "b", "c"][range.distance]!
      : range.kind === "interval"
        ? ["a", "b", "c"][range.min]!
        : "a";
  const lit = card.top_row_icons.find((icon) => /^stance_.*_lit$/.test(icon.key ?? ""))!;
  const stance = lit.key!.replace(/^stance_|_lit$/g, "") as SkillStance;
  const otherStances = (["aggressive", "defensive", "ranged", "support"] as const).filter(
    (s) => s !== stance,
  );
  const actorStat = heroes.find((h) => "hero" in card && h.name === card.hero)!;
  const order = [actorStat, ...heroes.filter((h) => h.id !== actorStat.id)];
  const entities: BattleEntity[] = order.map((h, i) => ({
    id: `h${i}`,
    side: "hero",
    hero: h.name,
    heroStatId: h.id,
    heroLevel: 1,
    life: h.life,
    areaId: i === 0 ? "a" : targetArea,
    stance: i === 0 ? stance : otherStances[i - 1]!,
    wounds: 5,
    stress: 3,
    dodge: h.dodge,
    skillIds: i === 0 ? [card.id] : [],
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
    statusStacks: [],
  }));
  for (let i = 0; i < 3; i++)
    entities.push({
      id: `m${i}`,
      side: "monster",
      hero: null,
      monsterCardId: soldier.id,
      life: soldier.life,
      areaId: targetArea,
      stance: (["aggressive", "defensive", "ranged"] as const)[i]!,
      stanceSlots: 1,
      wounds: 0,
      dodge: 0,
      skillIds: [],
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
      statusStacks: [],
    });
  const state = createBattleState(seed, {
    heroStats: heroes,
    entities,
    skills: [card],
    monsters: [soldier],
    light: 5,
    areas: [
      { id: "a", elevation: "normal", adjacent: ["b"] },
      { id: "b", elevation: "normal", adjacent: ["a", "c"] },
      { id: "c", elevation: "normal", adjacent: ["b"] },
    ],
  });
  const own = heroSkillUsesSelfTarget(card);
  const friendly =
    card.stats_line?.some((s) => s.type === "icon" && s.icon.key === "target_hero") ||
    card.verified_target_support;
  const count = maxTargets.kind === "exact" ? maxTargets.max : 1;
  const ids = own
    ? ["h0"]
    : Array.from({ length: count }, (_, i) => (friendly ? `h${i + 1}` : `m${i}`));
  const command: Command =
    count > 1
      ? { type: "playHeroSkillTargets", actorId: "h0", skillId: card.id, targetIds: ids }
      : { type: "playHeroSkill", actorId: "h0", skillId: card.id, targetId: ids[0]! };
  return { state, command };
}

describe("四核心技能整批沙盒接线（R19–21、R27、R29、R-048）", () => {
  it.each([
    [4, 0, 9, 9, 5],
    [5, 0, 11, 10, 6],
    [6, 1, 12, 11, 7],
  ])(
    "Zealous p%i：印刷 Crit %i / 伤害 %i、Acc %i / 伤害 %i，全部骰面（R-062）",
    (page, crit, critDamage, acc, hitDamage) => {
      const card = skill(page);
      expect(card.printed_labels.map((label) => [label.label, label.value])).toEqual([
        ["Crit", crit],
        ["Acc", acc],
      ]);
      expect(readPrintedRange(card)).toEqual({ kind: "exact", distance: 1 });
      expect(readPrintedTargets(card)).toEqual({ kind: "exact", max: 2 });
      expect(
        card
          .stats_line!.filter((s) => s.type === "icon")
          .map((s) => s.type === "icon" && s.icon.key),
      ).toEqual(["range", "target_monster", "target_monster", "damage", "damage"]);
      for (let roll = 1; roll <= 10; roll++) {
        const result = resolveHeroSkillEffects(
          card,
          {
            actor: { id: "h", wounds: 5, stress: 3, stance: "aggressive" },
            target: { id: "m", side: "monster", wounds: 0, dodge: 2 },
            light: 4,
            areaDistance: 1,
            targetsInArea: 2,
          },
          roll,
        );
        const outcome = roll <= crit + 1 ? "crit" : roll <= acc - 2 ? "hit" : "miss";
        const amount = outcome === "crit" ? critDamage : outcome === "hit" ? hitDamage : null;
        expect(result.resolution).toMatchObject({
          status: "resolved",
          reason: null,
          effect: "damage",
          outcome,
          printedAmount: amount,
          damageDealt: amount,
          wounds: amount ?? 0,
          actorWounds: 5,
          actorShuffle: null,
          targetShuffle: null,
          skipped: [],
        });
      }
      const { state, command } = setup(card);
      const result = applyCommand(state, command);
      expect(result.events[0]?.type).toBe("heroSkillTargetsResolved");
      expect(result.state.battle!.rngCursor).toBe(1);
      expect(applyCommand(state, command)).toEqual(result);
    },
  );

  it("28 种技能各 I/II/III，共 84 张；每英雄 21 张，均已验证", () => {
    expect(skills).toHaveLength(84);
    for (const h of heroes)
      expect(skills.filter((s) => "hero" in s && s.hero === h.name)).toHaveLength(21);
    expect(skills.every((s) => !s.verification.unverified)).toBe(true);
  });

  it.each(skills)("$id $name $level：真实命令完整结算，不跳过效果框", (card) => {
    const { state, command } = setup(card);
    const before = structuredClone(state);
    const result = applyCommand(state, command);
    expect(result.events[0]?.type, JSON.stringify(result.events)).toMatch(
      /^heroSkill(?:Targets)?Resolved$/,
    );
    const event = result.events[0]!;
    if (event.type === "heroSkillResolved")
      expect(event.resolution.skipped).not.toContainEqual({ code: "effect_lines" });
    if (event.type === "heroSkillTargetsResolved")
      for (const r of event.resolutions)
        expect(r.skipped).not.toContainEqual({ code: "effect_lines" });
    expect(applyCommand(state, command)).toEqual(result);
    expect(state).toEqual(before);
    expect(result.state.battle!.rngCursor).toBe(
      card.printed_labels.some((l) => l.label === "Acc") ? 1 : 0,
    );
  });

  it.each([40, 41, 42])(
    "Bleed Out p%i：自身创伤在落空时仍发生，Bleed 不发生，防护不减创伤",
    (page) => {
      const c = skill(page);
      const resolved = resolveHeroSkillEffects(
        c,
        {
          actor: { id: "h", wounds: 0, stress: 0, protection: true },
          target: { id: "m", side: "monster", wounds: 0, dodge: 20 },
          light: 5,
        },
        10,
      );
      expect(resolved.resolution).toMatchObject({
        status: "resolved",
        outcome: "miss",
        actorWounds: page - 37,
        wounds: 0,
        targetStatusEffects: [],
        skipped: [],
      });
      expect(resolved.healthEffects).toEqual([
        {
          entityId: "h",
          side: "hero",
          source: "selfWound",
          effect: { type: "wounds", amounts: [page - 37] },
        },
      ]);
    },
  );

  it.each([38, 39])(
    "Adrenaline Rush p%i：自身与各目标清两种状态，再分别放 Buff；不掷骰",
    (page) => {
      const { state, command } = setup(skill(page));
      const loaded = {
        ...state,
        battle: {
          ...state.battle!,
          entities: state.battle!.entities.map((e) =>
            e.side === "hero"
              ? {
                  ...e,
                  statusStacks: [
                    { kind: "bleed" as const, remaining: 2, amount: 1 },
                    { kind: "blight" as const, remaining: 2, amount: 1 },
                  ],
                  bleed: ["b"],
                  blight: ["b"],
                }
              : e,
          ),
        },
      };
      const result = applyCommand(loaded, command);
      expect(result.events[0]?.type, JSON.stringify(result.events)).toMatch(
        /^heroSkill(?:Targets)?Resolved$/,
      );
      for (const e of result.state.battle!.entities.slice(0, page === 38 ? 2 : 3))
        expect(e).toMatchObject({
          bleed: [],
          blight: [],
          statusStacks: [{ kind: "buff", remaining: 2 }],
          wounds: 5,
        });
      expect(result.state.battle!.rngCursor).toBe(0);
    },
  );

  it.each([20, 21])("Inspiring Cry p%i：自身治疗减压一次，各目标分别治疗减压与增加光照", (page) => {
    const { state, command } = setup(skill(page));
    const initial = { ...state, battle: { ...state.battle!, light: 1 } };
    const result = applyCommand(initial, command);
    expect(result.events[0]?.type).toMatch(/^heroSkill(?:Targets)?Resolved$/);
    for (const hero of result.state.battle!.entities.slice(0, page - 18))
      expect(hero).toMatchObject({ wounds: 4, stress: 2 });
    expect(result.state.battle!.light).toBe(page - 18);
    expect(result.state.battle!.rngCursor).toBe(0);
  });

  it("Bleed Out 自身创伤进入死门，已经在死门才掷骰，不按伤口净差绕过生命层", () => {
    const resolved = resolveHeroSkillEffects(
      skill(42),
      {
        actor: { id: "h", wounds: 13, stress: 0 },
        target: { id: "m", side: "monster", wounds: 0, dodge: 20 },
        light: 5,
      },
      10,
    );
    const entering = resolveSkillHeroHealth(
      resolved,
      [{ id: "h", life: 14, wounds: 13, dead: false }],
      1,
      0,
    );
    expect(entering).toMatchObject({
      status: "resolved",
      rngCursor: 0,
      heroes: [{ wounds: 14, dead: false }],
      steps: [{ resolution: { enteredDeathDoor: true } }],
    });
    const atDoor = resolveSkillHeroHealth(
      resolved,
      [{ id: "h", life: 14, wounds: 14, dead: false }],
      1,
      0,
    );
    expect(atDoor).toMatchObject({ status: "resolved", rngCursor: 1 });
  });

  it("友方 Buff 缺少核实抗性栏时原子拒绝，清状态和 RNG 均不先落地", () => {
    const { state, command } = setup(skill(39));
    const missing = {
      ...state,
      battle: {
        ...state.battle!,
        heroStats: state.battle!.heroStats!.map((entry) => {
          const card = { ...entry };
          delete card.verified_buff_defence;
          delete card.verified_condition_defence;
          return card;
        }),
      },
    };
    const result = applyCommand(missing, command);
    expect(result.state).toEqual(missing);
    expect(result.events[0]).toMatchObject({ type: "commandRefused" });
  });
});
