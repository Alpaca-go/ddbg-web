import index from "../../dictionary/print-icon-index.json";

const labels: Readonly<Record<string, readonly (readonly (string | number)[])[]>> = index.labels;
const sources: Readonly<Record<string, string>> = index.sources;

/** R-048：精确印刷核对使用固定词典序号。 */
export function printIcon(key: string, rank: number): string {
  const id = variantsOf(key)?.find(([entryRank]) => entryRank === rank)?.[1];
  if (typeof id !== "string") throw new Error("印刷图标变体未登记：" + key + " #" + rank);
  return id;
}

function variantsOf(key: string) {
  return Object.hasOwn(labels, key) ? labels[key] : undefined;
}

/** 按图标确认所属语义，允许该语义有多个印刷变体。 */
export function hasPrintIconMeaning(iconId: string, key: string): boolean {
  return variantsOf(key)?.some(([, variant]) => variant === iconId) ?? false;
}

/** 尚无可用词典键的印刷变体，以审定快照中的卡、面与放置位置引用。 */
export function printSourceIcon(locator: string): string {
  const id = Object.hasOwn(sources, locator) ? sources[locator] : undefined;
  if (id === undefined) throw new Error("缺少已登记的印刷图标来源：" + locator);
  return id;
}

/** 生成原印刷行签名，保留文字、图标次序和空白。 */
export function printLine(line: string): string {
  return line.replace(
    /\{print:([a-z0-9_]+)(?:@(\d+))?\}|\{extract:([^{}]+)\}/g,
    (_, key: string | undefined, rank: string | undefined, source: string | undefined) => {
      if (source !== undefined) return "{icon:" + printSourceIcon(source) + "}";
      if (rank === undefined) throw new Error("印刷行须指定图标变体：" + key);
      return "{icon:" + printIcon(key!, Number(rank)) + "}";
    },
  );
}
