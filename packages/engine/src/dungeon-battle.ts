import { readRoomTile } from "./room-tile-selection";
import { readDungeonQuestProgress } from "./dungeon-quest";
import { readCampaignLevel } from "./hamlet-campaign";
import { hasApprovedHigherMonsterFields } from "../../data/src/normalize/verified-monster-entry";
import { createBattleState, rejectBattleCommand, skillTargetView } from "./battle";
import type { BattleEntity } from "./battle";
import { roomTileBattleAreas } from "./battle-monster-movement";
import { createLootState } from "./loot";
import { createRng } from "./rng";
import type { ApplyResult, GameState } from "./command";
import type { DungeonState } from "./dungeon";
import { readMonsterAttackView, resolveMonsterSkillEffects } from "./monster-skill";
import { readPrintedRange, readPrintedTargets } from "./hero-skill";
import type { HeroSkillResolution } from "./hero-skill";
import { applyBattleSkillStatuses } from "./battle-skill-status";
import { statusProjection } from "./status";
import { isGuardedDungeonRoom, awaitDungeonRoomCurio } from "./dungeon-curio-room";
import {
  allRuinsRoomCardIds,
  objectiveRoomClearsOnVictory,
  objectiveRoomResolutionAfterVictory,
  readSetAsideRoomCardId,
} from "./dungeon-objective";
import { heroSkillSlotCount } from "./hero-loadout";
import { readMonsterSelfStatuses } from "./monster-self-status";
import type { StatusEffect } from "./status";
import { readBasicQuest } from "../../data/src/basic-quests";
import { stagecoachWaitingTokens, recoveryBuildingLevel } from "./hamlet-buildings";
import { ownedHeroSkills } from "./hero-loadout";
import { dungeonMonsterPoolThrough } from "./monster-pool-runtime";
import {
  applyBossThreatAfterBattleToPool,
  clearedBossThreatScriptIdAfterVictory,
} from "./boss/threat-campaign";
import { recordRuinsBossDefeatOnThreatCleared } from "./boss/establish-imminent-threat";

/** R15–18、R-048、R-051、R-055：只接真实部署，缺字段原子拒绝。 */
export function startDungeonBattle(state: GameState): ApplyResult {
  const d = state.dungeon;
  const selected = readRoomTile(
    d?.roomCards?.cards.find((c) => c.id === d.roomCards?.active?.cardId),
    d?.roomCards?.active?.tileId,
  );
  const active = d?.monsterPool?.active;
  const room = d?.rooms.find((r) => r.id === d.position);
  const refuse = (message: string) => rejectBattleCommand(state, message);
  if (
    !d ||
    state.battle ||
    d.phase !== "awaitingRoom" ||
    d.pending ||
    active?.roomId !== d.position ||
    room?.cleared ||
    !isGuardedDungeonRoom(d) ||
    !d.roomCards?.active?.tileId ||
    d.roomCards.active.roomId !== d.position ||
    selected.status !== "matched" ||
    d.mustLeaveRoomId === d.position ||
    !d.explorationSetup ||
    !d.battleCatalog ||
    d.heroes.length !== 4
  )
    return refuse("需要已核实房间与真实怪物部署，不能创建独立沙盒替代");
  const { tile, deployment } = selected;
  const { heroStats: stats, skills, monsters } = d.battleCatalog;
  if (!partitionsValid(d)) return refuse("房间 / 怪物牌池不守恒，拒绝战斗交接");
  const heroes: BattleEntity[] = [];
  for (const hero of d.heroes) {
    const stat = stats.find((s) => s.id === hero.heroStatId);
    const selected = hero.skillIds?.map((id) => skills.find((s) => s.id === id));
    const slots = heroSkillSlotCount(stat?.level ?? 0);
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
        (s) =>
          !s ||
          s.hero !== stat.name ||
          ![1, 2, 3].includes(s.level) ||
          s.verification.unverified ||
          hero.permanentlyRemovedSkillIds?.includes(s.id) ||
          Array.from({ length: s.level - 1 }, (_, i) => i + 1).some((level) => {
            const previous = skills.filter(
              (c) =>
                c.hero === s.hero &&
                c.name === s.name &&
                c.level === level &&
                !c.verification.unverified,
            );
            return (
              !s.name ||
              previous.length !== 1 ||
              !hero.permanentlyRemovedSkillIds?.includes(previous[0]!.id)
            );
          }),
      )
    )
      return refuse(`${hero.id} 缺少获批属性或${slots || "2+HL"}个有效装备技能（R-048、R-051）`);
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
      areaId: deployment.heroes[hero.stance],
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
  const entities: BattleEntity[] = [];
  const statusProbes: { actorId: string; resolution: HeroSkillResolution }[] = [];
  const selfProbes: { actorId: string; effects: readonly StatusEffect[] }[] = [];
  for (const spawn of active.monsters) {
    const card = monsters.find((m) => m.id === spawn.cardId);
    if (
      !card ||
      !("skills" in card) ||
      card.verification.unverified ||
      card.speed === undefined ||
      !card.stanceGroups
    )
      return refuse(`${spawn.cardId} 的完整战斗字段待核实；保留真实部署，不重抽（R-048）`);
    const identity = d.monsterPool!.cards.find((entry) => entry.combatCardId === spawn.cardId);
    if (
      card.level !== identity?.level ||
      card.level > d.explorationSetup.dungeonLevel ||
      (card.level !== 1 && !hasApprovedHigherMonsterFields(card))
    )
      return refuse(`${card.name} 的等级 / 高等级限定批准不符，保留部署（R-082、R-083、R-048）`);
    if (!Number.isSafeInteger(card.dodge) || card.dodge < 0)
      return refuse(`${card.name} 缺少唯一已核实 Dodge`);
    if (
      !card.resistances ||
      card.resistances.some((icon) => !["confirmed", "confirmed_rulebook"].includes(icon.naming))
    )
      return refuse(`${card.name} 缺少获批抗性栏，不能猜Shuffle防御（R-048）`);
    for (const skill of card.skills) {
      const self = readMonsterSelfStatuses(card, skill.slot);
      if (self.status === "refused") return refuse(`${card.name}：${self.reason}`);
      if (self.status === "ready") {
        selfProbes.push({ actorId: spawn.instanceId, effects: self.effects });
        continue;
      }
      const attack = readMonsterAttackView(card, skill.slot);
      if (attack.status === "refused") return refuse(`${card.name}：${attack.reason}`);
      const range = readPrintedRange(attack.view),
        targets = readPrintedTargets(attack.view);
      if (range.kind !== "exact" || targets.kind !== "exact")
        return refuse(`${card.name} 的技能射程 / 目标尚未完整接入`);
      const probe = resolveMonsterSkillEffects(
        card,
        skill.slot,
        {
          actor: { id: spawn.instanceId, wounds: 0 },
          target: skillTargetView(heroes[0]!),
          areaDistance: range.distance,
          targetsInArea: targets.max,
          light: d.explorationSetup.light,
          shuffleChoice: "push",
          untargetedHeroesBesideTarget: [],
        },
        1,
      );
      if (
        probe.status === "refused" ||
        probe.resolution.skipped.some((e) => e.code === "effect_lines")
      )
        return refuse(
          `${card.name} 技能 ${skill.slot} 的完整效果尚未接入${probe.status === "refused" ? `：${probe.reason}` : ""}，保留部署，不进入半场战斗（R-048）`,
        );
      statusProbes.push({
        actorId: spawn.instanceId,
        resolution: {
          ...probe.resolution,
          targetStatusEffects:
            attack.view.verified_status_effects?.filter((e) => e.scope === "target") ??
            probe.resolution.targetStatusEffects ??
            [],
        },
      });
      if (probe.resolution.targetDisease && !d.conditions)
        return refuse("真实疾病技能需要完整疾病 / 怪癖目录，保留部署，不进入半场战斗（R27）");
    }
    entities.push({
      id: spawn.instanceId,
      side: "monster",
      hero: null,
      monsterCardId: card.id,
      life: card.life,
      dodge: card.dodge,
      areaId: spawn.areaId,
      stance: spawn.stance,
      stanceSlots: spawn.stanceSlots,
      shuffleResist: card.resistances.some((icon) => icon.key === "shuffle_resist"),
      wounds: 0,
      skillIds: [],
      guard: false,
      dead: false,
      ...(card.innateProtection === undefined
        ? {}
        : {
            innateProtection: card.innateProtection,
            protection: card.innateProtection,
          }),
      bleed: [],
      blight: [],
    });
  }
  try {
    const battle = createBattleState(state.seed, {
      roomName: tile.name,
      ...(d.trinkets ? { trinkets: d.trinkets } : {}),
      ...(d.conditions ? { conditions: d.conditions } : {}),
      heroStats: stats,
      entities: [...heroes, ...entities],
      skills,
      monsters,
      areas: roomTileBattleAreas(tile),
      light: d.explorationSetup.light,
      provisions: d.explorationSetup.provisions,
      resolveCards: d.resolveCards,
      lootAreas: deployment.lootAreas,
      lootPool: { ...(d.lootPool ?? createLootState()), gold: d.gold },
      provisionWindows: true,
    }).battle!;
    for (const probe of selfProbes) {
      const statuses = applyBattleSkillStatuses(
        battle,
        battle.entities,
        probe.actorId,
        [],
        undefined,
        battle.rngCursor,
        probe.effects,
      );
      if (statuses.status === "refused") return refuse(`怪物自身效果尚未接入：${statuses.reason}`);
    }
    for (const probe of statusProbes) {
      for (const hero of heroes) {
        const statuses = applyBattleSkillStatuses(battle, battle.entities, probe.actorId, [
          { ...probe.resolution, targetId: hero.id },
        ]);
        if (statuses.status === "refused")
          return refuse(`怪物完整效果尚未接入：${statuses.reason}，保留真实部署（R-048）`);
      }
    }
    return {
      state: {
        ...state,
        dungeon: { ...d, phase: "inBattle" },
        battle: {
          ...battle,
          rngCursor: d.cursor,
          choiceCursor: d.decision,
          resolveDecks: d.resolveDecks,
        },
      },
      events: [
        {
          type: "dungeonUpdated",
          message: `进入 ${tile.name}；保留英雄装备与状态，沿用地牢 RNG / 补给 / 有限宝箱池（R15–18）`,
        },
      ],
    };
  } catch (error) {
    return refuse(`战斗交接数据无效：${error instanceof Error ? error.message : String(error)}`);
  }
}

/** R25、R-059：仅完成的战斗可回传一次；R-068 / mutualWipeout 不发胜利或撤退奖励。 */
export function finishDungeonBattle(state: GameState): ApplyResult {
  const d = state.dungeon,
    b = state.battle,
    active = d?.monsterPool?.active;
  const turn = b?.encounter?.turn;
  const wipedOut = turn?.type === "halted" && turn.reason === "heroesDefeated";
  if (
    !d ||
    !b ||
    d.phase !== "inBattle" ||
    active?.roomId !== d.position ||
    d.roomCards?.active?.roomId !== d.position ||
    (turn?.type !== "finished" && !wipedOut) ||
    b.pending ||
    b.shuffleIntents.length ||
    b.shuffleContinuation ||
    !b.loot ||
    b.loot.placed.length
  )
    return rejectBattleCommand(
      state,
      "战斗尚未完成或仍有待选 / 全灭停点，不能回传奖励（R25、Q-52）",
    );
  let pool = d.monsterPool!;
  if (
    !partitionsValid(d) ||
    !Number.isSafeInteger(b.rngCursor) ||
    b.rngCursor < d.cursor ||
    d.heroes.some(
      (h) =>
        !b.entities.some(
          (e) =>
            e.id === h.id &&
            e.side === "hero" &&
            e.life === h.life &&
            e.stance &&
            e.stress !== undefined,
        ),
    )
  )
    return rejectBattleCommand(state, "战后英雄 / 牌池 / RNG 交接不一致，保持原状态");
  if (turn.type === "finished" && b.entities.every((e) => e.side !== "hero" || e.dead))
    return rejectBattleCommand(
      state,
      "英雄全灭不能伪装成胜利或第四轮撤退；保持全灭停点（R25/R-068）",
    );
  if (wipedOut) {
    const dead = b.entities.filter((e) => e.side === "hero");
    const prepared = d.preparedReplacements ?? [];
    const waiting = stagecoachWaitingTokens(d);
    const quest = readBasicQuest(d.questDistribution);
    const catalog = d.battleCatalog;
    if (
      !quest ||
      quest.level !== readCampaignLevel(d) ||
      waiting === null ||
      !catalog ||
      d.pending ||
      d.replacementPreparation ||
      waiting + prepared.length > recoveryBuildingLevel(d, "stagecoach") + 1 ||
      d.heroes.length !== 4 ||
      new Set(d.heroes.map((h) => h.id)).size !== 4 ||
      dead.length !== 4 ||
      new Set(dead.map((h) => h.id)).size !== 4 ||
      dead.some(
        (h) => !h.dead || h.heroStatId !== d.heroes.find((old) => old.id === h.id)?.heroStatId,
      ) ||
      !b.entities.some((e) => e.side === "monster" && !e.dead) ||
      turn.type !== "halted" ||
      turn.monstersDefeated === true ||
      new Set(prepared.map((p) => p.deadHeroId)).size !== prepared.length ||
      new Set(prepared.map((p) => p.hero.id)).size !== prepared.length ||
      prepared.some(({ deadHeroId, hero }) => {
        const stat = catalog.heroStats.find((s) => s.id === hero.heroStatId);
        return (
          !dead.some((h) => h.id === deadHeroId) ||
          !stat?.attributesVerified ||
          !hero.attributesVerified ||
          hero.level !== stat.level ||
          hero.heroLevel !== stat.level ||
          hero.life !== stat.life ||
          !hero.id ||
          dead.some((h) => h.id === hero.id) ||
          hero.dead ||
          hero.wounds !== 0 ||
          hero.stress !== 0 ||
          hero.diseaseId ||
          hero.quirkIds?.length ||
          hero.resolveCardId ||
          hero.resolveTested ||
          hero.combat ||
          hero.statusStacks?.length ||
          hero.nextQuestSkillUpgrades?.length ||
          !Number.isSafeInteger(hero.xp) ||
          hero.xp! < 0 ||
          hero.skillIds?.length !== heroSkillSlotCount(stat.level) ||
          !ownedHeroSkills(hero, catalog) ||
          d.deadHeroNames?.includes(stat.name)
        );
      }) ||
      new Set(prepared.map((p) => catalog.heroStats.find((s) => s.id === p.hero.heroStatId)!.name))
        .size !== prepared.length
    )
      return rejectBattleCommand(
        state,
        "普通任务全灭需要四名真实死者、匹配任务、有效驿站和替补记录（R9/R25）",
      );
    if (waiting + prepared.length < 4)
      return {
        state: { ...state, dungeon: { ...d, campaignFailure: "insufficientWaitingHeroes" } },
        events: [
          {
            type: "dungeonUpdated",
            message: "英雄全灭，驿站及已准备替补不足四人，战役失败；未扣代币或发奖励（R9/R25）",
          },
        ],
      };
  }
  const ids = [
    ...(pool.remaining ?? []),
    ...pool.discarded,
    ...active.monsters.map((m) => m.instanceId),
  ];
  const threatPool = applyBossThreatAfterBattleToPool(d, pool, active.monsters, ids);
  pool = threatPool.pool;
  const shuffledIds = [...threatPool.instanceIds];
  const clearedThreatId = clearedBossThreatScriptIdAfterVictory(state);
  const rng = createRng(state.seed);
  for (let i = 0; i < b.rngCursor; i++) rng.next();
  for (let i = shuffledIds.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [shuffledIds[i], shuffledIds[j]] = [shuffledIds[j]!, shuffledIds[i]!];
  }
  const victory = turn.type === "finished" && turn.outcome === "victory";
  const heroes = d.heroes.map((hero) => {
    const entity = b.entities.find((e) => e.id === hero.id && e.side === "hero")!;
    return {
      ...hero,
      combat: entity,
      wounds: entity.wounds,
      stress: entity.stress!,
      stance: entity.stance!,
      dead: entity.dead,
      resolveTested: entity.resolveTested,
      resolveCardId: entity.resolveCardId ?? undefined,
      diseaseId: entity.diseaseId ?? null,
      quirkIds: entity.quirkIds ?? [],
      ...(entity.deathReason ? { deathReason: entity.deathReason } : {}),
      statusStacks: entity.statusStacks ?? [],
    };
  });
  const fundraiser = d.questDistribution?.questId === "quest:p003";
  if (fundraiser) {
    const progress = readDungeonQuestProgress({
      ...d,
      roomCards: { ...d.roomCards!, active: null },
      monsterPool: { ...pool, active: null },
    });
    if (progress.status !== "matched") return rejectBattleCommand(state, progress.reason);
  }
  const kind = d.rooms.find((r) => r.id === d.position)?.kind;
  const curioReward = victory && kind === "curio";
  const objectiveRecovery =
    victory && kind === "objective"
      ? objectiveRoomResolutionAfterVictory(d, d.position)
      : undefined;
  const clearsRoom = victory && objectiveRoomClearsOnVictory(d, kind);
  const bonus = victory ? (kind === "treasure" ? 20 : fundraiser && kind === "lair" ? 10 : 0) : 0;
  const activeCardId = d.roomCards!.active!.cardId;
  const setAside = readSetAsideRoomCardId(d);
  const { curioRoom: previousCurio, ...returnedDungeon } = d;
  const dungeonBase = clearedThreatId
    ? (() => {
        const { activeBossThreatScriptId: _cleared, ...rest } = returnedDungeon;
        void _cleared;
        return recordRuinsBossDefeatOnThreatCleared(rest, clearedThreatId);
      })()
    : returnedDungeon;
  const { battle: _finished, ...outside } = state;
  void _finished;
  const threatRemovedNote =
    threatPool.removedCombatCardIds.length > 0
      ? `；威胁永久移出 ${threatPool.removedCombatCardIds.join("、")}`
      : "";
  const threatClearedNote = clearedThreatId ? `；击败 Boss，清除迫近威胁 ${clearedThreatId}` : "";
  const result: ApplyResult = {
    state: {
      ...outside,
      dungeon: {
        ...dungeonBase,
        heroes,
        phase: heroes.some((h) => h.dead)
          ? "awaitingReplacement"
          : curioReward || objectiveRecovery
            ? "awaitingRoom"
            : "ready",
        ...(curioReward ? { curioRoom: { ...previousCurio!, stage: "reward" } } : {}),
        ...(heroes.some((h) => h.dead)
          ? { replacementResume: curioReward ? ("roomCurio" as const) : ("ready" as const) }
          : {}),
        cursor: b.rngCursor + shuffledIds.length - 1,
        decision: b.choiceCursor,
        gold: b.loot.gold + bonus,
        lootPool: { ...b.loot, gold: b.loot.gold + bonus },
        resolveDecks: b.resolveDecks ?? d.resolveDecks,
        ...(b.conditions ? { conditions: b.conditions } : {}),
        ...(b.trinkets ? { trinkets: b.trinkets } : {}),
        scoutBonus: false,
        mustLeaveRoomId: victory ? undefined : d.position,
        explorationSetup: {
          ...d.explorationSetup!,
          light: b.light,
          provisions: b.provisions ?? [],
        },
        monsterPool: { ...pool, remaining: shuffledIds, discarded: [], active: null },
        roomCards: {
          ...d.roomCards!,
          active: null,
          discard:
            activeCardId === setAside
              ? (d.roomCards!.discard ?? [])
              : [...(d.roomCards!.discard ?? []), activeCardId],
        },
        ...(objectiveRecovery ? { roomResolution: objectiveRecovery } : {}),
        rooms: d.rooms.map((r) =>
          r.id === d.position && clearsRoom ? { ...r, cleared: true } : r,
        ),
      },
    },
    events: [
      {
        type: "dungeonUpdated",
        message: victory
          ? objectiveRecovery
            ? `胜利返回地图：须再花费行动拾取任务目标后目标房才算清理；旁置房间牌保留（R15、QUEST p4）`
            : `胜利返回地图：房间已清理${bonus ? `，${kind === "treasure" ? "宝藏" : "Fundraiser巢穴"}奖励 +${bonus} 金币` : ""}；房间牌弃置、怪物洗回（R15、R25）${threatRemovedNote}${threatClearedNote}`
          : wipedOut
            ? `英雄全灭按逃跑返回地图：房间未清理，无房间奖励，等待全部替补入队；房间牌弃置、怪物洗回（R9/R25/R31）${threatRemovedNote}`
            : `第四轮撤退返回地图：房间未清理，必须先离开；房间牌弃置、怪物洗回（R25）${threatRemovedNote}`,
      },
    ],
  };
  if (!curioReward || heroes.some((h) => h.dead)) return result;
  const reward = awaitDungeonRoomCurio(result.state);
  return { ...reward, events: [...result.events, ...reward.events] };
}

function partitionsValid(d: DungeonState): boolean {
  const pool = d.monsterPool,
    rooms = d.roomCards;
  if (!pool?.active || !rooms?.active) return false;
  const level = d.explorationSetup?.dungeonLevel ?? readCampaignLevel(d);
  if (![1, 2, 3].includes(level)) return false;
  const catalog = dungeonMonsterPoolThrough(pool, level);
  const ids = [
    ...(pool.remaining ?? []),
    ...pool.discarded,
    ...pool.active.monsters.map((m) => m.instanceId),
  ];
  const roomIds = allRuinsRoomCardIds(d, rooms.active.cardId);
  return (
    ids.length === catalog.length &&
    new Set(ids).size === catalog.length &&
    ids.every((id) => catalog.some((c) => c.instanceId === id)) &&
    pool.active.monsters.every((m) =>
      catalog.some(
        (c) =>
          c.instanceId === m.instanceId && c.cardId === m.cardId && c.stanceSlots === m.stanceSlots,
      ),
    ) &&
    roomIds.length === 9 &&
    new Set(roomIds).size === 9 &&
    roomIds.every((id) => rooms.cards.some((c) => c.id === id && c.location === "ruins" && !c.boss))
  );
}
