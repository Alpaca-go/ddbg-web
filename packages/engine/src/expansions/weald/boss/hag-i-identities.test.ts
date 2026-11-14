import { expect, it } from "vitest";
import {
  HAG_I_DESCRIPTION_ABILITY_CARD_ID,
  HAG_I_COMBAT_ABILITY_CARD_ID,
  HAG_I_CAULDRON_ABILITY_CARD_ID,
  HAG_I_COMBAT_MONSTER_CARD_ID,
  HAG_I_CAULDRON_EMPTY_MONSTER_CARD_ID,
  HAG_I_CAULDRON_FULL_MONSTER_CARD_ID,
  HAG_I_SCRIPT_ID,
} from "./hag-i";
import { WEALD_HAG_I_CONTENT, hagIPrintedFaceForRuntimeId } from "./hag-i-content";
import { resolveScriptIdForDescriptionCard } from "../../../boss/threat-description-catalog";

it("R-254 运行能力 ID 对齐三个真实印刷来源，保留选包闸门", () => {
  expect([
    HAG_I_DESCRIPTION_ABILITY_CARD_ID,
    HAG_I_COMBAT_ABILITY_CARD_ID,
    HAG_I_CAULDRON_ABILITY_CARD_ID,
  ]).toEqual([
    WEALD_HAG_I_CONTENT.abilities.descriptionCardId,
    WEALD_HAG_I_CONTENT.abilities.hagCardId,
    WEALD_HAG_I_CONTENT.abilities.cauldronCardId,
  ]);
  expect(resolveScriptIdForDescriptionCard("boss_ability:weald:p013", ["core", "weald"])).toBe(
    HAG_I_SCRIPT_ID,
  );
  expect(resolveScriptIdForDescriptionCard("boss_ability:weald:p013", ["core"])).toBeUndefined();
  expect(
    resolveScriptIdForDescriptionCard("boss_ability:weald:hag:p001", ["core", "weald"]),
  ).toBeUndefined();
});

it("满锅运行视图映射同一 raw 组件背面，不能当作新增印刷卡", () => {
  const faces = [
    HAG_I_COMBAT_MONSTER_CARD_ID,
    HAG_I_CAULDRON_EMPTY_MONSTER_CARD_ID,
    HAG_I_CAULDRON_FULL_MONSTER_CARD_ID,
  ].map(hagIPrintedFaceForRuntimeId);
  expect(faces.map((face) => [face?.rawId, face?.face, face?.life])).toEqual([
    ["monster_large:weald:p010", "front", 60],
    ["monster_large:weald:p013", "front", 66],
    ["monster_large:weald:p013", "back", 9],
  ]);
  expect(new Set(faces.map((face) => face?.rawId)).size).toBe(2);
  expect(faces[1]?.innateProtection).toBe(true);
  expect(faces[2]?.innateProtection).toBe(false);
});

it.each([
  "monster_large:weald:hag:p001",
  "monster_large:weald:cauldron_empty:p001",
  "monster_large:weald:cauldron_full:p001",
  "monster_large:weald:p014",
  "monster_large:weald:p013:front",
])("旧别名或未定义卡面 %s 不按猜测转换", (id) => {
  expect(hagIPrintedFaceForRuntimeId(id)).toBeUndefined();
});
