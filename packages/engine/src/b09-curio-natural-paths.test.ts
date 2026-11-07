import { expect, it } from "vitest";
import { naturalQuest } from "./test-helpers/natural-quest";

// Q-19：位移终点切入大型怪两格之间仍是待裁定停点。Rising Threat 的 Curio 守卫战
// （含 II 级大怪）在自然路径中会触达它；此处按已知 hold 容忍，其余拒绝仍视为失败。
const KNOWN_HOLDS = ["Q-19"];

for (const questId of ["quest:p001", "quest:p005"] as const) {
  it(`${questId} seeds 1-100：无未裁定 commandRefused`, () => {
    const failures: string[] = [];
    for (let seed = 1; seed <= 100; seed++) {
      try {
        const run = naturalQuest(seed, questId, true);
        const refused = run.events.filter((e) => e.type === "commandRefused");
        if (refused.length)
          failures.push(`seed ${seed}: ${refused.map((e) => e.message).join(" | ")}`);
        if (run.stopReason && !run.stopReason.includes("awaitingReplacement"))
          failures.push(`seed ${seed} stop: ${run.stopReason}`);
      } catch (e) {
        failures.push(`seed ${seed} throw: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    expect(failures.filter((line) => !KNOWN_HOLDS.some((hold) => line.includes(hold)))).toEqual([]);
  }, 120000);
}
