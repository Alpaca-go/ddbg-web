import { naturalQuest } from "../../../test-helpers/natural-quest";
import { expect, it } from "vitest";
import { createCoreDungeonQuest } from "../../../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../../../test-helpers/core-quest";
import { nextExpeditionLocationDecks } from "../../../hamlet-location-embark";
import { readExpeditionRoomRegion } from "../../../expedition-room-catalog";
import {
  dungeonMonsterPoolCatalogValid,
  restingMonsterPoolValid,
} from "../../../monster-pool-validation";
import { dungeonCurioCatalogValid } from "../../../dungeon-curio-catalog";
import { recoverHamletPools } from "../../../hamlet-return-pools";
import { applyCommand } from "../../../command";
import { createQuestSave, loadQuestSave } from "../../../quest-save";
import type { QuestStart } from "../../../../../data/src/quest-save";

const packs = ["core", "weald"] as const;
function initial(seed = 17) {
  return createCoreDungeonQuest(
    seed,
    "quest:p019",
    "standard",
    coreParty,
    coreQuestSources,
    true,
    null,
    packs,
  );
}

it("W3：受控 Hag 实际威胁重建当地普通来源，清除威胁后仍可回收", () => {
  const source = initial();
  const d = {
    ...source.dungeon!,
    locationBossThreats: true as const,
    bossLocationSources: true as const,
    activeBossThreatScriptId: "boss:weald:hag:1" as const,
  };
  const decks = nextExpeditionLocationDecks(d, "quest:p019")!;
  const current = { ...d, ...decks, bossExpeditionRegion: "weald" as const };
  expect(readExpeditionRoomRegion(current)).toBe("weald");
  expect(current.roomCards!.cards).toHaveLength(9);
  expect(current.curio!.cards).toHaveLength(24);
  expect(current.monsterPool).toHaveProperty("location", "weald");
  expect(dungeonMonsterPoolCatalogValid(current)).toBe(true);
  expect(restingMonsterPoolValid(current)).toBe(true);
  expect(dungeonCurioCatalogValid(current)).toBe(true);
  expect(current.cursor).toBe(d.cursor);
  const { activeBossThreatScriptId: _active, ...cleared } = current;
  void _active;
  expect(recoverHamletPools(cleared, source.seed).status).toBe("resolved");
  const wrong = { ...current, monsterPool: source.dungeon!.monsterPool! };
  expect(dungeonMonsterPoolCatalogValid(wrong)).toBe(false);
  expect(dungeonCurioCatalogValid({ ...current, curio: source.dungeon!.curio! })).toBe(false);
  const next = nextExpeditionLocationDecks(cleared, "quest:p001")!;
  expect(next.roomCards.cards.every((c) => c.location !== "weald")).toBe(true);
  expect(next.monsterPool).not.toHaveProperty("location", "weald");
  const { bossLocationSources: _version, ...legacy } = d;
  void _version;
  expect(nextExpeditionLocationDecks(legacy, "quest:p019")).toBeNull();
});

it.each([17, 23, 7])("固定 seed %s：显式新来源版本的定威胁日志可严格恢复", (seed) => {
  const state = initial(seed);
  const command = {
    type: "establishImminentThreat",
    locationBosses: true,
    locationSources: true,
  } as const;
  const result = applyCommand(state, command);
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  const d = result.state.dungeon!;
  expect(d.bossLocationSources).toBe(true);
  expect(readExpeditionRoomRegion(d)).toBe(
    d.activeBossThreatScriptId === "boss:weald:hag:1" ? "weald" : "ruins",
  );
  expect(dungeonMonsterPoolCatalogValid(d)).toBe(true);
  expect(dungeonCurioCatalogValid(d)).toBe(true);
  const start: QuestStart = {
    seed,
    questId: "quest:p019",
    mode: "standard",
    party: coreParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
    contentPacks: [...packs],
    bossEdgeRooms: true,
  };
  const save = createQuestSave(start, [command], result.state, coreQuestSources);
  expect(loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game).toEqual(
    result.state,
  );
  const forged = JSON.parse(JSON.stringify(save));
  delete forged.commands[0].locationSources;
  expect(() => loadQuestSave(forged, coreQuestSources)).toThrow();
  const legacy = applyCommand(state, { type: "establishImminentThreat", locationBosses: true });
  expect(legacy.state.dungeon!.bossExpeditionRegion).toBeUndefined();
  expect(legacy.state.dungeon!.bossLocationSources).toBeUndefined();
});

it("未开启完整地点池时不能独立启用地点来源", () => {
  const state = initial();
  const result = applyCommand(state, { type: "establishImminentThreat", locationSources: true });
  expect(result.events.some((e) => e.type === "commandRefused")).toBe(true);
  expect(result.state).toBe(state);
});

it.each([23, 7])(
  "固定 seed %s 的地点来源版自然流程与真实停止状态可严格回放",
  (seed) => {
    const run = naturalQuest(seed, "quest:p019", true, coreQuestSources, 2, {
      continueFrom: initial(seed),
      locationBosses: true,
      locationSources: true,
    });
    if (run.state.dungeon!.unregisteredImminentThreatHold)
      expect(run.stopReason).toBe(run.state.dungeon!.unregisteredImminentThreatHold);
    else if (seed === 23) {
      expect(run.stopReason).toBe("resolveChoice: 意志姿态轨有空隙，不能猜交换对象");
      expect(
        run.state.battle!.entities.filter((e) => e.side === "hero" && !e.dead).map((e) => e.stance),
      ).toEqual(["aggressive", "ranged"]);
    } else {
      expect(run.stopReason).toBe("dungeon halted awaitingReplacement");
      expect(run.state.dungeon!.phase).toBe("awaitingReplacement");
      expect(run.state.dungeon!.heroes.some((h) => h.dead)).toBe(true);
    }
    const start: QuestStart = {
      seed,
      questId: "quest:p019",
      mode: "standard",
      party: coreParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
      contentPacks: [...packs],
      bossEdgeRooms: true,
    };
    const save = createQuestSave(start, run.commands, run.state, coreQuestSources);
    expect(loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game).toEqual(
      run.state,
    );
  },
  120000,
);
