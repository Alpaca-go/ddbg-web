import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const data = resolve(root, "packages/data");
const dictionaryFile = "dictionary/icon-dictionary-v1.8.json";
const output = resolve(data, "dictionary/print-icon-index.json");
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

const labels = new Map();
for (const entry of readJson(resolve(data, dictionaryFile)).icons) {
  const label = /^(?:unknown|pending)_/.test(entry.key) ? entry.status : entry.key;
  const variants = labels.get(label) ?? [];
  variants.push([entry.rank, entry.iconId]);
  labels.set(label, variants);
}

const locators = new Set();
for (const directory of ["packages/data/src", "packages/data/tests", "packages/engine/tests"]) {
  for (const entry of readdirSync(resolve(root, directory), {
    recursive: true,
    withFileTypes: true,
  })) {
    if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
    const text = readFileSync(resolve(entry.parentPath, entry.name), "utf8");
    for (const match of text.matchAll(
      /printSourceIcon\(\s*"([^"]+)"\s*,?\s*\)|\{extract:([^{}]+)\}/g,
    ))
      locators.add(match[1] ?? match[2]);
  }
}
const decks = new Map();
const sources = Object.fromEntries(
  [...locators].sort().map((locator) => {
    const match =
      /^(?<file>(?:corebox|extension\/[a-z]+)\/raw\/[a-z_]+\.json):(?<id>[^/]+):(?<face>front|back):(?<segment>\d+)$/.exec(
        locator,
      );
    if (!match) throw new Error("印刷图标来源格式错误：" + locator);
    const { file, id, face, segment } = match.groups;
    if (!decks.has(file)) decks.set(file, readJson(resolve(data, "extract", file)));
    const cards = decks.get(file).cards.filter((card) => card.id === id);
    const iconId = cards[0]?.faces[face]?.icons[Number(segment)]?.iconId;
    if (cards.length !== 1 || !/^[0-9a-f]{10}$/.test(iconId ?? ""))
      throw new Error("印刷图标来源缺失或不唯一：" + locator);
    return [locator, iconId];
  }),
);
const json = await prettier.format(
  JSON.stringify({
    dictionary: dictionaryFile,
    labels: Object.fromEntries([...labels.keys()].sort().map((key) => [key, labels.get(key)])),
    sources,
  }),
  { ...(await prettier.resolveConfig(output)), filepath: output },
);
if (process.argv.includes("--check")) {
  if (readFileSync(output, "utf8").replace(/\r\n/g, "\n") !== json)
    throw new Error("印刷图标索引与已登记的词典和提取位置不一致");
} else writeFileSync(output, json);
