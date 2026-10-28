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
import trinkets from "../../data/normalized/corebox/trinket.json";
import resolveData from "../../data/normalized/corebox/virtue_affliction.json";
import type { ResolveCard } from "./pressure";
import { normalizedTrinketFileSchema } from "../../data/src/normalize/schema";
import { createTrinketPool, trinketPoolProblem } from "./trinket-acquisition";

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
      trinkets: createTrinketPool(normalizedTrinketFileSchema.parse(trinkets).cards, 1),
      curio: {
        ...d.curio!,
        deck: [id, ...cards.map((c) => c.id).filter((cardId) => cardId !== id)],
      },
    },
  };
  return choose(ordered, "use:p4").state;
}
it("R-064 全池逐卡：Torch 后二十四张可完成，饰品明确选弃新卡", () => {
  const completed: number[] = [];
  for (let page = 1; page <= 24; page++) {
    const drawn = protectedPage(page);
    let result = applyCommand(drawn, { type: "resolveDungeonCurio" });
    const awardsProvision = [3, 8, 10, 15, 16, 20].includes(page);
    while (result.state.dungeon!.curio!.active && result.pendingChoice)
      result = choose(
        result.state,
        result.pendingChoice.id.startsWith("dungeon-trinket:") ? "discard-new" : "food",
      );
    const d = result.state.dungeon!;
    expect(d.curio!.active).toBeNull();
    completed.push(page);
    expect(d.curio!.discard).toEqual([`curio:p${String(page).padStart(3, "0")}`]);
    expect(d.heroes.every((h) => h.stress === 0 && h.wounds === 0)).toBe(true);
    expect(d.exploration!.rolls![0]!.resolved).toBe(true);
    expect(applyCommand(result.state, { type: "resolveDungeonCurio" }).state).toBe(result.state);
    expect(d.cursor).toBe(
      drawn.dungeon!.cursor +
        Number(awardsProvision) +
        ([6, 7, 10, 11, 16, 24].includes(page) ? 16 : 0) +
        ([5, 7, 12, 18, 22, 24].includes(page) ? 13 : 0),
    );
    expect(d.explorationSetup!.provisions).toHaveLength(5 + Number(awardsProvision));
  }
  expect(completed).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
});

it("Curio 单一饰品：冻住其他命令，转交旧件后装备新卡，一次弃牌不重洗", () => {
  const drawn = protectedPage(12),
    d = drawn.dungeon!,
    pool = d.trinkets!;
  const initial = {
    ...drawn,
    dungeon: {
      ...d,
      trinkets: {
        ...pool,
        held: [{ cardId: "trinket:p001", heroId: "h0", face: "inverted" as const }],
        deck: [
          "trinket:p006",
          ...pool.cards
            .map((c) => c.id)
            .filter((id) => !["trinket:p001", "trinket:p006"].includes(id)),
        ],
      },
    },
  };
  const before = structuredClone(initial);
  const first = applyCommand(initial, { type: "resolveDungeonCurio" });
  expect(first.pendingChoice?.actorId).toBe("h0");
  expect(first.state.dungeon!.cursor).toBe(d.cursor);
  expect(first.state.dungeon!.curio!.discard).toEqual([]);
  expect(applyCommand(first.state, { type: "resolveDungeonCurio" }).state).toBe(first.state);
  expect(choose(first.state, "equip:h0").state).toBe(first.state);
  const moved = choose(first.state, "transfer:trinket:p001:h1");
  expect(moved.state.dungeon!.trinkets!.held[0]).toMatchObject({ heroId: "h1", face: "inverted" });
  expect(moved.pendingChoice!.id).not.toBe(first.pendingChoice!.id);
  const done = choose(moved.state, "equip:h0");
  expect(done.state.dungeon!.trinkets!.held).toContainEqual({
    cardId: "trinket:p006",
    heroId: "h0",
    face: "upright",
  });
  expect(done.state.dungeon!.curio!.discard).toEqual(["curio:p012"]);
  expect(done.state.dungeon!.cursor).toBe(d.cursor);
  expect(trinketPoolProblem(done.state.dungeon!.trinkets!, done.state.dungeon!.heroes)).toBeNull();
  expect(applyCommand(done.state, { type: "resolveDungeonCurio" }).state).toBe(done.state);
  expect(choose(moved.state, "equip:h0")).toEqual(done);
  expect(initial).toEqual(before);
});

it("p7 / p24 按行序交替饰品与满额怪癖待选；腾位不提前抽下一奖励", () => {
  for (const page of [7, 24]) {
    const drawn = protectedPage(page),
      d = drawn.dungeon!,
      pool = d.trinkets!;
    const initial = {
      ...drawn,
      dungeon: {
        ...d,
        heroes: d.heroes.map((h, i) =>
          i ? h : { ...h, quirkIds: ["quirk:p001", "quirk:p018", "quirk:p019"] },
        ),
        trinkets: {
          ...pool,
          held: [{ cardId: "trinket:p001", heroId: "h0", face: "inverted" as const }],
          deck: [
            "trinket:p006",
            ...pool.cards
              .map((c) => c.id)
              .filter((id) => !["trinket:p001", "trinket:p006"].includes(id)),
          ],
        },
      },
    };
    const before = structuredClone(initial);
    let result = applyCommand(initial, { type: "resolveDungeonCurio" });
    expect(result.pendingChoice!.id).toContain(
      page === 7 ? "dungeon-trinket:" : "dungeon-condition:",
    );
    if (page === 24) {
      expect(result.state.dungeon!.trinkets!.incoming).toBeNull();
      result = choose(result.state, "quirk:p001");
    }
    const waiting = result.state;
    expect(waiting.dungeon!.conditions!.incomingQuirk ?? null).toBeNull();
    const conditionsBefore = waiting.dungeon!.conditions;
    const moved = choose(waiting, "transfer:trinket:p001:h1");
    expect(moved.pendingChoice!.id).toContain("dungeon-trinket:");
    expect(moved.state.dungeon!.conditions).toEqual(conditionsBefore);
    expect(moved.state.dungeon!.cursor).toBe(waiting.dungeon!.cursor);
    expect(moved.state.dungeon!.gold).toBe(0);
    expect(moved.state.dungeon!.curio!.discard).toEqual([]);
    result = choose(moved.state, "equip:h0");
    if (page === 7) {
      expect(result.pendingChoice!.id).toContain("dungeon-condition:");
      expect(result.state.dungeon!.gold).toBe(0);
      const incoming = result.state.dungeon!.conditions!.incomingQuirk!.cardId;
      result = choose(result.state, incoming);
    }
    const done = result.state.dungeon!;
    expect(done.gold).toBe(page === 7 ? 5 : 0);
    expect(done.cursor).toBe(d.cursor + 15);
    expect(done.curio!.discard).toEqual([`curio:p${String(page).padStart(3, "0")}`]);
    expect(done.trinkets!.held).toContainEqual({
      cardId: "trinket:p006",
      heroId: "h0",
      face: "upright",
    });
    expect(conditionPoolProblem(done.conditions!, done.heroes)).toBeNull();
    expect(trinketPoolProblem(done.trinkets!, done.heroes)).toBeNull();
    expect(initial).toEqual(before);
    expect(applyCommand(result.state, { type: "resolveDungeonCurio" }).state).toBe(result.state);
    expect(applyCommand(initial, { type: "resolveDungeonCurio" })).toEqual(
      applyCommand(before, { type: "resolveDungeonCurio" }),
    );
  }
});

it("p5 Buff 在饰品选择前只施加一次；未知饰品可明确弃掉完成", () => {
  const drawn = protectedPage(5),
    d = drawn.dungeon!,
    pool = d.trinkets!;
  const initial = {
    ...drawn,
    dungeon: {
      ...d,
      trinkets: {
        ...pool,
        cards: pool.cards.map((c) =>
          c.id === "trinket:p009"
            ? { ...c, verification: { unverified: true, reasons: ["test-fixture"] } }
            : c,
        ),
        deck: [
          "trinket:p009",
          ...pool.cards.map((c) => c.id).filter((id) => id !== "trinket:p009"),
        ],
      },
    },
  };
  const waiting = applyCommand(initial, { type: "resolveDungeonCurio" });
  expect(waiting.state.dungeon!.heroes[0]!.statusStacks).toEqual([{ kind: "buff", remaining: 2 }]);
  expect(waiting.pendingChoice!.options.map((o) => o.id)).toEqual(["discard-new"]);
  expect(waiting.state.dungeon!.curio!.discard).toEqual([]);
  const done = choose(waiting.state, "discard-new").state.dungeon!;
  expect(done.heroes[0]!.statusStacks).toEqual([{ kind: "buff", remaining: 2 }]);
  expect(done.cursor).toBe(d.cursor);
  expect(done.trinkets!.discard).toEqual(["trinket:p009"]);
  expect(done.curio!.discard).toEqual(["curio:p005"]);
});

it("种子 230：完整牌池自然抽 p7 与 Accuracy Stone，复合命令日志可确定性回放", () => {
  const base = setup(230),
    catalog = protectedPage(7).dungeon!;
  const initial = {
    ...base,
    dungeon: {
      ...base.dungeon!,
      heroes: catalog.heroes,
      battleCatalog: catalog.battleCatalog!,
      conditions: catalog.conditions!,
      trinkets: catalog.trinkets!,
    },
  };
  const before = structuredClone(initial),
    log: Command[] = [];
  let current = initial as GameState;
  const dispatch = (command: Command) => {
    log.push(command);
    current = applyCommand(current, command).state;
  };
  const select = (optionId: string) =>
    dispatch({ type: "resolveChoice", choiceId: current.dungeon!.pending!.id, optionId });
  dispatch({ type: "beginDungeonExploration" });
  select("D");
  dispatch({ type: "rollDungeonExploration" });
  select("h0:1");
  select("use:p4");
  expect(current.dungeon!.curio!.active!.cardId).toBe("curio:p007");
  dispatch({ type: "resolveDungeonCurio" });
  expect(current.dungeon!.trinkets!.incoming!.cardId).toBe("trinket:p001");
  select("equip:h0");
  expect(current.dungeon!.gold).toBe(5);
  expect(current.dungeon!.cursor).toBe(67);
  expect(current.dungeon!.heroes[0]!.quirkIds).toHaveLength(1);
  expect(current.dungeon!.curio!.discard).toEqual(["curio:p007"]);
  expect(
    log.reduce((state, command) => applyCommand(state, command).state, before as GameState),
  ).toEqual(current);
  expect(initial).toEqual(before);
});

it("复合奖励预检资料；有效饰品堆耗尽保留此前行，修复后续接原卡", () => {
  for (const page of [5, 7, 24]) {
    const drawn = protectedPage(page),
      d = drawn.dungeon!;
    const exhausted = {
      ...drawn,
      dungeon: {
        ...d,
        trinkets: { ...d.trinkets!, deck: [], discard: d.trinkets!.cards.map((c) => c.id) },
      },
    };
    const stopped = applyCommand(exhausted, { type: "resolveDungeonCurio" }).state;
    expect(stopped.dungeon!.curio!.active!.blockedReason).toContain("耗尽");
    if (page === 5)
      expect(stopped.dungeon!.heroes[0]!.statusStacks).toEqual([{ kind: "buff", remaining: 2 }]);
    else if (page === 24) expect(stopped.dungeon!.heroes[0]!.quirkIds).toHaveLength(1);
    else expect(stopped.dungeon!.heroes).toEqual(d.heroes);
    expect(stopped.dungeon!.cursor).toBe(d.cursor + (page === 24 ? 16 : 0));
    const repaired = { ...stopped, dungeon: { ...stopped.dungeon!, trinkets: d.trinkets! } };
    expect(applyCommand(repaired, { type: "resolveDungeonCurio" }).pendingChoice!.id).toContain(
      "dungeon-trinket:",
    );
  }
  const drawn = protectedPage(7),
    { conditions: _unused, ...d } = drawn.dungeon!;
  void _unused;
  const stopped = applyCommand({ ...drawn, dungeon: d }, { type: "resolveDungeonCurio" }).state;
  expect(stopped.dungeon!.cursor).toBe(d.cursor);
  expect(stopped.dungeon!.trinkets).toEqual(d.trinkets);
  expect(stopped.dungeon!.curio!.active!.blockedReason).toContain("完整怪癖");
});

it("R35 饰品池等级与普通地牢不符时保持原 Curio / RNG，不误抽其他等级", () => {
  const drawn = protectedPage(12),
    d = drawn.dungeon!;
  const initial = {
    ...drawn,
    dungeon: {
      ...d,
      trinkets: createTrinketPool(normalizedTrinketFileSchema.parse(trinkets).cards, 2),
    },
  };
  const blocked = applyCommand(initial, { type: "resolveDungeonCurio" });
  expect(blocked.state.dungeon!.curio!.active!.blockedReason).toContain("等级不一致");
  expect(blocked.state.dungeon!.cursor).toBe(d.cursor);
  expect(blocked.state.dungeon!.trinkets).toEqual(initial.dungeon.trinkets);
  expect(blocked.state.dungeon!.curio!.discard).toEqual([]);
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

it("p10：金币先发，再怪癖替换→补给Wild待选，已付行不重复", () => {
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
    expect(picked.state.dungeon!.gold).toBe(5);
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

it("p10/p16补给已满或正面堆耗尽停在对应行，已付金币及怪癖保留", () => {
  for (const page of [10, 16]) {
    const drawn = protectedPage(page),
      d = drawn.dungeon!;
    const scenes = [
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
    ];
    for (const [position, initial] of scenes.entries()) {
      const blocked = applyCommand(initial, { type: "resolveDungeonCurio" });
      expect(blocked.state.dungeon!.cursor).toBe(d.cursor + (position === 0 ? 16 : 0));
      expect(blocked.state.dungeon!.gold).toBe(position === 0 || page === 10 ? 5 : 0);
      if (position === 0) expect(blocked.state.dungeon!.heroes[0]!.quirkIds).toHaveLength(1);
      else expect(blocked.state.dungeon!.heroes).toEqual(d.heroes);
      const repeated = applyCommand(blocked.state, { type: "resolveDungeonCurio" });
      expect(repeated.state.dungeon!.cursor).toBe(blocked.state.dungeon!.cursor);
      expect(repeated.state.dungeon!.gold).toBe(blocked.state.dungeon!.gold);
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

it("Curio补给六面沿共享RNG；Wild冻结后续行，先前金币保留不重发", () => {
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
      expect(waiting.dungeon!.gold).toBe(10);
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

it("补给上限在本行掷骰前停点，损坏实例预检；修复后只续接，到16颗不溢出", () => {
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
    expect(result.state.dungeon!.gold).toBe(provisions.length === 16 ? 10 : 0);
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

it("R-069未用Torch的全24张按行序完成，负面状态／怪癖先于后续奖励", () => {
  for (let page = 1; page <= 24; page++) {
    const drawn = protectedPage(page);
    const initial = {
      ...drawn,
      dungeon: {
        ...drawn.dungeon!,
        curio: {
          ...drawn.dungeon!.curio!,
          active: { ...drawn.dungeon!.curio!.active!, protected: false },
        },
      },
    };
    let result = applyCommand(initial, { type: "resolveDungeonCurio" });
    while (result.state.dungeon!.curio!.active && result.pendingChoice)
      result = choose(
        result.state,
        result.pendingChoice.id.startsWith("dungeon-trinket:") ? "discard-new" : "food",
      );
    expect(
      result.events.filter((e) => e.type === "commandRefused"),
      `curio p${page}`,
    ).toEqual([]);
    const done = result.state.dungeon!;
    expect(done.curio!.active).toBeNull();
    expect(done.curio!.discard).toEqual([`curio:p${String(page).padStart(3, "0")}`]);
    expect(done.exploration!.rolls![0]!.resolved).toBe(true);
    expect(done.heroes[0]!.stress).toBe([6, 7, 8, 10, 15, 16].includes(page) ? 0 : 1);
    expect(done.gold).toBe(
      cards[page - 1]!.rows.reduce(
        (sum, r) => sum + (r.effect?.type === "gold" ? r.effect.amount : 0),
        0,
      ),
    );
    expect(conditionPoolProblem(done.conditions!, done.heroes)).toBeNull();
    expect(trinketPoolProblem(done.trinkets!, done.heroes)).toBeNull();
    expect(applyCommand(result.state, { type: "resolveDungeonCurio" }).state).toBe(result.state);
  }
});

it("新负面怪癖替换后才继续行序，Anemic立即影响随后Bleed，正面待选不重抽", () => {
  const drawn = protectedPage(6),
    d = drawn.dungeon!;
  const anemic = d.conditions!.quirks.find((q) => q.name === "Anemic")!.id;
  const initial = {
    ...drawn,
    dungeon: {
      ...d,
      heroes: d.heroes.map((h, i) =>
        i ? h : { ...h, quirkIds: ["quirk:p001", "quirk:p002", "quirk:p003"] },
      ),
      conditions: {
        ...d.conditions!,
        negativeDeck: [
          anemic,
          ...d
            .conditions!.quirks.filter((q) => q.polarity === "negative" && q.id !== anemic)
            .map((q) => q.id),
        ],
      },
      curio: { ...d.curio!, active: { ...d.curio!.active!, protected: false } },
    },
  };
  const first = applyCommand(initial, { type: "resolveDungeonCurio" });
  expect(first.pendingChoice?.id).toContain("dungeon-condition:");
  expect(first.state.dungeon!.curio!.active!.effectIndex).toBe(1);
  expect(first.state.dungeon!.heroes[0]!.statusStacks).toBeUndefined();
  expect(first.state.dungeon!.cursor).toBe(d.cursor);
  const replaced = choose(first.state, "quirk:p001");
  expect(replaced.pendingChoice?.id).toContain("dungeon-condition:");
  expect(replaced.state.dungeon!.heroes[0]!.statusStacks).toEqual([
    { kind: "bleed", remaining: 3, amount: 1 },
    { kind: "bleed", remaining: 3, amount: 1 },
  ]);
  const done = choose(replaced.state, replaced.state.dungeon!.conditions!.incomingQuirk!.cardId);
  expect(done.state.dungeon!.curio!.active).toBeNull();
  expect(done.state.dungeon!.conditions!.quirkDiscard).toHaveLength(2);
  expect(
    conditionPoolProblem(done.state.dungeon!.conditions!, done.state.dungeon!.heroes),
  ).toBeNull();
  expect(done.state.dungeon!.heroes[0]!.statusStacks).toEqual(
    replaced.state.dungeon!.heroes[0]!.statusStacks,
  );
});

it("第四负面立即发疯死亡，取消Debuff及未发金币；已有金币保留", () => {
  const drawn = protectedPage(1),
    d = drawn.dungeon!;
  const initial = {
    ...drawn,
    dungeon: {
      ...d,
      gold: 5,
      heroes: d.heroes.map((h, i) =>
        i ? h : { ...h, quirkIds: ["quirk:p028", "quirk:p035", "quirk:p021"] },
      ),
      curio: { ...d.curio!, active: { ...d.curio!.active!, protected: false } },
    },
  };
  const before = structuredClone(initial),
    result = applyCommand(initial, { type: "resolveDungeonCurio" });
  expect(result.state.dungeon).toMatchObject({ phase: "awaitingReplacement", gold: 5 });
  expect(result.state.dungeon!.heroes[0]).toMatchObject({
    dead: true,
    deathReason: "madness",
    stress: 2,
    wounds: 1,
  });
  expect(result.state.dungeon!.heroes[0]!.statusStacks).toBeUndefined();
  expect(result.state.dungeon!.curio!.last!.effectIndex).toBe(2);
  expect(result.state.dungeon!.curio!.discard).toEqual(["curio:p001"]);
  expect(result.state.dungeon!.conditions!.quirkDiscard).toHaveLength(1);
  expect(
    conditionPoolProblem(result.state.dungeon!.conditions!, result.state.dungeon!.heroes),
  ).toBeNull();
  expect(result).toEqual(applyCommand(initial, { type: "resolveDungeonCurio" }));
  expect(initial).toEqual(before);
});

it("Vestal III的Curio疾病免疫按行跳过，不抽牌、不清旧病，其他奖惩继续", () => {
  const drawn = protectedPage(14),
    d = drawn.dungeon!;
  const stat = approvedStats.find((s) => s.name === "VESTAL" && s.level === 3)!;
  for (const diseaseId of [null, "disease:p011"]) {
    const initial = {
      ...drawn,
      dungeon: {
        ...d,
        heroes: d.heroes.map((h, i) =>
          i ? h : { ...h, level: 3, life: stat.life, heroStatId: stat.id, diseaseId },
        ),
        conditions: {
          ...d.conditions!,
          diseaseDeck: d.conditions!.diseases.filter((c) => c.id !== diseaseId).map((c) => c.id),
          negativeDeck: d
            .conditions!.quirks.filter((c) => c.polarity === "negative")
            .map((c) => c.id),
        },
        curio: { ...d.curio!, active: { ...d.curio!.active!, protected: false } },
      },
    };
    const before = structuredClone(initial);
    const result = applyCommand(initial, { type: "resolveDungeonCurio" });
    expect(result.state.dungeon!.curio!.active).toBeNull();
    expect(result.state.dungeon!.heroes[0]).toMatchObject({ stress: 1, diseaseId });
    expect(result.state.dungeon!.conditions!.diseaseDeck).toEqual(
      initial.dungeon.conditions.diseaseDeck,
    );
    expect(result.state.dungeon!.conditions!.diseaseDiscard).toEqual(
      initial.dungeon.conditions.diseaseDiscard,
    );
    expect(result.events.filter((e) => e.type === "diseaseAcquired")).toEqual([]);
    expect(result.state.dungeon!.cursor).toBe(d.cursor);
    expect(
      conditionPoolProblem(result.state.dungeon!.conditions!, result.state.dungeon!.heroes),
    ).toBeNull();
    expect(applyCommand(initial, { type: "resolveDungeonCurio" })).toEqual(result);
    expect(initial).toEqual(before);
  }
});
it("新Nervous／The Worries不回改本卡先前压力事件", () => {
  const drawn = protectedPage(14),
    d = drawn.dungeon!;
  const nervous = d.conditions!.quirks.find((q) => q.name === "Nervous")!.id;
  const worries = d.conditions!.diseases.find((q) => q.name === "The Worries")!.id;
  const initial = {
    ...drawn,
    dungeon: {
      ...d,
      conditions: {
        ...d.conditions!,
        negativeDeck: [
          nervous,
          ...d
            .conditions!.quirks.filter((q) => q.polarity === "negative" && q.id !== nervous)
            .map((q) => q.id),
        ],
        diseaseDeck: [
          worries,
          ...d.conditions!.diseases.filter((q) => q.id !== worries).map((q) => q.id),
        ],
      },
      curio: { ...d.curio!, active: { ...d.curio!.active!, protected: false } },
    },
  };
  const result = applyCommand(initial, { type: "resolveDungeonCurio" });
  expect(result.state.dungeon!.heroes[0]).toMatchObject({
    stress: 1,
    wounds: 0,
    quirkIds: [nervous],
    diseaseId: worries,
  });
  expect(result.state.dungeon!.curio!.active).toBeNull();
  expect(result.state.dungeon!.cursor).toBe(d.cursor);
});

it("补给满16时先保留印刷金币，合法Food腾位后只续接奖励骰", () => {
  const drawn = protectedPage(8),
    d = drawn.dungeon!;
  const initial = {
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
  };
  const blocked = applyCommand(initial, { type: "resolveDungeonCurio" });
  expect(blocked.state.dungeon!.gold).toBe(10);
  expect(blocked.state.dungeon!.curio!.active!.effectIndex).toBe(1);
  const freed = applyCommand(blocked.state, {
    type: "useProvision",
    provisionId: "full:0",
    targetId: "h0",
    effect: "heal",
  });
  expect(freed.state.dungeon).toMatchObject({ phase: "awaitingCurio", gold: 10, cursor: d.cursor });
  expect(freed.state.dungeon!.explorationSetup!.provisions).toHaveLength(15);
  let completed = applyCommand(freed.state, { type: "resolveDungeonCurio" });
  if (completed.state.dungeon!.curio!.active && completed.pendingChoice)
    completed = choose(completed.state, "food");
  expect(completed.state.dungeon!.curio!.active).toBeNull();
  expect(completed.state.dungeon).toMatchObject({ gold: 10, cursor: d.cursor + 1 });
  expect(completed.state.dungeon!.explorationSetup!.provisions).toHaveLength(16);
  expect(completed.events.some((e) => e.message?.includes("金币 +"))).toBe(false);
});

it("Curio行间Torch提升光照并完成意志，不重抽或改保护决定，不提前执行卡面", () => {
  const drawn = protectedPage(4),
    d = drawn.dungeon!;
  const initial = {
    ...drawn,
    dungeon: {
      ...d,
      resolveCards: resolveData.cards as ResolveCard[],
      heroes: d.heroes.map((h, i) => (i ? h : { ...h, stress: 9, quirkIds: ["quirk:p019"] })),
      explorationSetup: {
        ...d.explorationSetup!,
        light: 4,
        provisions: [
          ...d.explorationSetup!.provisions,
          { id: "extra-torch", face: "torch" as const },
        ],
      },
      curio: { ...d.curio!, active: { ...d.curio!.active!, protected: false } },
    },
  };
  const result = applyCommand(initial, {
    type: "useProvision",
    provisionId: "extra-torch",
    targetId: "h0",
    effect: "raiseLight",
  });
  expect(result.state.dungeon).toMatchObject({ phase: "awaitingCurio", gold: 0 });
  expect(result.state.dungeon!.heroes[0]).toMatchObject({ stress: 0, resolveTested: true });
  expect(result.state.dungeon!.heroes[0]!.statusStacks).toBeUndefined();
  expect(result.state.dungeon!.curio!.active).toMatchObject({
    cardId: "curio:p004",
    protected: false,
  });
  expect(result.state.dungeon!.curio!.deck).toEqual(d.curio!.deck);
  expect(result.events.filter((e) => e.type === "provisionConsumed")).toHaveLength(1);
  expect(result.events.filter((e) => e.type === "resolveTested")).toHaveLength(1);
  const completed = applyCommand(result.state, { type: "resolveDungeonCurio" });
  expect(completed.state.dungeon!.heroes[0]!.stress).toBe(1);
  expect(completed.state.dungeon!.gold).toBe(5);
  expect(completed.state.dungeon!.curio!.discard).toEqual(["curio:p004"]);
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
  expect(stopped.dungeon!.curio!.active!.blockedReason).toContain("Q-60");
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
  expect(stopped.dungeon!.curio!.active!.blockedReason).toContain("Q-60");
  expect(stopped.dungeon!.gold).toBe(0);
  const repaired = {
    ...stopped,
    dungeon: { ...stopped.dungeon!, curio: { ...stopped.dungeon!.curio!, cards } },
  };
  const result = applyCommand(repaired, { type: "resolveDungeonCurio" }).state;
  expect(result).toEqual(applyCommand(drawn, { type: "resolveDungeonCurio" }).state);
  expect(result.dungeon).toMatchObject({ cursor: 38, gold: 10 });
});

it("走廊抽 Curio 前 Fear 压力 10：pendingCurioDraw 意志后抽牌并结算，无 commandRefused", () => {
  const fear = normalizedQuirkFileSchema
    .parse(quirks)
    .cards.find((q) => q.name === "Fear of the Unknown")!.id;
  const base = pending();
  const d = base.dungeon!;
  const prepared = {
    ...base,
    dungeon: {
      ...d,
      resolveCards: resolveData.cards as ResolveCard[],
      conditions: createConditionPool(
        diseaseFileSchema.parse(diseases).cards,
        normalizedQuirkFileSchema.parse(quirks).cards,
      ),
      heroes: d.heroes.map((h, i) => ({
        ...h,
        heroStatId: approvedStats.find(
          (s) => s.level === 1 && s.name === ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"][i],
        )!.id,
        ...(i === 0 ? { stress: 9, quirkIds: [fear] } : {}),
      })),
      battleCatalog: { heroStats: approvedStats, skills: [], monsters: [] },
      trinkets: createTrinketPool(normalizedTrinketFileSchema.parse(trinkets).cards, 1),
    },
  };
  const drawn = choose(prepared, "draw").state;
  expect(drawn.dungeon!.curio!.active).toBeTruthy();
  expect(drawn.dungeon!.heroes[0]!.stress).toBe(0);
  let result = applyCommand(drawn, { type: "resolveDungeonCurio" });
  while (result.state.dungeon!.curio!.active && result.pendingChoice)
    result = choose(
      result.state,
      result.pendingChoice.id.startsWith("dungeon-trinket:") ? "discard-new" : "food",
    );
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(result.state.dungeon!.curio!.active).toBeNull();
  expect(result.state.dungeon!.exploration!.rolls![0]!.resolved).toBe(true);
});

it("Wild 补给待选时重复 resolveDungeonCurio 给出公开命令提示", () => {
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
  let state = applyCommand(initial, { type: "resolveDungeonCurio" }).state;
  state = choose(state, state.dungeon!.conditions!.incomingQuirk!.cardId).state;
  expect(state.dungeon!.pending!.id).toContain("dungeon-curio-provision:");
  const refused = applyCommand(state, { type: "resolveDungeonCurio" });
  expect(refused.events[0]).toMatchObject({
    type: "commandRefused",
    message: expect.stringContaining("Wild"),
  });
});
