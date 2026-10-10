import { create } from "zustand";
import { applyCommand, createBattleState } from "@ddbg/engine";
import type { BattleEntity, Command, GameEvent, GameState, SkillStance } from "@ddbg/engine";
import { battleData } from "virtual:battle-data";

/** 手动布置的单场沙盒；不使用未核实的部署标记，不生成房间 / 奖励。 */
export type SandboxLayout = "basic" | "shuffle";

function sandbox(seed: number, layout: SandboxLayout = "basic"): GameState {
  const stances: SkillStance[] =
    layout === "shuffle"
      ? ["ranged", "defensive", "aggressive", "support"]
      : ["aggressive", "defensive", "ranged", "support"];
  const areas = layout === "shuffle" ? ["B", "C", "A", "D"] : ["A", "A", "A", "A"];
  const heroes: BattleEntity[] = ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"].map(
    (name, index) => {
      const stat = battleData.heroStats.find((card) => card.name === name)!;
      return {
        id: `hero-${index}`,
        side: "hero",
        hero: name,
        heroStatId: stat.id,
        life: stat.life,
        areaId: areas[index]!,
        stance: stances[index]!,
        wounds: 0,
        stress: 0,
        dodge: stat.dodge,
        skillIds: battleData.skills.filter((card) => card.hero === name).map((card) => card.id),
        guard: false,
        dead: false,
        bleed: [],
        blight: [],
      };
    },
  );
  const monster = battleData.monsters[0]!;
  return createBattleState(seed, {
    ...battleData,
    light: 5,
    entities: [
      ...heroes,
      {
        id: "soldier",
        side: "monster",
        hero: null,
        monsterCardId: monster.id,
        life: monster.life,
        areaId: layout === "shuffle" ? "A" : "B",
        stance: "aggressive",
        stanceSlots: 1,
        wounds: 0,
        dodge: 0,
        skillIds: [],
        guard: false,
        dead: false,
        bleed: [],
        blight: [],
      },
    ],
  });
}

type BattleStore = {
  game: GameState;
  layout: SandboxLayout;
  commands: readonly Command[];
  events: readonly GameEvent[];
  notice: string;
  dispatch(command: Command): void;
  reset(seed: number, layout: SandboxLayout): void;
};
export const useBattleStore = create<BattleStore>((set) => ({
  game: sandbox(1),
  layout: "basic",
  commands: [],
  events: [],
  notice: "请开始战斗，再抽取先攻。",
  dispatch: (command) =>
    set((store) => {
      const result = applyCommand(store.game, command);
      return {
        game: result.state,
        commands: [...store.commands, command],
        events: [...store.events, ...result.events],
        notice: result.pendingChoice?.prompt ?? result.events.at(-1)?.message ?? "命令已处理。",
      };
    }),
  reset: (seed, layout) =>
    set({
      game: sandbox(seed, layout),
      layout,
      commands: [],
      events: [],
      notice: "已按种子重新布置沙盒。",
    }),
}));
