import type { StatusEffectEntry } from "./types";

/** 完整印刷逐页核对的状态效果行（docs/phase2-four-core-skills-2026-10-11.md）。 */
export const statusEntries: readonly StatusEffectEntry[] = [
  {
    id: "hero_skill:p028",
    name: "Barbaric YAWP!",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {stun} 1t",
    effects: [
      {
        kind: "stun",
        duration: 1,
      },
    ],
  },
  {
    id: "hero_skill:p029",
    name: "Barbaric YAWP!",
    level: 2,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {stun} 1t",
    effects: [
      {
        kind: "stun",
        duration: 1,
      },
    ],
  },
  {
    id: "hero_skill:p030",
    name: "Barbaric YAWP!",
    level: 3,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {stun} 1t",
    effects: [
      {
        kind: "stun",
        duration: 1,
      },
    ],
  },
  {
    id: "hero_skill:p031",
    name: "If It Bleeds",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} 2 {bleed} 2t",
    effects: [
      {
        kind: "bleed",
        duration: 2,
        amount: 2,
      },
    ],
  },
  {
    id: "hero_skill:p032",
    name: "If It Bleeds",
    level: 2,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} 3 {bleed} 3t",
    effects: [
      {
        kind: "bleed",
        duration: 3,
        amount: 3,
      },
    ],
  },
  {
    id: "hero_skill:p033",
    name: "If It Bleeds",
    level: 3,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} 4 {bleed} 3t",
    effects: [
      {
        kind: "bleed",
        duration: 3,
        amount: 4,
      },
    ],
  },
  {
    id: "hero_skill:p037",
    name: "Adrenaline Rush",
    level: 1,
    lineIndex: 1,
    scope: "self",
    signature: "{self_effects} Self Remove {bleed} {blight} , {buff} 3t",
    effects: [
      {
        kind: "buff",
        duration: 3,
      },
    ],
  },
  {
    id: "hero_skill:p038",
    name: "Adrenaline Rush",
    level: 2,
    lineIndex: 0,
    scope: "self",
    signature: "{self_effects} Self Remove {bleed} {blight}, {buff} 2t",
    effects: [
      {
        kind: "buff",
        duration: 2,
      },
    ],
  },
  {
    id: "hero_skill:p038",
    name: "Adrenaline Rush",
    level: 2,
    lineIndex: 1,
    scope: "target",
    signature: "{target_effects} Remove {bleed} {blight}, {buff} 2t",
    effects: [
      {
        kind: "buff",
        duration: 2,
      },
    ],
  },
  {
    id: "hero_skill:p039",
    name: "Adrenaline Rush",
    level: 3,
    lineIndex: 0,
    scope: "self",
    signature: "{self_effects} Self Remove {bleed} {blight}, {buff} 2t",
    effects: [
      {
        kind: "buff",
        duration: 2,
      },
    ],
  },
  {
    id: "hero_skill:p039",
    name: "Adrenaline Rush",
    level: 3,
    lineIndex: 1,
    scope: "target",
    signature: "{target_effects} Remove {bleed} {blight}, {buff} 2t",
    effects: [
      {
        kind: "buff",
        duration: 2,
      },
    ],
  },
  {
    id: "hero_skill:p040",
    name: "Bleed Out",
    level: 1,
    lineIndex: 1,
    scope: "target",
    signature: "{target_effects} 3 {bleed} 2t",
    effects: [
      {
        kind: "bleed",
        duration: 2,
        amount: 3,
      },
    ],
  },
  {
    id: "hero_skill:p041",
    name: "Bleed Out",
    level: 2,
    lineIndex: 1,
    scope: "target",
    signature: "{target_effects} 3 {bleed} 3t",
    effects: [
      {
        kind: "bleed",
        duration: 3,
        amount: 3,
      },
    ],
  },
  {
    id: "hero_skill:p042",
    name: "Bleed Out",
    level: 3,
    lineIndex: 1,
    scope: "target",
    signature: "{target_effects} 4 {bleed} 3t",
    effects: [
      {
        kind: "bleed",
        duration: 3,
        amount: 4,
      },
    ],
  },
];
