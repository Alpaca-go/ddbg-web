import { describe, expect, it, beforeEach } from "vitest";
import { applyCommand } from "../command";
import type { Command, GameState } from "../command";
import {
  NECROMANCER_I_DESCRIPTION_ABILITY_CARD_ID,
  NECROMANCER_I_SCRIPT_ID,
  ensureNecromancerIBossScriptRegistered,
  establishImminentThreat,
  resolveBossScriptIdForQuest,
  FACE_THE_THREAT_QUEST_ID,
} from "../index";
import { RUINS_BOSS_DESCRIPTION_CARD_ID } from "./threat-description-catalog";
import { bossThreatHamletBlockedBuildings } from "./threat-campaign";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../test-helpers/core-quest";

function ok(game: GameState, command: Command) {
  const result = applyCommand(game, command);
  expect(
    result.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toBe(false);
  return result.state;
}

function baseQuest(seed: number) {
  return createCoreDungeonQuest(seed, "quest:p001", "radiant", coreParty, coreQuestSources);
}

function drawnDescription(seed: number): string {
  const game = ok(baseQuest(seed), { type: "establishImminentThreat" });
  return game.dungeon!.imminentThreatDescriptionCardId!;
}

describe("定威胁 / Imminent Threat 正式流程", () => {
  beforeEach(() => {
    ensureNecromancerIBossScriptRegistered();
  });

  it("战役开局 establishImminentThreat 确定性抽牌并写入描述卡 id", () => {
    const seed = 42;
    const game = ok(baseQuest(seed), { type: "establishImminentThreat" });
    const cardId = game.dungeon!.imminentThreatDescriptionCardId;
    expect(cardId).toBe(drawnDescription(seed));
    expect(RUINS_BOSS_DESCRIPTION_CARD_ID.necromancer[1]).toBe(
      NECROMANCER_I_DESCRIPTION_ABILITY_CARD_ID,
    );
  });

  it("抽到已注册 Necromancer I 时挂接 activeBossThreatScriptId 与 graveyard 封锁", () => {
    let necromancerSeed: number | undefined;
    for (let seed = 0; seed < 200 && necromancerSeed === undefined; seed++) {
      if (drawnDescription(seed) === NECROMANCER_I_DESCRIPTION_ABILITY_CARD_ID)
        necromancerSeed = seed;
    }
    expect(necromancerSeed).toBeDefined();
    const game = ok(baseQuest(necromancerSeed!), { type: "establishImminentThreat" });
    expect(game.dungeon!.activeBossThreatScriptId).toBe(NECROMANCER_I_SCRIPT_ID);
    expect(bossThreatHamletBlockedBuildings(game.dungeon!)).toContain("graveyard");
    expect(game.dungeon!.unregisteredImminentThreatHold).toBeUndefined();
  });

  it("抽到未注册 Boss 时记录 hold，不写入 activeBossThreatScriptId", () => {
    let prophetSeed: number | undefined;
    for (let seed = 0; seed < 500 && prophetSeed === undefined; seed++) {
      if (drawnDescription(seed) === RUINS_BOSS_DESCRIPTION_CARD_ID.prophet[1]) prophetSeed = seed;
    }
    expect(prophetSeed).toBeDefined();
    const game = ok(baseQuest(prophetSeed!), { type: "establishImminentThreat" });
    expect(game.dungeon!.activeBossThreatScriptId).toBeUndefined();
    expect(game.dungeon!.unregisteredImminentThreatHold).toMatch(/prophet/);
    expect(bossThreatHamletBlockedBuildings(game.dungeon!)).not.toContain("graveyard");
  });

  it("重复 establish 与战斗中被拒", () => {
    const game = ok(baseQuest(7), { type: "establishImminentThreat" });
    expect(
      applyCommand(game, { type: "establishImminentThreat" }).events.some(
        (e) => e.type === "commandRefused",
      ),
    ).toBe(true);
    const inBattle = {
      ...game,
      battle: { rngCursor: 0, choiceCursor: 0 } as NonNullable<GameState["battle"]>,
    };
    expect(
      establishImminentThreat(inBattle, { type: "establishImminentThreat" }).events.some(
        (e) => e.type === "commandRefused",
      ),
    ).toBe(true);
  });

  it("升幕 drawImminentThreatAfterActAdvance 从剩余 Boss 的下一级描述卡抽牌", () => {
    let game = ok(baseQuest(11), { type: "establishImminentThreat" });
    const { activeBossThreatScriptId: _cleared, ...dungeonRest } = game.dungeon!;
    void _cleared;
    game = {
      ...game,
      dungeon: {
        ...dungeonRest,
        campaignLevel: 2,
        defeatedRuinsBossIdentities: ["necromancer"],
      },
    };
    game = ok(game, { type: "drawImminentThreatAfterActAdvance" });
    const cardId = game.dungeon!.imminentThreatDescriptionCardId!;
    expect(
      [
        RUINS_BOSS_DESCRIPTION_CARD_ID.prophet[2],
        RUINS_BOSS_DESCRIPTION_CARD_ID.collector[2],
        RUINS_BOSS_DESCRIPTION_CARD_ID.fanatic[2],
      ].includes(cardId),
    ).toBe(true);
  });

  it("Face the Threat 解析优先 activeBossThreatScriptId", () => {
    expect(
      resolveBossScriptIdForQuest(FACE_THE_THREAT_QUEST_ID, {
        campaignLevel: 1,
        activeBossThreatScriptId: NECROMANCER_I_SCRIPT_ID,
      }),
    ).toBe(NECROMANCER_I_SCRIPT_ID);
  });

  it("setActiveBossThreat 仍为测试 stub，消息标明 stub", () => {
    const game = baseQuest(3);
    const result = applyCommand(game, {
      type: "setActiveBossThreat",
      scriptId: NECROMANCER_I_SCRIPT_ID,
    });
    expect(result.events[0]?.message).toMatch(/stub/);
  });
});
