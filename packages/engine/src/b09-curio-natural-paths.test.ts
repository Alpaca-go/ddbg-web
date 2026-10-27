import { expect, it } from "vitest";
import { naturalQuest } from "./test-helpers/natural-quest";

for (const questId of ["quest:p001", "quest:p005"] as const) {
  it(`${questId} seeds 1-100：无 commandRefused`, () => {
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
    expect(failures).toEqual([]);
  }, 120000);
}
