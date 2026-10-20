/** 待确认（未核实印刷几何）：下列 left/top 仅为示意百分比，非规则书/U-07 热区坐标。 */
export const HAMLET_BUILDING_MARKERS: readonly {
  readonly id: string;
  readonly label: string;
  readonly leftPct: number;
  readonly topPct: number;
}[] = [
  { id: "abbey", label: "Abbey", leftPct: 12, topPct: 22 },
  { id: "tavern", label: "Tavern", leftPct: 28, topPct: 18 },
  { id: "sanitarium", label: "Sanitarium", leftPct: 44, topPct: 22 },
  { id: "guild", label: "Guild", leftPct: 58, topPct: 18 },
  { id: "stagecoach", label: "Stagecoach", leftPct: 74, topPct: 24 },
  { id: "blacksmith", label: "Blacksmith", leftPct: 18, topPct: 52 },
  { id: "nomadWagon", label: "Nomad Wagon", leftPct: 42, topPct: 55 },
  { id: "survivalist", label: "Survivalist", leftPct: 66, topPct: 52 },
];
