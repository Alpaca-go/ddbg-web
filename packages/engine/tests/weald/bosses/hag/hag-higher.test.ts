import { describe, expect, it } from "vitest";
import statData from "../../../../../data/normalized/corebox/hero_stat.json";
import { normalizedHeroStatFileSchema } from "../../../../../data/src/core/heroes/hero-stat";
import { createBattleState, type BattleEntity } from "../../../../src/shared/battle/battle";
import { applyCommand } from "../../../../src/shared/core/command";
import type { GameState } from "../../../../src/shared/core/command";
import { FACE_THE_THREAT_QUEST_ID } from "../../../../src/core/bosses/quest-bridge";
import { getBossScript } from "../../../../src/core/bosses/registry";
import { stressOnHeroProvisionUseFromBossThreat } from "../../../../src/core/bosses/threat-passive";
import {
  applyBossThreatStressOnProvisionUse,
  effectiveHamletSanitariumHealAmount,
} from "../../../../src/core/bosses/threat-passive-runtime";
import { captureHagIHero } from "../../../../src/weald/bosses/hag/hag-i-captive";
import { applyHagIBoil } from "../../../../src/weald/bosses/hag/hag-i-boil";
import {
  clearDeadHagHigherCaptive,
  captureHagHigherHero,
  releaseHagHigherHero,
  hagHigherContext,
} from "../../../../src/weald/bosses/hag/hag-higher";
import { ensureCampaignBossScriptsRegistered } from "../../../../src/shared/core/registry";

function fixture(level: 2 | 3): GameState {
  const stat = normalizedHeroStatFileSchema
    .parse(statData)
    .cards.find((s) => s.name === "CRUSADER" && s.level === level && s.attributesVerified)!;
  const ctx = hagHigherContext(level);
  ensureCampaignBossScriptsRegistered(["core", "weald"]);
  // 受控独立战斗原语；a/b/c 几何和英雄不充当高等级房间／自然养成验收。
  const hero: BattleEntity = {
    id: "h",
    side: "hero",
    hero: "CRUSADER",
    life: stat.life,
    heroStatId: stat.id,
    wounds: 0,
    stress: 1,
    dodge: 0,
    stance: "aggressive",
    areaId: "b",
    skillIds: [],
    dead: false,
    guard: false,
    bleed: [],
    blight: [],
  };
  const monsters = ctx.catalog.slice(0, 2).map((card, i): BattleEntity => ({
    id: i ? "pot" : "hag",
    side: "monster",
    monsterCardId: card.id,
    hero: null,
    life: card.life!,
    wounds: 0,
    dodge: card.dodge!,
    innateProtection: card.innateProtection!,
    protection: card.innateProtection!,
    stance: i ? "ranged" : "aggressive",
    stanceSlots: 2,
    areaId: "a",
    skillIds: [],
    dead: false,
    guard: false,
    bleed: [],
    blight: [],
  }));
  const state = createBattleState(7, {
    heroStats: [
      {
        id: stat.id,
        name: stat.name,
        life: stat.life,
        speed: stat.speed,
        level: stat.level,
        attributesVerified: true,
      },
    ],
    entities: [hero, ...monsters],
    monsters: ctx.catalog,
    skills: [],
    light: 5,
    areas: [
      { id: "a", capacity: 4, elevation: "normal", adjacent: ["b", "c"] },
      { id: "b", capacity: 1, elevation: "normal", adjacent: ["a"] },
      { id: "c", capacity: 1, elevation: "normal", adjacent: ["a"] },
    ],
  });
  return {
    ...state,
    dungeon: {
      phase: "inBattle",
      cursor: 0,
      heroes: [],
      contentPacks: ["core", "weald"],
      questDistribution: { questId: FACE_THE_THREAT_QUEST_ID, campaignLevel: level },
      campaignLevel: level,
      bossExpeditionRegion: "weald",
      locationBossThreats: true,
      bossLocationSources: true,
      activeBossThreatScriptId: ctx.scriptId,
      imminentThreatDescriptionCardId: `boss_ability:weald:p0${12 + level}`,
    } as unknown as NonNullable<GameState["dungeon"]>,
    battle: {
      ...state.battle!,
      encounter: {
        round: 1,
        deck: ["hero", "monster"],
        actedIds: [],
        turn: { type: "monster", actorId: "hag" },
      },
    },
  };
}

describe.each([2, 3] as const)("R-267 Hag %i 级独立运行时", (level) => {
  it("按本等级翻 Full、离板与丢先攻；邻区待选 JSON 恢复后翻 Empty", () => {
    const state = fixture(level);
    const before = structuredClone(state);
    const captured = captureHagHigherHero(state, level, "h");
    expect(captured.events.some((e) => e.type === "commandRefused")).toBe(false);
    expect(captured.state.battle!.entities.some((e) => e.id === "h")).toBe(false);
    expect(captured.state.battle!.entities.find((e) => e.id === "pot")).toMatchObject({
      life: level === 2 ? 14 : 19,
      wounds: 0,
      innateProtection: false,
    });
    expect(captured.state.battle!.encounter!.deck).toEqual(["monster"]);
    const offered = releaseHagHigherHero(captured.state, level);
    expect(offered.pendingChoice?.options.map((o) => o.id)).toEqual(["b", "c"]);
    const restored = JSON.parse(JSON.stringify(offered.state)) as GameState;
    const released = releaseHagHigherHero(restored, level, "c");
    expect(released).toEqual(releaseHagHigherHero(offered.state, level, "c"));
    expect(released.state.battle!.hagCauldron).toBeUndefined();
    expect(released.state.battle!.entities.find((e) => e.id === "pot")).toMatchObject({
      life: level === 2 ? 100 : 136,
      wounds: 0,
      innateProtection: true,
    });
    expect(released.state.battle!.entities.find((e) => e.id === "h")).toMatchObject({
      areaId: "c",
      stance: "aggressive",
    });
    expect(released.state.battle!.rngCursor).toBe(state.battle!.rngCursor);
    expect(state).toEqual(before);
  });

  it("已结算死亡的锅内英雄留作死亡记录，不放回板块；锅恢复本级 Empty", () => {
    const captured = captureHagHigherHero(fixture(level), level, "h").state;
    const dead: GameState = {
      ...captured,
      battle: {
        ...captured.battle!,
        hagCauldron: {
          ...captured.battle!.hagCauldron!,
          hero: { ...captured.battle!.hagCauldron!.hero, dead: true },
        },
      },
    };
    expect(clearDeadHagHigherCaptive(captured, level).state).toBe(captured);
    const cleaned = clearDeadHagHigherCaptive(dead, level);
    expect(cleaned.state.battle!.hagCauldron).toBeUndefined();
    expect(cleaned.state.battle!.entities.find((e) => e.id === "pot")).toMatchObject({
      life: level === 2 ? 100 : 136,
      wounds: 0,
      innateProtection: true,
    });
    const hero = cleaned.state.battle!.entities.find((e) => e.id === "h")!;
    expect(hero.dead).toBe(true);
    expect(hero.stance).toBeUndefined();
    expect(cleaned.state.battle!.entities.filter((e) => e.side === "hero" && !e.dead)).toEqual([]);
    expect(clearDeadHagHigherCaptive(cleaned.state, level).state).toBe(cleaned.state);
  });

  it("公开 useProvision 只消耗一次并传递实际补给种类", () => {
    for (const face of ["food", "bandage"] as const) {
      const initial = fixture(level);
      const state: GameState = {
        ...initial,
        battle: {
          ...initial.battle!,
          provisions: [{ id: "p", face }],
          encounter: {
            ...initial.battle!.encounter!,
            turn: { type: "hero", actorId: "h", actions: 0, usedSkillIds: [] },
          },
        },
      };
      const applied = applyCommand(state, {
        type: "useProvision",
        provisionId: "p",
        targetId: "h",
        effect: "heal",
      });
      expect(
        applied.events.some((e) => e.type === "commandRefused"),
        JSON.stringify(applied.events),
      ).toBe(false);
      expect(applied.state.battle!.provisions).toEqual([]);
      expect(applied.state.battle!.entities.find((e) => e.id === "h")!.stress).toBe(
        face === "food" || level === 3 ? 2 : 1,
      );
    }
  });

  it("拒绝跨等级和 I 级入口；Boil 不可选锅内英雄", () => {
    const state = fixture(level);
    expect(captureHagIHero(state, "h").state).toBe(state);
    expect(captureHagHigherHero(state, level === 2 ? 3 : 2, "h").state).toBe(state);
    const captured = captureHagHigherHero(state, level, "h").state;
    const potTurn: GameState = {
      ...captured,
      battle: {
        ...captured.battle!,
        encounter: { ...captured.battle!.encounter!, turn: { type: "monster", actorId: "pot" } },
      },
    };
    expect(applyHagIBoil(potTurn, "pot").state).toBe(potTurn);
    expect(releaseHagHigherHero(captured, level, "a").state).toBe(captured);
  });

  it("仅指定补给触发压力，村庄按本等级减疗且威胁翻面后失效", () => {
    const state = fixture(level);
    const script = getBossScript(hagHigherContext(level).scriptId)!;
    for (const face of ["potion", "food", "bandage", "torch", "tool", "wild"]) {
      const delta =
        face === "potion" || face === "food" || (level === 3 && face === "bandage") ? 1 : 0;
      expect(stressOnHeroProvisionUseFromBossThreat(script, face)).toBe(delta);
      const applied = applyBossThreatStressOnProvisionUse(state, "h", face);
      expect(applied.events.some((e) => e.type === "commandRefused")).toBe(false);
      expect(applied.state.battle!.entities.find((e) => e.id === "h")!.stress).toBe(1 + delta);
    }
    expect(stressOnHeroProvisionUseFromBossThreat(script)).toBe(0);
    expect(effectiveHamletSanitariumHealAmount(state.dungeon!, 10)).toBe(level === 2 ? 4 : 1);
    expect(effectiveHamletSanitariumHealAmount(state.dungeon!, 2)).toBe(0);
    const ceased: GameState = {
      ...state,
      dungeon: { ...state.dungeon!, bossCombatThreatCeased: script.id },
    };
    expect(applyBossThreatStressOnProvisionUse(ceased, "h", "potion").state).toBe(ceased);
  });
});
