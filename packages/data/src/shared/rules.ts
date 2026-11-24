import type { HigherHeroDefence } from "../core/heroes/hero-higher-defence.build";
import type { NormalizedHeroStatFile } from "../core/heroes/hero-stat.build";
import type {
  NormalizedHeroSkillCard,
  NormalizedMonsterLargeCard,
  NormalizedMonsterLargeFile,
  NormalizedMonsterMediumCard,
  NormalizedMonsterMediumFile,
  NormalizedVirtueAfflictionCard,
} from "./schema";

type HeroSkillRules = NonNullable<NormalizedHeroSkillCard["rules"]>;

type MonsterFighterCard = Extract<
  NormalizedMonsterMediumCard | NormalizedMonsterLargeCard,
  { skills: readonly unknown[] }
>;
type MonsterSkill = MonsterFighterCard["skills"][number];
type MonsterSkillRules = NonNullable<MonsterSkill["rules"]>;
type MonsterCardRules = NonNullable<MonsterFighterCard["rules"]>;
type VirtueRules = NonNullable<NormalizedVirtueAfflictionCard["rules"]>;

/** 英雄属性卡在 rules 投影里只读这些已核字段；各包的条件防御结构各自校验。 */
export type HeroStatRuleSource = {
  readonly annotation_buff_defence?:
    | {
        readonly resistant: boolean;
        readonly immune: boolean;
        readonly source: "print_front";
      }
    | undefined;
  readonly annotation_condition_defence?:
    | {
        readonly resistances: readonly ("stun" | "bleed" | "blight" | "debuff")[];
        readonly immunities: readonly never[];
        readonly source: "print_front";
        readonly approval: string;
      }
    | undefined;
  readonly annotation_higher_condition_defence?: HigherHeroDefence | undefined;
  readonly rules?:
    | {
        readonly buffDefence?: HeroStatRules["buffDefence"] | undefined;
        readonly conditionDefence?: HeroStatRules["conditionDefence"] | undefined;
        readonly higherConditionDefence?: HigherHeroDefence | undefined;
      }
    | undefined;
};

export type HeroStatRules = {
  buffDefence?: HeroStatRuleSource["annotation_buff_defence"];
  conditionDefence?: HeroStatRuleSource["annotation_condition_defence"];
  higherConditionDefence?: HigherHeroDefence;
};

function compact<T extends object>(rules: T): T | undefined {
  return Object.keys(rules).length > 0 ? rules : undefined;
}

/**
 * R1 双写：`rules` 由旧 `annotation_*` 派生，`annotation_*` 仍保留给引擎读取。
 * 投影只重命名 / 分组字段，不改任何数值、行号或来源。
 */
export function projectHeroSkillRules(card: NormalizedHeroSkillCard): HeroSkillRules | undefined {
  const rules: HeroSkillRules = { ...(card.rules ?? {}) };
  if (card.annotation_status_effects) rules.statuses = card.annotation_status_effects;
  if (card.annotation_damage_bonus) rules.damage = card.annotation_damage_bonus;
  if (card.annotation_damage_bonuses) rules.damageBonuses = card.annotation_damage_bonuses;
  if (card.annotation_actor_damage_bonus) rules.actorDamage = card.annotation_actor_damage_bonus;
  if (card.annotation_range) rules.range = card.annotation_range;
  if (card.annotation_self_range || card.annotation_self_heal || card.annotation_self_stress) {
    const self: NonNullable<HeroSkillRules["self"]> = { ...(card.rules?.self ?? {}) };
    if (card.annotation_self_range) self.range = true;
    if (card.annotation_self_heal) self.heal = card.annotation_self_heal;
    if (card.annotation_self_stress) self.stress = card.annotation_self_stress;
    rules.self = self;
  }
  if (
    card.annotation_target_header ||
    card.annotation_target_heal ||
    card.annotation_target_stress ||
    card.annotation_target_support
  ) {
    const target: NonNullable<HeroSkillRules["target"]> = { ...(card.rules?.target ?? {}) };
    if (card.annotation_target_header) target.header = card.annotation_target_header;
    if (card.annotation_target_heal) target.heal = card.annotation_target_heal;
    if (card.annotation_target_stress) target.stress = card.annotation_target_stress;
    if (card.annotation_target_support) target.support = card.annotation_target_support;
    rules.target = target;
  }
  if (card.annotation_allies_stress !== undefined)
    rules.alliesStress = card.annotation_allies_stress;
  if (card.annotation_rallying_flare) rules.rallyingFlare = card.annotation_rallying_flare;
  if (card.annotation_effect_line_receipts) rules.receipts = card.annotation_effect_line_receipts;
  if (card.annotation_bleed_blight_transfer) rules.transfer = card.annotation_bleed_blight_transfer;
  return compact(rules);
}

export function projectMonsterSkillRules(skill: MonsterSkill): MonsterSkillRules | undefined {
  return compact({ ...(skill.rules ?? {}) });
}

export function projectMonsterCardRules(card: MonsterFighterCard): MonsterCardRules | undefined {
  return compact({ ...(card.rules ?? {}) });
}

export function projectHeroStatRules(card: HeroStatRuleSource): HeroStatRules | undefined {
  const rules = { ...(card.rules ?? {}) } as HeroStatRules;
  if (card.annotation_buff_defence) rules.buffDefence = card.annotation_buff_defence;
  if (card.annotation_condition_defence) rules.conditionDefence = card.annotation_condition_defence;
  if (card.annotation_higher_condition_defence)
    rules.higherConditionDefence = card.annotation_higher_condition_defence;
  return compact(rules);
}

export function projectVirtueRules(card: NormalizedVirtueAfflictionCard): VirtueRules | undefined {
  return compact(card.rules ?? {});
}

/**
 * 用投影结果替换卡上的 rules，并删除仅供注解层使用的 `annotation_*` 字段。
 * 这样 schema / normalized 只暴露 `rules`，旧字段不会落盘。
 */
function withRules<T extends object>(card: T, rules: object | undefined): T {
  const next = { ...card } as Record<string, unknown>;
  for (const key of Object.keys(next)) {
    if (key.startsWith("annotation_")) delete next[key];
  }
  if (rules === undefined) {
    delete next.rules;
    return next as T;
  }
  next.rules = rules;
  return next as T;
}

export function withHeroSkillRules(card: NormalizedHeroSkillCard): NormalizedHeroSkillCard {
  return withRules(card, projectHeroSkillRules(card));
}

export function withHeroStatRules<T extends object>(card: T): T {
  return withRules(card, projectHeroStatRules(card as HeroStatRuleSource));
}

export function withVirtueRules<T extends NormalizedVirtueAfflictionCard>(card: T): T {
  return withRules(card, projectVirtueRules(card));
}

export function withMonsterCardRules<
  T extends NormalizedMonsterMediumCard | NormalizedMonsterLargeCard,
>(card: T): T {
  if (!("skills" in card)) return card;
  const fighter = card as MonsterFighterCard;
  const skills = fighter.skills.map((skill) => withRules(skill, projectMonsterSkillRules(skill)));
  return withRules({ ...fighter, skills }, projectMonsterCardRules(fighter)) as T;
}

export function withMonsterRules<
  T extends NormalizedMonsterMediumFile | NormalizedMonsterLargeFile,
>(file: T): T {
  return { ...file, cards: file.cards.map((card) => withMonsterCardRules(card)) } as T;
}

export type RuleSourceCard =
  | NormalizedHeroSkillCard
  | NormalizedHeroStatFile["cards"][number]
  | NormalizedMonsterMediumCard
  | NormalizedMonsterLargeCard
  | NormalizedVirtueAfflictionCard;

/** 一致性测试入口：按卡类别分派到对应投影。 */
export function projectRules(card: RuleSourceCard): object | undefined {
  if ("role" in card) return projectVirtueRules(card);
  if ("face" in card) return projectHeroStatRules(card as unknown as HeroStatRuleSource);
  if ("skills" in card) return projectMonsterCardRules(card);
  if ("card_kind" in card && card.card_kind === "large_monster_reference") return undefined;
  return projectHeroSkillRules(card);
}
