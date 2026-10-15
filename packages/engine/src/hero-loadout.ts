import type { ApplyResult, GameState } from "./command";
import { rejectBattleCommand } from "./battle";
import type { DungeonBattleCatalog, DungeonState } from "./dungeon";
import { buildingLevelsProblem } from "./hamlet-buildings";
import { trinketPoolProblem } from "./trinket-acquisition";

type Hero = DungeonState["heroes"][number];
type Skill = DungeonBattleCatalog["skills"][number];

/** R-051：技能槽 = 2 + HL；饰品槽 = HL。 */
export function heroSkillSlotCount(level: number) {
  return 2 + level;
}
export function heroTrinketSlotCount(level: number) {
  return level;
}

/** 由永久移除阶梯推导当前拥有的 7 张技能（含未装备）；不把 catalog 全量当作持有。 */
export function ownedHeroSkills(
  hero: Pick<Hero, "heroStatId" | "skillIds" | "permanentlyRemovedSkillIds">,
  catalog: DungeonBattleCatalog,
): Skill[] | null {
  const stat = catalog.heroStats.find((s) => s.id === hero.heroStatId);
  if (!stat?.attributesVerified || !stat.name) return null;
  const names = [
    ...new Set(
      catalog.skills
        .filter(
          (s) => s.hero === stat.name && s.level === 1 && s.name && !s.verification.unverified,
        )
        .map((s) => s.name!),
    ),
  ];
  if (names.length !== 7) return null;
  const removed = hero.permanentlyRemovedSkillIds ?? [];
  const owned: Skill[] = [];
  for (const name of names) {
    let level = 1;
    let current: Skill | undefined;
    while (level <= 3) {
      const matches = catalog.skills.filter(
        (s) =>
          s.hero === stat.name &&
          s.name === name &&
          s.level === level &&
          !s.verification.unverified,
      );
      if (matches.length !== 1) return null;
      current = matches[0]!;
      if (!removed.includes(current.id)) break;
      level += 1;
      current = undefined;
    }
    if (!current || level > 3) return null;
    owned.push(current);
  }
  if (new Set(owned.map((s) => s.name)).size !== 7) return null;
  const equipped = hero.skillIds ?? [];
  if (
    equipped.some((id) => !owned.some((s) => s.id === id)) ||
    new Set(equipped).size !== equipped.length
  )
    return null;
  return owned;
}

export function unequippedHeroSkills(
  hero: Pick<Hero, "heroStatId" | "skillIds" | "permanentlyRemovedSkillIds">,
  catalog: DungeonBattleCatalog,
) {
  const owned = ownedHeroSkills(hero, catalog);
  if (!owned) return null;
  const equipped = new Set(hero.skillIds ?? []);
  return owned.filter((s) => !equipped.has(s.id));
}

export type SetEquippedSkillsCommand = {
  readonly type: "setEquippedSkills";
  readonly actorId: string;
  readonly skillIds: readonly string[];
};

/**
 * R11/R32、R-051：村庄期间随时从已拥有的 7 张中装配恰好 2+HL 张。
 * 未装备技能保留永久等级；不占建筑/天数/RNG。饰品槽容量随 HL，不在此重排持牌。
 */
export function setEquippedSkills(
  state: GameState,
  command: SetEquippedSkillsCommand,
): ApplyResult {
  const d = state.dungeon;
  if (
    !d ||
    state.battle ||
    d.phase !== "inHamlet" ||
    d.hamletReturn?.phase !== "complete" ||
    d.pending ||
    d.hamlet?.phase === "eventBlocked" ||
    buildingLevelsProblem(d) ||
    !d.battleCatalog ||
    (d.trinkets !== undefined && trinketPoolProblem(d.trinkets, d.heroes))
  )
    return rejectBattleCommand(state, "换装技能须在已完成回村、没有待选或未结算事件时进行（R32）");
  const hero = d.heroes.find((h) => h.id === command.actorId);
  const level = hero?.level;
  const slots = level !== undefined ? heroSkillSlotCount(level) : 0;
  const owned = hero && d.battleCatalog ? ownedHeroSkills(hero, d.battleCatalog) : null;
  const stat = hero ? d.battleCatalog.heroStats.find((s) => s.id === hero.heroStatId) : undefined;
  if (
    !hero ||
    hero.dead ||
    !hero.attributesVerified ||
    !stat?.attributesVerified ||
    ![1, 2, 3].includes(level!) ||
    stat.level !== level ||
    (hero.heroLevel !== undefined && hero.heroLevel !== level) ||
    !owned ||
    command.skillIds.length !== slots ||
    new Set(command.skillIds).size !== slots ||
    command.skillIds.some((id) => !owned.some((s) => s.id === id)) ||
    command.skillIds.some((id) => hero.permanentlyRemovedSkillIds?.includes(id))
  )
    return rejectBattleCommand(
      state,
      "须从已拥有且未永久移除的技能中装配恰好2+HL张（R-051、R-048）",
    );
  const skillIds = [...command.skillIds];
  const updated = {
    ...hero,
    skillIds,
    ...(hero.combat ? { combat: { ...hero.combat, skillIds } } : {}),
  };
  return {
    state: {
      ...state,
      dungeon: {
        ...d,
        heroes: d.heroes.map((h) => (h.id === hero.id ? updated : h)),
      },
    },
    events: [
      {
        type: "dungeonUpdated",
        message: `${hero.id}换装${slots}个技能槽；未装备的拥有技能保留永久等级，饰品槽容量仍为HL=${level}（R11/R32、R-051）`,
      },
    ],
  };
}
