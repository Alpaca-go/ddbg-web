import { nextBattleRoll } from "./encounter";
import rawTrinkets from "../../data/normalized/corebox/trinket.json";
import { createTrinketPool, drawTrinket, chooseTrinket } from "./trinket-acquisition";
import rawCurios from "../../data/normalized/corebox/curio.json";
import { curioFileSchema } from "../../data/src/curio";
import { expect, it } from "vitest";
import layout from "../../data/normalized/corebox/dungeon_layout_p001.json";
import distribution from "../../data/normalized/corebox/scout_ahead_distribution.json";
import wipeDistribution from "../../data/normalized/corebox/wipe_em_out_distribution.json";
import fundraiserDistribution from "../../data/normalized/corebox/fundraiser_distribution.json";
import rooms from "../../data/normalized/corebox/room.json";
import pool from "../../data/normalized/corebox/monster_pool.json";
import statsFile from "../../data/normalized/corebox/hero_stat.json";
import skillsFile from "../../data/normalized/corebox/hero_skill.json";
import resolveFile from "../../data/normalized/corebox/virtue_affliction.json";
import monsterFile from "../../data/normalized/corebox/monster_medium.json";
import diseases from "../../data/normalized/corebox/disease.json";
import quirks from "../../data/normalized/corebox/quirk.json";
import largeMonsters from "../../data/normalized/corebox/monster_large.json";
import { diseaseFileSchema } from "../../data/src/disease";
import { createConditionPool, gainDisease, conditionPoolProblem } from "./conditions";
import { normalizedHeroStatFileSchema } from "../../data/src/normalize/hero-stat";
import {
  normalizedTrinketFileSchema,
  normalizedHeroSkillFileSchema,
  normalizedVirtueAfflictionFileSchema,
  normalizedMonsterMediumFileSchema,
  normalizedQuirkFileSchema,
  normalizedMonsterLargeFileSchema,
} from "../../data/src/normalize/schema";
import { roomFileSchema } from "../../data/src/room";
import { monsterPoolFileSchema } from "../../data/src/monster-pool";
import { createDungeonSandbox } from "./dungeon";
import type { DungeonBattleCatalog } from "./dungeon";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { closeBattleLoot } from "./loot";
import { applyBattleSkillStatuses } from "./battle-skill-status";
import { resolveMonsterSkill } from "./monster-skill";
import { readMonsterAttackView } from "./monster-skill";
import { readPrintedRange } from "./hero-skill";
import { skillTargetView } from "./battle";
import { tickStatusStacks } from "./status";
import { coreQuestSources } from "./test-helpers/core-quest";
import { prepareTestReplacement } from "./test-helpers/replacement";
import { prepareVerifiedWipeoutReplacements } from "./test-helpers/wipeout-replacement";
import { readRoomTile } from "./room-tile-selection";
import { endAfterCasualties } from "./encounter";
import { replacementHeroCandidates } from "./hero-death-estate";

const stats = normalizedHeroStatFileSchema
  .parse(statsFile)
  .cards.filter(
    (s) => s.level === 1 && ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"].includes(s.name),
  );
const skills = normalizedHeroSkillFileSchema.parse(skillsFile).cards;
const catalog = JSON.parse(
  JSON.stringify({
    trinkets: createTrinketPool(normalizedTrinketFileSchema.parse(rawTrinkets).cards, 1),
    heroStats: stats,
    skills,
    conditions: createConditionPool(
      diseaseFileSchema.parse(diseases).cards,
      normalizedQuirkFileSchema.parse(quirks).cards,
    ),
    monsters: [
      ...normalizedMonsterMediumFileSchema.parse(monsterFile).cards,
      ...normalizedMonsterLargeFileSchema.parse(largeMonsters).cards,
    ]
      .filter((c) => "skills" in c)
      .map((c) => ({
        ...c,
        dodge: c.header_unlabeled_numbers.find(
          (n) => n.anchor.type === "beside_icon" && n.anchor.inside_icon?.key === "dodge",
        )?.numeric,
      })),
  }),
) as DungeonBattleCatalog;
function setup(seed: number): GameState {
  const heroes = stats.map((s, i) => ({
    id: `hero-${i}`,
    heroStatId: s.id,
    level: 1,
    life: s.life,
    wounds: 1,
    stress: 1,
    attributesVerified: true,
    stance: (["aggressive", "defensive", "ranged", "support"] as const)[i]!,
    skillIds: skills
      .filter((c) => c.hero === s.name && c.level === 1)
      .slice(0, 3)
      .map((c) => c.id),
  }));
  const s = createDungeonSandbox(
    seed,
    layout,
    distribution,
    "radiant",
    "D",
    heroes,
    JSON.parse(JSON.stringify(normalizedVirtueAfflictionFileSchema.parse(resolveFile).cards)),
    { dungeonLevel: 1, light: 5, provisions: [{ id: "food", face: "food" }] },
    undefined,
    roomFileSchema.parse(rooms).cards,
    monsterPoolFileSchema.parse(pool).cards,
    catalog,
  );
  return {
    ...s,
    dungeon: {
      ...s.dungeon!,
      phase: "awaitingRoom",
      rooms: s.dungeon!.rooms.map((r) => (r.id === "D" ? { ...r, kind: "treasure" } : r)),
    },
  };
}
function deploy(seed: number): GameState {
  const s = applyCommand(setup(seed), { type: "prepareDungeonBattle" }).state;
  return applyCommand(s, { type: "prepareDungeonMonsters" }).state;
}
it("Guild后的II/III级装备技能可进入真实房间战斗，永久移除的旧卡不能重新装备", () => {
  const prepared = deploy(35),
    d = prepared.dungeon!;
  for (const id of ["hero_skill:p002", "hero_skill:p003"]) {
    // 明示永久装备夹具；使用真实房间/怪物部署，不声称已接通下一次出征。
    const upgraded = {
      ...prepared,
      dungeon: {
        ...d,
        heroes: d.heroes.map((h, i) =>
          i === 0
            ? {
                ...h,
                skillIds: [id, ...h.skillIds!.slice(1)],
                permanentlyRemovedSkillIds:
                  id === "hero_skill:p002"
                    ? ["hero_skill:p001"]
                    : ["hero_skill:p001", "hero_skill:p002"],
              }
            : h,
        ),
      },
    };
    const entered = applyCommand(upgraded, { type: "startDungeonBattle" });
    expect(entered.state.battle?.entities.find((e) => e.id === "hero-0")!.skillIds[0]).toBe(id);
  }
  const stale = {
    ...prepared,
    dungeon: {
      ...d,
      heroes: d.heroes.map((h, i) =>
        i === 0 ? { ...h, permanentlyRemovedSkillIds: [h.skillIds![0]!] } : h,
      ),
    },
  };
  expect(applyCommand(stale, { type: "startDungeonBattle" }).state).toBe(stale);
});
// 不过滤生产牌池；固定种子仅作单场测试。
const goodSeed = 1885;

it("全九房／42怪池seed35自然Treasure入场，T5/T6完整交互与T4断图保持获批数据", () => {
  const prepared = deploy(35);
  const entered = applyCommand(prepared, { type: "startDungeonBattle" });
  expect(entered.state.battle, JSON.stringify(entered.events)).toBeDefined();
  const b = entered.state.battle!;
  expect(b.roomName).toBe("Treasure Chamber");
  expect(b.areas.filter((a) => a.lootTheChest).map((a) => a.id)).toEqual(["T5"]);
  expect(b.areas.filter((a) => a.hideAndHeal).map((a) => a.id)).toEqual(["T6"]);
  expect(b.areas.find((a) => a.id === "T4")!.adjacent).toEqual([]);
  expect(b.trinkets!.cards).toHaveLength(14);
  expect(b.entities.filter((e) => e.side === "hero").map((e) => e.areaId)).toEqual([
    "T8",
    "T3",
    "T8",
    "T3",
  ]);
  expect(applyCommand(prepared, { type: "startDungeonBattle" })).toEqual(entered);
});

it("全九房／42怪池seed9自然Spiked Pit入场，三个特殊区域与S1断图独立", () => {
  const entered = applyCommand(deploy(9), { type: "startDungeonBattle" });
  expect(entered.state.battle, JSON.stringify(entered.events)).toBeDefined();
  const battle = entered.state.battle!;
  expect(battle.roomName).toBe("Spiked Pit");
  expect(battle.areas.filter((area) => area.spikedPit).map((area) => area.id)).toEqual([
    "S8",
    "S9",
  ]);
  expect(battle.areas.filter((area) => area.circleOfPower).map((area) => area.id)).toEqual(["S5"]);
  expect(battle.areas.find((area) => area.id === "S1")!.adjacent).toEqual([]);
  expect(
    battle.entities.filter((entity) => entity.side === "hero").map((entity) => entity.areaId),
  ).toEqual(["S11", "S11", "S12", "S10"]);
});

it("真实部署读取获批Shuffle抗性；有无抗性都由原卡确定，不省略Bone Defender", () => {
  const seen = new Set<string>();
  for (let seed = 1; seed <= 40 && !seen.has("monster_medium:p010"); seed++) {
    const entered = applyCommand(deploy(seed), { type: "startDungeonBattle" });
    if (!entered.state.battle) continue;
    const battle = entered.state.battle;
    for (const entity of battle.entities.filter((entity) => entity.side === "monster")) {
      const card = battle.monsters!.find((card) => card.id === entity.monsterCardId)!;
      expect(entity.shuffleResist).toBe(
        card.resistances!.some((icon) => icon.key === "shuffle_resist"),
      );
      seen.add(card.id);
    }
  }
  expect(seen.has("monster_medium:p010")).toBe(true);
});

it("全九房／42怪池seed7自然Old Abbey入场，O1/O5星区及全部英雄O8独立", () => {
  const deployed = deploy(7),
    entered = applyCommand(deployed, { type: "startDungeonBattle" });
  expect(entered.state.battle, JSON.stringify(entered.events)).toBeDefined();
  expect(entered.state.battle!.roomName).toBe("Old Abbey");
  expect(entered.state.battle!.areas.filter((a) => a.feelingThePresence).map((a) => a.id)).toEqual([
    "O1",
    "O5",
  ]);
  expect(
    entered.state.battle!.entities.filter((e) => e.side === "hero").map((e) => e.areaId),
  ).toEqual(["O8", "O8", "O8", "O8"]);
});

it("完整九房／42怪池seed12自然Tomb入场，只有A4投影Ancestor's Glory", () => {
  const deployed = deploy(12),
    entered = applyCommand(deployed, { type: "startDungeonBattle" });
  expect(entered.state.battle, JSON.stringify(entered.events)).toBeDefined();
  expect(entered.state.battle!.roomName).toBe("Tomb of Ancestor");
  expect(entered.state.battle!.areas.filter((a) => a.ancestorGlory).map((a) => a.id)).toEqual([
    "A4",
  ]);
  expect(
    entered.state.battle!.entities.filter((e) => e.side === "hero").map((e) => e.areaId),
  ).toEqual(["A7", "A3", "A3", "A3"]);
});

it("完整牌池seed1自然抽Beacon可正式入场，压力增减钩子与出生位置独立", () => {
  const deployed = deploy(1);
  const entered = applyCommand(deployed, { type: "startDungeonBattle" });
  expect(entered.state.battle, JSON.stringify(entered.events)).toBeDefined();
  expect(entered.state.battle!.roomName).toBe("Beacon of Light");
  expect(entered.state.battle!.areas.find((a) => a.id === "L2")!.endTurnStress).toBe(-1);
  expect(
    entered.state.battle!.entities.filter((e) => e.side === "hero").map((e) => e.areaId),
  ).toEqual(["L6", "L7", "L6", "L7"]);
});

it("完整九房间池自然抽到Fountain后可正式部署入场；独立高地/泉水/出生不借Ritual", () => {
  let entered: GameState | undefined;
  let seed = 1;
  for (; seed <= 400; seed++) {
    const candidate = deploy(seed);
    if (candidate.dungeon!.roomCards!.active?.cardId !== "room:p003") continue;
    const result = applyCommand(candidate, { type: "startDungeonBattle" });
    if (result.state.battle) {
      entered = result.state;
      break;
    }
  }
  expect(entered).toBeDefined();
  expect(seed).toBe(10);
  expect(entered!.battle!.areas.filter((a) => a.elevation === "high").map((a) => a.id)).toEqual([
    "A",
    "C",
  ]);
  expect(entered!.battle!.areas.find((a) => a.id === "G")!.endTurnHeal).toBe(3);
  expect(entered!.battle!.entities.filter((e) => e.side === "hero").map((e) => e.areaId)).toEqual([
    "I",
    "J",
    "J",
    "I",
  ]);
  expect(entered!.battle!.lootAreas).toEqual([]);
  const commands = [
    { type: "prepareDungeonBattle" },
    { type: "prepareDungeonMonsters" },
    { type: "startDungeonBattle" },
  ] as const;
  expect(commands.reduce((s, c) => applyCommand(s, c).state, setup(seed))).toEqual(entered);
});
function started() {
  return applyCommand(deploy(goodSeed), { type: "startDungeonBattle" }).state;
}

it("完整 42 张池自然抽到 Maggot 可正式入场；疾病实体与 RNG 一次回传地图", () => {
  let entered: GameState | undefined;
  for (let seed = 1; seed <= 400; seed++) {
    const candidate = deploy(seed);
    if (
      !candidate.dungeon!.monsterPool?.active?.monsters.some(
        (m) => m.cardId === "monster_medium:p031",
      )
    )
      continue;
    const result = applyCommand(candidate, { type: "startDungeonBattle" });
    if (result.state.battle) {
      entered = result.state;
      break;
    }
  }
  expect(entered, "完整牌池自然抽取，不过滤或替换 Maggot").toBeDefined();
  const state = applyCommand(entered!, { type: "startBattle" }).state,
    b = state.battle!;
  expect(b.monsters!.some((m) => m.id === "monster_medium:p031")).toBe(true);
  const acquired = gainDisease(
    b.conditions!,
    b.entities.filter((h) => h.side === "hero"),
    "hero-0",
    state.seed,
    b.rngCursor,
  );
  if (acquired.status !== "resolved") throw new Error(acquired.reason);
  // 战斗终局本身沿用既有四轮场景；这里单独验证感染状态的终局交接边界。
  const terminal: GameState = {
    ...state,
    battle: {
      ...b,
      conditions: acquired.pool,
      rngCursor: acquired.cursor,
      entities: b.entities.map((h) => acquired.heroes.find((e) => e.id === h.id) ?? h),
      loot: closeBattleLoot(b.loot),
      encounter: {
        round: 4,
        deck: [],
        actedIds: [],
        turn: { type: "finished", outcome: "retreat" },
      },
    },
  };
  const result = applyCommand(terminal, { type: "finishDungeonBattle" });
  expect(
    result.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toBe(false);
  expect(result.state.dungeon!.heroes[0]!.diseaseId).toBe(acquired.diseaseId);
  expect(result.state.dungeon!.conditions).toEqual(acquired.pool);
  expect(
    conditionPoolProblem(result.state.dungeon!.conditions!, result.state.dungeon!.heroes),
  ).toBeNull();
  expect(result.state.dungeon!.cursor).toBe(acquired.cursor + 41);
  expect(applyCommand(result.state, { type: "finishDungeonBattle" }).state).toBe(result.state);
}, 15_000);
function send(s: GameState, command: Command) {
  const result = applyCommand(s, command);
  expect(
    result.events.find((e) => e.type === "commandRefused"),
    JSON.stringify(command),
  ).toBeUndefined();
  return result.state;
}
it("真实部署交接保留 RNG、伤口压力装备；地牢命令冻结，获批负面状态怪物不重抽", () => {
  const before = deploy(goodSeed),
    copy = structuredClone(before),
    s = started();
  expect(s.battle).toBeDefined();
  expect(before).toEqual(copy);
  expect(s.battle!.rngCursor).toBe(before.dungeon!.cursor);
  expect(
    s
      .battle!.entities.filter((e) => e.side === "hero")
      .map((e) => [e.wounds, e.stress, e.skillIds.length]),
  ).toEqual(Array(4).fill([1, 1, 3]));
  expect(s.battle!.entities.filter((e) => e.side === "monster").map((e) => e.id)).toEqual(
    before.dungeon!.monsterPool!.active!.monsters.map((m) => m.instanceId),
  );
  for (const type of [
    "startDungeonBattle",
    "scoutDungeon",
    "prepareDungeonBattle",
    "finishDungeonBattle",
  ] as const)
    expect(applyCommand(s, { type }).state).toBe(s);
  const deployment = deploy(11);
  const admitted = send(deployment, { type: "startDungeonBattle" });
  expect(admitted.battle).toBeDefined();
  expect(admitted.battle!.rngCursor).toBe(deployment.dungeon!.cursor);
  expect(admitted.battle!.entities.filter((e) => e.side === "monster").map((e) => e.id)).toEqual(
    deployment.dungeon!.monsterPool!.active!.monsters.map((m) => m.instanceId),
  );
});
it("房间 / 板块身份漂移或活动地图房间过期时不进入战斗、不重抽或推进RNG", () => {
  const original = deploy(11),
    d = original.dungeon!,
    pool = d.roomCards!;
  for (const active of [
    { ...pool.active!, cardId: "room:p002" },
    { ...pool.active!, tileId: "room_tile:p002:back" },
    { ...pool.active!, roomId: "G" },
  ]) {
    const state = { ...original, dungeon: { ...d, roomCards: { ...pool, active } } };
    const before = structuredClone(state);
    const result = applyCommand(state, { type: "startDungeonBattle" });
    expect(result.state).toBe(state);
    expect(result.events[0]!.type).toBe("commandRefused");
    expect(state).toEqual(before);
    expect(result.state.battle).toBeUndefined();
    expect(result.state.dungeon!.cursor).toBe(d.cursor);
  }
});

function terminal(outcome: "victory" | "retreat") {
  const s = send(started(), { type: "startBattle" });
  return {
    ...s,
    battle: {
      ...s.battle!,
      loot: closeBattleLoot(s.battle!.loot),
      encounter: {
        ...s.battle!.encounter!,
        round: 4,
        deck: [],
        turn: { type: "finished" as const, outcome },
      },
    },
  };
}

/** 明示死亡边界夹具：真实房间/怪物部署后指定死亡，不冒充自然击杀或正式战役存档。 */
function wipeoutBoundary(
  waiting = 4,
  reason: "heroesDefeated" | "mutualWipeout" = "heroesDefeated",
  before?: GameState,
) {
  const s = before ?? send(started(), { type: "startBattle" });
  const boundary: GameState = {
    ...s,
    dungeon: {
      ...s.dungeon!,
      battleCatalog: coreQuestSources.catalog,
      buildingLevels: { stagecoach: 3 },
      waitingHeroTokens: waiting,
    },
    battle: {
      ...s.battle!,
      entities: s.battle!.entities.map((e) =>
        e.side === "hero" || reason === "mutualWipeout" ? { ...e, dead: true, wounds: e.life! } : e,
      ),
    },
  };
  const ended = endAfterCasualties({ state: boundary, events: [] })!;
  return send(ended.state, { type: "ping", message: "登记机制夹具死者" });
}

it.each([0, 1, 2, 3])("普通任务四英雄全灭、等待%s人：明确失败且不花资源/洗牌/发奖励", (waiting) => {
  const s = wipeoutBoundary(waiting),
    before = structuredClone(s);
  const result = applyCommand(s, { type: "finishDungeonBattle" });
  expect(result.state.dungeon!.campaignFailure).toBe("insufficientWaitingHeroes");
  expect(result.state.battle).toEqual(s.battle);
  expect(result.state.dungeon).toEqual({
    ...s.dungeon!,
    campaignFailure: "insufficientWaitingHeroes",
  });
  expect(result.events.some((e) => e.type === "battleFinished")).toBe(false);
  expect(s).toEqual(before);
  for (const command of [
    { type: "finishDungeonBattle" },
    { type: "prepareReplacementHero" },
    { type: "ping", message: "stop" },
  ] as const)
    expect(applyCommand(result.state, command).state).toBe(result.state);
  expect(
    applyCommand(JSON.parse(JSON.stringify(s)), { type: "finishDungeonBattle" }).state,
  ).toEqual(result.state);
});

it("等待四人时按逃跑交接；不清宝藏/不发20金，登记四死者、强制离房与牌池/RNG守恒", () => {
  const s = wipeoutBoundary(),
    b = s.battle!,
    d = s.dungeon!;
  const count =
    (d.monsterPool!.remaining?.length ?? 0) +
    d.monsterPool!.discarded.length +
    d.monsterPool!.active!.monsters.length;
  const returned = send(s, { type: "finishDungeonBattle" });
  expect(returned.battle).toBeUndefined();
  expect(returned.dungeon).toMatchObject({
    phase: "awaitingReplacement",
    replacementResume: "ready",
    mustLeaveRoomId: d.position,
    waitingHeroTokens: 4,
    gold: b.loot!.gold,
    cursor: b.rngCursor + count - 1,
  });
  expect(returned.dungeon!.campaignFailure).toBeUndefined();
  expect(returned.dungeon!.heroes.every((h) => h.dead)).toBe(true);
  expect(returned.dungeon!.deadHeroNames).toHaveLength(4);
  expect(returned.dungeon!.rooms.find((r) => r.id === d.position)?.cleared).not.toBe(true);
  expect(returned.dungeon!.roomCards!.active).toBeNull();
  expect(returned.dungeon!.roomCards!.discard).toContain(d.roomCards!.active!.cardId);
  expect(returned.dungeon!.monsterPool!.active).toBeNull();
  expect(new Set(returned.dungeon!.monsterPool!.remaining).size).toBe(count);
  expect(applyCommand(returned, { type: "finishDungeonBattle" }).state).toBe(returned);
  expect(replacementHeroCandidates(returned.dungeon!).map((c) => c.name)).toEqual([
    "BOUNTY HUNTER",
    "PLAGUE DOCTOR",
  ]);
  const { awaiting, prepared, commands } = prepareVerifiedWipeoutReplacements(
    send(started(), { type: "startBattle" }),
  );
  expect(awaiting.dungeon!.phase).toBe("awaitingReplacement");
  expect(prepared.dungeon!.preparedReplacements).toHaveLength(2);
  expect(prepared.dungeon!.preparedReplacements!.map((p) => p.hero.heroStatId).sort()).toEqual([
    "hero_stat:p005:front",
    "hero_stat:p013:front",
  ]);
  expect(prepared.dungeon!.waitingHeroTokens).toBe(2);
  expect(replacementHeroCandidates(prepared.dungeon!)).toEqual([]);
  // 正式已接通额外身份只有两名，不能伪造另外两名英雄，也不能把目录不足判成战役失败。
  expect(applyCommand(prepared, { type: "prepareReplacementHero" }).state).toBe(prepared);
  expect(applyCommand(prepared, { type: "joinPreparedReplacements" }).state).toBe(prepared);
  expect(prepared.dungeon!.campaignFailure).toBeUndefined();
  let restored = JSON.parse(JSON.stringify(awaiting)) as GameState;
  for (const command of commands) {
    const result = applyCommand(restored, command);
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
    restored = result.state;
  }
  expect(restored).toEqual(prepared);
});

it("旧I级未记录驿站余额按两人判定；旧全灭停点已准备的替补可继续回传", () => {
  const s = wipeoutBoundary(2);
  const { waitingHeroTokens: _tokens, buildingLevels: _levels, ...rest } = s.dungeon!;
  void _tokens;
  void _levels;
  expect(
    send({ ...s, dungeon: rest }, { type: "finishDungeonBattle" }).dungeon!.campaignFailure,
  ).toBe("insufficientWaitingHeroes");
  const prepared = prepareTestReplacement(wipeoutBoundary());
  expect(prepared.dungeon!.waitingHeroTokens).toBe(3);
  const result = send(prepared, { type: "finishDungeonBattle" });
  expect(result.dungeon!.campaignFailure).toBeUndefined();
  expect(result.dungeon!.preparedReplacements).toHaveLength(1);
  expect(send(JSON.parse(JSON.stringify(prepared)), { type: "finishDungeonBattle" })).toEqual(
    result,
  );
});

it("战斗内已准备一名替补计入可补人数；交接不重复扣代币", () => {
  const startedBattle = send(started(), { type: "startBattle" });
  const firstDeath: GameState = {
    ...startedBattle,
    dungeon: {
      ...startedBattle.dungeon!,
      battleCatalog: coreQuestSources.catalog,
      buildingLevels: { stagecoach: 3 },
      waitingHeroTokens: 4,
    },
    battle: {
      ...startedBattle.battle!,
      entities: startedBattle.battle!.entities.map((e) =>
        e.id === "hero-0" ? { ...e, dead: true, wounds: e.life! } : e,
      ),
    },
  };
  const prepared = prepareTestReplacement(
    send(firstDeath, { type: "ping", message: "登记首死者" }),
  );
  expect(prepared.dungeon!.waitingHeroTokens).toBe(3);
  const halted = wipeoutBoundary(3, "heroesDefeated", prepared);
  const returned = send(halted, { type: "finishDungeonBattle" });
  expect(returned.dungeon!.campaignFailure).toBeUndefined();
  expect(returned.dungeon!.waitingHeroTokens).toBe(3);
  expect(returned.dungeon!.preparedReplacements).toEqual(prepared.dungeon!.preparedReplacements);
  const overCapacity = {
    ...halted,
    dungeon: { ...halted.dungeon!, buildingLevels: { stagecoach: 2 as const } },
  };
  expect(applyCommand(overCapacity, { type: "finishDungeonBattle" }).state).toBe(overCapacity);
  const insufficient = wipeoutBoundary(2, "heroesDefeated", prepared);
  expect(send(insufficient, { type: "finishDungeonBattle" }).dungeon!.campaignFailure).toBe(
    "insufficientWaitingHeroes",
  );
});

it("双方全灭继续R-068停点；假全灭、Boss/未知任务、坏资源/坏牌池/假替补均原子拒绝", () => {
  const s = wipeoutBoundary();
  const both = wipeoutBoundary(0, "mutualWipeout");
  expect(applyCommand(both, { type: "finishDungeonBattle" }).state).toBe(both);
  expect(both.dungeon!.campaignFailure).toBeUndefined();
  const invalid: GameState[] = [
    {
      ...s,
      battle: {
        ...s.battle!,
        encounter: { ...s.battle!.encounter!, turn: { type: "finished", outcome: "victory" } },
      },
    },
    {
      ...s,
      dungeon: {
        ...s.dungeon!,
        questDistribution: { ...s.dungeon!.questDistribution!, questId: "boss:unknown" },
      },
    },
    { ...s, dungeon: { ...s.dungeon!, waitingHeroTokens: -1 } },
    { ...s, dungeon: { ...s.dungeon!, waitingHeroTokens: 5 } },
    {
      ...s,
      dungeon: { ...s.dungeon!, monsterPool: { ...s.dungeon!.monsterPool!, remaining: [] } },
    },
    {
      ...s,
      battle: {
        ...s.battle!,
        entities: s.battle!.entities.map((e) => (e.id === "hero-0" ? { ...e, dead: false } : e)),
      },
    },
    {
      ...s,
      dungeon: {
        ...s.dungeon!,
        preparedReplacements: [{ deadHeroId: "unknown", hero: s.dungeon!.heroes[0]! }],
      },
    },
  ];
  for (const bad of invalid)
    expect(applyCommand(bad, { type: "finishDungeonBattle" }).state).toBe(bad);
});

it.each(["victory", "retreat"] as const)(
  "真实部署的%s交接边界：战斗内只能准备，回传后替补入队；Curio奖励/强制离房与金币只结算一次",
  (outcome) => {
    const finished = terminal(outcome);
    // 显式死亡/战斗收尾夹具，保留真实部署与完整牌池；不冒充自然击杀。
    const boundary: GameState = {
      ...finished,
      dungeon: {
        ...finished.dungeon!,
        battleCatalog: coreQuestSources.catalog,
        curio: {
          cards: curioFileSchema.parse(rawCurios).cards,
          deck: null,
          discard: [],
          active: null,
        },
        curioRoom: { roomId: "D", guardRoll: 3, stage: "guarded" },
        rooms: finished.dungeon!.rooms.map((r) => (r.id === "D" ? { ...r, kind: "curio" } : r)),
      },
      battle: {
        ...finished.battle!,
        entities: finished.battle!.entities.map((e) =>
          e.id === "hero-0" ? { ...e, dead: true } : e,
        ),
      },
    };
    const marked = send(boundary, { type: "ping", message: "登记边界死亡" });
    const prepared = prepareTestReplacement(marked);
    expect(applyCommand(prepared, { type: "joinPreparedReplacements" }).state).toBe(prepared);
    expect(
      prepared.battle!.entities.some(
        (e) => e.id === prepared.dungeon!.preparedReplacements![0]!.hero.id,
      ),
    ).toBe(false);
    const returned = send(prepared, { type: "finishDungeonBattle" });
    expect(returned.dungeon!.replacementResume).toBe(outcome === "victory" ? "roomCurio" : "ready");
    const joined = send(returned, { type: "joinPreparedReplacements" });
    expect(joined.dungeon!.heroes.some((h) => h.dead)).toBe(false);
    expect(joined.dungeon!.heroes[3]!.stance).toBe("support");
    expect(joined.dungeon!.gold).toBe(returned.dungeon!.gold);
    expect(joined.dungeon!.waitingHeroTokens).toBe(returned.dungeon!.waitingHeroTokens);
    expect(joined.dungeon!.pending?.id.startsWith("dungeon-room-curio-draw:") ?? false).toBe(
      outcome === "victory",
    );
    expect(joined.dungeon!.mustLeaveRoomId).toBe(outcome === "retreat" ? "D" : undefined);
    expect(applyCommand(joined, { type: "joinPreparedReplacements" }).state).toBe(joined);
    expect(applyCommand(joined, { type: "finishDungeonBattle" }).state).toBe(joined);
    const deployment = deploy(35);
    const replacementId = joined.dungeon!.heroes[3]!.id;
    const reordered =
      outcome === "retreat"
        ? send(joined, {
            type: "setDungeonStances",
            heroIds: [replacementId, ...joined.dungeon!.heroes.slice(0, 3).map((h) => h.id)],
          })
        : joined;
    const reentered = applyCommand(
      {
        ...deployment,
        dungeon: {
          ...deployment.dungeon!,
          heroes: reordered.dungeon!.heroes,
          battleCatalog: coreQuestSources.catalog,
          conditions: joined.dungeon!.conditions!,
        },
      },
      { type: "startDungeonBattle" },
    );
    expect(
      reentered.events.some((e) => e.type === "commandRefused"),
      JSON.stringify(reentered.events),
    ).toBe(false);
    const bounty = reentered.state.battle!.entities.find((e) => e.hero === "BOUNTY HUNTER")!;
    expect(bounty.id).toBe(joined.dungeon!.heroes[3]!.id);
    expect(bounty.stance).toBe(outcome === "retreat" ? "aggressive" : "support");
    const selected = readRoomTile(
      deployment.dungeon!.roomCards!.cards.find(
        (c) => c.id === deployment.dungeon!.roomCards!.active!.cardId,
      ),
      deployment.dungeon!.roomCards!.active!.tileId,
    );
    if (selected.status !== "matched") throw new Error(selected.reason);
    expect(bounty.areaId).toBe(selected.deployment.heroes[bounty.stance!]);
    expect(bounty.skillIds).toEqual(joined.dungeon!.heroes[3]!.skillIds);
  },
);

it("Curio守卫战后只在胜利时等待英雄/Torch奖励；撤退无奖励、不清理，重复回传拒绝", () => {
  for (const outcome of ["victory", "retreat"] as const) {
    const finished = terminal(outcome);
    const state: GameState = {
      ...finished,
      dungeon: {
        ...finished.dungeon!,
        rooms: finished.dungeon!.rooms.map((r) => (r.id === "D" ? { ...r, kind: "curio" } : r)),
        curioRoom: { roomId: "D", guardRoll: 3, stage: "guarded" },
      },
    };
    const before = structuredClone(state);
    const result = applyCommand(state, { type: "finishDungeonBattle" }).state;
    expect(result.battle).toBeUndefined();
    expect(result.dungeon!.gold).toBe(state.battle!.loot!.gold);
    expect(result.dungeon!.phase).toBe(outcome === "victory" ? "awaitingRoom" : "ready");
    expect(result.dungeon!.curioRoom?.stage).toBe(outcome === "victory" ? "reward" : undefined);
    expect(result.dungeon!.pending?.id.startsWith("dungeon-room-curio-draw:") ?? false).toBe(
      outcome === "victory",
    );
    expect(result.dungeon!.rooms.find((r) => r.id === "D")!.cleared ?? false).toBe(
      outcome === "victory",
    );
    expect(applyCommand(result, { type: "finishDungeonBattle" }).state).toBe(result);
    expect(state).toEqual(before);
  }
});

it("获批 Stun / Bleed 只减 Nt，不减面值；其余状态不阻挡，堆叠与回合消费正确", () => {
  const s = send(deploy(11), { type: "startDungeonBattle" });
  const b = s.battle!,
    actor = b.entities.find((e) => e.side === "monster")!;
  const before = structuredClone(b);
  for (const [name, page, slot, expected] of [
    [
      "CRUSADER",
      "monster_medium:p034",
      1,
      [
        { kind: "debuff", remaining: 2 },
        { kind: "stun", remaining: 1 },
        { kind: "mark", remaining: 3 },
      ],
    ],
    [
      "HELLION",
      "monster_medium:p034",
      1,
      [
        { kind: "debuff", remaining: 2 },
        { kind: "stun", remaining: 2 },
        { kind: "mark", remaining: 3 },
      ],
    ],
    [
      "HELLION",
      "monster_medium:p018",
      1,
      [
        { kind: "bleed", remaining: 2, amount: 1 },
        { kind: "debuff", remaining: 2 },
      ],
    ],
    [
      "CRUSADER",
      "monster_medium:p018",
      1,
      [
        { kind: "bleed", remaining: 3, amount: 1 },
        { kind: "debuff", remaining: 2 },
      ],
    ],
    ["VESTAL", "monster_medium:p037", 2, [{ kind: "blight", remaining: 3, amount: 1 }]],
  ] as const) {
    const target = b.entities.find((e) => e.hero === name)!;
    const card = catalog.monsters.find((c) => c.id === page)!;
    const attack = readMonsterAttackView(card, slot);
    if (attack.status !== "ready") throw new Error(attack.reason);
    const range = readPrintedRange(attack.view);
    if (range.kind !== "exact") throw new Error("射程");
    const resolved = resolveMonsterSkill(
      card,
      slot,
      {
        actor: { id: actor.id, wounds: 0 },
        target: skillTargetView(target),
        areaDistance: range.distance,
        light: 5,
      },
      1,
    );
    if (resolved.status !== "resolved") throw new Error(resolved.reason);
    const result = applyBattleSkillStatuses(b, b.entities, actor.id, [resolved.resolution]);
    if (result.status !== "resolved") throw new Error(result.reason);
    const stacks = result.entities.find((e) => e.id === target.id)!.statusStacks!;
    expect(stacks).toEqual(expected);
    const repeat = applyBattleSkillStatuses(b, result.entities, actor.id, [resolved.resolution]);
    if (repeat.status !== "resolved") throw new Error(repeat.reason);
    expect(repeat.entities.find((e) => e.id === target.id)!.statusStacks).toEqual([
      ...expected,
      ...expected,
    ]);
    if (name === "CRUSADER" && page === "monster_medium:p034") {
      const tick = tickStatusStacks(stacks);
      expect(tick.status).toBe("resolved");
      if (tick.status === "resolved") {
        expect(tick.stunned).toBe(true);
        expect(tick.stacks.some((stack) => stack.kind === "stun")).toBe(false);
      }
    }
  }
  expect(b).toEqual(before);
});
it("缺失或伪造条件防御的任一英雄阻止实际负面状态房间入场，部署和 RNG 保持", () => {
  const initial = deploy(11),
    d = initial.dungeon!;
  for (const override of [
    undefined,
    { resistances: ["stun"], immunities: [], source: "print_front", approval: "wrong" },
  ]) {
    const bad = {
      ...initial,
      dungeon: {
        ...d,
        battleCatalog: {
          ...d.battleCatalog!,
          heroStats: d.battleCatalog!.heroStats.map((h, i) =>
            i !== 1 ? h : { ...h, verified_condition_defence: override },
          ),
        },
      },
    } as GameState;
    const result = applyCommand(bad, { type: "startDungeonBattle" });
    expect(result.state).toBe(bad);
    expect(result.events[0]?.type).toBe("commandRefused");
  }
});
it("胜利一次回传20金币与有限牌堆；同种子同命令回放，英雄状态不重置", () => {
  const s = terminal("victory"),
    before = structuredClone(s);
  const a = send(s, { type: "finishDungeonBattle" });
  expect(a).toEqual(send(terminal("victory"), { type: "finishDungeonBattle" }));
  expect(s).toEqual(before);
  expect(a.battle).toBeUndefined();
  expect(a.dungeon!.gold).toBe(20);
  expect(a.dungeon!.rooms.find((r) => r.id === "D")!.cleared).toBe(true);
  expect(a.dungeon!.roomCards!.discard).toEqual(["room:p001"]);
  expect(a.dungeon!.monsterPool!.remaining).toHaveLength(42);
  expect(new Set(a.dungeon!.monsterPool!.remaining).size).toBe(42);
  expect(a.dungeon!.cursor).toBe(s.battle!.rngCursor + 41);
  expect(a.dungeon!.heroes[0]!.combat!.wounds).toBe(1);
  expect(a.dungeon!.explorationSetup!.provisions).toEqual(s.battle!.provisions);
  expect(a.dungeon!.lootPool!.available).toHaveLength(10);
  expect(applyCommand(a, { type: "finishDungeonBattle" }).state).toBe(a);
});
it("战斗回传后休息同步地图英雄与战斗记录，不重置牌池或RNG", () => {
  const won = send(terminal("victory"), { type: "finishDungeonBattle" });
  // 原守卫夹具为测试20金币改了D代币；恢复Scout Ahead的真实种子构成。
  const original = createDungeonSandbox(goodSeed, layout, distribution).dungeon!.rooms;
  let s: GameState = {
    ...won,
    dungeon: {
      ...won.dungeon!,
      rooms: won.dungeon!.rooms.map((r) => ({
        ...r,
        kind: original.find((o) => o.id === r.id)!.kind,
      })),
    },
  };
  s = send(s, { type: "restDungeon" });
  const pick = (optionId: string) => {
    s = send(s, { type: "resolveChoice", choiceId: s.dungeon!.pending!.id, optionId });
  };
  pick("equal");
  for (let i = 0; i < 4; i++) {
    pick(`heal:${i}`);
    pick(`stress:${i}`);
  }
  expect(
    s.dungeon!.heroes.every(
      (h) => h.wounds === 0 && h.stress === 0 && h.combat!.wounds === 0 && h.combat!.stress === 0,
    ),
  ).toBe(true);
  expect(s.dungeon!.cursor).toBe(won.dungeon!.cursor);
  expect(s.dungeon!.monsterPool).toEqual(won.dungeon!.monsterPool);
  expect(s.dungeon!.gold).toBe(20);
});
it.each(["victory", "retreat"] as const)(
  "Wipe ‘Em Out真实部署的%s回传 → 离开 → 仅胜利巢穴计1XP",
  (outcome) => {
    const t = terminal(outcome);
    const generated = createDungeonSandbox(
      goodSeed,
      layout,
      wipeDistribution,
      "radiant",
      "D",
    ).dungeon!;
    const originalKind = generated.rooms.find((r) => r.id === "D")!.kind;
    const donor = generated.rooms.find((r) => r.kind === "lair")!.id;
    let s: GameState = {
      ...t,
      dungeon: {
        ...t.dungeon!,
        questDistribution: generated.questDistribution!,
        rest: generated.rest!,
        rooms: generated.rooms.map((r) =>
          r.id === "D"
            ? { ...r, kind: "lair", revealed: true }
            : r.id === donor && originalKind !== "lair"
              ? { ...r, kind: originalKind }
              : r,
        ),
      },
    };
    s = send(s, { type: "finishDungeonBattle" });
    expect(s.dungeon!.gold).toBe(0);
    s = send(s, { type: "leaveDungeon" });
    s = send(s, { type: "resolveChoice", choiceId: s.dungeon!.pending!.id, optionId: "agree" });
    s = send(s, { type: "summarizeDungeonQuest" });
    expect(s.dungeon!.questSummary).toMatchObject({
      questId: "quest:p002",
      xpPerHero: outcome === "victory" ? 1 : 0,
    });
    expect(s.dungeon!.questSummary!.clearedRoomIds).toEqual(outcome === "victory" ? ["D"] : []);
  },
);
it.each([
  ["victory", "lair", 10],
  ["retreat", "lair", 0],
  ["victory", "treasure", 20],
] as const)("Fundraiser %s / %s 回传奖励%i金币，一次提交并同步战利品池", (outcome, kind, gold) => {
  const t = terminal(outcome);
  const generated = createDungeonSandbox(
    goodSeed,
    layout,
    fundraiserDistribution,
    "radiant",
    "D",
  ).dungeon!;
  const originalKind = generated.rooms.find((r) => r.id === "D")!.kind;
  const donor = generated.rooms.find((r) => r.kind === kind)!.id;
  const s: GameState = {
    ...t,
    dungeon: {
      ...t.dungeon!,
      questDistribution: generated.questDistribution!,
      rest: generated.rest!,
      rooms: generated.rooms.map((r) =>
        r.id === "D"
          ? { ...r, kind, revealed: true }
          : r.id === donor && originalKind !== kind
            ? { ...r, kind: originalKind }
            : r,
      ),
    },
  };
  const result = send(s, { type: "finishDungeonBattle" });
  expect(result.dungeon!.gold).toBe(gold);
  expect(result.dungeon!.lootPool!.gold).toBe(gold);
  expect(applyCommand(result, { type: "finishDungeonBattle" }).state).toBe(result);
  if (outcome === "victory" && kind === "lair") {
    let next = send(result, { type: "leaveDungeon" });
    next = send(next, {
      type: "resolveChoice",
      choiceId: next.dungeon!.pending!.id,
      optionId: "agree",
    });
    next = send(next, { type: "summarizeDungeonQuest" });
    next = send(next, {
      type: "resolveChoice",
      choiceId: next.dungeon!.pending!.id,
      optionId: "give:10",
    });
    expect(next.dungeon!.gold).toBe(0);
    expect(next.dungeon!.lootPool!.gold).toBe(0);
    expect(next.dungeon!.questSummary).toMatchObject({ donatedGold: 10, xpPerHero: 0 });
  }
});
it("Fundraiser终局任务构成错配原子拒绝，不先发10金币或回传RNG", () => {
  const t = terminal("victory");
  const bad = {
    ...t,
    dungeon: {
      ...t.dungeon!,
      questDistribution: { ...t.dungeon!.questDistribution!, questId: "quest:p003" },
    },
  };
  expect(applyCommand(bad, { type: "finishDungeonBattle" }).state).toBe(bad);
});
it("撤退不清房不发奖，须离开；保留弃房牌和洗回怪物的下一战牌序", () => {
  const a = send(terminal("retreat"), { type: "finishDungeonBattle" });
  expect(a.dungeon!.gold).toBe(0);
  expect(a.dungeon!.mustLeaveRoomId).toBe("D");
  expect(a.dungeon!.rooms.find((r) => r.id === "D")!.cleared).not.toBe(true);
  expect(applyCommand(a, { type: "scoutDungeon" }).state).toBe(a);
  expect(applyCommand(a, { type: "prepareDungeonBattle" }).state).toBe(a);
  expect(send(a, { type: "beginDungeonExploration" }).dungeon!.pending).toBeDefined();
});
it("R-068 mutualWipeout、待选择与损坏牌池不发战后奖励，回传原子拒绝", () => {
  const s = terminal("victory"),
    d = s.dungeon!,
    b = s.battle!;
  const invalid: GameState[] = [
    {
      ...s,
      battle: {
        ...b,
        encounter: {
          ...b.encounter!,
          turn: { type: "halted", reason: "mutualWipeout", monstersDefeated: true },
        },
      },
    },
    { ...s, dungeon: { ...d, monsterPool: { ...d.monsterPool!, remaining: [] } } },
    {
      ...s,
      battle: {
        ...b,
        pending: {
          type: "turnStartProvision",
          actorId: "hero-0",
          choice: { id: "wait", prompt: "wait", options: [] },
        },
      },
    },
  ];
  for (const bad of invalid)
    expect(applyCommand(bad, { type: "finishDungeonBattle" }).state).toBe(bad);
});

it("入场前拒绝缺英雄属性、错误装备、非配套房间与损坏牌池，不进入半场战斗", () => {
  const s = deploy(goodSeed),
    d = s.dungeon!;
  const badStates: GameState[] = [
    { ...s, dungeon: { ...d, heroes: d.heroes.slice(1) } },
    {
      ...s,
      dungeon: {
        ...d,
        heroes: d.heroes.map((h, i) =>
          i === 0
            ? { ...h, skillIds: ["hero_skill:p002", "hero_skill:p004", "hero_skill:p007"] }
            : h,
        ),
      },
    },
    { ...s, dungeon: { ...d, monsterPool: { ...d.monsterPool!, remaining: [] } } },
    {
      ...s,
      dungeon: {
        ...d,
        roomCards: { ...d.roomCards!, active: { ...d.roomCards!.active!, cardId: "room:p002" } },
      },
    },
  ];
  for (const bad of badStates)
    expect(applyCommand(bad, { type: "startDungeonBattle" }).state).toBe(bad);
});

it("正式房间入场拒绝尚未解析的效果行，基础字段齐全也不能静默跳过", () => {
  const s = deploy(goodSeed),
    d = s.dungeon!;
  const cardId = d.monsterPool!.active!.monsters[0]!.cardId;
  const unsupported = [{ type: "text" as const, text: "unsupported fixture effect" }];
  const bad: GameState = {
    ...s,
    dungeon: {
      ...d,
      battleCatalog: {
        ...d.battleCatalog!,
        monsters: d.battleCatalog!.monsters.map((m) =>
          m.id !== cardId
            ? m
            : {
                ...m,
                skills: m.skills.map((skill) => ({
                  ...skill,
                  effect_lines: [...skill.effect_lines, unsupported],
                  lines: [...skill.lines, unsupported],
                })),
              },
        ),
      },
    },
  };
  const result = applyCommand(bad, { type: "startDungeonBattle" });
  expect(result.state).toBe(bad);
  expect(result.events[0]!.message).toContain("完整效果尚未接入");
});

it.each([1885, 11])("种子 %i 完整四轮走通真实怪物选招 / 定位 / 攻击，战后回传", (seed) => {
  let s = send(send(deploy(seed), { type: "startDungeonBattle" }), { type: "startBattle" });
  let observedBlight = false;
  for (let i = 0; i < 300 && s.battle!.encounter!.turn.type !== "finished"; i++) {
    const b = s.battle!,
      turn = b.encounter!.turn;
    observedBlight ||= b.entities.some(
      (e) => e.side === "hero" && e.statusStacks?.some((stack) => stack.kind === "blight"),
    );
    if (b.pending) {
      s = send(s, {
        type: "resolveChoice",
        choiceId: b.pending.choice.id,
        optionId: b.pending.choice.options[0]!.id,
      });
    } else if (b.shuffleIntents.length) s = send(s, { type: "resolveShuffles" });
    else if (turn.type === "awaitingInitiative") s = send(s, { type: "drawInitiative" });
    else if (turn.type === "hero") {
      const actor = b.entities.find((e) => e.id === turn.actorId)!;
      s = send(s, {
        type: "changeStance",
        actorId: actor.id,
        direction: actor.stance === "aggressive" ? "backward" : "forward",
      });
    } else if (turn.type === "monster") {
      const action = b.monsterAction;
      s = send(
        s,
        !action
          ? { type: "prepareMonsterAction", actorId: turn.actorId }
          : !action.positioned
            ? { type: "moveMonsterToRange", actorId: turn.actorId }
            : {
                type: "playMonsterSkill",
                actorId: turn.actorId,
                targetId: action.targetId,
                skillSlot: action.skillSlot,
              },
      );
    } else throw new Error(`未完成停点：${JSON.stringify(turn)}`);
  }
  expect(s.battle!.encounter!.turn).toEqual({ type: "finished", outcome: "retreat" });
  expect(s.battle!.encounter!.round).toBe(4);
  expect(s.battle!.entities.filter((e) => e.side === "hero").some((e) => e.wounds > 1)).toBe(true);
  const result = send(s, { type: "finishDungeonBattle" });
  if (seed === 11) expect(observedBlight).toBe(true);
  expect(result.dungeon!.heroes.map((h) => h.combat?.statusStacks)).toEqual(
    s.battle!.entities.filter((e) => e.side === "hero").map((e) => e.statusStacks),
  );
  expect(result.dungeon!.gold).toBe(0);
  if (result.dungeon!.phase === "ready")
    expect(send(result, { type: "beginDungeonExploration" }).dungeon!.pending).toBeDefined();
  else expect(result.dungeon!.phase).toBe("awaitingReplacement");
});

it("完整九房牌池自然抽 Torture 时可入场，禁疗只落在 H（R-067）", () => {
  let entered: ReturnType<typeof applyCommand> | undefined;
  for (let seed = 1; seed <= 100; seed++) {
    const s = deploy(seed);
    if (s.dungeon!.roomCards!.active!.cardId !== "room:p002") continue;
    const result = applyCommand(s, { type: "startDungeonBattle" });
    if (result.state.battle) {
      entered = result;
      break;
    }
  }
  expect(entered).toBeDefined();
  expect(entered!.state.battle!.roomName).toBe("Torture Chamber");
  expect(entered!.state.battle!.areas.filter((a) => a.healingForbidden).map((a) => a.id)).toEqual([
    "H",
  ]);
  expect(
    entered!.state.battle!.entities.filter((e) => e.side === "hero").map((e) => e.areaId),
  ).toEqual(["H", "H", "H", "H"]);
});

it("Curio 撤退必须先离房，返回重掷守卫，不复用旧结果（R15、R25）", () => {
  const finished = terminal("retreat");
  const state: GameState = {
    ...finished,
    dungeon: {
      ...finished.dungeon!,
      curio: {
        cards: curioFileSchema.parse(rawCurios).cards,
        deck: null,
        discard: [],
        active: null,
      },
      curioRoom: { roomId: "D", guardRoll: 3, stage: "guarded" },
      visited: ["G", "D"],
      traversedCorridors: [["G", "D"]],
      rooms: finished.dungeon!.rooms.map((r) =>
        r.id === "D"
          ? { ...r, kind: "curio" }
          : r.id === "G"
            ? { ...r, cleared: true, revealed: true }
            : r,
      ),
    },
  };
  let returned = send(state, { type: "finishDungeonBattle" });
  expect(returned.dungeon!.curioRoom).toBeUndefined();
  expect(applyCommand(returned, { type: "resolveDungeonRoom" }).state).toBe(returned);
  for (const id of ["G", "D"]) {
    returned = send(returned, { type: "beginDungeonBacktrack" });
    returned = send(returned, {
      type: "resolveChoice",
      choiceId: returned.dungeon!.pending!.id,
      optionId: id,
    });
  }
  expect(returned.dungeon!.phase).toBe("awaitingRoom");
  const cursor = returned.dungeon!.cursor;
  const result = applyCommand(returned, { type: "resolveDungeonRoom" });
  expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
  expect(result.state.dungeon!.cursor).toBe(cursor + 1);
  expect(result.state.dungeon!.curioRoom!.guardRoll).toBe(nextBattleRoll(state.seed, cursor));
  expect(applyCommand(result.state, { type: "resolveDungeonRoom" }).state).toBe(result.state);
});

it("完整九房/42怪池seed2自然Invocation部署，不过滤牌池；仅I4两种特殊效果", () => {
  const entered = applyCommand(deploy(2), { type: "startDungeonBattle" });
  expect(entered.state.battle, JSON.stringify(entered.events)).toBeDefined();
  expect(entered.state.battle!.roomName).toBe("Invocation Chamber");
  expect(
    entered.state.battle!.areas.filter((a) => a.invokerGoal && a.invokingAbyss).map((a) => a.id),
  ).toEqual(["I4"]);
  expect(
    entered.state.battle!.entities.filter((e) => e.side === "hero").map((e) => e.areaId),
  ).toEqual(["I9", "I9", "I10", "I10"]);
});

it("完整饰品池真实入场携带；获得后战斗回传同一池，下一房间不重建抽过的饰品", () => {
  const s = terminal("victory"),
    b = s.battle!;
  expect(b.trinkets).toEqual(s.dungeon!.trinkets);
  const heroes = b.entities
    .filter((e) => e.side === "hero")
    .map((e) => ({ id: e.id, level: e.heroLevel!, dead: e.dead }));
  const draw = drawTrinket(b.trinkets!, heroes, "hero-0", s.seed, b.rngCursor);
  if (draw.status !== "resolved") throw new Error(draw.reason);
  const chosen = chooseTrinket(draw.pool, heroes, "discard-new");
  if (chosen.status !== "resolved") throw new Error(chosen.reason);
  // 交接边界夹具：使用公开获得原语产生的真实牌池，不冒充完整任务命令。
  const boundary = { ...s, battle: { ...b, trinkets: chosen.pool, rngCursor: draw.cursor } };
  const returned = applyCommand(boundary, { type: "finishDungeonBattle" });
  expect(returned.state.dungeon!.trinkets).toEqual(chosen.pool);
  expect(returned.state.dungeon!.trinkets!.deck).toHaveLength(13);
  expect(returned.state.dungeon!.trinkets!.discard).toEqual([draw.pool.incoming!.cardId]);
  expect(applyCommand(returned.state, { type: "finishDungeonBattle" }).state).toBe(returned.state);
});
