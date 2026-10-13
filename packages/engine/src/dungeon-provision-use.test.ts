import { describe, expect, it } from "vitest";
import layout from "../../data/normalized/corebox/dungeon_layout_p001.json";
import distribution from "../../data/normalized/corebox/scout_ahead_distribution.json";
import statData from "../../data/normalized/corebox/hero_stat.json";
import diseaseData from "../../data/normalized/corebox/disease.json";
import quirkData from "../../data/normalized/corebox/quirk.json";
import resolveData from "../../data/normalized/corebox/virtue_affliction.json";
import { normalizedHeroStatFileSchema } from "../../data/src/normalize/hero-stat";
import { normalizedQuirkFileSchema } from "../../data/src/normalize/schema";
import { diseaseFileSchema } from "../../data/src/disease";
import { createConditionPool } from "./conditions";
import { createDungeonSandbox } from "./dungeon";
import type { DungeonState } from "./dungeon";
import { applyCommand } from "./command";
import type { GameState } from "./command";
import type { ProvisionEffect } from "./provision-use";
import type { ResolveCard } from "./pressure";
import { statusProjection, tickStatusStacks } from "./status";

const stat = normalizedHeroStatFileSchema
  .parse(statData)
  .cards.find((s) => s.name === "CRUSADER" && s.level === 1)!;
const diseases = diseaseFileSchema.parse(diseaseData).cards;
const quirks = normalizedQuirkFileSchema.parse(quirkData).cards;
const quirk = (name: string) => quirks.find((q) => q.name === name)!.id;
function setup(changes: Partial<DungeonState["heroes"][number]> = {}): GameState {
  const stacks = [
    { kind: "bleed" as const, remaining: 3, amount: 2 },
    { kind: "bleed" as const, remaining: 1, amount: 1 },
    { kind: "blight" as const, remaining: 2, amount: 3 },
    { kind: "guard" as const, remaining: 2 },
  ];
  const hero = {
    id: "h",
    stress: 3,
    wounds: 3,
    life: stat.life,
    level: 1,
    stance: "aggressive" as const,
    heroStatId: stat.id,
    attributesVerified: true,
    statusStacks: stacks,
    ...changes,
  };
  const initial = createDungeonSandbox(
    1,
    layout,
    distribution,
    "standard",
    "S",
    [hero],
    resolveData.cards as ResolveCard[],
    {
      dungeonLevel: 1,
      light: 5,
      provisions: [
        { id: "food", face: "food" },
        { id: "extra", face: "food" },
        { id: "bandage", face: "bandage" },
        { id: "potion", face: "potion" },
        { id: "tool", face: "tool" },
      ],
    },
  );
  const h = initial.dungeon!.heroes[0]!;
  return {
    ...initial,
    dungeon: {
      ...initial.dungeon!,
      conditions: createConditionPool(diseases, quirks),
      heroes: [
        {
          ...h,
          combat: {
            id: h.id,
            side: "hero",
            hero: stat.name,
            heroStatId: stat.id,
            stance: h.stance!,
            areaId: "a",
            life: h.life!,
            wounds: h.wounds!,
            stress: h.stress,
            dodge: stat.dodge,
            dead: false,
            skillIds: [],
            ...statusProjection(h.statusStacks ?? []),
            statusStacks: h.statusStacks ?? [],
          },
        },
      ],
    },
  };
}
function use(state: GameState, provisionId: string, effect: ProvisionEffect) {
  return applyCommand(state, { type: "useProvision", targetId: "h", provisionId, effect });
}
describe("探索间补给 R12", () => {
  it.each(["food", "bandage"])("%s治疗一伤口，死门脱离、封底；同步战斗快照与一次性消耗", (face) => {
    for (const wounds of [0, 3, stat.life]) {
      const initial = setup({ wounds });
      const saved = structuredClone(initial);
      const result = use(initial, face, "heal");
      const d = result.state.dungeon!;
      expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
      expect(d.heroes[0]!.wounds).toBe(Math.max(0, wounds - 1));
      expect(d.heroes[0]!.combat!.wounds).toBe(Math.max(0, wounds - 1));
      expect(d.heroes[0]!.statusStacks).toEqual(initial.dungeon!.heroes[0]!.statusStacks);
      expect(d.explorationSetup!.provisions).toHaveLength(4);
      expect(d.cursor).toBe(initial.dungeon!.cursor);
      expect(d.rooms).toEqual(initial.dungeon!.rooms);
      expect(initial).toEqual(saved);
      expect(use(result.state, face, "heal").state).toBe(result.state);
    }
  });
  it.each(["clearBleed", "clearBlight"] as const)(
    "%s移除全部对应堆叠，保留其他状态与计时",
    (effect) => {
      const initial = setup();
      const result = use(initial, effect === "clearBleed" ? "bandage" : "potion", effect);
      const hero = result.state.dungeon!.heroes[0]!;
      const kind = effect === "clearBleed" ? "bleed" : "blight";
      expect(hero.statusStacks).toEqual(
        initial.dungeon!.heroes[0]!.statusStacks!.filter((s) => s.kind !== kind),
      );
      expect(hero.combat!.statusStacks).toEqual(hero.statusStacks);
      expect(hero.combat![kind]).toEqual([]);
      expect(hero.combat!.guard).toBe(true);
      expect(tickStatusStacks(hero.statusStacks!).status).toBe("resolved");
      expect(hero.wounds).toBe(3);
      expect(result.state.dungeon!.cursor).toBe(initial.dungeon!.cursor);
    },
  );
  it("Potion减压与Resilient、治疗怪癖修正按每颗一次结算，不受Q-69休息停点影响", () => {
    for (const [name, expected] of [
      ["Infirm", 3],
      ["Fast Healer", 1],
    ] as const) {
      const result = use(setup({ quirkIds: [quirk(name)] }), "bandage", "heal");
      expect(result.state.dungeon!.heroes[0]!.wounds).toBe(expected);
      expect(result.state.dungeon!.explorationSetup!.provisions).toHaveLength(4);
    }
    const result = use(setup({ quirkIds: [quirk("Resilient")] }), "potion", "reduceStress");
    expect(result.state.dungeon!.heroes[0]!.stress).toBe(1);
    expect(result.state.dungeon!.heroes[0]!.combat!.stress).toBe(1);
    expect(
      use(setup({ stress: 0 }), "potion", "reduceStress").state.dungeon!.heroes[0]!.stress,
    ).toBe(0);
  });
  it("Food对应接收英雄的Stress Eater / Stress Faster；Bulimic另弃一Food不重复触发", () => {
    for (const [name, stress] of [
      ["Stress Eater", 4],
      ["Stress Faster", 2],
    ] as const)
      expect(
        use(setup({ quirkIds: [quirk(name)] }), "food", "heal").state.dungeon!.heroes[0]!.stress,
      ).toBe(stress);
    const initial = setup({ diseaseId: diseases.find((d) => d.name === "Bulimic")!.id });
    const result = use(initial, "food", "heal");
    expect(result.state.dungeon!.heroes[0]).toMatchObject({ stress: 4, wounds: 2 });
    expect(result.state.dungeon!.explorationSetup!.provisions.map((p) => p.id)).toEqual([
      "bandage",
      "potion",
      "tool",
    ]);
    expect(result.events.filter((e) => e.type === "provisionConsumed")).toHaveLength(2);
  });
  it("Food到10续接一次意志检定或心脏病；不揭示房间、不重扣补给", () => {
    for (const tested of [false, true]) {
      const initial = setup({
        stress: 9,
        quirkIds: [quirk("Stress Eater")],
        ...(tested ? { resolveTested: true, resolveCardId: "virtue_affliction:p001" } : {}),
      });
      const result = use(initial, "food", "heal");
      expect(result.state.dungeon!.phase).toBe(tested ? "awaitingReplacement" : "ready");
      expect(result.state.dungeon!.heroes[0]!.stress).toBe(tested ? 10 : 0);
      expect(result.state.dungeon!.heroes[0]!.combat!.stress).toBe(tested ? 10 : 0);
      expect(result.state.dungeon!.heroes[0]!.combat!.dead).toBe(tested);
      expect(result.state.dungeon!.rooms).toEqual(initial.dungeon!.rooms);
      expect(result.state.dungeon!.scoutBonus).toBe(false);
      expect(result.events.filter((e) => e.type === "provisionConsumed")).toHaveLength(1);
      expect(use(result.state, "food", "heal").state).toBe(result.state);
      expect(result).toEqual(use(initial, "food", "heal"));
    }
  });
  it("缺意志牌时Food与追加伤口只支付一次，补齐后意志续接（R-069）", () => {
    const initial = setup({ stress: 9, quirkIds: [quirk("Stress Eater")] });
    const missing = { ...initial, dungeon: { ...initial.dungeon!, resolveCards: [] } };
    const stopped = use(missing, "food", "heal").state;
    expect(stopped.dungeon!.phase).toBe("blockedPressure");
    expect(stopped.dungeon!.explorationSetup!.provisions).toHaveLength(4);
    expect(use(stopped, "extra", "heal").state).toBe(stopped);
    const repaired = {
      ...stopped,
      dungeon: { ...stopped.dungeon!, resolveCards: initial.dungeon!.resolveCards },
    };
    const done = applyCommand(repaired, { type: "resolveDungeonPressure" }).state;
    expect(done.dungeon!.heroes[0]!.stress).toBe(0);
    expect(done.dungeon!.heroes[0]!.combat!.stress).toBe(0);
    expect(done.dungeon!.explorationSetup!.provisions).toHaveLength(4);
    const mixed = setup({ stress: 9, quirkIds: [quirk("Stress Eater"), quirk("Soft")] });
    const resolved = use(mixed, "food", "heal");
    expect(resolved.events.some((e) => e.type === "commandRefused")).toBe(false);
    expect(resolved.state.dungeon!.heroes[0]).toMatchObject({
      wounds: 3,
      stress: 0,
      resolveTested: true,
    });
    expect(resolved.state.dungeon!.explorationSetup!.provisions).toHaveLength(4);
    const withoutCards = { ...mixed, dungeon: { ...mixed.dungeon!, resolveCards: [] } };
    const paid = use(withoutCards, "food", "heal");
    expect(paid.state.dungeon).toMatchObject({ phase: "blockedPressure" });
    expect(paid.state.dungeon!.heroes[0]).toMatchObject({ wounds: 3, stress: 10 });
    expect(paid.events.filter((e) => e.type === "provisionConsumed")).toHaveLength(1);
    // Food 的直接治疗在补给事件中完成；生命事件仅来自 Soft 的追加伤口。
    expect(paid.events.filter((e) => e.type === "heroHealthResolved")).toHaveLength(1);
    const repairedMixed = {
      ...paid.state,
      dungeon: { ...paid.state.dungeon!, resolveCards: mixed.dungeon!.resolveCards },
    };
    const continued = applyCommand(repairedMixed, { type: "resolveDungeonPressure" });
    expect(continued.state).toEqual(resolved.state);
    expect(
      continued.events.filter(
        (e) => e.type === "heroHealthResolved" || e.type === "provisionConsumed",
      ),
    ).toHaveLength(0);
  });
  it("非法补给 / 效果 / 目标、死亡、缺Life、未知状态与未完成窗口原子拒绝", () => {
    const initial = setup();
    for (const [id, effect] of [
      ["tool", "heal"],
      ["food", "clearBleed"],
      ["missing", "heal"],
    ] as const)
      expect(use(initial, id, effect).state).toBe(initial);
    expect(
      applyCommand(initial, {
        type: "useProvision",
        targetId: "missing",
        provisionId: "food",
        effect: "heal",
      }).state,
    ).toBe(initial);
    for (const changes of [
      { dead: true },
      { attributesVerified: false },
      { life: 0 },
      { wounds: -1 },
    ]) {
      const bad = setup(changes);
      expect(use(bad, "food", "heal").state).toBe(bad);
    }
    const missing = setup();
    const noStacks = {
      ...missing,
      dungeon: {
        ...missing.dungeon!,
        heroes: missing.dungeon!.heroes.map(
          (h) =>
            Object.fromEntries(
              Object.entries(h).filter(([key]) => key !== "statusStacks" && key !== "combat"),
            ) as DungeonState["heroes"][number],
        ),
      },
    };
    expect(use(noStacks, "bandage", "clearBleed").state).toBe(noStacks);
    const noLife = {
      ...missing,
      dungeon: {
        ...missing.dungeon!,
        heroes: missing.dungeon!.heroes.map(
          (h) =>
            Object.fromEntries(
              Object.entries(h).filter(([key]) => key !== "life"),
            ) as DungeonState["heroes"][number],
        ),
      },
    };
    expect(use(noLife, "food", "heal").state).toBe(noLife);
    const malformed = setup({ statusStacks: [{ kind: "bleed", remaining: 0, amount: 1 }] });
    expect(use(malformed, "bandage", "clearBleed").state).toBe(malformed);
    for (const phase of [
      "awaitingProvisions",
      "awaitingHazards",
      "awaitingRoom",
      "exited",
    ] as const) {
      const blocked = { ...initial, dungeon: { ...initial.dungeon!, phase } };
      expect(use(blocked, "food", "heal").state).toBe(blocked);
    }
    const pending = applyCommand(initial, { type: "beginDungeonExploration" }).state;
    expect(use(pending, "food", "heal").state).toBe(pending);
  });
});
