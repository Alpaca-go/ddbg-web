import { expect, it } from "vitest";
import layout from "../../data/normalized/corebox/dungeon_layout_p001.json";
import distribution from "../../data/normalized/corebox/scout_ahead_distribution.json";
import rawCurios from "../../data/normalized/corebox/curio.json";
import stats from "../../data/normalized/corebox/hero_stat.json";
import { curioFileSchema } from "../../data/src/curio";
import { createDungeonSandbox } from "./dungeon";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";

const cards = curioFileSchema.parse(rawCurios).cards;
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
  const ordered = { ...p, dungeon: { ...d, curio: { ...d.curio!, deck: cards.map((c) => c.id) } } };
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
