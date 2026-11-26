import { describe, expect, it } from "vitest";
import coreStygian from "../../../../data/normalized/corebox/stygian_rooms.json";
import wealdStygian from "../../../../data/normalized/extension/weald/stygian_rooms.json";
import { createCoreDungeonQuest } from "../../../src/shared/dungeon/dungeon-quest-entry";
import { createBattleState, type BattleEntity } from "../../../src/shared/battle/battle";
import { applyUnprepared } from "../../../src/weald/rooms/battle-unprepared";
import { resolveToxicMushrooms } from "../../../src/weald/rooms/battle-toxic-mushrooms";
import { fixedDamageResolution } from "../../../src/shared/battle/battle-fixed-damage";
import { readActiveStygianRoom } from "../../../src/shared/core/stygian-room-effects";
import { readActiveWealdStygianRoom } from "../../../src/weald/rooms/stygian-room-effects";
import { coreParty, coreQuestSources } from "../../helpers/core-quest";
import { endTurnPoisonousRoots } from "../../../src/weald/rooms/battle-infected-oak";
import { resolveOurs } from "../../../src/weald/rooms/battle-ours";
import { withAbyssalPuff } from "../../../src/weald/rooms/battle-abyssal-puff";
import type { GameState } from "../../../src/shared/core/command";

const monsterCard = coreQuestSources.catalog.monsters.find((c) => c.id === "monster_medium:p001")!;
const stat = coreQuestSources.catalog.heroStats.find(
  (c) => c.name === "CRUSADER" && c.level === 1,
)!;

function stygianWealdDungeon(roomCardId: string) {
  return {
    phase: "inBattle",
    mode: "stygian",
    stygianRoomRules: "full",
    contentPacks: ["core", "weald"],
    heroes: [],
    roomCards: { active: { roomId: "R1", cardId: roomCardId, blockedReason: "" } },
  } as unknown as NonNullable<GameState["dungeon"]>;
}

describe("Weald Stygian 出征替换（包隔离、保留普通卡 id）", () => {
  it("核心 17 张目录不被 Weald 扩展污染", () => {
    const d = stygianWealdDungeon("room:weald:01");
    expect(readActiveWealdStygianRoom(d)?.id).toBe("stygian_room:weald:01");
    expect(readActiveWealdStygianRoom({ ...d, contentPacks: ["core"] })).toBeUndefined();
    const coreDungeon = createCoreDungeonQuest(
      1,
      "quest:p001",
      "stygian",
      coreParty,
      coreQuestSources,
      true,
      "full",
      ["core"],
    ).dungeon!;
    const coreActive = {
      ...coreDungeon,
      roomCards: {
        ...coreDungeon.roomCards!,
        active: { roomId: "R1", cardId: coreStygian.cards[0]!.replacesCardId, blockedReason: "" },
      },
    };
    expect(readActiveStygianRoom(coreActive)?.id).toBe(coreStygian.cards[0]!.id);
    expect(wealdStygian.cards.some((c) => c.id.startsWith("stygian_room:p00"))).toBe(false);
  });

  it("非 full 规则或未开 Weald 包时不启用 Weald Stygian 替换", () => {
    const d = stygianWealdDungeon("room:weald:02");
    expect(readActiveWealdStygianRoom(d)?.name).toBe("Ambush");
    expect(readActiveStygianRoom(d)?.id).toBe("stygian_room:weald:02");
    expect(readActiveWealdStygianRoom({ ...d, stygianRoomRules: "r229" })).toBeUndefined();
    expect(readActiveWealdStygianRoom({ ...d, contentPacks: ["core"] })).toBeUndefined();
    expect(readActiveStygianRoom({ ...d, mode: "radiant" })).toBeUndefined();
  });
});

describe("Weald Stygian 房间效果数值", () => {
  it("Unprepared! Stygian 减益 3t，无规则 Stygian 不触发", () => {
    const heroes: BattleEntity[] = [0, 1].map((i) => ({
      id: `h${i}`,
      side: "hero" as const,
      hero: "CRUSADER",
      heroStatId: stat.id,
      heroLevel: 1,
      areaId: "A",
      stance: "aggressive" as const,
      skillIds: [],
      life: stat.life,
      wounds: 0,
      stress: 0,
      dodge: 0,
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
    }));
    const base = {
      ...createBattleState(7, {
        entities: heroes,
        skills: [],
        heroStats: [stat],
        light: 5,
        areas: [{ id: "A", capacity: 4, elevation: "normal", adjacent: [] }],
        wealdMechanics: true,
      }),
      dungeon: stygianWealdDungeon("room:weald:02"),
    };
    const stygian = applyUnprepared(base);
    expect(stygian.state.battle!.entities[0]!.statusStacks).toEqual([
      { kind: "debuff", remaining: 3 },
    ]);
    const plain = applyUnprepared({
      ...base,
      dungeon: { ...base.dungeon!, mode: "radiant" as const },
    });
    expect(plain.state.battle!.entities[0]!.statusStacks).toEqual([
      { kind: "debuff", remaining: 2 },
    ]);
    const off = applyUnprepared({
      ...base,
      dungeon: { ...base.dungeon!, stygianRoomRules: "r229" as const },
    });
    expect(off.state.battle!.entities[0]!.statusStacks).toBeUndefined();
  });

  it("Toxic Mushrooms Stygian 腐蚀 1·3t", () => {
    const state = {
      ...createBattleState(11, {
        entities: [
          {
            id: "h0",
            side: "hero" as const,
            hero: "CRUSADER",
            heroStatId: stat.id,
            heroLevel: 1,
            areaId: "C",
            stance: "aggressive" as const,
            skillIds: [],
            life: stat.life,
            wounds: 0,
            stress: 0,
            dodge: 0,
            guard: false,
            dead: false,
            bleed: [],
            blight: [],
          },
          {
            id: "m",
            side: "monster" as const,
            hero: null,
            areaId: "C",
            stance: "aggressive" as const,
            skillIds: [],
            life: 4,
            wounds: 0,
            dodge: 0,
            guard: false,
            dead: false,
            bleed: [],
            blight: [],
          },
        ],
        skills: [],
        heroStats: [stat],
        light: 5,
        wealdMechanics: true,
        areas: [{ id: "C", capacity: 4, elevation: "normal" as const, adjacent: [] }],
      }),
      dungeon: stygianWealdDungeon("room:weald:01"),
    };
    const miss = {
      ...fixedDamageResolution(state.battle!.entities[0]!, "area:spikedPit"),
      outcome: "miss" as const,
    };
    const result = resolveToxicMushrooms(state, "m", [miss])!;
    expect(result.state.battle!.entities[0]!.statusStacks).toEqual([
      { kind: "blight", amount: 1, remaining: 3 },
    ]);
  });

  it("Ours! Stygian 仅增益 3t；Abyssal Puff 两项 2t", () => {
    const monsters = ["m0", "m1"].map((id) => ({
      id,
      side: "monster" as const,
      hero: null,
      monsterCardId: monsterCard.id,
      life: monsterCard.life,
      areaId: "A",
      stance: "aggressive" as const,
      skillIds: [],
      wounds: 0,
      dodge: 0,
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
    }));
    const oursState = {
      ...createBattleState(13, {
        entities: monsters,
        skills: [],
        monsters: [monsterCard],
        light: 5,
        areas: [{ id: "A", capacity: 4, elevation: "normal" as const, adjacent: [] }],
        wealdMechanics: true,
      }),
      battle: {
        ...createBattleState(13, {
          entities: monsters,
          skills: [],
          monsters: [monsterCard],
          light: 5,
          areas: [{ id: "A", capacity: 4, elevation: "normal" as const, adjacent: [] }],
          wealdMechanics: true,
        }).battle!,
        wealdOurs: true as const,
      },
      dungeon: stygianWealdDungeon("room:weald:09"),
    };
    const ours = resolveOurs(oursState, "h0", []);
    expect(ours.state.battle!.entities[0]!.statusStacks).toEqual([{ kind: "buff", remaining: 3 }]);

    const puffBase = {
      ...createBattleState(17, {
        entities: [
          ...monsters,
          {
            id: "f1",
            side: "monster" as const,
            hero: null,
            areaId: "B",
            stance: "aggressive" as const,
            skillIds: [],
            life: 1,
            wounds: 0,
            dodge: 0,
            guard: false,
            dead: false,
            bleed: [],
            blight: [],
            necroticFungus: true as const,
          },
        ],
        skills: [],
        monsters: [monsterCard],
        light: 5,
        areas: [
          { id: "A", capacity: 4, elevation: "normal" as const, adjacent: [] },
          { id: "B", capacity: 4, elevation: "normal" as const, adjacent: [] },
        ],
        wealdMechanics: true,
        wealdAbyssalPuff: true,
      }),
      dungeon: stygianWealdDungeon("room:weald:08"),
    };
    const before = puffBase.battle!.entities;
    const after = before.map((e) => (e.id === "f1" ? { ...e, dead: true } : e));
    const puff = withAbyssalPuff(puffBase, {
      state: { ...puffBase, battle: { ...puffBase.battle!, entities: after } },
      events: [],
    });
    expect(puff.state.battle!.entities.find((e) => e.id === "m0")!.statusStacks).toEqual([
      { kind: "buff", remaining: 2 },
      { kind: "buff", remaining: 2 },
    ]);
  });

  it("Poisonous Roots Stygian 2·3t", () => {
    const hero: BattleEntity = {
      id: "h0",
      side: "hero",
      hero: "CRUSADER",
      heroStatId: stat.id,
      areaId: "B",
      stance: "aggressive",
      skillIds: [],
      life: stat.life,
      wounds: 0,
      stress: 0,
      dodge: 0,
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
    };
    const state = {
      ...createBattleState(19, {
        entities: [hero],
        skills: [],
        heroStats: [stat],
        light: 5,
        wealdMechanics: true,
        areas: [{ id: "B", capacity: 4, elevation: "normal", adjacent: [], poisonousRoots: true }],
      }),
      battle: {
        ...createBattleState(19, {
          entities: [hero],
          skills: [],
          heroStats: [stat],
          light: 5,
          wealdMechanics: true,
          areas: [
            { id: "B", capacity: 4, elevation: "normal", adjacent: [], poisonousRoots: true },
          ],
        }).battle!,
        encounter: {
          round: 1,
          deck: [],
          actedIds: [],
          turn: { type: "hero" as const, actorId: "h0", actions: 1, usedSkillIds: [] },
        },
      },
      dungeon: stygianWealdDungeon("room:weald:05"),
    };
    const result = endTurnPoisonousRoots(state, "h0", [])!;
    expect(result.state.battle!.entities[0]!.statusStacks).toEqual([
      { kind: "blight", amount: 2, remaining: 3 },
    ]);
  });
});
