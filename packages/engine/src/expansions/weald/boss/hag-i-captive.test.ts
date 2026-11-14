import { beforeEach, expect, it } from "vitest";
import { createBattleState, type BattleEntity } from "../../../battle";
import { applyCommand, type GameState } from "../../../command";
import { hagIInitialDeployment } from "./hag-i-projection";
import { captureHagIHero, hagIReleaseAreas, releaseHagIHero } from "./hag-i-captive";
import { ensureHagIBossScriptRegistered, HAG_I_SCRIPT_ID } from "./hag-i";
import { FACE_THE_THREAT_QUEST_ID } from "../../../boss/quest-bridge";

beforeEach(() => ensureHagIBossScriptRegistered());

function fixture(): GameState {
  // 受控状态原语夹具；英雄人工 Life 不作为印刷数据或自然战役验收。
  const plan = hagIInitialDeployment();
  const heroes = (["aggressive", "defensive", "ranged", "support"] as const).map(
    (stance, i): BattleEntity => ({
      id: `h${i}`,
      hero: "CRUSADER",
      heroStatId: "test:crusader",
      side: "hero",
      life: 10,
      wounds: i,
      dodge: 0,
      stress: 1,
      areaId: ["A", "I", "J", "J"][i]!,
      stance,
      skillIds: [],
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
    }),
  );
  const state = createBattleState(7, {
    ...plan,
    entities: [...heroes, ...plan.entities],
    light: 5,
    skills: [],
    heroStats: [{ id: "test:crusader", name: "CRUSADER", life: 10, attributesVerified: true }],
  });
  return {
    ...state,
    dungeon: {
      phase: "inBattle",
      cursor: 0,
      heroes: [],
      questDistribution: { questId: FACE_THE_THREAT_QUEST_ID, campaignLevel: 1 },
      activeBossThreatScriptId: HAG_I_SCRIPT_ID,
    } as unknown as NonNullable<GameState["dungeon"]>,
    battle: {
      ...state.battle!,
      encounter: {
        round: 1,
        deck: ["hero", "monster", "hero", "hero", "monster", "hero"],
        actedIds: [],
        turn: { type: "monster", actorId: "boss:hag" },
      },
    },
  };
}

it("R-255 入锅离板、移除未用先攻与原姿态，后方前移，Full 清伤且无内置防护", () => {
  const state = fixture();
  const before = structuredClone(state);
  const result = captureHagIHero(state, "h1");
  expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
  const b = result.state.battle!;
  expect(b.entities.some((e) => e.id === "h1")).toBe(false);
  expect(b.hagCauldron!.hero).toMatchObject({ id: "h1", wounds: 1, stress: 1 });
  expect(b.hagCauldron!.hero).not.toHaveProperty("stance");
  expect(b.hagCauldron!.hero).not.toHaveProperty("areaId");
  expect(b.entities.filter((e) => e.side === "hero").map((e) => e.stance)).toEqual([
    "aggressive",
    "defensive",
    "ranged",
  ]);
  expect(b.encounter!.deck.filter((s) => s === "hero")).toHaveLength(3);
  expect(b.entities.find((e) => e.id === "boss:hag:cauldron-empty")).toMatchObject({
    life: 9,
    wounds: 0,
    innateProtection: false,
    protection: false,
  });
  expect(b.rngCursor).toBe(state.battle!.rngCursor);
  expect(state).toEqual(before);
  expect(captureHagIHero(result.state, "h2").state).toBe(result.state);
});

it("已行动英雄入锅不删掉其他英雄的剩余先攻；拒绝错误回合和无效英雄", () => {
  const state = fixture();
  const acted = {
    ...state,
    battle: { ...state.battle!, encounter: { ...state.battle!.encounter!, actedIds: ["h1"] } },
  };
  expect(captureHagIHero(acted, "h1").state.battle!.encounter!.deck).toEqual(
    acted.battle.encounter.deck,
  );
  expect(captureHagIHero(state, "missing").state).toBe(state);
  const waiting: GameState = {
    ...state,
    battle: {
      ...state.battle!,
      encounter: { ...state.battle!.encounter!, turn: { type: "awaitingInitiative" } },
    },
  };
  expect(captureHagIHero(waiting, "h1").state).toBe(waiting);
});

it("释放经公开 resolveChoice 选择邻区，进入 Aggressive，其余后移且不凭空补先攻", () => {
  const captured = captureHagIHero(fixture(), "h1").state;
  const before = structuredClone(captured);
  expect(hagIReleaseAreas(captured)).toEqual(["C", "E", "H"]);
  const offered = releaseHagIHero(captured);
  expect(releaseHagIHero(offered.state)).toEqual({
    state: offered.state,
    events: [],
    pendingChoice: offered.pendingChoice,
  });
  expect(offered.pendingChoice!.options.map((o) => o.id)).toEqual(["C", "E", "H"]);
  const invalid = applyCommand(offered.state, {
    type: "resolveChoice",
    choiceId: offered.pendingChoice!.id,
    optionId: "F",
  });
  expect(invalid.state).toBe(offered.state);
  const released = applyCommand(offered.state, {
    type: "resolveChoice",
    choiceId: offered.pendingChoice!.id,
    optionId: "E",
  });
  expect(released.events.some((e) => e.type === "commandRefused")).toBe(false);
  const b = released.state.battle!;
  expect(b.hagCauldron).toBeUndefined();
  expect(b.pending).toBeNull();
  expect(b.entities.find((e) => e.id === "h1")).toMatchObject({
    stance: "aggressive",
    areaId: "E",
    wounds: 1,
  });
  expect(b.entities.filter((e) => e.side === "hero" && e.id !== "h1").map((e) => e.stance)).toEqual(
    ["defensive", "ranged", "support"],
  );
  expect(b.entities.find((e) => e.id === "boss:hag:cauldron-empty")).toMatchObject({
    life: 66,
    wounds: 0,
    protection: true,
    dead: false,
  });
  expect(b.encounter!.deck).toEqual(captured.battle!.encounter!.deck);
  expect(b.encounter!.actedIds).toContain("h1");
  expect(b.rngCursor).toBe(captured.battle!.rngCursor);
  expect(captured).toEqual(before);
  expect(
    applyCommand(released.state, {
      type: "resolveChoice",
      choiceId: offered.pendingChoice!.id,
      optionId: "E",
    }).state,
  ).toBe(released.state);
});

it("无容量或非邻接区原子拒绝，保留锅内英雄，不指定默认落点", () => {
  const captured = captureHagIHero(fixture(), "h0").state;
  expect(releaseHagIHero(captured, "A").state).toBe(captured);
  const blocked = {
    ...captured,
    battle: {
      ...captured.battle!,
      areas: captured.battle!.areas.map((a) => ({ ...a, capacity: 0 })),
    },
  };
  expect(releaseHagIHero(blocked).state).toBe(blocked);
  expect(releaseHagIHero(blocked).events.some((e) => e.type === "commandRefused")).toBe(true);
});
