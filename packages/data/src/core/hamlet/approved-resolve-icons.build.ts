import { printIcon } from "../../shared/print-icons";
import type { IconLookup } from "../../shared/icons";

/** R-056：只批准两张完整正面，不把其他卡的同形图标一起升级。 */
export function approvedResolveLookup(cardId: string, base: IconLookup): IconLookup {
  return {
    resolve(iconId) {
      const icon = base.resolve(iconId);
      const wound =
        cardId === "virtue_affliction:p008" &&
        [printIcon("wound", 668), printIcon("wound", 731)].includes(iconId);
      const arrow =
        cardId === "virtue_affliction:p010" && iconId === printIcon("d10_result_guide_arrow", 687);
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
