import type { StatusStack } from "@ddbg/engine";

const STATUS_ZH: Partial<Record<StatusStack["kind"], string>> = {
  bleed: "流血",
  blight: "腐蚀",
  stun: "眩晕",
  buff: "增益",
  debuff: "减益",
  riposte: "反击",
  guard: "守护",
  mark: "标记",
  protection: "防护",
};

export function formatStatusStack(stack: StatusStack): string {
  const label = STATUS_ZH[stack.kind] ?? stack.kind;
  return `${label} ${stack.remaining}t`;
}

export function TabletopStatusList({
  stacks,
  testId,
}: {
  readonly stacks: readonly StatusStack[];
  readonly testId?: string;
}) {
  if (!stacks.length) {
    return <p className="tt-detail__muted muted">无状态堆叠</p>;
  }
  return (
    <ul className="tt-detail__status-list" {...(testId ? { "data-testid": testId } : {})}>
      {stacks.map((stack, index) => (
        <li
          key={`${stack.kind}-${index}`}
          className="tt-condition-chip"
          data-asset-type="punchboard_token"
        >
          {formatStatusStack(stack)}
        </li>
      ))}
    </ul>
  );
}

export function woundsLine(wounds: number, life: number, lifeKnown: boolean): string {
  if (!lifeKnown) return `伤口 ${wounds}/待确认`;
  return `伤口 ${wounds}/${life}`;
}
