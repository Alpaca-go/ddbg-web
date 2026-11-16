import type {
  ApplyResult,
  GameState,
  HeroSkillResolvedEvent,
  HeroSkillEmptyAreaResolvedEvent,
  MonsterSkillResolvedEvent,
} from "../../../command";
import {
  recordEncounterSkill,
  recordMonsterSkill,
  finishTurnStartAfterStatus,
} from "../../../encounter";
import { rejectBattleCommand } from "../../../battle";
import { readHagRuntimeContext } from "./hag-runtime-context";
import { releaseHagHero } from "./hag-i-captive";

/** 只保存尚未完成的收尾，不保存或重放攻击、回合开始状态及其 RNG。 */
export type HagReleaseResume =
  | {
      readonly type: "heroSkill";
      readonly resolved: HeroSkillResolvedEvent | HeroSkillEmptyAreaResolvedEvent;
      readonly casualtyIds: readonly string[];
    }
  | {
      readonly type: "monsterSkill";
      readonly resolved: MonsterSkillResolvedEvent;
      readonly casualtyIds: readonly string[];
    }
  | {
      readonly type: "turnStart";
      readonly actorId: string;
      readonly dead: boolean;
      readonly stunned: boolean;
      readonly casualtyIds: readonly string[];
    }
  | { readonly type: "hagSecond" };

/** R-254／R-255／W4：先释放，再处理锅翻面、Hag 清场及原技能／回合收尾。 */
export function beginHagIRelease(
  result: ApplyResult,
  resume: HagReleaseResume,
): ApplyResult | null {
  const b = result.state.battle;
  const captive = b?.hagCauldron;
  const context = readHagRuntimeContext(result.state);
  if (!b || !captive || !context) return null;
  const pot = b.entities.find((e) => e.id === captive.cauldronId);
  if (!pot || pot.monsterCardId !== context.fullId)
    return rejectBattleCommand(result.state, "R-255：锅内英雄缺少对应 Full 实体");
  const hagDead = b.entities.some((e) => e.monsterCardId === context.hagId && e.dead);
  const atDoor = captive.hero.life !== undefined && captive.hero.wounds >= captive.hero.life;
  if (!hagDead && !pot.dead && !(pot.life !== undefined && pot.wounds >= pot.life) && !atDoor)
    return null;
  if (b.pending?.type === "hagRelease") return { ...result, pendingChoice: b.pending.choice };
  const offered = releaseHagHero(result.state, context);
  if (offered.events.some((e) => e.type === "commandRefused")) return offered;
  const pending = offered.state.battle!.pending!;
  if (pending.type !== "hagRelease")
    return rejectBattleCommand(result.state, "R-255：释放选择上下文缺失");
  return {
    ...offered,
    state: {
      ...offered.state,
      battle: { ...offered.state.battle!, pending: { ...pending, resume } },
    },
    events: [...result.events, ...offered.events],
  };
}

export function chooseHagIRelease(state: GameState, areaId: string): ApplyResult {
  const pending = state.battle?.pending;
  if (pending?.type !== "hagRelease") return rejectBattleCommand(state, "释放选择不存在或已过期");
  const context = readHagRuntimeContext(state);
  if (!context) return rejectBattleCommand(state, "Hag 释放上下文与核准等级不符");
  const resume = pending.resume;
  const released = releaseHagHero(state, context, areaId);
  if (!resume || released.events.some((e) => e.type === "commandRefused")) return released;
  switch (resume.type) {
    case "heroSkill":
      return recordEncounterSkill(released, resume.resolved, resume.casualtyIds);
    case "monsterSkill":
      return recordMonsterSkill(released, resume.resolved, resume.casualtyIds, true);
    case "turnStart":
      return finishTurnStartAfterStatus(
        released,
        resume.actorId,
        resume.dead,
        resume.stunned,
        resume.casualtyIds,
      );
    case "hagSecond":
      return released;
  }
}
