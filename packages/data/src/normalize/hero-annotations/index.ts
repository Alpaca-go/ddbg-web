import type { NormalizedHeroSkillCard } from "../schema";
import { coreHigherRows as bountyHunterHigherRows } from "./h03-bounty-hunter";
import { coreHigherRows as jesterHigherRows } from "./h06-jester";
import { coreHigherRows as plagueDoctorHigherRows } from "./h07-plague-doctor";
import { coreHigherRows as arbalestHigherRows } from "./h08-arbalest";
import { coreHigherRows as graveRobberHigherRows } from "./h09-grave-robber";
import { coreHigherRows as occultistHigherRows } from "./h10-occultist";
import { coreHigherRows as abominationHigherRows } from "./h11-abomination";
import { manAtArmsAnnotations } from "./h12-man-at-arms";
import { flagellantAnnotations } from "./h13-flagellant";
import { leperAnnotations } from "./h14-leper";
import { antiquarianAnnotations } from "./h15-antiquarian";
import { shieldbreakerAnnotations } from "./h16-shieldbreaker";
import { houndmasterAnnotations } from "./h17-houndmaster";
import { musketeerAnnotations } from "./h18-musketeer";
import type { CoreHigherSkillRow, HeroAnnotationModule } from "./types";

export type {
  CoreHigherSkillFlags,
  CoreHigherSkillRow,
  HeroAnnotationApplier,
  HeroAnnotationModule,
} from "./types";

/**
 * 核心盒 II/III 级逐卡注解，按 hNN 拼接。
 * 同一张卡只会出现在一个英雄文件里，顺序不影响 `core-higher-skills` 的按 id 查找。
 */
export const CORE_HIGHER_SKILL_ROWS: readonly CoreHigherSkillRow[] = [
  ...bountyHunterHigherRows,
  ...jesterHigherRows,
  ...plagueDoctorHigherRows,
  ...arbalestHigherRows,
  ...graveRobberHigherRows,
  ...occultistHigherRows,
  ...abominationHigherRows,
];

/**
 * 已入库的逐卡审校模块，按 hNN 升序排列。
 * 每个模块只碰自己英雄的卡，顺序不影响结果；新增英雄时在对应位置插入。
 */
export const HERO_ANNOTATIONS: readonly HeroAnnotationModule[] = [
  manAtArmsAnnotations,
  flagellantAnnotations,
  leperAnnotations,
  antiquarianAnnotations,
  shieldbreakerAnnotations,
  houndmasterAnnotations,
  musketeerAnnotations,
];

export function applyHeroAnnotations(
  cards: readonly NormalizedHeroSkillCard[],
): NormalizedHeroSkillCard[] {
  return HERO_ANNOTATIONS.reduce<NormalizedHeroSkillCard[]>(
    (current, module) => module.apply(current),
    [...cards],
  );
}
