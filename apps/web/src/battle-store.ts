import { create } from "zustand";
import { applyCommand, createBattleState, spawnMonsters } from "@ddbg/engine";
import type { BattleEntity, Command, GameEvent, GameState, SkillStance } from "@ddbg/engine";
import { battleData } from "virtual:battle-data";

/** 手动布置的单场沙盒；不使用未核实的部署标记，不生成房间 / 奖励。 */
export type SandboxLayout =
  "basic" | "shuffle" | "heal" | "pair" | "trio" | "formalSoldier" | "formalMixed" | "formalBack";

function sandbox(seed: number, layout: SandboxLayout = "basic"): GameState {
  const layouts: Record<
    Exclude<SandboxLayout, "formalSoldier" | "formalMixed" | "formalBack">,
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
  const formal = layout.startsWith("formal");
  const { stances, areas, monsterArea } =
    layouts[formal ? "basic" : (layout as keyof typeof layouts)];
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
        areaId: formal ? battleData.deployment.heroes[stances[index]!] : areas[index]!,
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
  const roster = formal
    ? {
        formalSoldier: [
          "monster_medium:p001",
          "monster_medium:p001",
          "monster_medium:p001",
          "monster_medium:p040",
        ],
        formalMixed: [
          "monster_medium:p001",
          "monster_medium:p040",
          "monster_medium:p001",
          "monster_medium:p040",
        ],
        formalBack: [
          "monster_medium:p004",
          "monster_medium:p001",
          "monster_medium:p004",
          "monster_medium:p040",
        ],
      }[layout as "formalSoldier" | "formalMixed" | "formalBack"]
    : layout === "trio"
      ? ["monster_medium:p004", "monster_medium:p001", "monster_medium:p040"]
      : layout === "pair"
        ? ["monster_medium:p001", "monster_medium:p040"]
        : ["monster_medium:p001"];
  const spawned = spawnMonsters(
    roster.map((id, index) => {
      const card = battleData.monsters.find((card) => card.id === id)!;
      if (roster.filter((other) => other === id).length > card.copies)
        throw new Error("固定牌堆超出印刷份数");
      return {
        instanceId: `monster-${index}`,
        cardId: id,
        edge: card.spawnEdge,
        stanceSlots: card.stanceSlots,
        verified: !card.verification.unverified,
      };
    }),
    battleData.deployment.monsters,
  );
  if (spawned.type === "refused") throw new Error(spawned.reason);
  const monsters: BattleEntity[] = roster.map((id, index) => {
    const card = battleData.monsters.find((m) => m.id === id)!;
    return {
      id: formal
        ? spawned.monsters[index]!.instanceId
        : id === "monster_medium:p001"
          ? "soldier"
          : id === "monster_medium:p004"
            ? "courtier"
            : "rabble",
      side: "monster",
      hero: null,
      monsterCardId: card.id,
      life: card.life,
      areaId: formal ? spawned.monsters[index]!.areaId : monsterArea,
      stance: formal
        ? spawned.monsters[index]!.stance
        : (["aggressive", "defensive", "ranged"] as const)[index]!,
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
    ...(formal ? { lootAreas: battleData.deployment.lootAreas } : {}),
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
