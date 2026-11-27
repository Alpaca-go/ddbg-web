import { directAttackSchema } from "../../shared/effects";
import type { DirectAttack } from "../../shared/effects";
import type { NormalizedHeroSkillCard } from "../../shared/schema";

type AttackFace = Pick<DirectAttack, "stances" | "range" | "monsterTargets">;
type ReviewedAttack = {
  accuracy: number;
  critical: number;
  hitDamage: number;
  critDamage: number;
  onHit: DirectAttack["onHit"];
};
const meleeStances: AttackFace["stances"] = ["ranged", "defensive", "aggressive"];
const rangedStances: AttackFace["stances"] = ["ranged", "defensive"];
const crusaderStances: AttackFace["stances"] = ["defensive", "aggressive"];
const smite = { stances: crusaderStances, range: 0, monsterTargets: 1 };
const zealousAccusation = { stances: crusaderStances, range: 1, monsterTargets: 2 };
const holyLance: AttackFace = { stances: ["support", "ranged"], range: 1, monsterTargets: 1 };
const stunningBlow = { stances: crusaderStances, range: 0, monsterTargets: 1 };
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
    onHit: review.onHit,
  };
}

/** 核心盒技能正面 p001–009、p016–018、p031–033、p061–063、p082–084、p109–111、p124–132、p136–138。规则书 R19–21、R-018。 */
const DIRECT_ATTACKS: Readonly<Partial<Record<string, DirectAttack>>> = {
  "hero_skill:core:h01:p001": frontAttack(smite, {
    accuracy: 9,
    critical: 0,
    hitDamage: 7,
    critDamage: 13,
    onHit: [],
  }),
  "hero_skill:core:h01:p002": frontAttack(smite, {
    accuracy: 10,
    critical: 0,
    hitDamage: 9,
    critDamage: 16,
    onHit: [],
  }),
  "hero_skill:core:h01:p003": frontAttack(smite, {
    accuracy: 11,
    critical: 1,
    hitDamage: 11,
    critDamage: 19,
    onHit: [],
  }),
  "hero_skill:core:h01:p004": frontAttack(zealousAccusation, {
    accuracy: 9,
    critical: 0,
    hitDamage: 5,
    critDamage: 9,
    onHit: [],
  }),
  "hero_skill:core:h01:p005": frontAttack(zealousAccusation, {
    accuracy: 10,
    critical: 0,
    hitDamage: 6,
    critDamage: 11,
    onHit: [],
  }),
  "hero_skill:core:h01:p006": frontAttack(zealousAccusation, {
    accuracy: 11,
    critical: 1,
    hitDamage: 7,
    critDamage: 12,
    onHit: [],
  }),
  "hero_skill:core:h01:p007": frontAttack(stunningBlow, {
    accuracy: 9,
    critical: 0,
    hitDamage: 4,
    critDamage: 8,
    onHit: [{ kind: "stun", duration: 1 }],
  }),
  "hero_skill:core:h01:p008": frontAttack(stunningBlow, {
    accuracy: 10,
    critical: 0,
    hitDamage: 5,
    critDamage: 9,
    onHit: [{ kind: "stun", duration: 1 }],
  }),
  "hero_skill:core:h01:p009": frontAttack(stunningBlow, {
    accuracy: 11,
    critical: 1,
    hitDamage: 6,
    critDamage: 10,
    onHit: [{ kind: "stun", duration: 1 }],
  }),
  "hero_skill:core:h01:p016": frontAttack(holyLance, {
    accuracy: 9,
    critical: 1,
    hitDamage: 7,
    critDamage: 13,
    onHit: [],
  }),
  "hero_skill:core:h01:p017": frontAttack(holyLance, {
    accuracy: 10,
    critical: 1,
    hitDamage: 9,
    critDamage: 16,
    onHit: [],
  }),
  "hero_skill:core:h01:p018": frontAttack(holyLance, {
    accuracy: 11,
    critical: 2,
    hitDamage: 11,
    critDamage: 19,
    onHit: [],
  }),
  "hero_skill:core:h02:p031": frontAttack(adjacentMelee, {
    accuracy: 9,
    critical: 0,
    hitDamage: 5,
    critDamage: 8,
    onHit: [{ kind: "bleed", amount: 2, duration: 2 }],
  }),
  "hero_skill:core:h02:p032": frontAttack(adjacentMelee, {
    accuracy: 10,
    critical: 0,
    hitDamage: 6,
    critDamage: 11,
    onHit: [{ kind: "bleed", amount: 3, duration: 3 }],
  }),
  "hero_skill:core:h02:p033": frontAttack(adjacentMelee, {
    accuracy: 10,
    critical: 0,
    hitDamage: 8,
    critDamage: 15,
    onHit: [{ kind: "bleed", amount: 4, duration: 3 }],
  }),
  "hero_skill:core:h03:p061": frontAttack(caltrops, {
    accuracy: 9,
    critical: 1,
    hitDamage: 1,
    critDamage: 2,
    onHit: [
      { kind: "bleed", amount: 2, duration: 3 },
      { kind: "debuff", duration: 1 },
    ],
  }),
  "hero_skill:core:h03:p062": frontAttack(caltrops, {
    accuracy: 10,
    critical: 1,
    hitDamage: 2,
    critDamage: 3,
    onHit: [
      { kind: "bleed", amount: 3, duration: 2 },
      { kind: "debuff", duration: 2 },
    ],
  }),
  "hero_skill:core:h03:p063": frontAttack(caltrops, {
    accuracy: 11,
    critical: 1,
    hitDamage: 2,
    critDamage: 3,
    onHit: [
      { kind: "bleed", amount: 3, duration: 3 },
      { kind: "debuff", duration: 3 },
    ],
  }),
  "hero_skill:core:h04:p082": frontAttack(sameAreaMelee, {
    accuracy: 10,
    critical: 0,
    hitDamage: 5,
    critDamage: 9,
    onHit: [{ kind: "bleed", amount: 2, duration: 2 }],
  }),
  "hero_skill:core:h04:p083": frontAttack(sameAreaMelee, {
    accuracy: 11,
    critical: 0,
    hitDamage: 7,
    critDamage: 12,
    onHit: [{ kind: "bleed", amount: 2, duration: 3 }],
  }),
  "hero_skill:core:h04:p084": frontAttack(sameAreaMelee, {
    accuracy: 12,
    critical: 0,
    hitDamage: 9,
    critDamage: 15,
    onHit: [{ kind: "bleed", amount: 3, duration: 3 }],
  }),
  "hero_skill:core:h06:p109": frontAttack(harvest, {
    accuracy: 9,
    critical: 0,
    hitDamage: 3,
    critDamage: 4,
    onHit: [{ kind: "bleed", amount: 2, duration: 2 }],
  }),
  "hero_skill:core:h06:p110": frontAttack(harvest, {
    accuracy: 10,
    critical: 0,
    hitDamage: 4,
    critDamage: 6,
    onHit: [{ kind: "bleed", amount: 2, duration: 3 }],
  }),
  "hero_skill:core:h06:p111": frontAttack(harvest, {
    accuracy: 11,
    critical: 1,
    hitDamage: 5,
    critDamage: 8,
    onHit: [{ kind: "bleed", amount: 3, duration: 3 }],
  }),
  "hero_skill:core:h06:p124": frontAttack(adjacentRanged, {
    accuracy: 10,
    critical: 1,
    hitDamage: 4,
    critDamage: 6,
    onHit: [{ kind: "bleed", amount: 3, duration: 1 }],
  }),
  "hero_skill:core:h06:p125": frontAttack(adjacentRanged, {
    accuracy: 11,
    critical: 1,
    hitDamage: 5,
    critDamage: 8,
    onHit: [{ kind: "bleed", amount: 3, duration: 2 }],
  }),
  "hero_skill:core:h06:p126": frontAttack(adjacentRanged, {
    accuracy: 12,
    critical: 2,
    hitDamage: 6,
    critDamage: 10,
    onHit: [{ kind: "bleed", amount: 3, duration: 3 }],
  }),
  "hero_skill:core:h07:p127": frontAttack(noxiousBlast, {
    accuracy: 9,
    critical: 1,
    hitDamage: 2,
    critDamage: 4,
    onHit: [
      { kind: "blight", amount: 4, duration: 2 },
      { kind: "debuff", duration: 1 },
    ],
  }),
  "hero_skill:core:h07:p128": frontAttack(noxiousBlast, {
    accuracy: 10,
    critical: 1,
    hitDamage: 3,
    critDamage: 6,
    onHit: [
      { kind: "blight", amount: 4, duration: 3 },
      { kind: "debuff", duration: 1 },
    ],
  }),
  "hero_skill:core:h07:p129": frontAttack(noxiousBlast, {
    accuracy: 12,
    critical: 1,
    hitDamage: 4,
    critDamage: 7,
    onHit: [
      { kind: "blight", amount: 4, duration: 3 },
      { kind: "debuff", duration: 2 },
    ],
  }),
  "hero_skill:core:h07:p130": frontAttack(plagueGrenade, {
    accuracy: 9,
    critical: 0,
    hitDamage: 1,
    critDamage: 2,
    onHit: [{ kind: "blight", amount: 3, duration: 2 }],
  }),
  "hero_skill:core:h07:p131": frontAttack(plagueGrenade, {
    accuracy: 9,
    critical: 0,
    hitDamage: 2,
    critDamage: 4,
    onHit: [{ kind: "blight", amount: 3, duration: 3 }],
  }),
  "hero_skill:core:h07:p132": frontAttack(plagueGrenade, {
    accuracy: 12,
    critical: 1,
    hitDamage: 3,
    critDamage: 5,
    onHit: [{ kind: "blight", amount: 3, duration: 3 }],
  }),
  "hero_skill:core:h07:p136": frontAttack(sameAreaMelee, {
    accuracy: 9,
    critical: 1,
    hitDamage: 5,
    critDamage: 8,
    onHit: [{ kind: "bleed", amount: 2, duration: 2 }],
  }),
  "hero_skill:core:h07:p137": frontAttack(sameAreaMelee, {
    accuracy: 10,
    critical: 1,
    hitDamage: 7,
    critDamage: 11,
    onHit: [{ kind: "bleed", amount: 2, duration: 3 }],
  }),
  "hero_skill:core:h07:p138": frontAttack(sameAreaMelee, {
    accuracy: 11,
    critical: 1,
    hitDamage: 8,
    critDamage: 14,
    onHit: [{ kind: "bleed", amount: 3, duration: 3 }],
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
  const effects = card.rules?.statuses ?? [];
  const printedEffects = card.effect_lines.map((line) =>
    line
      .map((segment) => (segment.type === "text" ? segment.text : `{${segment.icon.key}}`))
      .join("")
      .replace(/[\s,]+/g, ""),
  );
  const printedStances = (["support", "ranged", "defensive", "aggressive"] as const).map(
    (stance) => "stance_" + stance + (review.stances.includes(stance) ? "_lit" : "_unlit"),
  );
  const statuses = review.onHit
    .map(({ kind, amount, duration }) => `${amount ?? ""}{${kind}}${duration}t`)
    .join("");
  const bonus = card.rules?.damage;
  const shuffles = card.rules?.shuffle ?? [];
  const [shuffle] = shuffles;
  const move = /^(Push|Pull) ([1-9]\d*)$/.exec(shuffle?.text ?? "");
  const selfShuffle = move
    ? { direction: move[1] === "Pull" ? "pull" : "push", distance: Number(move[2]) }
    : undefined;
  const selfEffects = move ? [`{self_effects}Self{shuffle}${move[1]}${move[2]}`] : [];
  const targetEffects = bonus
    ? [`{target_effects}{damage}+${bonus.amount}vsUnholy`]
    : statuses === ""
      ? []
      : [`{target_effects}${statuses}`];
  const expectedEffects = [...selfEffects, ...targetEffects];
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
    printedEffects.length !== expectedEffects.length ||
    printedEffects.some((line, index) => line !== expectedEffects[index]) ||
    (shuffle !== undefined &&
      (shuffles.length !== 1 || shuffle.scope !== "self" || shuffle.lineIndex !== 0 || !move)) ||
    card.rules.damageBonuses !== undefined ||
    (bonus !== undefined &&
      (bonus.condition !== "unholy" ||
        bonus.lineIndex !== selfEffects.length ||
        statuses !== "")) ||
    effects.length !== review.onHit.length ||
    review.onHit.some(({ kind, amount, duration }, index) => {
      const effect = effects[index];
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
  const directAttack = directAttackSchema.parse({
    ...review,
    ...(bonus ? { damageBonus: { amount: bonus.amount, condition: bonus.condition } } : {}),
    ...(selfShuffle ? { selfShuffle } : {}),
  });
  return { ...card, rules: { ...card.rules, directAttack } };
}
