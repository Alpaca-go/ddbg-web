import type { StatusEffectEntry } from "./types";

/** 完整印刷逐页核对的状态效果行（docs/phase2-four-core-skills-2026-10-11.md）。 */
export const statusEntries: readonly StatusEffectEntry[] = [
  {
    id: "hero_skill:p091",
    name: "Dazzling Light",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {stun} 1t, {light} +1",
    effects: [
      {
        kind: "stun",
        duration: 1,
      },
    ],
  },
  {
    id: "hero_skill:p092",
    name: "Dazzling Light",
    level: 2,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {stun} 1t, {light} +1",
    effects: [
      {
        kind: "stun",
        duration: 1,
      },
    ],
  },
  {
    id: "hero_skill:p093",
    name: "Dazzling Light",
    level: 3,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {stun} 1t, {light} +1",
    effects: [
      {
        kind: "stun",
        duration: 1,
      },
    ],
  },
  {
    id: "hero_skill:p100",
    name: "Illumination",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {debuff} 1t, {light} +1",
    effects: [
      {
        kind: "debuff",
        duration: 1,
      },
    ],
  },
  {
    id: "hero_skill:p101",
    name: "Illumination",
    level: 2,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {debuff} 2t, {light} +1",
    effects: [
      {
        kind: "debuff",
        duration: 2,
      },
    ],
  },
  {
    id: "hero_skill:p102",
    name: "Illumination",
    level: 3,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {debuff} 3t, {light} +1",
    effects: [
      {
        kind: "debuff",
        duration: 3,
      },
    ],
  },
  {
    id: "hero_skill:p103",
    name: "Hand of Light",
    level: 1,
    lineIndex: 0,
    scope: "self",
    signature: "{self_effects} Self {buff} 3t",
    effects: [
      {
        kind: "buff",
        duration: 3,
      },
    ],
  },
  {
    id: "hero_skill:p104",
    name: "Hand of Light",
    level: 2,
    lineIndex: 0,
    scope: "self",
    signature: "{self_effects} Self {buff} 3t",
    effects: [
      {
        kind: "buff",
        duration: 3,
      },
    ],
  },
  {
    id: "hero_skill:p105",
    name: "Hand of Light",
    level: 3,
    lineIndex: 0,
    scope: "self",
    signature: "{self_effects} Self {buff} 3t",
    effects: [
      {
        kind: "buff",
        duration: 3,
      },
    ],
  },
];
