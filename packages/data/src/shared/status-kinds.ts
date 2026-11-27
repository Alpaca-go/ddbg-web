/** 规则与数据共用的状态 ID。卡牌各自声明动作、数值、持续时间和目标。 */
export const STATUS_KINDS = [
  "bleed",
  "blight",
  "stun",
  "buff",
  "debuff",
  "mark",
  "guard",
  "riposte",
  "protection",
] as const;
