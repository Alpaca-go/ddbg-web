import { z } from "zod";

import type { RawFile } from "./extract/raw";
import type { NormalizedMonsterLargeFile, NormalizedMonsterMediumFile } from "./normalize/schema";

export const ABSOLUTE_NOTHINGNESS_PRINTED_NAME = "Absolute Nothingness" as const;

const BOSS_ABILITY_SOURCE =
  "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_70_120_Boss_Abilities_FRONT.pdf" as const;
const MONSTER_MEDIUM_SOURCE =
  "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_70_120_monsters_medium_FRONT.pdf" as const;
const MONSTER_LARGE_SOURCE =
  "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_140x140_monster_large_FRONT.pdf" as const;

export const absoluteNothingnessSupportSchema = z.strictObject({
  schema: z.literal("ddbg-absolute-nothingness-support-v1"),
  /** 核心盒 Monster & Boss Cards 中尚无同名战斗卡；规则仅列 3 枚 punchboard 棋子。 */
  status: z.enum(["pending_monster_card", "linked"]),
  expectedName: z.literal(ABSOLUTE_NOTHINGNESS_PRINTED_NAME),
  miniatureCount: z.literal(3),
  bossActorCardId: z.literal("monster_large:p018"),
  abilityCardId: z.literal("boss_ability:p035"),
  supportCardIds: z.array(z.string()),
  placements: z.tuple([
    z.literal("monster_defense"),
    z.literal("monster_ranged"),
    z.literal("monster_support"),
  ]),
  combatReady: z.literal(false),
  sources: z.strictObject({
    rules: z.literal("02_DD_CARDS_COREBOX/DD_EN_COREBOX_RULES.pdf"),
    bossAbility: z.literal(BOSS_ABILITY_SOURCE),
    bossAbilityPage: z.literal(35),
    monsterMediumPdf: z.literal(MONSTER_MEDIUM_SOURCE),
    monsterLargePdf: z.literal(MONSTER_LARGE_SOURCE),
    searchedMediumPages: z.literal("1-111"),
    searchedLargePages: z.literal("1-20"),
  }),
  notes: z.array(z.string()),
});

export type AbsoluteNothingnessSupport = z.infer<typeof absoluteNothingnessSupportSchema>;

export function findAbsoluteNothingnessMonsterCards(
  medium: NormalizedMonsterMediumFile,
  large: NormalizedMonsterLargeFile,
) {
  return [...medium.cards, ...large.cards].filter(
    (c) => "card_kind" in c && c.card_kind === "large_monster_reference"
      ? false
      : c.name === ABSOLUTE_NOTHINGNESS_PRINTED_NAME,
  );
}

function assertBossAbilityP035(abilities: RawFile) {
  const ability = abilities.cards.find((c) => c.id === "boss_ability:p035");
  const text = ability?.faces.front.lines.map((l) => l.text ?? "").join("\n") ?? "";
  if (
    !ability ||
    ability.source_set !== "base" ||
    ability.faces.front.page !== 35 ||
    ability.faces.front.file !== BOSS_ABILITY_SOURCE ||
    !text.includes("Absolute Nothingness") ||
    !text.includes("untargetable")
  )
    throw new Error("Absolute Nothingness 能力卡 boss_ability:p035 与印刷转录不符");
}

function validateLinkedCard(
  cardId: string,
  mediumRaw: RawFile,
  largeRaw: RawFile,
) {
  const raw = [...mediumRaw.cards, ...largeRaw.cards].find((c) => c.id === cardId);
  if (!raw || raw.source_set !== "base")
    throw new Error(`Absolute Nothingness 战斗卡来源缺失：${cardId}`);
  const front = raw.faces.front;
  const expectedFile =
    cardId.startsWith("monster_large:") ? MONSTER_LARGE_SOURCE : MONSTER_MEDIUM_SOURCE;
  if (front.file !== expectedFile)
    throw new Error(`Absolute Nothingness 战斗卡来源 PDF 漂移：${cardId}`);
  const pageFromId = Number(cardId.split(":p")[1]?.split(":")[0]);
  if (!Number.isFinite(pageFromId) || front.page !== pageFromId)
    throw new Error(`Absolute Nothingness 战斗卡页码与 id 不一致：${cardId}`);
}

/** 在已规范化怪物目录中探测 Absolute Nothingness 战斗卡；无卡则返回 pending，有卡则校验并产出 supportCardIds。 */
export function buildAbsoluteNothingnessSupport(
  medium: NormalizedMonsterMediumFile,
  large: NormalizedMonsterLargeFile,
  mediumRaw: RawFile,
  largeRaw: RawFile,
  abilities: RawFile,
): AbsoluteNothingnessSupport {
  assertBossAbilityP035(abilities);
  const matches = findAbsoluteNothingnessMonsterCards(medium, large);
  const ids = matches.map((c) => c.id);
  if (ids.length > 1) throw new Error("Absolute Nothingness 怪物卡 identity 重复");

  for (const card of matches) {
    if (card.level !== 3)
      throw new Error(`Absolute Nothingness 等级与最终战不符：${card.id}`);
    validateLinkedCard(card.id, mediumRaw, largeRaw);
  }

  const baseNotes = [
    "官方规则 R40 / boss_ability:p035：3 枚 Absolute Nothingness 棋子各占怪物防御/远程/支援区域一格，不可被选为目标。",
    "核心盒规则书组件表为「3x Absolute Nothingness」棋子，非 Monster & Boss Cards 168 张之一；对照 Reflections 有独立 medium 战斗卡。",
  ];

  if (matches.length === 0) {
    return absoluteNothingnessSupportSchema.parse({
      schema: "ddbg-absolute-nothingness-support-v1",
      status: "pending_monster_card",
      expectedName: ABSOLUTE_NOTHINGNESS_PRINTED_NAME,
      miniatureCount: 3,
      bossActorCardId: "monster_large:p018",
      abilityCardId: "boss_ability:p035",
      supportCardIds: [],
      placements: ["monster_defense", "monster_ranged", "monster_support"],
      combatReady: false,
      sources: {
        rules: "02_DD_CARDS_COREBOX/DD_EN_COREBOX_RULES.pdf",
        bossAbility: BOSS_ABILITY_SOURCE,
        bossAbilityPage: 35,
        monsterMediumPdf: MONSTER_MEDIUM_SOURCE,
        monsterLargePdf: MONSTER_LARGE_SOURCE,
        searchedMediumPages: "1-111",
        searchedLargePages: "1-20",
      },
      notes: [
        ...baseNotes,
        "待确认（Q-AN-001）：若后续在 medium/large PDF 发现独立战斗卡，经 raw→normalize 入库后本目录可转为 linked 并写入 supportCardIds。",
      ],
    });
  }

  return absoluteNothingnessSupportSchema.parse({
    schema: "ddbg-absolute-nothingness-support-v1",
    status: "linked",
    expectedName: ABSOLUTE_NOTHINGNESS_PRINTED_NAME,
    miniatureCount: 3,
    bossActorCardId: "monster_large:p018",
    abilityCardId: "boss_ability:p035",
    supportCardIds: ids,
    placements: ["monster_defense", "monster_ranged", "monster_support"],
    combatReady: false,
    sources: {
      rules: "02_DD_CARDS_COREBOX/DD_EN_COREBOX_RULES.pdf",
      bossAbility: BOSS_ABILITY_SOURCE,
      bossAbilityPage: 35,
      monsterMediumPdf: MONSTER_MEDIUM_SOURCE,
      monsterLargePdf: MONSTER_LARGE_SOURCE,
      searchedMediumPages: "1-111",
      searchedLargePages: "1-20",
    },
    notes: baseNotes,
  });
}

export function readAbsoluteNothingnessSupport(file: AbsoluteNothingnessSupport) {
  return absoluteNothingnessSupportSchema.parse(file);
}
