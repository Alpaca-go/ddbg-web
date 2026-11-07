import type { NormalizedHeroSkillCard, Segment } from "./schema";
import { normalizedHeroSkillCardSchema } from "./schema";
import { lineSignature } from "./verified-hero-layout";

type IconSegment = Extract<Segment, { type: "icon" }>;

function cloneKey(segment: IconSegment, key: string): IconSegment {
  return { type: "icon", icon: { ...segment.icon, key } };
}

function text(value: string): Segment {
  return { type: "text", text: value };
}

function assertPurgeCard(card: NormalizedHeroSkillCard, page: number, level: number) {
  if (
    card.id !== `hero_skill:p${page}` ||
    card.hero !== "LEPER" ||
    card.name !== "Purge" ||
    card.level !== level ||
    card.pages[0] !== page ||
    card.verification.unverified
  )
    throw new Error(`${card.id} Purge 元数据漂移（R-048）`);
}

/**
 * R-200：Leper 高等级 **最小**逐卡覆盖（对齐核心：签名断言 + 局部修正，不整卡重写）。
 * 当前仅处理 Kyries 已确认项：Purge II/III 自身 Buff 2t（去重误提取的双 Buff 图标）、Purge III stats 伤害 19/12。
 */
export function attachVerifiedWarrensLeperHigher(
  cards: readonly NormalizedHeroSkillCard[],
): NormalizedHeroSkillCard[] {
  return cards.map((card) => {
    if (card.id === "hero_skill:p281") {
      assertPurgeCard(card, 281, 2);
      const rawSig = lineSignature(card.effect_lines[0]!).replace(/\s+/g, "");
      if (rawSig !== "{self_effects}{buff}Self{buff}2t")
        throw new Error(`${card.id} Purge II 自身 Buff 行漂移（R-048）`);
      const buff = card.effect_lines[0]!.find(
        (s): s is IconSegment => s.type === "icon" && s.icon.key === "buff",
      );
      if (!buff) throw new Error(`${card.id} 缺少 Buff 图标（R-048）`);
      const selfEffects = card.effect_lines[0]!.find(
        (s): s is IconSegment => s.type === "icon" && s.icon.key === "self_effects",
      );
      if (!selfEffects) throw new Error(`${card.id} 缺少 self_effects（R-048）`);
      return normalizedHeroSkillCardSchema.parse({
        ...card,
        effect_lines: [
          [selfEffects, text(" Self "), buff, text(" 2t")],
          card.effect_lines[1]!,
        ],
      });
    }
    if (card.id === "hero_skill:p282") {
      assertPurgeCard(card, 282, 3);
      const rawSig = lineSignature(card.effect_lines[0]!).replace(/\s+/g, "");
      if (rawSig !== "{self_effects}{buff}Self{buff}2t")
        throw new Error(`${card.id} Purge III 自身 Buff 行漂移（R-048）`);
      const buff = card.effect_lines[0]!.find(
        (s): s is IconSegment => s.type === "icon" && s.icon.key === "buff",
      );
      if (!buff) throw new Error(`${card.id} 缺少 Buff 图标（R-048）`);
      const selfEffects = card.effect_lines[0]!.find(
        (s): s is IconSegment => s.type === "icon" && s.icon.key === "self_effects",
      );
      if (!selfEffects) throw new Error(`${card.id} 缺少 self_effects（R-048）`);
      const stats = card.stats_line;
      const statsSig = stats ? lineSignature(stats).replace(/\s+/g, "") : "";
      if (statsSig !== "{range}0{target_monster}Crit0{heal}19Acc11{heal}12")
        throw new Error(`${card.id} Purge III stats_line 漂移（R-048）`);
      return normalizedHeroSkillCardSchema.parse({
        ...card,
        effect_lines: [
          [selfEffects, text(" Self "), buff, text(" 2t")],
          card.effect_lines[1]!,
        ],
        stats_line: stats!.map((segment) =>
          segment.type === "icon" && segment.icon.key === "heal"
            ? cloneKey(segment, "damage")
            : segment,
        ),
      });
    }
    return card;
  });
}
