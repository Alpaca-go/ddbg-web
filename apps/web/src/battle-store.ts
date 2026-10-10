import { create } from "zustand";
import { applyCommand, createBattleState } from "@ddbg/engine";
import type { BattleEntity, Command, GameEvent, GameState, SkillStance } from "@ddbg/engine";
import { battleData } from "virtual:battle-data";

/** 手动布置的单场沙盒；不使用未核实的部署标记，不生成房间 / 奖励。 */
export type SandboxLayout = "basic" | "shuffle" | "heal" | "pair" | "trio";

function sandbox(seed: number, layout: SandboxLayout = "basic"): GameState {
  const layouts: Record<
    SandboxLayout,
    { stances: SkillStance[]; areas: string[]; monsterArea: string }
  > = {
    basic: {
      stances: ["aggressive", "defensive", "ranged", "support"],
      areas: ["A", "A", "A", "A"],
      monsterArea: "B",
    },
    shuffle: {
      stances: ["ranged", "defensive", "aggressive", "support"],
      areas: ["B", "C", "A", "D"],
      monsterArea: "A",
    },
    heal: {
      stances: ["aggressive", "ranged", "support", "defensive"],
      areas: ["B", "B", "B", "A"],
      monsterArea: "C",
    },
    pair: {
      stances: ["aggressive", "ranged", "defensive", "support"],
      areas: ["A", "A", "A", "A"],
      monsterArea: "B",
    },
    trio: {
      stances: ["aggressive", "ranged", "defensive", "support"],
      areas: ["A", "A", "A", "A"],
      monsterArea: "B",
    },
  };
  const { stances, areas, monsterArea } = layouts[layout];
  const heroes: BattleEntity[] = ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"].map(
    (name, index) => {
      const stat = battleData.heroStats.find((card) => card.name === name)!;
      return {
        id: `hero-${index}`,
        side: "hero",
        hero: name,
        heroStatId: stat.id,
        heroLevel: stat.level,
        life: stat.life,
        areaId: areas[index]!,
        stance: stances[index]!,
        wounds: layout === "heal" ? 5 : 0,
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
  const roster =
    layout === "trio"
      ? ["monster_medium:p004", "monster_medium:p001", "monster_medium:p040"]
      : layout === "pair"
        ? ["monster_medium:p001", "monster_medium:p040"]
        : ["monster_medium:p001"];
  const monsters: BattleEntity[] = roster.map((id, index) => {
    const card = battleData.monsters.find((m) => m.id === id)!;
    return {
      id:
        id === "monster_medium:p001"
          ? "soldier"
          : id === "monster_medium:p004"
            ? "courtier"
            : "rabble",
      side: "monster",
      hero: null,
      monsterCardId: card.id,
      life: card.life,
      areaId: monsterArea,
      stance: (["aggressive", "defensive", "ranged"] as const)[index]!,
      stanceSlots: 1,
      wounds: 0,
      dodge: card.dodge,
      skillIds: [],
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
    };
  });
  return createBattleState(seed, {
    ...battleData,
    provisions: [],
    light: 5,
    entities: [...heroes, ...monsters],
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
