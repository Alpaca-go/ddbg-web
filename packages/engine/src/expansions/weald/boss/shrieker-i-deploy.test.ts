import { buildShriekerICombatCatalog } from "./shrieker-i-projection";
import { registerBossScript } from "../../../boss/registry";
import { DEFAULT_BOSS_BATTLE_RULES } from "../../../boss/rules";
import { finishTurn, removeCasualties } from "../../../encounter";
import { expect, it } from "vitest";
import { savedCommandSchema } from "../../../../../data/src/quest-save";
import { applyCommand, type GameState, type Command } from "../../../command";
import { createCoreDungeonQuest } from "../../../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../../../test-helpers/core-quest";

import { nextExpeditionLocationDecks } from "../../../hamlet-location-embark";

import { SHRIEKER_I_DEPLOYMENT_ENTRY, SHRIEKER_I_SCRIPT_ID } from "./shrieker-i-deploy";

function run(state: GameState, command: Command) {
  const result = applyCommand(state, command);
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  return result.state;
}
// 受控抵达目标房，不代表自然探索或正式战役日志验收。
function atObjective(): GameState {
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
    activeBossThreatScriptId: SHRIEKER_I_SCRIPT_ID,
    imminentThreatDescriptionCardId: "boss_ability:weald:p001",
    contentPacks: ["core", "weald"] as const,
    locationBossThreats: true as const,
    bossLocationSources: true as const,
  };
  return {
    ...state,
    dungeon: {
      ...d,
      ...threat,
      // 复用已核准普通 Weald 来源；尚无自然 Shrieker 出征，不伪称正式日志。
      ...nextExpeditionLocationDecks({ ...d, ...threat }, "quest:weald:p005"),
      bossExpeditionRegion: "weald",
      contentPacks: ["core", "weald"],
      phase: "awaitingRoom",
      position: d.rooms.find((r) => r.kind === "objective")!.id,
      rooms: d.rooms.map((r) => (r.kind === "objective" ? { ...r, revealed: true } : r)),
      faceTheThreatEmbarkPlan: {
        resolvedScriptId: SHRIEKER_I_SCRIPT_ID,
        questId: "quest:p019",
        combatEntry: SHRIEKER_I_DEPLOYMENT_ENTRY,
        rulesRef: ["W3", "R-261"],
        layoutWiringHold: "受控部署夹具，未开放出征",
        roomPlacement: "edgeRoomsR30",
      },
    },
  };
}

it("R-036：Stygian 仍绑定标准 Shrieker 房 p011", () => {
  const source = atObjective();
  const stygian: GameState = {
    ...source,
    dungeon: { ...source.dungeon!, mode: "stygian", stygianRoomRules: "full" },
  };
  const prepared = run(stygian, { type: "prepareDungeonBattle" });
  expect(prepared.dungeon!.roomCards!.active!.cardId).toBe("room:weald:p011");
  run(prepared, { type: "deployShriekerI" });
});

it("W3／R-261 公开命令绑定并部署十区，交接英雄、牌池及 RNG；JSON 序列化确定性", () => {
  const source = atObjective();
  const before = structuredClone(source);
  const prepared = run(source, { type: "prepareDungeonBattle" });
  expect(prepared.dungeon!.roomCards!.active!.cardId).toBe("room:weald:p011");
  const command = { type: "deployShriekerI" } as const;
  expect(savedCommandSchema.parse(command)).toEqual(command);
  const state = run(prepared, command);
  expect(run(JSON.parse(JSON.stringify(prepared)) as GameState, command)).toEqual(state);
  expect(state.battle!.areas).toHaveLength(10);
  expect(state.battle!.entities.slice(4).map((e) => [e.id, e.areaId, e.stanceSlots])).toEqual([
    ["boss:shrieker", "E", 2],
    ["boss:shrieker:nest", "E", 2],
  ]);
  for (const hero of state.battle!.entities.slice(0, 4)) {
    const original = source.dungeon!.heroes.find((h) => h.id === hero.id)!;
    expect(hero.areaId).toBe(["aggressive", "defensive"].includes(hero.stance!) ? "J" : "C");
    expect(hero.wounds).toBe(original.wounds);
    expect(hero.skillIds).toEqual(original.skillIds);
  }
  expect(state.battle!.rngCursor).toBe(source.dungeon!.cursor);
  expect(state.battle!.choiceCursor).toBe(source.dungeon!.decision);
  expect(state.dungeon!.monsterPool).toEqual(source.dungeon!.monsterPool);
  expect(state.dungeon!.roomCards!.deck).toEqual(source.dungeon!.roomCards!.deck);
  expect(source).toEqual(before);
  for (const next of [{ type: "startBattle" }, command] as const) {
    const rejected = applyCommand(state, next);
    expect(rejected.state).toBe(state);
    expect(rejected.events).toContainEqual(expect.objectContaining({ type: "commandRefused" }));
  }
});

it("不匹配的威胁、等级、包、出征计划、英雄或重复部署全部原子拒绝", () => {
  const source = atObjective();
  const d = source.dungeon!;
  for (const changes of [
    { contentPacks: ["core"] as const },
    { campaignLevel: 2 as const },
    { imminentThreatDescriptionCardId: "boss_ability:weald:p007" },
    { activeBossThreatScriptId: "boss:weald:hag:1" as const },
    {
      faceTheThreatEmbarkPlan: {
        ...d.faceTheThreatEmbarkPlan!,
        combatEntry: { ...SHRIEKER_I_DEPLOYMENT_ENTRY, printedInitiativeCards: 1 },
      },
    },
  ]) {
    const state = { ...source, dungeon: { ...d, ...changes } };
    const result = applyCommand(state, { type: "prepareDungeonBattle" });
    expect(result.state).toBe(state);
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(true);
  }
  const prepared = run(source, { type: "prepareDungeonBattle" });
  for (const changes of [
    { heroes: prepared.dungeon!.heroes.slice(1) },
    { heroes: prepared.dungeon!.heroes.map((h) => ({ ...h, stance: "aggressive" as const })) },
    { decision: -1 },
    { imminentThreatDescriptionCardId: "wrong" },
  ]) {
    const state = { ...prepared, dungeon: { ...prepared.dungeon!, ...changes } };
    const result = applyCommand(state, { type: "deployShriekerI" });
    expect(result.state).toBe(state);
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(true);
  }
});

it("W3 本体死亡清除 Nest，经共用死亡事件且不重复清理；机制夹具不解除开战停点", () => {
  let state = run(run(atObjective(), { type: "prepareDungeonBattle" }), {
    type: "deployShriekerI",
  });
  state = {
    ...state,
    battle: {
      ...state.battle!,
      encounter: {
        round: 1,
        deck: [],
        actedIds: [],
        turn: { type: "finished", outcome: "victory" },
      },
      entities: state.battle!.entities.map((e) =>
        e.id === "boss:shrieker" ? { ...e, dead: true, wounds: e.life! } : e,
      ),
    },
  };
  for (const changes of [
    { campaignLevel: 2 as const },
    { activeBossThreatScriptId: "boss:weald:hag:1" as const },
    { contentPacks: ["core"] as const },
    { imminentThreatDescriptionCardId: "wrong" },
  ]) {
    const unrelated = { ...state, dungeon: { ...state.dungeon!, ...changes } };
    const result = removeCasualties({ state: unrelated, events: [] }, ["boss:shrieker"]);
    expect(result.state.battle!.entities.find((e) => e.id === "boss:shrieker:nest")!.dead).toBe(
      false,
    );
    expect(result.events.filter((e) => e.type === "casualtyRemoved")).toHaveLength(1);
  }
  const cleared = removeCasualties({ state, events: [] }, ["boss:shrieker"]);
  expect(cleared.state.battle!.entities.find((e) => e.id === "boss:shrieker:nest")!.dead).toBe(
    true,
  );
  expect(cleared.events.filter((e) => e.type === "casualtyRemoved")).toHaveLength(2);
  expect(cleared.state.battle!.entities.filter((e) => e.side === "hero")).toEqual(
    state.battle!.entities.filter((e) => e.side === "hero"),
  );
  expect(cleared.state.battle!.rngCursor).toBe(state.battle!.rngCursor);
  expect(cleared.state.battle!.shriekerISetupHold).toBe(true);
  const repeated = removeCasualties({ state: cleared.state, events: [] }, []);
  expect(repeated.events).toEqual([]);
  expect(repeated.state).toEqual(cleared.state);
});

it("R-261 显式技能版本保留旧部署输出，两个版本都保持开战停点", () => {
  const prepared = run(atObjective(), { type: "prepareDungeonBattle" });
  const legacy = run(prepared, { type: "deployShriekerI" });
  expect(legacy.battle!.monsters![0]).toMatchObject({
    skills: [],
    verification: { unverified: true },
  });
  const command = { type: "deployShriekerI", shriekerSkills: true } as const;
  expect(savedCommandSchema.parse(command)).toEqual(command);
  expect(savedCommandSchema.safeParse({ ...command, shriekerSkills: false }).success).toBe(false);
  const modern = run(prepared, command);
  expect(modern.battle!.monsters![0]!.skills).toHaveLength(3);
  expect(modern.battle!.monsters![1]!.skills).toEqual([]);
  expect(modern.battle!.entities).toEqual(legacy.battle!.entities);
  expect(modern.dungeon).toEqual(legacy.dungeon);
  expect(modern.battle!.rngCursor).toBe(legacy.battle!.rngCursor);
  expect(run(JSON.parse(JSON.stringify(prepared)) as GameState, command)).toEqual(modern);
  expect(applyCommand(modern, { type: "startBattle" }).state).toBe(modern);
});

it("W3／R-261 受控开战夹具：三张怪物先攻均给本体，Nest 不行动，下一轮重置", () => {
  registerBossScript({
    id: SHRIEKER_I_SCRIPT_ID,
    displayName: "Shrieker I test",
    rules: DEFAULT_BOSS_BATTLE_RULES,
    combatEntry: SHRIEKER_I_DEPLOYMENT_ENTRY,
    hooks: {},
  });
  const deployed = run(run(atObjective(), { type: "prepareDungeonBattle" }), {
    type: "deployShriekerI",
    shriekerSkills: true,
  });
  // 仅测试先攻／行动配额；不称自然开战或完整日志，不解除产品入口停点。
  const { shriekerISetupHold: _hold, ...battle } = deployed.battle!;
  void _hold;
  let state = run({ ...deployed, battle }, { type: "startBattle" });
  expect(state.battle!.encounter!.deck.filter((s) => s === "monster")).toHaveLength(3);
  expect(state.battle!.encounter!.deck.filter((s) => s === "hero")).toHaveLength(4);
  state = {
    ...state,
    battle: {
      ...state.battle!,
      encounter: {
        ...state.battle!.encounter!,
        deck: ["monster", "monster", "monster"],
        actedIds: state.battle!.entities.filter((e) => e.side === "hero").map((e) => e.id),
      },
    },
  };
  for (let i = 1; i <= 3; i++) {
    state = run(state, { type: "drawInitiative" });
    expect(state.battle!.encounter!.turn).toMatchObject({
      type: "monster",
      actorId: "boss:shrieker",
    });
    state = { ...state, battle: { ...state.battle!, pending: null, monsterAction: null } };
    const finished = finishTurn(state, "boss:shrieker", []);
    expect(finished.events.some((e) => e.type === "commandRefused")).toBe(false);
    state = finished.state;
    if (i < 3) {
      expect(state.battle!.shriekerActionsThisRound).toBe(i);
      expect(state.battle!.encounter!.actedIds).not.toContain("boss:shrieker");
    }
  }
  expect(state.battle!.encounter!.round).toBe(2);
  expect(state.battle!.shriekerActionsThisRound).toBeUndefined();
  expect(state.battle!.encounter!.deck.filter((s) => s === "monster")).toHaveLength(3);
});

it("R-262 受控多目标技能：Acc 后飞行并治疗，已在巢内也治疗，姿态与 RNG 不重复消费", () => {
  const deployed = run(run(atObjective(), { type: "prepareDungeonBattle" }), {
    type: "deployShriekerI",
    shriekerSkills: true,
  });
  const { shriekerISetupHold: _hold, ...base } = deployed.battle!;
  void _hold;
  for (const wounds of [0, 5])
    for (const origin of ["D", "E"]) {
      const state: GameState = {
        seed: deployed.seed,
        notes: [],
        battle: {
          ...base,
          monsters: buildShriekerICombatCatalog({ nestInPlay: true, nestFlightApproved: true }),
          entities: base.entities.map((e) =>
            e.id === "boss:shrieker"
              ? { ...e, wounds, areaId: origin }
              : e.side === "hero"
                ? { ...e, areaId: origin === "D" ? "A" : "B", dodge: 10 }
                : e,
          ),
        },
      };
      const before = structuredClone(state);
      const result = applyCommand(state, {
        type: "playMonsterSkill",
        actorId: "boss:shrieker",
        targetId: state.battle!.entities[0]!.id,
        skillSlot: 2,
      });
      expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
      expect(result.state.battle!.entities.find((e) => e.id === "boss:shrieker")).toMatchObject({
        areaId: "E",
        wounds: Math.max(0, wounds - 2),
        stance: "aggressive",
      });
      expect(result.state.battle!.rngCursor).toBe(state.battle!.rngCursor + 1);
      expect(state).toEqual(before);
    }
});
