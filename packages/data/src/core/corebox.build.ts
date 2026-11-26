import { assertFanaticRoomSource } from "./rooms/fanatic-room.build";
import { assertCollectorRoomSource } from "./rooms/collector-room.build";
import { assertProphetRoomSource } from "./rooms/prophet-room.build";
import { assertNecromancerRoomSource } from "./rooms/necromancer-room.build";
import { assertAncestorRoomSource } from "./rooms/ancestor-room.build";
import { assertMammothCystRoomSource } from "./rooms/mammoth-cyst-room.build";
import { assertShufflingHorrorRoomSource } from "./rooms/shuffling-horror-room.build";
import { assertTemplarsRoomEffectSource } from "./rooms/templars-room.build";
import { assertTempleOfTheChosenEffectSource } from "./rooms/temple-of-the-chosen.build";
import { assertEvilEyeEffectSource } from "./rooms/evil-eye.build";
import { assertTeleportersEffectSource } from "./rooms/teleporters.build";
import { assertEldritchPowerChamberEffectSource } from "./rooms/eldritch-power-chamber.build";
import { assertToxicChamberEffectSource } from "./rooms/toxic-chamber.build";
import { assertEldritchVaultEffectSource } from "./rooms/eldritch-vault.build";
import { attachCoreHigherSkills } from "./heroes/core-higher-skills.build";
import { buildDarkestBossContent } from "./bosses/darkest-boss-content.build";
import { buildAbsoluteNothingnessSupport } from "./bosses/absolute-nothingness-support.build";
import { buildDarkestBossAbilities } from "./bosses/darkest-boss-abilities.build";
import { buildRuinsBossAbilities } from "./bosses/ruins-boss-abilities.build";
import { buildQuestCards } from "./quests/quest-cards.build";
import { buildStygianRooms } from "./rooms/stygian-rooms.build";
import { buildDarkestMonsterPool } from "./monsters/darkest-monster-pool.build";
import type { IconDictionary } from "../shared/dictionary/schema";
import type {
  HeroSkillFile,
  MonsterMediumFile,
  MonsterLargeFile,
  TrinketFile,
} from "../shared/extract/parsed";
import type { RawFile } from "../shared/extract/raw";
import { createIconLookup } from "../shared/icons";
import { attachReviewedHeroStances } from "./heroes/reviewed-hero-stances.build";
import {
  applyHeroAnnotations,
  applyHeroBountyStatuses,
  applyHeroDamage,
  applyHeroLayouts,
  applyHeroRanges,
  applyHeroRallyingFlare,
  applyHeroRemoval,
  applyHeroSelfEffects,
  applyHeroEffectKind,
  applyHeroTargetCounts,
  applyHeroTargetStress,
  applyHeroTextRules,
  applyHeroStatuses,
  applyHeroSupport,
} from "./heroes/annotations";
import { attachVerifiedResolveTriggers } from "./hamlet/verified-resolve-triggers.build";
import { withHeroSkillRules, withVirtueRules } from "../shared/rules";
import { buildRoomTileGeometry } from "./tiles/room-tile.build";
import { assertHallOfAscensionEffectSource } from "./rooms/hall-of-ascension.build";
import { assertPoolOfRebirthEffectSource } from "./rooms/pool-of-rebirth.build";
import type { RoomTileGeometryFile } from "./tiles/room-tile";
import { buildHeroStats, normalizedHeroStatFileSchema } from "./heroes/hero-stat.build";
import { HERO_SOURCE_PACKS, heroSourcePaths } from "./heroes/hero-sources";
import { buildWarrensHeroStats } from "../warrens/heroes/hero-stat.build";
import { buildCoveHeroStats } from "../cove/heroes/hero-stat.build";
import { buildWealdHeroStats } from "../weald/heroes/hero-stat.build";
import { buildMusketeerHeroStats } from "./heroes/musketeer-hero-stat.build";
import { buildRooms } from "./rooms/room.build";
import { buildMonsterPool } from "./monsters/monster-pool.build";
import { buildCurios } from "./curios/curio.build";
import { buildHamletEvents } from "./hamlet/hamlet-event.build";
import { buildDiseases } from "./hamlet/disease.build";
import type { NormalizedHeroStatFile } from "./heroes/hero-stat.build";
import type {
  NormalizedHeroSkillFile,
  NormalizedMonsterLargeFile,
  NormalizedMonsterMediumFile,
  NormalizedQuirkFile,
  NormalizedTrinketFile,
  NormalizedVirtueAfflictionFile,
} from "../shared/schema";
import {
  canonicalHeroSkillFileSchema,
  normalizedVirtueAfflictionFileSchema,
} from "../shared/schema";
import { DICTIONARY_SOURCE } from "../shared/card-normalization";
import { buildHeroSkills, canonicalHeroSkillCards } from "./heroes/hero-skill.build";
import { buildMonsterMedium, buildMonsterLarge } from "../shared/monsters/monster.build";
import { buildTrinkets } from "./trinkets/trinket.build";
import { buildQuirks } from "./hamlet/quirk.build";
import { buildVirtues } from "./hamlet/virtue-affliction.build";

export type NormalizedCorebox = {
  hamlet_event: ReturnType<typeof buildHamletEvents>;
  disease: ReturnType<typeof buildDiseases>;
  monster_pool: ReturnType<typeof buildMonsterPool>;
  darkest_monster_pool: ReturnType<typeof buildDarkestMonsterPool>;
  darkest_boss_content: ReturnType<typeof buildDarkestBossContent>;
  absolute_nothingness_support: ReturnType<typeof buildAbsoluteNothingnessSupport>;
  darkest_boss_abilities: ReturnType<typeof buildDarkestBossAbilities>;
  ruins_boss_abilities: ReturnType<typeof buildRuinsBossAbilities>;
  quest_cards: ReturnType<typeof buildQuestCards>;
  stygian_rooms: ReturnType<typeof buildStygianRooms>;
  room: ReturnType<typeof buildRooms>;
  curio: ReturnType<typeof buildCurios>;
  hero_stat: NormalizedHeroStatFile;
  room_tile_geometry: RoomTileGeometryFile;
  hero_skill: NormalizedHeroSkillFile;
  monster_medium: NormalizedMonsterMediumFile;
  monster_large: NormalizedMonsterLargeFile;
  trinket: NormalizedTrinketFile;
  quirk: NormalizedQuirkFile;
  virtue_affliction: NormalizedVirtueAfflictionFile;
};

export type NormalizedCoreboxInput = {
  questsRaw: RawFile;
  bossAbilitiesRaw: RawFile;
  hamletEvents: RawFile;
  diseases: RawFile;
  rooms: RawFile;
  stygianRooms: RawFile;
  curios: RawFile;
  heroStats: RawFile;
  roomTiles: RawFile;
  dictionary: IconDictionary;
  heroSkills: HeroSkillFile;
  heroSkillRaw: RawFile;
  monsterMedium: MonsterMediumFile;
  monsterMediumRaw: RawFile;
  monsterLarge: MonsterLargeFile;
  monsterLargeRaw: RawFile;
  trinkets: TrinketFile;
  trinketRaw: RawFile;
  quirks: RawFile;
  virtues: RawFile;
  extensionWarrensHeroSkills?: HeroSkillFile;
  extensionWarrensHeroSkillRaw?: RawFile;
  extensionWarrensHeroStatRaw?: RawFile;
  extensionCoveHeroSkills?: HeroSkillFile;
  extensionCoveHeroSkillRaw?: RawFile;
  extensionCoveHeroStatRaw?: RawFile;
  extensionWealdHeroSkills?: HeroSkillFile;
  extensionWealdHeroSkillRaw?: RawFile;
  extensionWealdHeroStatRaw?: RawFile;
  extensionMusketeerHeroSkills?: HeroSkillFile;
  extensionMusketeerHeroSkillRaw?: RawFile;
  extensionMusketeerHeroStatRaw?: RawFile;
};

/** 用词典 v1.8 把 parsed / raw 收成规范化卡。纯函数，不读盘。 */
export function buildNormalizedCorebox(input: NormalizedCoreboxInput): NormalizedCorebox {
  const lookup = createIconLookup(input.dictionary);
  const medium = buildMonsterMedium(input.monsterMedium, input.monsterMediumRaw, lookup);
  const large = buildMonsterLarge(input.monsterLarge, input.monsterLargeRaw, lookup);
  const absolute_nothingness_support = buildAbsoluteNothingnessSupport(
    medium,
    large,
    input.monsterMediumRaw,
    input.monsterLargeRaw,
    input.bossAbilitiesRaw,
  );
  const heroInputs = {
    core: { stat: input.heroStats, skillRaw: input.heroSkillRaw, skillParsed: input.heroSkills },
    warrens: {
      stat: input.extensionWarrensHeroStatRaw,
      skillRaw: input.extensionWarrensHeroSkillRaw,
      skillParsed: input.extensionWarrensHeroSkills,
    },
    cove: {
      stat: input.extensionCoveHeroStatRaw,
      skillRaw: input.extensionCoveHeroSkillRaw,
      skillParsed: input.extensionCoveHeroSkills,
    },
    weald: {
      stat: input.extensionWealdHeroStatRaw,
      skillRaw: input.extensionWealdHeroSkillRaw,
      skillParsed: input.extensionWealdHeroSkills,
    },
    musketeer: {
      stat: input.extensionMusketeerHeroStatRaw,
      skillRaw: input.extensionMusketeerHeroSkillRaw,
      skillParsed: input.extensionMusketeerHeroSkills,
    },
  };
  const heroPaths = (field: keyof typeof heroInputs.core) =>
    HERO_SOURCE_PACKS.filter((pack) => heroInputs[pack][field]).map(
      (pack) => heroSourcePaths(pack)[field],
    );
  return {
    disease: buildDiseases(input.diseases, input.dictionary),
    hamlet_event: buildHamletEvents(input.hamletEvents),
    monster_pool: buildMonsterPool(input.monsterMediumRaw, medium, large),
    darkest_monster_pool: buildDarkestMonsterPool(input.monsterMediumRaw, medium),
    darkest_boss_content: buildDarkestBossContent(
      input.questsRaw,
      input.bossAbilitiesRaw,
      medium,
      large,
      absolute_nothingness_support,
    ),
    darkest_boss_abilities: buildDarkestBossAbilities(input.bossAbilitiesRaw),
    absolute_nothingness_support,
    ruins_boss_abilities: buildRuinsBossAbilities(input.bossAbilitiesRaw),
    quest_cards: buildQuestCards(input.questsRaw),
    stygian_rooms: buildStygianRooms(input.stygianRooms, input.rooms),
    room: buildRooms(input.rooms),
    curio: buildCurios(input.curios, input.dictionary),
    hero_stat: (() => {
      const core = buildHeroStats(input.heroStats, input.dictionary);
      return normalizedHeroStatFileSchema.parse({
        ...core,
        sources: {
          ...core.sources,
          raw: heroPaths("stat"),
        },
        cards: [
          ...core.cards,
          ...(heroInputs.warrens.stat
            ? buildWarrensHeroStats(heroInputs.warrens.stat, input.dictionary)
            : []),
          ...(heroInputs.cove.stat
            ? buildCoveHeroStats(heroInputs.cove.stat, input.dictionary)
            : []),
          ...(heroInputs.weald.stat
            ? buildWealdHeroStats(heroInputs.weald.stat, input.dictionary)
            : []),
          ...(heroInputs.musketeer.stat
            ? buildMusketeerHeroStats(heroInputs.musketeer.stat, input.dictionary)
            : []),
        ],
      });
    })(),
    hero_skill: (() => {
      const parsed = {
        ...input.heroSkills,
        cards: HERO_SOURCE_PACKS.flatMap((pack) => heroInputs[pack].skillParsed?.cards ?? []),
      };
      const raw = {
        ...input.heroSkillRaw,
        cards: HERO_SOURCE_PACKS.flatMap((pack) => heroInputs[pack].skillRaw?.cards ?? []),
      };
      const file = buildHeroSkills(parsed, raw, lookup, {
        parsed: heroPaths("skillParsed"),
        raw: heroPaths("skillRaw"),
        dictionary: DICTIONARY_SOURCE,
      });
      const reviewed = attachReviewedHeroStances(file.cards);
      const canonical = canonicalHeroSkillCards(reviewed);
      const cards = attachCoreHigherSkills(
        applyHeroRallyingFlare(
          applyHeroBountyStatuses(
            applyHeroSupport(
              applyHeroDamage(
                applyHeroRanges(
                  applyHeroStatuses(
                    applyHeroTextRules(
                      applyHeroTargetStress(
                        applyHeroTargetCounts(
                          applyHeroEffectKind(
                            applyHeroRemoval(
                              applyHeroSelfEffects(
                                applyHeroAnnotations(applyHeroLayouts(canonical)),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      );
      return canonicalHeroSkillFileSchema.parse({
        ...file,
        cards: cards.map((card) => withHeroSkillRules(card)),
      });
    })(),
    room_tile_geometry: (() => {
      assertPoolOfRebirthEffectSource(input.rooms);
      assertHallOfAscensionEffectSource(input.rooms);
      assertEldritchVaultEffectSource(input.rooms);
      assertToxicChamberEffectSource(input.rooms);
      assertEldritchPowerChamberEffectSource(input.rooms);
      assertTeleportersEffectSource(input.rooms);
      assertEvilEyeEffectSource(input.rooms);
      assertTempleOfTheChosenEffectSource(input.rooms);
      assertTemplarsRoomEffectSource(input.rooms);
      assertShufflingHorrorRoomSource(input.rooms);
      assertMammothCystRoomSource(input.rooms);
      assertAncestorRoomSource(input.rooms);
      assertNecromancerRoomSource(input.rooms);
      assertProphetRoomSource(input.rooms);
      assertCollectorRoomSource(input.rooms);
      assertFanaticRoomSource(input.rooms);
      return buildRoomTileGeometry(input.roomTiles);
    })(),
    monster_medium: medium,
    monster_large: large,
    trinket: buildTrinkets(input.trinkets, input.trinketRaw, lookup),
    quirk: buildQuirks(input.quirks, lookup),
    virtue_affliction: (() => {
      const file = buildVirtues(input.virtues, lookup);
      return normalizedVirtueAfflictionFileSchema.parse({
        ...file,
        cards: attachVerifiedResolveTriggers(file.cards).map((card) => withVirtueRules(card)),
      });
    })(),
  };
}
