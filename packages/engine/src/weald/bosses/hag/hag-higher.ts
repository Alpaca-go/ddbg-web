import {
  defaultBossSlotPlacementHook,
  defaultFaceTheThreatEmbarkHook,
} from "../../../core/bosses/default-boss-hooks";
import printed from "../../../../../data/normalized/extension/weald/hag_higher.json";
import { wealdHagHigherContentSchema } from "../../../../../data/src/weald/bosses/hag/hag-higher";
import { getBossScript, registerBossScript } from "../../../core/bosses/registry";
import { DEFAULT_BOSS_BATTLE_RULES } from "../../../core/bosses/rules";
import type { BossScriptDefinition } from "../../../core/bosses/types";
import { projectHagCombatFaces } from "./hag-i-projection";
import { captureHagHero, releaseHagHero } from "./hag-i-captive";
import { bossEnabledForPacks } from "../../../../../data/src/shared/content-packs";
import { FACE_THE_THREAT_QUEST_ID } from "../../../core/bosses/quest-bridge";
import { rejectBattleCommand } from "../../../shared/battle/battle";
import type { GameState } from "../../../shared/core/command";

const content = wealdHagHigherContentSchema.parse(printed);
export function hagHigherContext(level: 2 | 3) {
  const card = content.cards.find((c) => c.level === level)!;
  const hagId = card.faces[0]!.rawId;
  const emptyId = card.faces[1]!.rawId;
  const fullId = `${emptyId}:back`;
  return {
    scriptId: `boss:weald:hag:${level}` as const,
    matchesEncounter: (state: GameState) => {
      const d = state.dungeon;
      const scriptId = `boss:weald:hag:${level}` as const;
      return (
        d?.activeBossThreatScriptId === scriptId &&
        bossEnabledForPacks(d.contentPacks, scriptId) &&
        d.questDistribution?.questId === FACE_THE_THREAT_QUEST_ID &&
        d.campaignLevel === level &&
        d.imminentThreatDescriptionCardId === card.abilities.descriptionCardId
      );
    },
    hagId,
    emptyId,
    fullId,
    catalog: projectHagCombatFaces(card.faces, { hag: hagId, empty: emptyId, full: fullId }),
  };
}

// 本批注册供独立运行时验证；不写入 Boss 描述抽选目录或授予出征资格。
const scripts: BossScriptDefinition[] = content.cards.map((card) => {
  const scriptId = `boss:weald:hag:${card.level}` as const;
  const ability = card.abilities.hagCardId;
  return {
    id: scriptId,
    displayName: `Hag ${card.level === 2 ? "II" : "III"}`,
    rules: DEFAULT_BOSS_BATTLE_RULES,
    combatEntry: {
      descriptionAbilityCardId: card.abilities.descriptionCardId,
      combatAbilityCardId: ability,
      combatMonsterCardId: card.faces[0]!.rawId,
      printedInitiativeCards: 2,
      printedActionsPerRound: 2,
    },
    hooks: {
      faceTheThreatEmbark: defaultFaceTheThreatEmbarkHook,
      bossSlotPlacement: defaultBossSlotPlacementHook,
      intoThePot: () => ({
        status: "ok",
        effect: "forceIntoThePotWhileCauldronEmptyEachTurn",
        skillSlot: 1,
        sourceAbilityCardId: ability,
        rulesRef: ["R-267", ability],
      }),
      monsterTurnActionCount: () => ({ status: "ok", value: 2 }),
      threatPassiveDungeon: () => ({
        status: "ok",
        effect: "stressOnHeroProvisionUse",
        stressDelta: 1,
        provisions: card.abilities.threats.dungeon.provisions,
        sourceAbilityCardId: ability,
        rulesRef: ["R-267", ability],
      }),
      threatPassiveHamlet: () => ({
        status: "ok",
        effect: "sanitariumHealLifeDelta",
        healDelta: -card.abilities.threats.hamlet.sanitariumHealingReduction,
        sourceAbilityCardId: ability,
        rulesRef: ["R-267", ability],
      }),
    },
  };
});
export function ensureHagHigherScriptsRegistered() {
  for (const script of scripts) if (!getBossScript(script.id)) registerBossScript(script);
}

/** R-267：技能命中和 Self Pull 先行完成；本原语只处理入锅／翻面。 */
export function captureHagHigherHero(state: GameState, level: 2 | 3, heroId: string) {
  return captureHagHero(state, heroId, hagHigherContext(level));
}
export function releaseHagHigherHero(state: GameState, level: 2 | 3, areaId?: string) {
  return releaseHagHero(state, hagHigherContext(level), areaId);
}

/** R-256／R-267：死亡由生命／压力入口先结算；死亡英雄不释放到区域。 */
export function clearDeadHagHigherCaptive(state: GameState, level: 2 | 3) {
  const context = hagHigherContext(level);
  const b = state.battle;
  const captive = b?.hagCauldron;
  const pot = b?.entities.find(
    (e) => e.id === captive?.cauldronId && e.monsterCardId === context.fullId,
  );
  if (
    !b ||
    !captive?.hero.dead ||
    !pot ||
    !context.matchesEncounter(state) ||
    (b.pending && b.pending.type !== "hagRelease") ||
    b.entities.some((e) => e.id === captive.hero.id)
  )
    return rejectBattleCommand(state, "R-267：没有本等级已死亡的锅内英雄可清理");
  const empty = context.catalog[1]!;
  const { hagCauldron: _captive, ...rest } = b;
  void _captive;
  return {
    state: {
      ...state,
      battle: {
        ...rest,
        pending: null,
        entities: [
          ...b.entities.map((e) =>
            e.id === pot.id
              ? {
                  ...e,
                  monsterCardId: empty.id,
                  life: empty.life!,
                  wounds: 0,
                  dead: false,
                  dodge: empty.dodge!,
                  protection: empty.innateProtection!,
                  innateProtection: empty.innateProtection!,
                }
              : e,
          ),
          { ...captive.hero, areaId: pot.areaId },
        ],
      },
    },
    events: [
      { type: "dungeonUpdated" as const, message: "R-267：移走死亡锅内英雄，空锅翻面并清伤口" },
    ],
  };
}
