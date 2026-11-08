import geometry from "../../../data/normalized/corebox/room_tile_geometry.json";
import { necromancerRoomSchema } from "../../../data/src/normalize/necromancer-room";
import { roomCatalogSchema } from "../../../data/src/room";
import { createBattleState, rejectBattleCommand } from "../battle";
import type { BattleEntity } from "../battle";
import type { ApplyResult, GameState } from "../command";
import { roomTileBattleAreas } from "../battle-monster-movement";
import { skillBelongsToFormalHero } from "../formal-roster-catalog";
import { ownedHeroSkills, questHeroSkillCount } from "../hero-loadout";
import { statusProjection } from "../status";
import { createLootState } from "../loot";
import { getBossScript } from "./registry";
import { resolveBossScriptIdForQuest } from "./quest-bridge";
import {
  NECROMANCER_I_SCRIPT_ID,
  NECROMANCER_I_COMBAT_MONSTER_CARD_ID,
  NECROMANCER_I_DESCRIPTION_ABILITY_CARD_ID,
  NECROMANCER_I_SUMMON_MONSTER_CARD_ID,
} from "./necromancer-i";
import {
  NECROMANCER_II_SCRIPT_ID,
  NECROMANCER_II_COMBAT_MONSTER_CARD_ID,
  NECROMANCER_II_DESCRIPTION_ABILITY_CARD_ID,
  NECROMANCER_II_SUMMON_MONSTER_CARD_ID,
} from "./necromancer-ii";
import {
  NECROMANCER_III_SCRIPT_ID,
  NECROMANCER_III_COMBAT_MONSTER_CARD_ID,
  NECROMANCER_III_DESCRIPTION_ABILITY_CARD_ID,
  NECROMANCER_III_SUMMON_MONSTER_CARD_ID,
} from "./necromancer-iii";

type NecromancerLevel = 1 | 2 | 3;

const DEPLOY_LEVELS = {
  1: {
    script: NECROMANCER_I_SCRIPT_ID,
    card: NECROMANCER_I_COMBAT_MONSTER_CARD_ID,
    summon: NECROMANCER_I_SUMMON_MONSTER_CARD_ID,
    description: NECROMANCER_I_DESCRIPTION_ABILITY_CARD_ID,
    entity: "boss:necromancer:1",
    label: "Necromancer I",
    ruling: "R-166/172",
  },
  2: {
    script: NECROMANCER_II_SCRIPT_ID,
    card: NECROMANCER_II_COMBAT_MONSTER_CARD_ID,
    summon: NECROMANCER_II_SUMMON_MONSTER_CARD_ID,
    description: NECROMANCER_II_DESCRIPTION_ABILITY_CARD_ID,
    entity: "boss:necromancer:2",
    label: "Necromancer II",
    ruling: "R-166 几何 / R-172 模式",
  },
  3: {
    script: NECROMANCER_III_SCRIPT_ID,
    card: NECROMANCER_III_COMBAT_MONSTER_CARD_ID,
    summon: NECROMANCER_III_SUMMON_MONSTER_CARD_ID,
    description: NECROMANCER_III_DESCRIPTION_ABILITY_CARD_ID,
    entity: "boss:necromancer:3",
    label: "Necromancer III",
    ruling: "R-135 / R-166 几何 / R-172 模式",
  },
} as const;

function buildHeroEntities(
  state: GameState,
  refuse: (message: string) => ApplyResult,
  label: string,
): BattleEntity[] | ApplyResult {
  const d = state.dungeon!;
  const { heroStats: stats, skills } = d.battleCatalog!;
  const heroes: BattleEntity[] = [];
  for (const hero of d.heroes) {
    const stat = stats.find((entry) => entry.id === hero.heroStatId);
    const selected = hero.skillIds?.map((id) => skills.find((skill) => skill.id === id));
    const slots = questHeroSkillCount(hero);
    if (
      !stat ||
      !stat.attributesVerified ||
      ![1, 2, 3].includes(stat.level) ||
      hero.level !== stat.level ||
      (hero.heroLevel !== undefined && hero.heroLevel !== stat.level) ||
      hero.life !== stat.life ||
      !hero.stance ||
      hero.dead ||
      hero.wounds === undefined ||
      !selected ||
      selected.length !== slots ||
      new Set(hero.skillIds).size !== slots ||
      selected.some(
        (skill) =>
          !skill ||
          !skillBelongsToFormalHero(stat.name ?? "", skill) ||
          ![1, 2, 3].includes(skill.level) ||
          skill.verification.unverified,
      ) ||
      !ownedHeroSkills(hero, d.battleCatalog!)
    )
      return refuse(`${hero.id} 缺少获批属性或有效装备技能，不能部署 ${label}（R-048、R-051）`);
    heroes.push({
      ...hero.combat,
      diseaseId: hero.diseaseId ?? null,
      quirkIds: hero.quirkIds ?? [],
      ...(hero.deathReason ? { deathReason: hero.deathReason } : {}),
      id: hero.id,
      side: "hero",
      hero: stat.name,
      heroStatId: stat.id,
      heroLevel: stat.level,
      life: stat.life,
      skillIds: hero.skillIds!,
      stance: hero.stance,
      areaId: "G",
      wounds: hero.wounds,
      stress: hero.stress,
      dodge: stat.dodge,
      dead: false,
      guard: hero.combat?.guard ?? false,
      bleed: hero.combat?.bleed ?? [],
      blight: hero.combat?.blight ?? [],
      ...(hero.statusStacks
        ? {
            statusStacks: hero.statusStacks,
            ...statusProjection(hero.statusStacks, hero.combat?.innateProtection),
          }
        : {}),
      ...(hero.resolveTested === undefined ? {} : { resolveTested: hero.resolveTested }),
      ...(hero.resolveCardId === undefined ? {} : { resolveCardId: hero.resolveCardId }),
    });
  }
  return heroes;
}

/**
 * R-166/172：只接 Necromancer 真实几何部署；I 级沿用 R-172，
 * II 级沿用同一获批房间与四英雄姿态，不开放普通房间选择或修改 combatReady。
 */
function deployNecromancer(state: GameState, level: NecromancerLevel): ApplyResult {
  const cfg = DEPLOY_LEVELS[level];
  const d = state.dungeon;
  const plan = d?.faceTheThreatEmbarkPlan;
  const active = d?.roomCards?.active;
  const room = d?.rooms.find((r) => r.id === d.position);
  const refuse = (message: string) => rejectBattleCommand(state, message);
  if (
    !d ||
    state.battle ||
    d.phase !== "awaitingRoom" ||
    d.pending ||
    d.mustLeaveRoomId === d.position ||
    room?.kind !== "objective" ||
    room.cleared ||
    !Number.isSafeInteger(d.cursor) ||
    d.cursor < 0 ||
    !Number.isSafeInteger(d.decision) ||
    d.decision < 0 ||
    d.monsterPool?.active ||
    !["standard", "radiant", "stygian"].includes(d.mode) ||
    d.campaignLevel !== level ||
    d.questDistribution?.questId !== "quest:p019" ||
    d.activeBossThreatScriptId !== cfg.script ||
    d.imminentThreatDescriptionCardId !== cfg.description ||
    plan?.questId !== "quest:p019" ||
    plan.resolvedScriptId !== cfg.script ||
    plan.roomPlacement !== "edgeRoomsR30" ||
    active?.roomId !== d.position ||
    active.cardId !== "room:p010" ||
    active.tileId !== undefined ||
    !d.battleCatalog ||
    !d.explorationSetup ||
    d.explorationSetup.dungeonLevel !== level ||
    d.heroes.length !== 4 ||
    new Set(d.heroes.map((h) => h.stance)).size !== 4
  )
    return refuse(`需要已绑定 ${cfg.label} 专属目标房、真实出征计划和四英雄（${cfg.ruling}）`);
  const id = resolveBossScriptIdForQuest("quest:p019", d);
  const entry = id ? getBossScript(id)?.combatEntry : undefined;
  if (
    id !== cfg.script ||
    !entry ||
    (Object.keys(entry) as (keyof typeof entry)[]).some((k) => entry[k] !== plan.combatEntry[k])
  )
    return refuse(`${cfg.label} 出征战斗卡与实际威胁不一致（R30、${cfg.ruling}）`);
  const card = d.roomCards!.cards.find((c) => c.id === active.cardId);
  const tile = necromancerRoomSchema.safeParse(
    geometry.tiles.find((t) => t.roomId === active.cardId),
  );
  if (
    !roomCatalogSchema.safeParse(d.roomCards!.cards).success ||
    !card?.boss ||
    card.name !== "Necromancer Room" ||
    card.location !== "ruins" ||
    !tile.success
  )
    return refuse(`Necromancer Room 身份或获批几何无效（R-166/172）`);
  const monsters = d.battleCatalog.monsters;
  const boss = monsters.find((c) => c.id === cfg.card);
  const summoned = monsters.find((c) => c.id === cfg.summon);
  if (!boss || !summoned || !Number.isSafeInteger(boss.life) || boss.life! <= 0)
    return refuse(`缺少 ${cfg.label} 或召唤物真实战斗卡（R38、R-048）`);
  const dodge = boss.header_unlabeled_numbers?.find(
    (n) => n.anchor.type === "beside_icon" && n.anchor.inside_icon?.key === "dodge",
  )?.numeric;
  if (!Number.isSafeInteger(dodge) || dodge! < 0)
    return refuse(`${cfg.label} 缺少已核实 Dodge（R-048）`);
  const heroes = buildHeroEntities(state, refuse, cfg.label);
  if (!Array.isArray(heroes)) return heroes;
  try {
    const b = createBattleState(state.seed, {
      roomName: card.name,
      heroStats: d.battleCatalog.heroStats,
      skills: d.battleCatalog.skills,
      monsters,
      entities: [
        ...heroes,
        {
          id: cfg.entity,
          side: "monster",
          hero: null,
          monsterCardId: boss.id,
          life: boss.life!,
          dodge: dodge!,
          stance: "aggressive",
          stanceSlots: 1,
          areaId: tile.data.deployment.monsters.aggressive,
          wounds: 0,
          skillIds: [],
          guard: false,
          dead: false,
          bleed: [],
          blight: [],
          ...(boss.innateProtection === undefined
            ? {}
            : { innateProtection: boss.innateProtection, protection: boss.innateProtection }),
        },
      ],
      areas: roomTileBattleAreas(tile.data),
      light: d.explorationSetup.light,
      provisions: d.explorationSetup.provisions,
      resolveCards: d.resolveCards,
      ...(d.conditions ? { conditions: d.conditions } : {}),
      ...(d.trinkets ? { trinkets: d.trinkets } : {}),
      lootPool: { ...(d.lootPool ?? createLootState()), gold: d.gold },
      provisionWindows: true,
    }).battle!;
    const message = `${cfg.label} 已按 ${cfg.ruling} 部署：Boss 进攻姿态/A，四英雄/G；等待显式 startBattle 洗先攻。完整 Boss 准入与 combatReady 停点保持。`;
    return {
      state: {
        ...state,
        dungeon: {
          ...d,
          phase: "inBattle",
          roomCards: {
            ...d.roomCards!,
            active: { ...active, tileId: tile.data.id, blockedReason: message },
          },
        },
        battle: {
          ...b,
          rngCursor: d.cursor,
          choiceCursor: d.decision,
          resolveDecks: d.resolveDecks,
        },
      },
      events: [{ type: "dungeonUpdated", message }],
    };
  } catch (e) {
    return refuse(`${cfg.label} 部署无效：` + (e instanceof Error ? e.message : String(e)));
  }
}

export function deployNecromancerI(state: GameState): ApplyResult {
  return deployNecromancer(state, 1);
}

/** R-166 几何 + R-172 模式：Necromancer II 生产入口。 */
export function deployNecromancerII(state: GameState): ApplyResult {
  return deployNecromancer(state, 2);
}

/** R-135 / R-166 / R-172：Necromancer III 生产入口。 */
export function deployNecromancerIII(state: GameState): ApplyResult {
  return deployNecromancer(state, 3);
}
