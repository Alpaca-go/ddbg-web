import { expect, it } from "vitest";
import layout from "../../data/normalized/corebox/dungeon_layout_p001.json";
import distribution from "../../data/normalized/corebox/scout_ahead_distribution.json";
import rawCurios from "../../data/normalized/corebox/curio.json";
import stats from "../../data/normalized/corebox/hero_stat.json";
import { curioFileSchema } from "../../data/src/curio";
import { createDungeonSandbox } from "./dungeon";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import type { DungeonBattleCatalog } from "./dungeon";
import { normalizedHeroStatFileSchema } from "../../data/src/normalize/hero-stat";
import { nextProvisionFace, PROVISION_FACES } from "./loot";
import diseases from "../../data/normalized/corebox/disease.json";
import quirks from "../../data/normalized/corebox/quirk.json";
import { diseaseFileSchema } from "../../data/src/disease";
import { normalizedQuirkFileSchema } from "../../data/src/normalize/schema";
import { createConditionPool, conditionPoolProblem } from "./conditions";

const cards = curioFileSchema.parse(rawCurios).cards;
const approvedStats = normalizedHeroStatFileSchema
  .parse(stats)
  .cards.filter((c) => c.attributesVerified) as DungeonBattleCatalog["heroStats"];
const heroes = ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"].map((name, i) => {
  const stat = stats.cards.find((s) => s.name === name && s.level === 1)!;
  return {
    id: `h${i}`,
    stance: (["aggressive", "defensive", "ranged", "support"] as const)[i]!,
    stress: 0,
    level: stat.level,
    life: stat.life,
    wounds: 0,
    attributesVerified: true,
  };
});
const setup = (seed = 1237) =>
  createDungeonSandbox(
    seed,
    layout,
    distribution,
    "standard",
    "G",
    heroes,
    [],
    {
      dungeonLevel: 1,
      light: 5,
      provisions: ["tool", "tool", "tool", "tool", "torch", "food"].map((face, i) => ({
        id: `p${i}`,
        face: face as "tool" | "torch" | "food",
      })),
    },
    cards,
  );
const choose = (s: GameState, optionId: string) =>
  applyCommand(s, { type: "resolveChoice", choiceId: s.dungeon!.pending!.id, optionId });
function pending(seed = 1237) {
  const s = choose(applyCommand(setup(seed), { type: "beginDungeonExploration" }).state, "D").state;
  return choose(applyCommand(s, { type: "rollDungeonExploration" }).state, "h0:1").state;
}
function protectedPage(page: number) {
  const initial = pending(),
    d = initial.dungeon!;
  const id = `curio:p${String(page).padStart(3, "0")}`;
  const ordered = {
    ...initial,
    dungeon: {
      ...d,
      heroes: d.heroes.map((h, i) => ({
        ...h,
        heroStatId: approvedStats.find(
          (s) => s.level === 1 && s.name === ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"][i],
        )!.id,
      })),
      battleCatalog: { heroStats: approvedStats, skills: [], monsters: [] },
      conditions: createConditionPool(
        diseaseFileSchema.parse(diseases).cards,
        normalizedQuirkFileSchema.parse(quirks).cards,
      ),
      curio: {
        ...d.curio!,
        deck: [id, ...cards.map((c) => c.id).filter((cardId) => cardId !== id)],
      },
    },
  };
  return choose(ordered, "use:p4").state;
}
it("R-064 全池逐卡：抽前 Torch 后十八张可完成，其余明确接口停点且不漏发正面奖励", () => {
  const completed: number[] = [];
  for (let page = 1; page <= 24; page++) {
    const drawn = protectedPage(page);
    let result = applyCommand(drawn, { type: "resolveDungeonCurio" });
    const awardsProvision = [3, 8, 10, 15, 16, 20].includes(page);
    if (result.pendingChoice) result = choose(result.state, "food");
    const d = result.state.dungeon!;
    if (!d.curio!.active) {
      completed.push(page);
      expect(d.curio!.discard).toEqual([`curio:p${String(page).padStart(3, "0")}`]);
      expect(d.heroes.every((h) => h.stress === 0 && h.wounds === 0)).toBe(true);
      expect(d.exploration!.rolls![0]!.resolved).toBe(true);
      expect(applyCommand(result.state, { type: "resolveDungeonCurio" }).state).toBe(result.state);
    } else {
      expect(d.curio!.active!.blockedReason).toContain("接口尚未接线");
      expect(d.curio!.active!.blockedReason).not.toContain("Q-60");
      expect(d.gold).toBe(0);
      expect(d.heroes).toEqual(drawn.dungeon!.heroes);
      expect(d.exploration!.rolls![0]!.resolved).toBe(false);
    }
    expect(d.cursor).toBe(
      drawn.dungeon!.cursor + Number(awardsProvision) + ([6, 10, 11, 16].includes(page) ? 16 : 0),
    );
    expect(d.explorationSetup!.provisions).toHaveLength(5 + Number(awardsProvision));
  }
  expect(completed).toEqual([1, 2, 3, 4, 6, 8, 9, 10, 11, 13, 14, 15, 16, 17, 19, 20, 21, 23]);
});

it("真实 p6 / p11 正面怪癖只洗一次；第四张选择冻结、弃新卡或替换正面均一次续接", () => {
  for (const option of ["discard", "replace"] as const) {
    const drawn = protectedPage(6),
      d = drawn.dungeon!;
    const initial = {
      ...drawn,
      dungeon: {
        ...d,
        heroes: d.heroes.map((h, i) =>
          i ? h : { ...h, quirkIds: ["quirk:p001", "quirk:p018", "quirk:p019"] },
        ),
      },
    };
    const before = structuredClone(initial);
    const result = applyCommand(initial, { type: "resolveDungeonCurio" });
    const waiting = result.state;
    const incoming = waiting.dungeon!.conditions!.incomingQuirk!.cardId;
    expect(initial).toEqual(before);
    expect(waiting.dungeon!.cursor).toBe(d.cursor + 15); // 17 正面中 1 已持有，洗 16 张。
    expect(result.pendingChoice?.options.map((o) => o.id)).toEqual(["quirk:p001", incoming]);
    expect(waiting.dungeon!.curio!.discard).toEqual([]);
    expect(conditionPoolProblem(waiting.dungeon!.conditions!, waiting.dungeon!.heroes)).toBeNull();
    expect(applyCommand(waiting, { type: "resolveDungeonCurio" }).state).toBe(waiting);
    expect(choose(waiting, "quirk:p018").state).toBe(waiting);
    const done = choose(waiting, option === "discard" ? incoming : "quirk:p001").state;
    expect(done.dungeon!.cursor).toBe(waiting.dungeon!.cursor);
    expect(done.dungeon!.heroes[0]!.quirkIds).toEqual(
      option === "discard"
        ? ["quirk:p001", "quirk:p018", "quirk:p019"]
        : [incoming, "quirk:p018", "quirk:p019"],
    );
    expect(done.dungeon!.curio!.discard).toEqual(["curio:p006"]);
    expect(conditionPoolProblem(done.dungeon!.conditions!, done.dungeon!.heroes)).toBeNull();
    expect(applyCommand(done, { type: "resolveDungeonCurio" }).state).toBe(done);
    expect(choose(waiting, option === "discard" ? incoming : "quirk:p001").state).toEqual(done);
  }
  const initial = protectedPage(11);
  const first = applyCommand(initial, { type: "resolveDungeonCurio" }).state;
  expect(first.dungeon!.heroes[0]!.quirkIds).toHaveLength(1);
  expect(first.dungeon!.conditions!.positiveDeck).toHaveLength(16);
  expect(first.dungeon!.cursor).toBe(initial.dungeon!.cursor + 16);
});

it("单一怪癖缺资料 / 堆耗尽不付奖励、不弃 Curio；补齐后原牌续接", () => {
  const drawn = protectedPage(11),
    d = drawn.dungeon!;
  const { conditions: _conditions, ...withoutPool } = d;
  void _conditions;
  for (const initial of [
    { ...drawn, dungeon: withoutPool },
    {
      ...drawn,
      dungeon: {
        ...d,
        conditions: {
          ...d.conditions!,
          positiveDeck: [],
          quirkDiscard: d
            .conditions!.quirks.filter((q) => q.polarity === "positive")
            .map((q) => q.id),
        },
      },
    },
  ]) {
    const blocked = applyCommand(initial, { type: "resolveDungeonCurio" }).state;
    expect(blocked.dungeon!.curio!.active).not.toBeNull();
    expect(blocked.dungeon!.cursor).toBe(d.cursor);
    expect(blocked.dungeon!.heroes).toEqual(d.heroes);
    expect(blocked.dungeon!.curio!.discard).toEqual([]);
    const repaired = { ...blocked, dungeon: { ...blocked.dungeon!, conditions: d.conditions! } };
    expect(
      applyCommand(repaired, { type: "resolveDungeonCurio" }).state.dungeon!.curio!.active,
    ).toBeNull();
  }
});

it("p10：怪癖替换 → 补给 Wild 连续待选，保留已抽怪癖与骰；金币 / 弃牌最终提交一次", () => {
  for (const option of ["discard", "replace"] as const) {
    const drawn = protectedPage(10),
      d = drawn.dungeon!;
    const seed = Array.from({ length: 100 }, (_, i) => i).find(
      (s) => nextProvisionFace(s, d.cursor + 15) === "wild",
    )!;
    const initial = {
      ...drawn,
      seed,
      dungeon: {
        ...d,
        heroes: d.heroes.map((h, i) =>
          i ? h : { ...h, quirkIds: ["quirk:p001", "quirk:p018", "quirk:p019"] },
        ),
      },
    };
    const before = structuredClone(initial);
    const first = applyCommand(initial, { type: "resolveDungeonCurio" });
    expect(first.pendingChoice?.id).toContain("dungeon-condition:");
    expect(first.state.dungeon!.cursor).toBe(d.cursor + 15);
    expect(first.events.some((e) => e.type === "provisionRolled")).toBe(false);
    const incoming = first.state.dungeon!.conditions!.incomingQuirk!.cardId;
    const picked = choose(first.state, option === "discard" ? incoming : "quirk:p001");
    expect(picked.pendingChoice?.id).toContain("dungeon-curio-provision:");
    expect(picked.state.dungeon!.curio!.active).toMatchObject({
      positiveQuirkApplied: true,
      provisionFace: "wild",
    });
    expect(picked.state.dungeon!.cursor).toBe(d.cursor + 16);
    expect(picked.state.dungeon!.gold).toBe(0);
    expect(picked.state.dungeon!.curio!.discard).toEqual([]);
    expect(picked.state.dungeon!.explorationSetup!.provisions).toHaveLength(5);
    expect(
      conditionPoolProblem(picked.state.dungeon!.conditions!, picked.state.dungeon!.heroes),
    ).toBeNull();
    expect(applyCommand(picked.state, { type: "resolveDungeonCurio" }).state).toBe(picked.state);
    const done = choose(picked.state, "tool");
    expect(done.state.dungeon!.cursor).toBe(d.cursor + 16);
    expect(done.state.dungeon!.gold).toBe(5);
    expect(done.state.dungeon!.explorationSetup!.provisions).toHaveLength(6);
    expect(done.state.dungeon!.curio!.discard).toEqual(["curio:p010"]);
    expect(done.state.dungeon!.heroes[0]!.quirkIds).toEqual(
      option === "discard"
        ? ["quirk:p001", "quirk:p018", "quirk:p019"]
        : [incoming, "quirk:p018", "quirk:p019"],
    );
    expect(
      conditionPoolProblem(done.state.dungeon!.conditions!, done.state.dungeon!.heroes),
    ).toBeNull();
    expect(
      done.events.some((e) => e.type === "provisionRolled" || e.message.includes("抽到正面怪癖")),
    ).toBe(false);
    expect(choose(picked.state, "tool")).toEqual(done);
    expect(applyCommand(done.state, { type: "resolveDungeonCurio" }).state).toBe(done.state);
    expect(initial).toEqual(before);
  }
});

it("p10 / p16：补给已满或正面堆耗尽在抽怪癖前挡整卡，不先付金币或消耗 RNG", () => {
  for (const page of [10, 16]) {
    const drawn = protectedPage(page),
      d = drawn.dungeon!;
    for (const initial of [
      {
        ...drawn,
        dungeon: {
          ...d,
          explorationSetup: {
            ...d.explorationSetup!,
            provisions: Array.from({ length: 16 }, (_, i) => ({
              id: `full:${i}`,
              face: "food" as const,
            })),
          },
        },
      },
      {
        ...drawn,
        dungeon: {
          ...d,
          conditions: {
            ...d.conditions!,
            positiveDeck: [],
            quirkDiscard: d
              .conditions!.quirks.filter((q) => q.polarity === "positive")
              .map((q) => q.id),
          },
        },
      },
    ]) {
      const blocked = applyCommand(initial, { type: "resolveDungeonCurio" });
      expect(blocked.state.dungeon!.cursor).toBe(d.cursor);
      expect(blocked.state.dungeon!.gold).toBe(0);
      expect(blocked.state.dungeon!.heroes).toEqual(d.heroes);
      expect(blocked.state.dungeon!.conditions).toEqual(initial.dungeon.conditions);
      expect(blocked.state.dungeon!.curio!.discard).toEqual([]);
      expect(blocked.events.some((e) => e.type === "provisionRolled")).toBe(false);
    }
  }
});
it("Torch 不抑制 p2 的 Buff 2t；持有真实英雄防御时施加一次，缺资料时整卡不支付", () => {
  const drawn = protectedPage(2);
  const done = applyCommand(drawn, { type: "resolveDungeonCurio" }).state;
  expect(done.dungeon!.heroes[0]!.statusStacks).toEqual([{ kind: "buff", remaining: 2 }]);
  expect(done.dungeon!.heroes[1]!.statusStacks).toBeUndefined();
  const missing = {
    ...drawn,
    dungeon: { ...drawn.dungeon!, battleCatalog: { heroStats: [], skills: [], monsters: [] } },
  };
  const blocked = applyCommand(missing, { type: "resolveDungeonCurio" }).state;
  expect(blocked.dungeon!.curio!.active!.blockedReason).toContain("抗性 / 免疫");
  expect(blocked.dungeon!.heroes).toEqual(missing.dungeon!.heroes);
  expect(blocked.dungeon!.cursor).toBe(missing.dungeon!.cursor);
});

it("Curio 补给六面沿共享 RNG；Wild 待选冻结命令，不提前付金币，选择后只提交一次", () => {
  for (const face of [...PROVISION_FACES, "wild" as const]) {
    const original = protectedPage(8);
    const seed = Array.from({ length: 100 }, (_, i) => i).find(
      (seed) => nextProvisionFace(seed, original.dungeon!.cursor) === face,
    )!;
    const initial = { ...original, seed };
    const before = structuredClone(initial);
    let result = applyCommand(initial, { type: "resolveDungeonCurio" });
    expect(result.events).toContainEqual(
      expect.objectContaining({ type: "provisionRolled", face }),
    );
    expect(result.state.dungeon!.cursor).toBe(initial.dungeon!.cursor + 1);
    if (face === "wild") {
      const waiting = result.state;
      const choiceId = waiting.dungeon!.pending!.id;
      expect(result.pendingChoice?.actorId).toBe("h0");
      expect(result.pendingChoice?.options.map((o) => o.id)).toEqual(PROVISION_FACES);
      expect(waiting.dungeon!.gold).toBe(0);
      expect(waiting.dungeon!.curio!.discard).toEqual([]);
      expect(waiting.dungeon!.explorationSetup!.provisions).toHaveLength(5);
      for (const command of [
        { type: "resolveDungeonCurio" },
        { type: "ping" },
        { type: "useProvision", actorId: "h0", tokenId: "p5" },
        { type: "resolveChoice", choiceId: "stale", optionId: "food" },
        { type: "resolveChoice", choiceId, optionId: "wild" },
      ] as Command[]) {
        expect(applyCommand(waiting, command).state).toBe(waiting);
      }
      result = choose(waiting, "tool");
      expect(result.events.some((e) => e.type === "provisionRolled")).toBe(false);
      expect(applyCommand(waiting, { type: "resolveChoice", choiceId, optionId: "tool" })).toEqual(
        result,
      );
      expect(
        applyCommand(result.state, { type: "resolveChoice", choiceId, optionId: "tool" }).state,
      ).toBe(result.state);
    }
    const d = result.state.dungeon!;
    expect(initial).toEqual(before);
    expect(d.cursor).toBe(initial.dungeon!.cursor + 1);
    expect(d.gold).toBe(10);
    expect(d.curio!.discard).toEqual(["curio:p008"]);
    expect(d.exploration!.rolls![0]!.resolved).toBe(true);
    expect(d.explorationSetup!.provisions.at(-1)).toEqual({
      id: "curio-provision:curio:p008:h0:1",
      face: face === "wild" ? "tool" : face,
    });
    expect(applyCommand(result.state, { type: "resolveDungeonCurio" }).state).toBe(result.state);
  }
});

it("补给上限与损坏实例在掷骰前挡住整卡；修复后原牌续接，到 16 颗不溢出", () => {
  const original = protectedPage(8);
  const pool = (length: number) =>
    Array.from({ length }, (_, i) => ({ id: `full:${i}`, face: "food" as const }));
  for (const provisions of [pool(16), pool(17), [pool(1)[0]!, pool(1)[0]!]]) {
    const initial = {
      ...original,
      dungeon: {
        ...original.dungeon!,
        explorationSetup: { ...original.dungeon!.explorationSetup!, provisions },
      },
    };
    const result = applyCommand(initial, { type: "resolveDungeonCurio" });
    expect(result.state.dungeon!.curio!.active!.blockedReason).toContain("补给池");
    expect(result.state.dungeon!.cursor).toBe(initial.dungeon!.cursor);
    expect(result.state.dungeon!.gold).toBe(0);
    expect(result.state.dungeon!.curio!.discard).toEqual([]);
    expect(result.events.some((e) => e.type === "provisionRolled")).toBe(false);
    const repaired = {
      ...result.state,
      dungeon: {
        ...result.state.dungeon!,
        explorationSetup: { ...initial.dungeon.explorationSetup, provisions: pool(15) },
      },
    };
    let done = applyCommand(repaired, { type: "resolveDungeonCurio" });
    if (done.pendingChoice) done = choose(done.state, "food");
    expect(done.state.dungeon!.explorationSetup!.provisions).toHaveLength(16);
    expect(done.state.dungeon!.gold).toBe(10);
    expect(done.state.dungeon!.cursor).toBe(original.dungeon!.cursor + 1);
  }
});

it("正面普通奖励不绕过饰品复合或未用 Torch 的负面怪癖停点", () => {
  for (const page of [7, 24, 20]) {
    const drawn = protectedPage(page);
    const initial =
      page === 20
        ? {
            ...drawn,
            dungeon: {
              ...drawn.dungeon!,
              curio: {
                ...drawn.dungeon!.curio!,
                active: { ...drawn.dungeon!.curio!.active!, protected: false },
              },
            },
          }
        : drawn;
    const result = applyCommand(initial, { type: "resolveDungeonCurio" });
    expect(result.state.dungeon!.curio!.active!.blockedReason).toContain("接口尚未接线");
    expect(result.state.dungeon!.gold).toBe(0);
    expect(result.state.dungeon!.cursor).toBe(initial.dungeon!.cursor);
    expect(result.state.dungeon!.explorationSetup!.provisions).toEqual(
      initial.dungeon!.explorationSetup!.provisions,
    );
  }
});

it("真实种子 1237：全 24 张洗牌，Torch 在揭示前消费；Sarcophagus 只保留金币，随后八骰 → Empty；回放不变", () => {
  const initial = setup(),
    before = structuredClone(initial);
  const log: Command[] = [];
  let s = initial;
  const dispatch = (c: Command) => {
    log.push(c);
    s = applyCommand(s, c).state;
  };
  const pick = (id: string) =>
    dispatch({ type: "resolveChoice", choiceId: s.dungeon!.pending!.id, optionId: id });
  dispatch({ type: "beginDungeonExploration" });
  pick("D");
  dispatch({ type: "rollDungeonExploration" });
  pick("h0:1");
  expect(s.dungeon!.curio).toMatchObject({ deck: null, active: null, discard: [] });
  expect(s.dungeon!.cursor).toBe(15);
  pick("use:p4");
  expect(s.dungeon!.curio!.active).toMatchObject({
    cardId: "curio:p021",
    heroId: "h0",
    protected: true,
  });
  expect(s.dungeon!.curio!.deck).toHaveLength(23);
  expect(s.dungeon!.cursor).toBe(38);
  expect(s.dungeon!.explorationSetup!.provisions.some((p) => p.id === "p4")).toBe(false);
  expect(s.dungeon!.gold).toBe(0);
  dispatch({ type: "resolveDungeonCurio" });
  expect(s.dungeon!.gold).toBe(10);
  expect(s.dungeon!.curio).toMatchObject({ active: null, discard: ["curio:p021"] });
  while (s.dungeon!.pending)
    pick(
      s.dungeon!.pending!.options.find((o) => o.id.startsWith("use:"))?.id ??
        s.dungeon!.pending!.options[0]!.id,
    );
  expect(s.dungeon).toMatchObject({ position: "D", phase: "ready", cursor: 38, gold: 10 });
  expect(s.dungeon!.heroes[0]!.stress).toBe(0);
  expect(s.dungeon!.heroes[2]!.stress).toBe(2);
  expect(s.dungeon!.rooms.find((r) => r.id === "D")!.cleared).toBe(true);
  expect(log.reduce((state, c) => applyCommand(state, c).state, setup())).toEqual(s);
  expect(initial).toEqual(before);
});
it("不用 Torch：同一顶牌保持疾病依赖停点，不结算半张卡，不允许补用 Torch / 重抽 / 移动", () => {
  const p = pending(),
    drawn = choose(p, "draw").state;
  const stopped = applyCommand(drawn, { type: "resolveDungeonCurio" }).state;
  expect(stopped.dungeon).toMatchObject({
    phase: "awaitingCurio",
    position: "G",
    cursor: 38,
    gold: 0,
  });
  expect(stopped.dungeon!.curio!.active).toMatchObject({ cardId: "curio:p021", protected: false });
  expect(stopped.dungeon!.curio!.active!.blockedReason).toContain("疾病");
  expect(stopped.dungeon!.heroes[0]!.stress).toBe(0);
  expect(stopped.dungeon!.explorationSetup!.provisions).toHaveLength(6);
  for (const type of ["scoutDungeon", "rollDungeonExploration", "beginDungeonExploration"] as const)
    expect(applyCommand(stopped, { type }).state).toBe(stopped);
  expect(
    applyCommand(stopped, {
      type: "resolveChoice",
      choiceId: p.dungeon!.pending!.id,
      optionId: "use:p4",
    }).state,
  ).toBe(stopped);
  expect(applyCommand(stopped, { type: "resolveDungeonCurio" }).state).toEqual(stopped);
});
it("完整牌池包含未核实卡：抽到实际 p1 后保留具体行，即使用 Torch 也不把未知行当负面跳过", () => {
  const p = pending();
  const d = p.dungeon!;
  // 已洗牌的合法全池，验证任意顶牌，不构造缩减牌堆。
  const unknownCards = cards.map((c) =>
    c.id === "curio:p001"
      ? {
          ...c,
          rows: c.rows.map((r) =>
            ["449d2d43ed", "40c4cc438c"].includes(r.iconId)
              ? { ...r, effect: null, reason: "测试：未获批" }
              : r,
          ),
        }
      : c,
  );
  const ordered = {
    ...p,
    dungeon: { ...d, curio: { ...d.curio!, cards: unknownCards, deck: cards.map((c) => c.id) } },
  };
  const drawn = choose(ordered, "use:p4").state;
  const stopped = applyCommand(drawn, { type: "resolveDungeonCurio" }).state;
  expect(stopped.dungeon!.curio!.active!.blockedReason).toContain("449d2d43ed");
  expect(stopped.dungeon!.curio!.active!.blockedReason).toContain("40c4cc438c");
  expect(stopped.dungeon).toMatchObject({
    position: "G",
    phase: "awaitingCurio",
    gold: 0,
    cursor: 15,
  });
  expect(stopped.dungeon!.exploration!.rolls![0]!.resolved).toBe(false);
});
it("第二次抽牌从剩余堆顶拿 p6，无重复洗牌；已弃 p21 不返回", () => {
  const first = applyCommand(choose(pending(), "use:p4").state, {
    type: "resolveDungeonCurio",
  }).state;
  const d = first.dungeon!;
  const next = {
    ...first,
    dungeon: {
      ...d,
      pending: {
        id: "dungeon-hazard:test:h0:2",
        prompt: "Curio",
        options: [{ id: "draw", label: "抽牌" }],
      },
      exploration: {
        ...d.exploration!,
        rolls: d.exploration!.rolls!.map((r) =>
          r.id === "h0:2" ? { ...r, face: "curio" as const } : r,
        ),
      },
    },
  };
  const drawn = choose(next, "draw").state;
  expect(drawn.dungeon!.curio!.active!.cardId).toBe("curio:p006");
  expect(drawn.dungeon!.curio!.deck).toHaveLength(22);
  expect(drawn.dungeon!.cursor).toBe(38);
});
it("缺卡、重复卡、破坏牌池或抽空均在扣 Torch 前拒绝，不能改概率", () => {
  const p = pending(),
    d = p.dungeon!;
  for (const curio of [
    { ...d.curio!, cards: cards.slice(1) },
    { ...d.curio!, cards: [...cards.slice(1), cards[1]!] },
    { ...d.curio!, deck: cards.map((c) => c.id).slice(1) },
    { ...d.curio!, deck: [], discard: cards.map((c) => c.id) },
  ]) {
    const s = { ...p, dungeon: { ...d, curio } };
    expect(choose(s, "use:p4").state).toBe(s);
  }
});
it("重复整卡结算不重发金币；牌池破坏时保持抽牌和 Torch 决定", () => {
  const drawn = choose(pending(), "use:p4").state;
  const corrupt = {
    ...drawn,
    dungeon: { ...drawn.dungeon!, curio: { ...drawn.dungeon!.curio!, discard: ["curio:p021"] } },
  };
  expect(applyCommand(corrupt, { type: "resolveDungeonCurio" }).state.dungeon!.gold).toBe(0);
  const done = applyCommand(drawn, { type: "resolveDungeonCurio" }).state;
  expect(applyCommand(done, { type: "resolveDungeonCurio" }).state).toBe(done);
});

it("同一已核实卡丢失转录时停住；恢复原资料后原牌续接，不再消费 Torch 或 RNG", () => {
  const drawn = choose(pending(), "use:p4").state;
  const c = drawn.dungeon!.curio!;
  const missing = {
    ...drawn,
    dungeon: {
      ...drawn.dungeon!,
      curio: {
        ...c,
        cards: c.cards.map((card) =>
          card.id === "curio:p021"
            ? {
                ...card,
                rows: card.rows.map((r) =>
                  r.effect?.type === "gold" ? { ...r, effect: null, reason: "测试：转录丢失" } : r,
                ),
              }
            : card,
        ),
      },
    },
  };
  const stopped = applyCommand(missing, { type: "resolveDungeonCurio" }).state;
  expect(stopped.dungeon!.gold).toBe(0);
  const repaired = {
    ...stopped,
    dungeon: { ...stopped.dungeon!, curio: { ...stopped.dungeon!.curio!, cards } },
  };
  const result = applyCommand(repaired, { type: "resolveDungeonCurio" }).state;
  expect(result).toEqual(applyCommand(drawn, { type: "resolveDungeonCurio" }).state);
  expect(result.dungeon).toMatchObject({ cursor: 38, gold: 10 });
});
