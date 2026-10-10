import { describe, expect, it } from "vitest";
import { applyCommand, createBattleState, createLootState, nextProvisionFace } from "./index";
import type { BattleEntity, GameState, LootKind } from "./index";
import { closeBattleLoot } from "./loot";

function ready(kind: LootKind, count = 0, seed = 1): GameState {
  const entities: BattleEntity[] = (["aggressive", "defensive", "ranged", "support"] as const).map(
    (stance, index) => ({
      id: `h${index}`,
      side: "hero",
      hero: "TEST",
      heroStatId: "test",
      stance,
      areaId: "a",
      life: 10,
      wounds: 0,
      stress: 0,
      dodge: 0,
      guard: false,
      dead: false,
      skillIds: [],
      bleed: [],
      blight: [],
    }),
  );
  const state = createBattleState(seed, {
    entities: [
      ...entities,
      {
        id: "m",
        hero: null,
        side: "monster",
        stanceSlots: 1,
        stance: "aggressive",
        areaId: "a",
        life: 10,
        wounds: 0,
        dodge: 0,
        guard: false,
        dead: false,
        skillIds: [],
        bleed: [],
        blight: [],
      },
    ],
    areas: [{ id: "a", adjacent: [], elevation: "normal" }],
    skills: [],
    heroStats: [{ id: "test", name: "TEST", life: 10, attributesVerified: true }],
    light: 5,
    provisions: Array.from({ length: count }, (_, index) => ({
      id: `p${index}`,
      face: "food" as const,
    })),
    lootAreas: ["a"],
  });
  const pool = createLootState();
  const token = pool.available.find((token) => token.kind === kind)!;
  return {
    ...state,
    battle: {
      ...state.battle!,
      loot: {
        ...pool,
        available: pool.available.filter((entry) => entry.id !== token.id),
        placed: [{ ...token, areaId: "a", revealed: false }],
      },
      encounter: {
        round: 1,
        deck: [],
        actedIds: [],
        turn: { type: "hero", actorId: "h0", actions: 2, usedSkillIds: [] },
      },
    },
  };
}
const pick = (state: GameState) => applyCommand(state, { type: "interactLoot", actorId: "h0" });
const choose = (state: GameState, optionId: string) =>
  applyCommand(state, {
    type: "resolveChoice",
    choiceId: state.battle!.pending!.choice.id,
    optionId,
  });
describe("R17–18 / R25 / R-047 / R-059 有限宝箱", () => {
  it("同种子洗池与先攻共用游标；缺区域拒绝，抽空不补代币", () => {
    const fixture = ready("doubleGold");
    const { loot: _loot, encounter: _encounter, ...battle } = fixture.battle!;
    expect(_loot).toBeDefined();
    expect(_encounter).toBeDefined();
    const initial = { ...fixture, battle };
    const start = applyCommand(initial, { type: "startBattle" });
    expect(start).toEqual(applyCommand(initial, { type: "startBattle" }));
    expect(start.state.battle!.rngCursor).toBe(13);
    expect(start.state.battle!.loot!.placed).toHaveLength(1);
    const empty = {
      ...initial,
      battle: {
        ...battle,
        lootPool: {
          ...createLootState(),
          available: [],
          claimedIds: createLootState().available.map((token) => token.id),
        },
      },
    };
    expect(applyCommand(empty, { type: "startBattle" }).state.battle!.loot!.placed).toEqual([]);
  });
  it("自选面不掷骰，冻结行动，过期选择回滚；拾取只扣一次", () => {
    const pending = pick(ready("chooseProvision"));
    expect(pending.pendingChoice?.options).toHaveLength(5);
    const frozen = applyCommand(pending.state, {
      type: "changeStance",
      actorId: "h0",
      direction: "forward",
    });
    expect(frozen.state).toEqual(pending.state);
    const result = choose(pending.state, "bandage");
    expect(result.state.battle!.rngCursor).toBe(0);
    expect(result.state.battle!.provisions?.[0]?.face).toBe("bandage");
    expect(result.state.battle!.encounter!.turn).toMatchObject({ actions: 1 });
    expect(result.state.battle!.loot!.claimedIds).toHaveLength(1);
    expect(result.state.battle!.loot!.placed).toEqual([]);
    expect(choose(pending.state, "bandage")).toEqual(result);
    const stale = applyCommand(result.state, {
      type: "resolveChoice",
      choiceId: pending.pendingChoice!.id,
      optionId: "food",
    });
    expect(stale.state).toEqual(result.state);
  });
  it("Wild 保留原补给骰；选择不重掷", () => {
    let seed = 0;
    while (nextProvisionFace(seed, 0) !== "wild") seed++;
    const pending = pick(ready("rollProvision", 0, seed));
    expect(pending.state.battle!.rngCursor).toBe(1);
    expect(pending.state.battle!.encounter!.turn).toMatchObject({ actions: 2 });
    expect(choose(pending.state, "torch").state.battle!.rngCursor).toBe(1);
  });
  it("两种混合与双倍金币各自结算；满池只开放金币、纯补给不扣行动", () => {
    for (const kind of ["goldOrProvision", "doubleGoldOrChoose"] as const) {
      const pending = pick(ready(kind, 16));
      expect(pending.pendingChoice?.options.map((option) => option.id)).toEqual(["gold"]);
      const result = choose(pending.state, "gold");
      expect(result.state.battle!.rngCursor).toBe(1);
      expect(result.state.battle!.loot!.gold).toBeGreaterThan(0);
      expect(result.state.battle!.provisions).toHaveLength(16);
    }
    const gold = pick(ready("doubleGold"));
    expect(gold.state.battle!.loot!.gold % 2).toBe(0);
    for (const kind of ["rollProvision", "chooseProvision"] as const) {
      const initial = ready(kind, 16);
      expect(pick(initial).state).toEqual(initial);
    }
    const mixed = pick(ready("doubleGoldOrChoose"));
    const face = choose(mixed.state, "provision");
    expect(choose(face.state, "potion").state.battle!.rngCursor).toBe(0);
  });
  it("异区不能拾取；结束回收未拾取，已拾取不回池", () => {
    const initial = ready("doubleGold");
    const away = {
      ...initial,
      battle: {
        ...initial.battle!,
        entities: initial.battle!.entities.map((entity) =>
          entity.id === "h0" ? { ...entity, areaId: "other" } : entity,
        ),
      },
    };
    expect(pick(away).state).toEqual(away);
    expect(closeBattleLoot(initial.battle!.loot)!.available).toHaveLength(10);
    const claimed = pick(initial).state;
    expect(closeBattleLoot(claimed.battle!.loot)!.available).toHaveLength(9);
    const fourth = {
      ...initial,
      battle: {
        ...initial.battle!,
        encounter: {
          round: 4,
          deck: [],
          actedIds: [],
          turn: { type: "monster" as const, actorId: "m" },
        },
      },
    };
    const finished = applyCommand(fourth, { type: "finishMonsterTurn", actorId: "m" });
    expect(finished.state.battle!.encounter!.turn).toMatchObject({ type: "finished" });
    expect(finished.state.battle!.loot!.placed).toEqual([]);
    expect(finished.state.battle!.loot!.available).toHaveLength(10);
  });
});
