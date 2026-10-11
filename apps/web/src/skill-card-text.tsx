import type { SkillSegment } from "@ddbg/engine";

/** 只呈现卡面与已批准词典；不从文字计算数值或命名未知图标（R-048）。 */
export function SkillCardText({
  name,
  level,
  lines,
}: {
  readonly name: string;
  readonly level: number;
  readonly lines: readonly (readonly SkillSegment[])[];
}) {
  return (
    <details open className="card-text" data-testid="skill-card-text">
      <summary>
        {name} · 等级 {level} · 英文卡面文字
      </summary>
      {lines.map((line, i) => (
        <p key={i}>
          {line.map((segment, j) => {
            if (segment.type === "text") return <span key={j}>{segment.text}</span>;
            const icon = segment.icon;
            if (icon.naming === "decor") return null;
            const confirmed = ["confirmed", "confirmed_rulebook"].includes(icon.naming);
            const label =
              confirmed && "meaning_zh" in icon && typeof icon.meaning_zh === "string"
                ? icon.meaning_zh
                : confirmed && icon.key
                  ? icon.key
                  : `未核实:${"iconId" in icon ? String(icon.iconId) : "原始图标"}`;
            const description =
              confirmed && "meaning_en" in icon && typeof icon.meaning_en === "string"
                ? icon.meaning_en
                : undefined;
            return (
              <span key={j} className="card-icon-label" title={description}>
                [{label}]
              </span>
            );
          })}
        </p>
      ))}
    </details>
  );
}
