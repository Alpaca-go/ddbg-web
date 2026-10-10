import type { IconLookup } from "./icons";

/** R-056：只批准两张完整正面，不把其他卡的同形图标一起升级。 */
export function approvedResolveLookup(cardId: string, base: IconLookup): IconLookup {
  return {
    resolve(iconId) {
      const icon = base.resolve(iconId);
      const wound =
        cardId === "virtue_affliction:p008" && ["2c1824ea21", "d42d7955d3"].includes(iconId);
      const arrow = cardId === "virtue_affliction:p010" && iconId === "5a4fbf9781";
      if (!wound && !arrow) return icon;
      if (!icon.in_dictionary) throw new Error(`R-056 图标在基础词典缺失：${iconId}`);
      return {
        ...icon,
        status: "confirmed",
        naming: "confirmed",
        key: wound ? "wound" : "result_table_arrow",
        kind: wound ? "damage_type" : "marker",
        meaning_en: wound ? "Wound" : "Result table pointer",
        meaning_zh: wound ? "伤口" : "结果表指向标记",
        value: null,
        approval: "R-056",
      };
    },
  };
}
