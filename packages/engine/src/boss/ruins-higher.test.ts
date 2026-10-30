import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createBattleState, type BattleEntity, type BattleSetup } from "../battle";
import { applyCommand, type ApplyResult, type Command, type GameState } from "../command";
import type { MonsterCardView } from "../monster-skill";
import { nextBattleRoll } from "../battle-roll";
import { createLootState } from "../loot";
import { RUINS_COMBAT_LEVELS } from "./ruins-combat-levels";
import { ensureCoreBossScriptsRegistered } from "./ensure-core-boss-scripts";
import { getBossScript } from "./registry";
import { resolveScriptIdForDescriptionCard } from "./threat-description-catalog";
import { resolveBossScriptIdForQuest } from "./quest-bridge";
import { PROPHET_ROOM_D10_MARKERS } from "./prophet-i";
import { selectMonsterSkill } from "../monster-stance";
import { applyNecromancerIIIReanimation } from "./necromancer-iii-reanimation";
import { removeCasualties, endAfterCasualties } from "../encounter";
import { applyHigherRuinsBattleSpawn } from "./higher-ruins-threat";

function cards<T>(file: string): T[] {
  return JSON.parse(
    readFileSync(new URL(`../../../data/normalized/corebox/${file}.json`, import.meta.url), "utf8"),
  ).cards;
}
const monsters = [
  ...cards<MonsterCardView>("monster_medium"),
  ...cards<MonsterCardView>("monster_large"),
].filter((c) => c.skills);
const profiles = cards<NonNullable<BattleSetup["heroStats"]>[number]>("hero_stat");
const stances = ["aggressive", "defensive", "ranged", "support"] as const;
const rows = Object.values(RUINS_COMBAT_LEVELS)
  .flat()
  .filter((r) => !r.script.endsWith(":1"));
function ok(state: GameState, command: Command): ApplyResult {
  const result = applyCommand(state, command);
  expect(
    result.events.filter((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toEqual([]);
  return result;
}
function fixture(script: string): GameState {
  ensureCoreBossScriptsRegistered();
  const row = Object.values(RUINS_COMBAT_LEVELS)
    .flat()
    .find((r) => r.script === script)!;
  const boss = monsters.find((c) => c.id === row.card)!;
  const stat = profiles.find((s) => s.name === "CRUSADER" && s.level === 1)!;
  const entities: BattleEntity[] = stances.map((stance, i) => ({
    id: `h${i}`,
    side: "hero",
    hero: stat.name,
    heroStatId: stat.id,
    life: stat.life,
    areaId: "a",
    stance,
    skillIds: [],
    wounds: 0,
    stress: 0,
    dodge: 0,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  }));
  entities.push({
    id: "boss",
    side: "monster",
    hero: null,
    monsterCardId: boss.id,
    life: boss.life,
    areaId: "a",
    stance: "aggressive",
    stanceSlots: boss.type_position_tags?.includes("Large") ? 2 : 1,
    skillIds: [],
    wounds: 0,
    dodge: 0,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
    shuffleResist: boss.resistances?.some((r) => r.key === "shuffle_resist") ?? false,
  });
  const base = createBattleState(7, {
    entities,
    monsters,
    heroStats: profiles,
    skills: [],
    light: 5,
    areas: ["a", "b", "c", "d"].map((id, i, all) => ({
      id,
      adjacent: all.filter((_, n) => Math.abs(n - i) === 1),
      capacity: 20,
      elevation: "normal",
    })),
    prophetRoomD10AreaTable: PROPHET_ROOM_D10_MARKERS.map((marker) => ({ marker, areaId: "a" })),
    collectorRoomLootAreaId: "b",
    collectorCollectedStanceAreas: { defensive: "a", ranged: "a", support: "a" },
    monsterStanceAreas: { aggressive: "a", defensive: "a", ranged: "a", support: "a" },
    lootPool: createLootState(),
  });
  return {
    ...base,
    dungeon: {
      phase: "inBattle",
      heroes: [],
      cursor: 0,
      campaignLevel: Number(script.at(-1)),
      activeBossThreatScriptId: script,
      imminentThreatDescriptionCardId: row.description,
      questDistribution: { questId: "quest:p019" },
    } as unknown as NonNullable<GameState["dungeon"]>,
  };
}
function turn(state: GameState, id = "boss"): GameState {
  return {
    ...state,
    battle: {
      ...state.battle!,
      monsterAction: null,
      encounter: { ...state.battle!.encounter!, turn: { type: "monster", actorId: id } },
    },
  };
}
function settle(result: ApplyResult): ApplyResult {
  for (let i = 0; i < 20; i++) {
    if (result.pendingChoice)
      result = ok(JSON.parse(JSON.stringify(result.state)), {
        type: "resolveChoice",
        choiceId: result.pendingChoice.id,
        optionId: result.pendingChoice.options[0]!.id,
      });
    else if (result.state.battle!.shuffleIntents.length)
      result = ok(result.state, { type: "resolveShuffles" });
    else return result;
  }
  throw new Error("未完成续接");
}
function play(state: GameState, actorId = "boss") {
  const moved = settle(ok(state, { type: "moveMonsterToRange", actorId }));
  const action = moved.state.battle!.monsterAction!;
  return settle(
    ok(moved.state, {
      type: "playMonsterSkill",
      actorId,
      targetId: action.targetId,
      skillSlot: action.skillSlot,
    }),
  );
}

it.each(rows)("$script：独立卡面、完整选招与严格同级出征匹配", (row) => {
  ensureCoreBossScriptsRegistered();
  expect(resolveScriptIdForDescriptionCard(row.description)).toBe(row.script);
  expect(getBossScript(row.script)?.combatEntry?.combatMonsterCardId).toBe(row.card);
  const level = Number(row.script.at(-1)) as 2 | 3;
  expect(
    resolveBossScriptIdForQuest("quest:p019", {
      campaignLevel: level,
      activeBossThreatScriptId: row.script,
      imminentThreatDescriptionCardId: row.description,
    }),
  ).toBe(row.script);
  expect(
    resolveBossScriptIdForQuest("quest:p019", {
      campaignLevel: level,
      activeBossThreatScriptId: row.script,
    }),
  ).toBeUndefined();
  expect(
    resolveBossScriptIdForQuest("quest:p019", {
      campaignLevel: level === 2 ? 3 : 2,
      activeBossThreatScriptId: row.script,
      imminentThreatDescriptionCardId: row.description,
    }),
  ).toBeUndefined();
  const card = monsters.find((c) => c.id === row.card)!;
  for (const stance of stances)
    for (let roll = 1; roll <= 10; roll++) {
      const skillSlot = row.script.includes("necromancer")
        ? roll <= 3
          ? 1
          : roll <= 6
            ? 2
            : 3
        : row.script.includes("fanatic")
          ? roll <= 2
            ? 1
            : roll <= 6
              ? 2
              : 3
          : roll <= 5
            ? 1
            : 2;
      expect(selectMonsterSkill(card, [stance], roll)).toMatchObject({
        status: "selected",
        skillSlot,
      });
    }
});

describe.each([2, 3] as const)("Ruins 等级 %i 真实卡面机制夹具（非正式房间几何）", (level) => {
  it("先知：三先攻、首行动四骰布置、第二行动攻击、第三行动逐区域 Rubble", () => {
    const started = ok(fixture(`boss:ruins:prophet:${level}`), { type: "startBattle" });
    expect(started.state.battle!.encounter!.deck.filter((s) => s === "monster")).toHaveLength(3);
    const first = ok(turn(started.state), { type: "prepareMonsterAction", actorId: "boss" });
    expect(first.state.battle!.woodenPews).toHaveLength(4);
    expect(first.state.battle!.rngCursor).toBe(started.state.battle!.rngCursor + 4);
    const second = ok(turn(first.state), { type: "prepareMonsterAction", actorId: "boss" });
    expect(second.state.battle!.monsterAction?.skillSlot).toBeLessThanOrEqual(2);
    expect(play(second.state).state.battle!.prophetActionsThisRound).toBe(2);
    const base = turn(first.state);
    const third = ok(
      {
        ...base,
        battle: {
          ...base.battle!,
          prophetActionsThisRound: 2,
          woodenPews: [{ pewIndex: 0, areaId: "a" }],
        },
      },
      { type: "prepareMonsterAction", actorId: "boss" },
    );
    expect(third.state.battle!.prophetActionsThisRound).toBe(3);
    expect(third.events.some((e) => e.type === "monsterSkillTargetsResolved")).toBe(true);
  });
  it("收藏家：三召唤物真实生命/闪避，Vestal 按 Most Wounded 治疗怪物且不掷攻击骰", () => {
    const started = ok(fixture(`boss:ruins:collector:${level}`), { type: "startBattle" });
    expect(started.state.battle!.encounter!.deck.filter((s) => s === "monster")).toHaveLength(1);
    const entered = turn(started.state);
    const ready = {
      ...entered,
      battle: {
        ...entered.battle!,
        encounter: {
          ...entered.battle!.encounter!,
          deck: entered.battle!.encounter!.deck.filter((s) => s !== "monster"),
        },
      },
    };
    const summoned = settle(ok(ready, { type: "prepareMonsterAction", actorId: "boss" }));
    expect(summoned.state.battle!.encounter!.deck.filter((s) => s === "monster")).toHaveLength(3);
    expect(summoned.state.battle!.rngCursor).toBe(ready.battle.rngCursor + 3);
    const allies = summoned.state.battle!.entities.filter(
      (e) => e.side === "monster" && e.id !== "boss",
    );
    expect(allies.map((e) => e.life)).toEqual(level === 2 ? [16, 15, 14] : [22, 21, 20]);
    expect(allies.map((e) => e.dodge)).toEqual([level, level, level]);
    const vestal = allies.find(
      (e) => e.monsterCardId === (level === 2 ? "monster_medium:p102" : "monster_medium:p103"),
    )!;
    const base = turn(summoned.state, vestal.id);
    const wounded = {
      ...base,
      battle: {
        ...base.battle!,
        entities: base.battle!.entities.map((e) => (e.id === "boss" ? { ...e, wounds: 20 } : e)),
      },
    };
    const prepared = ok(wounded, { type: "prepareMonsterAction", actorId: vestal.id });
    expect(prepared.state.battle!.monsterAction?.targetId).toBe("boss");
    const healed = play(prepared.state, vestal.id);
    expect(healed.state.battle!.entities.find((e) => e.id === "boss")?.wounds).toBe(
      level === 2 ? 11 : 9,
    );
    expect(healed.state.battle!.rngCursor).toBe(wounded.battle.rngCursor);
    expect(healed.state.battle!.entities.find((e) => e.id === "boss")?.buffStacks).toBe(1);
  });
  it.each([1, 2])("收藏家 slot %i：主卡攻击与生命窃取；自身治疗多目标只执行一次", (slot) => {
    const started = ok(fixture(`boss:ruins:collector:${level}`), { type: "startBattle" });
    const spawned = settle(
      ok(turn(started.state), { type: "prepareMonsterAction", actorId: "boss" }),
    );
    const base = turn(spawned.state);
    let cursor = base.battle!.rngCursor;
    while ((nextBattleRoll(7, cursor) <= 5 ? 1 : 2) !== slot || nextBattleRoll(7, cursor + 1) !== 5)
      cursor++;
    const state = {
      ...base,
      battle: {
        ...base.battle!,
        rngCursor: cursor,
        entities: base.battle!.entities.map((e) => (e.id === "boss" ? { ...e, wounds: 30 } : e)),
      },
    };
    const prepared = ok(state, { type: "prepareMonsterAction", actorId: "boss" });
    const done = play(prepared.state);
    expect(done.state.battle!.entities.find((e) => e.id === "boss")!.wounds).toBe(
      slot === 1 ? 30 : level === 2 ? 16 : 12,
    );
    expect(
      done.state.battle!.entities.filter((e) => e.side === "hero" && e.wounds > 0),
    ).toHaveLength(2);
  });
  it.each(["highwayman", "manAtArms"] as const)(
    "Collected %s：真实攻击与完整效果可结算",
    (part) => {
      const started = ok(fixture(`boss:ruins:collector:${level}`), { type: "startBattle" });
      const spawned = settle(
        ok(turn(started.state), { type: "prepareMonsterAction", actorId: "boss" }),
      );
      const row = RUINS_COMBAT_LEVELS.collector[level - 1]!;
      const ally = spawned.state.battle!.entities.find(
        (e) => e.monsterCardId === row.collected[part],
      )!;
      const initial = turn(spawned.state, ally.id);
      const base = {
        ...initial,
        battle: {
          ...initial.battle!,
          entities: initial.battle!.entities.map((e) =>
            e.id === ally.id && part === "highwayman" ? { ...e, areaId: "b" } : e,
          ),
        },
      };
      let cursor = base.battle!.rngCursor;
      while (nextBattleRoll(7, cursor) !== 5) cursor++;
      const prepared = ok(
        { ...base, battle: { ...base.battle!, rngCursor: cursor } },
        { type: "prepareMonsterAction", actorId: ally.id },
      );
      const done = play(prepared.state, ally.id);
      expect(done.state.battle!.entities.find((e) => e.id === "h0")!.wounds).toBe(
        part === "highwayman" ? (level === 2 ? 11 : 15) : level === 2 ? 7 : 9,
      );
    },
  );
  it.each([1, 2, 3])("狂信者：同级 Pyre 开战与三招 slot %i 公开命令", (slot) => {
    const initial = fixture(`boss:ruins:fanatic:${level}`);
    const started = ok(initial, { type: "startBattle" });
    const b = started.state.battle!;
    expect(
      b.entities.some(
        (e) => e.monsterCardId === (level === 2 ? "monster_large:p012" : "monster_large:p013"),
      ),
    ).toBe(true);
    expect(b.entities.filter((e) => e.side === "hero").every((e) => e.markStacks === 1)).toBe(true);
    let cursor = b.rngCursor;
    while ((nextBattleRoll(7, cursor) <= 2 ? 1 : nextBattleRoll(7, cursor) <= 6 ? 2 : 3) !== slot)
      cursor++;
    const base = turn(started.state);
    const ready = {
      ...base,
      battle: {
        ...base.battle!,
        rngCursor: cursor,
        entities: b.entities.map((e) =>
          e.id !== "boss" && e.side === "monster" ? { ...e, dead: true } : e,
        ),
      },
    };
    const before = structuredClone(ready);
    const prepared = ok(ready, { type: "prepareMonsterAction", actorId: "boss" });
    expect(prepared.state.battle!.monsterAction?.skillSlot).toBe(slot);
    const done = play(prepared.state);
    expect(ready).toEqual(before);
    expect(done.state.battle!.fanaticActionsThisRound).toBe(1);
    expect(done.state.battle!.entities.some((e) => e.side === "hero" && e.wounds > 0)).toBe(true);
  });
});

it.each(rows)("$script：规则书 R38–39 的本体死亡收尾接共用死亡入口", (row) => {
  const started = ok(fixture(row.script), { type: "startBattle" });
  const base = {
    ...started,
    state: {
      ...started.state,
      battle: {
        ...started.state.battle!,
        entities: started.state.battle!.entities.map((e) =>
          e.id === "boss" ? { ...e, wounds: e.life!, dead: true } : e,
        ),
      },
    },
  };
  const removed = removeCasualties(base, ["boss"]);
  expect(
    removed.state.battle!.entities.filter((e) => e.side === "monster").every((e) => e.dead),
  ).toBe(true);
  expect(endAfterCasualties(removed)?.state.battle?.encounter?.turn).toMatchObject({
    type: "finished",
    outcome: "victory",
  });
});

it("先知 III：每只新生成的 Unholy 分别触发；心脏病死亡走共用补位", () => {
  const started = ok(fixture("boss:ruins:prophet:3"), { type: "startBattle" });
  expect(
    started.state.battle!.entities.filter((e) => e.side === "hero").map((e) => e.stress),
  ).toEqual([1, 1, 1, 1]);
  const entity = started.state.battle!.entities.find((e) => e.id === "boss")!;
  const after = {
    state: {
      ...started.state,
      battle: {
        ...started.state.battle!,
        entities: [
          ...started.state.battle!.entities,
          {
            ...entity,
            id: "new-unholy",
            monsterCardId: "monster_medium:p001",
            stance: "ranged" as const,
            stanceSlots: 1 as const,
          },
        ],
      },
    },
    events: [],
  };
  const spawned = applyHigherRuinsBattleSpawn(started.state, after);
  expect(spawned.state.battle!.entities.find((e) => e.id === "h0")?.stress).toBe(2);
  const dying = {
    ...after,
    state: {
      ...after.state,
      battle: {
        ...after.state.battle!,
        entities: after.state.battle!.entities.map((e) =>
          e.id === "h0"
            ? { ...e, stress: 9, resolveTested: true, resolveCardId: "virtue_affliction:p001" }
            : e,
        ),
      },
    },
  };
  const dead = applyHigherRuinsBattleSpawn(started.state, dying);
  expect(dead.state.battle!.entities.find((e) => e.id === "h0")?.dead).toBe(true);
  expect(dead.state.battle!.entities.find((e) => e.id === "h1")?.stance).toBe("aggressive");
});

it("Reanimation：同卡清空伤口/条件，只有首次生效；JSON 续跑确定且满区忽略", () => {
  const started = ok(fixture("boss:ruins:necromancer:3"), { type: "startBattle" });
  const card = monsters.find((c) => c.id === "monster_medium:p013")!;
  const dead: BattleEntity = {
    ...started.state.battle!.entities.find((e) => e.id === "boss")!,
    id: "dead-spearman",
    monsterCardId: card.id,
    life: card.life,
    dead: true,
    wounds: card.life,
    stance: "defensive",
    stanceSlots: 1,
    statusStacks: [{ kind: "blight", amount: 2, remaining: 3 }],
  };
  const base: ApplyResult = {
    state: {
      ...started.state,
      battle: { ...started.state.battle!, entities: [...started.state.battle!.entities, dead] },
    },
    events: [],
  };
  const revived = applyNecromancerIIIReanimation(base, [dead]);
  expect(revived).toEqual(applyNecromancerIIIReanimation(JSON.parse(JSON.stringify(base)), [dead]));
  expect(revived.state.battle!.entities.at(-1)).toMatchObject({
    monsterCardId: card.id,
    life: 15,
    dead: false,
    wounds: 0,
    statusStacks: [],
  });
  expect(revived.state.battle!.rngCursor).toBe(base.state.battle!.rngCursor + 1);
  expect(applyNecromancerIIIReanimation(revived, [dead])).toBe(revived);
  const full = applyNecromancerIIIReanimation(
    {
      ...base,
      state: {
        ...base.state,
        battle: {
          ...base.state.battle!,
          areas: base.state.battle!.areas.map((a) => ({ ...a, capacity: 0 })),
        },
      },
    },
    [dead],
  );
  expect(full.state.battle!.entities).toHaveLength(base.state.battle!.entities.length);
  expect(full.state.battle!.reanimationUsed).toBe(true);
});

it.each([1, 2, 3])("Pyre %i：自动命中无攻击骰，Protection 减伤与死门沿普通生命路径", (level) => {
  const started = ok(fixture(`boss:ruins:fanatic:${level}`), { type: "startBattle" });
  const pyre = started.state.battle!.entities.find(
    (e) => e.monsterCardId === `monster_large:p0${10 + level}`,
  )!;
  const base = turn(started.state, pyre.id);
  const state = {
    ...base,
    battle: {
      ...base.battle!,
      entities: base.battle!.entities.map((e) =>
        e.id === "h0" ? { ...e, dodge: 99, protection: true } : e,
      ),
    },
  };
  const prepared = ok(state, { type: "prepareMonsterAction", actorId: pyre.id });
  const done = play(prepared.state, pyre.id);
  const damage = done.events.find((e) => e.type === "heroHealthResolved" && e.entityId === "h0");
  expect(damage).toMatchObject({ effect: { type: "wounds", amounts: [50] } });
  expect(done.state.battle!.rngCursor).toBe(state.battle.rngCursor);
  expect(done.state.battle!.entities.find((e) => e.id === "h0")?.dead).toBe(false);
  const atDoor = {
    ...state,
    battle: {
      ...state.battle,
      entities: state.battle.entities.map((e) => (e.id === "h0" ? { ...e, wounds: e.life! } : e)),
    },
  };
  const again = ok(atDoor, {
    type: "playMonsterSkill",
    actorId: pyre.id,
    targetId: "h0",
    skillSlot: 1,
  });
  expect(again.state.battle!.rngCursor).toBe(atDoor.battle.rngCursor + 1);
});
