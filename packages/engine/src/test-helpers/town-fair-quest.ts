import { applyCommand } from "../command";
import { coreQuestSources } from "./core-quest";
import { naturalScoutReturn } from "./natural-scout-return";

/** seed40 完整任务与回村，停在自然 Town Fair 抽牌前；不搜索 / 注入牌序。 */
export function townFairQuest(sources = coreQuestSources) {
  const journey = naturalScoutReturn(40, sources);
  // 只预检不可变状态的下一条公开命令，实际状态 / 游标和日志仍停在事件前。
  const preview = applyCommand(journey.game, { type: "drawHamletEvent" });
  if (preview.state.dungeon!.hamlet!.last !== "hamlet_event:p007")
    throw new Error("seed40 未自然抽到 Town Fair，不能替换事件牌序");
  return journey;
}
