import path from "node:path";
import { DATA_ROOT, readDataJson, writeDataFiles } from "../shared/write-files";
import { rawFileSchema } from "../shared/extract/raw";
import { buildCoveBossAbilities } from "./bosses/cove-boss-abilities.build";
import { buildCoveBossCombatCards } from "./bosses/cove-boss-combat-cards.build";
import { buildCoveCurios } from "./curios/curio.build";
import { buildCoveRooms } from "./rooms/room.build";

export function loadNormalizedCoveCurios() {
  return buildCoveCurios(
    rawFileSchema.parse(readDataJson("extract/extension/cove/raw/curio.json")),
  );
}

export function writeNormalizedCoveCurios(
  outputDir = path.join(DATA_ROOT, "normalized/extension/cove"),
) {
  const built = loadNormalizedCoveCurios();
  writeDataFiles(outputDir, { "curio.json": built });
  return built;
}

const roomRaw = () => rawFileSchema.parse(readDataJson("extract/extension/cove/raw/room.json"));

export function loadNormalizedCoveRooms() {
  return buildCoveRooms(roomRaw());
}

export function writeNormalizedCoveRooms(
  outputDir = path.join(DATA_ROOT, "normalized/extension/cove"),
) {
  const rooms = loadNormalizedCoveRooms();
  writeDataFiles(outputDir, { "room.json": rooms });
  return rooms;
}

const bossAbilityRaw = () =>
  rawFileSchema.parse(readDataJson("extract/extension/cove/raw/boss_ability.json"));

const monsterMediumRaw = () =>
  rawFileSchema.parse(readDataJson("extract/extension/cove/raw/monster_medium.json"));

const monsterLargeRaw = () =>
  rawFileSchema.parse(readDataJson("extract/extension/cove/raw/monster_large.json"));

export function loadNormalizedCoveBossAbilities() {
  return buildCoveBossAbilities(bossAbilityRaw());
}

export function loadNormalizedCoveBossCombatCards() {
  return buildCoveBossCombatCards(monsterMediumRaw(), monsterLargeRaw());
}

export function writeNormalizedCoveBossCatalog(
  outputDir = path.join(DATA_ROOT, "normalized/extension/cove"),
) {
  const boss_abilities = loadNormalizedCoveBossAbilities();
  const boss_combat_cards = loadNormalizedCoveBossCombatCards();
  writeDataFiles(outputDir, {
    "boss_abilities.json": boss_abilities,
    "boss_combat_cards.json": boss_combat_cards,
  });
  return { boss_abilities, boss_combat_cards };
}
