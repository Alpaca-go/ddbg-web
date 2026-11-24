import type { Segment } from "../../../shared/schema";

/** 效果行签名：图标按 key 归一，空白折叠；用于逐卡断言印刷行未漂移（R-048）。 */
export function lineSignature(line: readonly Segment[]): string {
  return line
    .map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`))
    .join("")
    .split(String.fromCharCode(7))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}
