import type { HeroSkillCardView, SkillShuffle } from "./hero-skill";
import { statusStackProblem } from "./status";
import type { StatusEffect } from "./status";

/** 已核实 Nt 与同行 Light / Remove / Shuffle 必须一起消费；未知残余拒绝整行。 */
export function readVerifiedStatusEffects(
  skill: HeroSkillCardView,
  shuffleChoice?: "push" | "pull",
):
  | { readonly status: "refused"; readonly reason: string }
  | {
      readonly status: "resolved";
      readonly self: readonly StatusEffect[];
      readonly target: readonly StatusEffect[];
      readonly lineCount: number;
      readonly selfLight: number;
      readonly targetLight: number;
      readonly selfRemove: boolean;
      readonly targetRemove: boolean;
      readonly selfShuffle: SkillShuffle | null;
      readonly targetShuffle: SkillShuffle | null;
    } {
  const self: StatusEffect[] = [];
  const target: StatusEffect[] = [];
  const groups = new Map<
    number,
    NonNullable<HeroSkillCardView["verified_status_effects"]>[number][]
  >();
  let selfLight = 0;
  let targetLight = 0;
  let selfRemove = false;
  let targetRemove = false;
  let selfShuffle: SkillShuffle | null = null;
  let targetShuffle: SkillShuffle | null = null;
  for (const annotation of skill.verified_status_effects ?? []) {
    const line = skill.effect_lines[annotation.lineIndex];
    const segment = line?.[annotation.segmentIndex];
    const problem = statusStackProblem([
      {
        kind: annotation.kind,
        remaining: annotation.duration,
        ...(annotation.amount === undefined ? {} : { amount: annotation.amount }),
      },
    ]);
    if (
      problem ||
      !line ||
      !Number.isSafeInteger(annotation.lineIndex) ||
      !Number.isSafeInteger(annotation.segmentIndex) ||
      segment?.type !== "icon" ||
      segment.icon.key !== annotation.kind ||
      !["confirmed", "confirmed_rulebook"].includes(segment.icon.naming) ||
      !["self", "target"].includes(annotation.scope)
    )
      return {
        status: "refused",
        reason: problem ?? "状态注解缺值或与已确认图标位置不符（R-048）",
      };
    const following = line[annotation.segmentIndex + 1];
    if (
      following?.type !== "text" ||
      !following.text.trimStart().startsWith(`${annotation.duration}t`) ||
      /^\d/.test(following.text.trimStart().slice(String(annotation.duration).length + 1))
    )
      return { status: "refused", reason: "状态注解持续时间与卡面文字不符" };
    const group = groups.get(annotation.lineIndex) ?? [];
    if (
      group.some(
        (entry) =>
          entry.segmentIndex === annotation.segmentIndex || entry.scope !== annotation.scope,
      )
    )
      return { status: "refused", reason: "状态注解重复或同一行作用范围矛盾" };
    groups.set(annotation.lineIndex, [...group, annotation]);
  }
  for (const [lineIndex, group] of groups) {
    const line = skill.effect_lines[lineIndex]!;
    if (
      line.some(
        (s) => s.type === "icon" && !["confirmed", "confirmed_rulebook"].includes(s.icon.naming),
      )
    )
      return { status: "refused", reason: "状态同行含未确认图标（R-048）" };
    const parts = line.map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`));
    for (const entry of group) {
      parts[entry.segmentIndex] = "";
      parts[entry.segmentIndex + 1] = parts[entry.segmentIndex + 1]!.replace(
        `${entry.duration}t`,
        "",
      );
      if (entry.amount !== undefined) {
        const previous = parts[entry.segmentIndex - 1];
        if (!previous?.trimEnd().endsWith(String(entry.amount)))
          return { status: "refused", reason: "Bleed / Blight 面值与卡面文字不符" };
        parts[entry.segmentIndex - 1] = previous.trimEnd().slice(0, -String(entry.amount).length);
      }
    }
    const scope = group[0]!.scope;
    const prefix = scope === "self" ? "{self_effects}Self" : "{target_effects}";
    let token = parts
      .join("")
      .split(String.fromCharCode(7))
      .join("")
      .replace(/[\s,]+/g, "");
    if (group.some((e) => e.scopeLineIndex !== undefined)) {
      const scopeLineIndex = group[0]!.scopeLineIndex;
      const scopeLine =
        scopeLineIndex === undefined ? undefined : skill.effect_lines[scopeLineIndex];
      const scopeText = scopeLine
        ?.map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`))
        .join("")
        .replace(/\s+/g, "");
      if (
        scope !== "target" ||
        scopeLineIndex !== lineIndex - 1 ||
        group.some((e) => e.scopeLineIndex !== scopeLineIndex) ||
        !/^\{target_effects\}\{shuffle\}Push([1-9]\d*)orPull\1$/.test(scopeText ?? "") ||
        scopeLine?.some(
          (s) => s.type === "icon" && !["confirmed", "confirmed_rulebook"].includes(s.icon.naming),
        ) ||
        token !== ""
      )
        return { status: "refused", reason: "状态续行与已核目标作用域不符（R-048）" };
      token = prefix;
    }
    if (!token.startsWith(prefix))
      return { status: "refused", reason: "状态同行缺少正确的自身 / 目标效果标记" };
    const rest = token.slice(prefix.length);
    if (rest === "Remove{bleed}{blight}") {
      if (scope === "self") selfRemove = true;
      else targetRemove = true;
    } else if (/^\{light\}[+-]\d+$/.test(rest)) {
      const amount = Number(rest.slice("{light}".length));
      if (!Number.isSafeInteger(amount)) return { status: "refused", reason: "光照数值溢出" };
      if (scope === "self") selfLight += amount;
      else targetLight += amount;
    } else if (
      /^\{shuffle\}(Push|Pull)[1-9]\d*$/.test(rest) &&
      (scope === "self" ? selfShuffle === null : targetShuffle === null)
    ) {
      const match = /^\{shuffle\}(Push|Pull)(\d+)$/.exec(rest)!;
      const distance = Number(match[2]);
      if (!Number.isSafeInteger(distance)) return { status: "refused", reason: "位移数值溢出" };
      const move = {
        direction: match[1] === "Push" ? ("push" as const) : ("pull" as const),
        distance,
      };
      if (scope === "self") selfShuffle = move;
      else targetShuffle = move;
    } else if (
      /^\{shuffle\}Push([1-9]\d*)or\{shuffle\}Pull([1-9]\d*)$/.test(rest) &&
      scope === "target" &&
      targetShuffle === null
    ) {
      const match = /^\{shuffle\}Push(\d+)or\{shuffle\}Pull(\d+)$/.exec(rest)!;
      const distance = Number(match[1]);
      if (!Number.isSafeInteger(distance) || distance !== Number(match[2]))
        return { status: "refused", reason: "目标状态同行的可选位移距离不一致或溢出" };
      if (shuffleChoice !== "push" && shuffleChoice !== "pull")
        return { status: "refused", reason: "目标状态同行位移尚需选择Push或Pull" };
      targetShuffle = { direction: shuffleChoice, distance };
    } else if (rest !== "")
      return { status: "refused", reason: "状态同行尚未完整支持，整次拒绝（R-048）" };
    for (const entry of group)
      (scope === "self" ? self : target).push({
        kind: entry.kind,
        duration: entry.duration,
        ...(entry.amount === undefined ? {} : { amount: entry.amount }),
      });
  }
  // 无 Acc 自身卡的射程另占一行；只接受确切、已命名的 Self，不当作区域距离默认 0。
  const selfHeaders =
    groups.size && skill.stats_line === null
      ? skill.effect_lines.filter(
          (line) =>
            line
              .map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`))
              .join("")
              .replace(/\s+/g, "") === "{range}Self" &&
            line.every(
              (s) =>
                s.type === "text" || ["confirmed", "confirmed_rulebook"].includes(s.icon.naming),
            ),
        ).length
      : 0;
  return {
    status: "resolved",
    self,
    target,
    lineCount: groups.size + selfHeaders,
    selfLight,
    targetLight,
    selfRemove,
    targetRemove,
    selfShuffle,
    targetShuffle,
  };
}
