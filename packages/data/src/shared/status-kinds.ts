/** 规则与数据共用的状态定义。技能与卡牌声明每次施加的数值、持续时间和目标。 */
export const STATUS_DEFINITIONS = {
  bleed: { turnStart: "wounds" },
  blight: { turnStart: "wounds" },
  stun: { turnStart: "stunned" },
  buff: { turnStart: null },
  debuff: { turnStart: null },
  mark: { turnStart: null },
  guard: { turnStart: null },
  riposte: { turnStart: null },
  protection: { turnStart: null },
} as const;

export type StatusKind = keyof typeof STATUS_DEFINITIONS;
export const STATUS_KINDS: readonly StatusKind[] = Object.keys(STATUS_DEFINITIONS) as StatusKind[];
