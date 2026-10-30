import { expect, it } from "vitest";
import { coreQuestMapLayouts } from "../../../data/src/quest-map-pairing";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../test-helpers/core-quest";
import { prepareObjectiveRoomBattle } from "../dungeon-objective";
import { createQuestSave, loadQuestSave } from "../quest-save";
import { edgeRoomNodeIds, placeFaceTheThreatRooms } from "./edge-room-placement";
import type { RoomTokenKind } from "../../../data/src/dungeon-layout";

const kinds: RoomTokenKind[] = [
  "objective",
  "dark",
  "dark",
  "curio",
  "lair",
  "trap",
  "treasure",
  "empty",
];
const layouts = coreQuestMapLayouts().filter(
  (l) => l.nodes.filter((n) => n.kind === "room").length === 8,
);

it("R30：所有已确认八槽图，目标只落一条走廊的边缘房；保全多重代币、种子与输入", () => {
  for (const layout of layouts) {
    const snapshot = JSON.stringify({ layout, kinds });
    const objectiveLocations = new Set<string>();
    for (let seed = 0; seed < 64; seed++) {
      const result = placeFaceTheThreatRooms(layout, kinds, seed, 7);
      const slots = layout.nodes.filter((n) => n.kind === "room");
      const objective = slots[result.tokens.indexOf("objective")]!.id;
      expect(edgeRoomNodeIds(layout)).toContain(objective);
      objectiveLocations.add(objective);
      expect([...result.tokens].sort()).toEqual([...kinds].sort());
      expect(result.cursor).toBeGreaterThan(7);
      expect(result).toEqual(placeFaceTheThreatRooms(layout, kinds, seed, 7));
    }
    if (edgeRoomNodeIds(layout).length > 1) expect(objectiveLocations.size).toBeGreaterThan(1);
    expect(JSON.stringify({ layout, kinds })).toBe(snapshot);
  }
});

it("灰点是走廊邻点，坐标靠近画布边界不构成边缘房", () => {
  const layout = layouts[0]!;
  const ids = edgeRoomNodeIds(layout);
  expect(ids.every((id) => layout.edges.filter((e) => e.includes(id)).length === 1)).toBe(true);
  expect(
    edgeRoomNodeIds({ ...layout, nodes: layout.nodes.map((n) => ({ ...n, x: 0, y: 0 })) }),
  ).toEqual(ids);
});

it("拒绝最暗三格、待确认地图、无边缘图或非唯一目标，不猜生产几何", () => {
  const layout = layouts[0]!;
  const darkest = coreQuestMapLayouts().find((l) => l.nodes.some((n) => n.slotKind === "boss"))!;
  expect(() => placeFaceTheThreatRooms(darkest, kinds, 1, 0)).toThrow(/R30/);
  expect(() => placeFaceTheThreatRooms({ ...layout, review: "pending" }, kinds, 1, 0)).toThrow();
  expect(() => placeFaceTheThreatRooms({ ...layout, edges: [] }, kinds, 1, 0)).toThrow();
  expect(() =>
    placeFaceTheThreatRooms(
      layout,
      kinds.map(() => "objective"),
      1,
      0,
    ),
  ).toThrow();
});

it("新 p019 入口 JSON 存档复原；旧无标记入口保持原布局与 RNG，不自动重布", () => {
  for (const bossEdgeRooms of [true, false]) {
    const start = {
      seed: 17,
      questId: "quest:p019" as const,
      mode: "standard" as const,
      party: coreParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
      ...(bossEdgeRooms ? { bossEdgeRooms: true } : {}),
    };
    const game = createCoreDungeonQuest(
      start.seed,
      start.questId,
      start.mode,
      start.party,
      coreQuestSources,
      bossEdgeRooms,
    );
    const save = createQuestSave(start, [], game, coreQuestSources);
    expect(loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game).toEqual(game);
    if (bossEdgeRooms) {
      const d = game.dungeon!;
      expect(edgeRoomNodeIds(d.layout)).toContain(d.rooms.find((r) => r.kind === "objective")!.id);
      expect(d.faceTheThreatEmbarkPlan?.layoutWiringHold).toContain("边缘房代币已布置");
      const entered = {
        ...game,
        dungeon: {
          ...d,
          phase: "awaitingRoom" as const,
          position: d.rooms.find((r) => r.kind === "objective")!.id,
        },
      };
      const result = prepareObjectiveRoomBattle(entered)!;
      expect(result.state.dungeon!.roomCards!.active?.cardId).toBe("room:p010");
      expect(result.events[0]).toMatchObject({ type: "dungeonUpdated" });
    }
    const tampered = {
      ...save,
      snapshot: { ...game, dungeon: { ...game.dungeon!, cursor: game.dungeon!.cursor + 1 } },
    };
    expect(() => loadQuestSave(tampered, coreQuestSources)).toThrow(/快照/);
  }
}, 20000);
