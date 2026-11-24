import { afterEach, expect, it } from "vitest";
import { clearBossScriptsForTest, getBossScript } from "../../../src/core/bosses/registry";
import { runBossHook } from "../../../src/core/bosses/hooks";
import { ensureCampaignBossScriptsRegistered } from "../../../src/shared/core/registry";
import { resolveScriptIdForDescriptionCard } from "../../../src/core/bosses/threat-description-catalog";
import { caretakerBuilding } from "../../../src/shared/hamlet/hamlet-event";
import { statusProjection, type StatusStack } from "../../../src/shared/core/status";
import {
  POUNDER_I_SCRIPT_ID,
  ensurePounderIBossScriptRegistered,
  pounderIBossScript,
} from "../../../src/weald/bosses/pounder-i";
import {
  resolvePounderIBombardment,
  resolvePounderIRangedEntry,
} from "../../../src/weald/bosses/pounder-i-threat";

afterEach(() => clearBossScriptsForTest());

it("显式注册幂等、真实卡引用一致，正式出征和增援明确hold", () => {
  ensurePounderIBossScriptRegistered();
  ensurePounderIBossScriptRegistered();
  expect(getBossScript(POUNDER_I_SCRIPT_ID)).toBe(pounderIBossScript);
  expect(pounderIBossScript.combatEntry).toEqual({
    descriptionAbilityCardId: "boss_ability:weald:p007",
    combatAbilityCardId: "boss_ability:weald:p010",
    combatMonsterCardId: "monster_medium:weald:p020",
    printedInitiativeCards: 1,
    printedActionsPerRound: 1,
  });
  expect(
    runBossHook(pounderIBossScript, "summon", { scriptId: POUNDER_I_SCRIPT_ID, skillSlot: 1 })
      .status,
  ).toBe("stub");
  expect(
    runBossHook(pounderIBossScript, "threatPassiveDungeon", {
      scriptId: POUNDER_I_SCRIPT_ID,
      side: "dungeon",
    }),
  ).toMatchObject({
    effect: "buffRiposteOnMonsterRangedEntry",
    buffTurns: 2,
    riposteTurns: 1,
  });
  expect(
    runBossHook(pounderIBossScript, "threatPassiveHamlet", {
      scriptId: POUNDER_I_SCRIPT_ID,
      side: "hamlet",
    }),
  ).toMatchObject({
    effect: "bombardmentAtHamletDayEnd",
    damage: 5,
    caretakerPreventsAll: true,
  });
});

it("自动注册不解锁Pounder，旧地点来源仍停在未注册边界", () => {
  clearBossScriptsForTest();
  ensureCampaignBossScriptsRegistered(["core", "weald"]);
  expect(getBossScript(POUNDER_I_SCRIPT_ID)).toBeUndefined();
  expect(
    resolveScriptIdForDescriptionCard("boss_ability:weald:p007", ["core", "weald"]),
  ).toBeUndefined();
});

it("进入Ranged新增独立状态堆，停留不刷新，离开再进入重新触发", () => {
  const input = {
    side: "monster" as const,
    dead: false,
    previousStance: "defensive" as const,
    stance: "ranged" as const,
    statusStacks: [{ kind: "buff", remaining: 1 }] as readonly StatusStack[],
  };
  const before = structuredClone(input);
  const first = resolvePounderIRangedEntry(input);
  expect(first.status).toBe("resolved");
  if (first.status !== "resolved") throw new Error(first.reason);
  expect(first.stacks).toEqual([
    { kind: "buff", remaining: 1 },
    { kind: "buff", remaining: 2 },
    { kind: "riposte", remaining: 1 },
  ]);
  expect(statusProjection(first.stacks)).toMatchObject({ buffStacks: 2, riposte: true });
  const stay = resolvePounderIRangedEntry({
    ...input,
    previousStance: "ranged",
    statusStacks: first.stacks,
  });
  expect(stay).toEqual(first);
  const reenter = resolvePounderIRangedEntry({ ...input, statusStacks: first.stacks });
  expect(reenter.status === "resolved" && reenter.stacks.length).toBe(5);
  expect(input).toEqual(before);
});

it.each(["hero", "dead", "leave"])("%s 不触发Ranged进入威胁", (kind) => {
  const stacks: StatusStack[] = [];
  const result = resolvePounderIRangedEntry({
    side: kind === "hero" ? "hero" : "monster",
    dead: kind === "dead",
    previousStance: kind === "leave" ? "ranged" : "defensive",
    stance: kind === "leave" ? "support" : "ranged",
    statusStacks: stacks,
  });
  expect(result.status === "resolved" && result.stacks).toBe(stacks);
});

it("无效状态堆原子拒绝，不将损坏状态重置为空", () => {
  expect(
    resolvePounderIRangedEntry({
      side: "monster",
      dead: false,
      previousStance: "support",
      stance: "ranged",
      statusStacks: [{ kind: "buff", remaining: 0 }],
    }).status,
  ).toBe("refused");
});

const buildings = () => {
  const empty = { level: 3 as 1 | 2 | 3, heroId: null as string | null };
  return {
    survivalist: { ...empty },
    tavern: { ...empty },
    sanitarium: { ...empty },
    abbey: { ...empty },
    graveyard: { ...empty },
    guild: { ...empty },
    blacksmith: { ...empty },
    nomadWagon: { ...empty },
  };
};

it("d10每个结果对应原建筑表，空建筑只降一级；输入不变", () => {
  const targets = buildings();
  const before = structuredClone(targets);
  for (let roll = 1; roll <= 10; roll++)
    expect(resolvePounderIBombardment(roll, null, targets)).toEqual({
      effect: "downgradeBuilding",
      building: caretakerBuilding(roll),
      level: 2,
    });
  expect(targets).toEqual(before);
});

it("有英雄时计划伤害而非降级，Caretaker同处优先且不重掷", () => {
  const targets = buildings(),
    building = caretakerBuilding(1)!;
  targets[building] = { level: 3, heroId: "hero-1" };
  expect(resolvePounderIBombardment(1, null, targets)).toEqual({
    effect: "damageHero",
    building,
    heroId: "hero-1",
    damage: 5,
  });
  expect(resolvePounderIBombardment(1, building, targets)).toEqual({
    effect: "none",
    building,
    reason: "caretaker",
  });
});

it("I级建筑不再降级，II级降为I级；非法骰子和缺失占用拒绝", () => {
  const targets = buildings(),
    building = caretakerBuilding(1)!;
  expect(
    resolvePounderIBombardment(1, null, { ...targets, [building]: { level: 1, heroId: null } }),
  ).toEqual({ effect: "none", building, reason: "minimumLevel" });
  expect(
    resolvePounderIBombardment(1, null, { ...targets, [building]: { level: 2, heroId: null } }),
  ).toEqual({ effect: "downgradeBuilding", building, level: 1 });
  for (const roll of [0, 11, 1.5, NaN])
    expect(() => resolvePounderIBombardment(roll, null, targets)).toThrow();
  // @ts-expect-error 负向校验：故意缺失运行时建筑记录。
  expect(() => resolvePounderIBombardment(1, null, {})).toThrow();
});
