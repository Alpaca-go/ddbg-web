import { performance } from "node:perf_hooks";
import { applyCommand } from "../../../packages/engine/src/command";
import type { Command, GameState } from "../../../packages/engine/src/command";
import { createQuestSave, loadQuestSave } from "../../../packages/engine/src/quest-save";
import { createCoreDungeonQuest } from "../../../packages/engine/src/dungeon-quest-entry";
import { coreQuestSources } from "../../../packages/engine/src/test-helpers/core-quest";
import {
  naturalParty,
  naturalQuest,
} from "../../../packages/engine/src/test-helpers/natural-quest";

// 保留现有种子与策略；观测不改变命令、数值或 RNG。
let count = 0;
let battleCheckpoint: { game: GameState; count: number } | undefined;
const route = naturalQuest(2, "quest:p001", false, coreQuestSources, 4, {
  handleDeaths: true,
  observe(game, command) {
    count++;
    if (!battleCheckpoint && command.type === "startBattle") battleCheckpoint = { game, count };
  },
});
const start = {
  seed: 2,
  questId: "quest:p001" as const,
  mode: "radiant" as const,
  party: naturalParty,
};

function measure(action: () => unknown) {
  action(); // 预热，不计入均值。
  const samples: number[] = [];
  for (let i = 0; i < 3; i++) {
    const before = performance.now();
    action();
    samples.push(performance.now() - before);
  }
  return {
    mean: +(samples.reduce((a, b) => a + b, 0) / samples.length).toFixed(1),
    min: +Math.min(...samples).toFixed(1),
    max: +Math.max(...samples).toFixed(1),
  };
}

function profile(label: string, commands: readonly Command[], game: GameState) {
  const json = JSON.stringify(createQuestSave(start, commands, game, coreQuestSources));
  const save = measure(() =>
    JSON.stringify(createQuestSave(start, commands, game, coreQuestSources)),
  );
  const load = measure(() => loadQuestSave(JSON.parse(json), coreQuestSources));
  console.info(label, `${commands.length} 命令，${Buffer.byteLength(json)} 字节`);
  console.table({ "保存及编码 ms": save, "解码及严格加载 ms": load });
}

console.info(`Node ${process.version}；直接运行构建模块；每项预热 1 次、采样 3 次。`);
if (!battleCheckpoint) throw new Error("固定路线未产生真实战斗检查点");
profile("真实战斗前缀", route.commands.slice(0, battleCheckpoint.count), battleCheckpoint.game);

const exitIndex = route.commands.map((command) => command.type).lastIndexOf("leaveDungeon");
if (exitIndex < 0) throw new Error("固定任务未到达离场命令，不能构造性能样本");
const prefix = route.commands.slice(0, exitIndex);
let prefixGame = createCoreDungeonQuest(
  start.seed,
  start.questId,
  start.mode,
  start.party,
  coreQuestSources,
);
for (const command of prefix) prefixGame = applyCommand(prefixGame, command).state;
const lengths = process.env.DDBG_PROFILE_MAX_LOG
  ? [prefix.length, 1000, 5000, 10000]
  : [prefix.length, 1000];
for (const length of lengths) {
  if (length < prefix.length) continue;
  const commands: Command[] = [...prefix];
  let game = prefixGame;
  // ping 扩展仅测合法日志长度开销，不代表同长度实战耗时或完整战役验收。
  while (commands.length < length) {
    const command = { type: "ping", message: "save-profile" } as const;
    const result = applyCommand(game, command);
    if (result.events.some((event) => event.type === "commandRefused"))
      throw new Error("性能样本包含拒绝命令");
    game = result.state;
    commands.push(command);
  }
  profile(length === prefix.length ? "真实任务前缀" : "扩展日志压力样本", commands, game);
}
