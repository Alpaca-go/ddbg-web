import { expect, it } from "vitest";
import rooms from "../../normalized/corebox/room.json";
import tiles from "../../normalized/corebox/room_tile_geometry.json";
import stygian from "../../normalized/corebox/stygian_rooms.json";
import coveCurios from "../../normalized/extension/cove/curio.json";
import coveQuests from "../../normalized/extension/cove/quest_cards.json";
import coveRooms from "../../normalized/extension/cove/room.json";
import wealdMedium from "../../normalized/extension/weald/monster_medium.json";
import wealdLarge from "../../normalized/extension/weald/monster_large.json";
import wealdHigherMonsters from "../../normalized/extension/weald/higher_monsters.json";
import wealdQuestExceptionMonsters from "../../normalized/extension/weald/quest_exception_monsters.json";
import wealdCurios from "../../normalized/extension/weald/curio.json";
import wealdRooms from "../../normalized/extension/weald/room.json";
import wealdTiles from "../../normalized/extension/weald/room_tile_geometry.json";
import wealdStygian from "../../normalized/extension/weald/stygian_rooms.json";
import wealdQuests from "../../normalized/extension/weald/quest_cards.json";
import wealdHigherQuests from "../../normalized/extension/weald/higher_quests.json";
import heroStats from "../../normalized/corebox/hero_stat.json";
import heroSkills from "../../normalized/corebox/hero_skill.json";
import hamlet from "../../normalized/corebox/hamlet_event.json";
import curios from "../../normalized/corebox/curio.json";
import diseases from "../../normalized/corebox/disease.json";
import quests from "../../normalized/corebox/quest_cards.json";
import questMaps from "../../normalized/corebox/dungeon_layouts.json";
import quirk from "../../normalized/corebox/quirk.json";
import virtue from "../../normalized/corebox/virtue_affliction.json";
import medium from "../../normalized/corebox/monster_medium.json";
import large from "../../normalized/corebox/monster_large.json";
import trinkets from "../../normalized/corebox/trinket.json";
import ruinsAbilities from "../../normalized/corebox/ruins_boss_abilities.json";
import darkestAbilities from "../../normalized/corebox/darkest_boss_abilities.json";
import darkestBosses from "../../normalized/corebox/darkest_boss_content.json";
import {
  canonicalHeroStatCardSchema,
  normalizedHeroStatFileSchema,
} from "../../src/core/heroes/hero-stat";
import { HERO_ORDER } from "../../src/core/heroes/hero-registry";
import { basicQuests } from "../../src/core/quests/basic-quests";
import { hamletEventCardSchema } from "../../src/core/hamlet/hamlet-event";
import { canonicalHeroSkillFileSchema } from "../../src/shared/schema";

it("核心和扩展正式目录的实体 ID 唯一，核心 Boss 引用解析到对应目录", () => {
  const cards = [
    ...rooms.cards,
    ...tiles.tiles,
    ...stygian.cards,
    ...heroStats.cards,
    ...heroSkills.cards,
    ...hamlet.cards,
    ...curios.cards,
    ...diseases.cards,
    ...quests.cards,
    ...questMaps.layouts,
    ...quirk.cards,
    ...virtue.cards,
    ...medium.cards,
    ...large.cards,
    ...trinkets.cards,
    ...ruinsAbilities.cards,
    ...darkestAbilities.cards,
    ...coveCurios.cards,
    ...coveQuests.cards,
    ...coveRooms.cards,
    ...wealdCurios.cards,
    ...wealdRooms.cards,
    ...wealdTiles.tiles,
    ...wealdStygian.cards,
    ...wealdQuests.cards,
    ...wealdHigherQuests.cards,
    ...wealdMedium.cards,
    ...wealdLarge.cards,
    ...wealdHigherMonsters.cards,
    ...wealdQuestExceptionMonsters.cards,
  ];
  expect(new Set(cards.map((card) => card.id)).size).toBe(cards.length);

  const monsterIds = new Set([...medium.cards, ...large.cards].map((card) => card.id));
  const abilityIds = new Set(darkestAbilities.cards.map((card) => card.id));
  for (const encounter of darkestBosses.encounters) {
    expect(rooms.cards.find((card) => card.id === encounter.roomCardId)?.boss).toBe(true);
    expect(quests.cards.some((card) => card.id === encounter.questId)).toBe(true);
    for (const actor of encounter.actors) {
      expect(monsterIds.has(actor.cardId), actor.cardId).toBe(true);
      expect(abilityIds.has(actor.abilityCardId), actor.abilityCardId).toBe(true);
    }
    for (const id of encounter.supportCardIds) expect(monsterIds.has(id), id).toBe(true);
    for (const id of encounter.supportAbilityCardIds) expect(abilityIds.has(id), id).toBe(true);
  }
});

it("房间、板块、替换牌和任务预留引用闭合", () => {
  const standard = new Map([...rooms.cards, ...wealdRooms.cards].map((room) => [room.id, room]));
  expect(new Set(tiles.tiles.map((tile) => tile.roomId))).toEqual(
    new Set(rooms.cards.map((room) => room.id)),
  );
  expect(new Set(wealdTiles.tiles.map((tile) => tile.roomId))).toEqual(
    new Set(wealdRooms.cards.filter((room) => !room.boss).map((room) => room.id)),
  );
  for (const tile of [...tiles.tiles, ...wealdTiles.tiles]) {
    expect(standard.get(tile.roomId)?.number).toBe(tile.number);
    expect(tile.id.replace("room_tile:", "room:")).toBe(tile.roomId);
  }
  for (const replacement of [...stygian.cards, ...wealdStygian.cards]) {
    expect(standard.get(replacement.replacesCardId)?.number).toBe(replacement.number);
    expect(replacement.id.replace("stygian_room:", "room:")).toBe(replacement.replacesCardId);
  }

  const locations = new Map([
    ...rooms.cards.map((room) => [room.id, room.location] as const),
    ...wealdRooms.cards.map((room) => [room.id, room.location] as const),
  ]);
  for (const quest of basicQuests) {
    const reserved =
      "setAsideRoomCardIds" in quest
        ? quest.setAsideRoomCardIds
        : "setAsideRoomCardId" in quest
          ? [quest.setAsideRoomCardId]
          : [];
    for (const id of reserved) expect(locations.get(id), quest.id).toBe(quest.expeditionRegion);
  }
});

it("正式英雄目录逐英雄覆盖 STAT 和 SKILL，拒绝错误归属与缺来源", () => {
  const stats = normalizedHeroStatFileSchema
    .parse(heroStats)
    .cards.map((card) => canonicalHeroStatCardSchema.parse(card));
  const skills = canonicalHeroSkillFileSchema.parse(heroSkills);
  const [first, second, ...remaining] = stats;
  expect(
    normalizedHeroStatFileSchema.safeParse({
      ...heroStats,
      cards: [{ ...first, id: `${first!.rawId}:${first!.face}` }, second, ...remaining],
    }).success,
  ).toBe(false);
  const sameFace = remaining.findIndex((card) => card.face === first!.face);
  expect(
    normalizedHeroStatFileSchema.safeParse({
      ...heroStats,
      cards: [
        first,
        second,
        ...remaining.map((card, i) => (i === sameFace ? { ...card, rawId: first!.rawId } : card)),
      ],
    }).success,
  ).toBe(false);
  expect(new Set(stats.map((card) => card.name))).toEqual(new Set(HERO_ORDER));
  expect(new Set(stats.map((card) => `${card.rawId}:${card.face}`)).size).toBe(stats.length);
  for (const hero of HERO_ORDER) {
    expect(stats.filter((card) => card.name === hero)).toHaveLength(3);
    expect(skills.cards.filter((card) => (card.hero ?? "ABOMINATION") === hero)).toHaveLength(21);
  }

  const stat = stats.find((card) => card.id === "hero_stat:core:h01:p001:front")!;
  expect(
    canonicalHeroStatCardSchema.safeParse({
      ...stat,
      face: "back",
      id: "hero_stat:core:h01:p001:back",
    }).success,
  ).toBe(false);
  const musketeer = skills.cards.findIndex((card) => card.id === "hero_skill:musketeer:h18:p358");
  for (const update of [
    { id: "hero_skill:weald:h18:p358" },
    { source: undefined },
    { source: { ...skills.cards[musketeer]!.source, page: 358 } },
  ]) {
    const bad = structuredClone(skills);
    Object.assign(bad.cards[musketeer]!, update);
    expect(canonicalHeroSkillFileSchema.safeParse(bad).success).toBe(false);
  }
});

it("村庄事件 ID 与印刷页独立核对", () => {
  const card = hamlet.cards[0]!;
  expect(hamletEventCardSchema.safeParse(card).success).toBe(true);
  expect(
    hamletEventCardSchema.safeParse({ ...card, source: { ...card.source, page: 2 } }).success,
  ).toBe(false);
});
