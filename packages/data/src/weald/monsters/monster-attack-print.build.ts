import { printIcon, printSourceIcon } from "../../shared/print-icons";

const E = "monster_medium:weald:p001";
const G = "monster_medium:weald:p006";
const S = "monster_medium:weald:p009";
const A = "monster_medium:weald:p012";
const L = "monster_large:weald:p001";

/** R-230：印刷签名只在构建时核对。 */
export const WEALD_ATTACK_SIGNATURES: Readonly<Partial<Record<string, string>>> = {
  [`${E}:2`]: `{${printSourceIcon("extension/weald/raw/monster_large.json:monster_large:weald:p001:front:31")}}{${printSourceIcon("extension/weald/raw/monster_large.json:monster_large:weald:p001:front:30")}}1Ectoplasm`,
  [`${E}:3`]: `{${printSourceIcon("extension/weald/raw/monster_large.json:monster_large:weald:p001:front:31")}}{${printSourceIcon("extension/weald/raw/monster_large.json:monster_large:weald:p001:front:30")}}1LargeEctoplasm,{${printSourceIcon("extension/weald/raw/monster_large.json:monster_large:weald:p004:front:43")}}+1`,
  [`${G}:1`]: `{${printSourceIcon("extension/weald/raw/monster_large.json:monster_large:weald:p004:front:24")}}Self{${printSourceIcon("extension/weald/raw/monster_large.json:monster_large:weald:p004:front:21")}}Pull2{${printSourceIcon("extension/weald/raw/monster_large.json:monster_large:weald:p001:front:31")}}1{${printSourceIcon("extension/weald/raw/monster_medium.json:monster_medium:weald:p006:front:19")}}3t,{${printSourceIcon("extension/weald/raw/monster_large.json:monster_large:weald:p004:front:45")}}`,
  [`${S}:2`]: `{${printSourceIcon("extension/weald/raw/monster_large.json:monster_large:weald:p001:front:31")}}{${printIcon("damage", 1)}}+3vs{${printSourceIcon("extension/weald/raw/monster_medium.json:monster_medium:weald:p009:front:21")}}`,
  [`${S}:3`]: `{${printSourceIcon("extension/weald/raw/monster_medium.json:monster_medium:weald:p009:front:32")}}Self{${printSourceIcon("extension/weald/raw/monster_large.json:monster_large:weald:p004:front:21")}}Pull1`,
  [`${A}:1`]: `{${printSourceIcon("extension/weald/raw/monster_large.json:monster_large:weald:p001:front:31")}}{${printSourceIcon("extension/weald/raw/monster_medium.json:monster_medium:weald:p012:front:16")}}2t,{${printSourceIcon("extension/weald/raw/monster_medium.json:monster_medium:weald:p012:front:17")}}2t`,
  [`${A}:2`]: `{${printSourceIcon("extension/weald/raw/monster_large.json:monster_large:weald:p001:front:31")}}2{${printSourceIcon("extension/weald/raw/monster_medium.json:monster_medium:weald:p012:front:26")}}2t,{${printSourceIcon("extension/weald/raw/monster_large.json:monster_large:weald:p004:front:45")}}`,
  [`${A}:3`]: `{${printSourceIcon("extension/weald/raw/monster_medium.json:monster_medium:weald:p009:front:32")}}Self{${printSourceIcon("extension/weald/raw/monster_large.json:monster_large:weald:p004:front:21")}}Push2{${printSourceIcon("extension/weald/raw/monster_large.json:monster_large:weald:p001:front:31")}}1{${printSourceIcon("extension/weald/raw/monster_medium.json:monster_medium:weald:p012:front:26")}}3t`,
  [`${L}:2`]: `{${printSourceIcon("extension/weald/raw/monster_large.json:monster_large:weald:p001:front:31")}}{${printSourceIcon("extension/weald/raw/monster_large.json:monster_large:weald:p001:front:7")}}1t`,
  [`${L}:3`]: `{${printSourceIcon("extension/weald/raw/monster_large.json:monster_large:weald:p001:front:31")}}{${printSourceIcon("extension/weald/raw/monster_large.json:monster_large:weald:p001:front:30")}}1LargeEctoplasm`,
};
