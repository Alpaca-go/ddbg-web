import { describe, expect, it } from "vitest";
import type { BasicQuestId } from "../../../../data/src/basic-quests";
import type { GameState } from "../../../src/shared/core/command";
import { createCoreDungeonQuest } from "../../../src/shared/dungeon/dungeon-quest-entry";
import { ensureCampaignBossScriptsRegistered } from "../../../src/shared/core/registry";
import { coreParty } from "../../helpers/core-quest";
import { wealdTaskSources } from "../../helpers/weald-task-battle";
import { firstBattleThreatDeck } from "../../../src/core/bosses/necromancer-ii-army";
import {
  shriekerHigherThreatLevel,
  shriekerIThreatActive,
} from "../../../src/weald/bosses/shrieker-i-provisions";
import { shriekerSkipsProvisionRolls } from "../../../src/weald/bosses/shrieker-provision-version";
import {
  activeBossThreatMatchesDungeonLocation,
  bossThreatHamletBlockedBuildings,
} from "../../../src/core/bosses/threat-campaign";

const packs = ["core", "weald"] as const;

function stateWithThreat(questId: BasicQuestId, scriptId: string): GameState {
  ensureCampaignBossScriptsRegistered([...packs]);
  const game = createCoreDungeonQuest(
    1,
    questId,
    "standard",
    coreParty,
    wealdTaskSources,
    true,
    null,
    [...packs],
  );
  return {
    ...game,
    dungeon: {
      ...game.dungeon!,
      locationBossThreats: true,
      bossLocationSources: true,
      activeBossThreatScriptId: scriptId as never,
    },
  };
}

function stateWithShrieker(questId: BasicQuestId, level: 1 | 2): GameState {
  ensureCampaignBossScriptsRegistered([...packs]);
  const game = createCoreDungeonQuest(
    1,
    questId,
    "standard",
    coreParty,
    wealdTaskSources,
    true,
    null,
    [...packs],
  );
  return {
    ...game,
    dungeon: {
      ...game.dungeon!,
      phase: "ready",
      campaignLevel: level,
      locationBossThreats: true,
      bossLocationSources: true,
      shriekerBossBattles: true,
      ...(level === 2 ? { wealdHigherBosses: true, shriekerProvisionSkipRolls: true } : {}),
      activeBossThreatScriptId: `boss:weald:shrieker:${level}` as never,
      imminentThreatDescriptionCardId:
        level === 1 ? "boss_ability:weald:p001" : "boss_ability:weald:p002",
    },
  };
}

describe("R-273：地牢侧 Boss 威胁只在其所属地点的地牢生效", () => {
  it("遗迹 Boss 威胁在 Weald 任务不匹配，在遗迹任务匹配", () => {
    const weald = stateWithThreat("quest:weald:p001", "boss:ruins:necromancer:2");
    const ruins = stateWithThreat("quest:p001", "boss:ruins:necromancer:2");
    expect(activeBossThreatMatchesDungeonLocation(weald.dungeon!)).toBe(false);
    expect(activeBossThreatMatchesDungeonLocation(ruins.dungeon!)).toBe(true);
  });

  it("Weald Boss 威胁对称：遗迹任务不匹配，Weald 任务匹配", () => {
    const ruins = stateWithThreat("quest:p001", "boss:weald:pounder:1");
    const weald = stateWithThreat("quest:weald:p001", "boss:weald:pounder:1");
    expect(activeBossThreatMatchesDungeonLocation(ruins.dungeon!)).toBe(false);
    expect(activeBossThreatMatchesDungeonLocation(weald.dungeon!)).toBe(true);
  });

  it("Army of the Dead 不在 Weald 任务强制 Bone Captain；遗迹任务保留真实牌池判定", () => {
    const weald = stateWithThreat("quest:weald:p001", "boss:ruins:necromancer:2");
    const ruins = stateWithThreat("quest:p001", "boss:ruins:necromancer:2");
    const boneCaptain = {
      instanceId: "bone-captain",
      cardId: "monster_large:p001",
      edge: "front" as const,
      stanceSlots: 2 as const,
      verified: true,
    };
    const other = {
      instanceId: "other",
      cardId: "monster_medium:p001",
      edge: "front" as const,
      stanceSlots: 1 as const,
      verified: true,
    };

    expect(firstBattleThreatDeck(weald.dungeon!, [boneCaptain, other])).toMatchObject({
      status: "ok",
      forced: false,
    });
    const forced = firstBattleThreatDeck(ruins.dungeon!, [boneCaptain, other]);
    expect(forced).toMatchObject({ status: "ok", forced: true });
    if (forced.status === "ok") expect(forced.deck[0]!.instanceId).toBe("bone-captain");
    expect(firstBattleThreatDeck(ruins.dungeon!, [other])).toMatchObject({ status: "refused" });
  });

  it("村庄侧不受地点过滤：遗迹 Boss 的村庄封锁仍在 Weald 任务期间生效", () => {
    const weald = stateWithThreat("quest:weald:p001", "boss:ruins:necromancer:1");
    expect(activeBossThreatMatchesDungeonLocation(weald.dungeon!)).toBe(false);
    expect(bossThreatHamletBlockedBuildings(weald.dungeon!)).toContain("graveyard");
  });

  it("Shrieker I 的补给盗取只在 Weald 任务生效", () => {
    const weald = stateWithShrieker("quest:weald:p001", 1);
    const ruins = stateWithShrieker("quest:p001", 1);
    expect(shriekerIThreatActive(weald)).toBe(true);
    expect(shriekerIThreatActive(ruins)).toBe(false);
  });

  it("Shrieker II 的补给跳过与高等级盗取只在 Weald 任务生效", () => {
    const weald = stateWithShrieker("quest:weald:p001", 2);
    const ruins = stateWithShrieker("quest:p001", 2);
    expect(shriekerHigherThreatLevel(weald)).toBe(2);
    expect(shriekerHigherThreatLevel(ruins)).toBeNull();
    expect(shriekerSkipsProvisionRolls(weald.dungeon!)).toBe(true);
    expect(shriekerSkipsProvisionRolls(ruins.dungeon!)).toBe(false);
  });
});
