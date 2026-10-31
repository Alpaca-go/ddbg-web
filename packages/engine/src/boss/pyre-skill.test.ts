import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createBattleState, type BattleEntity } from "../battle";
import { applyCommand, type ApplyResult, type Command, type GameState } from "../command";
import type { MonsterCardView } from "../monster-skill";
import type { SkillStance } from "../hero-skill";
import { createLootState } from "../loot";
import {
  FANATIC_I_COMBAT_MONSTER_CARD_ID,
  FANATIC_I_PYRE_MONSTER_CARD_ID,
  FANATIC_I_SCRIPT_ID,
  ensureFanaticIBossScriptRegistered,
} from "./fanatic-i";

const monsters = JSON.parse(
  readFileSync(
    new URL("../../../data/normalized/corebox/monster_large.json", import.meta.url),
    "utf8",
  ),
).cards as MonsterCardView[];
const profiles = JSON.parse(
  readFileSync(new URL("../../../data/normalized/corebox/hero_stat.json", import.meta.url), "utf8"),
).cards;
const fanaticCard = monsters.find((c) => c.id === FANATIC_I_COMBAT_MONSTER_CARD_ID)!;
const pyreCard = monsters.find((c) => c.id === FANATIC_I_PYRE_MONSTER_CARD_ID)!;
const stances: readonly SkillStance[] = ["aggressive", "defensive", "ranged", "support"];

function ok(state: GameState, command: Command): ApplyResult {
  const result = applyCommand(state, command);
  expect(
    result.events.filter((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toEqual([]);
  return result;
}

function fanaticBattleWithPyre(opts?: { heroesInPyreArea?: readonly string[] }): GameState {
  ensureFanaticIBossScriptRegistered();
  const inPyre = new Set(opts?.heroesInPyreArea ?? ["h2"]);
  const names = ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"] as const;
  const heroes: BattleEntity[] = stances.map((stance, index) => {
    const stat = profiles.find(
      (s: { name: string; level: number; attributesVerified?: boolean }) =>
        s.name === names[index] && s.level === 1 && s.attributesVerified,
    )!;
    const id = `h${index}`;
    return {
      id,
      side: "hero",
      hero: stat.name,
      heroStatId: stat.id,
      life: stat.life,
      areaId: inPyre.has(id) ? "b" : "a",
      stance,
      skillIds: [],
      wounds: 0,
      stress: 0,
      dodge: 0,
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
    };
  });
  const fanatic: BattleEntity = {
    id: "fanatic",
    side: "monster",
    hero: null,
    monsterCardId: fanaticCard.id,
    life: fanaticCard.life,
    dodge: 0,
    areaId: "a",
    stance: "aggressive",
    stanceSlots: 2,
    shuffleResist: false,
    wounds: 0,
    skillIds: [],
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  };
  return {
    ...createBattleState(7, {
      entities: [...heroes, fanatic],
      monsters: [fanaticCard, pyreCard],
      areas: [
        { id: "a", elevation: "normal", adjacent: ["b"], capacity: 10 },
        { id: "b", elevation: "normal", adjacent: ["a"], capacity: 8 },
      ],
      light: 5,
      skills: [],
      heroStats: profiles,
      lootPool: createLootState(),
    }),
    dungeon: {
      phase: "inBattle",
      cursor: 0,
      heroes: [],
      activeBossThreatScriptId: FANATIC_I_SCRIPT_ID,
      questDistribution: { questId: "quest:p019", campaignLevel: 1 },
    } as unknown as GameState["dungeon"],
  } as GameState;
}

function pyreTurn(state: GameState): { state: GameState; pyreId: string } {
  const started = ok(state, { type: "startBattle" });
  const pyre = started.state.battle!.entities.find((e) => e.monsterCardId === pyreCard.id)!;
  return {
    pyreId: pyre.id,
    state: {
      ...started.state,
      battle: {
        ...started.state.battle!,
        monsterAction: null,
        encounter: {
          ...started.state.battle!.encounter!,
          turn: { type: "monster", actorId: pyre.id },
        },
      },
    },
  };
}

describe("Fanatic · Pyre Burn the Heretic（R-136、R-048）", () => {
  it("先攻轮到 Pyre：Closest 同区目标经 prepareMonsterAction → playMonsterSkill，自动命中 99、不耗攻击 RNG", () => {
    const { state, pyreId } = pyreTurn(fanaticBattleWithPyre({ heroesInPyreArea: ["h0", "h2"] }));
    const rngBefore = state.battle!.rngCursor;
    const prepared = ok(state, { type: "prepareMonsterAction", actorId: pyreId });
    expect(prepared.state.battle!.monsterAction).toMatchObject({
      skillSlot: 1,
      targetId: "h0",
    });
    const played = ok(prepared.state, {
      type: "playMonsterSkill",
      actorId: pyreId,
      targetId: prepared.state.battle!.monsterAction!.targetId,
      skillSlot: 1,
    });
    expect(played.state.battle!.rngCursor).toBe(rngBefore);
    const damage = played.events.find(
      (e) => e.type === "heroHealthResolved" && e.entityId === "h0",
    );
    expect(damage).toMatchObject({ effect: { type: "wounds", amounts: [99] } });
    expect(
      played.events.some((e) => e.type === "dungeonUpdated" && e.message.includes("无攻击骰")),
    ).toBe(true);
  });

  it("Protection 仍减半；死门沿普通生命路径另耗 RNG", () => {
    const { state, pyreId } = pyreTurn(fanaticBattleWithPyre({ heroesInPyreArea: ["h0", "h2"] }));
    const protectedHero = {
      ...state,
      battle: {
        ...state.battle!,
        entities: state.battle!.entities.map((e) =>
          e.id === "h0" ? { ...e, protection: true, dodge: 99 } : e,
        ),
      },
    };
    const rngBefore = protectedHero.battle!.rngCursor;
    const prepared = ok(protectedHero, { type: "prepareMonsterAction", actorId: pyreId });
    const played = ok(prepared.state, {
      type: "playMonsterSkill",
      actorId: pyreId,
      targetId: "h0",
      skillSlot: 1,
    });
    expect(played.state.battle!.rngCursor).toBe(rngBefore);
    expect(
      played.events.find((e) => e.type === "heroHealthResolved" && e.entityId === "h0"),
    ).toMatchObject({ effect: { type: "wounds", amounts: [50] } });
    const atDoor = {
      ...prepared.state,
      battle: {
        ...prepared.state.battle!,
        entities: prepared.state.battle!.entities.map((e) =>
          e.id === "h0" ? { ...e, wounds: e.life!, protection: true } : e,
        ),
      },
    };
    const again = ok(atDoor, {
      type: "playMonsterSkill",
      actorId: pyreId,
      targetId: "h0",
      skillSlot: 1,
    });
    expect(again.state.battle!.rngCursor).toBe(atDoor.battle!.rngCursor + 1);
  });

  it("prepare 保存目标后 Pyre 离区则 playMonsterSkill 拒绝", () => {
    const { state, pyreId } = pyreTurn(fanaticBattleWithPyre({ heroesInPyreArea: ["h0", "h2"] }));
    const prepared = ok(state, { type: "prepareMonsterAction", actorId: pyreId });
    expect(prepared.state.battle!.monsterAction!.targetId).toBe("h0");
    const mismatched = {
      ...prepared.state,
      battle: {
        ...prepared.state.battle!,
        entities: prepared.state.battle!.entities.map((e) =>
          e.id === pyreId ? { ...e, areaId: "a" } : e,
        ),
      },
    };
    const wrongTarget = applyCommand(mismatched, {
      type: "playMonsterSkill",
      actorId: pyreId,
      targetId: "h0",
      skillSlot: 1,
    });
    expect(wrongTarget.events[0]).toMatchObject({
      type: "commandRefused",
      message: expect.stringContaining("同区"),
    });
  });

  it.each(["monster_large:p011", "monster_large:p012", "monster_large:p013"])(
    "卡面 %s 仅 slot 1 · Closest · {damage}99",
    (id) => {
      const card = monsters.find((c) => c.id === id)!;
      expect(card.verification.unverified).toBe(false);
      const skill = card.skills[0]!;
      expect(skill).toMatchObject({ slot: 1, target: "Closest", name: "Burn the Heretic" });
      expect(skill.printed_labels).toEqual([]);
      const signature = skill.effect_lines.map((line) =>
        line
          .map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`))
          .join("")
          .replace(/\s/g, ""),
      );
      expect(signature).toEqual(["{damage}99"]);
    },
  );
});
