import { expect, it } from "vitest";
import { approvedEldritchVault as tile } from "../../data/src/normalize/eldritch-vault";
import rooms from "../../data/normalized/corebox/room.json";
import catalog from "../../data/normalized/corebox/room_tile_geometry.json";
import { selectRoomTile } from "../../data/src/normalize/room-tile-selection";
import { coreQuestSources, coreParty } from "./test-helpers/core-quest";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { createBattleState } from "./battle";
import type { BattleEntity } from "./battle";
import { applyCommand } from "./command";
import type { GameState } from "./command";
import { roomTileBattleAreas } from "./battle-monster-movement";
import { readRoomTile } from "./room-tile-selection";
import { savedCommandSchema } from "../../data/src/quest-save";

function vaultFixture(seed = 3): GameState {
  const d = createCoreDungeonQuest(
    seed,
    "quest:p001",
    "radiant",
    coreParty,
    coreQuestSources,
  ).dungeon!;
  const card = coreQuestSources.catalog.monsters.find((c) => c.id === "monster_medium:p001")!;
  const heroes = d.heroes.map((hero, index): BattleEntity => {
    const stat = coreQuestSources.catalog.heroStats.find((s) => s.id === hero.heroStatId)!;
    return {
      id: hero.id,
      side: "hero",
      hero: stat.name,
      heroStatId: stat.id,
      heroLevel: stat.level,
      life: stat.life,
      wounds: 0,
      stress: 0,
      dodge: stat.dodge,
      stance: hero.stance!,
      areaId: index === 0 ? "E" : "A",
      skillIds: hero.skillIds!,
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
    };
  });
  const s = createBattleState(seed, {
    ...coreQuestSources.catalog,
    roomName: tile.name,
    trinkets: coreQuestSources.catalog.trinkets!,
    resolveCards: coreQuestSources.resolveCards,
    skills: coreQuestSources.catalog.skills,
    light: 5,
    provisions: [],
    areas: roomTileBattleAreas(tile),
    entities: [
      ...heroes,
      {
        id: "m",
        side: "monster",
        hero: null,
        life: card.life,
        monsterCardId: card.id,
        wounds: 0,
        areaId: "B",
        stance: "aggressive",
        stanceSlots: 1,
        dodge: card.dodge,
        skillIds: [],
        guard: false,
        dead: false,
        bleed: [],
        blight: [],
      },
    ],
  });
  return {
    ...s,
    dungeon: { ...d, phase: "inBattle" },
    battle: {
      ...s.battle!,
      encounter: {
        round: 1,
        deck: ["monster"],
        actedIds: [],
        turn: { type: "hero", actorId: "hero-0", actions: 2, usedSkillIds: [] },
      },
    },
  };
}

it("R-156：Eldritch Vault 参战闸门与 E 区投影", () => {
  expect(tile.usable).toBe(true);
  expect(
    selectRoomTile(
      rooms.cards.find((c) => c.id === "room:p016"),
      catalog,
    ).status,
  ).toBe("matched");
  expect(readRoomTile(rooms.cards.find((c) => c.id === "room:p016")).status).toBe("matched");
  const areas = roomTileBattleAreas(tile);
  expect(areas.filter((a) => a.eldritchVaultTrinkets).map((a) => a.id)).toEqual(["E"]);
});

it("R-156：花 2 行动按在场英雄数抽 III 级饰品；装备压力 +2", () => {
  expect(savedCommandSchema.parse({ type: "eldritchVault", actorId: "hero-0" })).toEqual({
    type: "eldritchVault",
    actorId: "hero-0",
  });
  const opened = applyCommand(vaultFixture(), { type: "eldritchVault", actorId: "hero-0" });
  expect(opened.pendingChoice).toBeDefined();
  expect(opened.state.battle!.encounter!.turn).toMatchObject({ type: "hero", actions: 0 });
  expect(opened.state.battle!.eldritchVaultReward).toBe(true);
  expect(opened.state.battle!.eldritchVaultDrawsRemaining).toBe(3);
  const equip = applyCommand(opened.state, {
    type: "resolveChoice",
    choiceId: opened.pendingChoice!.id,
    optionId: opened.pendingChoice!.options.find((o) => o.id.startsWith("equip:"))!.id,
  });
  const hero = equip.state.battle!.entities.find((e) => e.id === "hero-0")!;
  expect(hero.stress).toBe(2);
  expect(equip.state.battle!.pending?.type).toBe("trinketReward");
});

it("R-156：逐个处置全部饰品后移除Vault临时字段，不能重复处置", () => {
  let result = applyCommand(vaultFixture(), { type: "eldritchVault", actorId: "hero-0" });
  for (let count = 0; count < 4; count++) {
    const choice = result.pendingChoice!;
    expect(choice).toBeDefined();
    result = applyCommand(result.state, {
      type: "resolveChoice",
      choiceId: choice.id,
      optionId: "discard-new",
    });
  }
  expect(result.state.battle).not.toHaveProperty("eldritchVaultDrawsRemaining");
  expect(result.state.battle).not.toHaveProperty("eldritchVaultReward");
  expect(result.state.battle).not.toHaveProperty("eldritchVaultStress");
  expect(result.state.battle!.entities.find((entity) => entity.id === "hero-0")!.stress).toBe(4);
  expect(result.state.battle?.pending).toBeNull();
  expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
});
