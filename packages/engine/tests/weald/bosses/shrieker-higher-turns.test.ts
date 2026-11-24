import { describe, expect, it } from "vitest";
import { applyCommand, type GameState } from "../../../src/shared/core/command";
import { shriekerMechanismFixture } from "../../helpers/shrieker-i";
import { shriekerContextForLevel } from "../../../src/weald/bosses/shrieker-runtime-context";
import { shriekerINestAllowsEntry } from "../../../src/weald/bosses/shrieker-i-nest";
import { removeCasualties, finishTurn } from "../../../src/shared/dungeon/encounter";
function fixture(level: 2 | 3) {
  const state = shriekerMechanismFixture().started,
    c = shriekerContextForLevel(level);
  return {
    ...state,
    dungeon: {
      ...state.dungeon!,
      campaignLevel: level,
      wealdHigherBosses: true as const,
      activeBossThreatScriptId: c.scriptId,
      imminentThreatDescriptionCardId: c.abilities.descriptionCardId,
    },
    battle: {
      ...state.battle!,
      monsters: c.catalog(true),
      entities: state.battle!.entities.map((e) => {
        const face =
          e.id === "boss:shrieker" ? c.faces[0] : e.id === "boss:shrieker:nest" ? c.faces[1] : null;
        return face ? { ...e, monsterCardId: face.rawId, life: face.life, dodge: face.dodge } : e;
      }),
    },
  } satisfies GameState;
}
describe.each([2, 3] as const)("R-268 Shrieker %i 战斗", (level) => {
  it("Call the Murder实际飞巢治疗，单骰、姿态不变，JSON恢复一致", () => {
    const base = fixture(level);
    const { encounter: _encounter, ...battle } = base.battle;
    void _encounter;
    for (const origin of ["D", "E"]) {
      // 受控技能夹具，不绕过正式回合入口来宣称自然胜利。
      const state: GameState = {
        seed: base.seed,
        notes: [],
        battle: {
          ...battle,
          entities: base.battle.entities.map((e) =>
            e.id === "boss:shrieker"
              ? { ...e, wounds: 7, areaId: origin }
              : e.side === "hero"
                ? { ...e, areaId: origin === "D" ? "A" : "B", dodge: 10 }
                : e,
          ),
        },
      };
      const command = {
        type: "playMonsterSkill",
        actorId: "boss:shrieker",
        targetId: state.battle!.entities[0]!.id,
        skillSlot: 2,
      } as const;
      const result = applyCommand(state, command);
      expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
      expect(result.state.battle!.entities.find((e) => e.id === "boss:shrieker")).toMatchObject({
        areaId: "E",
        wounds: 7 - (level + 1),
        stance: "aggressive",
      });
      expect(result.state.battle!.rngCursor).toBe(state.battle!.rngCursor + 1);
      expect(applyCommand(JSON.parse(JSON.stringify(state)) as GameState, command)).toEqual(result);
    }
  });
  it("巢禁止其他单位进入，巢先死恢复Push2，本体先死清巢", () => {
    const state = fixture(level),
      b = state.battle;
    expect(shriekerINestAllowsEntry(b.entities, b.entities[0]!, "E")).toBe(false);
    expect(shriekerINestAllowsEntry(b.entities, b.entities[4]!, "E")).toBe(true);
    const killed = (id: string) =>
      removeCasualties(
        {
          state: {
            ...state,
            battle: {
              ...b,
              entities: b.entities.map((e) => (e.id === id ? { ...e, dead: true } : e)),
            },
          },
          events: [],
        },
        [id],
      );
    expect(
      killed("boss:shrieker:nest").state.battle!.monsters![0]!.skills[1]!.shriekerFlight,
    ).toBeUndefined();
    expect(
      killed("boss:shrieker").state.battle!.entities.find((e) => e.id === "boss:shrieker:nest")!
        .dead,
    ).toBe(true);
  });
  it("本体三行动后才记已行动，Nest不抢先攻", () => {
    let state: GameState = fixture(level);
    state = {
      ...state,
      battle: {
        ...state.battle!,
        encounter: {
          ...state.battle!.encounter!,
          deck: ["monster", "monster", "monster", "hero"],
          actedIds: [],
        },
      },
    };
    for (let i = 1; i <= 3; i++) {
      const drawn = applyCommand(state, { type: "drawInitiative" });
      expect(drawn.state.battle!.encounter!.turn).toMatchObject({
        type: "monster",
        actorId: "boss:shrieker",
      });
      const ready = {
        ...drawn.state,
        battle: { ...drawn.state.battle!, pending: null, monsterAction: null },
      };
      state = finishTurn(ready, "boss:shrieker", []).state;
      expect(state.battle!.shriekerActionsThisRound).toBe(i);
      expect(state.battle!.encounter!.actedIds.includes("boss:shrieker")).toBe(i === 3);
    }
  });
});
