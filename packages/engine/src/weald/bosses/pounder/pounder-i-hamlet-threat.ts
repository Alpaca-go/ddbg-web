import type { DungeonState } from "../../../shared/dungeon/dungeon";
import type { ApplyResult, Command, GameState } from "../../../shared/core/command";
import { rejectBattleCommand } from "../../../shared/battle/battle";
import { hamletBuildingForCommand } from "../../../core/bosses/ruins/higher-ruins-hamlet";
import { nextBattleRoll } from "../../../shared/battle/battle-roll";
import { caretakerBuilding } from "../../../shared/hamlet/hamlet-event";
import {
  buildingLevelsProblem,
  recoveryBuildingLevel,
  upgradableBuildings,
} from "../../../shared/hamlet/hamlet-buildings";
import { triggerDungeonPassive } from "../../../shared/dungeon/dungeon-passive";
import { resolveDungeonPressure } from "../../../shared/dungeon/dungeon-pressure";
import { statusProjection } from "../../../shared/core/status";
import { passiveDamageWounds } from "../../../shared/core/passive";
import { pounderDungeonThreatActive, readPounderThreatContext } from "./pounder-i-dungeon-threat";
import { resolvePounderIBombardment } from "./pounder-i-threat";

/** 统一公开命令收尾：记录付款后的占用，待选续接只消费一次日末。 */
export function applyPounderIHamletThreat(
  before: GameState,
  command: Command,
  result: ApplyResult,
): ApplyResult {
  const old = before.dungeon,
    h = old?.hamlet;
  let d = result.state.dungeon;
  if (
    !old?.pounderHamletThreats ||
    !pounderDungeonThreatActive(before) ||
    before.battle ||
    !h ||
    !d?.hamlet ||
    result.state === before ||
    result.events.some((e) => e.type === "commandRefused")
  )
    return result;
  let visits = { ...h.pounderBuildingHeroes };
  const building = hamletBuildingForCommand(before, command);
  if (building && "actorId" in command) visits = { ...visits, [building]: command.actorId };
  const ended =
    h.phase === "heroActions" &&
    (d.hamlet.phase === "awaitingCaretaker" || d.hamlet.phase === "preparationComplete");
  d = { ...d, hamlet: { ...d.hamlet, pounderBuildingHeroes: ended ? {} : visits } };
  if (!ended) return { ...result, state: { ...result.state, dungeon: d } };
  if (buildingLevelsProblem(d)) return rejectBattleCommand(before, "Pounder 轰炸建筑等级无效");
  const target = (id: NonNullable<ReturnType<typeof caretakerBuilding>>) => {
    const key = upgradableBuildings.find((b) => b === id);
    return {
      level: key ? recoveryBuildingLevel(d!, key) : (1 as const),
      heroId: d!.heroes.some((hero) => hero.id === visits[id] && !hero.dead) ? visits[id]! : null,
    };
  };
  if (!Number.isSafeInteger(d.cursor) || d.cursor < 0 || d.cursor === Number.MAX_SAFE_INTEGER)
    return rejectBattleCommand(before, "Pounder 轰炸缺有效 RNG 游标");
  const roll = nextBattleRoll(result.state.seed, d.cursor);
  const removedCaretaker = command.type === "useHamletSkill" && command.skill === "intimidate";
  const caretaker =
    removedCaretaker || h.caretaker === null
      ? null
      : Array.from({ length: 10 }, (_, i) => caretakerBuilding(i + 1)).find(
          (id) => id === h.caretaker,
        );
  if (caretaker === undefined) return rejectBattleCommand(before, "Pounder 轰炸缺有效看守人记录");
  const outcome = resolvePounderIBombardment(
    roll,
    caretaker,
    {
      survivalist: target("survivalist"),
      tavern: target("tavern"),
      sanitarium: target("sanitarium"),
      abbey: target("abbey"),
      graveyard: target("graveyard"),
      guild: target("guild"),
      blacksmith: target("blacksmith"),
      nomadWagon: target("nomadWagon"),
    },
    readPounderThreatContext(before)!.threats.hamlet.heroDamage,
  );
  d = { ...d, cursor: d.cursor + 1 };
  const events = [
    ...result.events,
    {
      type: "dungeonUpdated" as const,
      message: `Bombardment ${readPounderThreatContext(before)!.level === 1 ? "I" : readPounderThreatContext(before)!.level === 2 ? "II" : "III"}：d10 ${roll} → ${outcome.building}，${outcome.effect === "damageHero" ? `${outcome.heroId}受到${outcome.damage}伤害` : outcome.effect === "downgradeBuilding" ? `建筑降至${outcome.level}级` : outcome.reason === "caretaker" ? "看守人在场，轰炸无效" : "建筑已处于最低等级"}（R-259）`,
    },
  ];
  if (outcome.effect === "downgradeBuilding") {
    const key = upgradableBuildings.find((b) => b === outcome.building);
    if (!key) return rejectBattleCommand(before, "Pounder 不能降低未定义等级的建筑");
    d = { ...d, buildingLevels: { ...d.buildingLevels, [key]: outcome.level } };
  }
  if (outcome.effect === "damageHero") {
    const victim = d.heroes.find((hero) => hero.id === outcome.heroId);
    if (!victim?.attributesVerified)
      return rejectBattleCommand(before, "Pounder 轰炸缺核准英雄属性");
    // 村庄轰炸直接伤害，无攻击掷骰；由统一生命处理保留死门骰与被动。
    const hurt = triggerDungeonPassive(d, result.state.seed, [outcome.heroId], {
      type: "stress",
      amount: 0,
      woundAmounts: [outcome.damage, ...passiveDamageWounds(victim)],
    });
    if (hurt.status === "refused") return rejectBattleCommand(before, hurt.reason);
    d = hurt.dungeon;
    events.push(...hurt.events);
    const passive = triggerDungeonPassive(d, result.state.seed, [outcome.heroId], "damageTaken");
    if (passive.status === "refused") return rejectBattleCommand(before, passive.reason);
    d = passive.dungeon;
    events.push(...passive.events);
    d = syncCombat(d, outcome.heroId);
    if (d.heroes.some((hero) => hero.dead || hero.stress === 10)) {
      const settled = resolveDungeonPressure({
        ...result.state,
        dungeon: { ...d, phase: "blockedPressure", pressureSource: "hamletThreat" },
      });
      return {
        ...settled,
        state: { ...settled.state, dungeon: syncCombat(settled.state.dungeon!, outcome.heroId) },
        events: [...events, ...settled.events],
      };
    }
  }
  return { ...result, state: { ...result.state, dungeon: d }, events };
}

function syncCombat(d: DungeonState, heroId: string): DungeonState {
  return {
    ...d,
    heroes: d.heroes.map((hero) =>
      hero.id === heroId && hero.combat
        ? {
            ...hero,
            combat: {
              ...hero.combat,
              wounds: hero.wounds!,
              stress: hero.stress,
              dead: hero.dead ?? false,
              ...(hero.statusStacks
                ? {
                    statusStacks: hero.statusStacks,
                    ...statusProjection(
                      hero.statusStacks,
                      hero.innateProtection ?? hero.combat.innateProtection,
                    ),
                  }
                : {}),
            },
          }
        : hero,
    ),
  };
}
