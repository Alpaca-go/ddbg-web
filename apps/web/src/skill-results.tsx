import type { HeroSkillResolution } from "@ddbg/engine";

const outcomes = { crit: "暴击", hit: "命中", miss: "落空" };

/** 读取本次事件的结果；不从当前棋子状态逆推历史伤害或治疗量。 */
export function SkillResults({
  actorName,
  resolutions,
  entityName,
  skillName,
}: {
  readonly actorName: string;
  readonly resolutions: readonly HeroSkillResolution[];
  readonly entityName: (id: string) => string;
  readonly skillName: (id: string) => string;
}) {
  return (
    <div className="target-results">
      <p>使用者：{actorName}</p>
      {resolutions.map((result) => (
        <div key={result.targetId}>
          <p>
            技能：{skillName(result.skillId)} · {entityName(result.targetId)}：
            {result.status === "refused"
              ? `拒绝 · ${result.reason}`
              : result.outcome
                ? outcomes[result.outcome]
                : "直接生效"}
            {result.status === "resolved" && (
              <>
                {result.damageDealt !== null && ` · 伤害 ${result.damageDealt}`}
                {result.effect === "heal" &&
                  result.printedAmount !== null &&
                  ` · 印刷治疗值 ${result.printedAmount}`}
                {result.riposteDamage !== null && ` · 反击对使用者伤害 ${result.riposteDamage}`}
                {result.targetProtectionIgnored && " · 本次无视防护"}
              </>
            )}
          </p>
          {result.skipped.length > 0 && (
            <details>
              <summary>{entityName(result.targetId)} · 未结算效果</summary>
              {result.skipped.map((item) => (
                <p key={item.code}>
                  {item.code === "effect_lines"
                    ? "卡面效果行未完整支持，本次未结算。"
                    : "组合标记没有额外结算。"}
                </p>
              ))}
            </details>
          )}
        </div>
      ))}
    </div>
  );
}
