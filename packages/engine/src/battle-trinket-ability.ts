import { playHeroSkill, rejectBattleCommand } from "./battle";
import type { PlayHeroSkillCommand } from "./battle";
import { playHeroSkillTargets } from "./battle-hero-targets";
import type { PlayHeroSkillTargetsCommand } from "./battle-hero-targets";
import type { ApplyResult, GameState } from "./command";
import type { HeroSkillCardView, HeroSkillResolution, SkillCombatState } from "./hero-skill";
import { trinketPoolProblem } from "./trinket-acquisition";
import { nextBattleRoll } from "./battle-roll";

const CRITICAL_STONE = "trinket:p006";
type Attack = PlayHeroSkillCommand | PlayHeroSkillTargetsCommand;
export type HeroTrinketAttack = {
  readonly roll: number;
  readonly modifiers: NonNullable<SkillCombatState["trinketModifiers"]>;
};

function stone(state: GameState, actorId: string) {
  const b = state.battle!;
  const held = b.trinkets?.held.find((h) => h.cardId === CRITICAL_STONE && h.heroId === actorId);
  if (!held) return null;
  const card = b.trinkets!.cards.find((c) => c.id === CRITICAL_STONE);
  const problem = trinketPoolProblem(
    b.trinkets!,
    b.entities
      .filter((e) => e.side === "hero")
      .map((e) => ({
        id: e.id,
        ...(e.heroLevel === undefined ? {} : { level: e.heroLevel }),
        dead: e.dead,
      })),
  );
  // R26 整页明确给出这一张卡的正反面；不推广其它饰品的印刷方向。
  if (
    problem ||
    !card ||
    card.verification.unverified ||
    card.name !== "Critical Stone" ||
    card.level !== 1 ||
    JSON.stringify(card.upright_half.effect_lines) !==
      JSON.stringify([[{ type: "text", text: "Crit+2" }]]) ||
    JSON.stringify(card.inverted_half.effect_lines) !==
      JSON.stringify([[{ type: "text", text: "Acc-2" }]])
  )
    return { problem: problem ?? "Critical Stone 卡面与 R26 已核实效果不符（R-048）" };
  return { held };
}

/** 骰面已公开但未结算；冻结命令，直到玩家选用或放弃。RNG 在续接时仅消费一次。 */
export function beginHeroTrinketWindow(
  state: GameState,
  command: Attack,
  roll: number,
  skill: HeroSkillCardView,
  resolution: HeroSkillResolution,
): ApplyResult | null {
  const b = state.battle!;
  if (
    b.encounter?.turn.type !== "hero" ||
    b.encounter.turn.actorId !== command.actorId ||
    b.usedTrinketIds?.includes(CRITICAL_STONE)
  )
    return null;
  const available = stone(state, command.actorId);
  if (!available) return null;
  if ("problem" in available) return rejectBattleCommand(state, available.problem);
  if (
    !skill.printed_labels.some(
      (label) => label.label === (available.held.face === "upright" ? "Crit" : "Acc"),
    ) ||
    resolution.outcome === null
  )
    return null;
  const choice = {
    id: `hero-trinket:${b.choiceCursor}`,
    actorId: command.actorId,
    prompt: `技能骰 d10=${roll}，尚未结算。Critical Stone：${available.held.face === "upright" ? "Crit +2，使用后翻到反面" : "Acc −2，使用后翻回正面"}`,
    options: [
      { id: "continue", label: "不使用饰品，结算技能" },
      { id: CRITICAL_STONE, label: "使用 Critical Stone 并结算技能" },
    ],
  };
  return {
    state: {
      ...state,
      battle: {
        ...b,
        choiceCursor: b.choiceCursor + 1,
        pending: { type: "heroTrinket", command, roll, face: available.held.face, choice },
      },
    },
    events: [],
    pendingChoice: choice,
  };
}

export function chooseHeroTrinket(state: GameState, optionId: string): ApplyResult {
  const b = state.battle!,
    pending = b.pending;
  if (pending?.type !== "heroTrinket") return rejectBattleCommand(state, "缺少饰品技能待选");
  const available = stone(state, pending.command.actorId);
  if (
    !available ||
    "problem" in available ||
    available.held.face !== pending.face ||
    pending.roll !== nextBattleRoll(state.seed, b.rngCursor) ||
    b.usedTrinketIds?.includes(CRITICAL_STONE) ||
    !["continue", CRITICAL_STONE].includes(optionId)
  )
    return rejectBattleCommand(state, "饰品待选已失效，未翻面或结算技能");
  const used = optionId === CRITICAL_STONE;
  const attack: HeroTrinketAttack = {
    roll: pending.roll,
    modifiers: {
      crit: used && pending.face === "upright" ? 2 : 0,
      accuracy: used && pending.face === "inverted" ? -2 : 0,
    },
  };
  const next = {
    ...state,
    battle: {
      ...b,
      pending: null,
      ...(used
        ? {
            usedTrinketIds: [...(b.usedTrinketIds ?? []), CRITICAL_STONE],
            trinkets: {
              ...b.trinkets!,
              held: b.trinkets!.held.map((h) =>
                h.cardId === CRITICAL_STONE
                  ? {
                      ...h,
                      face: h.face === "upright" ? ("inverted" as const) : ("upright" as const),
                    }
                  : h,
              ),
            },
          }
        : {}),
    },
  };
  const result =
    pending.command.type === "playHeroSkill"
      ? playHeroSkill(next, pending.command, undefined, attack)
      : playHeroSkillTargets(next, pending.command, undefined, attack);
  return used
    ? {
        ...result,
        events: [
          {
            type: "trinketUsed",
            actorId: pending.command.actorId,
            cardId: CRITICAL_STONE,
            face: pending.face,
            message: `Critical Stone：使用${pending.face === "upright" ? "正面 Crit +2" : "反面 Acc −2"}并翻面（R26）`,
          },
          ...result.events,
        ],
      }
    : result;
}
