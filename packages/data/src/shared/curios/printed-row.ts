/** 用印刷顺序排布效果图标与数字。 */
export function formatCurioPrintedRow(printed: string, iconId: string): string {
  const token = `{icon:${iconId}}`;
  if (printed === "+1" || printed === "2t") return `${token} ${printed}`;
  if (printed === "1 · 3t") return `1 ${token} 3t`;
  return `${printed} ${token}`.trim();
}
