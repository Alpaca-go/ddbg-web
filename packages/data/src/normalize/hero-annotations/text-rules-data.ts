import type { IgnoresEntry, ShuffleEntry } from "./types";

import { shuffleEntries as h01_crusaderShuffle } from "./h01-crusader";
import { shuffleEntries as h02_hellionShuffle } from "./h02-hellion";
import { shuffleEntries as h03_bounty_hunterShuffle } from "./h03-bounty-hunter";
import { shuffleEntries as h04_highwaymanShuffle } from "./h04-highwayman";
import { shuffleEntries as h06_jesterShuffle } from "./h06-jester";
import { ignoresEntries as h06_jesterIgnores } from "./h06-jester";
import { shuffleEntries as h07_plague_doctorShuffle } from "./h07-plague-doctor";
import { shuffleEntries as h08_arbalestShuffle } from "./h08-arbalest";
import { shuffleEntries as h09_grave_robberShuffle } from "./h09-grave-robber";
import { ignoresEntries as h09_grave_robberIgnores } from "./h09-grave-robber";
import { shuffleEntries as h10_occultistShuffle } from "./h10-occultist";
import { shuffleEntries as h11_abominationShuffle } from "./h11-abomination";
import { shuffleEntries as h12_man_at_armsShuffle } from "./h12-man-at-arms";
import { shuffleEntries as h14_leperShuffle } from "./h14-leper";
import { ignoresEntries as h14_leperIgnores } from "./h14-leper";
import { shuffleEntries as h15_antiquarianShuffle } from "./h15-antiquarian";
import { shuffleEntries as h16_shieldbreakerShuffle } from "./h16-shieldbreaker";
import { ignoresEntries as h16_shieldbreakerIgnores } from "./h16-shieldbreaker";
import { shuffleEntries as h18_musketeerShuffle } from "./h18-musketeer";

export const SHUFFLE_RULES: readonly ShuffleEntry[] = [
  ...h01_crusaderShuffle,
  ...h02_hellionShuffle,
  ...h03_bounty_hunterShuffle,
  ...h04_highwaymanShuffle,
  ...h06_jesterShuffle,
  ...h07_plague_doctorShuffle,
  ...h08_arbalestShuffle,
  ...h09_grave_robberShuffle,
  ...h10_occultistShuffle,
  ...h11_abominationShuffle,
  ...h12_man_at_armsShuffle,
  ...h14_leperShuffle,
  ...h15_antiquarianShuffle,
  ...h16_shieldbreakerShuffle,
  ...h18_musketeerShuffle,
];

export const IGNORES_RULES: readonly IgnoresEntry[] = [
  ...h06_jesterIgnores,
  ...h09_grave_robberIgnores,
  ...h14_leperIgnores,
  ...h16_shieldbreakerIgnores,
];
