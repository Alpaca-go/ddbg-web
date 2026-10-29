import { readFileSync } from "node:fs";
import { describe, expect, it, beforeEach } from "vitest";
import { createBattleState, type BattleEntity } from "../battle";
import { applyCommand, type GameState } from "../command";
import { applyEncounterCommand } from "../encounter";
import { normalizedMonsterLargeFileSchema } from "../../../data/src/normalize/schema";
import type { MonsterCardView } from "../monster-skill";
import type { HeroSkillCardView, SkillStance } from "../hero-skill";
import { createLootState } from "../loot";
import { nextBattleRoll } from "../battle-roll";
import { clearFanaticIPyre } from "./fanatic-i-combat-runtime";
import {
  FANATIC_I_COMBAT_MONSTER_CARD_ID,
  FANATIC_I_PYRE_MONSTER_CARD_ID,
  FANATIC_I_SCRIPT_ID,
  applyFanaticIPyreBattleStart,
  applyFanaticPitTossHeroIntoPyreArea,
  applyFanaticSentenceRendered,
  bossQuestScriptId,
  expandFanaticIInitiativeDeckSides,
  fanaticSentenceRenderedShouldReplaceSkill,
  fanaticShouldEnterActedIdsAfterTurn,
  clearBossScriptsForTest,
  ensureFanaticIBossScriptRegistered,
  getBossScript,
  readFanaticIPitTossEnabled,
  readFanaticIPyreBattleStartPlan,
  readFanaticISentenceRenderedEnabled,
  runBossHook,
  FACE_THE_THREAT_QUEST_ID,
} from "./index";

const largeCards = normalizedMonsterLargeFileSchema.parse(
  JSON.parse(
    readFileSync(new URL("../../../data/normalized/corebox/monster_large.json", import.meta.url), {
      encoding: "utf8",
    }),
  ),
).cards;

const fanaticCard = largeCards.find((card) => card.id === FANATIC_I_COMBAT_MONSTER_CARD_ID)!;
const pyreCard = largeCards.find((card) => card.id === FANATIC_I_PYRE_MONSTER_CARD_ID)!;
const smite: HeroSkillCardView = JSON.parse(
  readFileSync(
    new URL("../../../data/normalized/corebox/hero_skill.json", import.meta.url),
    "utf8",
  ),
).cards.find((card: HeroSkillCardView) => card.id === "hero_skill:p001");

const stances: readonly SkillStance[] = ["aggressive", "defensive", "ranged", "support"];

function fanaticBossDungeon(): GameState["dungeon"] {
  return {
    phase: "inBattle",
    cursor: 0,
    heroes: [],
    questDistribution: { questId: FACE_THE_THREAT_QUEST_ID, campaignLevel: 1 },
  } as unknown as GameState["dungeon"];
}

function fanaticBattle(extra?: Partial<GameState["battle"]>): GameState {
  const heroes: BattleEntity[] = stances.map((stance, index) => ({
    id: `h${index}`,
    side: "hero",
    areaId: stance === "ranged" ? "b" : "a",
    stance,
    hero: "CRUSADER",
    skillIds: [],
    wounds: 0,
    stress: 0,
    dodge: 0,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  }));
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
      monsters: [fanaticCard, pyreCard] as MonsterCardView[],
      areas: [
        { id: "a", elevation: "normal", adjacent: ["b"], capacity: 10 },
        { id: "b", elevation: "normal", adjacent: ["a"], capacity: 8 },
      ],
      light: 5,
      skills: [],
      heroStats: [],
      lootPool: createLootState(),
      ...extra,
    }),
    dungeon: fanaticBossDungeon(),
  } as GameState;
}

function defeatSetup(cause = "attack"): GameState {
  const started = applyCommand(fanaticBattle({ skills: [smite] }), { type: "startBattle" });
  expect(started.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  const battle = started.state.battle!;
  let cursor = battle.rngCursor;
  while (nextBattleRoll(started.state.seed, cursor) > 5) cursor++;
  return {
    ...started.state,
    battle: {
      ...battle,
      rngCursor: cursor,
      entities: battle.entities.map((e) => {
        if (e.id === "h0") return { ...e, skillIds: [smite.id] };
        if (e.monsterCardId === pyreCard.id) return { ...e, wounds: 1 };
        if (e.id !== "fanatic") return e;
        return {
          ...e,
          wounds: e.life! - 1,
          ...(cause === "attack"
            ? {}
            : { statusStacks: [{ kind: cause as "bleed" | "blight", remaining: 1, amount: 1 }] }),
        };
      }),
      encounter: {
        round: 1,
        deck: ["monster", "hero", "monster"],
        actedIds: [],
        turn:
          cause === "attack"
            ? { type: "hero", actorId: "h0", actions: 2, usedSkillIds: [] }
            : { type: "awaitingInitiative" },
      },
    },
  };
}

describe("Fanatic I 战斗运行时", () => {
  beforeEach(() => {
    clearBossScriptsForTest();
    ensureFanaticIBossScriptRegistered();
    bossQuestScriptId[FACE_THE_THREAT_QUEST_ID] = FANATIC_I_SCRIPT_ID;
  });

  it.each(["attack", "bleed", "blight"])(
    "%s 击败 Fanatic：移出存活 Pyre 后胜利，无额外伤害 / 骰子，重放一致",
    (cause) => {
      const initial = defeatSetup(cause);
      const before = structuredClone(initial);
      const command =
        cause === "attack"
          ? ({
              type: "playHeroSkill",
              actorId: "h0",
              targetId: "fanatic",
              skillId: smite.id,
            } as const)
          : ({ type: "drawInitiative" } as const);
      const result = applyCommand(initial, command);
      expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
      expect(applyCommand(initial, command)).toEqual(result);
      expect(initial).toEqual(before);
      expect(result.state.battle!.entities.find((e) => e.monsterCardId === pyreCard.id)).toEqual({
        ...initial.battle!.entities.find((e) => e.monsterCardId === pyreCard.id),
        dead: true,
      });
      expect(result.state.battle!.encounter!.turn).toEqual({
        type: "finished",
        outcome: "victory",
      });
      expect(result.state.battle!.encounter!.deck).toEqual([]);
      expect(result.state.battle!.monsterAction).toBeNull();
      expect(result.state.battle!.rngCursor).toBe(
        initial.battle!.rngCursor + (cause === "attack" ? 1 : 0),
      );
      expect(
        result.events.flatMap((e) => (e.type === "casualtyRemoved" ? [e.actorId] : [])),
      ).toEqual(["fanatic", "boss:fanatic:pyre"]);
      expect(result.events.filter((e) => e.type === "battleFinished")).toHaveLength(1);
      const repeated = applyCommand(result.state, command);
      expect(repeated.state).toBe(result.state);
      expect(repeated.events.some((e) => e.type === "casualtyRemoved")).toBe(false);
    },
  );

  it.each(["dead", "absent"])("Pyre 已%s 时击败 Fanatic，不重复移除或重建火刑架", (pyre) => {
    const base = defeatSetup();
    const initial: GameState = {
      ...base,
      battle: {
        ...base.battle!,
        entities: base.battle!.entities.flatMap((e) =>
          e.monsterCardId !== pyreCard.id ? [e] : pyre === "dead" ? [{ ...e, dead: true }] : [],
        ),
      },
    };
    const result = applyCommand(initial, {
      type: "playHeroSkill",
      actorId: "h0",
      targetId: "fanatic",
      skillId: smite.id,
    });
    expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
    expect(result.state.battle!.encounter!.turn).toEqual({ type: "finished", outcome: "victory" });
    expect(result.events.flatMap((e) => (e.type === "casualtyRemoved" ? [e.actorId] : []))).toEqual(
      ["fanatic"],
    );
    expect(
      result.events.some((e) => e.type === "dungeonUpdated" && e.message.includes("移出火刑架")),
    ).toBe(false);
  });

  it.each(["ordinary", "sandbox"])("%s 战斗不凭卡名清除 Pyre", (context) => {
    const base = defeatSetup();
    const { dungeon, ...sandbox } = base;
    const initial: GameState =
      context === "sandbox"
        ? sandbox
        : {
            ...base,
            dungeon: {
              ...dungeon!,
              questDistribution: { ...dungeon!.questDistribution!, questId: "quest:p001" },
            },
          };
    const result = applyCommand(initial, {
      type: "playHeroSkill",
      actorId: "h0",
      targetId: "fanatic",
      skillId: smite.id,
    });
    expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
    expect(result.state.battle!.entities.find((e) => e.monsterCardId === pyreCard.id)?.dead).toBe(
      false,
    );
    expect(result.events.some((e) => e.type === "battleFinished")).toBe(false);
  });

  it("英雄反击击败 Fanatic：怪物技能收尾移出 Pyre 并停止剩余先攻", () => {
    const base = defeatSetup();
    const initial: GameState = {
      ...base,
      battle: {
        ...base.battle!,
        entities: base.battle!.entities.map((e) =>
          e.id === "h0"
            ? { ...e, riposte: true, statusStacks: [{ kind: "riposte", remaining: 1 }] }
            : e.id === "fanatic"
              ? { ...e, areaId: "b" }
              : e,
        ),
        encounter: {
          ...base.battle!.encounter!,
          turn: { type: "monster", actorId: "fanatic" },
        },
      },
    };
    const result = applyCommand(initial, {
      type: "playMonsterSkill",
      actorId: "fanatic",
      targetId: "h0",
      skillSlot: 3,
    });
    expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
    expect(result.state.battle!.entities.find((e) => e.id === "fanatic")?.dead).toBe(true);
    expect(
      result.state.battle!.entities.find((e) => e.monsterCardId === pyreCard.id),
    ).toMatchObject({ dead: true, wounds: 1 });
    expect(result.state.battle!.encounter!.turn).toEqual({ type: "finished", outcome: "victory" });
    expect(result.state.battle!.encounter!.deck).toEqual([]);
    expect(result.events.filter((e) => e.type === "casualtyRemoved")).toHaveLength(2);
    expect(result.events.filter((e) => e.type === "battleFinished")).toHaveLength(1);
  });

  it("清场只跟随本次 Fanatic 死亡，不重放旧尸体，也不移除其它卡", () => {
    const base = defeatSetup();
    const state: GameState = {
      ...base,
      battle: {
        ...base.battle!,
        entities: [
          ...base.battle!.entities.map((e) => (e.id === "fanatic" ? { ...e, dead: true } : e)),
          {
            ...base.battle!.entities.find((e) => e.id === "fanatic")!,
            id: "other",
            monsterCardId: "monster_small:p001",
          },
        ],
      },
    };
    const input = { state, events: [] };
    expect(clearFanaticIPyre(input, ["other"]).result).toBe(input);
    const cleared = clearFanaticIPyre(input, ["fanatic"]);
    expect(cleared.ids).toEqual(["fanatic", "boss:fanatic:pyre"]);
    expect(cleared.result.state.battle!.entities.find((e) => e.id === "other")).toBe(
      state.battle!.entities.find((e) => e.id === "other"),
    );
    expect(clearFanaticIPyre(cleared.result, ["fanatic"]).result).toBe(cleared.result);
  });

  it("summon(battleStartPyre) 声明 Pyre 远程姿态 + stanceArea", () => {
    const script = getBossScript(FANATIC_I_SCRIPT_ID)!;
    const plan = readFanaticIPyreBattleStartPlan(script);
    expect(plan).toMatchObject({
      summonMonsterCardId: FANATIC_I_PYRE_MONSTER_CARD_ID,
      miniaturePlacement: "stanceArea",
      fixedStance: "ranged",
    });
    const hook = runBossHook(script, "summon", {
      scriptId: FANATIC_I_SCRIPT_ID,
      skillSlot: 0,
      purpose: "skill",
    });
    expect(hook.status).toBe("notApplicable");
  });

  it("sentenceRendered 钩子 ok", () => {
    const script = getBossScript(FANATIC_I_SCRIPT_ID)!;
    expect(readFanaticISentenceRenderedEnabled(script)).toBe(true);
  });

  it("startBattle 写入 Pyre 实体（Boss 战 + 已核实 p011）", () => {
    const initial = fanaticBattle();
    const started = applyEncounterCommand(initial, { type: "startBattle" });
    expect(started.events.some((event) => event.type === "commandRefused")).toBe(false);
    const pyre = started.state.battle!.entities.find(
      (entity) => entity.monsterCardId === FANATIC_I_PYRE_MONSTER_CARD_ID,
    );
    expect(pyre).toMatchObject({ stance: "ranged", stanceSlots: 2, areaId: "b", dead: false });
  });

  it("缺 Pyre 卡面时 startBattle 拒绝，不消耗先攻 RNG", () => {
    const initial = fanaticBattle();
    const withoutPyre = {
      ...initial,
      battle: {
        ...initial.battle!,
        monsters: [fanaticCard] as MonsterCardView[],
      },
    };
    const before = withoutPyre.battle!.rngCursor ?? 0;
    const started = applyEncounterCommand(withoutPyre, { type: "startBattle" });
    expect(started.events.some((event) => event.type === "commandRefused")).toBe(true);
    expect(started.state.battle!.rngCursor ?? before).toBe(before);
    expect(
      started.state.battle!.entities.some(
        (entity) => entity.monsterCardId === FANATIC_I_PYRE_MONSTER_CARD_ID,
      ),
    ).toBe(false);
  });

  it("Sentence Rendered：Fanatic 回合向最近英雄移动一步", () => {
    let state = fanaticBattle({
      entities: [
        ...stances.map((stance, index) => ({
          id: `h${index}`,
          side: "hero" as const,
          areaId: "b",
          stance,
          hero: "CRUSADER",
          skillIds: [] as string[],
          wounds: 0,
          stress: 0,
          dodge: 0,
          guard: false,
          dead: false,
          bleed: [] as string[],
          blight: [] as string[],
        })),
        {
          id: "fanatic",
          side: "monster" as const,
          hero: null,
          monsterCardId: fanaticCard.id,
          life: fanaticCard.life,
          dodge: 0,
          areaId: "a",
          stance: "aggressive" as const,
          stanceSlots: 2 as const,
          shuffleResist: false,
          wounds: 0,
          skillIds: [] as string[],
          guard: false,
          dead: false,
          bleed: [] as string[],
          blight: [] as string[],
        },
      ],
    });
    state = applyFanaticIPyreBattleStart(state).state;
    state = {
      ...state,
      battle: {
        ...state.battle!,
        encounter: {
          round: 1,
          deck: [],
          actedIds: [],
          turn: { type: "monster", actorId: "fanatic" },
        },
      },
    };
    expect(fanaticSentenceRenderedShouldReplaceSkill(state, "fanatic")).toBe(true);
    const moved = applyCommand(state, { type: "prepareMonsterAction", actorId: "fanatic" });
    expect(moved.events.some((event) => event.type === "commandRefused")).toBe(false);
    expect(moved.state.battle!.entities.find((entity) => entity.id === "fanatic")!.areaId).toBe(
      "b",
    );
  });

  it("Sentence Rendered：与英雄同区时丢入 Pyre 区域", () => {
    let state = fanaticBattle({
      entities: [
        {
          id: "h2",
          side: "hero" as const,
          areaId: "a",
          stance: "ranged" as const,
          hero: "CRUSADER",
          skillIds: [] as string[],
          wounds: 0,
          stress: 0,
          dodge: 0,
          guard: false,
          dead: false,
          bleed: [] as string[],
          blight: [] as string[],
        },
        {
          id: "fanatic",
          side: "monster" as const,
          hero: null,
          monsterCardId: fanaticCard.id,
          life: fanaticCard.life,
          dodge: 0,
          areaId: "a",
          stance: "aggressive" as const,
          stanceSlots: 2 as const,
          shuffleResist: false,
          wounds: 0,
          skillIds: [] as string[],
          guard: false,
          dead: false,
          bleed: [] as string[],
          blight: [] as string[],
        },
      ],
    });
    state = applyFanaticIPyreBattleStart(state).state;
    expect(
      state.battle!.entities.find(
        (entity) => entity.monsterCardId === FANATIC_I_PYRE_MONSTER_CARD_ID,
      )!.areaId,
    ).toBe("a");
    state = {
      ...state,
      battle: {
        ...state.battle!,
        encounter: {
          round: 1,
          deck: [],
          actedIds: [],
          turn: { type: "monster", actorId: "fanatic" },
        },
      },
    };
    const tossed = applyFanaticSentenceRendered(state, "fanatic");
    expect(tossed.events.some((event) => event.type === "commandRefused")).toBe(false);
    expect(tossed.state.battle!.entities.find((entity) => entity.id === "h2")!.areaId).toBe("a");
    expect(
      tossed.events.some(
        (event) => event.type === "dungeonUpdated" && event.message.includes("Pit Toss"),
      ),
    ).toBe(true);
  });
});

describe("Fanatic I · 先攻 4 洗入与 Pit Toss 钩子", () => {
  beforeEach(() => {
    clearBossScriptsForTest();
    ensureFanaticIBossScriptRegistered();
    bossQuestScriptId[FACE_THE_THREAT_QUEST_ID] = FANATIC_I_SCRIPT_ID;
  });

  it("Fanatic + Pyre 在场时先攻堆补足 4 张 monster 侧（spec §14.5 R39）", () => {
    let base = fanaticBattle();
    base = applyFanaticIPyreBattleStart(base).state;
    const sides = expandFanaticIInitiativeDeckSides(
      base.battle!.entities.filter((entity) => !entity.dead).map((entity) => entity.side),
      base.battle!,
      base,
    );
    expect(sides.filter((side) => side === "monster")).toHaveLength(4);
    expect(sides.filter((side) => side === "hero")).toHaveLength(4);
  });

  it("startBattle 写入 4 张 monster 先攻", () => {
    const started = applyCommand(fanaticBattle(), { type: "startBattle" });
    const deck = started.state.battle!.encounter!.deck;
    expect(deck.filter((side) => side === "monster")).toHaveLength(4);
  });

  it("pitToss 钩子已声明", () => {
    const script = getBossScript(FANATIC_I_SCRIPT_ID)!;
    expect(readFanaticIPitTossEnabled(script)).toBe(true);
    const hook = runBossHook(script, "pitToss", {
      scriptId: FANATIC_I_SCRIPT_ID,
      monsterEntityId: "fanatic",
      round: 1,
    });
    expect(hook).toMatchObject({ status: "ok", effect: "tossReachHeroIntoPyreArea" });
  });

  it("Sentence Rendered 第 1 次行动后 Fanatic 未进入 actedIds", () => {
    let state = fanaticBattle();
    state = applyFanaticIPyreBattleStart(state).state;
    state = {
      ...state,
      battle: {
        ...state.battle!,
        encounter: {
          round: 1,
          deck: ["monster"],
          actedIds: [],
          turn: { type: "monster", actorId: "fanatic" },
        },
      },
    };
    const moved = applyFanaticSentenceRendered(state, "fanatic");
    expect(moved.state.battle!.fanaticActionsThisRound).toBe(1);
    expect(moved.state.battle!.encounter!.actedIds).not.toContain("fanatic");
    expect(fanaticShouldEnterActedIdsAfterTurn(moved.state, "fanatic")).toBe(false);
  });

  it("applyFanaticPitTossHeroIntoPyreArea 同区丢入 Pyre", () => {
    let state = fanaticBattle({
      entities: [
        {
          id: "h2",
          side: "hero" as const,
          areaId: "a",
          stance: "ranged" as const,
          hero: "CRUSADER",
          skillIds: [] as string[],
          wounds: 0,
          stress: 0,
          dodge: 0,
          guard: false,
          dead: false,
          bleed: [] as string[],
          blight: [] as string[],
        },
        {
          id: "fanatic",
          side: "monster" as const,
          hero: null,
          monsterCardId: fanaticCard.id,
          life: fanaticCard.life,
          dodge: 0,
          areaId: "a",
          stance: "aggressive" as const,
          stanceSlots: 2 as const,
          shuffleResist: false,
          wounds: 0,
          skillIds: [] as string[],
          guard: false,
          dead: false,
          bleed: [] as string[],
          blight: [] as string[],
        },
      ],
    });
    state = applyFanaticIPyreBattleStart(state).state;
    state = {
      ...state,
      battle: {
        ...state.battle!,
        encounter: {
          round: 1,
          deck: [],
          actedIds: [],
          turn: { type: "monster", actorId: "fanatic" },
        },
      },
    };
    const tossed = applyFanaticPitTossHeroIntoPyreArea(state, "fanatic", "h2");
    expect(tossed.state.battle!.entities.find((entity) => entity.id === "h2")!.areaId).toBe("a");
    expect(
      tossed.events.some(
        (event) => event.type === "dungeonUpdated" && event.message.includes("Pit Toss"),
      ),
    ).toBe(true);
  });
});
