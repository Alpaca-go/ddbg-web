import { expect, it } from "vitest";
import { applyCommand, type GameState, type Command } from "../../../command";
import { createCoreDungeonQuest } from "../../../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../../../test-helpers/core-quest";
import { getBossScript } from "../../../boss/registry";
import { nextExpeditionLocationDecks } from "../../../hamlet-location-embark";
import { recoverHamletPools } from "../../../hamlet-return-pools";
import { ensurePounderIBossScriptRegistered, POUNDER_I_SCRIPT_ID } from "./pounder-i";

function run(state: GameState, command: Command) {
  const result = applyCommand(state, command);
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  return result.state;
}
// 受控抵达目标房，不代表自然探索或正式战役日志验收。
function atObjective(): GameState {
  ensurePounderIBossScriptRegistered();
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
    activeBossThreatScriptId: POUNDER_I_SCRIPT_ID,
    imminentThreatDescriptionCardId: "boss_ability:weald:p007",
    contentPacks: ["core", "weald"] as const,
    locationBossThreats: true as const,
    bossLocationSources: true as const,
    pounderDungeonThreats: true as const,
    pounderHamletThreats: true as const,
  };
  return {
    ...state,
    dungeon: {
      ...d,
      ...threat,
      ...nextExpeditionLocationDecks({ ...d, ...threat }, "quest:p019"),
      bossExpeditionRegion: "weald",
      contentPacks: ["core", "weald"],
      phase: "awaitingRoom",
      position: d.rooms.find((r) => r.kind === "objective")!.id,
      rooms: d.rooms.map((r) => (r.kind === "objective" ? { ...r, revealed: true } : r)),
      faceTheThreatEmbarkPlan: {
        resolvedScriptId: POUNDER_I_SCRIPT_ID,
        questId: "quest:p019",
        combatEntry: getBossScript(POUNDER_I_SCRIPT_ID)!.combatEntry!,
        rulesRef: ["W4", "R-258"],
        layoutWiringHold: "受控部署夹具，未开放出征",
        roomPlacement: "edgeRoomsR30",
      },
    },
  };
}

function deployed() {
  return [
    { type: "prepareDungeonBattle" },
    { type: "deployPounderI" },
    { type: "startBattle" },
  ].reduce((state, c) => run(state, c as Command), atObjective());
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

it("胜利交还真实伤口、压力和状态；死亡英雄转既有补员停点", () => {
  const source = victory();
  const injured = source.dungeon!.heroes[0]!.id;
  const dead = source.dungeon!.heroes[3]!.id;
  const stacks = [{ kind: "bleed" as const, amount: 1, remaining: 2 }];
  const input: GameState = {
    ...source,
    battle: {
      ...source.battle!,
      entities: source.battle!.entities.map((e) =>
        e.id === injured
          ? { ...e, wounds: 3, stress: 4, statusStacks: stacks }
          : e.id === dead
            ? { ...e, dead: true, wounds: e.life! }
            : e,
      ),
    },
  };
  const after = run(input, finish);
  expect(after.dungeon!.heroes.find((h) => h.id === injured)).toMatchObject({
    wounds: 3,
    stress: 4,
    statusStacks: stacks,
  });
  expect(after.dungeon!.heroes.find((h) => h.id === dead)!.dead).toBe(true);
  expect(after.dungeon!.phase).toBe("awaitingReplacement");
  expect(after.dungeon!.replacementResume).toBe("ready");
  expect(after.dungeon!.monsterPool).toEqual(source.dungeon!.monsterPool);
});

it("Pounder 胜利交接清房／威胁，保持普通池与游标，随后回村只发一次 3 XP", () => {
  const base = victory();
  const source: GameState = { ...base, dungeon: { ...base.dungeon!, locationBossThreats: true } };
  const after = run(source, finish);
  expect(run(JSON.parse(JSON.stringify(source)) as GameState, finish)).toEqual(after);
  expect(after.battle).toBeUndefined();
  expect(after.dungeon!.bossQuestVictory).toBe(true);
  if (source.dungeon!.locationBossThreats)
    expect(after.dungeon!.defeatedWealdBossIdentities).toEqual(["brigandPounder"]);
  expect(after.dungeon!.activeBossThreatScriptId).toBeUndefined();
  expect(after.dungeon!.defeatedRuinsBossIdentities).toEqual(
    source.dungeon!.defeatedRuinsBossIdentities,
  );
  expect(after.dungeon!.roomCards!.active).toBeNull();
  expect(after.dungeon!.rooms.find((r) => r.id === after.dungeon!.position)!.cleared).toBe(true);
  expect(after.dungeon!.monsterPool).toEqual(source.dungeon!.monsterPool);
  expect(recoverHamletPools(after.dungeon!, after.seed).status).toBe("resolved");
  expect(after.dungeon!.roomCards!.deck).toEqual(source.dungeon!.roomCards!.deck);
  expect(after.dungeon!.cursor).toBe(source.battle!.rngCursor);
  expect(after.dungeon!.heroes.map((h) => h.xp)).toEqual(source.dungeon!.heroes.map((h) => h.xp));
  expect(applyCommand(after, finish).state).toBe(after);
  let state = run(after, { type: "leaveDungeon" });
  state = run(state, {
    type: "resolveChoice",
    choiceId: state.dungeon!.pending!.id,
    optionId: "agree",
  });
  expect(state.dungeon!.phase).toBe("exited");
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

it("Pounder 英雄全灭保留战场与牌池，不清房不奖励", () => {
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

it.each([
  "livingPounder",
  "threat",
  "pack",
  "mutual",
  "heroId",
  "cursor",
  "loot",
  "plan",
  "context",
  "pool",
])("Pounder 不合法终局原子拒绝：%s", (kind) => {
  const source = victory();
  const b = source.battle!;
  const input: GameState = {
    ...source,
    dungeon: {
      ...source.dungeon!,
      ...(kind === "pack" ? { contentPacks: ["core"] } : {}),
      ...(kind === "threat" ? { imminentThreatDescriptionCardId: "wrong" } : {}),
      ...(kind === "plan"
        ? {
            faceTheThreatEmbarkPlan: {
              ...source.dungeon!.faceTheThreatEmbarkPlan!,
              combatEntry: {
                ...source.dungeon!.faceTheThreatEmbarkPlan!.combatEntry,
                printedInitiativeCards: 2,
              },
            },
          }
        : {}),
      ...(kind === "pool"
        ? { monsterPool: { ...source.dungeon!.monsterPool!, remaining: [] } }
        : {}),
    },
    battle: {
      ...b,
      ...(kind === "cursor" ? { rngCursor: -1 } : {}),
      ...(kind === "context"
        ? { pounderFire: { pounderId: "boss:pounder", matchmanId: "m" } }
        : {}),
      ...(kind === "loot" ? { lootPool: { ...b.lootPool!, gold: -1 } } : {}),
      entities: b.entities.map((e) => {
        if (kind === "livingPounder" && e.id === "boss:pounder") return { ...e, dead: false };
        if (kind === "mutual" && e.side === "hero") return { ...e, dead: true };
        if (kind === "heroId" && e.side === "hero") return { ...e, id: "duplicate" };
        return e;
      }),
    },
  };
  const result = applyCommand(input, finish);
  expect(result.events.some((e) => e.type === "commandRefused")).toBe(true);
  expect(result.state).toBe(input);
});
