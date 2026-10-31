import { describe, expect, it } from "vitest";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../test-helpers/core-quest";
import { applyCommand, type Command, type GameState } from "../command";
import {
  DARKEST_MAMMOTH_CYST_SCRIPT_ID,
  DARKEST_SHUFFLING_HORROR_SCRIPT_ID,
  DARKEST_TEMPLARS_SCRIPT_ID,
  ensureDarkestMidBossScriptsRegistered,
} from "./darkest-mid-boss-scripts";
import {
  darkestMidBossDeploymentHold,
  prepareDarkestMidBossDeployment,
} from "./darkest-mid-boss-runtime";
import { isBossEncounter, resolveEncounterBossScriptId } from "./encounter-rules";
import { getBossScript } from "./registry";
import {
  bossQuestScriptId,
  resolveBossScriptIdForQuest,
} from "./quest-bridge";

const quests = [
  ["quest:p016", DARKEST_SHUFFLING_HORROR_SCRIPT_ID, "room:p023"] as const,
  ["quest:p017", DARKEST_TEMPLARS_SCRIPT_ID, "room:p022"] as const,
  ["quest:p018", DARKEST_MAMMOTH_CYST_SCRIPT_ID, "room:p024"] as const,
];

function ok(game: GameState, command: Command) {
  const result = applyCommand(game, command);
  expect(result.events.some((e) => e.type === "commandRefused"), JSON.stringify(result.events)).toBe(
    false,
  );
  return result;
}

describe("最暗中途 Boss 运行时接线", () => {
  it("注册脚本并与 quest-bridge 映射一致", () => {
    ensureDarkestMidBossScriptsRegistered();
    for (const [questId, scriptId] of quests) {
      expect(bossQuestScriptId[questId]).toBe(scriptId);
      expect(resolveBossScriptIdForQuest(questId)).toBe(scriptId);
      expect(getBossScript(scriptId)?.combatEntry?.combatMonsterCardId).toBeTruthy();
    }
  });

  it.each(quests)("目标房：绑定专属房间 → 部署 Boss 身份 → Boss 遭遇判定（%s）", (questId, scriptId, roomCardId) => {
    const game = createCoreDungeonQuest(7, questId, "radiant", coreParty, coreQuestSources);
    const d = game.dungeon!;
    const room = d.rooms.find((r) => r.kind === "objective")!;
    const battlePrep = ok(
      {
        ...game,
        dungeon: { ...d, phase: "awaitingRoom", position: room.id },
      },
      { type: "prepareDungeonBattle" },
    );
    expect(battlePrep.state.dungeon!.darkest!.bossEncounterPlan?.resolvedScriptId).toBe(scriptId);
    expect(battlePrep.state.dungeon!.roomCards!.active!.cardId).toBe(roomCardId);
    expect(battlePrep.state.dungeon!.roomCards!.active!.blockedReason).toContain("combatReady: false");
    const deployed = ok(battlePrep.state, { type: "prepareDungeonMonsters" });
    const deployment = deployed.state.dungeon!.darkest!.bossDeployment!;
    expect(deployment.monsters.map((m) => m.cardId).sort()).toEqual(
      [...(deployed.state.dungeon!.darkest!.bossEncounterPlan!.actorCardIds)].sort(),
    );
    expect(darkestMidBossDeploymentHold(deployed.state.dungeon!)).toContain("不能进入半场战斗");
    expect(resolveEncounterBossScriptId(deployed.state)).toBe(scriptId);
    expect(isBossEncounter(deployed.state)).toBe(true);
    expect(prepareDarkestMidBossDeployment(deployed.state)).toMatchObject({
      events: [{ type: "commandRefused" }],
    });
  });
});
