import { captureHagIHero } from "./hag-i-captive";
import { nextBattleRoll } from "../../../battle-roll";
import { expect, it } from "vitest";
import { applyCommand, type GameState, type Command } from "../../../command";
import { createCoreDungeonQuest } from "../../../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../../../test-helpers/core-quest";
import { requireFaceTheThreatEmbarkPlanForSandbox } from "../../../boss/face-the-threat-embark-runtime";
import {
  ensureHagIBossScriptRegistered,
  HAG_I_SCRIPT_ID,
  HAG_I_DESCRIPTION_ABILITY_CARD_ID,
} from "./hag-i";

function run(state: GameState, command: Command) {
  const result = applyCommand(state, command);
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  return result.state;
}
// 受控抵达目标房，不代表自然探索或正式战役日志验收。
function atObjective(): GameState {
  ensureHagIBossScriptRegistered();
  const state = createCoreDungeonQuest(
    17,
    "quest:p019",
    "standard",
    coreParty,
    coreQuestSources,
    true,
  );
  const d = state.dungeon!;
  const threat = {
    campaignLevel: 1 as const,
    activeBossThreatScriptId: HAG_I_SCRIPT_ID,
    imminentThreatDescriptionCardId: HAG_I_DESCRIPTION_ABILITY_CARD_ID,
  };
  return {
    ...state,
    dungeon: {
      ...d,
      ...threat,
      contentPacks: ["core", "weald"],
      phase: "awaitingRoom",
      position: d.rooms.find((r) => r.kind === "objective")!.id,
      rooms: d.rooms.map((r) => (r.kind === "objective" ? { ...r, revealed: true } : r)),
      faceTheThreatEmbarkPlan: {
        ...requireFaceTheThreatEmbarkPlanForSandbox(threat),
        roomPlacement: "edgeRoomsR30",
      },
    },
  };
}

function deployed() {
  return [{ type: "prepareDungeonBattle" }, { type: "deployHagI" }, { type: "startBattle" }].reduce(
    (state, c) => run(state, c as Command),
    atObjective(),
  );
}
// 受控终局事实验证交接，不能充当自然战斗或日志存档验收。
function victory(): GameState {
  const s = deployed();
  return {
    ...s,
    battle: {
      ...s.battle!,
      entities: s.battle!.entities.map((e) => (e.side === "monster" ? { ...e, dead: true } : e)),
      encounter: { ...s.battle!.encounter!, turn: { type: "finished", outcome: "victory" } },
    },
  };
}
const finish = { type: "finishDungeonBattle" } as const;

it("Hag 胜利交接清房／威胁，保持普通池与游标，随后回村只发一次 3 XP", () => {
  const base = victory();
  const source: GameState = { ...base, dungeon: { ...base.dungeon!, locationBossThreats: true } };
  const after = run(source, finish);
  expect(run(JSON.parse(JSON.stringify(source)) as GameState, finish)).toEqual(after);
  expect(after.battle).toBeUndefined();
  expect(after.dungeon!.bossQuestVictory).toBe(true);
  if (source.dungeon!.locationBossThreats)
    expect(after.dungeon!.defeatedWealdBossIdentities).toEqual(["hag"]);
  expect(after.dungeon!.activeBossThreatScriptId).toBeUndefined();
  expect(after.dungeon!.defeatedRuinsBossIdentities).toEqual(
    source.dungeon!.defeatedRuinsBossIdentities,
  );
  expect(after.dungeon!.roomCards!.active).toBeNull();
  expect(after.dungeon!.rooms.find((r) => r.id === after.dungeon!.position)!.cleared).toBe(true);
  expect(after.dungeon!.monsterPool).toEqual(source.dungeon!.monsterPool);
  expect(after.dungeon!.roomCards!.deck).toEqual(source.dungeon!.roomCards!.deck);
  expect(after.dungeon!.cursor).toBe(source.battle!.rngCursor);
  expect(after.dungeon!.heroes.map((h) => h.xp)).toEqual(source.dungeon!.heroes.map((h) => h.xp));
  expect(applyCommand(after, finish).state).toBe(after);
  // 这里仅把位置/阶段设置为已离开，单独验证既有摘要与回村接收本批胜利事实。
  let state: GameState = { ...after, dungeon: { ...after.dungeon!, phase: "exited" } };
  state = run(state, { type: "summarizeDungeonQuest" });
  expect(state.dungeon!.questSummary).toMatchObject({
    xpPerHero: 3,
    stagecoachXp: 3,
    awarded: false,
  });
  for (const type of ["beginReturnToHamlet", "finishReturnToHamlet"] as const)
    state = run(state, { type });
  expect(state.dungeon!.phase).toBe("inHamlet");
  expect(state.dungeon!.heroes.map((h) => h.xp)).toEqual(
    after.dungeon!.heroes.map((h) => (h.xp ?? 0) + 3),
  );
  expect(applyCommand(state, { type: "finishReturnToHamlet" }).state).toBe(state);
});

it("Hag 英雄全灭保留战场与牌池，不清房不奖励", () => {
  const source = deployed();
  const input: GameState = {
    ...source,
    battle: {
      ...source.battle!,
      entities: source.battle!.entities.map((e) =>
        e.side === "hero" ? { ...e, dead: true, wounds: e.life! } : e,
      ),
      encounter: {
        ...source.battle!.encounter!,
        turn: { type: "halted", reason: "heroesDefeated", monstersDefeated: false },
      },
    },
  };
  const after = run(input, finish);
  expect(after.battle).toBe(input.battle);
  expect(after.dungeon!.campaignFailure).toBe("bossQuestHeroesDefeated");
  expect(after.dungeon!.roomCards).toEqual(input.dungeon!.roomCards);
  expect(after.dungeon!.bossQuestVictory).toBeFalsy();
});

it.each(["livingPot", "livingHag", "threat", "pack", "mutual", "heroId", "cursor", "loot"])(
  "Hag 不合法终局原子拒绝：%s",
  (kind) => {
    const source = victory();
    const b = source.battle!;
    const input: GameState = {
      ...source,
      dungeon: {
        ...source.dungeon!,
        ...(kind === "pack" ? { contentPacks: ["core"] } : {}),
        ...(kind === "threat" ? { imminentThreatDescriptionCardId: "wrong" } : {}),
      },
      battle: {
        ...b,
        ...(kind === "cursor" ? { rngCursor: -1 } : {}),
        ...(kind === "loot" ? { lootPool: { ...b.lootPool!, gold: -1 } } : {}),
        entities: b.entities.map((e) => {
          if (
            (kind === "livingPot" && e.id === "boss:hag:cauldron-empty") ||
            (kind === "livingHag" && e.id === "boss:hag")
          )
            return { ...e, dead: false };
          if (kind === "mutual" && e.side === "hero") return { ...e, dead: true };
          if (kind === "heroId" && e.side === "hero") return { ...e, id: "duplicate" };
          return e;
        }),
      },
    };
    const result = applyCommand(input, finish);
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(true);
    expect(result.state).toBe(input);
  },
);

it("R-256 锅内死亡英雄无棋盘姿态也可交接，存活英雄姿态不回滚", () => {
  const source = victory();
  const deadId = source.dungeon!.heroes[3]!.id;
  const input: GameState = {
    ...source,
    battle: {
      ...source.battle!,
      entities: source.battle!.entities.map((e) => {
        if (e.id !== deadId) return e;
        const { stance: _stance, ...rest } = e;
        void _stance;
        return { ...rest, dead: true };
      }),
    },
  };
  const after = run(input, finish);
  expect(after.dungeon!.phase).toBe("awaitingReplacement");
  expect(after.dungeon!.heroes.find((h) => h.id === deadId)!.dead).toBe(true);
  expect(after.dungeon!.heroes.filter((h) => !h.dead).map((h) => h.stance)).toEqual(
    source.dungeon!.heroes.slice(0, 3).map((h) => h.stance),
  );
});

it("仍有锅内英雄记录时拒绝伪造终局，不丢失锅内英雄", () => {
  const source = victory();
  const hero = source.battle!.entities.find((e) => e.side === "hero")!;
  const input: GameState = {
    ...source,
    battle: { ...source.battle!, hagCauldron: { cauldronId: "boss:hag:cauldron-empty", hero } },
  };
  const result = applyCommand(input, finish);
  expect(result.events.some((e) => e.type === "commandRefused")).toBe(true);
  expect(result.state).toBe(input);
});

it("公开 Smite 击败 Hag，先选区释放锅内英雄，再 finishDungeonBattle", () => {
  const source = deployed();
  const b = source.battle!;
  const hero = b.entities.find((e) => e.side === "hero")!;
  const captive = b.entities.filter((e) => e.side === "hero")[3]!;
  const capture = captureHagIHero(
    {
      ...source,
      battle: {
        ...b,
        encounter: { ...b.encounter!, turn: { type: "monster", actorId: "boss:hag" } },
      },
    },
    captive.id,
  );
  expect(capture.events.some((e) => e.type === "commandRefused")).toBe(false);
  const captured = capture.state.battle!;
  const cursor = Array.from({ length: 100 }, (_, i) => captured.rngCursor + i).find(
    (i) => nextBattleRoll(source.seed, i) === 1,
  )!;
  const input: GameState = {
    ...capture.state,
    battle: {
      ...captured,
      rngCursor: cursor,
      entities: captured.entities.map((e) =>
        e.id === "boss:hag"
          ? { ...e, wounds: e.life! - 1 }
          : e.id === hero.id
            ? { ...e, areaId: "B" }
            : e,
      ),
      encounter: {
        ...captured.encounter!,
        turn: { type: "hero", actorId: hero.id, actions: 2, usedSkillIds: [] },
      },
    },
  };
  const hit = applyCommand(input, {
    type: "playHeroSkill",
    actorId: hero.id,
    targetId: "boss:hag",
    skillId: "hero_skill:p001",
  });
  expect(hit.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(hit.pendingChoice).toBeDefined();
  const released = run(hit.state, {
    type: "resolveChoice",
    choiceId: hit.pendingChoice!.id,
    optionId: "E",
  });
  expect(released.battle!.encounter!.turn).toEqual({ type: "finished", outcome: "victory" });
  expect(released.battle!.entities.find((e) => e.id === captive.id)).toMatchObject({
    areaId: "E",
    stance: "aggressive",
  });
  const after = run(released, finish);
  expect(after.dungeon!.bossQuestVictory).toBe(true);
  expect(after.dungeon!.heroes.find((h) => h.id === captive.id)!.stance).toBe("aggressive");
  expect(after.battle).toBeUndefined();
});
