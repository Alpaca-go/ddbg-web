import index from "../../dictionary/print-icon-index.json";

const labels: Readonly<Record<string, readonly (readonly (string | number)[])[]>> = index.labels;
const sources: Readonly<Record<string, string>> = index.sources;

/** R-048：只用已审定的词典定位同一印刷变体。重名时必须明确词典序号。 */
export function printIcon(key: string, rank?: number): string {
  const variants = Object.hasOwn(labels, key) ? labels[key] : undefined;
  const row =
    rank === undefined
      ? variants?.length === 1
        ? variants[0]
        : undefined
      : variants?.find(([entryRank]) => entryRank === rank);
  const id = row?.[1];
  if (typeof id !== "string")
    throw new Error("印刷图标引用缺失或不唯一：" + key + (rank === undefined ? "" : " #" + rank));
  return id;
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
    (_, key: string | undefined, rank: string | undefined, source: string | undefined) =>
      "{icon:" +
      (source === undefined
        ? printIcon(key!, rank === undefined ? undefined : Number(rank))
        : printSourceIcon(source)) +
      "}",
  );
}
