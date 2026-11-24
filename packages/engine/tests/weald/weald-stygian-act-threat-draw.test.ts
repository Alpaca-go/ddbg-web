import { expect, it } from "vitest";
import { applyCommand, type GameState } from "../../src/command";
import { createCoreDungeonQuest } from "../../src/dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../../src/test-helpers/core-quest";
import { wealdThreatPool } from "../../src/weald/bosses/threat-pool";
import { clearBossScriptsForTest } from "../../src/core/bosses/registry";

const packs = ["core", "weald"] as const;
const productionEstablish = {
  type: "establishImminentThreat",
  locationBosses: true,
  locationSources: true,
  pounderDungeonThreats: true,
  pounderHamletThreats: true,
  pounderBossBattles: true,
  shriekerBossBattles: true,
  wealdHigherBosses: true,
} as const;

const initialStygian = () =>
  createCoreDungeonQuest(3, "quest:p001", "stygian", coreParty, coreQuestSources, true, "full", [
    ...packs,
  ]);

function withActAdvanceReady(game: GameState): GameState {
  const {
    activeBossThreatScriptId: _active,
    imminentThreatDescriptionCardId: _card,
    ...d
  } = game.dungeon!;
  void _active;
  void _card;
  return {
    ...game,
    dungeon: {
      ...d,
      campaignLevel: 2,
      locationBossThreats: true,
      bossLocationSources: true,
      wealdHigherBosses: true,
      defeatedWealdBossIdentities: ["hag"],
      defeatedRuinsBossIdentities: [],
    },
  };
}

it("生产版 Stygian：drawImminentThreatAfterActAdvance 与 standard 同池同门禁", () => {
  const established = applyCommand(initialStygian(), productionEstablish);
  expect(established.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  const state = withActAdvanceReady(established.state);
  clearBossScriptsForTest();
  const before = structuredClone(state);
  const draw = applyCommand(state, { type: "drawImminentThreatAfterActAdvance" });
  expect(draw.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(wealdThreatPool(draw.state.dungeon!, 2)).toContain(
    draw.state.dungeon!.imminentThreatDescriptionCardId,
  );
  expect(draw.state.dungeon!.mode).toBe("stygian");
  expect(draw.state.dungeon!.stygianRoomRules).toBe("full");
  expect(applyCommand(state, { type: "drawImminentThreatAfterActAdvance" })).toEqual(draw);
  expect(state).toEqual(before);
});

it("缺 wealdHigherBosses 时 Stygian 与 radiant 同样保留 W3 版本停点", () => {
  const radiant = applyCommand(
    createCoreDungeonQuest(3, "quest:p001", "radiant", coreParty, coreQuestSources, true, null, [
      ...packs,
    ]),
    productionEstablish,
  );
  const { wealdHigherBosses: _v, ...dungeon } = radiant.state.dungeon!;
  void _v;
  for (const mode of ["stygian", "radiant"] as const) {
    const game: GameState = {
      ...radiant.state,
      dungeon: {
        ...dungeon,
        mode,
        ...(mode === "stygian" ? { stygianRoomRules: "full" as const } : {}),
        campaignLevel: 2,
        locationBossThreats: true,
        defeatedWealdBossIdentities: ["hag"],
        defeatedRuinsBossIdentities: [],
      },
    };
    const result = applyCommand(game, { type: "drawImminentThreatAfterActAdvance" });
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(true);
    expect(result.state).toEqual(game);
  }
});

it("核心-only 不受地点 Boss 升幕池影响", () => {
  const core = applyCommand(
    createCoreDungeonQuest(11, "quest:p001", "stygian", coreParty, coreQuestSources, true, "full", [
      "core",
    ]),
    { type: "establishImminentThreat" },
  );
  const {
    activeBossThreatScriptId: _a,
    imminentThreatDescriptionCardId: _c,
    ...baseDungeon
  } = core.state.dungeon!;
  void _a;
  void _c;
  const level2: GameState = {
    ...core.state,
    dungeon: {
      ...baseDungeon,
      campaignLevel: 2,
      defeatedRuinsBossIdentities: ["necromancer"],
    },
  };
  const draw = applyCommand(level2, { type: "drawImminentThreatAfterActAdvance" });
  expect(draw.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(draw.state.dungeon!.locationBossThreats).toBeUndefined();
});

it("单独 pounderDungeonThreats 试验不参与升幕抽牌状态", () => {
  const trial = applyCommand(initialStygian(), {
    type: "establishImminentThreat",
    locationBosses: true,
    locationSources: true,
    pounderDungeonThreats: true,
  });
  expect(trial.events.some((e) => e.type === "commandRefused")).toBe(true);
});

it("III 级：剩余 Boss 按战役等级抽当前级描述卡（七位混合池）", () => {
  const established = applyCommand(initialStygian(), productionEstablish);
  const {
    activeBossThreatScriptId: _a,
    imminentThreatDescriptionCardId: _c,
    ...d
  } = established.state.dungeon!;
  void _a;
  void _c;
  const state: GameState = {
    ...established.state,
    dungeon: {
      ...d,
      campaignLevel: 3,
      defeatedWealdBossIdentities: ["hag", "shrieker"],
      defeatedRuinsBossIdentities: [],
    },
  };
  clearBossScriptsForTest();
  const draw = applyCommand(state, { type: "drawImminentThreatAfterActAdvance" });
  expect(draw.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  const pool = wealdThreatPool(state.dungeon!, 3);
  expect(pool).toHaveLength(5);
  expect(pool).toContain(draw.state.dungeon!.imminentThreatDescriptionCardId);
});

it("同种子 production：Stygian 与 standard 升幕抽牌 RNG 一致", () => {
  const seed = 5;
  const modes = ["standard", "stygian"] as const;
  const draws = modes.map((mode) => {
    const base = createCoreDungeonQuest(
      seed,
      "quest:p001",
      mode,
      coreParty,
      coreQuestSources,
      true,
      mode === "stygian" ? "full" : null,
      [...packs],
    );
    const established = applyCommand(base, productionEstablish);
    const {
      activeBossThreatScriptId: _a,
      imminentThreatDescriptionCardId: _c,
      ...d
    } = established.state.dungeon!;
    void _a;
    void _c;
    const ready: GameState = {
      ...established.state,
      dungeon: {
        ...d,
        campaignLevel: 2,
        defeatedWealdBossIdentities: ["hag"],
        defeatedRuinsBossIdentities: [],
      },
    };
    clearBossScriptsForTest();
    return applyCommand(ready, { type: "drawImminentThreatAfterActAdvance" }).state.dungeon!
      .imminentThreatDescriptionCardId;
  });
  expect(draws[0]).toBe(draws[1]);
});
