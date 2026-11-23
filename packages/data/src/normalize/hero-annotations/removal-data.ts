import type { RemovalEntry } from "./types";

import { removalEntries as h07PlagueDoctorRemoval } from "./h07-plague-doctor";
import { removalEntries as h09GraveRobberRemoval } from "./h09-grave-robber";

/** Remove Bleed/Blight 行，按 hNN 拼接。 */
export const REMOVAL_RULES: readonly RemovalEntry[] = [
  ...h07PlagueDoctorRemoval,
  ...h09GraveRobberRemoval,
];
