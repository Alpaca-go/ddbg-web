import { directAttackSchema } from "../../shared/effects";
import type { DirectAttack } from "../../shared/effects";
import type { NormalizedHeroSkillCard } from "../../shared/schema";

type AttackFace = Pick<DirectAttack, "stances" | "range" | "monsterTargets">;
type ReviewedAttack = {
  accuracy: number;
  critical: number;
  hitDamage: number;
  critDamage: number;
  status: { amount: number; duration: number };
  debuffDuration?: number;
  statusKind?: "blight";
};
const meleeStances: AttackFace["stances"] = ["ranged", "defensive", "aggressive"];
const rangedStances: AttackFace["stances"] = ["ranged", "defensive"];
const adjacentMelee = { stances: meleeStances, range: 1, monsterTargets: 1 };
const sameAreaMelee = { ...adjacentMelee, range: 0 };
const adjacentRanged = { ...adjacentMelee, stances: rangedStances };
const harvest = { ...adjacentRanged, monsterTargets: 2 };
const caltrops: AttackFace = {
  stances: ["support", ...rangedStances],
  range: 2,
  monsterTargets: 1,
};

const noxiousBlast = { ...caltrops, range: 1 };
const plagueGrenade: AttackFace = { stances: ["support", "ranged"], range: 2, monsterTargets: 2 };

function frontAttack(face: AttackFace, review: ReviewedAttack): DirectAttack {
  return {
    ...face,
    hit: { threshold: review.accuracy, damage: review.hitDamage },
    critical: { threshold: review.critical, damage: review.critDamage },
    onHit: [
      { kind: review.statusKind ?? "bleed", ...review.status },
      ...(review.debuffDuration === undefined
        ? []
        : [{ kind: "debuff" as const, duration: review.debuffDuration }]),
    ],
  };
}

/** 核心盒技能正面 p031–033、p061–063、p082–084、p109–111、p124–132、p136–138。规则书 R19–21、R-018。 */
const DIRECT_ATTACKS: Readonly<Partial<Record<string, DirectAttack>>> = {
  "hero_skill:core:h02:p031": frontAttack(adjacentMelee, {
    accuracy: 9,
    critical: 0,
    hitDamage: 5,
    critDamage: 8,
    status: { amount: 2, duration: 2 },
  }),
  "hero_skill:core:h02:p032": frontAttack(adjacentMelee, {
    accuracy: 10,
    critical: 0,
    hitDamage: 6,
    critDamage: 11,
    status: { amount: 3, duration: 3 },
  }),
  "hero_skill:core:h02:p033": frontAttack(adjacentMelee, {
    accuracy: 10,
    critical: 0,
    hitDamage: 8,
    critDamage: 15,
    status: { amount: 4, duration: 3 },
  }),
  "hero_skill:core:h03:p061": frontAttack(caltrops, {
    accuracy: 9,
    critical: 1,
    hitDamage: 1,
    critDamage: 2,
    status: { amount: 2, duration: 3 },
    debuffDuration: 1,
  }),
  "hero_skill:core:h03:p062": frontAttack(caltrops, {
    accuracy: 10,
    critical: 1,
    hitDamage: 2,
    critDamage: 3,
    status: { amount: 3, duration: 2 },
    debuffDuration: 2,
  }),
  "hero_skill:core:h03:p063": frontAttack(caltrops, {
    accuracy: 11,
    critical: 1,
    hitDamage: 2,
    critDamage: 3,
    status: { amount: 3, duration: 3 },
    debuffDuration: 3,
  }),
  "hero_skill:core:h04:p082": frontAttack(sameAreaMelee, {
    accuracy: 10,
    critical: 0,
    hitDamage: 5,
    critDamage: 9,
    status: { amount: 2, duration: 2 },
  }),
  "hero_skill:core:h04:p083": frontAttack(sameAreaMelee, {
    accuracy: 11,
    critical: 0,
    hitDamage: 7,
    critDamage: 12,
    status: { amount: 2, duration: 3 },
  }),
  "hero_skill:core:h04:p084": frontAttack(sameAreaMelee, {
    accuracy: 12,
    critical: 0,
    hitDamage: 9,
    critDamage: 15,
    status: { amount: 3, duration: 3 },
  }),
  "hero_skill:core:h06:p109": frontAttack(harvest, {
    accuracy: 9,
    critical: 0,
    hitDamage: 3,
    critDamage: 4,
    status: { amount: 2, duration: 2 },
  }),
  "hero_skill:core:h06:p110": frontAttack(harvest, {
    accuracy: 10,
    critical: 0,
    hitDamage: 4,
    critDamage: 6,
    status: { amount: 2, duration: 3 },
  }),
  "hero_skill:core:h06:p111": frontAttack(harvest, {
    accuracy: 11,
    critical: 1,
    hitDamage: 5,
    critDamage: 8,
    status: { amount: 3, duration: 3 },
  }),
  "hero_skill:core:h06:p124": frontAttack(adjacentRanged, {
    accuracy: 10,
    critical: 1,
    hitDamage: 4,
    critDamage: 6,
    status: { amount: 3, duration: 1 },
  }),
  "hero_skill:core:h06:p125": frontAttack(adjacentRanged, {
    accuracy: 11,
    critical: 1,
    hitDamage: 5,
    critDamage: 8,
    status: { amount: 3, duration: 2 },
  }),
  "hero_skill:core:h06:p126": frontAttack(adjacentRanged, {
    accuracy: 12,
    critical: 2,
    hitDamage: 6,
    critDamage: 10,
    status: { amount: 3, duration: 3 },
  }),
  "hero_skill:core:h07:p127": frontAttack(noxiousBlast, {
    accuracy: 9,
    critical: 1,
    hitDamage: 2,
    critDamage: 4,
    statusKind: "blight",
    status: { amount: 4, duration: 2 },
    debuffDuration: 1,
  }),
  "hero_skill:core:h07:p128": frontAttack(noxiousBlast, {
    accuracy: 10,
    critical: 1,
    hitDamage: 3,
    critDamage: 6,
    statusKind: "blight",
    status: { amount: 4, duration: 3 },
    debuffDuration: 1,
  }),
  "hero_skill:core:h07:p129": frontAttack(noxiousBlast, {
    accuracy: 12,
    critical: 1,
    hitDamage: 4,
    critDamage: 7,
    statusKind: "blight",
    status: { amount: 4, duration: 3 },
    debuffDuration: 2,
  }),
  "hero_skill:core:h07:p130": frontAttack(plagueGrenade, {
    accuracy: 9,
    critical: 0,
    hitDamage: 1,
    critDamage: 2,
    statusKind: "blight",
    status: { amount: 3, duration: 2 },
  }),
  "hero_skill:core:h07:p131": frontAttack(plagueGrenade, {
    accuracy: 9,
    critical: 0,
    hitDamage: 2,
    critDamage: 4,
    statusKind: "blight",
    status: { amount: 3, duration: 3 },
  }),
  "hero_skill:core:h07:p132": frontAttack(plagueGrenade, {
    accuracy: 12,
    critical: 1,
    hitDamage: 3,
    critDamage: 5,
    statusKind: "blight",
    status: { amount: 3, duration: 3 },
  }),
  "hero_skill:core:h07:p136": frontAttack(sameAreaMelee, {
    accuracy: 9,
    critical: 1,
    hitDamage: 5,
    critDamage: 8,
    status: { amount: 2, duration: 2 },
  }),
  "hero_skill:core:h07:p137": frontAttack(sameAreaMelee, {
    accuracy: 10,
    critical: 1,
    hitDamage: 7,
    critDamage: 11,
    status: { amount: 2, duration: 3 },
  }),
  "hero_skill:core:h07:p138": frontAttack(sameAreaMelee, {
    accuracy: 11,
    critical: 1,
    hitDamage: 8,
    critDamage: 14,
    status: { amount: 3, duration: 3 },
  }),
};

export function attachDirectHeroAttack(card: NormalizedHeroSkillCard): NormalizedHeroSkillCard {
  const review = DIRECT_ATTACKS[card.id];
  if (!review) return card;
  const labels = new Map(card.printed_labels.map(({ label, value }) => [label, value]));
  const number = (label: string) =>
    card.unlabeled_numbers.find(
      (entry) => entry.anchor.type === "printed_label" && entry.anchor.label === label,
    )?.numeric;
  const effects = card.rules?.statuses;
  const printedEffect = card.effect_lines[0]
    ?.map((segment) => (segment.type === "text" ? segment.text : `{${segment.icon.key}}`))
    .join("")
    .replace(/[\s,]+/g, "");
  const printedStances = (["support", "ranged", "defensive", "aggressive"] as const).map(
    (stance) => "stance_" + stance + (review.stances.includes(stance) ? "_lit" : "_unlit"),
  );
  const effectLine = review.onHit
    .map(({ kind, amount, duration }) => `${amount ?? ""}{${kind}}${duration}t`)
    .join("");
  if (
    card.verification.unverified ||
    card.rules?.effect !== "damage" ||
    labels.get("Crit") !== review.critical.threshold ||
    labels.get("Acc") !== review.hit.threshold ||
    number("Crit") !== review.critical.damage ||
    number("Acc") !== review.hit.damage ||
    !card.unlabeled_numbers.some(
      (entry) =>
        entry.numeric === review.range &&
        entry.anchor.type === "beside_icon" &&
        entry.anchor.left_icon?.key === "range",
    ) ||
    card.rules.targets?.monster !== review.monsterTargets ||
    card.rules.targets.hero !== 0 ||
    card.rules.targets.heroOrMonster !== 0 ||
    card.top_row_icons.map(({ key }) => key).join() !== printedStances.join() ||
    card.effect_lines.length !== 1 ||
    printedEffect !== `{target_effects}${effectLine}` ||
    effects?.length !== review.onHit.length ||
    review.onHit.some(({ kind, amount, duration }, index) => {
      const effect = effects?.[index];
      return (
        effect?.scope !== "target" ||
        effect.kind !== kind ||
        effect.amount !== amount ||
        effect.duration !== duration
      );
    })
  ) {
    throw new Error(card.id + " 效果词条与已核卡面不符（R-048）");
  }
  const directAttack = directAttackSchema.parse(review);
  return { ...card, rules: { ...card.rules, directAttack } };
}
