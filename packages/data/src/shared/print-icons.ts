import dictionary from "../../dictionary/icon-dictionary-v1.8.json";

/** R-048：只用已审定的词典定位同一印刷变体。重名时必须明确词典序号。 */
export function printIcon(key: string, rank?: number): string {
  const entries = dictionary.icons.filter(
    (entry) => entry.key === key && (rank === undefined || entry.rank === rank),
  );
  if (entries.length !== 1)
    throw new Error("印刷图标引用缺失或不唯一：" + key + (rank === undefined ? "" : " #" + rank));
  return entries[0]!.iconId;
}
