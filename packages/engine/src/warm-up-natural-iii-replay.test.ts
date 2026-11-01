import { beforeAll, describe, expect, it } from "vitest";
import { applyCommand, type Command, type GameState } from "./command";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { coreQuestSources } from "./test-helpers/core-quest";
import {
  warmUpFreeIiiEmbarkChoice,
  warmUpNaturalIiiEmbarkJourney,
  warmUpNaturalIiiGuildPrefix,
} from "./test-helpers/warm-up-natural-iii-prefix";

function ok(state: GameState, command: Command) {
  const result = applyCommand(state, command);
  expect(
    result.events.filter((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toEqual([]);
  return result.state;
}

describe("A-08 Warm Up · 自然 III 升幕出征 quest:p011 存档回放", () => {
  let journey: ReturnType<typeof warmUpNaturalIiiEmbarkJourney>;

  beforeAll(() => {
    journey = warmUpNaturalIiiEmbarkJourney();
  }, 120_000);

  it("公开 advanceRuinsAct→抽 III 级任务→出征 p011：写入改 Torch 标记并完成开局停点", () => {
    expect(journey.game.dungeon!.campaignLevel).toBe(3);
    expect(journey.game.dungeon!.questDistribution!.questId).toBe("quest:p011");
    expect(journey.game.dungeon!.warmUpStartingProvisionTorchChoice).toBeUndefined();
    expect(journey.game.dungeon!.explorationSetup!.provisions.some((p) => p.face === "torch")).toBe(
      true,
    );
    expect(journey.commands[0]).toEqual({ type: "advanceRuinsAct" });
    expect(journey.commands.some((c) => c.type === "offerNextQuest")).toBe(true);
    expect(journey.commands.some((c) => c.type === "rollDungeonProvisions")).toBe(true);
  });

  it("从 II 幕末夹具严格重放命令序列，与终态一致", () => {
    let state = journey.actReady;
    for (const command of journey.commands) state = ok(state, command);
    expect(state).toEqual(journey.game);
  });

  it("quest:p019 起点命令日志：可正式存档往返，或与 #413 一致在完整 Boss 链前仅验收 actReady 边界重放", () => {
    let replayed = journey.actReady;
    for (const command of journey.commands) replayed = ok(replayed, command);
    expect(replayed).toEqual(journey.game);
    if (!journey.save) {
      expect(() =>
        createQuestSave(journey.start, [...journey.commands], journey.game, coreQuestSources),
      ).toThrow(/不一致|无法回放/);
      return;
    }
    const loaded = loadQuestSave(JSON.parse(JSON.stringify(journey.save)), coreQuestSources);
    expect(loaded.game).toEqual(journey.game);
    expect(loaded.commands).toEqual([...journey.commands]);
  });

  it("同 III 升幕抽选出征非 p011 时不写 Warm Up 标记（与 #428 无标记回归不冲突）", () => {
    const embarked = warmUpFreeIiiEmbarkChoice(journey, journey.alternateOffer);
    expect(embarked.dungeon!.warmUpStartingProvisionTorchChoice).toBeUndefined();
    expect(embarked.dungeon!.phase).toBe("awaitingProvisions");
  });

  it("自然 I 级 guildQuest 前缀存档仍可加载，且不携带 Warm Up 标记", () => {
    const prefix = warmUpNaturalIiiGuildPrefix(11);
    const loaded = loadQuestSave(JSON.parse(JSON.stringify(prefix.save)), coreQuestSources);
    expect(loaded.game).toEqual(prefix.game);
    expect(loaded.game.dungeon!.warmUpStartingProvisionTorchChoice).toBeUndefined();
  });
});
