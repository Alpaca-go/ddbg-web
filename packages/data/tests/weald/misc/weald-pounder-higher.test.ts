import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import printed from "../../../normalized/extension/weald/pounder_higher.json";
import pool from "../../../normalized/corebox/monster_pool.json";
import { wealdPounderHigherContentSchema } from "../../../src/weald/misc/weald-pounder-higher";
import { rawFileSchema } from "../../../src/shared/extract/raw";

const content = wealdPounderHigherContentSchema.parse(printed);
it("R-268：真实当地印刷等级与已印核心唯一等级，引用副本充足且不重复计数", () => {
  const raw = rawFileSchema.parse(
    JSON.parse(
      readFileSync(
        new URL("../../../extract/extension/weald/raw/monster_medium.json", import.meta.url),
        "utf8",
      ),
    ),
  );
  for (const card of content.cards) {
    for (const face of card.faces) {
      const entry = raw.cards.find((c) => c.id === face.rawId)!;
      expect(entry.copies).toBe(1);
      expect(entry.faces.front).toMatchObject({
        file: content.sources.combatFront,
        page: Number(face.rawId.slice(-3)),
      });
    }
    const summon = card.abilities.reinforcements;
    const source = pool.cards.find((c) => c.combatCardId === summon.companionCardId)!;
    expect(source.level).toBe(summon.companionLevel);
    expect(source.pages.length).toBeGreaterThanOrEqual(summon.companions);
    expect(source.name).toBe(card.level === 2 ? "Brigand Bloodletter" : "Brigand Raider");
  }
});

it("R-268：Pounder仍为特殊触发，Matchman无命中骰，威胁读取实际面值", () => {
  expect(content.cards.map((c) => c.faces.map((f) => [f.selection, f.skill.accuracy]))).toEqual([
    [
      ["triggerOnly", 10],
      ["skill1AllStances", null],
    ],
    [
      ["triggerOnly", 11],
      ["skill1AllStances", null],
    ],
  ]);
  expect(
    content.cards.map((c) => [
      c.abilities.threats.dungeon.buffDuration,
      c.abilities.threats.dungeon.riposteDuration,
      c.abilities.threats.hamlet.heroDamage,
    ]),
  ).toEqual([
    [2, 2, 7],
    [3, 3, 9],
  ]);
  expect(content.combatReady).toBe(false);
});

it("拒绝伪造同级Bloodletter、错误炮伤、跨级面与重复等级", () => {
  const wrongSummon = structuredClone(printed);
  wrongSummon.cards[0]!.abilities.reinforcements.companionLevel = 2;
  const wrongDamage = structuredClone(printed);
  wrongDamage.cards[0]!.faces[0]!.skill.damage = 19;
  const wrongFace = structuredClone(printed);
  wrongFace.cards[1]!.faces[1]!.rawId = "monster_medium:weald:p024";
  const duplicate = structuredClone(printed);
  duplicate.cards[1]!.level = 2;
  for (const bad of [wrongSummon, wrongDamage, wrongFace, duplicate])
    expect(wealdPounderHigherContentSchema.safeParse(bad).success).toBe(false);
});
