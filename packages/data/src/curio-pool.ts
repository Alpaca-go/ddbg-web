import {
  CURIO_FRONT,
  curioCardSchema,
  curioCatalogSchema,
  wealdCurioCatalogSchema,
  type CurioCard,
} from "./curio";

/** 核心 R9–R10、Weald W3：旗帜无地点图标的核心 p1–8 为通用卡。 */
export function curioPoolIdentity(input: CurioCard): "common" | "ruins" | "weald" {
  const card = curioCardSchema.parse(input);
  return card.source.front === CURIO_FRONT ? (card.source.page <= 8 ? "common" : "ruins") : "weald";
}

/** 仅构造未洗牌目录；包选择、种子洗牌及存档由战役层负责。 */
export function locationCurioPool(
  core: readonly CurioCard[],
  target: { location: "ruins" } | { location: "weald"; cards: readonly CurioCard[] },
): CurioCard[] {
  const cards = curioCatalogSchema.parse(core);
  switch (target.location) {
    case "ruins":
      return cards;
    case "weald":
      return [
        ...cards.filter((card) => curioPoolIdentity(card) === "common"),
        ...wealdCurioCatalogSchema.parse(target.cards),
      ];
    default:
      throw new Error("尚未支持的奇物地点");
  }
}
