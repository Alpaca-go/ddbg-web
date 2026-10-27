import type { DungeonState } from "@ddbg/engine";
import { createDungeonSandbox, createTrinketPool } from "@ddbg/engine";
import { battleData } from "virtual:battle-data";
import distribution from "../../../../packages/data/normalized/corebox/scout_ahead_distribution.json";
import wipeDistribution from "../../../../packages/data/normalized/corebox/wipe_em_out_distribution.json";
import fundraiserDistribution from "../../../../packages/data/normalized/corebox/fundraiser_distribution.json";
import rawRooms from "../../../../packages/data/normalized/corebox/room.json";
import { roomFileSchema } from "../../../../packages/data/src/room";
import rawMonsterPool from "../../../../packages/data/normalized/corebox/monster_pool.json";
import { monsterPoolFileSchema } from "../../../../packages/data/src/monster-pool";
import rawTrinkets from "../../../../packages/data/normalized/corebox/trinket.json";
import { normalizedTrinketFileSchema } from "../../../../packages/data/src/normalize/schema";
import { roomDistributionTokenTotal } from "../../../../packages/data/src/dungeon-layout";
import { curios, layouts } from "./dungeon-data";
import type { Fixture } from "./fixture-types";

export type { Fixture };

export function setup(mode: DungeonState["mode"], page = 1, fixture: Fixture = "neutral") {
  const selected = layouts.find((l) => l.source.page === page)!;
  const scoutTokens = roomDistributionTokenTotal(
    distribution as Parameters<typeof roomDistributionTokenTotal>[0],
  );
  const roomSlots = selected.nodes.filter((n) => n.kind === "room").length;
  const preview =
    selected.unresolvedMarkers?.length ||
    selected.review !== "confirmed" ||
    roomSlots !== scoutTokens
      ? selected
      : null;
  const layout = preview ? layouts[0]! : selected;
  const position =
    layout.nodes.find(
      (n) =>
        n.kind === "room" &&
        layout.edges.some(
          (e) =>
            e.includes(n.id) &&
            e.some((id) => layout.nodes.some((dot) => dot.id === id && dot.kind === "dot")),
        ),
    )?.id ??
    layout.edges
      .flat()
      .find((id) => id !== "S" && layout.edges.some((e) => e.includes("S") && e.includes(id)))!;
  const heroes = Array.from({ length: 4 }, (_, i) => ({
    id: `hero-${i}`,
    stress:
      i === 0
        ? fixture === "trap"
          ? 8
          : fixture === "pressure" || fixture === "heartAttack"
            ? 9
            : 0
        : 0,
    stance: (["aggressive", "defensive", "ranged", "support"] as const)[i]!,
    ...(() => {
      const stat = battleData.heroStats.find(
        (s) => s.level === 1 && s.name === ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"][i],
      )!;
      return {
        level: stat.level,
        life: stat.life,
        attributesVerified: stat.attributesVerified,
        wounds: 0,
        heroStatId: stat.id,
        skillIds: battleData.skills
          .filter((s) => s.hero === stat.name && s.level === 1)
          .slice(0, 3)
          .map((s) => s.id),
      };
    })(),
    ...(fixture === "navigationProvisions" && i === 0
      ? {
          wounds: 3,
          stress: 3,
          statusStacks: [
            { kind: "bleed" as const, remaining: 2, amount: 1 },
            { kind: "blight" as const, remaining: 3, amount: 1 },
          ],
        }
      : {}),
    ...(i === 0 && fixture === "heartAttack"
      ? { resolveTested: true, resolveCardId: battleData.resolveCards[0]!.id }
      : {}),
  }));
  const initial = createDungeonSandbox(
    fixture === "curioRoom"
      ? 80
      : fixture === "startingProvisions"
        ? 75
        : fixture === "wipeBattle" || fixture === "fundraiserBattle"
          ? 1885
          : fixture === "roomBeacon"
            ? 1
            : fixture === "roomInvocation"
              ? 2
              : fixture === "roomSpiked"
                ? 9
                : fixture === "roomAbbey"
                  ? 7
                  : fixture === "roomAncestor"
                    ? 12
                    : fixture === "roomFountain"
                      ? 10
                      : fixture === "roomDisease"
                        ? 4
                        : fixture === "roomBattle"
                          ? 1885
                          : fixture === "roomApproved"
                            ? 11
                            : fixture === "roomBlocked"
                              ? 35
                              : fixture === "curioComposite"
                                ? 230
                                : fixture === "curioTrinket"
                                  ? 921
                                  : fixture === "curioRewards"
                                    ? 317
                                    : fixture === "curioPositive"
                                      ? 85
                                      : fixture === "curioProvision"
                                        ? 370
                                        : fixture === "curioBuff"
                                          ? 343
                                          : fixture === "curio"
                                            ? 1237
                                            : fixture === "curioNegative"
                                              ? 46
                                              : fixture === "corridor"
                                                ? 31
                                                : 1,
    layout,
    fixture.startsWith("fundraiser")
      ? fundraiserDistribution
      : fixture === "wipe" || fixture === "wipeBattle"
        ? wipeDistribution
        : distribution,
    mode,
    fixture === "startingProvisions" ? "S" : position,
    heroes,
    battleData.resolveCards,
    {
      dungeonLevel: fixture === "trap" ? 3 : 1,
      light: 5,
      provisions:
        fixture === "navigationProvisions"
          ? [
              { id: "nav-food", face: "food" },
              { id: "nav-bandage", face: "bandage" },
              { id: "nav-potion", face: "potion" },
            ]
          : fixture === "startingProvisions"
            ? []
            : [
                { id: "tool-1", face: "tool" },
                { id: "tool-2", face: "tool" },
                { id: "tool-3", face: "tool" },
                { id: "tool-4", face: "tool" },
                { id: "torch-1", face: "torch" },
                { id: "food-1", face: "food" },
              ],
    },
    curios,
    roomFileSchema.parse(rawRooms).cards,
    monsterPoolFileSchema.parse(rawMonsterPool).cards,
    {
      ...battleData,
      trinkets: createTrinketPool(
        normalizedTrinketFileSchema.parse(rawTrinkets).cards,
        fixture === "trap" ? 3 : 1,
      ),
    },
    fixture === "startingProvisions",
  );
  if (fixture === "startingProvisions")
    return { game: initial, page, fixture, preview, events: [], commands: [] };
  if (fixture === "curioRoom")
    return {
      game: {
        ...initial,
        dungeon: {
          ...initial.dungeon!,
          position: "D",
          visited: ["D"],
          phase: "awaitingRoom" as const,
          rooms: initial.dungeon!.rooms.map((r) =>
            r.id === "D" ? { ...r, kind: "curio" as const, revealed: true } : r,
          ),
        },
      },
      page,
      fixture,
      preview,
      events: [],
      commands: [],
    };
  // 此布置以已清理的起始房间演示真实走廊往返，不模拟该房间的战斗或奖励。
  const startingKind = initial.dungeon!.rooms.find((r) => r.id === position)!.kind;
  const corridorSwap =
    fixture === "corridor" && startingKind !== "empty"
      ? initial.dungeon!.rooms.find((r) => r.kind === "empty" && r.id !== "D" && r.id !== position)
          ?.id
      : undefined;
  const wipeRoom = initial.dungeon!.rooms.find((r) => r.kind === "lair")!;
  const game =
    fixture === "fundraiserRewards"
      ? {
          ...initial,
          dungeon: {
            ...initial.dungeon!,
            gold: 60,
            position: wipeRoom.id,
            visited: [wipeRoom.id],
            rooms: initial.dungeon!.rooms.map((r) => ({
              ...r,
              revealed: r.id === wipeRoom.id,
              ...(r.id === wipeRoom.id ? { cleared: true } : {}),
            })),
          },
        }
      : fixture === "wipeBattle" || fixture === "fundraiserBattle"
        ? {
            ...initial,
            dungeon: {
              ...initial.dungeon!,
              position: wipeRoom.id,
              visited: [wipeRoom.id],
              phase: "awaitingRoom" as const,
              rooms: initial.dungeon!.rooms.map((r) => ({ ...r, revealed: r.id === wipeRoom.id })),
            },
          }
        : fixture === "corridor" ||
            fixture === "curio" ||
            fixture === "curioBuff" ||
            fixture === "curioNegative" ||
            fixture === "curioProvision" ||
            fixture === "curioPositive" ||
            fixture === "curioRewards" ||
            fixture === "curioTrinket" ||
            fixture === "curioComposite"
          ? {
              ...initial,
              dungeon: {
                ...initial.dungeon!,
                rooms: initial.dungeon!.rooms.map((r) =>
                  r.id === position
                    ? { ...r, ...(corridorSwap ? { kind: "empty" as const } : {}), cleared: true }
                    : r.id === corridorSwap
                      ? { ...r, kind: startingKind }
                      : r,
                ),
              },
            }
          : fixture === "dark"
            ? {
                ...initial,
                dungeon: {
                  ...initial.dungeon!,
                  rooms: initial.dungeon!.rooms.map((r) =>
                    r.id === "D"
                      ? { ...r, kind: "dark" as const }
                      : r.kind === "dark"
                        ? {
                            ...r,
                            kind: initial.dungeon!.rooms.find((room) => room.id === "D")!.kind,
                          }
                        : r.id === position
                          ? { ...r, cleared: true }
                          : r,
                  ),
                },
              }
            : fixture === "roomDisease" ||
                fixture === "roomFountain" ||
                fixture === "roomBeacon" ||
                fixture === "roomAncestor" ||
                fixture === "roomAbbey" ||
                fixture === "roomInvocation" ||
                fixture === "roomSpiked" ||
                fixture === "roomBlocked"
              ? {
                  ...initial,
                  dungeon: {
                    ...initial.dungeon!,
                    rooms: initial.dungeon!.rooms.map((r) =>
                      r.id === "D"
                        ? { ...r, kind: "lair" as const }
                        : r.id === "A"
                          ? { ...r, kind: "curio" as const }
                          : r,
                    ),
                  },
                }
              : initial;
  return {
    game,
    page,
    fixture,
    preview,
    events: [],
    commands: [],
  };
}
