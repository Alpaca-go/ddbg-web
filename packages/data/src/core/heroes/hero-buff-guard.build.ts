import { buffGuardSchema } from "../../shared/effects";
import type { NormalizedHeroSkillCard } from "../../shared/schema";
import { HERO_ANNOTATIONS } from "./annotations";
import { lineSignature } from "./annotations/shared";
import type { BuffGuardEntry } from "./annotations/types";

type ReviewedBuff = Omit<BuffGuardEntry, "id" | "name">;

const compactEffect = (text: string) => text.replace(/[\s,]+/g, "");

const STANCES = ["support", "ranged", "defensive", "aggressive"] as const;

function hasRangeSelf(card: NormalizedHeroSkillCard): boolean {
  const isSelf = (line: NormalizedHeroSkillCard["stats_line"]) =>
    !!line &&
    compactEffect(lineSignature(line)).startsWith("{range}Self") &&
    line.every(
      (part) =>
        part.type === "text" ||
        part.icon.naming === "confirmed" ||
        part.icon.naming === "confirmed_rulebook",
    );
  if (isSelf(card.stats_line)) return true;
  return card.effect_lines.some((line) => isSelf(line));
}

function namedIcon(part: { type: string; icon?: { naming: string } }) {
  return (
    part.type === "text" ||
    part.icon?.naming === "confirmed" ||
    part.icon?.naming === "confirmed_rulebook"
  );
}

function lineText(
  line: readonly { type: string; text?: string; icon?: { key: string | null } }[],
): string {
  return line
    .map((part) => (part.type === "text" ? (part.text ?? "") : `{${part.icon?.key}}`))
    .join("");
}

type StatusRule = {
  readonly kind:
    "bleed" | "blight" | "stun" | "buff" | "mark" | "riposte" | "protection" | "guard" | "debuff";
  readonly duration: number;
  readonly amount?: number;
  readonly scope: "self" | "target";
  readonly lineIndex: number;
  readonly segmentIndex: number;
};

type PackedRemainder = {
  selfLight?: number;
  targetLight?: number;
  removal: { scope: "self" | "target"; kinds: ("bleed" | "blight")[] }[];
  selfShuffle?: { direction: "push" | "pull"; distance: number };
  targetShuffle?: { direction: "push" | "pull"; distance: number };
  selfShufflePushOptions?: readonly [number, number];
};

function consumeRemainder(
  card: NormalizedHeroSkillCard,
  statuses: readonly StatusRule[],
): PackedRemainder {
  const packed: PackedRemainder = { removal: [] };
  const groups = new Map<number, StatusRule[]>();
  for (const status of statuses) {
    const group = groups.get(status.lineIndex) ?? [];
    group.push(status);
    groups.set(status.lineIndex, group);
  }
  for (const [lineIndex, group] of groups) {
    const line = card.effect_lines[lineIndex];
    if (!line) throw new Error(card.id + " 状态注解行缺失（R-048）");
    const parts = line.map((segment) =>
      segment.type === "text" ? segment.text : `{${segment.icon.key}}`,
    );
    for (const entry of group) {
      parts[entry.segmentIndex] = "";
      const following = parts[entry.segmentIndex + 1];
      if (typeof following !== "string" || !following.trimStart().startsWith(`${entry.duration}t`))
        throw new Error(card.id + " 状态注解持续时间与卡面文字不符（R-048）");
      parts[entry.segmentIndex + 1] = following.replace(`${entry.duration}t`, "");
    }
    const scope = group[0]!.scope;
    const prefix = scope === "self" ? "{self_effects}Self" : "{target_effects}";
    const token = parts
      .join("")
      .split(String.fromCharCode(7))
      .join("")
      .replace(/[\s,]+/g, "");
    if (!token.startsWith(prefix))
      throw new Error(card.id + " 状态同行缺少正确的自身 / 目标效果标记（R-048）");
    const rest = token.slice(prefix.length);
    if (rest === "") continue;
    if (rest === "Remove{bleed}{blight}") {
      packed.removal.push({ scope, kinds: ["bleed", "blight"] });
      continue;
    }
    if (/^\{light\}[+-]\d+$/.test(rest)) {
      const amount = Number(rest.slice("{light}".length));
      if (!Number.isSafeInteger(amount) || amount < -5 || amount > 5)
        throw new Error(card.id + " 光照数值无法打包（R-048）");
      if (scope === "self") packed.selfLight = (packed.selfLight ?? 0) + amount;
      else packed.targetLight = (packed.targetLight ?? 0) + amount;
      continue;
    }
    const fixed = /^\{shuffle\}(Push|Pull)([1-9]\d*)$/.exec(rest);
    if (fixed) {
      const move = {
        direction: (fixed[1] === "Push" ? "push" : "pull") as "push" | "pull",
        distance: Number(fixed[2]),
      };
      if (scope === "self") {
        if (packed.selfShuffle || packed.selfShufflePushOptions)
          throw new Error(card.id + " 自身位移重复（R-048）");
        packed.selfShuffle = move;
      } else {
        if (packed.targetShuffle) throw new Error(card.id + " 目标位移重复（R-048）");
        packed.targetShuffle = move;
      }
      continue;
    }
    const options = /^\{shuffle\}Push([1-9]\d*)orPush([1-9]\d*)$/.exec(rest);
    if (options && scope === "self") {
      const a = Number(options[1]);
      const b = Number(options[2]);
      if (a === b || packed.selfShuffle || packed.selfShufflePushOptions)
        throw new Error(card.id + " 自身可选 Push 无法打包（Q-168）");
      packed.selfShufflePushOptions = [a, b];
      continue;
    }
    throw new Error(card.id + " 状态同行残余无法打包，保留原伤口（R-048）");
  }
  return packed;
}

function parsePureShuffle(
  text: string,
):
  { direction: "push" | "pull"; distance: number } | { options: readonly [number, number] } | null {
  const compact = text.replace(/\s+/g, "");
  const fixed = /^(Push|Pull)([1-9]\d*)$/.exec(compact);
  if (fixed)
    return {
      direction: fixed[1] === "Push" ? "push" : "pull",
      distance: Number(fixed[2]),
    };
  const options = /^Push([1-9]\d*)orPush([1-9]\d*)$/.exec(compact);
  if (options) {
    const a = Number(options[1]);
    const b = Number(options[2]);
    if (a !== b) return { options: [a, b] };
  }
  return null;
}

function isPureShuffleLine(
  line:
    | readonly { type: string; text?: string; icon?: { key: string | null; naming: string } }[]
    | undefined,
): boolean {
  if (!line) return false;
  let self = 0;
  let target = 0;
  let shuffle = 0;
  let sawSelfWord = false;
  let moveText = "";
  for (const segment of line) {
    if (segment.type === "text") {
      const text = segment.text?.trim() ?? "";
      if (text === "") continue;
      if (text === "Self") {
        sawSelfWord = true;
        continue;
      }
      moveText += text + " ";
      continue;
    }
    const key = segment.icon?.key;
    const naming = segment.icon?.naming;
    if (naming !== "confirmed" && naming !== "confirmed_rulebook") return false;
    if (key === "self_effects") {
      self += 1;
      continue;
    }
    if (key === "target_effects") {
      target += 1;
      continue;
    }
    if (key === "shuffle") {
      shuffle += 1;
      continue;
    }
    return false;
  }
  if (shuffle !== 1) return false;
  if (self === 1 && target === 0) return sawSelfWord && parsePureShuffle(moveText.trim()) !== null;
  if (self === 0 && target === 1) return !sawSelfWord && parsePureShuffle(moveText.trim()) !== null;
  return false;
}

function headerHeroTargets(card: NormalizedHeroSkillCard): number | null {
  const header = card.rules?.target?.header;
  if (!header || header.lineIndex !== 0 || header.source !== "print_front") return null;
  const line = card.effect_lines[0];
  if (!line || card.stats_line !== null || card.printed_labels.length !== 0) return null;
  const text = compactEffect(lineText(line));
  if (!/^\{range\}[0-2](?:\{target_hero\}){1,3}$/.test(text)) return null;
  if (!line.every(namedIcon)) return null;
  return line.filter((part) => part.type === "icon" && part.icon.key === "target_hero").length;
}

function attachBuffGuard(
  card: NormalizedHeroSkillCard,
  review: ReviewedBuff,
): NormalizedHeroSkillCard {
  const labels = new Map(card.printed_labels.map(({ label, value }) => [label, value]));
  const ranges = card.unlabeled_numbers.filter(
    ({ anchor }) =>
      anchor.type === "beside_icon" &&
      anchor.left_icon?.key === "range" &&
      anchor.inside_icon === null,
  );
  const [range] = ranges;
  const interval = card.rules?.range;
  const validRange = review.selfRange
    ? hasRangeSelf(card)
    : review.rangeMinimum === undefined
      ? ranges.length === 1 && !interval && range?.numeric === review.range
      : interval?.min === review.rangeMinimum &&
        interval.max === review.range &&
        range?.numeric === null &&
        range.text === `${review.rangeMinimum}-${review.range}`;
  const printedStances = STANCES.map(
    (stance) => "stance_" + stance + (review.stances.includes(stance) ? "_lit" : "_unlit"),
  );
  const topKeys = card.top_row_icons
    .filter(({ key }) => key !== "text_plate")
    .map(({ key }) => key);
  const headerTargets = headerHeroTargets(card);
  const reviewedTargets = review.selfRange
    ? true
    : headerTargets !== null
      ? headerTargets === review.heroTargets
      : card.rules?.targets !== undefined &&
        card.rules.targets.hero === review.heroTargets &&
        card.rules.targets.monster === 0 &&
        card.rules.targets.heroOrMonster === 0;
  if (
    card.verification.unverified ||
    !validRange ||
    (review.selfRange
      ? card.rules?.targets?.monster !== 0 && card.rules?.targets !== undefined
      : false) ||
    !reviewedTargets ||
    (review.hit ? labels.get("Acc") !== review.hit.threshold : labels.has("Acc")) ||
    (review.critical ? labels.get("Crit") !== review.critical.threshold : labels.has("Crit")) ||
    topKeys.join() !== printedStances.join() ||
    card.effect_lines.some((line) => !line.every(namedIcon)) ||
    (card.stats_line !== null && !card.stats_line.every(namedIcon))
  ) {
    throw new Error(card.id + " 效果词条与已核卡面不符（R-048）");
  }
  const effects = card.rules?.statuses ?? [];
  const statuses: StatusRule[] = effects.map((effect) => ({
    kind: effect.kind,
    duration: effect.duration,
    scope: effect.scope,
    lineIndex: effect.lineIndex,
    segmentIndex: effect.segmentIndex,
    ...(effect.amount === undefined ? {} : { amount: effect.amount }),
  }));
  const remainder = consumeRemainder(card, statuses);
  const statusRules = (scope: "self" | "target") =>
    statuses
      .filter((effect) => effect.scope === scope)
      .map(({ kind, amount, duration }) => ({
        kind,
        duration,
        ...(amount === undefined ? {} : { amount }),
      }));
  const onHit = statusRules("target");
  const onUse = statusRules("self");
  const removalLines = new Set(
    remainder.removal.map((rule) => rule.scope + ":" + rule.kinds.join(",")),
  );
  for (const rule of card.rules?.removal ?? []) {
    const key = rule.scope + ":" + rule.kinds.join(",");
    if (removalLines.has(key)) continue;
    const line = card.effect_lines[rule.lineIndex];
    const text = line ? compactEffect(lineText(line)).replace(String.fromCharCode(7), "") : "";
    const marked =
      text === "{self_effects}SelfRemove{bleed}{blight}" ||
      text === "{target_effects}Remove{bleed}{blight}";
    const unmarked = text === "Remove{bleed}{blight}";
    if (!marked && !unmarked) throw new Error(card.id + " 移除注解行无法打包（R-048）");
    remainder.removal.push({ scope: rule.scope, kinds: [...rule.kinds] });
    removalLines.add(key);
  }
  for (const rule of card.rules?.shuffle ?? []) {
    const parsed = parsePureShuffle(rule.text);
    if (!parsed) throw new Error(card.id + " 位移注解无法打包（R-048）");
    const line = card.effect_lines[rule.lineIndex];
    if ("options" in parsed) {
      if (rule.scope !== "self") throw new Error(card.id + " 目标可选 Push 无法打包（Q-168）");
      if (
        remainder.selfShufflePushOptions &&
        remainder.selfShufflePushOptions[0] === parsed.options[0] &&
        remainder.selfShufflePushOptions[1] === parsed.options[1]
      )
        continue;
      if (remainder.selfShuffle || remainder.selfShufflePushOptions)
        throw new Error(card.id + " 自身位移重复（R-048）");
      if (
        !isPureShuffleLine(line) &&
        !statuses.some((status) => status.lineIndex === rule.lineIndex)
      )
        throw new Error(card.id + " 可选位移行不是纯效果行，保留原伤口（R-048）");
      remainder.selfShufflePushOptions = parsed.options;
      continue;
    }
    if (rule.scope === "self") {
      if (
        remainder.selfShuffle &&
        remainder.selfShuffle.direction === parsed.direction &&
        remainder.selfShuffle.distance === parsed.distance
      )
        continue;
      if (remainder.selfShuffle || remainder.selfShufflePushOptions)
        throw new Error(card.id + " 自身位移重复（R-048）");
      if (
        !isPureShuffleLine(line) &&
        !statuses.some((status) => status.lineIndex === rule.lineIndex)
      )
        throw new Error(card.id + " 位移行不是纯效果行，保留原伤口（R-048）");
      remainder.selfShuffle = parsed;
    } else {
      if (
        remainder.targetShuffle &&
        remainder.targetShuffle.direction === parsed.direction &&
        remainder.targetShuffle.distance === parsed.distance
      )
        continue;
      if (remainder.targetShuffle) throw new Error(card.id + " 目标位移重复（R-048）");
      if (
        !isPureShuffleLine(line) &&
        !statuses.some((status) => status.lineIndex === rule.lineIndex)
      )
        throw new Error(card.id + " 位移行不是纯效果行，保留原伤口（R-048）");
      remainder.targetShuffle = parsed;
    }
  }
  const packed = buffGuardSchema.parse({
    ...review,
    ...(remainder.selfLight !== undefined ? { selfLight: remainder.selfLight } : {}),
    ...(remainder.targetLight !== undefined ? { targetLight: remainder.targetLight } : {}),
    ...(onHit.length ? { onHit } : {}),
    ...(onUse.length ? { onUse } : {}),
    ...(remainder.removal.length ? { removal: remainder.removal } : {}),
    ...(remainder.selfShuffle ? { selfShuffle: remainder.selfShuffle } : {}),
    ...(remainder.targetShuffle ? { targetShuffle: remainder.targetShuffle } : {}),
    ...(remainder.selfShufflePushOptions
      ? { selfShufflePushOptions: remainder.selfShufflePushOptions }
      : {}),
  });
  return { ...card, rules: { ...card.rules, buffGuard: packed } };
}

/** R-048：逐英雄规则必须唯一命中所属英雄的 canonical 卡牌。 */
export function applyBuffGuard(
  cards: readonly NormalizedHeroSkillCard[],
): NormalizedHeroSkillCard[] {
  const cardsById = new Map(cards.map((card) => [card.id, card]));
  if (cardsById.size !== cards.length) throw new Error("技能目录存在重复 ID（R-048）");
  const reviewedById = new Map<string, ReviewedBuff>();
  for (const { hero, entries } of HERO_ANNOTATIONS) {
    for (const { id, name, ...review } of entries.buffGuard ?? []) {
      const card = cardsById.get(id);
      if (card?.hero !== hero || card.name !== name || reviewedById.has(id))
        throw new Error(`${id} 增益防护注解归属不符、缺卡或重复（R-048）`);
      reviewedById.set(id, review);
    }
  }
  return cards.map((card) => {
    const review = reviewedById.get(card.id);
    return review ? attachBuffGuard(card, review) : card;
  });
}
