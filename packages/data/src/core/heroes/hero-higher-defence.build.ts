import type { RawFile } from "../../shared/extract/raw";
import { approvedHigherDefence, higherHeroDefenceApprovals } from "./hero-higher-defence";

export function buildHigherHeroDefence(
  id: string,
  face: NonNullable<RawFile["cards"][number]["faces"]["front"]>,
) {
  const approved = approvedHigherDefence(id);
  if (!approved || approved.approval === "kyries_review_2026-11-10") return approved;
  const row = higherHeroDefenceApprovals.find((r) => r.id === id)!;
  const labels = face.spans.filter((s) => s.t === "Resistances        Immunities"),
    hamlet = face.spans.filter((s) => s.t === "Hamlet Skill:");
  if (labels.length !== 1 || hamlet.length !== 1)
    throw new Error("高等级防御完整栏定位不唯一（R-081）");
  const [left, , right, bottom] = labels[0]!.bbox,
    split = (left + right) / 2;
  const icons = face.icons
    .filter(
      (i) =>
        !i.decor &&
        // TDH 免疫栏标题装饰，不是抗性/免疫（R-104 / Q-104）。
        i.iconId !== "55a3fded25" &&
        (i.bbox[0] + i.bbox[2]) / 2 >= left &&
        (i.bbox[0] + i.bbox[2]) / 2 <= right &&
        (i.bbox[1] + i.bbox[3]) / 2 > bottom &&
        (i.bbox[1] + i.bbox[3]) / 2 < hamlet[0]!.bbox[1],
    )
    .sort((a, b) => a.bbox[0] - b.bbox[0]);
  for (const side of ["resistances", "immunities"] as const) {
    const actual = icons
      .filter((i) => (i.bbox[0] + i.bbox[2]) / 2 < split === (side === "resistances"))
      .map((i) => i.iconId);
    if (JSON.stringify(actual) !== JSON.stringify(row[side].map((r) => r[0])))
      throw new Error("高等级防御图标/左右栏漂移（R-081）");
  }
  return approved;
}
