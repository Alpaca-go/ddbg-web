import type { HigherHeroDefence } from "./hero-higher-defence";
import type { NormalizedHeroStatFile } from "./hero-stat";
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
  readonly verified_buff_defence?:
    | {
        readonly resistant: boolean;
        readonly immune: boolean;
        readonly source: "print_front";
      }
    | undefined;
  readonly verified_condition_defence?:
    | {
        readonly resistances: readonly ("stun" | "bleed" | "blight" | "debuff")[];
        readonly immunities: readonly never[];
        readonly source: "print_front";
        readonly approval: string;
      }
    | undefined;
  readonly verified_higher_condition_defence?: HigherHeroDefence | undefined;
};

export type HeroStatRules = {
  buffDefence?: HeroStatRuleSource["verified_buff_defence"];
  conditionDefence?: HeroStatRuleSource["verified_condition_defence"];
  higherConditionDefence?: HigherHeroDefence;
};

function compact<T extends object>(rules: T): T | undefined {
  return Object.keys(rules).length > 0 ? rules : undefined;
}

/**
 * R1 双写：`rules` 由旧 `verified_*` 派生，`verified_*` 仍保留给引擎读取。
 * 投影只重命名 / 分组字段，不改任何数值、行号或来源。
 */
export function projectHeroSkillRules(card: NormalizedHeroSkillCard): HeroSkillRules | undefined {
  const rules: HeroSkillRules = {};
  // 单元 5 已写入的文本规则不属于 verified_*，投影时原样保留。
  if (card.rules?.shuffle) rules.shuffle = card.rules.shuffle;
  if (card.rules?.ignores) rules.ignores = card.rules.ignores;
  // A2 单元 2 的条件移除规则同样直接写在 rules 下。
  if (card.rules?.removal) rules.removal = card.rules.removal;
  // A2 单元 3 的区域目标数同样直接写在 rules 下。
  if (card.rules?.targets) rules.targets = card.rules.targets;
  if (card.verified_status_effects) rules.statuses = card.verified_status_effects;
  if (card.verified_damage_bonus) rules.damage = card.verified_damage_bonus;
  if (card.verified_damage_bonuses) rules.damageBonuses = card.verified_damage_bonuses;
  if (card.verified_actor_damage_bonus) rules.actorDamage = card.verified_actor_damage_bonus;
  if (card.verified_range) rules.range = card.verified_range;
  if (card.verified_self_range || card.verified_self_heal || card.verified_self_stress) {
    const self: NonNullable<HeroSkillRules["self"]> = {};
    if (card.verified_self_range) self.range = true;
    if (card.verified_self_heal) self.heal = card.verified_self_heal;
    if (card.verified_self_stress) self.stress = card.verified_self_stress;
    rules.self = self;
  }
  if (
    card.verified_target_header ||
    card.verified_target_heal ||
    card.verified_target_stress ||
    card.verified_target_support
  ) {
    const target: NonNullable<HeroSkillRules["target"]> = {};
    if (card.verified_target_header) target.header = card.verified_target_header;
    if (card.verified_target_heal) target.heal = card.verified_target_heal;
    if (card.verified_target_stress) target.stress = card.verified_target_stress;
    if (card.verified_target_support) target.support = card.verified_target_support;
    rules.target = target;
  }
  if (card.verified_allies_stress !== undefined) rules.alliesStress = card.verified_allies_stress;
  if (card.verified_rallying_flare) rules.rallyingFlare = card.verified_rallying_flare;
  if (card.verified_effect_line_receipts) rules.receipts = card.verified_effect_line_receipts;
  if (card.verified_bleed_blight_transfer) rules.transfer = card.verified_bleed_blight_transfer;
  return compact(rules);
}

export function projectMonsterSkillRules(skill: MonsterSkill): MonsterSkillRules | undefined {
  const rules: MonsterSkillRules = {};
  if (skill.verified_damage_bonus) rules.damage = skill.verified_damage_bonus;
  if (skill.verified_actor_damage_bonus) rules.actorDamage = skill.verified_actor_damage_bonus;
  if (skill.verified_effect_line_receipts) rules.receipts = skill.verified_effect_line_receipts;
  if (skill.verified_bleed_blight_transfer) rules.transfer = skill.verified_bleed_blight_transfer;
  if (skill.verified_range) rules.range = skill.verified_range;
  if (skill.verified_self_range || skill.verified_self_heal || skill.verified_self_stress) {
    const self: NonNullable<MonsterSkillRules["self"]> = {};
    if (skill.verified_self_range) self.range = true;
    if (skill.verified_self_heal) self.heal = skill.verified_self_heal;
    if (skill.verified_self_stress) self.stress = skill.verified_self_stress;
    rules.self = self;
  }
  if (
    skill.verified_target_header ||
    skill.verified_target_heal ||
    skill.verified_target_stress ||
    skill.verified_target_support
  ) {
    const target: NonNullable<MonsterSkillRules["target"]> = {};
    if (skill.verified_target_header) target.header = skill.verified_target_header;
    if (skill.verified_target_heal) target.heal = skill.verified_target_heal;
    if (skill.verified_target_stress) target.stress = skill.verified_target_stress;
    if (skill.verified_target_support) target.support = skill.verified_target_support;
    rules.target = target;
  }
  if (skill.verified_allies_stress !== undefined) rules.alliesStress = skill.verified_allies_stress;
  if (skill.verified_monster_effects) rules.effects = skill.verified_monster_effects;
  if (skill.verified_weald_attack) rules.wealdAttack = skill.verified_weald_attack;
  return compact(rules);
}

export function projectMonsterCardRules(card: MonsterFighterCard): MonsterCardRules | undefined {
  return card.verified_weald_profile ? { wealdProfile: card.verified_weald_profile } : undefined;
}

export function projectHeroStatRules(card: HeroStatRuleSource): HeroStatRules | undefined {
  const rules: HeroStatRules = {};
  if (card.verified_buff_defence) rules.buffDefence = card.verified_buff_defence;
  if (card.verified_condition_defence) rules.conditionDefence = card.verified_condition_defence;
  if (card.verified_higher_condition_defence)
    rules.higherConditionDefence = card.verified_higher_condition_defence;
  return compact(rules);
}

export function projectVirtueRules(card: NormalizedVirtueAfflictionCard): VirtueRules | undefined {
  return card.verified_turn_start ? { turnStart: card.verified_turn_start } : undefined;
}

/** 用投影结果替换卡上的 rules；没有规则时删掉空对象，保持 JSON 干净。 */
function withRules<T extends object>(card: T, rules: object | undefined): T {
  if (rules === undefined) {
    if (!("rules" in card)) return card;
    const next: Record<string, unknown> = { ...card };
    delete next.rules;
    return next as T;
  }
  return { ...card, rules } as T;
}

export function withHeroSkillRules(card: NormalizedHeroSkillCard): NormalizedHeroSkillCard {
  return withRules(card, projectHeroSkillRules(card));
}

export function withHeroStatRules<T extends HeroStatRuleSource>(card: T): T {
  return withRules(card, projectHeroStatRules(card));
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
  if ("face" in card) return projectHeroStatRules(card);
  if ("skills" in card) return projectMonsterCardRules(card);
  if ("card_kind" in card && card.card_kind === "large_monster_reference") return undefined;
  return projectHeroSkillRules(card);
}
