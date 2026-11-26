import { z } from "zod";

export const HERO_SOURCE_PACKS = ["core", "warrens", "cove", "weald", "musketeer"] as const;
export type HeroSourcePack = (typeof HERO_SOURCE_PACKS)[number];

export function heroSourcePaths(pack: HeroSourcePack) {
  const root = pack === "core" ? "extract/corebox" : `extract/extension/${pack}`;
  return {
    stat: `${root}/raw/hero_stat.json`,
    skillRaw: `${root}/raw/hero_skill.json`,
    skillParsed: `${root}/parsed/hero_skill.json`,
  };
}

function heroSourceList(field: keyof ReturnType<typeof heroSourcePaths>) {
  const paths = HERO_SOURCE_PACKS.map((pack) => heroSourcePaths(pack)[field]);
  return z
    .array(z.literal(paths))
    .min(1)
    .refine((sources) => new Set(sources).size === sources.length, {
      message: "英雄聚合目录的提取路径必须唯一",
    });
}

export const heroStatSourcesSchema = z.strictObject({
  parsed: z.null(),
  raw: heroSourceList("stat"),
  dictionary: z.literal("dictionary/icon-dictionary-v1.8.json"),
});

export const heroSkillSourcesSchema = z.strictObject({
  parsed: heroSourceList("skillParsed"),
  raw: heroSourceList("skillRaw"),
  dictionary: z.literal("dictionary/icon-dictionary-v1.8.json"),
});
