import { describe, expect, it } from "vitest";
import { COVE_LEVEL_ONE_MONSTER_IDENTITIES } from "../../../src/cove/monsters/monsters.build";
import { buildCoveLevelOneMonsterInstances } from "../../../src/cove/monsters/monster-pool";
import { loadNormalizedCoveLevelOneMonsters } from "../../../src/cove/write";

const medium = loadNormalizedCoveLevelOneMonsters().monster_medium;

describe("Cove I 级怪物地点牌堆实体（R9–R10、C1；Q-186 未核准）", () => {
  it("17 张当地实体对应六种 I 级中型卡，前后排取自卡面标签", () => {
    const instances = buildCoveLevelOneMonsterInstances(medium);
    expect(instances).toHaveLength(17);
    expect(instances.every((entry) => entry.combatReady === false)).toBe(true);
    expect(new Set(instances.map((entry) => entry.instanceId)).size).toBe(17);
    expect(instances.map((entry) => entry.instanceId)).toEqual(
      Array.from({ length: 17 }, (_, i) => `monster-deck:cove:p${String(i + 1).padStart(3, "0")}`),
    );
    const byCard = Object.fromEntries(
      COVE_LEVEL_ONE_MONSTER_IDENTITIES.map((identity) => [
        identity.id,
        instances.filter((entry) => entry.cardId === identity.id),
      ]),
    );
    expect(byCard["monster_medium:cove:p001"]!.every((entry) => entry.edge === "back")).toBe(true);
    expect(byCard["monster_medium:cove:p004"]!.every((entry) => entry.edge === "front")).toBe(true);
    expect(byCard["monster_medium:cove:p010"]!.every((entry) => entry.edge === "back")).toBe(true);
    expect(byCard["monster_medium:cove:p016"]!).toHaveLength(2);
    expect(byCard["monster_medium:cove:p016"]!.map((entry) => entry.instanceId)).toEqual([
      "monster-deck:cove:p016",
      "monster-deck:cove:p017",
    ]);
  });

  it("拒绝缺卡、重复、前后排漂移或非 Cove 来源", () => {
    expect(() => buildCoveLevelOneMonsterInstances(medium)).not.toThrow();
    const missing = structuredClone(medium);
    missing.cards.pop();
    expect(() => buildCoveLevelOneMonsterInstances(missing)).toThrow();
    const drift = structuredClone(medium);
    drift.cards[0]!.type_position_tags = ["Eldritch"];
    expect(() => buildCoveLevelOneMonsterInstances(drift)).toThrow("部署身份");
    const foreign = structuredClone(medium);
    foreign.sources.raw = "extract/extension/weald/raw/monster_medium.json";
    expect(() => buildCoveLevelOneMonsterInstances(foreign)).toThrow("来源");
  });
});
