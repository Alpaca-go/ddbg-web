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
import { darkestMidBossDeploymentHold } from "./darkest-mid-boss-runtime";
import { isBossEncounter, resolveEncounterBossScriptId } from "./encounter-rules";
import { getBossScript } from "./registry";
import { bossQuestScriptId, resolveBossScriptIdForQuest } from "./quest-bridge";

const quests = [
  ["quest:p016", DARKEST_SHUFFLING_HORROR_SCRIPT_ID, "room:p023"] as const,
  ["quest:p017", DARKEST_TEMPLARS_SCRIPT_ID, "room:p022"] as const,
  ["quest:p018", DARKEST_MAMMOTH_CYST_SCRIPT_ID, "room:p024"] as const,
];

function ok(game: GameState, command: Command) {
  const result = applyCommand(game, command);
  expect(
    result.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toBe(false);
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

  it("quest:p016 绑房后须 deployShufflingHorrorI，prepareDungeonMonsters 占位部署拒绝", () => {
    const game = createCoreDungeonQuest(7, "quest:p016", "radiant", coreParty, coreQuestSources);
    const d = game.dungeon!;
    const room = d.rooms.find((r) => r.kind === "objective")!;
    const bound = ok(
      { ...game, dungeon: { ...d, phase: "awaitingRoom", position: room.id } },
      { type: "prepareDungeonBattle" },
    );
    expect(bound.state.dungeon!.roomCards!.active!.blockedReason).toContain(
      "deployShufflingHorrorI",
    );
    expect(
      applyCommand(bound.state, { type: "prepareDungeonMonsters" }).events.some(
        (e) => e.type === "commandRefused",
      ),
    ).toBe(true);
    expect(darkestMidBossDeploymentHold(bound.state.dungeon!)).toContain("deployShufflingHorrorI");
    const deployed = ok(bound.state, { type: "deployShufflingHorrorI" });
    expect(resolveEncounterBossScriptId(deployed.state)).toBe(DARKEST_SHUFFLING_HORROR_SCRIPT_ID);
    expect(isBossEncounter(deployed.state)).toBe(true);
  });

  it("quest:p017 绑房后须 deployTemplarsI，prepareDungeonMonsters 占位部署拒绝", () => {
    const game = createCoreDungeonQuest(7, "quest:p017", "radiant", coreParty, coreQuestSources);
    const d = game.dungeon!;
    const room = d.rooms.find((r) => r.kind === "objective")!;
    const bound = ok(
      { ...game, dungeon: { ...d, phase: "awaitingRoom", position: room.id } },
      { type: "prepareDungeonBattle" },
    );
    expect(bound.state.dungeon!.roomCards!.active!.blockedReason).toContain("deployTemplarsI");
    expect(
      applyCommand(bound.state, { type: "prepareDungeonMonsters" }).events.some(
        (e) => e.type === "commandRefused",
      ),
    ).toBe(true);
    expect(darkestMidBossDeploymentHold(bound.state.dungeon!)).toContain("deployTemplarsI");
    const deployed = ok(bound.state, { type: "deployTemplarsI" });
    expect(resolveEncounterBossScriptId(deployed.state)).toBe(DARKEST_TEMPLARS_SCRIPT_ID);
    expect(isBossEncounter(deployed.state)).toBe(true);
  });

  it("quest:p018 绑房后须 deployMammothCystI，prepareDungeonMonsters 占位部署拒绝", () => {
    const game = createCoreDungeonQuest(7, "quest:p018", "radiant", coreParty, coreQuestSources);
    const d = game.dungeon!;
    const room = d.rooms.find((r) => r.kind === "objective")!;
    const bound = ok(
      { ...game, dungeon: { ...d, phase: "awaitingRoom", position: room.id } },
      { type: "prepareDungeonBattle" },
    );
    expect(bound.state.dungeon!.roomCards!.active!.blockedReason).toContain("deployMammothCystI");
    expect(
      applyCommand(bound.state, { type: "prepareDungeonMonsters" }).events.some(
        (e) => e.type === "commandRefused",
      ),
    ).toBe(true);
    expect(darkestMidBossDeploymentHold(bound.state.dungeon!)).toContain("deployMammothCystI");
    const deployed = ok(bound.state, { type: "deployMammothCystI" });
    expect(resolveEncounterBossScriptId(deployed.state)).toBe(DARKEST_MAMMOTH_CYST_SCRIPT_ID);
    expect(isBossEncounter(deployed.state)).toBe(true);
  });

  it("quest:p018 wiringHold 含 Summon White Cell 已接", () => {
    const game = createCoreDungeonQuest(7, "quest:p018", "radiant", coreParty, coreQuestSources);
    const d = game.dungeon!;
    const room = d.rooms.find((r) => r.kind === "objective")!;
    const bound = ok(
      {
        ...game,
        dungeon: { ...d, phase: "awaitingRoom", position: room.id },
      },
      { type: "prepareDungeonBattle" },
    );
    expect(bound.state.dungeon!.darkest!.bossEncounterPlan!.wiringHold).toContain(
      "deployMammothCystI",
    );
    expect(bound.state.dungeon!.darkest!.bossEncounterPlan!.wiringHold).toContain(
      "Summon White Cell Stalk",
    );
  });
});
