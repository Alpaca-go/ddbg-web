/** 构建期按完整内容共享目录条目；同卡号的历史差异绝不合并。 */
export function shareBattleCatalogs(catalogs: Readonly<Record<string, Record<string, unknown>>>) {
  const entries: unknown[] = [];
  const indices = new Map<string, number>();
  const reference = (value: unknown) => {
    const serialized = JSON.stringify(value);
    let index = indices.get(serialized);
    if (index === undefined) {
      index = entries.length;
      entries.push(value);
      indices.set(serialized, index);
    }
    return `entries[${index}]`;
  };
  const modules = Object.fromEntries(
    Object.entries(catalogs).map(([id, catalog]) => [
      id,
      `{${Object.entries(catalog)
        .map(
          ([key, value]) =>
            `${JSON.stringify(key)}:${
              Array.isArray(value) ? `[${value.map(reference).join(",")}]` : reference(value)
            }`,
        )
        .join(",")}}`,
    ]),
  );
  return { entries, modules };
}
