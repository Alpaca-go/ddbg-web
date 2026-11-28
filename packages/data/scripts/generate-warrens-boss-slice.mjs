#!/usr/bin/env node
/**
 * 一次性生成 Warrens Boss normalized JSON（slice 5）。
 * 数据来源：packages/data/extract/extension/warrens/raw/*.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dataRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const outDir = path.join(dataRoot, "normalized/extension/warrens");

const PRINT = "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_04_EN_WARRENS/";
const sources = {
  abilityFront: `${PRINT}DD_EN_WARRENS_CARDS_70_120_Boss_Abilities_FRONT.pdf`,
  abilityBack: `${PRINT}DD_EN_WARRENS_CARDS_70_120_Boss_Abilities_BACK.pdf`,
  combatLargeFront: `${PRINT}DD_EN_WARRENS_CARDS_140x140_monster_large_FRONT.pdf`,
  combatLargeBack: `${PRINT}DD_EN_WARRENS_CARDS_140x140_monster_large_BACK.pdf`,
  combatMediumFront: `${PRINT}DD_EN_WARRENS_CARDS_70_120_monsters_medium_FRONT.pdf`,
  combatMediumBack: `${PRINT}DD_EN_WARRENS_CARDS_70_120_monsters_medium_BACK.pdf`,
};

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(dataRoot, rel), "utf8"));
}

function stubTile(number, name, deployment) {
  return {
    id: `room_tile:warrens:${String(number).padStart(2, "0")}`,
    rawId: `dungeon_tile:warrens:p${String(number).padStart(3, "0")}`,
    roomId: `room:warrens:${String(number).padStart(2, "0")}`,
    location: "warrens",
    number,
    name,
    source: {
      file: `${PRINT}DD_WARRENS_TILES_FRONT.pdf`,
      back: `${PRINT}DD_WARRENS_TILES_BACK.pdf`,
      page: number - 9,
      face: "front",
    },
    geometryVerified: false,
    geometryComplete: false,
    usable: false,
    pendingReview: [
      "Q-WARRENS-29：Boss 板块几何与 Room+Tile 对照待印核（R-048）；本刀不授予 usable",
    ],
    deployment: { printReview: "pending", lootAreas: [], markers: [], ...deployment },
    areas: [],
    edges: [],
    necroticFungusAreas: [],
    zeroCapacityAreas: [],
    specialRegions: [],
    wallNotes: [],
    unresolvedMarkers: ["dungeon_tile Boss 页序待 Kyries 对照 Warrens Tiles PDF"],
  };
}

const swinePrinceI = {
  schema: "ddbg-warrens-swine-prince-i-v0",
  combatReady: false,
  runtimeReady: false,
  pendingReview: [
    "Q-WARRENS-25：印刷 Wilbur 姿态标 Range，引擎 hold 仍映射 support；数据层记录 ranged，不修改 engine",
    "Q-WARRENS-30：Enraged Destruction / Mark 图标化效果 combatReady 待批",
  ],
  sources: {
    combatFront: sources.combatLargeFront,
    combatBack: sources.combatLargeBack,
    abilityFront: sources.abilityFront,
    abilityBack: sources.abilityBack,
  },
  faces: [
    {
      role: "prince",
      rawId: "monster_large:warrens:p005",
      face: "front",
      name: "Swine Prince",
      level: 1,
      types: ["beast", "large"],
      stanceSlots: 2,
      life: 84,
      speed: 0,
      dodge: 8,
      resistances: ["stun"],
      immunities: ["bleed"],
      skills: [
        {
          slot: 1,
          name: "Obliterate Body",
          target: "closest",
          range: 1,
          maxTargets: 1,
          crit: 1,
          critDamage: 11,
          accuracy: 10,
          damage: 7,
          effects: [{ kind: "pendingIcon", note: "Printed +7 vs Marked" }],
        },
        {
          slot: 2,
          name: "Obliterate Masses",
          target: "crowded",
          range: 1,
          maxTargets: 1,
          crit: 1,
          critDamage: 8,
          accuracy: 10,
          damage: 5,
          effects: [],
        },
        {
          slot: 3,
          name: "Wild Flailing",
          target: "closest",
          range: 1,
          maxTargets: 1,
          crit: 1,
          critDamage: 11,
          accuracy: 8,
          damage: 7,
          effects: [{ kind: "pendingIcon", note: "Printed +5 vs Marked" }],
        },
      ],
      selection: [
        { min: 1, max: 4, slot: 1 },
        { min: 5, max: 8, slot: 2 },
        { min: 9, max: 10, slot: 3 },
      ],
    },
    {
      role: "wilbur",
      rawId: "monster_medium:warrens:p020",
      face: "front",
      name: "Wilbur",
      level: 1,
      types: ["beast", "small"],
      stanceSlots: 1,
      life: 11,
      speed: 2,
      dodge: 8,
      resistances: [],
      immunities: [],
      skills: [
        {
          slot: 1,
          name: "End This One",
          target: "mostWounded",
          range: 2,
          maxTargets: 1,
          crit: 0,
          critDamage: 2,
          accuracy: 11,
          damage: 1,
          effects: [
            { kind: "selfPush", distance: 1 },
            { kind: "pendingIcon", note: "Mark 1t" },
          ],
        },
        {
          slot: 2,
          name: "End These Two",
          target: "crowded",
          range: 2,
          maxTargets: 2,
          crit: 0,
          critDamage: 2,
          accuracy: 11,
          damage: 1,
          effects: [
            { kind: "selfPush", distance: 1 },
            { kind: "pendingIcon", note: "Mark 1t" },
          ],
        },
      ],
      selection: [
        { min: 1, max: 5, slot: 1 },
        { min: 6, max: 10, slot: 2 },
      ],
    },
  ],
  abilities: {
    descriptionCardId: "boss_ability:warrens:p007",
    combatCardId: "boss_ability:warrens:p010",
    actionsPerRound: 2,
    ruleSummaries: [
      "ACTIONS / Round: 2",
      "Enraged Destruction：Wilbur 受伤后 Prince 对全体英雄反噬 6（图标待核实）",
    ],
    threats: {
      dungeon: {
        name: "Uneasy Times I",
        summary: "Survivalist blocked",
        hamletEffect: "survivalistBlocked",
      },
      hamlet: {
        name: "Bestial Rage",
        summary: "Beasts deal +2 damage",
        dungeonEffect: "beastMonsterDamageBonus",
        amount: 2,
      },
    },
  },
  setup: {
    rule: "Warrens W4",
    princeStance: "aggressive",
    wilburStance: "ranged",
    wilburEngineStanceHold: "support",
    monsterInitiativeCards: 2,
    heroInitiativeCards: 4,
  },
  tile: stubTile(10, "Swine Prince", {
    heroes: { aggressive: "?", defensive: "?", ranged: "?", support: "?" },
    monsters: { aggressive: "?", defensive: "?", ranged: "?", support: "?" },
  }),
};

const swineHigher = {
  schema: "ddbg-warrens-swine-prince-higher-v0",
  combatReady: false,
  runtimeReady: false,
  sources: swinePrinceI.sources,
  cards: [
    {
      level: 2,
      faces: [
        {
          ...swinePrinceI.faces[0],
          rawId: "monster_large:warrens:p006",
          level: 2,
          life: 121,
          speed: 1,
          skills: swinePrinceI.faces[0].skills.map((s) => ({
            ...s,
            accuracy: s.slot === 1 ? 11 : s.accuracy,
            damage: s.slot === 1 ? 9 : s.slot === 2 ? 7 : 9,
            critDamage: s.slot === 1 ? 14 : s.slot === 2 ? 12 : 14,
          })),
        },
        {
          ...swinePrinceI.faces[1],
          rawId: "monster_medium:warrens:p021",
          level: 2,
          life: 18,
          speed: 3,
          skills: swinePrinceI.faces[1].skills.map((s) => ({
            ...s,
            accuracy: 12,
            damage: 2,
            critDamage: 4,
          })),
        },
      ],
      abilities: {
        descriptionCardId: "boss_ability:warrens:p008",
        combatCardId: "boss_ability:warrens:p011",
        enragedDamage: 12,
        threats: {
          dungeon: { name: "Uneasy Times II", hamletEffect: "survivalistDebuff", amount: 1 },
          hamlet: {
            name: "Bestial Bloodlust",
            dungeonEffect: "beastMonsterDamageBonus",
            amount: 4,
          },
        },
      },
      setup: { ...swinePrinceI.setup, monsterInitiativeCards: 2 },
    },
    {
      level: 3,
      faces: [
        {
          ...swinePrinceI.faces[0],
          rawId: "monster_large:warrens:p007",
          level: 3,
          life: 171,
          speed: 2,
          skills: swinePrinceI.faces[0].skills.map((s) => ({
            ...s,
            accuracy: s.slot === 3 ? 10 : 12,
            damage: s.slot === 1 ? 12 : s.slot === 2 ? 9 : 12,
            critDamage: s.slot === 1 ? 20 : s.slot === 2 ? 15 : 20,
          })),
        },
        {
          ...swinePrinceI.faces[1],
          rawId: "monster_medium:warrens:p022",
          level: 3,
          life: 23,
          speed: 4,
          skills: swinePrinceI.faces[1].skills.map((s) => ({
            ...s,
            accuracy: 12,
            damage: 3,
            critDamage: 6,
          })),
        },
      ],
      abilities: {
        descriptionCardId: "boss_ability:warrens:p009",
        combatCardId: "boss_ability:warrens:p012",
        enragedDamage: 18,
        threats: {
          dungeon: { name: "Uneasy Times III", hamletEffect: "survivalistDebuff", amount: 2 },
          hamlet: {
            name: "Bestial Bloodlust III",
            dungeonEffect: "beastMonsterDamageBonus",
            amount: 6,
          },
        },
      },
      setup: { ...swinePrinceI.setup, monsterInitiativeCards: 2 },
    },
  ],
};

function fleshPart(part, level, page, life, speed, skill) {
  const ids = {
    head: ["head", "Maws of Life"],
    bone: ["bone", "Bone Zephyr"],
    heart: ["heart", "Sanguine Stroke"],
    butt: ["butt", "Undulating Invasion"],
  };
  const [role, defaultName] = ids[part];
  return {
    role,
    rawId: `monster_medium:warrens:p${String(page).padStart(3, "0")}`,
    face: "front",
    name: `Flesh ${role[0].toUpperCase()}${role.slice(1)}`,
    level,
    types: ["eldritch"],
    stanceSlots: 1,
    sharedLife: life,
    speed,
    dodge: 0,
    resistances: [],
    immunities: [],
    skills: [{ slot: 1, name: skill?.name ?? defaultName, ...skill }],
    selection: [{ min: 1, max: 10, slot: 1 }],
  };
}

const fleshI = {
  schema: "ddbg-warrens-flesh-i-v0",
  combatReady: false,
  runtimeReady: false,
  pendingReview: ["Q-WARRENS-31：四部位 morph 表与共享 Life 运行时 hold；仅登记印刷目录"],
  sources: {
    combatFront: sources.combatMediumFront,
    combatBack: sources.combatMediumBack,
    abilityFront: sources.abilityFront,
    abilityBack: sources.abilityBack,
  },
  oneBodySharedLife: 93,
  faces: [
    fleshPart("head", 1, 23, 93, 1, {
      target: "closest",
      range: 0,
      maxTargets: 1,
      crit: 1,
      critDamage: 14,
      accuracy: 9,
      damage: 8,
      effects: [{ kind: "pendingIcon", note: "debuff 2t" }],
    }),
    fleshPart("bone", 1, 26, 93, 1, {
      target: "mostStressed",
      range: 1,
      maxTargets: 1,
      crit: 1,
      critDamage: 6,
      accuracy: 9,
      damage: 3,
      effects: [{ kind: "pendingIcon", note: "debuff 1t" }],
    }),
    fleshPart("heart", 1, 29, 93, 1, {
      target: "closest",
      range: 2,
      maxTargets: 2,
      crit: 2,
      critDamage: 11,
      accuracy: 10,
      damage: 6,
      effects: [],
    }),
    fleshPart("butt", 1, 32, 93, 0, {
      target: "furthest",
      range: 1,
      maxTargets: 1,
      crit: 1,
      critDamage: 9,
      accuracy: 9,
      damage: 6,
      effects: [{ kind: "pendingIcon", note: "blight 2t" }],
    }),
  ],
  abilities: {
    descriptionCardId: "boss_ability:warrens:p013",
    combatCardId: "boss_ability:warrens:p016",
    actionsPerRound: 4,
    ruleSummaries: [
      "One Body：四部位共享 Life；每部位每轮 1 行动；回合末其余部位向当前部位移动 1 格",
    ],
    threats: {
      dungeon: {
        name: "Big Troubles I",
        summary: "Large monster spawn gains Guard 2t",
        runtimeNote: "recordedOnly",
      },
      hamlet: {
        name: "Creeping Sickness I",
        summary: "Wounds on unvisited buildings",
        runtimeNote: "recordedOnly",
      },
    },
    dungeonThreatHigher: {
      II: { name: "Bigger Troubles II", drawUntilLargeMonster: true, implementDraw: false },
      III: { name: "Bigger Troubles III", drawUntilLargeMonster: true, implementDraw: false },
    },
  },
  setup: {
    rule: "Warrens W4",
    partStances: { head: "aggressive", bone: "defensive", heart: "ranged", butt: "support" },
    monsterInitiativeCards: 4,
    heroInitiativeCards: 4,
  },
  tile: stubTile(11, "The Flesh", {
    heroes: { aggressive: "?", defensive: "?", ranged: "?", support: "?" },
    monsters: { aggressive: "?", defensive: "?", ranged: "?", support: "?" },
  }),
};

const fleshHigher = {
  schema: "ddbg-warrens-flesh-higher-v0",
  combatReady: false,
  runtimeReady: false,
  sources: fleshI.sources,
  cards: [
    {
      level: 2,
      sharedLife: 123,
      faces: [
        fleshPart("head", 2, 24, 123, 2, {
          target: "closest",
          range: 0,
          maxTargets: 1,
          crit: 1,
          critDamage: 17,
          accuracy: 10,
          damage: 11,
          effects: [{ kind: "pendingIcon", note: "debuff 3t" }],
        }),
        fleshPart("bone", 2, 27, 123, 2, {
          target: "mostStressed",
          range: 1,
          maxTargets: 1,
          crit: 1,
          critDamage: 7,
          accuracy: 10,
          damage: 4,
          effects: [{ kind: "pendingIcon", note: "debuff 1t" }],
        }),
        fleshPart("heart", 2, 30, 123, 3, {
          target: "closest",
          range: 2,
          maxTargets: 2,
          crit: 2,
          critDamage: 14,
          accuracy: 11,
          damage: 7,
          effects: [],
        }),
        fleshPart("butt", 2, 33, 123, 1, {
          target: "furthest",
          range: 1,
          maxTargets: 1,
          crit: 1,
          critDamage: 12,
          accuracy: 10,
          damage: 8,
          effects: [{ kind: "pendingIcon", note: "blight 3t" }],
        }),
      ],
      abilities: {
        descriptionCardId: "boss_ability:warrens:p014",
        combatCardId: "boss_ability:warrens:p017",
        threats: {
          dungeon: {
            name: "Bigger Troubles II",
            drawUntilLargeMonster: true,
            implementDraw: false,
          },
          hamlet: { name: "Creeping Sickness II", summary: "2 wounds per unvisited building" },
        },
      },
    },
    {
      level: 3,
      sharedLife: 155,
      faces: [
        fleshPart("head", 3, 25, 155, 3, {
          target: "closest",
          range: 0,
          maxTargets: 1,
          crit: 1,
          critDamage: 22,
          accuracy: 11,
          damage: 14,
          effects: [{ kind: "pendingIcon", note: "debuff 3t" }],
        }),
        fleshPart("bone", 3, 28, 155, 3, {
          target: "mostStressed",
          range: 1,
          maxTargets: 1,
          crit: 1,
          critDamage: 10,
          accuracy: 11,
          damage: 5,
          effects: [{ kind: "pendingIcon", note: "debuff 1t" }],
        }),
        fleshPart("heart", 3, 31, 155, 4, {
          target: "closest",
          range: 2,
          maxTargets: 2,
          crit: 2,
          critDamage: 17,
          accuracy: 12,
          damage: 9,
          effects: [],
        }),
        fleshPart("butt", 3, 34, 155, 2, {
          target: "furthest",
          range: 1,
          maxTargets: 1,
          crit: 1,
          critDamage: 17,
          accuracy: 11,
          damage: 10,
          effects: [{ kind: "pendingIcon", note: "blight 3t" }],
        }),
      ],
      abilities: {
        descriptionCardId: "boss_ability:warrens:p015",
        combatCardId: "boss_ability:warrens:p018",
        threats: {
          dungeon: {
            name: "Bigger Troubles III",
            drawUntilLargeMonster: true,
            implementDraw: false,
          },
          hamlet: { name: "Creeping Sickness III", summary: "3 wounds per unvisited building" },
        },
      },
    },
  ],
};

const vvulfI = {
  schema: "ddbg-warrens-vvulf-i-v0",
  combatReady: false,
  runtimeReady: false,
  pendingReview: [
    "Q-WARRENS-32：Barrel O'Bombs 微缩体与 Get Them!/Tower Shield 召唤明细待 runtime",
  ],
  sources: {
    combatFront: sources.combatLargeFront,
    combatBack: sources.combatLargeBack,
    abilityFront: sources.abilityFront,
    abilityBack: sources.abilityBack,
  },
  faces: [
    {
      role: "vvulf",
      rawId: "monster_large:warrens:p002",
      face: "front",
      name: "Brigand Vvulf",
      level: 1,
      types: ["human", "large"],
      stanceSlots: 2,
      life: 66,
      speed: 0,
      dodge: 5,
      resistances: [],
      immunities: [],
      skills: [
        {
          slot: 1,
          name: "Get Them!",
          target: "crowded",
          range: 1,
          maxTargets: 2,
          crit: 1,
          critDamage: 2,
          accuracy: 10,
          damage: 1,
          effects: [{ kind: "pendingIcon", note: "Summon Fusilier + Barrel O'Bombs" }],
        },
        {
          slot: 2,
          name: "Tower Shield",
          target: "crowded",
          range: 2,
          maxTargets: 2,
          crit: 0,
          critDamage: 2,
          accuracy: 10,
          damage: 1,
          effects: [{ kind: "pendingIcon", note: "Summon Fusilier" }],
        },
        {
          slot: 3,
          name: "Warcry",
          target: "crowded",
          range: 2,
          maxTargets: 2,
          crit: 0,
          critDamage: 2,
          accuracy: 10,
          damage: 1,
          effects: [{ kind: "pendingIcon", note: "Self buff" }],
        },
      ],
      selection: [
        { min: 1, max: 5, slot: 1 },
        { min: 6, max: 7, slot: 2 },
        { min: 8, max: 10, slot: 3 },
      ],
    },
  ],
  abilities: {
    descriptionCardId: "boss_ability:warrens:p001",
    combatCardId: "boss_ability:warrens:p004",
    actionsPerRound: 2,
    ruleSummaries: [
      "Time's Up!：Barrel O'Bombs 在场时移除并对区域内角色造成伤害 10（I）",
      "Barrel O'Bombs 微缩体登记：不入 normalized 怪物池，仅 Boss 数据注释",
    ],
    threats: {
      dungeon: {
        name: "Brigand Ambush I",
        summary: "Brigand spawn: heroes debuff 1t",
        recordedOnly: true,
      },
      hamlet: {
        name: "Stolen Material I",
        summary: "Building upgrades cost +4",
        recordedOnly: true,
      },
    },
    barrelOBombs: { miniatureNote: true, removeAndDamage: 10 },
  },
  setup: {
    rule: "Warrens W4",
    vvulfStance: "aggressive",
    monsterInitiativeCards: 2,
    heroInitiativeCards: 4,
  },
  tile: stubTile(12, "Brigand Vvulf", {
    heroes: { aggressive: "?", defensive: "?", ranged: "?", support: "?" },
    monsters: { aggressive: "?", defensive: "?", ranged: "?", support: "?" },
  }),
};

const vvulfHigher = {
  schema: "ddbg-warrens-vvulf-higher-v0",
  combatReady: false,
  runtimeReady: false,
  sources: vvulfI.sources,
  cards: [
    {
      level: 2,
      faces: [
        {
          ...vvulfI.faces[0],
          rawId: "monster_large:warrens:p003",
          level: 2,
          life: 88,
          speed: 1,
          skills: vvulfI.faces[0].skills.map((s) => ({ ...s, critDamage: 4, damage: 2 })),
        },
      ],
      abilities: {
        descriptionCardId: "boss_ability:warrens:p002",
        combatCardId: "boss_ability:warrens:p005",
        barrelOBombs: { removeAndDamage: 15 },
        reinforcements: { fusilierCard: "Brigand Cutthroat", listedInAbility: true },
        threats: {
          dungeon: { name: "Brigand Assault II", summary: "debuff 2t + riposte 1t on spawn" },
          hamlet: { name: "Stolen Material II", summary: "upgrade cost +7" },
        },
      },
    },
    {
      level: 3,
      faces: [
        {
          ...vvulfI.faces[0],
          rawId: "monster_large:warrens:p004",
          level: 3,
          life: 111,
          speed: 2,
          skills: vvulfI.faces[0].skills.map((s) => ({
            ...s,
            critDamage: 6,
            damage: 3,
            accuracy: 12,
          })),
        },
      ],
      abilities: {
        descriptionCardId: "boss_ability:warrens:p003",
        combatCardId: "boss_ability:warrens:p006",
        barrelOBombs: { removeAndDamage: 20 },
        reinforcements: { fusilierCard: "Brigand Raider", listedInAbility: true },
        threats: {
          dungeon: { name: "Brigand Assault III", recordedOnly: true },
          hamlet: { name: "Stolen Material III", recordedOnly: true },
        },
      },
    },
  ],
};

fs.mkdirSync(outDir, { recursive: true });
const files = {
  "swine_prince_i.json": swinePrinceI,
  "swine_prince_higher.json": swineHigher,
  "flesh_i.json": fleshI,
  "flesh_higher.json": fleshHigher,
  "vvulf_i.json": vvulfI,
  "vvulf_higher.json": vvulfHigher,
};
for (const [name, data] of Object.entries(files)) {
  fs.writeFileSync(path.join(outDir, name), `${JSON.stringify(data, null, 1)}\n`);
}
console.log("Wrote", Object.keys(files).join(", "));
