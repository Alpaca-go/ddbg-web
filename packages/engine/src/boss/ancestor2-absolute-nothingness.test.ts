import { expect, it } from "vitest";
import { applyCommand, type GameState } from "../command";
import { playHeroSkill } from "../battle";
import { readFinalFormSequence } from "./final-form-sequence";
import { finalPreparationFixture } from "../test-helpers/final-preparation";
import { FINAL_BATTLE_MONSTER_STANCE_AREAS } from "./final-battle-deploy";
import {
  ABSOLUTE_NOTHINGNESS_DODGE,
  ABSOLUTE_NOTHINGNESS_LIFE,
  ABSOLUTE_NOTHINGNESS_MONSTER_CARD_ID,
  applyAncestor2DeployAbsoluteNothingness,
  isAbsoluteNothingnessEntity,
} from "./ancestor2-absolute-nothingness";
import { ANCESTOR_2_MONSTER_CARD_ID } from "./ancestor2-swift-teleportation";

function prepared(questId: "quest:p016" | "quest:p017" | "quest:p018" = "quest:p017") {
  const base = finalPreparationFixture(questId);
  const begun = applyCommand(base, { type: "beginFinalPreparation" }).state;
  const state: GameState = {
    ...begun,
    dungeon: {
      ...begun.dungeon!,
      finalBattleProvisions: "ready",
      hamlet: { ...begun.dungeon!.hamlet!, phase: "preparationComplete", remainingDays: 0, day: 4 },
    },
  };
  return applyCommand(applyCommand(state, { type: "prepareFinalBattleForms" }).state, {
    type: "deployFinalBattleForm",
  });
}

function ancestor2Deployed() {
  const result = prepared("quest:p017");
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  const sequence = readFinalFormSequence(result.state)!;
  expect(sequence.current!.id).toBe("ancestor2");
  return result.state;
}

function nothingnessEntities(state: GameState) {
  return state.battle!.entities.filter(isAbsoluteNothingnessEntity);
}

it("Ancestor 2 形态部署自动写入最多 3 枚 Absolute Nothingness", () => {
  const game = ancestor2Deployed();
  const pieces = nothingnessEntities(game);
  expect(pieces).toHaveLength(3);
  expect(pieces.map((e) => e.stance).sort()).toEqual(["defensive", "ranged", "support"]);
  expect(pieces.every((e) => e.life === ABSOLUTE_NOTHINGNESS_LIFE)).toBe(true);
  expect(pieces.every((e) => e.dodge === ABSOLUTE_NOTHINGNESS_DODGE)).toBe(true);
  expect(pieces.every((e) => e.untargetable === true)).toBe(true);
  expect(pieces.every((e) => e.monsterCardId === ABSOLUTE_NOTHINGNESS_MONSTER_CARD_ID)).toBe(true);
  expect(pieces.every((e) => e.stanceSlots === 1)).toBe(true);
  expect(
    game.battle!.monsters!.some((c) => c.id === ABSOLUTE_NOTHINGNESS_MONSTER_CARD_ID),
  ).toBe(true);
  expect(
    game.battle!.monsters!.find((c) => c.id === ABSOLUTE_NOTHINGNESS_MONSTER_CARD_ID)!
      .type_position_tags,
  ).toEqual(["Cosmic"]);
});

it("姿态位被占时部分部署，显式命令可 idempotent 拒绝无新位", () => {
  const game = ancestor2Deployed();
  const blocked = {
    ...game,
    battle: {
      ...game.battle!,
      entities: game.battle!.entities.map((entity) =>
        entity.monsterCardId === ANCESTOR_2_MONSTER_CARD_ID
          ? { ...entity, stance: "defensive" as const, areaId: FINAL_BATTLE_MONSTER_STANCE_AREAS.defensive }
          : entity,
      ),
    },
  };
  const redeploy = applyAncestor2DeployAbsoluteNothingness({
    ...blocked,
    battle: {
      ...blocked.battle!,
      entities: blocked.battle!.entities.filter((e) => !isAbsoluteNothingnessEntity(e)),
    },
  });
  expect(redeploy.events.some((e) => e.type === "commandRefused")).toBe(false);
  const placed = nothingnessEntities(redeploy.state);
  expect(placed).toHaveLength(2);
  expect(placed.map((e) => e.stance).sort()).toEqual(["ranged", "support"]);
  const again = applyAncestor2DeployAbsoluteNothingness(redeploy.state);
  expect(again.state).toBe(redeploy.state);
  expect(again.events.some((e) => e.type === "commandRefused")).toBe(true);
});

it("非 Ancestor 2 拒绝显式部署命令", () => {
  const game = prepared("quest:p016").state;
  const result = applyAncestor2DeployAbsoluteNothingness(game);
  expect(result.state).toBe(game);
  expect(result.events.some((e) => e.type === "commandRefused")).toBe(true);
});

it("英雄技能不能选中 Absolute Nothingness", () => {
  const game = ancestor2Deployed();
  const target = nothingnessEntities(game)[0]!;
  const hero = game.battle!.entities.find((e) => e.side === "hero" && !e.dead)!;
  const skill = game.battle!.skills.find((s) => s.hero === hero.hero)!;
  const result = playHeroSkill(game, {
    type: "playHeroSkill",
    actorId: hero.id,
    targetId: target.id,
    skillId: skill.id,
  });
  expect(result.state).toBe(game);
  expect(result.events.some((e) => e.type === "commandRefused")).toBe(true);
  expect(result.events.find((e) => e.type === "commandRefused")).toMatchObject({
    message: expect.stringContaining("不可被选为目标"),
  });
});

it("applyCommand 白名单包含 applyAncestor2DeployAbsoluteNothingness", () => {
  const game = ancestor2Deployed();
  const result = applyCommand(game, { type: "applyAncestor2DeployAbsoluteNothingness" });
  expect(result.state).toBe(game);
});
