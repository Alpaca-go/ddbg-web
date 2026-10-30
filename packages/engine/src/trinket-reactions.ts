import { CORE_TRINKET_BINDINGS } from "../../data/src/core-trinket-bindings";
import type { CoreTrinketId } from "../../data/src/core-trinket-bindings";
import type { ApplyResult, Command, GameState, PendingChoice, GameEvent } from "./command";
import type { BattleState } from "./battle";
import type { DungeonState } from "./dungeon";
import { trinketPoolProblem } from "./trinket-acquisition";
import type { StatusEffect } from "./status";

export type TrinketDecision = { readonly key: string; readonly optionId: string };
export type TrinketContinuation = {
  readonly generation: number;
  readonly original: GameState;
  readonly command: Command;
  readonly decisions: readonly TrinketDecision[];
  readonly choice: PendingChoice;
};
/** 一条命令重算时独享的临时上下文；从不写入最终状态或存档。 */
export type TrinketRuntime = {
  readonly skipChoices?: true;
  readonly epoch: string;
  cursor: number;
  readonly decisions: readonly TrinketDecision[];
  readonly faces: Map<string, "upright" | "inverted">;
  readonly spent: Set<string>;
  readonly events: GameEvent[];
};
type Scope = (BattleState | DungeonState) & { readonly trinketRuntime?: TrinketRuntime };
type Offer = { readonly id: string; readonly label: string };
class NeedTrinketChoice extends Error {
  constructor(
    readonly key: string,
    readonly heroId: string,
    readonly prompt: string,
    readonly options: readonly Offer[],
  ) {
    super("trinket choice");
  }
}
class InvalidTrinket extends Error {}
export function trinketChoice(
  scope: Scope,
  heroId: string,
  stage: string,
  prompt: string,
  options: readonly Offer[],
  mandatory = false,
): string {
  const runtime = scope.trinketRuntime;
  if (!runtime || !options.length) return "continue";
  if (runtime.skipChoices) return mandatory ? options[0]!.id : "continue";
  const key = runtime.epoch + ":" + runtime.cursor++ + ":" + heroId + ":" + stage;
  const decision = runtime.decisions[runtime.cursor - 1];
  const all = [...(mandatory ? [] : [{ id: "continue", label: "不使用饰品，继续" }]), ...options];
  if (!decision) throw new NeedTrinketChoice(key, heroId, prompt, all);
  if (decision.key !== key || !all.some((o) => o.id === decision.optionId))
    throw new InvalidTrinket("饰品计划已失效");
  return decision.optionId;
}
export function availableTrinket(
  scope: Scope,
  heroId: string,
  id: CoreTrinketId,
  face: "upright" | "inverted",
): boolean {
  const r = scope.trinketRuntime,
    pool = scope.trinkets;
  if (
    !r ||
    !pool ||
    ("entities" in scope && r.spent.has(id)) ||
    ("entities" in scope && scope.usedTrinketIds?.includes(id))
  )
    return false;
  const held = pool.held.find((h) => h.heroId === heroId && h.cardId === id);
  if (!held || (r.faces.get(id) ?? held.face) !== face) return false;
  const heroes =
    "entities" in scope ? scope.entities.filter((h) => h.side === "hero") : scope.heroes;
  const holder = heroes.find((h) => h.id === heroId);
  if (!holder || holder.dead) return false;
  const problem = trinketPoolProblem(
    pool,
    heroes.map((h) => ({
      id: h.id,
      dead: h.dead ?? false,
      ...(("heroLevel" in h ? h.heroLevel : h.level) === undefined
        ? {}
        : { level: "heroLevel" in h ? h.heroLevel : h.level }),
    })),
  );
  if (problem) throw new InvalidTrinket(problem);
  const c = pool.cards.find((c) => c.id === id),
    d = CORE_TRINKET_BINDINGS[id];
  if (
    !c ||
    c.verification.unverified ||
    c.name !== d.name ||
    c.level !== d.level ||
    [c.upright_half, c.inverted_half].some(
      (h, i) =>
        h.name !== c.name ||
        h.level !== c.level ||
        h.printed_rotation !== (i ? 180 : 0) ||
        h.effect_lines
          .flat()
          .some(
            (s) =>
              s.type === "icon" && !["confirmed", "confirmed_rulebook"].includes(s.icon.naming),
          ) ||
        JSON.stringify(
          h.effect_lines.map((l) =>
            l.map((s) => (s.type === "text" ? s.text : "@" + s.icon.iconId + ":" + s.icon.key)),
          ),
        ) !== d.faces[i],
    )
  )
    throw new InvalidTrinket("饰品卡面变化（R-048）：" + d.name);
  return true;
}
export function spendTrinket(scope: Scope, heroId: string, id: CoreTrinketId): void {
  const r = scope.trinketRuntime!,
    h = scope.trinkets!.held.find((h) => h.cardId === id)!;
  const face = r.faces.get(id) ?? h.face;
  r.faces.set(id, face === "upright" ? "inverted" : "upright");
  r.spent.add(id);
  r.events.push({
    type: "trinketUsed",
    actorId: heroId,
    cardId: id,
    face,
    message: CORE_TRINKET_BINDINGS[id].name + "：结算并翻面（R26）",
  });
}
export function statusCharmReaction(
  b: Scope,
  actorId: string,
  targetId: string,
  scope: "self" | "target",
  effects: readonly StatusEffect[],
  hit: boolean,
): readonly StatusEffect[] {
  if (!b.trinketRuntime) return effects;
  let next = [...effects];
  const fronts = [
    ["trinket:p003", { kind: "bleed", amount: 2, duration: 2 }],
    ["trinket:p004", { kind: "blight", amount: 2, duration: 2 }],
    ["trinket:p008", { kind: "debuff", duration: 2 }],
    ["trinket:p011", { kind: "stun", duration: 1 }],
  ] as const;
  while (true) {
    const options: Offer[] = [];
    for (const [id] of fronts) {
      if (scope === "target" && hit && availableTrinket(b, actorId, id, "upright"))
        options.push({ id, label: CORE_TRINKET_BINDINGS[id].name + "：追加状态到 " + targetId });
      if (availableTrinket(b, actorId, id, "inverted"))
        next.forEach((e, i) => {
          if (e.duration > 0)
            options.push({
              id: id + ":" + i,
              label:
                CORE_TRINKET_BINDINGS[id].name + "：" + targetId + " 的 " + e.kind + " 持续时间−1t",
            });
        });
    }
    const chosen = trinketChoice(
      b,
      actorId,
      "condition:" + scope + ":" + targetId,
      "选择本次施加状态适用的饰品（R26、R21）",
      options,
    );
    if (chosen === "continue") return next;
    const entry = fronts.find(([id]) => chosen === id || chosen.startsWith(id + ":"))!;
    const id = entry[0];
    if (chosen === id) next.push({ ...entry[1] });
    else {
      const i = Number(chosen.slice(id.length + 1));
      next = next
        .map((e, n) => (n === i ? { ...e, duration: e.duration - 1 } : e))
        .filter((e) => e.duration > 0);
    }
    spendTrinket(b, actorId, id);
  }
}
function cleanBattle(b: BattleState): BattleState {
  const { trinketRuntime: _runtime, ...rest } = b;
  void _runtime;
  return {
    ...rest,
    ...(b.skillPrefix
      ? { skillPrefix: { ...b.skillPrefix, original: cleanBattle(b.skillPrefix.original) } }
      : {}),
    ...(b.pending?.type === "damageStone"
      ? {
          pending: {
            ...b.pending,
            prefix: { ...b.pending.prefix, original: cleanBattle(b.pending.prefix.original) },
          },
        }
      : {}),
  };
}
function clean(state: GameState): GameState {
  const d = state.dungeon;
  const { trinketRuntime: _runtime, ...dungeon } = d ?? {};
  void _runtime;
  return {
    ...state,
    ...(state.battle ? { battle: cleanBattle(state.battle) } : {}),
    ...(d ? { dungeon: dungeon as DungeonState } : {}),
  };
}
export function runTrinketCommand(
  state: GameState,
  command: Command,
  dispatch: (state: GameState, command: Command) => ApplyResult,
): ApplyResult {
  const p = state.trinketChoice;
  let original = state,
    root = command,
    decisions: readonly TrinketDecision[] = [];
  let generation = 0;
  const refuse = (message: string): ApplyResult => ({
    state,
    events: [{ type: "commandRefused", message }],
  });
  if (p) {
    if (
      command.type !== "resolveChoice" ||
      command.choiceId !== p.choice.id ||
      !p.choice.options.some((o) => o.id === command.optionId)
    )
      return refuse("请先完成饰品选择");
    original = p.original;
    root = p.command;
    generation = p.generation;
    if (command.optionId === "reset-plan") {
      decisions = [];
      generation++;
    } else
      decisions = [
        ...p.decisions,
        { key: p.choice.id.slice("trinket|".length), optionId: command.optionId },
      ];
  }
  if (!root.allTrinkets && root.type !== "useCoreTrinket") return dispatch(state, command);
  const runtime: TrinketRuntime = {
    cursor: 0,
    epoch:
      String(original.battle?.choiceCursor ?? original.dungeon?.decision ?? 0) +
      ":" +
      generation +
      ":" +
      root.type,
    decisions,
    faces: new Map(),
    spent: new Set(),
    events: [],
  };
  const base = {
    ...original,
    ...(original.battle ? { battle: { ...original.battle, trinketRuntime: runtime } } : {}),
    ...(original.dungeon ? { dungeon: { ...original.dungeon, trinketRuntime: runtime } } : {}),
  };
  try {
    const result = dispatch(base, root);
    if (result.events.some((e) => e.type === "commandRefused")) {
      const message = result.events.find((e) => e.type === "commandRefused")!.message;
      if (p) {
        const skipped: TrinketRuntime = {
          cursor: 0,
          epoch: "validation",
          decisions: [],
          faces: new Map(),
          spent: new Set(),
          events: [],
          skipChoices: true,
        };
        const checked = dispatch(
          {
            ...original,
            ...(original.battle ? { battle: { ...original.battle, trinketRuntime: skipped } } : {}),
            ...(original.dungeon
              ? { dungeon: { ...original.dungeon, trinketRuntime: skipped } }
              : {}),
          },
          root,
        );
        if (checked.events.some((e) => e.type === "commandRefused"))
          return { state: original, events: [{ type: "commandRefused", message }] };
      }
      return refuse(message);
    }
    if (runtime.cursor !== decisions.length) throw new InvalidTrinket("饰品计划含多余步骤");
    let next = clean(result.state);
    const patch = <T extends Scope>(s: T): T => ({
      ...s,
      ...(s.trinkets
        ? {
            trinkets: {
              ...s.trinkets,
              held: s.trinkets.held.map((h) => ({
                ...h,
                face: runtime.faces.get(h.cardId) ?? h.face,
              })),
            },
          }
        : {}),
      ...("entities" in s
        ? {
            usedTrinketIds: [
              ...new Set([
                ...(s.usedTrinketIds ?? []),
                ...(s.encounter?.round === original.battle?.encounter?.round &&
                s.encounter?.turn.type === original.battle?.encounter?.turn.type &&
                (s.encounter?.turn.type === "hero" || s.encounter?.turn.type === "monster") &&
                (original.battle?.encounter?.turn.type === "hero" ||
                  original.battle?.encounter?.turn.type === "monster") &&
                s.encounter.turn.actorId === original.battle.encounter.turn.actorId
                  ? runtime.spent
                  : []),
              ]),
            ],
            choiceCursor: s.choiceCursor + decisions.length,
          }
        : { decision: s.decision + decisions.length }),
    });
    next = {
      ...next,
      ...(next.battle ? { battle: patch(next.battle) } : {}),
      ...(next.dungeon ? { dungeon: patch(next.dungeon) } : {}),
    };
    return { ...result, state: next, events: [...runtime.events, ...result.events] };
  } catch (error) {
    if (error instanceof InvalidTrinket) return refuse(error.message);
    if (!(error instanceof NeedTrinketChoice)) throw error;
    const choice = {
      id: "trinket|" + error.key,
      actorId: error.heroId,
      prompt: error.prompt,
      options: [
        ...error.options,
        { id: "reset-plan", label: "重新选择饰品方案（原动作与骰面不变）" },
      ],
    };
    const pending: TrinketContinuation = { original, command: root, decisions, choice, generation };
    return {
      state: {
        ...original,
        trinketChoice: pending,
        ...(original.battle
          ? { battle: { ...original.battle, pending: { type: "allTrinkets", choice } } }
          : {}),
        ...(original.dungeon && !original.battle
          ? { dungeon: { ...original.dungeon, pending: choice } }
          : {}),
      },
      events: [],
      pendingChoice: choice,
    };
  }
}

export function healingTrinketReaction(
  b: Scope,
  sourceId: string | undefined,
  targetId: string,
  amount: number,
): number {
  let value = amount;
  while (true) {
    const options: Offer[] = [];
    if (sourceId && availableTrinket(b, sourceId, "trinket:p020", "upright"))
      options.push({ id: "trinket:p020:heal", label: "Chirurgeon’s Charm：治疗+2" });
    if (availableTrinket(b, targetId, "trinket:p020", "inverted"))
      options.push({ id: "trinket:p020:receive", label: "Chirurgeon’s Charm：受到的治疗−4" });
    if (availableTrinket(b, targetId, "trinket:p023", "upright"))
      options.push({ id: "trinket:p023", label: "Bloodcourse Medallion：受到的治疗+4" });
    const chosen = trinketChoice(b, targetId, "healing", "治疗尚未结算：选择适用饰品", options);
    if (chosen === "continue") return Math.max(0, value);
    const id = chosen.startsWith("trinket:p020") ? "trinket:p020" : "trinket:p023";
    value += chosen === "trinket:p020:heal" ? 2 : chosen === "trinket:p020:receive" ? -4 : 4;
    spendTrinket(b, chosen === "trinket:p020:heal" ? sourceId! : targetId, id);
  }
}
export function damageTrinketReaction(
  b: Scope,
  heroId: string,
  amounts: readonly number[],
): readonly number[] {
  let value = [...amounts];
  while (true) {
    const options: Offer[] = [];
    if (value[0]! > 0 && availableTrinket(b, heroId, "trinket:p007", "inverted"))
      options.push({ id: "trinket:p007", label: "Damage Stone：额外承受2伤口并翻回正面" });
    const chosen = trinketChoice(b, heroId, "damage", "正伤害尚未结算：选择适用饰品", options);
    if (chosen === "continue") return value;
    if (chosen === "trinket:p007") value.push(2);
    else value = [Math.ceil(value[0]! / 2), ...value.slice(1)];
    spendTrinket(b, heroId, chosen as CoreTrinketId);
  }
}
export function speedTrinketReaction(b: BattleState, heroId: string, speed: number): number {
  let value = speed;
  const cards = [
    ["trinket:p010", "upright", 1],
    ["trinket:p010", "inverted", -1],
    ["trinket:p016", "inverted", -2],
    ["trinket:p022", "inverted", -1],
  ] as const;
  while (true) {
    const options = cards
      .filter(([id, face]) => availableTrinket(b, heroId, id, face))
      .map(([id, , n]) => ({
        id,
        label: CORE_TRINKET_BINDINGS[id].name + "：本次移动Speed" + (n > 0 ? "+" : "") + n,
      }));
    const chosen = trinketChoice(b, heroId, "speed", "选择本次移动的速度修正", options);
    if (chosen === "continue") return Math.max(0, value);
    const [id, , n] = cards.find(([id]) => id === chosen)!;
    value += n;
    spendTrinket(b, heroId, id);
  }
}
export function crownTrinketReaction(
  b: Scope,
  heroId: string,
  roll: number,
  threshold: number,
  light: number,
): number {
  if (
    !("entities" in b) &&
    (b.phase === "inHamlet" ||
      b.pressureSource?.startsWith("hamlet") ||
      b.freeTrinketResume?.phase === "inHamlet")
  )
    return threshold;
  let value = threshold;
  const cards = [
    ["trinket:p028", light >= 3],
    ["trinket:p035", light <= 3],
  ] as const;
  while (true) {
    const options = cards
      .filter(([id, applicable]) => applicable && availableTrinket(b, heroId, id, "inverted"))
      .map(([id]) => ({
        id,
        label: CORE_TRINKET_BINDINGS[id].name + "：本次美德机会−2并翻回正面",
      }));
    const chosen = trinketChoice(
      b,
      heroId,
      "virtue",
      "意志骰 d10=" + roll + "；结果尚未提交，选择饰品",
      options,
    );
    if (chosen === "continue") return Math.max(0, value);
    value -= 2;
    spendTrinket(b, heroId, chosen as CoreTrinketId);
  }
}
export function scoutTrinketReaction(d: DungeonState, heroId: string, stress: number): number {
  let value = stress,
    ignore = false;
  while (true) {
    const options: Offer[] = [];
    if (availableTrinket(d, heroId, "trinket:p005", "upright"))
      options.push({ id: "trinket:p005", label: "Caution Cloak：侦察不承受压力" });
    if (availableTrinket(d, heroId, "trinket:p024", "inverted"))
      options.push({ id: "trinket:p024", label: "Camper’s Helmet：侦察压力+1" });
    const chosen = trinketChoice(d, heroId, "scout", "本次侦察压力尚未支付", options);
    if (chosen === "continue") return ignore ? 0 : value;
    if (chosen === "trinket:p005") ignore = true;
    else value++;
    spendTrinket(d, heroId, chosen as CoreTrinketId);
  }
}

export function defenceTrinketReaction(
  b: Scope,
  heroId: string,
  roll: number | null,
  hitThreshold: number | null,
  original: "hit" | "crit" | "miss" | null,
): {
  outcome: typeof original;
  halve: boolean;
  statuses: readonly StatusEffect[];
  hitThreshold: number | null;
} {
  let outcome = original,
    threshold = hitThreshold,
    halve = false;
  const statuses: StatusEffect[] = [];
  const negative = [
    ["trinket:p015", { kind: "bleed", amount: 3, duration: 2 }],
    ["trinket:p019", { kind: "stun", duration: 1 }],
    ["trinket:p023", { kind: "bleed", amount: 1, duration: 3 }],
  ] as const;
  while (true) {
    const options: Offer[] = [];
    const light = "light" in b ? b.light : b.explorationSetup?.light;
    const dodges = [
      ["trinket:p010", "upright", 1, true],
      ["trinket:p010", "inverted", -1, true],
      ["trinket:p018", "inverted", -2, true],
      ["trinket:p019", "upright", 2, light !== undefined && light >= 3],
      ["trinket:p029", "upright", 5, true],
    ] as const;
    const applicable =
      threshold === null
        ? []
        : dodges.filter(
            ([id, face, , condition]) => condition && availableTrinket(b, heroId, id, face),
          );
    for (const [id, , n] of applicable)
      options.push({
        id,
        label: CORE_TRINKET_BINDINGS[id].name + "：本次Dodge" + (n > 0 ? "+" : "") + n,
      });
    if (
      roll !== null &&
      outcome === "hit" &&
      availableTrinket(b, heroId, "trinket:p017", "inverted")
    )
      options.push({ id: "trinket:p017", label: "Book of Holiness：将本次命中变为暴击" });
    if (outcome === "hit" || outcome === "crit") {
      if (availableTrinket(b, heroId, "trinket:p022", "upright"))
        options.push({ id: "trinket:p022", label: "Protective Padlock：本次伤害减半（向上取整）" });
      for (const [id, e] of negative)
        if (availableTrinket(b, heroId, id, "inverted"))
          options.push({
            id,
            label: CORE_TRINKET_BINDINGS[id].name + "：承受" + e.kind + " " + e.duration + "t",
          });
    }
    const chosen = trinketChoice(
      b,
      heroId,
      "defence",
      (roll === null ? "自动命中，无技能骰" : "技能骰 d10=" + roll) + "；选择防御/受击饰品",
      options,
    );
    if (chosen === "continue") return { outcome, halve, statuses, hitThreshold: threshold };
    const dodge = applicable.find(([id]) => id === chosen);
    if (dodge) {
      threshold = threshold! - dodge[2];
      if (outcome !== "crit") outcome = roll !== null && roll <= threshold ? "hit" : "miss";
    } else if (chosen === "trinket:p017") outcome = "crit";
    else if (chosen === "trinket:p022") halve = true;
    else statuses.push({ ...negative.find(([id]) => id === chosen)![1] });
    spendTrinket(b, heroId, chosen as CoreTrinketId);
  }
}

export type TrinketScope = Scope;
