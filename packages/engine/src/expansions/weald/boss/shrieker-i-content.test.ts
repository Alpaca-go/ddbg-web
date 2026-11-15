import { expect, it } from "vitest";
import printed from "../../../../../data/normalized/extension/weald/shrieker_i.json";
import raw from "../../../../../data/extract/extension/weald/raw/monster_large.json";
import { wealdShriekerContentSchema } from "../../../../../data/src/weald-shrieker";
import { wealdRoomTileSchema } from "../../../../../data/src/weald-room";
import { WEALD_SHRIEKER_I_CONTENT as content } from "./shrieker-i-content";
import { shriekerIApprovedBattleAreas } from "./shrieker-i-geometry";
import { findWealdRoomTile } from "../room-catalog";
import { wealdThreatPool } from "./threat-pool";
it("R-261 核准 Shrieker／Nest I 独立数据、完整原始身份与技能", () => {
  expect(content.faces.map((f) => [f.life, f.speed, f.dodge])).toEqual([
    [49, 3, 2],
    [20, 0, 0],
  ]);
  expect(content.faces[0].resistances).toEqual(["stun", "bleed", "shuffle"]);
  expect(content.faces[1].immunities).toEqual(["stun", "bleed", "blight", "debuff", "shuffle"]);
  for (const f of content.faces)
    expect(raw.cards.find((c) => c.id === f.rawId)?.faces.front.page).toBe(
      f.role === "shrieker" ? 4 : 7,
    );
  expect(content.faces[0].skills.map((s) => [s.name, s.range, s.maxTargets])).toEqual([
    ["Peck", 1, 1],
    ["Call the Murder", 1, 4],
    ["Regurgitate", 2, 2],
  ]);
  expect(content.faces[0].skills[0]!.effects).toEqual([
    { kind: "selfPull", distance: 1 },
    { kind: "bleed", amount: 2, duration: 2 },
  ]);
  expect(content.faces[1].skills).toEqual([]);
});
it("R-261 十区、14 共边及部署投影不修改数据", () => {
  const before = structuredClone(content),
    areas = shriekerIApprovedBattleAreas();
  expect(areas).toHaveLength(10);
  expect(areas.find((a) => a.id === "E")).toMatchObject({
    capacity: 5,
    adjacent: ["B", "D", "F", "H"],
  });
  expect(areas.find((a) => a.id === "J")).toMatchObject({ capacity: 2, adjacent: ["G", "H"] });
  expect(areas.every((a) => a.elevation === "normal" && !a.zeroCapacity)).toBe(true);
  expect(content).toEqual(before);
});
it("数据不会把 Boss 加进普通房间或移出原描述概率池", () => {
  expect(content.combatReady).toBe(false);
  expect(content.tile.usable).toBe(false);
  expect(findWealdRoomTile(content.tile.roomId)).toBeUndefined();
  expect(wealdRoomTileSchema.safeParse(content.tile).success).toBe(false);
  expect(wealdThreatPool({ contentPacks: ["core", "weald"] }, 1)).toContain(
    content.abilities.descriptionCardId,
  );
  expect(content.pendingRuleDetails).toHaveLength(3);
});
it.each([
  "identity",
  "level",
  "resistance",
  "nestSkill",
  "targets",
  "effect",
  "edge",
  "area",
  "terrain",
  "ready",
])("拒绝 %s 漂移", (kind) => {
  const bad = structuredClone(printed);
  if (kind === "identity") bad.faces[0]!.rawId = "monster_large:weald:p005";
  if (kind === "level") bad.faces[0]!.level = 2;
  if (kind === "resistance") bad.faces[0]!.resistances = ["debuff"];
  if (kind === "nestSkill") bad.faces[1]!.skills = [bad.faces[0]!.skills[0]!];
  if (kind === "targets") bad.faces[0]!.skills[1]!.maxTargets = 3;
  if (kind === "effect")
    bad.faces[0]!.skills[0]!.effects = [
      { kind: "selfPull", distance: 1 },
      { kind: "bleed", amount: 2, duration: 3 },
    ];
  if (kind === "edge") bad.tile.edges.push({ ...bad.tile.edges[0]! });
  if (kind === "area") bad.tile.deployment.monsters.ranged = "C";
  if (kind === "terrain") bad.tile.areas[0]!.elevation = "high";
  if (kind === "ready") bad.combatReady = true;
  expect(wealdShriekerContentSchema.safeParse(bad).success).toBe(false);
});
