import { discardHeldTrinket } from "../trinket-acquisition";
import type { ApplyResult, Command, GameState } from "../command";
import type { DungeonState } from "../dungeon";
import { rejectBattleCommand } from "../battle";
import { higherRuinsThreat } from "./higher-ruins-threat";
import { nextBattleRoll } from "../battle-roll";
import { caretakerBuilding } from "../hamlet-event";
import { graveyardServices, recoveryServices, survivalistServices } from "../hamlet-buildings";
import { readHeroPassiveDefence } from "../battle-skill-status";
import { applyPassiveStatus } from "../passive-runtime";
import { triggerDungeonPassive } from "../dungeon-passive";
import { resolveDungeonPressure } from "../dungeon-pressure";

function visitedBuilding(state: GameState, command: Command): string | undefined {
  if (command.type === "visitGuild") return "guild";
  if (command.type === "visitBlacksmith") return "blacksmith";
  if (command.type === "visitNomadWagon") return "nomadWagon";
  if (command.type !== "visitHamletBuilding") return undefined;
  if (command.serviceId === "graveyardGuard") return "graveyard";
  return [
    ...recoveryServices(state.dungeon!),
    ...survivalistServices(state.dungeon!),
    ...graveyardServices,
  ].find((s) => s.id === command.serviceId)?.building;
}

/** 所有村庄技能/建筑入口共用收尾，包含需要待选续接的建筑，不重复执行已支付行动。 */
export function applyHigherRuinsHamlet(
  before: GameState,
  command: Command,
  result: ApplyResult,
): ApplyResult {
  const old = before.dungeon,
    h = old?.hamlet;
  let d: DungeonState = result.state.dungeon!;
  if (
    !old ||
    before.battle ||
    (old.phase !== "inHamlet" &&
      !old.pressureSource?.startsWith("hamlet") &&
      !old.replacementResume?.startsWith("hamlet")) ||
    !h ||
    !d?.hamlet ||
    result.events.some((e) => e.type === "commandRefused") ||
    result.state === before
  )
    return result;
  const effect = higherRuinsThreat(d, "hamlet");
  if (!effect) return result;
  const events = [...result.events];
  let visits = { ...(h.higherThreatVisits ?? {}) };
  const building = visitedBuilding(before, command);
  if (building && "actorId" in command) visits = { ...visits, [building]: command.actorId };
  if (effect.kind === "hamletSkillDebuff" && command.type === "useHamletSkill") {
    const hero = d.heroes.find((e) => e.id === command.actorId);
    if (!hero || !d.battleCatalog)
      return rejectBattleCommand(before, "Stupid Acts 缺英雄或完整防御（R-048）");
    if (!hero.dead) {
      const applied = applyPassiveStatus(
        hero,
        { kind: "debuff", duration: 4 },
        "target",
        readHeroPassiveDefence(d.battleCatalog, hero),
      );
      if (applied.status === "refused") return rejectBattleCommand(before, applied.reason);
      const updated = applied.hero;
      d = {
        ...d,
        heroes: d.heroes.map((e) =>
          e.id === hero.id
            ? {
                ...updated,
                ...(updated.combat
                  ? {
                      combat: {
                        ...updated.combat,
                        statusStacks: updated.statusStacks!,
                        debuffStacks:
                          updated.statusStacks?.filter((s) => s.kind === "debuff").length ?? 0,
                      },
                    }
                  : {}),
              }
            : e,
        ),
      };
      events.push({
        type: "dungeonUpdated",
        message: `${hero.id} Stupid Acts：使用村庄技能后 Debuff 4t`,
      });
    }
  }
  const ended =
    h.phase === "heroActions" &&
    (d.hamlet!.phase === "awaitingCaretaker" || d.hamlet!.phase === "preparationComplete");
  d = { ...d, hamlet: { ...d.hamlet!, higherThreatVisits: ended ? {} : visits } };
  if (!ended || !["hamletGoldTheft", "hamletTrinketTheft", "lynchMob"].includes(effect.kind))
    return { ...result, state: { ...result.state, dungeon: d }, events };
  const roll = nextBattleRoll(result.state.seed, d.cursor),
    hit = caretakerBuilding(roll)!;
  d = { ...d, cursor: d.cursor + 1 };
  const heroId = visits[hit];
  const hero = d.heroes.find((e) => e.id === heroId && !e.dead);
  events.push({
    type: "dungeonUpdated",
    message: `${effect.kind} 日末 d10 ${roll} → ${hit}${hero ? `（${hero.id}）` : "，无人"}`,
  });
  if (!hero) return { ...result, state: { ...result.state, dungeon: d }, events };
  if (effect.kind === "hamletGoldTheft") {
    const amount = nextBattleRoll(result.state.seed, d.cursor);
    const lost = Math.min(d.gold, amount);
    const gold = d.gold - lost;
    d = {
      ...d,
      cursor: d.cursor + 1,
      gold,
      ...(d.lootPool ? { lootPool: { ...d.lootPool, gold } } : {}),
    };
    events.push({ type: "dungeonUpdated", message: `Lust for Gold：掷 ${amount}，金币 −${lost}` });
  } else if (effect.kind === "hamletTrinketTheft") {
    const held = d.trinkets?.held.filter((t) => t.heroId === hero.id) ?? [];
    if (held.length) {
      const choice = {
        id: `hamlet-snatch:${d.decision}`,
        actorId: hero.id,
        prompt: "Snatch!：选择被偷的饰品，放入原等级弃牌堆",
        options: held.map((t) => ({
          id: t.cardId,
          label: d.trinkets!.cards.find((c) => c.id === t.cardId)!.upright_half.name,
        })),
      };
      d = {
        ...d,
        pending: choice,
        decision: d.decision + 1,
        higherThreatTheft: { heroId: hero.id, roll, building: hit },
      };
      return { state: { ...result.state, dungeon: d }, events, pendingChoice: choice };
    }
  } else {
    if (!Number.isSafeInteger(hero.level) || hero.level! < 1 || hero.level! > 3)
      return rejectBattleCommand(before, "Lynch Mob 缺英雄等级（R-048）");
    const applied = triggerDungeonPassive(d, result.state.seed, [hero.id], {
      type: "stress",
      amount: 2,
      woundAmounts: [2 * hero.level!],
    });
    if (applied.status === "refused") return rejectBattleCommand(before, applied.reason);
    d = applied.dungeon;
    events.push(...applied.events);
    if (d.heroes.some((e) => e.dead || e.stress === 10)) {
      const settled = resolveDungeonPressure({
        ...result.state,
        dungeon: { ...d, phase: "blockedPressure", pressureSource: "hamletThreat" },
      });
      return { ...settled, events: [...events, ...settled.events] };
    }
  }
  return { ...result, state: { ...result.state, dungeon: d }, events };
}

/** 同一日末的骰面与行动已提交；选择只弃置一次，不重掷或推进准备日。 */
export function chooseHigherRuinsTheft(state: GameState, command: Command): ApplyResult {
  const d = state.dungeon!,
    theft = d.higherThreatTheft,
    choice = d.pending;
  if (
    !theft ||
    !choice ||
    command.type !== "resolveChoice" ||
    choice.id !== command.choiceId ||
    !choice.options.some((o) => o.id === command.optionId) ||
    !d.trinkets?.held.some((t) => t.cardId === command.optionId && t.heroId === theft.heroId)
  )
    return rejectBattleCommand(state, "Snatch! 饰品选择无效或已过期");
  const discarded = discardHeldTrinket(d.trinkets, command.optionId);
  if (discarded.status === "refused") return rejectBattleCommand(state, discarded.reason);
  const { higherThreatTheft: _theft, ...rest } = d;
  void _theft;
  return {
    state: { ...state, dungeon: { ...rest, pending: null, trinkets: discarded.pool } },
    events: [
      { type: "dungeonUpdated", message: `Snatch!：${command.optionId} 被偷并进入原等级弃牌堆` },
    ],
  };
}
