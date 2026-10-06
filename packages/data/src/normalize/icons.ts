import type { IconDictionary, IconStatus } from "../dictionary/schema";
import type { NormalizedIcon, Segment } from "./schema";

const TOKEN = /\{icon:([0-9a-f]{10})\}/g;

export type IconLookup = {
  resolve: (iconId: string) => NormalizedIcon;
};

function namingOf(status: IconStatus): NormalizedIcon["naming"] {
  if (status === "confirmed" || status === "confirmed_rulebook" || status === "decor") {
    return status;
  }
  return "unverified";
}

/** 按词典 v1.2 解析 iconId。未收录、needs_review、unsure、unreviewed 的 naming 都是 unverified。 */
export function createIconLookup(dictionary: IconDictionary): IconLookup {
  const byId = new Map(dictionary.icons.map((icon) => [icon.iconId, icon]));
  return {
    resolve(iconId: string): NormalizedIcon {
      const entry = byId.get(iconId);
      if (!entry) {
        return {
          iconId,
          in_dictionary: false,
          status: null,
          key: null,
          kind: null,
          meaning_en: null,
          meaning_zh: null,
          value: null,
          naming: "unverified",
        };
      }
      return {
        iconId: entry.iconId,
        in_dictionary: true,
        status: entry.status,
        key: entry.key,
        kind: entry.kind,
        meaning_en: entry.meaning_en,
        meaning_zh: entry.meaning_zh,
        value: entry.value,
        naming: namingOf(entry.status),
      };
    },
  };
}

export function noteIcon(icon: NormalizedIcon, reasons: Set<string>): void {
  if (icon.naming === "unverified") reasons.add(`icon:${icon.iconId}`);
}

export function finishVerification(reasons: Set<string>): {
  unverified: boolean;
  reasons: string[];
} {
  const list = [...reasons].sort();
  return { unverified: list.length > 0, reasons: list };
}

/** 把 `{icon:<id>}` 换成词典结果。文本片段原样保留，不解释旁边的数字。 */
export function resolveText(text: string, lookup: IconLookup, reasons: Set<string>): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    const iconId = match[1];
    if (index > last) segments.push({ type: "text", text: text.slice(last, index) });
    if (iconId) {
      const icon = lookup.resolve(iconId);
      noteIcon(icon, reasons);
      segments.push({ type: "icon", icon });
    }
    last = index + match[0].length;
  }
  if (last < text.length) segments.push({ type: "text", text: text.slice(last) });
  return segments;
}

export function resolveLines(
  lines: readonly string[],
  lookup: IconLookup,
  reasons: Set<string>,
): Segment[][] {
  return lines.map((line) => resolveText(line, lookup, reasons));
}
