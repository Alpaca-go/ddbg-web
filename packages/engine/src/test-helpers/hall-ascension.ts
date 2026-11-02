import { coreQuestSources, coreParty } from "./core-quest";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { placeBattleLoot } from "../loot";
import { createBattleState } from "../battle";
import type { BattleEntity } from "../battle";
import type { GameState } from "../command";
import { approvedHallOfAscension as tile } from "../../../data/src/normalize/hall-of-ascension";
import { roomTileBattleAreas } from "../battle-monster-movement";

const basePool = coreQuestSources.catalog.trinkets!;
// 真实获批整面；人工设置当前英雄回合，仅用于交互规则测试。
export function hallAscensionFixture(
  changes: Partial<BattleEntity> = {},
  seed = 1,
  actions = 2,
): GameState {
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
      heroLevel: 1,
      life: stat.life,
      wounds: index ? 0 : 7,
      stress: 0,
      dodge: stat.dodge,
      stance: hero.stance!,
      areaId: ["B", "J", "L", "L"][index]!,
      skillIds: hero.skillIds!,
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
      ...(index ? {} : changes),
    };
  });
  const s = createBattleState(seed, {
    ...coreQuestSources.catalog,
    roomName: tile.name,
    lootAreas: tile.deployment.lootAreas,
    trinkets: basePool,
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
        areaId: "G",
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
  const b = placeBattleLoot(s.battle!, seed)!;
  return {
    ...s,
    dungeon: { ...d, phase: "inBattle", gold: 20, heroes: d.heroes.map((h) => ({ ...h, xp: 20 })) },
    battle: {
      ...b,
      loot: { ...b.loot!, gold: 20 },
      encounter: {
        round: 1,
        deck: ["monster"],
        actedIds: [],
        turn: { type: "hero", actorId: "hero-0", actions, usedSkillIds: [] },
      },
    },
  };
}
