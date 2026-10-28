import { describe, expect, it, beforeEach } from "vitest";
import { applyCommand } from "../command";
import type { Command, GameState } from "../command";
import {
  NECROMANCER_I_DESCRIPTION_ABILITY_CARD_ID,
  NECROMANCER_I_SCRIPT_ID,
  PROPHET_I_DESCRIPTION_ABILITY_CARD_ID,
  PROPHET_I_SCRIPT_ID,
  ensureNecromancerIBossScriptRegistered,
  ensureProphetIBossScriptRegistered,
  ensureHagIBossScriptRegistered,
  ensureSwinePrinceIBossScriptRegistered,
  ensureSirenIBossScriptRegistered,
  ensureFleshIBossScriptRegistered,
  ensureCollectorIBossScriptRegistered,
  establishImminentThreat,
  resolveBossScriptIdForQuest,
  HAG_I_DESCRIPTION_ABILITY_CARD_ID,
  HAG_I_SCRIPT_ID,
  SWINE_PRINCE_I_DESCRIPTION_ABILITY_CARD_ID,
  SWINE_PRINCE_I_SCRIPT_ID,
  SIREN_I_DESCRIPTION_ABILITY_CARD_ID,
  SIREN_I_SCRIPT_ID,
  FLESH_I_DESCRIPTION_ABILITY_CARD_ID,
  FLESH_I_SCRIPT_ID,
  COLLECTOR_I_DESCRIPTION_ABILITY_CARD_ID,
  COLLECTOR_I_SCRIPT_ID,
  FACE_THE_THREAT_QUEST_ID,
  getBossScript,
} from "../index";
import { applyActiveBossThreatToDungeon } from "./apply-active-boss-threat";
import { RUINS_BOSS_DESCRIPTION_CARD_ID } from "./threat-description-catalog";
import { resolveScriptIdForDescriptionCard } from "./threat-description-catalog";
import { bossThreatHamletBlockedBuildings } from "./threat-campaign";
import {
  beastMonsterDamageBonusFromBossThreat,
  eldritchMonsterDamageBonusFromBossThreat,
  guardTurnsOnLargeMonsterSpawnFromBossThreat,
  sanitariumHealLifeDeltaFromBossThreat,
  skipCurioDrawInCurioRoomsFromBossThreat,
} from "./threat-passive";
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
    ensureProphetIBossScriptRegistered();
    ensureHagIBossScriptRegistered();
    ensureSwinePrinceIBossScriptRegistered();
    ensureSirenIBossScriptRegistered();
    ensureFleshIBossScriptRegistered();
    ensureCollectorIBossScriptRegistered();
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

  it("抽到已注册 Prophet I 时挂接 activeBossThreatScriptId（无 graveyard 封锁）", () => {
    let prophetSeed: number | undefined;
    for (let seed = 0; seed < 500 && prophetSeed === undefined; seed++) {
      if (drawnDescription(seed) === PROPHET_I_DESCRIPTION_ABILITY_CARD_ID) prophetSeed = seed;
    }
    expect(prophetSeed).toBeDefined();
    const game = ok(baseQuest(prophetSeed!), { type: "establishImminentThreat" });
    expect(game.dungeon!.activeBossThreatScriptId).toBe(PROPHET_I_SCRIPT_ID);
    expect(game.dungeon!.unregisteredImminentThreatHold).toBeUndefined();
    expect(bossThreatHamletBlockedBuildings(game.dungeon!)).not.toContain("graveyard");
  });

  it("抽到已注册 Collector I 时挂接 activeBossThreatScriptId 与游商马车封锁", () => {
    let collectorSeed: number | undefined;
    for (let seed = 0; seed < 500 && collectorSeed === undefined; seed++) {
      if (drawnDescription(seed) === COLLECTOR_I_DESCRIPTION_ABILITY_CARD_ID)
        collectorSeed = seed;
    }
    expect(collectorSeed).toBeDefined();
    const game = ok(baseQuest(collectorSeed!), { type: "establishImminentThreat" });
    expect(game.dungeon!.activeBossThreatScriptId).toBe(COLLECTOR_I_SCRIPT_ID);
    expect(game.dungeon!.unregisteredImminentThreatHold).toBeUndefined();
    expect(bossThreatHamletBlockedBuildings(game.dungeon!)).toContain("nomadWagon");
    const script = getBossScript(COLLECTOR_I_SCRIPT_ID)!;
    expect(skipCurioDrawInCurioRoomsFromBossThreat(script)).toBe(true);
  });

  it("抽到未注册 Fanatic I 时记录 hold，不写入 activeBossThreatScriptId", () => {
    let fanaticSeed: number | undefined;
    for (let seed = 0; seed < 500 && fanaticSeed === undefined; seed++) {
      if (drawnDescription(seed) === RUINS_BOSS_DESCRIPTION_CARD_ID.fanatic[1]) fanaticSeed = seed;
    }
    expect(fanaticSeed).toBeDefined();
    const game = ok(baseQuest(fanaticSeed!), { type: "establishImminentThreat" });
    expect(game.dungeon!.activeBossThreatScriptId).toBeUndefined();
    expect(game.dungeon!.unregisteredImminentThreatHold).toMatch(/fanatic/);
    expect(bossThreatHamletBlockedBuildings(game.dungeon!)).not.toContain("nomadWagon");
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

  it("Hag I 描述卡解析脚本并挂接 activeBossThreatScriptId（Weald；Ruins 开局池不含）", () => {
    expect(resolveScriptIdForDescriptionCard(HAG_I_DESCRIPTION_ABILITY_CARD_ID)).toBe(
      HAG_I_SCRIPT_ID,
    );
    let game = baseQuest(3);
    game = {
      ...game,
      dungeon: applyActiveBossThreatToDungeon(
        {
          ...game.dungeon!,
          imminentThreatDescriptionCardId: HAG_I_DESCRIPTION_ABILITY_CARD_ID,
        },
        HAG_I_SCRIPT_ID,
      ),
    };
    expect(game.dungeon!.activeBossThreatScriptId).toBe(HAG_I_SCRIPT_ID);
    const script = getBossScript(HAG_I_SCRIPT_ID)!;
    expect(sanitariumHealLifeDeltaFromBossThreat(script)).toBe(-3);
    expect(bossThreatHamletBlockedBuildings(game.dungeon!)).not.toContain("graveyard");
  });

  it("Swine Prince I 描述卡解析脚本并挂接 activeBossThreatScriptId（Warrens；Ruins 开局池不含）", () => {
    expect(resolveScriptIdForDescriptionCard(SWINE_PRINCE_I_DESCRIPTION_ABILITY_CARD_ID)).toBe(
      SWINE_PRINCE_I_SCRIPT_ID,
    );
    let game = baseQuest(3);
    game = {
      ...game,
      dungeon: applyActiveBossThreatToDungeon(
        {
          ...game.dungeon!,
          imminentThreatDescriptionCardId: SWINE_PRINCE_I_DESCRIPTION_ABILITY_CARD_ID,
        },
        SWINE_PRINCE_I_SCRIPT_ID,
      ),
    };
    expect(game.dungeon!.activeBossThreatScriptId).toBe(SWINE_PRINCE_I_SCRIPT_ID);
    const script = getBossScript(SWINE_PRINCE_I_SCRIPT_ID)!;
    expect(beastMonsterDamageBonusFromBossThreat(script)).toBe(2);
    expect(bossThreatHamletBlockedBuildings(game.dungeon!)).toContain("survivalist");
  });

  it("Siren I 描述卡解析脚本并挂接 activeBossThreatScriptId（Cove；Ruins 开局池不含）", () => {
    expect(resolveScriptIdForDescriptionCard(SIREN_I_DESCRIPTION_ABILITY_CARD_ID)).toBe(
      SIREN_I_SCRIPT_ID,
    );
    let game = baseQuest(3);
    game = {
      ...game,
      dungeon: applyActiveBossThreatToDungeon(
        {
          ...game.dungeon!,
          imminentThreatDescriptionCardId: SIREN_I_DESCRIPTION_ABILITY_CARD_ID,
        },
        SIREN_I_SCRIPT_ID,
      ),
    };
    expect(game.dungeon!.activeBossThreatScriptId).toBe(SIREN_I_SCRIPT_ID);
    const script = getBossScript(SIREN_I_SCRIPT_ID)!;
    expect(eldritchMonsterDamageBonusFromBossThreat(script)).toBe(2);
    expect(bossThreatHamletBlockedBuildings(game.dungeon!)).toContain("abbey");
  });

  it("The Flesh I 描述卡解析脚本并挂接 activeBossThreatScriptId（Warrens；Ruins 开局池不含）", () => {
    expect(resolveScriptIdForDescriptionCard(FLESH_I_DESCRIPTION_ABILITY_CARD_ID)).toBe(
      FLESH_I_SCRIPT_ID,
    );
    let game = baseQuest(3);
    game = {
      ...game,
      dungeon: applyActiveBossThreatToDungeon(
        {
          ...game.dungeon!,
          imminentThreatDescriptionCardId: FLESH_I_DESCRIPTION_ABILITY_CARD_ID,
        },
        FLESH_I_SCRIPT_ID,
      ),
    };
    expect(game.dungeon!.activeBossThreatScriptId).toBe(FLESH_I_SCRIPT_ID);
    const script = getBossScript(FLESH_I_SCRIPT_ID)!;
    expect(guardTurnsOnLargeMonsterSpawnFromBossThreat(script)).toBe(2);
    expect(bossThreatHamletBlockedBuildings(game.dungeon!)).toEqual([]);
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
