import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import layout from "../../data/normalized/corebox/dungeon_layout_p001.json";
import distribution from "../../data/normalized/corebox/scout_ahead_distribution.json";
import { applyCommand } from "./command";
import type { GameState, Command } from "./command";
import { createDungeonSandbox } from "./dungeon";
import type { DungeonState } from "./dungeon";
import type { ResolveCard } from "./pressure";

const cards: ResolveCard[] = JSON.parse(
  readFileSync(
    new URL("../../data/normalized/corebox/virtue_affliction.json", import.meta.url),
    "utf8",
  ),
).cards;
const setup = (
  heroes: DungeonState["heroes"] = [{ id: "h", stress: 9 }],
  catalog = cards,
  seed = 1,
) => createDungeonSandbox(seed, layout, distribution, "standard", "G", heroes, catalog);
const agree = (state: GameState) => {
  const pending = applyCommand(state, { type: "scoutDungeon" });
  return applyCommand(pending.state, {
    type: "resolveChoice",
    choiceId: pending.pendingChoice!.id,
    optionId: "agree",
  });
};

describe("探索侦察压力恢复（R14、R28、R9）", () => {
  it("首次检定：沿布置游标掷一次，归零、分牌、揭示，输入不变", () => {
    const initial = setup();
    const before = structuredClone(initial);
    const result = agree(initial);
    expect(result.state.dungeon).toMatchObject({ phase: "ready", scoutBonus: true, cursor: 12 });
    const event = result.events.find((e) => e.type === "resolveTested")!;
    expect(event).toMatchObject({ entityId: "h", roll: 8 });
    if (event.type !== "resolveTested") throw new Error("缺少检定事件");
    expect(cards.find((c) => c.id === event.cardId)?.role).toBe("affliction");
    expect(result.state.dungeon!.heroes[0]).toMatchObject({
      stress: 0,
      resolveTested: true,
      resolveCardId: event.cardId,
    });
    expect(result.state.dungeon!.rooms.filter((r) => r.revealed).map((r) => r.id)).toEqual([
      "D",
      "F",
      "G",
      "H",
    ]);
    expect(initial).toEqual(before);
    expect(agree(initial)).toEqual(result);
    expect(applyCommand(result.state, { type: "resolveDungeonPressure" }).state).toBe(result.state);
  });
  it("种子黄金序列覆盖美德与苦难分支，完整概率不剔除卡", () => {
    const roles = new Set<string>();
    for (let seed = 0; seed < 20; seed++) {
      const result = agree(setup(undefined, cards, seed));
      const e = result.events.find((e) => e.type === "resolveTested")!;
      if (e.type !== "resolveTested") throw new Error("缺少检定事件");
      const role = cards.find((c) => c.id === e.cardId)!.role;
      expect(role).toBe(e.roll <= 2 ? "virtue" : "affliction");
      roles.add(role);
    }
    expect([...roles].sort()).toEqual(["affliction", "virtue"]);
  });
  it("多人同时到 10 共用有限牌堆，无重复分配 / 重洗，命令日志可回放", () => {
    const initial = setup(Array.from({ length: 4 }, (_, i) => ({ id: `h${i}`, stress: 9 })));
    const log: Command[] = [
      { type: "scoutDungeon" },
      { type: "resolveChoice", choiceId: "dungeon-scout:0", optionId: "agree" },
    ];
    const result = agree(initial);
    expect(log.reduce((s, c) => applyCommand(s, c).state, initial)).toEqual(result.state);
    const d = result.state.dungeon!;
    expect(new Set(d.heroes.map((h) => h.resolveCardId)).size).toBe(4);
    expect(d.heroes.every((h) => h.stress === 0 && h.resolveTested)).toBe(true);
    expect(Object.values(d.resolveDecks).flat().length).toBe(10 - 4);
    expect(d.cursor).toBe(7 + 4 + 8);
  });
  it("已分配意志卡不得再抽到，也不重置另一位英雄的压力", () => {
    const assigned = cards.find((c) => c.role === "affliction")!.id;
    const result = agree(
      setup([
        { id: "old", stress: 1, resolveTested: true, resolveCardId: assigned },
        { id: "new", stress: 9 },
      ]),
    );
    expect(result.state.dungeon!.heroes[0]).toMatchObject({ stress: 2, resolveCardId: assigned });
    expect(result.state.dungeon!.heroes[1]!.resolveCardId).not.toBe(assigned);
    expect(Object.values(result.state.dungeon!.resolveDecks).flat()).not.toContain(assigned);
  });
  it("已有意志卡到 10 直接心脏病，无 RNG，停在驿站替换接口", () => {
    const result = agree(
      setup([{ id: "h", stress: 9, resolveTested: true, resolveCardId: cards[0]!.id }]),
    );
    expect(result.state.dungeon).toMatchObject({
      phase: "awaitingReplacement",
      cursor: 7,
      scoutBonus: false,
    });
    expect(result.state.dungeon!.heroes[0]).toMatchObject({ dead: true, stress: 10 });
    expect(result.events.some((e) => e.type === "heartAttack")).toBe(true);
    expect(result.state.dungeon!.rooms.filter((r) => r.revealed).map((r) => r.id)).toEqual(["G"]);
    expect(applyCommand(result.state, { type: "beginDungeonExploration" }).state).toBe(
      result.state,
    );
  });
  it("缺失 / 未验证牌堆保留已支付压力；恢复不二次支付 / 重掷", () => {
    for (const bad of [
      cards.slice(1),
      cards.map((c, i) => (i === 0 ? { ...c, verification: { unverified: true } } : c)),
    ]) {
      const blocked = agree(setup(undefined, bad)).state;
      expect(blocked.dungeon).toMatchObject({ phase: "blockedPressure", cursor: 7 });
      expect(blocked.dungeon!.heroes[0]!.stress).toBe(10);
      // 数据层恢复获批牌堆后，恢复命令仅接续原侦察，不重新扣压力。
      const repaired = { ...blocked, dungeon: { ...blocked.dungeon!, resolveCards: cards } };
      const resumed = applyCommand(repaired, { type: "resolveDungeonPressure" });
      expect(resumed.state).toEqual(agree(setup()).state);
      expect(applyCommand(resumed.state, { type: "resolveDungeonPressure" }).state).toBe(
        resumed.state,
      );
    }
  });
  it("损坏牌堆与缺失意志卡不改变 RNG 或静默续接", () => {
    const blocked = agree(setup(undefined, [])).state;
    const damaged = {
      ...blocked,
      dungeon: {
        ...blocked.dungeon!,
        resolveCards: cards,
        resolveDecks: { affliction: ["missing"] },
      },
    };
    expect(applyCommand(damaged, { type: "resolveDungeonPressure" }).state).toBe(damaged);
    expect(agree(setup([{ id: "h", stress: 9, resolveTested: true }])).state.dungeon!.phase).toBe(
      "blockedPressure",
    );
  });
});
