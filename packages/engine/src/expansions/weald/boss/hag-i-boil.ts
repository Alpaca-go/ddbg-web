import { rejectBattleCommand, skillTargetView, writeResolution } from "../../../battle";
import type { ApplyResult, GameState, MonsterSkillResolvedEvent } from "../../../command";
import { resolveMonsterSkillEffects } from "../../../monster-skill";
import { applySkillHealth } from "../../../battle-health";
import { resolveBattlePressure } from "../../../pressure";
import { nextBattleRoll, recordMonsterSkill } from "../../../encounter";
import { resolveEncounterBossScriptId } from "../../../boss/encounter-rules";
import { buildHagICombatCatalog } from "./hag-i-projection";
import { HAG_I_SCRIPT_ID, HAG_I_CAULDRON_EMPTY_MONSTER_CARD_ID } from "./hag-i";

/** R-254–R-256：锅内英雄只在内部生命／压力结算视图中出现，不参与板块选区。 */
export function applyHagIBoil(state: GameState, actorId: string): ApplyResult {
  const b = state.battle;
  const captive = b?.hagCauldron;
  const actor = b?.entities.find((e) => e.id === actorId);
  const full = buildHagICombatCatalog()[2]!;
  const card = b?.monsters?.find((c) => c.id === actor?.monsterCardId);
  if (
    !b ||
    !captive ||
    !actor ||
    actor.dead ||
    captive.hero.dead ||
    b.pending ||
    b.monsterAction ||
    captive.cauldronId !== actorId ||
    b.encounter?.turn.type !== "monster" ||
    b.encounter.turn.actorId !== actorId ||
    resolveEncounterBossScriptId(state) !== HAG_I_SCRIPT_ID ||
    card?.id !== full.id ||
    actor.life !== full.life ||
    card.verification.unverified ||
    JSON.stringify(card.skills) !== JSON.stringify(full.skills)
  )
    return rejectBattleCommand(state, "R-254：Boil 需要核准 Full 卡面、当前锅回合和锅内英雄");
  const captiveView = { ...captive.hero, areaId: actor.areaId };
  const roll = nextBattleRoll(state.seed, b.rngCursor);
  const effects = resolveMonsterSkillEffects(
    card,
    1,
    {
      actor: { id: actor.id, wounds: actor.wounds },
      target: skillTargetView(captiveView, b),
      areaDistance: 0,
      light: b.light,
    },
    roll,
  );
  if (effects.status === "refused") return rejectBattleCommand(state, effects.reason);
  const view = { ...b, entities: [...b.entities, captiveView] };
  const entities = view.entities.map((e) =>
    writeResolution(e, actorId, captive.hero.id, effects.resolution, false),
  );
  const health = applySkillHealth(view, entities, effects, state.seed, b.rngCursor + 1, actorId);
  if (health.status === "refused") return rejectBattleCommand(state, health.reason);
  const pressure = resolveBattlePressure({
    state: {
      ...state,
      battle: { ...view, entities: health.entities, rngCursor: health.rngCursor },
    },
    events: health.events,
  });
  if (pressure.events.some((e) => e.type === "commandRefused"))
    return rejectBattleCommand(state, "Boil 锅内生命／压力结算缺少核准数据");
  const next = pressure.state.battle!;
  const { areaId: _area, ...hero } = next.entities.find((e) => e.id === captive.hero.id)!;
  void _area;
  const event: MonsterSkillResolvedEvent = {
    type: "monsterSkillResolved",
    actorId,
    skillSlot: 1,
    roll,
    actorDead: false,
    resolution: effects.resolution,
    message: "Boil：结算锅内英雄",
  };
  const { hagCauldron: _old, ...rest } = next;
  void _old;
  const empty = buildHagICombatCatalog().find(
    (c) => c.id === HAG_I_CAULDRON_EMPTY_MONSTER_CARD_ID,
  )!;
  const result: ApplyResult = {
    state: {
      ...pressure.state,
      battle: {
        ...rest,
        ...(hero.dead ? {} : { hagCauldron: { ...captive, hero } }),
        entities: next.entities
          .filter((e) => hero.dead || e.id !== hero.id)
          .map((e) =>
            hero.dead && e.id === actorId
              ? {
                  ...e,
                  monsterCardId: empty.id,
                  life: empty.life,
                  wounds: 0,
                  dodge: empty.dodge!,
                  innateProtection: empty.innateProtection!,
                  protection: empty.innateProtection!,
                }
              : e,
          ),
      },
    },
    events: [event, ...pressure.events],
  };
  return recordMonsterSkill(result, event, hero.dead ? [hero.id] : []);
}
