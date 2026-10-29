import { createRng, rollD10 } from "./rng";

/** 共享 RNG 游标；技能骰与先攻洗牌消费同一个可回放序列。 */
export function nextBattleRoll(seed: number, cursor: number): number {
  const rng = createRng(seed);
  for (let index = 0; index < cursor; index += 1) rng.next();
  return rollD10(rng);
}
