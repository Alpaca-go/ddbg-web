# K-019 · Collector / Prophet 召唤 hook 归口

核对规范化原始效果：Collector p092–94 两招均无 summon，召唤来自 Collect All；Prophet p005–7 三招均无 summon，Wooden Pew 来自独立能力。依据印刷卡、R39、R-001 / R-048。

对合法技能编号的 purpose:skill 返回 notApplicable，不再将“不适用”标为“未接”；非法编号仍保留防御性 stub，既有 Collect All / Wooden Pew 路径不变。不触及生产几何。29 测通过。
