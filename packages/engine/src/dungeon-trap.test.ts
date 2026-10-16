import { expect, it } from "vitest";
import layout from "../../data/normalized/corebox/dungeon_layout_p001.json";
import distribution from "../../data/normalized/corebox/scout_ahead_distribution.json";
import resolveData from "../../data/normalized/corebox/virtue_affliction.json";
import statData from "../../data/normalized/corebox/hero_stat.json";
import diseaseData from "../../data/normalized/corebox/disease.json";
import quirkData from "../../data/normalized/corebox/quirk.json";
import { normalizedHeroStatFileSchema } from "../../data/src/normalize/hero-stat";
import { normalizedQuirkFileSchema } from "../../data/src/normalize/schema";
import { diseaseFileSchema } from "../../data/src/disease";
import { applyCommand } from "./command";
import type { ApplyResult, GameState } from "./command";
import { createDungeonSandbox } from "./dungeon";
import type { DungeonState, DungeonBattleCatalog } from "./dungeon";
import { createConditionPool, conditionPoolProblem } from "./conditions";
import { createRng, rollD10 } from "./rng";
import { QUIRK_NAMES } from "./passive";
import type { ResolveCard } from "./pressure";

const stats = normalizedHeroStatFileSchema
  .parse(statData)
  .cards.filter(
    (s) => s.level === 1 && ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"].includes(s.name),
  ) as DungeonBattleCatalog["heroStats"];
const quirk = (name: (typeof QUIRK_NAMES)[number]) =>
  `quirk:p${String(QUIRK_NAMES.indexOf(name) + 1).padStart(3, "0")}`;
function seedFor(roll: number, next?: number): number {
  for (let seed = 0; ; seed++) {
    const rng = createRng(seed);
    for (let i = 0; i < 7; i++) rng.next();
    if (rollD10(rng) === roll && (next === undefined || rollD10(rng) === next)) return seed;
  }
}
function scene(
  roll = 3,
  changes: Partial<DungeonState["heroes"][number]> = {},
  dl = 1,
  light = 5,
  next?: number,
): GameState {
  const stat = stats.find((s) => s.name === "CRUSADER")!;
  const initial = createDungeonSandbox(
    seedFor(roll, next),
    layout,
    distribution,
    "standard",
    "G",
    [
      {
        id: "h",
        stress: 0,
        heroStatId: stat.id,
        level: 1,
        life: stat.life,
        wounds: 0,
        stance: "aggressive",
        attributesVerified: true,
        ...changes,
      },
      {
        id: "other",
        stress: 0,
        level: 1,
        life: 14,
        wounds: 0,
        stance: "defensive",
        attributesVerified: true,
      },
    ],
    resolveData.cards as ResolveCard[],
    { light, dungeonLevel: dl, provisions: [{ id: "tool", face: "tool" }] },
  );
  return {
    ...initial,
    dungeon: {
      ...initial.dungeon!,
      phase: "awaitingHazards",
      pending: {
        id: "dungeon-hazard:0:h:1",
        prompt: "Trap",
        options: [
          { id: "attack", label: "陷阱攻击" },
          { id: "use:tool", label: "Tool" },
        ],
      },
      exploration: {
        from: "G",
        to: "D",
        dicePerHero: 1,
        rolls: [
          { id: "h:1", heroId: "h", face: "trap", resolved: false },
          { id: "h:2", heroId: "h", face: "blank", resolved: false },
        ],
      },
      battleCatalog: { heroStats: stats, skills: [], monsters: [] },
      conditions: createConditionPool(
        diseaseFileSchema.parse(diseaseData).cards,
        normalizedQuirkFileSchema.parse(quirkData).cards,
      ),
    },
  };
}
const attack = (s: GameState, optionId = "attack") =>
  applyCommand(s, { type: "resolveChoice", choiceId: s.dungeon!.pending!.id, optionId });
function ok(r: ApplyResult): DungeonState {
  expect(r.events.find((e) => e.type === "commandRefused")).toBeUndefined();
  expect(conditionPoolProblem(r.state.dungeon!.conditions!, r.state.dungeon!.heroes)).toBeNull();
  return r.state.dungeon!;
}
it.each([1, 2, 3])(
  "G-06 / R-003：DL%d 的十个骰面，固定 Acc8 / Crit2，光照5 Dodge+1且只影响自己",
  (dl) => {
    for (let roll = 1; roll <= 10; roll++) {
      const s = scene(roll, {}, dl),
        snapshot = structuredClone(s);
      const result = attack(s),
        d = ok(result);
      expect(d.heroes[0]!.wounds).toBe(roll <= 2 ? 4 * dl : roll <= 7 ? 2 * dl : 0);
      expect(d.heroes[0]!.stress).toBe(roll <= 2 ? 1 : 0);
      expect(d.heroes[1]).toEqual(s.dungeon!.heroes[1]);
      expect(d).toMatchObject({ cursor: 8, position: "G", phase: "awaitingHazards" });
      expect(d.exploration!.rolls!.map((r) => r.resolved)).toEqual([true, false]);
      expect(attack(s)).toEqual(result);
      expect(s).toEqual(snapshot);
      expect(
        applyCommand(result.state, {
          type: "resolveChoice",
          choiceId: s.dungeon!.pending!.id,
          optionId: "attack",
        }).state,
      ).toBe(result.state);
    }
  },
);
it("Quick / Slow Reflexes 修正闪避，低光不提升陷阱 Acc / Crit；暴击不减 Dodge", () => {
  expect(ok(attack(scene(6, { quirkIds: [quirk("Quick Reflexes")] }))).heroes[0]!.wounds).toBe(0);
  expect(ok(attack(scene(9, { quirkIds: [quirk("Slow Reflexes")] }))).heroes[0]!.wounds).toBe(2);
  expect(ok(attack(scene(2, { quirkIds: [quirk("Quick Reflexes")] }))).heroes[0]!.wounds).toBe(4);
  expect(ok(attack(scene(3, {}, 1, 0))).heroes[0]).toMatchObject({ wounds: 2, stress: 0 });
  expect(ok(attack(scene(8, {}, 1, 4))).heroes[0]!.wounds).toBe(2);
  expect(ok(attack(scene(9, {}, 1, 0))).heroes[0]!.wounds).toBe(0);
  expect(ok(attack(scene(2, {}, 1, 0))).heroes[0]!.stress).toBe(2);
});
it("On Guard → Hard Skinned → Protection 向上取整；Guard / Riposte 不制造环境攻击者", () => {
  const stacks = [
    { kind: "protection", remaining: 2 },
    { kind: "guard", remaining: 1 },
    { kind: "riposte", remaining: 1 },
  ] as const;
  const s = scene(
    2,
    { quirkIds: [quirk("On Guard"), quirk("Hard Skinned")], statusStacks: stacks },
    3,
  );
  const d = ok(attack(s));
  expect(d.heroes[0]!.wounds).toBe(3); // 12−1 → 6 → 3。
  expect(d.heroes[0]!.statusStacks).toEqual(stacks);
  expect(d.heroes[1]).toEqual(s.dungeon!.heroes[1]);
});
it.each([1, 4])("Fragile / Syphilis 附加在同批伤口；已在死门只掷一次，死门骰%d", (next) => {
  const s = scene(3, { wounds: 17, quirkIds: [quirk("Fragile")] }, 1, 5, next);
  // 由具名目录定位 Syphilis，不能猜疾病 ID。
  const syphilis = s.dungeon!.conditions!.diseases.find((c) => c.name === "Syphilis")!;
  const actual = {
    ...s,
    dungeon: {
      ...s.dungeon!,
      heroes: s.dungeon!.heroes.map((h) => (h.id === "h" ? { ...h, diseaseId: syphilis.id } : h)),
    },
  };
  const result = attack(actual),
    d = ok(result);
  const health = result.events.filter((e) => e.type === "heroHealthResolved");
  expect(health).toHaveLength(1);
  expect(health[0]).toMatchObject({ effect: { amounts: [2, 1, 1] } });
  expect(d.cursor).toBe(9);
  expect(d.heroes[0]!.dead).toBe(next <= 3);
  expect(d.position).toBe("G");
  expect(d.phase).toBe(next <= 3 ? "awaitingReplacement" : "awaitingHazards");
});
it("首次到死门不掷骰；Tool 消耗补给、不掷攻击骰或触发伤害被动", () => {
  const s = scene(3, { wounds: 16, quirkIds: [quirk("Fragile"), quirk("Off Guard")] });
  expect(ok(attack(s))).toMatchObject({
    cursor: 8,
    heroes: [{ wounds: 17, dead: false, stress: 1 }, {}],
  });
  const used = ok(attack(s, "use:tool"));
  expect(used).toMatchObject({ cursor: 7, explorationSetup: { provisions: [] } });
  expect(used.heroes).toEqual(s.dungeon!.heroes);
});
it("自身骰面被动：Skilled Gambler 先恢复，Bad Gambler 致死中止，Evasive 闪避恢复", () => {
  expect(
    ok(attack(scene(1, { stress: 4, quirkIds: [quirk("Skilled Gambler")] }))).heroes[0]!.stress,
  ).toBe(4);
  const dead = ok(attack(scene(10, { wounds: 17, quirkIds: [quirk("Bad Gambler")] }, 1, 5, 1)));
  expect(dead).toMatchObject({
    cursor: 9,
    phase: "awaitingReplacement",
    heroes: [{ dead: true }, {}],
  });
  expect(
    ok(attack(scene(8, { stress: 4, quirkIds: [quirk("Evasive"), quirk("Resilient")] }))).heroes[0]!
      .stress,
  ).toBe(2);
});
it("伤害 / 暴击被动：Off Guard 与 Weak Grip 压力，Shocker 读取实际完整抗性", () => {
  const d = ok(
    attack(scene(2, { quirkIds: [quirk("Off Guard"), quirk("Weak Grip"), quirk("Shocker")] })),
  );
  expect(d.heroes[0]).toMatchObject({ wounds: 4, stress: 3, statusStacks: [] }); // Crusader 抗 Stun：1t 缩至 0。
  const s = scene(2, { quirkIds: [quirk("Shocker")] });
  const hellion = stats.find((s) => s.name === "HELLION")!;
  const actual = {
    ...s,
    dungeon: {
      ...s.dungeon!,
      heroes: s.dungeon!.heroes.map((h) =>
        h.id === "h" ? { ...h, heroStatId: hellion.id, life: hellion.life } : h,
      ),
    },
  };
  expect(ok(attack(actual)).heroes[0]!.statusStacks).toEqual([{ kind: "stun", remaining: 1 }]);
});
it("R-069追加伤口后意志与暴击合并；缺属性 / 抗性仍原子拒绝，实际闪避不误拒绝", () => {
  const scenes = [scene(3, { heroStatId: "missing" }), scene(3, { life: 18 })];
  const missing = scene(2, { quirkIds: [quirk("Shocker")] });
  scenes.push({
    ...missing,
    dungeon: {
      ...missing.dungeon!,
      battleCatalog: {
        ...missing.dungeon!.battleCatalog!,
        heroStats: stats.map((s) => {
          const copy = { ...s };
          delete copy.verified_condition_defence;
          return copy;
        }),
      },
    },
  });
  for (const s of scenes) {
    expect(attack(s).state).toBe(s);
    expect(attack(s).events[0]!.type).toBe("commandRefused");
  }
  expect(
    ok(attack(scene(2, { quirkIds: [quirk("Nervous"), quirk("Off Guard")] }))).heroes[0],
  ).toMatchObject({ stress: 3, wounds: 4 });
  const combined = scene(
    2,
    {
      diseaseId: "disease:p008",
      quirkIds: [quirk("Off Guard"), quirk("Weak Grip"), quirk("Soft")],
    },
    1,
    2,
  );
  const applied = attack(combined);
  expect(ok(applied).heroes[0]).toMatchObject({ stress: 5, wounds: 7 });
  expect(applied).toEqual(attack(combined));
  const soft = scene(2, { stress: 9, quirkIds: [quirk("Soft")] });
  const resolved = attack(soft);
  expect(ok(resolved).heroes[0]).toMatchObject({ wounds: 5, stress: 0, resolveTested: true });
  expect(
    applyCommand(soft, {
      type: "resolveChoice",
      choiceId: soft.dungeon!.pending!.id,
      optionId: "attack",
    }),
  ).toEqual(resolved);
  expect(ok(attack(scene(8, { quirkIds: [quirk("Nervous"), quirk("Off Guard")] }))).cursor).toBe(8);
});
it("暴击压力到10缺意志目录时保存已付伤害；补齐后只恢复剩余骰，不重复陷阱", () => {
  const s = scene(2, { stress: 9 });
  const broken = { ...s, dungeon: { ...s.dungeon!, resolveCards: [] } };
  const paid = ok(attack(broken));
  expect(paid).toMatchObject({
    phase: "blockedPressure",
    cursor: 8,
    heroes: [{ wounds: 4, stress: 10 }, {}],
  });
  expect(paid.exploration!.rolls![0]!.resolved).toBe(true);
  const repaired = { ...s, dungeon: { ...paid, resolveCards: s.dungeon!.resolveCards } };
  const resumed = ok(applyCommand(repaired, { type: "resolveDungeonPressure" }));
  expect(resumed.cursor).toBe(13); // 四张候选意志牌洗牌 4 次 + 意志骰 1 次，陷阱不重掷。
  expect(resumed.heroes[0]!.wounds).toBe(4);
  expect(resumed.exploration!.rolls!.map((r) => r.resolved)).toEqual([true, false]);
  expect(resumed.pending!.options).toEqual([{ id: "h:2", label: "h:2 · 空白" }]);
});
