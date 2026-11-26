declare module "virtual:battle-data" {
  export const battleData: import("./battle/battle-data-types").BattleData;
}

declare module "virtual:quest-battle-data" {
  export const battleData: typeof import("virtual:battle-data").battleData;
}
declare module "virtual:quest-battle-data-v1" {
  export const battleData: typeof import("virtual:battle-data").battleData;
}
declare module "virtual:quest-battle-data-v2" {
  export const battleData: typeof import("virtual:battle-data").battleData;
}
