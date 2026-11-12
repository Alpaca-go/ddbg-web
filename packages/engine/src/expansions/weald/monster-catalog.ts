import {
  normalizedMonsterLargeFileSchema,
  normalizedMonsterMediumFileSchema,
} from "../../../../data/src/normalize/schema";
import { WEALD_MONSTER_PROFILES } from "../../../../data/src/normalize/verified-weald-monsters";
import {
  WEALD_MONSTER_ATTACKS,
  wealdMonsterProfileSchema,
} from "../../../../data/src/weald-monster-rulings";
import type { MonsterCardView, MonsterSkillView } from "../../monster-skill";
import { readMonsterAttackView } from "../../monster-skill";

export type WealdBattleMonster = MonsterCardView & {
  readonly skills: readonly (MonsterSkillView & { readonly target: string })[];
  readonly name: string;
  readonly level: 1;
  readonly dodge: number;
  readonly speed: number;
  readonly stanceSlots: 1 | 2;
};

/** R-230 / R-232：仅将完整核准语义投影为战斗目录，原始图标审阅标记保持不变。 */
export function buildWealdMonsterCatalog(
  mediumInput: unknown,
  largeInput: unknown,
): WealdBattleMonster[] {
  const medium = normalizedMonsterMediumFileSchema.parse(mediumInput);
  const large = normalizedMonsterLargeFileSchema.parse(largeInput);
  for (const file of [medium, large]) {
    if (
      file.sources.raw !== `extract/extension/weald/raw/${file.category}.json` ||
      file.sources.parsed !== `extract/extension/weald/parsed/${file.category}.json`
    )
      throw new Error("Weald 战斗目录来源不符");
  }
  const expectedMedium = new Set([
    ...WEALD_MONSTER_PROFILES.filter((p) => p.stanceSlots === 1).map((p) => p.cardId),
    "monster_medium:weald:p004",
    "monster_medium:weald:p005",
  ]);
  if (
    medium.cards.length !== 6 ||
    new Set(medium.cards.map((c) => c.id)).size !== 6 ||
    medium.cards.some((c) => !expectedMedium.has(c.id)) ||
    large.cards.length !== 1 ||
    large.cards[0]?.id !== "monster_large:weald:p001"
  )
    throw new Error("Weald 战斗目录缺卡、重复或混入非本批条目");
  for (const page of [4, 5]) {
    const reference = medium.cards.find((c) => c.id === `monster_medium:weald:p00${page}`)!;
    if (
      !("card_kind" in reference) ||
      reference.name !== "Large Ectoplasm" ||
      reference.level !== 1 ||
      reference.copies !== 1 ||
      JSON.stringify(reference.pages) !== `[${page}]`
    )
      throw new Error("Weald 大型参考卡不符");
  }
  const sources = [...medium.cards, ...large.cards];
  return WEALD_MONSTER_PROFILES.map((profile) => {
    const source = sources.find((c) => c.id === profile.cardId);
    if (!source || !("skills" in source)) throw new Error("Weald 战斗卡缺失");
    const receipt = wealdMonsterProfileSchema.parse(source.verified_weald_profile);
    if (
      JSON.stringify(receipt) !== JSON.stringify(profile) ||
      source.name !== profile.name ||
      source.level !== 1 ||
      source.life !== profile.life ||
      source.dodge !== profile.dodge ||
      source.speed !== profile.speed ||
      source.copies !== profile.pages.length ||
      JSON.stringify(source.pages) !== JSON.stringify(profile.pages) ||
      JSON.stringify(source.stanceGroups) !== JSON.stringify(profile.stanceGroups) ||
      source.type_position_tags.includes("Large") !== (profile.stanceSlots === 2) ||
      source.resistances.length !== 1 ||
      source.resistances[0]?.iconId !== profile.resistanceIcon ||
      source.immunities.length !== 0
    )
      throw new Error(`Weald R-232 属性或来源漂移：${source.id}`);
    const expected = WEALD_MONSTER_ATTACKS.filter((entry) => entry.cardId === source.id);
    if (
      source.skills.length !== expected.length ||
      new Set(source.skills.map((s) => s.slot)).size !== expected.length
    )
      throw new Error("Weald 技能缺失或重复");
    const skills: (MonsterSkillView & { readonly target: string })[] = source.skills.map(
      (skill) => {
        if (!skill.verified_weald_attack || skill.target === null)
          throw new Error("Weald 技能未经 R-230 核准");
        return {
          slot: skill.slot,
          name: skill.name,
          target: skill.target,
          printed_labels: skill.printed_labels,
          unlabeled_numbers: skill.unlabeled_numbers,
          lines: skill.lines,
          effect_lines: skill.effect_lines,
          verified_weald_attack: skill.verified_weald_attack,
        };
      },
    );
    const card: WealdBattleMonster = {
      id: source.id,
      name: profile.name,
      level: 1,
      life: profile.life,
      dodge: profile.dodge,
      speed: profile.speed,
      stanceSlots: profile.stanceSlots,
      type_position_tags: [...source.type_position_tags],
      stanceGroups: structuredClone(profile.stanceGroups),
      resistances: [{ key: `${profile.resistance}_resist`, naming: "confirmed" }],
      immunities: [],
      skills,
      verification: { unverified: false },
    };
    for (const skill of skills) {
      const attack = readMonsterAttackView(card, skill.slot);
      if (attack.status === "refused") throw new Error(`Weald 核准技能漂移：${attack.reason}`);
    }
    return card;
  });
}
