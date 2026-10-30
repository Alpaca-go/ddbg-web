// R-127：完整印刷双面绑定；verification通过不等于无需逐项解释图标。
export const CORE_TRINKET_BINDINGS = {
  "trinket:p001": {
    name: "Accuracy Stone",
    level: 1,
    faces: ['[["Acc+1"]]', '[["Acc-1"]]'],
  },
  "trinket:p002": {
    name: "Archer’s Ring",
    level: 1,
    faces: ['[["Acc+2 when in ","@d8557730a4:stance_ranged_lit"]]', '[["Acc-1"]]'],
  },
  "trinket:p003": {
    name: "Bleed Charm",
    level: 1,
    faces: [
      '[["When you hit with a Skill"],["inflict an additional 2 ","@d07276858c:bleed"," 2t"]]',
      '[["-1t to a Condition you are causing"]]',
    ],
  },
  "trinket:p004": {
    name: "Blight Charm",
    level: 1,
    faces: [
      '[["When you hit with a Skill"],["inflict an additional 2 ","@b75805594c:blight"," 2t"]]',
      '[["-1t to a Condition you are causing"]]',
    ],
  },
  "trinket:p005": {
    name: "Caution Cloak",
    level: 1,
    faces: ['[["Scout without suffering any"]]', '[["@edc2ad45fb:light"," -1"]]'],
  },
  "trinket:p006": {
    name: "Critical Stone",
    level: 1,
    faces: ['[["Crit+2"]]', '[["Acc-2"]]'],
  },
  "trinket:p007": {
    name: "Damage Stone",
    level: 1,
    faces: [
      '[["@c09318dfea:damage"," +3"]]',
      '[["When you take Damage:"],["suffer 2 ","@48ca9f366e:wound"]]',
    ],
  },
  "trinket:p008": {
    name: "Debuff Charm",
    level: 1,
    faces: [
      '[["When you hit with a Skill"],["inflict an additional ","@aa731a7f72:debuff"," 2t"]]',
      '[["-1t to a Condition you are causing"]]',
    ],
  },
  "trinket:p009": {
    name: "Sage’s Book",
    level: 1,
    faces: ['[["Acc+2 when in ","@f4539842c2:stance_support_lit"]]', '[["Acc-1"]]'],
  },
  "trinket:p010": {
    name: "Speed Stone",
    level: 1,
    faces: [
      '[["+ ","@4648c9e5ec:speed"," or ","@22c0a26f50:dodge"," +1"]]',
      '[["- ","@b0f4ca8612:speed"," or ","@003b470410:dodge"," -1"]]',
    ],
  },
  "trinket:p011": {
    name: "Stun Charm",
    level: 1,
    faces: [
      '[["When you hit with a skill"],["inflict an additional ","@f122d682f4:stun"," 1t"]]',
      '[["-1t to a Condition you are causing"]]',
    ],
  },
  "trinket:p012": {
    name: "Survival Guide",
    level: 1,
    faces: [
      '[["When exploring:"],["ignore a ","@07a4208ff9:trap"," or ","@66254314c8:hunger"]]',
      '[["When exploring, turn"],["an Exploration Die that"],["is not a ","@1edc13cad2:trap"," , to ","@1edc13cad2:trap"]]',
    ],
  },
  "trinket:p013": {
    name: "Warrior’s Bracer",
    level: 1,
    faces: ['[["Acc+2 Acc when in"]]', '[["Acc-1"]]'],
  },
  "trinket:p014": {
    name: "Warrior’s Cap",
    level: 1,
    faces: ['[["Acc+2 when in ","@f7bd151d17:stance_defensive_lit"]]', '[["Acc-1"]]'],
  },
  "trinket:p015": {
    name: "Bloodthirst Ring",
    level: 2,
    faces: [
      '[["Consume one ","@6e68b2add8:food"," and ","@7f0a59a7a0:heal"," 10 ","@910a0c12fe:heal"]]',
      '[["When hit: Suffer 3 ","@a64616e9c5:bleed"," 2t"]]',
    ],
  },
  "trinket:p016": {
    name: "Book of Constitution",
    level: 2,
    faces: [
      '[["When you suffer a ","@96dfcd2af2:disease"],["discard it immediately"]]',
      '[["- ","@b0f4ca8612:speed"," ","@b0f4ca8612:speed"]]',
    ],
  },
  "trinket:p017": {
    name: "Book of Holiness",
    level: 2,
    faces: ['[["@33b2d5bc22:stress"," -3"]]', '[["Turn a hit against you into a Crit."]]'],
  },
  "trinket:p018": {
    name: "Book of Relaxation",
    level: 2,
    faces: ['[["@33b2d5bc22:stress"," -2"]]', '[["@003b470410:dodge"," -2"]]'],
  },
  "trinket:p019": {
    name: "Camouflage Cloak",
    level: 2,
    faces: [
      '[["@22c0a26f50:dodge"," +2 if ","@78d1cc55d3:light"," is 3"],["@206c655597:compare_gte"," <"]]',
      '[["When hit: Suffer ","@ccca0ec836:stun"," 1t"]]',
    ],
  },
  "trinket:p020": {
    name: "Chirurgeon’s Charm",
    level: 2,
    faces: [
      '[["When healing: heal ","@8404726857:heal"," +2 ","@910a0c12fe:heal"]]',
      '[["When healed: recieve ","@9939df0801:heal"," -4 ","@c890c74db0:heal"]]',
    ],
  },
  "trinket:p021": {
    name: "Dark Bracer",
    level: 2,
    faces: [
      '[["Crit+2 if ","@78d1cc55d3:light"," ","@c1d74de856:compare_lte"," < 3"]]',
      '[["@b3f370e3ec:compare_gte"," <"],["When a Skill Hits the Target:"],["if ","@c4fa19b296:light"," 3 Deal no ","@c09318dfea:damage"," ."]]',
    ],
  },
  "trinket:p022": {
    name: "Protective Padlock",
    level: 2,
    faces: [
      '[["When hit: Suffer half the"],["@c09318dfea:damage"," X rounded up"]]',
      '[["- ","@b0f4ca8612:speed"]]',
    ],
  },
  "trinket:p023": {
    name: "Bloodcourse Medallion",
    level: 2,
    faces: [
      '[["When healed, receive ","@7f0a59a7a0:heal"," ","@910a0c12fe:heal"," 4"]]',
      '[["When hit: Suffer 1 ","@a64616e9c5:bleed"," 3t"]]',
    ],
  },
  "trinket:p024": {
    name: "Camper’s Helmet",
    level: 2,
    faces: [
      '[["When Camping, roll 2 ","@686ca3dd0a:provisions"]]',
      '[["@dd86508746:stress"," +1 when Scouting"]]',
    ],
  },
  "trinket:p025": {
    name: "Fortunate Armlet",
    level: 2,
    faces: ['[["Acc+1 and Crit+1"]]', '[["@dd86508746:stress"," +1"]]'],
  },
  "trinket:p026": {
    name: "Solar Bracer",
    level: 2,
    faces: [
      '[["Crit+2 if ","@9f080685f9:light"," 3"],["@ed3b7ac902:compare_lte"," <"]]',
      '[["When a Skill Hits the Target:"],["if ","@edc2ad45fb:light"," ","@8c829e3754:compare_gte"," < 3 Deal no ","@c09318dfea:damage"," ."]]',
    ],
  },
  "trinket:p027": {
    name: "Berserk Charm",
    level: 3,
    faces: ['[["Gain +1 Action"]]', '[["@dd86508746:stress"," +1"]]'],
  },
  "trinket:p028": {
    name: "Dark Crown",
    level: 3,
    faces: [
      '[["@33b2d5bc22:stress"," -9 if ","@9f080685f9:light"," ","@c1d74de856:compare_lte"," < 3"]]',
      '[["When the result is determined,"],["-2 Virtue Chance if ","@edc2ad45fb:light"," ","@599b5b0881:compare_gte"," < 3"]]',
    ],
  },
  "trinket:p029": {
    name: "Fasting Seal",
    level: 3,
    faces: [
      '[["@22c0a26f50:dodge"," +5"]]',
      '[["Consume a ","@8fc1e0c2e9:food"," gaining no effect"]]',
    ],
  },
  "trinket:p030": {
    name: "Recovery Charm",
    level: 3,
    faces: ['[["@7f0a59a7a0:heal"," ","@c80e839741:heal"," 9"]]', '[["@dd86508746:stress"," +2"]]'],
  },
  "trinket:p031": {
    name: "Sniper’s Ring",
    level: 3,
    faces: [
      '[["Crit+4 if in ","@d8557730a4:stance_ranged_lit"]]',
      '[["Acc-2 if not in ","@3e15d1efba:stance_ranged_lit"]]',
    ],
  },
  "trinket:p032": {
    name: "Warrior’s Ring",
    level: 3,
    faces: [
      '[["Crit+4 if in ","@fe18ec5b80:stance_aggressive_lit"]]',
      '[["Acc-2 if not in ","@bb21fa4f0f:stance_aggressive_lit"]]',
    ],
  },
  "trinket:p033": {
    name: "Defender’s Ring",
    level: 3,
    faces: [
      '[["Crit+4 if in ","@f7bd151d17:stance_defensive_lit"]]',
      '[["Acc-2 if not in ","@8b801d29d7:stance_defensive_lit"]]',
    ],
  },
  "trinket:p034": {
    name: "Scholar’s Ring",
    level: 3,
    faces: [
      '[["Crit+4 if in ","@f4539842c2:stance_support_lit"]]',
      '[["Acc-2 if not in ","@7faa97dbde:stance_support_lit"]]',
    ],
  },
  "trinket:p035": {
    name: "Solar Crown",
    level: 3,
    faces: [
      '[["@33b2d5bc22:stress"," -3 if 3"],["@ed3b7ac902:compare_lte"," < ","@49cd46c0d4:light"]]',
      '[["@be2e32545a:compare_gte"," < ","@edc2ad45fb:light"],["When the result is determined,"],["-2 Virtue Chance if 3"]]',
    ],
  },
  "trinket:p036": {
    name: "Book of Sanity",
    level: 3,
    faces: ['[["@33b2d5bc22:stress"," -4"]]', '[["Suffer ","@c09318dfea:damage"," 6"]]'],
  },
  "trinket:p037": {
    name: "Candle of Life",
    level: 3,
    faces: [
      '[["You and every Hero in"],["the same Area ","@8404726857:heal"," ","@9824e0b432:heal"," 6"]]',
      '[["@edc2ad45fb:light"," -2"]]',
    ],
  },
  "trinket:p038": {
    name: "Cleansing Crystal",
    level: 3,
    faces: [
      '[["Remove all ","@d07276858c:bleed"," , ","@90558ded71:blight"," , ","@aa731a7f72:debuff"," , ","@f122d682f4:stun"," , ","@192ea1fea9:mark"],["from all Heroes"]]',
      '[["Gain a ","@b7d0cfd524:draw_negative_quirk"]]',
    ],
  },
} as const;
export type CoreTrinketId = keyof typeof CORE_TRINKET_BINDINGS;
export const CORE_TRINKET_IDS = Object.keys(CORE_TRINKET_BINDINGS) as CoreTrinketId[];
