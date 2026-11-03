import statsFile from "../../../data/normalized/corebox/hero_stat.json";
import quirkFile from "../../../data/normalized/corebox/quirk.json";
import diseaseFile from "../../../data/normalized/corebox/disease.json";
import resolveFile from "../../../data/normalized/corebox/virtue_affliction.json";
import { normalizedHeroStatFileSchema } from "../../../data/src/normalize/hero-stat";
import { normalizedQuirkFileSchema } from "../../../data/src/normalize/schema";
import { diseaseFileSchema } from "../../../data/src/disease";
import { createBattleState } from "../battle";
import type { BattleEntity, BattleSetup } from "../battle";
import { applyCommand } from "../command";
import type { GameState } from "../command";
import { createConditionPool } from "../conditions";
import type { ResolveCard } from "../pressure";

const stats = normalizedHeroStatFileSchema
  .parse(statsFile)
  .cards.filter(
    (s) => s.level === 1 && ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"].includes(s.name),
  );
const quirks = normalizedQuirkFileSchema.parse(quirkFile).cards;
const diseases = diseaseFileSchema.parse(diseaseFile).cards;
export function roomEffectFixture(
  areas: NonNullable<BattleSetup["areas"]>,
  changes: Partial<BattleEntity> = {},
  light = 5,
  seed = 1,
): GameState {
  const heroes: BattleEntity[] = stats.map((s, i) => ({
    id: `h${i}`,
    side: "hero",
    hero: s.name,
    heroStatId: s.id,
    heroLevel: 1,
    life: s.life,
    wounds: i ? 0 : 12,
    stress: 0,
    areaId: i ? "G" : "E",
    dodge: s.dodge,
    stance: (["aggressive", "defensive", "ranged", "support"] as const)[i]!,
    skillIds: [],
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
    ...(i ? {} : changes),
  }));
  // 独立区域机制夹具；公开清场复活由pool-rebirth-flow场景覆盖。
  const created = createBattleState(seed, {
    heroStats: JSON.parse(JSON.stringify(stats)) as NonNullable<BattleSetup["heroStats"]>,
    entities: [
      ...heroes,
      {
        id: "m",
        side: "monster",
        hero: null,
        areaId: "C",
        stance: "aggressive",
        stanceSlots: 1,
        monsterCardId: "m",
        life: 10,
        wounds: 0,
        dodge: 0,
        skillIds: [],
        guard: false,
        dead: false,
        bleed: [],
        blight: [],
      },
    ],
    areas,
    skills: [],
    light,
    resolveCards: resolveFile.cards as ResolveCard[],
    conditions: createConditionPool(diseases, quirks),
    monsters: [
      {
        id: "m",
        life: 10,
        verification: { unverified: false },
        skills: [],
        stanceGroups: [{ stances: ["aggressive", "defensive", "ranged", "support"], skill: 1 }],
      },
    ],
  });
  const started = applyCommand(created, { type: "startBattle" }).state;
  return {
    ...started,
    battle: {
      ...started.battle!,
      rngCursor: 0,
      encounter: {
        ...started.battle!.encounter!,
        deck: ["monster"],
        actedIds: [],
        turn: { type: "hero", actorId: "h0", actions: 2, usedSkillIds: [], mustMove: false },
      },
    },
  };
}
