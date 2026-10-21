import type { FlowPhaseId } from "./flow-phase";

export type PhaseZonePlan = {
  readonly topLeft: string;
  readonly topRight: string;
  readonly party: string;
  readonly initiative: string;
  readonly center: string;
  readonly deckStacks: boolean;
  readonly detail: string;
  readonly dock: string;
  readonly diceTray: string | null;
  readonly primaryAction: string | null;
  readonly showBattleTokens: boolean;
};

/** 规划表 §2.2：各阶段五区占位说明（T1 仅标注，不接引擎行为）。 */
export const PHASE_ZONE_PLAN: Record<FlowPhaseId, PhaseZonePlan> = {
  questSetup: {
    topLeft: "战役 · 第 1 幕 · 难度模式",
    topRight: "金币（开局数）",
    party: "4 个空席位 · 从名册选英雄",
    initiative: "当前编辑的席位",
    center: "英雄卡大图 + 7 张技能（选 3）",
    deckStacks: false,
    detail: "选中英雄的英雄卡（Life、Dodge、Speed）",
    dock: "技能 7 选 3",
    diceTray: null,
    primaryAction: null,
    showBattleTokens: false,
  },
  hamlet: {
    topLeft: "第 N 幕 · 准备天数 1–4",
    topRight: "金币 · 驿站 XP",
    party: "4 名英雄 · 村庄姿态顺序 ·「今天已行动」",
    initiative: "今天轮到的英雄（看守人占用建筑）",
    center: "村庄版图 hamlet_board · 事件卡 · 建筑列表",
    deckStacks: true,
    detail: "选中建筑的服务与价格（§4.5）",
    dock: "当前英雄技能 · Guild 升级对比",
    diceTray: "看守人 d10",
    primaryAction: "结束这一天",
    showBattleTokens: false,
  },
  expeditionPrep: {
    topLeft: "2 张任务卡候选",
    topRight: "金币 · 补给骰池 n/16 · 柴火",
    party: "4 名英雄 · 每人「掷 2 颗补给骰」",
    initiative: "当前掷骰的英雄",
    center: "2 张任务卡并排 + QuestMap 预览",
    deckStacks: true,
    detail: "选中任务卡详情（XP 目标、房间构成、柴火）",
    dock: "补给骰池（16 格）",
    diceTray: "补给骰",
    primaryAction: "出发",
    showBattleTokens: false,
  },
  dungeonExploration: {
    topLeft: "地点 · 任务 · DL",
    topRight: "金币 · 光照 0–5 · 柴火 / 休息次数",
    party: "4 名英雄 · 伤口、压力、状态",
    initiative: "探索骰结算的英雄（姿态顺序）",
    center: "地牢板块 / QuestMap · 房间代币 · 队伍 token · 行动条",
    deckStacks: true,
    detail: "选中房间代币或 Curio 卡",
    dock: "探索骰托盘 / Curio 选项 / 补给抵消",
    diceTray: "探索骰 / Curio 守卫 d10",
    primaryAction: "确认路线",
    showBattleTokens: false,
  },
  battle: {
    topLeft: "地点 · 任务 · DL · 房间卡名",
    topRight: "金币 · 光照 · 第 r/4 轮",
    party: "4 名英雄 · 先攻状态（已行动 / 当前）",
    initiative: "先攻牌堆 + 已翻开 + 回合轨",
    center: "怪物姿态轨 + 房间板块 + 英雄姿态轨",
    deckStacks: true,
    detail: "怪物卡 / 英雄卡 + 房间卡",
    dock: "行动分页 + 已装备技能卡",
    diceTray: "技能 d10 / 死门骰 / 苦难美德 d10",
    primaryAction: "结束本回合 / 抽下一张先攻（V-01）",
    showBattleTokens: true,
  },
  questReturn: {
    topLeft: "任务名 · 完成目标",
    topRight: "金币 · 补给换金进度",
    party: "4 名英雄 · XP +n · 苦难/美德转怪癖 · 阵亡灰化",
    initiative: "结算台步骤 R32 a→d",
    center: "苦难卡翻怪癖 · 补给骰变金币",
    deckStacks: false,
    detail: "任务 XP 计算明细",
    dock: "结算清单",
    diceTray: null,
    primaryAction: "完成结算 / 存档",
    showBattleTokens: false,
  },
};

export function planForPhase(phase: FlowPhaseId): PhaseZonePlan {
  return PHASE_ZONE_PLAN[phase];
}
