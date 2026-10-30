import rawTrinkets from "../../../data/normalized/corebox/trinket.json";
import { normalizedTrinketFileSchema } from "../../../data/src/normalize/schema";
import { HERO_SKILL_TRINKET_IDS } from "../../../data/src/hero-skill-trinkets";
import type { HeroSkillTrinketId } from "../../../data/src/hero-skill-trinkets";
import type { CoreTrinketId } from "../../../data/src/core-trinket-bindings";
import { createBattleState } from "../battle";
import type { BattleEntity, PlayHeroSkillCommand } from "../battle";
import type { SkillStance } from "../hero-skill";
import { coreQuestSources } from "./core-quest";
const cards = normalizedTrinketFileSchema.parse(rawTrinkets).cards;
export function trinketBattle(
  ids: readonly (HeroSkillTrinketId | CoreTrinketId)[],
  stance: SkillStance = "aggressive",
  skillId = "hero_skill:p001",
  face: "upright" | "inverted" = "upright",
  seed = 4,
  monsterId = "monster_medium:p001",
  light = 5,
) {
  const catalog = coreQuestSources.catalog,
    skill = catalog.skills.find((s) => s.id === skillId)!;
  const level = ids.length > 1 ? 3 : 1;
  const names = [
    skill.hero!,
    ...["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"].filter((n) => n !== skill.hero),
  ].slice(0, 4);
  const stances = [
    stance,
    ...(["aggressive", "defensive", "ranged", "support"] as const).filter((s) => s !== stance),
  ];
  const entities: BattleEntity[] = names.map((name, i) => {
    const stat = catalog.heroStats.find((s) => s.name === name && s.level === (i ? 1 : level))!;
    return {
      id: `h${i}`,
      side: "hero",
      hero: name,
      heroStatId: stat.id,
      heroLevel: stat.level,
      life: stat.life,
      stance: stances[i]!,
      areaId: "a",
      skillIds: i ? [] : [skillId, ...(name === "CRUSADER" ? ["hero_skill:p007"] : [])],
      wounds: 0,
      stress: 3,
      dodge: stat.dodge!,
      dead: false,
      guard: false,
      bleed: [],
      blight: [],
    };
  });
  const monster = catalog.monsters.find((m) => m.id === monsterId)!;
  entities.push({
    id: "m",
    side: "monster",
    hero: null,
    monsterCardId: monster.id,
    life: monster.life,
    stance: "aggressive",
    stanceSlots: 1,
    areaId: ["hero_skill:p001", "hero_skill:p070", "hero_skill:p028"].includes(skillId) ? "a" : "b",
    skillIds: [],
    wounds: 0,
    dodge: monster.dodge,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  });
  entities.push({ ...entities[entities.length - 1]!, id: "m2", stance: "defensive" });
  const initial = createBattleState(seed, {
    ...catalog,
    entities,
    light,
    areas: [
      { id: "a", adjacent: ["b"], elevation: "normal", capacity: 8 },
      { id: "b", adjacent: ["a"], elevation: "normal", capacity: 8 },
    ],
    trinkets: {
      ...catalog.trinkets!,
      cards: [
        ...catalog.trinkets!.cards,
        ...cards.filter((c) => c.level !== 1 && ids.includes(c.id as HeroSkillTrinketId)),
      ],
      held: ids.map((cardId) => ({ cardId, heroId: "h0", face })),
    },
  });
  const state = {
    ...initial,
    battle: {
      ...initial.battle!,
      encounter: {
        round: 1,
        deck: ["monster" as const],
        actedIds: [],
        turn: { type: "hero" as const, actorId: "h0", actions: 2, usedSkillIds: [] },
      },
    },
  };
  const command: PlayHeroSkillCommand = {
    type: "playHeroSkill",
    actorId: "h0",
    targetId: "m",
    skillId,
    trinketWindow: HERO_SKILL_TRINKET_IDS,
  };
  return { state, command };
}
