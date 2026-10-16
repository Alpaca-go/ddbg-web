import { create } from "zustand";
import { useState } from "react";
import {
  applyCommand,
  canLeaveDungeon,
  canRestDungeon,
  createDungeonSandbox,
  createCoreDungeonQuest,
  createQuestSave,
  loadQuestSave,
  currentHamletEvent,
  currentHamletHero,
  hamletActionOptions,
  blacksmithOptions,
  visitGuild,
  setEquippedSkills,
  ownedHeroSkills,
  heroSkillSlotCount,
  visitNomadWagon,
  upgradableBuildings,
  recoveryBuildingLevel,
  stagecoachWaitingTokens,
  upgradeHamletBuilding,
  createTrinketPool,
  readRoomTile,
  PROVISION_EFFECTS,
  dungeonProvisionWindow,
} from "@ddbg/engine";
import type {
  QuestParty,
  QuestStart,
  CoreQuestSources,
  Command,
  GameEvent,
  GameState,
  DungeonState,
  PendingChoice,
} from "@ddbg/engine";
import rawLayouts from "../../../packages/data/normalized/corebox/dungeon_layouts.json";
import { dungeonLayoutFileSchema } from "../../../packages/data/src/dungeon-layout";
import type { DungeonLayout } from "../../../packages/data/src/dungeon-layout";
import { battleData } from "virtual:battle-data";
import { BattleView } from "./battle-view";
import { provisionLabels, provisionEffectLabels } from "./provision-labels";
import distribution from "../../../packages/data/normalized/corebox/scout_ahead_distribution.json";
import wipeDistribution from "../../../packages/data/normalized/corebox/wipe_em_out_distribution.json";
import fundraiserDistribution from "../../../packages/data/normalized/corebox/fundraiser_distribution.json";
import { basicQuests, readBasicQuest } from "../../../packages/data/src/basic-quests";
import type { BasicQuestId } from "../../../packages/data/src/basic-quests";
import { restPoints } from "../../../packages/data/src/scout-rest";
import rawRooms from "../../../packages/data/normalized/corebox/room.json";
import { roomFileSchema } from "../../../packages/data/src/room";
import rawMonsterPool from "../../../packages/data/normalized/corebox/monster_pool.json";
import { monsterPoolFileSchema } from "../../../packages/data/src/monster-pool";
import rawCurios from "../../../packages/data/normalized/corebox/curio.json";
import rawTrinkets from "../../../packages/data/normalized/corebox/trinket.json";
import { normalizedTrinketFileSchema } from "../../../packages/data/src/normalize/schema";
import { curioFileSchema, isNegativeCurioEffect } from "../../../packages/data/src/curio";
import type { CurioEffect } from "../../../packages/data/src/curio";

function curioEffectLabel(effect: CurioEffect) {
  if (effect.type === "gold") return `金币 +${effect.amount}`;
  if (effect.type === "stress") return `压力 +${effect.amount}`;
  if (effect.type === "status")
    return `${{ bleed: "流血", blight: "腐蚀", buff: "增益", debuff: "减益" }[effect.kind]}${effect.amount ? ` ${effect.amount}` : ""}，${effect.duration} 回合`;
  if (effect.type === "drawDisease") return "获得一张疾病";
  if (effect.type === "drawQuirk")
    return `抽一张${effect.polarity === "positive" ? "正面" : "负面"}怪癖`;
  if (effect.type === "drawTrinket") return "抽一张饰品卡";
  return "掷一颗补给骰";
}

const layouts = dungeonLayoutFileSchema.parse(rawLayouts).layouts;
function FundraiserChoice({
  choice,
  choose,
}: {
  choice: PendingChoice;
  choose: (id: string) => void;
}) {
  const [selected, setSelected] = useState(choice.options[0]!.id);
  return (
    <div>
      <label>
        捐献金币
        <select
          aria-label="捐献金币"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          {choice.options
            .filter((o) => o.id !== "cancel")
            .map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
        </select>
      </label>
      <button onClick={() => choose(selected)}>确认捐献</button>{" "}
      <button onClick={() => choose("cancel")}>取消捐献</button>
    </div>
  );
}
const curios = curioFileSchema.parse(rawCurios).cards;
type Fixture =
  | "navigationProvisions"
  | "startingProvisions"
  | "fundraiser"
  | "fundraiserBattle"
  | "fundraiserRewards"
  | "wipe"
  | "wipeBattle"
  | "neutral"
  | "pressure"
  | "heartAttack"
  | "corridor"
  | "curio"
  | "curioRoom"
  | "curioBuff"
  | "curioNegative"
  | "curioProvision"
  | "curioPositive"
  | "curioRewards"
  | "curioTrinket"
  | "curioComposite"
  | "trap"
  | "dark"
  | "roomApproved"
  | "roomFountain"
  | "roomBeacon"
  | "roomAncestor"
  | "roomAbbey"
  | "roomInvocation"
  | "roomSpiked"
  | "roomBattle"
  | "roomDisease"
  | "roomBlocked";
function setup(mode: DungeonState["mode"], page = 1, fixture: Fixture = "neutral") {
  const selected = layouts.find((l) => l.source.page === page)!;
  const preview = selected.unresolvedMarkers?.length ? selected : null;
  const layout = preview ? layouts[0]! : selected;
  const position =
    layout.nodes.find(
      (n) =>
        n.kind === "room" &&
        layout.edges.some(
          (e) =>
            e.includes(n.id) &&
            e.some((id) => layout.nodes.some((dot) => dot.id === id && dot.kind === "dot")),
        ),
    )?.id ??
    layout.edges
      .flat()
      .find((id) => id !== "S" && layout.edges.some((e) => e.includes("S") && e.includes(id)))!;
  const heroes = Array.from({ length: 4 }, (_, i) => ({
    id: `hero-${i}`,
    stress:
      i === 0
        ? fixture === "trap"
          ? 8
          : fixture === "pressure" || fixture === "heartAttack"
            ? 9
            : 0
        : 0,
    stance: (["aggressive", "defensive", "ranged", "support"] as const)[i]!,
    ...(() => {
      const stat = battleData.heroStats.find(
        (s) => s.level === 1 && s.name === ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"][i],
      )!;
      return {
        level: stat.level,
        life: stat.life,
        attributesVerified: stat.attributesVerified,
        wounds: 0,
        heroStatId: stat.id,
        skillIds: battleData.skills
          .filter((s) => s.hero === stat.name && s.level === 1)
          .slice(0, 3)
          .map((s) => s.id),
      };
    })(),
    ...(fixture === "navigationProvisions" && i === 0
      ? {
          wounds: 3,
          stress: 3,
          statusStacks: [
            { kind: "bleed" as const, remaining: 2, amount: 1 },
            { kind: "blight" as const, remaining: 3, amount: 1 },
          ],
        }
      : {}),
    ...(i === 0 && fixture === "heartAttack"
      ? { resolveTested: true, resolveCardId: battleData.resolveCards[0]!.id }
      : {}),
  }));
  const initial = createDungeonSandbox(
    fixture === "curioRoom"
      ? 80
      : fixture === "startingProvisions"
        ? 75
        : fixture === "wipeBattle" || fixture === "fundraiserBattle"
          ? 1885
          : fixture === "roomBeacon"
            ? 1
            : fixture === "roomInvocation"
              ? 2
              : fixture === "roomSpiked"
                ? 9
                : fixture === "roomAbbey"
                  ? 7
                  : fixture === "roomAncestor"
                    ? 12
                    : fixture === "roomFountain"
                      ? 10
                      : fixture === "roomDisease"
                        ? 4
                        : fixture === "roomBattle"
                          ? 1885
                          : fixture === "roomApproved"
                            ? 11
                            : fixture === "roomBlocked"
                              ? 35
                              : fixture === "curioComposite"
                                ? 230
                                : fixture === "curioTrinket"
                                  ? 921
                                  : fixture === "curioRewards"
                                    ? 317
                                    : fixture === "curioPositive"
                                      ? 85
                                      : fixture === "curioProvision"
                                        ? 370
                                        : fixture === "curioBuff"
                                          ? 343
                                          : fixture === "curio"
                                            ? 1237
                                            : fixture === "curioNegative"
                                              ? 46
                                              : fixture === "corridor"
                                                ? 31
                                                : 1,
    layout,
    fixture.startsWith("fundraiser")
      ? fundraiserDistribution
      : fixture === "wipe" || fixture === "wipeBattle"
        ? wipeDistribution
        : distribution,
    mode,
    fixture === "startingProvisions" ? "S" : position,
    heroes,
    battleData.resolveCards,
    {
      dungeonLevel: fixture === "trap" ? 3 : 1,
      light: 5,
      provisions:
        fixture === "navigationProvisions"
          ? [
              { id: "nav-food", face: "food" },
              { id: "nav-bandage", face: "bandage" },
              { id: "nav-potion", face: "potion" },
            ]
          : fixture === "startingProvisions"
            ? []
            : [
                { id: "tool-1", face: "tool" },
                { id: "tool-2", face: "tool" },
                { id: "tool-3", face: "tool" },
                { id: "tool-4", face: "tool" },
                { id: "torch-1", face: "torch" },
                { id: "food-1", face: "food" },
              ],
    },
    curios,
    roomFileSchema.parse(rawRooms).cards,
    monsterPoolFileSchema.parse(rawMonsterPool).cards,
    {
      ...battleData,
      trinkets: createTrinketPool(
        normalizedTrinketFileSchema.parse(rawTrinkets).cards,
        fixture === "trap" ? 3 : 1,
      ),
    },
    fixture === "startingProvisions",
  );
  if (fixture === "startingProvisions")
    return { game: initial, page, fixture, preview, events: [], commands: [] };
  if (fixture === "curioRoom")
    return {
      game: {
        ...initial,
        dungeon: {
          ...initial.dungeon!,
          position: "D",
          visited: ["D"],
          phase: "awaitingRoom" as const,
          rooms: initial.dungeon!.rooms.map((r) =>
            r.id === "D" ? { ...r, kind: "curio" as const, revealed: true } : r,
          ),
        },
      },
      page,
      fixture,
      preview,
      events: [],
      commands: [],
    };
  // 此布置以已清理的起始房间演示真实走廊往返，不模拟该房间的战斗或奖励。
  const startingKind = initial.dungeon!.rooms.find((r) => r.id === position)!.kind;
  const corridorSwap =
    fixture === "corridor" && startingKind !== "empty"
      ? initial.dungeon!.rooms.find((r) => r.kind === "empty" && r.id !== "D" && r.id !== position)
          ?.id
      : undefined;
  const wipeRoom = initial.dungeon!.rooms.find((r) => r.kind === "lair")!;
  const game =
    fixture === "fundraiserRewards"
      ? {
          ...initial,
          dungeon: {
            ...initial.dungeon!,
            gold: 60,
            position: wipeRoom.id,
            visited: [wipeRoom.id],
            rooms: initial.dungeon!.rooms.map((r) => ({
              ...r,
              revealed: r.id === wipeRoom.id,
              ...(r.id === wipeRoom.id ? { cleared: true } : {}),
            })),
          },
        }
      : fixture === "wipeBattle" || fixture === "fundraiserBattle"
        ? {
            ...initial,
            dungeon: {
              ...initial.dungeon!,
              position: wipeRoom.id,
              visited: [wipeRoom.id],
              phase: "awaitingRoom" as const,
              rooms: initial.dungeon!.rooms.map((r) => ({ ...r, revealed: r.id === wipeRoom.id })),
            },
          }
        : fixture === "corridor" ||
            fixture === "curio" ||
            fixture === "curioBuff" ||
            fixture === "curioNegative" ||
            fixture === "curioProvision" ||
            fixture === "curioPositive" ||
            fixture === "curioRewards" ||
            fixture === "curioTrinket" ||
            fixture === "curioComposite"
          ? {
              ...initial,
              dungeon: {
                ...initial.dungeon!,
                rooms: initial.dungeon!.rooms.map((r) =>
                  r.id === position
                    ? { ...r, ...(corridorSwap ? { kind: "empty" as const } : {}), cleared: true }
                    : r.id === corridorSwap
                      ? { ...r, kind: startingKind }
                      : r,
                ),
              },
            }
          : fixture === "dark"
            ? {
                ...initial,
                dungeon: {
                  ...initial.dungeon!,
                  rooms: initial.dungeon!.rooms.map((r) =>
                    r.id === "D"
                      ? { ...r, kind: "dark" as const }
                      : r.kind === "dark"
                        ? {
                            ...r,
                            kind: initial.dungeon!.rooms.find((room) => room.id === "D")!.kind,
                          }
                        : r.id === position
                          ? { ...r, cleared: true }
                          : r,
                  ),
                },
              }
            : fixture === "roomDisease" ||
                fixture === "roomFountain" ||
                fixture === "roomBeacon" ||
                fixture === "roomAncestor" ||
                fixture === "roomAbbey" ||
                fixture === "roomInvocation" ||
                fixture === "roomSpiked" ||
                fixture === "roomBlocked"
              ? {
                  ...initial,
                  dungeon: {
                    ...initial.dungeon!,
                    rooms: initial.dungeon!.rooms.map((r) =>
                      r.id === "D"
                        ? { ...r, kind: "lair" as const }
                        : r.id === "A"
                          ? { ...r, kind: "curio" as const }
                          : r,
                    ),
                  },
                }
              : initial;
  return {
    game,
    page,
    fixture,
    preview,
    events: [],
    commands: [],
  };
}

const useDungeonStore = create<{
  game: GameState;
  page: number;
  fixture: Fixture;
  preview: DungeonLayout | null;
  events: readonly GameEvent[];
  commands: readonly Command[];
  questStart: QuestStart | null;
  dispatch: (command: Command) => void;
  beginTask: (game: GameState, start: QuestStart) => void;
  restoreTask: (loaded: ReturnType<typeof loadQuestSave>) => void;
  reset: (mode: DungeonState["mode"]) => void;
  select: (page: number, fixture: Fixture) => void;
}>((set) => ({
  // 当前房间为导航就绪的测试注入点；没有通过走廊，也没有获得奖励。
  ...setup("standard"),
  questStart: null,
  dispatch: (command) =>
    set((s) => {
      const result = applyCommand(s.game, command);
      return {
        game: result.state,
        events: result.events,
        commands: result.events.some((e) => e.type === "commandRefused")
          ? s.commands
          : [...s.commands, command],
      };
    }),
  beginTask: (game, questStart) =>
    set({ game, questStart, page: 1, fixture: "neutral", preview: null, events: [], commands: [] }),
  restoreTask: (loaded) =>
    set({
      game: loaded.game,
      questStart: loaded.start,
      commands: loaded.commands,
      events: loaded.events,
      page: 1,
      fixture: "neutral",
      preview: null,
    }),
  reset: (mode) => set((s) => ({ ...setup(mode, s.page, s.fixture), questStart: null })),
  select: (page, fixture) =>
    set((s) => ({ ...setup(s.game.dungeon!.mode, page, fixture), questStart: null })),
}));

const questSaveKey = "ddbg.core-quest.save.v1";
function QuestSaveControls({ onLoad }: { onLoad?: () => void }) {
  const { game, commands, questStart, restoreTask } = useDungeonStore();
  const [notice, setNotice] = useState("");
  const run = (action: () => void) => {
    try {
      action();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "存档操作失败，原进度保持不变");
    }
  };
  return (
    <section className="panel" aria-label="任务存档">
      <div className="button-row">
        {questStart && (
          <button
            onClick={() =>
              run(() => {
                const save = createQuestSave(questStart, commands, game, taskSources);
                localStorage.setItem(questSaveKey, JSON.stringify(save));
                setNotice("已保存到本机，可刷新后读取继续。");
              })
            }
          >
            保存进度
          </button>
        )}
        <button
          onClick={() =>
            run(() => {
              const raw = localStorage.getItem(questSaveKey);
              if (!raw) throw new Error("本机还没有任务存档");
              const loaded = loadQuestSave(JSON.parse(raw), taskSources);
              restoreTask(loaded);
              setNotice("已读取进度，可继续当前行动或待选决定。");
              onLoad?.();
            })
          }
        >
          读取本机存档
        </button>
      </div>
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
const labels = {
  empty: "空房",
  dark: "黑暗",
  curio: "奇物",
  lair: "巢穴",
  trap: "陷阱",
  treasure: "宝藏",
  objective: "目标",
};
const buildingLabels: Record<string, string> = {
  survivalist: "生存专家",
  tavern: "酒馆",
  sanitarium: "疗养院",
  abbey: "修道院",
  graveyard: "墓地",
  guild: "公会",
  blacksmith: "铁匠",
  nomadWagon: "游商马车",
  stagecoach: "驿站",
};

export function DungeonSandbox({ formal = false }: { formal?: boolean } = {}) {
  const { game, events, commands, dispatch, reset, select, page, fixture, preview } =
    useDungeonStore();
  const [provisionTarget, setProvisionTarget] = useState("hero-0");
  const d = game.dungeon!;
  const hamletCard = currentHamletEvent(game);
  if (game.battle)
    return (
      <>
        {formal && (
          <div className="shell">
            <QuestSaveControls />
          </div>
        )}
        <BattleView
          game={game}
          dispatch={dispatch}
          events={events}
          commands={commands}
          layout="dungeon"
          notice={events.map((e) => e.message).join("；")}
        />
      </>
    );
  const currentRoom = d.rooms.find((r) => r.id === d.position);
  const quest = readBasicQuest(d.questDistribution);
  const map = preview ?? d.layout;
  const shownCurio = d.curio?.active ?? d.curio?.last;
  const card = d.curio?.cards.find((c) => c.id === shownCurio?.cardId);
  return (
    <main className="shell">
      {formal && <QuestSaveControls />}
      <header className="topbar">
        <div>
          <p className="eyebrow">DDBG · PHASE 3</p>
          <h1>{formal ? quest!.name : "地牢布局与侦察"}</h1>
          <p className="muted">
            QuestMap p{page} {d.layout.review === "confirmed" ? "已批准" : "标注待批准"} ·{" "}
            {quest?.name ?? "任务身份待核实"} · 固定种子 {game.seed} · 光照{" "}
            {d.explorationSetup?.light ?? "待配置"}、DL {d.explorationSetup!.dungeonLevel}
          </p>
          {!formal && (
            <>
              <p>
                {fixture === "navigationProvisions"
                  ? "测试注入：hero-0有3伤口、3压力、流血与腐蚀，用于检查探索间补给。"
                  : fixture === "startingProvisions"
                    ? "入口演示：空补给池，按种子完成开局补给后探索；地图标注仍待批准。"
                    : fixture === "fundraiserRewards"
                      ? "测试注入：已清理一间巢穴与60金币，仅检查退出捐献，不代表实战获得。"
                      : fixture === "roomInvocation"
                        ? "房间测试：固定D为巢穴；种子2按完整九房／42怪池自然抽到Invocation Chamber，不代表完整任务验收。"
                        : fixture === "roomSpiked"
                          ? "房间测试：固定D为巢穴；种子9按完整九房／42怪池自然抽到Spiked Pit，不代表完整任务验收。"
                          : preview
                            ? "16 槽地图仅预览，未解释标记保留，未开启 Boss 规则。"
                            : "测试注入：导航就绪英雄与六个补给；从选路开始，逐骰结算后进入目标节点。"}
              </p>
            </>
          )}
          <a href="/">返回战斗沙盒</a>
        </div>
      </header>
      <section className="panel">
        <h2>{formal ? "地牢地图" : "板块标注预览"}</h2>
        {!formal && (
          <>
            <label>
              地图页码
              <select value={page} onChange={(e) => select(Number(e.target.value), fixture)}>
                {layouts.map((l) => (
                  <option key={l.id} value={l.source.page}>
                    p{l.source.page}
                    {l.unresolvedMarkers?.length ? "（仅预览）" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              侦察测试布置
              <select value={fixture} onChange={(e) => select(page, e.target.value as Fixture)}>
                <option value="neutral">中立英雄</option>
                <option value="navigationProvisions">探索间补给（伤口 / 压力 / 状态注入）</option>
                <option value="startingProvisions">入口开局补给（标准 / Radiant）</option>
                <option value="fundraiser">Fundraiser I · 完整八枚代币</option>
                <option value="fundraiserBattle">Fundraiser I · 巢穴战斗入口（种子1885）</option>
                <option value="fundraiserRewards">
                  Fundraiser I · 结算测试（1巢穴与60金币注入）
                </option>
                <option value="wipe">Wipe ‘Em Out I · 完整八枚代币（种子1）</option>
                <option value="wipeBattle">Wipe ‘Em Out I · 巢穴战斗入口（种子1885）</option>
                <option value="pressure">首次检定（hero-0 压力 9）</option>
                <option value="heartAttack">已有意志卡（hero-0 压力 9）</option>
                <option value="corridor">单走廊 → Empty（标准 p1、种子 31、无需侦察）</option>
                <option value="curio">Curio → Empty（标准 p1、种子 1237、先用 Torch）</option>
                <option value="curioRoom">
                  Curio 房间入口（种子80；注入D房间代币，完整Curio牌池）
                </option>
                <option value="curioBuff">Curio Buff（标准 p1、种子 343、先用 Torch）</option>
                <option value="curioNegative">
                  Heirloom Chest负面状态（标准 p1、种子46、不用Torch）
                </option>
                <option value="curioProvision">
                  Curio 补给 Wild（标准 p1、种子 370、先用 Torch）
                </option>
                <option value="curioPositive">
                  Curio 正面怪癖（标准 p1、种子 85、先用 Torch）
                </option>
                <option value="curioRewards">
                  Curio 怪癖与补给（标准 p1、种子 317、先用 Torch）
                </option>
                <option value="curioTrinket">
                  Curio 饰品获得（标准 p1、种子 921、先用 Torch）
                </option>
                <option value="curioComposite">
                  Curio 复合奖励（标准 p1、种子 230、先用 Torch）
                </option>
                <option value="trap">Trap 房间（p1、种子 1、DL 3、hero-0 压力 8）</option>
                <option value="dark">Dark 房间与 Torch（p1、种子 1，固定房间代币）</option>
                <option value="roomApproved">
                  Lair → Ritual Chamber（p1、种子 11、先侦察 Radiant）
                </option>
                <option value="roomBattle">
                  Lair → Ritual Chamber 可战斗（p1、种子 1885、先侦察 Radiant）
                </option>
                <option value="roomDisease">Maggot 守卫战斗（种子 4，固定房间代币）</option>
                <option value="roomFountain">
                  Healing Fountain（种子10，固定房间代币，完整房间/怪物池）
                </option>
                <option value="roomBeacon">
                  Beacon of Light（种子1，固定房间代币，完整房间/怪物池）
                </option>
                <option value="roomAncestor">
                  Tomb of Ancestor（种子12，固定房间代币，完整房间/怪物池）
                </option>
                <option value="roomAbbey">Old Abbey（种子7，固定房间代币，完整房间/怪物池）</option>
                <option value="roomSpiked">
                  Spiked Pit（种子9，固定房间代币，完整房间/怪物池）
                </option>
                <option value="roomInvocation">
                  Invocation Chamber（种子2，固定房间代币，完整房间/怪物池）
                </option>
                <option value="roomBlocked">
                  Lair → Treasure Chamber（p1、种子35、固定房间代币、先侦察 Radiant）
                </option>
              </select>
            </label>
          </>
        )}
        <svg
          viewBox="0 0 100 92"
          role="img"
          aria-label={`QuestMap p${page} 标注`}
          style={{ width: "100%", maxWidth: 540 }}
        >
          {map.edges.map(([a, b]) => {
            const from = map.nodes.find((n) => n.id === a)!;
            const to = map.nodes.find((n) => n.id === b)!;
            return (
              <line
                key={`${a}-${b}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="#827d72"
                strokeWidth="0.7"
              />
            );
          })}
          {map.nodes.map((n) => {
            const room = preview ? undefined : d.rooms.find((r) => r.id === n.id);
            return (
              <g key={n.id} data-testid={`dungeon-node-${n.id}`}>
                <rect
                  x={n.x - 6}
                  y={n.y - 6}
                  width="12"
                  height="12"
                  rx="1"
                  fill={!preview && d.position === n.id ? "#735629" : "#202523"}
                  stroke="#827d72"
                  strokeWidth="0.5"
                />
                <text x={n.x} y={n.y - 1} textAnchor="middle" fill="#f5e7ce" fontSize="3.5">
                  {n.id}
                  {!preview && d.position === n.id ? " · 队伍" : ""}
                </text>
                <text
                  x={n.x}
                  y={n.y + 3.5}
                  textAnchor="middle"
                  fill="#f5e7ce"
                  fontSize={room?.cleared ? 1.7 : 3}
                >
                  {room
                    ? room.cleared
                      ? "已清理 · 无代币"
                      : room.revealed
                        ? labels[room.kind]
                        : "未揭示"
                    : n.kind === "dot"
                      ? "灰点"
                      : n.kind === "unresolved" ||
                          map.unresolvedMarkers?.some((m) => m.nodeId === n.id)
                        ? "待确认"
                        : n.kind === "start"
                          ? "起点"
                          : "房间槽"}
                </text>
              </g>
            );
          })}
        </svg>
      </section>
      {!preview && (
        <section className="panel">
          <h2>侦察流程</h2>
          {d.mustLeaveRoomId === d.position && (
            <p>第四轮撤退：本房间未清理，须先离开才能再次进入（R25）。</p>
          )}
          <p data-testid="dungeon-pressure">
            {d.heroes
              .map(
                (h) =>
                  `${h.id} 压力 ${h.stress}${h.dead ? (h.wounds === h.life ? "（死门死亡）" : "（心脏病死亡）") : h.resolveCardId ? ` · 意志卡 ${d.resolveCards.find((c) => c.id === h.resolveCardId)?.name}` : ""} · 伤口 ${h.wounds}/${h.life}`,
              )
              .join(" · ")}
          </p>
          <p data-testid="dungeon-bonus">
            下一次探索：每人 {(d.mode === "radiant" ? 1 : 2) - (d.scoutBonus ? 1 : 0)} 骰 · {d.mode}
          </p>
          <p data-testid="dungeon-conditions">
            {d.heroes
              .filter((h) => h.diseaseId || h.quirkIds?.length)
              .map(
                (h) =>
                  `${h.id} · 疾病：${d.conditions?.diseases.find((c) => c.id === h.diseaseId)?.name ?? "无"} · 怪癖：${h.quirkIds?.map((id) => d.conditions?.quirks.find((q) => q.id === id)?.name ?? id).join("、") || "无"}`,
              )
              .join("；") || "疾病 / 怪癖：无"}
          </p>
          <p data-testid="dungeon-trinkets">
            携带饰品：
            {d.trinkets?.held
              .map(
                (h) =>
                  `${h.heroId} · ${d.trinkets!.cards.find((c) => c.id === h.cardId)!.name}（${h.face === "upright" ? "正面" : "反面"}）`,
              )
              .join("；") || "无"}
          </p>
          {!formal && (
            <>
              <button onClick={() => reset("standard")}>重置标准模式</button>{" "}
              <button onClick={() => reset("radiant")}>重置 Radiant</button>
            </>
          )}
          {d.phase === "blockedPressure" && (
            <button onClick={() => dispatch({ type: "resolveDungeonPressure" })}>
              恢复意志检定
            </button>
          )}
          {d.phase === "awaitingRoom" &&
            !d.pending &&
            (currentRoom?.kind === "lair" ||
              currentRoom?.kind === "treasure" ||
              (currentRoom?.kind === "curio" &&
                d.curioRoom?.roomId === d.position &&
                d.curioRoom.stage === "guarded")) &&
            !d.roomCards?.active && (
              <button onClick={() => dispatch({ type: "prepareDungeonBattle" })}>
                抽房间牌并匹配战斗板块
              </button>
            )}
          {d.roomCards?.active &&
            (() => {
              const active = d.roomCards.active;
              const roomCard = d.roomCards.cards.find((c) => c.id === active.cardId)!;
              const selectedTile = readRoomTile(roomCard, active.tileId);
              return (
                <div className="panel" data-testid="dungeon-room-card">
                  <h3>
                    {roomCard.name} · 遗迹 {roomCard.number}
                  </h3>
                  <p>
                    完整遗迹房间牌池 9 张 · 余牌 {d.roomCards.deck!.length} · 已抽 1 张 · 印刷页{" "}
                    {roomCard.source.page}
                  </p>
                  <p>地点与 Boss 分堆；效果栏保留原文和图标 ID，尚未执行。</p>
                  <details>
                    <summary>查看卡面转录（含未解释图标）</summary>
                    {roomCard.printedLines.map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </details>
                  {active.tileId && selectedTile.status === "matched" && (
                    <p>
                      已匹配 {selectedTile.tile.name}（部署已核实），
                      {selectedTile.tile.areas.length} 个区域，英雄部署{" "}
                      {[...new Set(Object.values(selectedTile.deployment.heroes))].join(" / ")}
                      ，怪物部署{" "}
                      {[...new Set(Object.values(selectedTile.deployment.monsters))].join(" / ")}。
                    </p>
                  )}
                  <p role="status">{active.blockedReason}</p>
                  {active.tileId && !d.monsterPool?.active && (
                    <button onClick={() => dispatch({ type: "prepareDungeonMonsters" })}>
                      从完整 42 张怪物池抽牌并记录部署
                    </button>
                  )}
                  {d.monsterPool?.active && (
                    <div data-testid="dungeon-monsters">
                      <button onClick={() => dispatch({ type: "startDungeonBattle" })}>
                        进入房间战斗
                      </button>
                      <p>
                        Common + Ruins I · 完整牌池 42 张 · 余牌 {d.monsterPool.remaining!.length} ·
                        部署 {d.monsterPool.active.monsters.length} · 弃牌{" "}
                        {d.monsterPool.discarded.length}
                      </p>
                      {d.monsterPool.active.monsters.map((m) => (
                        <p key={m.instanceId}>
                          {d.monsterPool!.cards.find((c) => c.combatCardId === m.cardId)!.name} ·{" "}
                          {m.instanceId} ·{" "}
                          {
                            {
                              aggressive: "进攻",
                              defensive: "防御",
                              ranged: "远程",
                              support: "支援",
                            }[m.stance]
                          }{" "}
                          → {m.areaId} · 占 {m.stanceSlots} 格
                        </p>
                      ))}
                      <p>原牌与余牌已保留，等待正式战斗接线。</p>
                    </div>
                  )}
                </div>
              );
            })()}
          {d.phase === "awaitingRoom" &&
            !d.pending &&
            (["trap", "dark"].includes(currentRoom?.kind ?? "") ||
              (currentRoom?.kind === "curio" && d.curioRoom?.roomId !== d.position)) && (
              <button onClick={() => dispatch({ type: "resolveDungeonRoom" })}>
                结算{" "}
                {currentRoom?.kind === "dark"
                  ? "Dark"
                  : currentRoom?.kind === "curio"
                    ? "Curio 守卫骰"
                    : "Trap"}{" "}
                房间
              </button>
            )}
          {d.roomResolution?.roomId === d.position && (
            <p data-testid="dungeon-room-resolution">
              {d.roomResolution.kind === "dark"
                ? "Dark 光照降低已支付"
                : `Trap 已分配：${d.roomResolution.resolvedHeroIds.join("、") || "无"}`}
              {d.roomResolution.completed ? "；全员完成，保留代币" : "；仍需完成房间结算"}
              {d.roomResolution.kind !== "dark" && "；先压力，再对存活英雄结算分配伤口"}
              {d.roomResolution.pendingAllocation &&
                `；${d.roomResolution.pendingAllocation.heroId} 尚待 ${d.roomResolution.pendingAllocation.wounds} 伤口`}
            </p>
          )}
          {d.phase === "awaitingProvisions" && (
            <button
              disabled={!!d.pending}
              onClick={() => dispatch({ type: "rollDungeonProvisions" })}
            >
              掷开局补给骰
            </button>
          )}
          <button
            disabled={!!d.pending || d.phase !== "ready" || d.mustLeaveRoomId === d.position}
            onClick={() => dispatch({ type: "scoutDungeon" })}
          >
            侦察
          </button>{" "}
          <button
            disabled={!!d.pending || d.phase !== "ready"}
            onClick={() => dispatch({ type: "beginDungeonExploration" })}
          >
            选择下一段探索
          </button>{" "}
          <button
            disabled={!!d.pending || d.phase !== "ready"}
            onClick={() => dispatch({ type: "beginDungeonBacktrack" })}
          >
            原路返回
          </button>{" "}
          <button
            disabled={!canLeaveDungeon(game)}
            onClick={() => dispatch({ type: "leaveDungeon" })}
          >
            离开地牢
          </button>{" "}
          <button
            disabled={!canRestDungeon(game)}
            onClick={() => dispatch({ type: "restDungeon" })}
          >
            柴火休息
          </button>
          <p data-testid="dungeon-firewood">
            {quest?.name ?? "任务"} 柴火：
            {d.rest?.used
              ? "已弃置"
              : d.rest
                ? `可用（${restPoints(d.rest.questId)}点）`
                : "无已核实柴火"}
          </p>
          {d.rest && (
            <p className="muted">
              休息时，每名英雄的 Life 和压力按各自分配总量恢复，相关怪癖各触发一次。
            </p>
          )}
          <p className="muted">
            原路返回不掷骰，每条已走过的边全员压力 +1；包含灰点、岔路与起点出入。
          </p>
          {d.phase === "awaitingHazards" && !d.exploration?.rolls && (
            <button
              disabled={!!d.pending}
              onClick={() => dispatch({ type: "rollDungeonExploration" })}
            >
              掷探索骰并开始结算
            </button>
          )}
          <p data-testid="dungeon-provision-count">
            公共补给（{d.explorationSetup!.provisions.length}/16）
          </p>
          <p data-testid="dungeon-status-stacks">
            {d.heroes
              .map(
                (h) =>
                  `${h.id}：${
                    (h.statusStacks ?? h.combat?.statusStacks)
                      ?.map((s) => `${s.kind} ${s.remaining}t`)
                      .join("、") || "无状态"
                  }`,
              )
              .join("；")}
          </p>
          <p data-testid="dungeon-provisions">
            剩余补给：
            {d.explorationSetup!.provisions.map((p) => `${p.id} ${p.face}`).join(" · ") || "无"}
          </p>
          <p data-testid="dungeon-gold">共享金币：{d.gold}</p>
          {quest?.id === "quest:p003" && (
            <p>Fundraiser最低目标：清理一间巢穴；未达目标可提前离开，保留金币并跳过捐献。</p>
          )}
          {(d.phase === "exited" || d.hamletReturn) && (
            <div data-testid="dungeon-quest-summary">
              {d.questSummary ? (
                <p>
                  {d.questSummary.name} ·{" "}
                  {d.questSummary.questId !== "quest:p001" ? "巢穴清理" : "清理"}{" "}
                  {d.questSummary.clearedRoomIds.length} / {quest!.maxRooms} 间 · 每名英雄
                  {d.questSummary.awarded ? "已发" : "待发"} {d.questSummary.xpPerHero} XP · 驿站
                  {d.questSummary.awarded ? "已发" : "待发"} {d.questSummary.stagecoachXp} XP
                  {d.questSummary.questId === "quest:p003" &&
                    (d.questSummary.objectiveMet
                      ? ` · 捐献${d.questSummary.donatedGold}金币`
                      : " · 提前离开，目标未达；跳过捐献")}
                </p>
              ) : (
                <button
                  disabled={!!d.pending}
                  onClick={() => dispatch({ type: "summarizeDungeonQuest" })}
                >
                  生成任务结算摘要
                </button>
              )}
              {d.questSummary && !d.hamletReturn && (
                <button
                  disabled={!!d.pending}
                  onClick={() => dispatch({ type: "beginReturnToHamlet" })}
                >
                  返回村庄
                </button>
              )}
              {d.hamletReturn && (
                <section aria-label="回村步骤" data-testid="hamlet-return">
                  <p>弃牌已洗回 · 状态已移除 · 光照5 · 饰品正置；伤口和压力保留。</p>
                  {d.hamletReturn.phase === "converting" && (
                    <p>按当前姿态顺序转换意志，请完成怪癖选择。</p>
                  )}
                  {d.hamletReturn.phase === "awaitingReplacement" && (
                    <p>有英雄永久死亡，等待驿站替换；XP尚未发放。</p>
                  )}
                  {d.hamletReturn.phase === "provisions" && (
                    <>
                      <p>可在下方使用补给，剩余每颗兑换1金币；完成后发放XP。</p>
                      <button
                        disabled={!!d.pending}
                        onClick={() => dispatch({ type: "finishReturnToHamlet" })}
                      >
                        兑换剩余补给并完成回村
                      </button>
                    </>
                  )}
                  {d.hamletReturn.phase === "complete" && (
                    <>
                      <p>{d.hamlet ? "回村完成，进入村庄准备。" : "回村完成，等待村庄事件。"}</p>
                      {!d.hamlet && (
                        <button onClick={() => dispatch({ type: "drawHamletEvent" })}>
                          抽村庄事件
                        </button>
                      )}
                      <p>
                        驿站累计XP {d.stagecoachXp}；
                        {d.heroes.map((h) => `${h.id} XP ${h.xp}`).join(" · ")}
                      </p>
                      <section aria-label="村庄建筑升级" data-testid="hamlet-buildings">
                        <p>
                          团队共同决定升级，每级 20 金（铁匠、游商马车 10 金），不消耗英雄行动。
                        </p>
                        {upgradableBuildings.map((building) => {
                          const level = recoveryBuildingLevel(d, building);
                          const command = { type: "upgradeHamletBuilding", building } as const;
                          const allowed = !upgradeHamletBuilding(game, command).events.some(
                            (e) => e.type === "commandRefused",
                          );
                          return (
                            <div key={building}>
                              {buildingLabels[building]} {["I", "II", "III"][level - 1]}
                              <button disabled={!allowed} onClick={() => dispatch(command)}>
                                升级{buildingLabels[building]}（
                                {building === "blacksmith" || building === "nomadWagon" ? 10 : 20}{" "}
                                金）
                              </button>
                            </div>
                          );
                        })}
                      </section>
                      <p>铁匠记录下次任务临时技能；游商按建筑等级陈列 I–III 级饰品。</p>
                      {!!d.hamlet?.weekBlockedBuildings?.length && (
                        <p data-testid="hamlet-week-blocked">
                          Labor Force：本次村庄准备期间不可访问
                          {d.hamlet.weekBlockedBuildings
                            .map((b) => buildingLabels[b] ?? b)
                            .join("、")}
                        </p>
                      )}
                      <p data-testid="stagecoach-tokens">
                        驿站等待英雄代币：{stagecoachWaitingTokens(d) ?? "数据无效"} 枚。 升至 II /
                        III 级各增加 1 枚；驿站不可访问，死亡补人流程继续开发。
                      </p>
                      <p data-testid="next-quest-provisions">
                        下次任务奖励补给骰：
                        {d.heroes
                          .map((h) => `${h.id} +${h.nextQuestProvisionDice ?? 0}`)
                          .join(" · ")}
                        。 下一次出征尚未接通；届时实际掷出，含开局补给最多16颗（R-041）。
                      </p>
                      <p data-testid="blacksmith-plan">
                        下次任务铁匠临时技能：
                        {d.heroes
                          .flatMap((hero) =>
                            (hero.nextQuestSkillUpgrades ?? []).map(
                              (u) =>
                                `${hero.id} ${d.battleCatalog?.skills.find((c) => c.id === u.temporarySkillId)?.name ?? u.temporarySkillId} ${d.battleCatalog?.skills.find((c) => c.id === u.temporarySkillId)?.level === 2 ? "II" : "III"}`,
                            ),
                          )
                          .join(" · ") || "无"}
                        。原卡保留，出征使用/归还等待下一任务接入。
                      </p>
                      <p data-testid="guild-skills">
                        公会永久升级：
                        {d.heroes
                          .filter(
                            (hero) =>
                              hero.permanentlyRemovedSkillIds?.length ||
                              (hero.level !== undefined && hero.level > 1),
                          )
                          .map((hero) => {
                            const owned = d.battleCatalog
                              ? ownedHeroSkills(hero, d.battleCatalog)
                              : null;
                            const unequipped = owned
                              ? owned
                                  .filter((s) => !hero.skillIds?.includes(s.id))
                                  .map((s) => `${s.name} ${s.level}`)
                                  .join(" / ")
                              : "";
                            return `${hero.id} HL${hero.level ?? "?"} XP ${hero.xp ?? 0}，永久移除${hero.permanentlyRemovedSkillIds?.length ?? 0}张；装备${heroSkillSlotCount(hero.level ?? 1)}槽 ${hero.skillIds
                              ?.map((id) => {
                                const c = d.battleCatalog?.skills.find((s) => s.id === id);
                                return `${c?.name ?? id} ${c?.level}`;
                              })
                              .join(" / ")}${unequipped ? `；未装备 ${unequipped}` : ""}`;
                          })
                          .join(" · ") || "无"}
                        。出征要求技能槽=2+HL（I–III）。
                      </p>
                      <p data-testid="hamlet-virtues">
                        当前美德：
                        {d.heroes
                          .filter(
                            (h) =>
                              d.resolveCards.find((c) => c.id === h.resolveCardId)?.role ===
                              "virtue",
                          )
                          .map(
                            (h) =>
                              `${h.id} ${d.resolveCards.find((c) => c.id === h.resolveCardId)!.name}`,
                          )
                          .join(" · ") || "无"}
                        。持有美德后，下次压力到10直接死亡（R28/R34）。
                      </p>
                    </>
                  )}
                </section>
              )}
              {d.hamlet && (
                <section aria-label="村庄事件" data-testid="hamlet-event">
                  {d.trinkets?.display !== undefined && (
                    <p data-testid="nomad-display">
                      游商陈列：
                      {d.trinkets.display
                        .map((id) => {
                          const card = d.trinkets!.cards.find((c) => c.id === id)!;
                          return `${card.name} ${["I", "II", "III"][card.level - 1]}${card.verification.unverified ? "（待核实，暂不可购买）" : `（${2 + 2 * card.level} 金）`}`;
                        })
                        .join(" · ") || "已售空，不补货"}
                    </p>
                  )}
                  <h3>{hamletCard!.name}</h3>
                  <p>
                    卡面准备天数：{hamletCard!.days ?? "0或3，须先完成事件选择"} · 村庄事件牌堆{" "}
                    {d.hamlet.deck.length} 张（核心池16张，永久移出{" "}
                    {d.hamlet.permanentlyRemoved.length} 张）
                  </p>
                  <p>
                    {hamletCard!.runtime === "townFair"
                      ? "每名英雄：压力 −3，治疗 2 × 自身英雄等级；相关怪癖修正照常生效。"
                      : hamletCard!.effectLines
                          .map((line) => line.replace(/\{icon:[a-f0-9]+\}/g, "［待核对图标］"))
                          .join(" ") || "本周没有额外事件效果。"}
                  </p>
                  {d.hamlet.phase === "eventBlocked" && (
                    <p>
                      {d.pending?.id.startsWith("hamlet-medical:")
                        ? "请在下方选择一名英雄移除疾病；结算后开始三天准备。"
                        : d.pending?.id.startsWith("hamlet-caregivers:")
                          ? "请逐个英雄选择免费移除一张怪癖，或放弃；全部结算后开始两天准备。"
                          : d.pending?.id.startsWith("hamlet-labor-force:")
                            ? "请选择免费升级一栋建筑，或放弃；事件永久移出后开始三天准备。"
                            : d.pending
                              ? d.pending.prompt
                              : "本事件效果尚未接通，保留原卡；准备天数与看守人尚未开始。"}
                    </p>
                  )}
                  {d.hamlet.phase === "awaitingCaretaker" && (
                    <button onClick={() => dispatch({ type: "rollHamletCaretaker" })}>
                      {d.hamlet.day === 1 ? "开始首日看守人" : `开始第 ${d.hamlet.day} 天看守人`}
                    </button>
                  )}
                  {d.hamlet.phase === "heroActions" && (
                    <>
                      <p>
                        准备 {d.hamlet.preparationDays} 天 · 当前第 {d.hamlet.day} 天 · 剩余{" "}
                        {d.hamlet.remainingDays ?? d.hamlet.preparationDays} 天
                      </p>
                      <p>
                        看守人：
                        {d.hamlet.caretaker
                          ? buildingLabels[d.hamlet.caretaker]
                          : d.hamlet.noCaretaker
                            ? "Busy Week，本周不放置"
                            : "已被移出，当天不再占用"}
                        ；封锁建筑：
                        {d.hamlet.blockedBuildings.map((id) => buildingLabels[id]).join("、") ||
                          "无"}
                      </p>
                      <p>
                        当前行动英雄：
                        {
                          d.battleCatalog?.heroStats.find(
                            (stat) => stat.id === currentHamletHero(game)?.heroStatId,
                          )?.name
                        }
                      </p>
                      <p>
                        当天已访问：
                        {d.hamlet.visitedBuildings?.map((id) => buildingLabels[id]).join("、") ||
                          "无"}
                      </p>
                      <div aria-label="村庄行动">
                        {currentHamletHero(game) &&
                          !visitGuild(game, currentHamletHero(game)!.id).events.some(
                            (e) => e.type === "commandRefused",
                          ) && (
                            <button
                              onClick={() =>
                                dispatch({
                                  type: "visitGuild",
                                  actorId: currentHamletHero(game)!.id,
                                })
                              }
                            >
                              访问公会：永久升级英雄/技能
                            </button>
                          )}
                        {d.heroes.map((hero) => {
                          const owned =
                            d.battleCatalog && !d.pending
                              ? ownedHeroSkills(hero, d.battleCatalog)
                              : null;
                          if (!owned || !hero.level || !hero.id) return null;
                          const slots = heroSkillSlotCount(hero.level);
                          const candidate = [
                            ...(hero.skillIds ?? []),
                            ...owned.filter((s) => !hero.skillIds?.includes(s.id)).map((s) => s.id),
                          ].slice(0, slots);
                          if (
                            candidate.length !== slots ||
                            (hero.skillIds?.length === slots &&
                              hero.skillIds.every((id, i) => id === candidate[i]))
                          )
                            return null;
                          const probe = setEquippedSkills(game, {
                            type: "setEquippedSkills",
                            actorId: hero.id,
                            skillIds: candidate,
                          });
                          if (probe.events.some((e) => e.type === "commandRefused")) return null;
                          return (
                            <button
                              key={`loadout-${hero.id}`}
                              data-testid={`set-skills-${hero.id}`}
                              onClick={() =>
                                dispatch({
                                  type: "setEquippedSkills",
                                  actorId: hero.id,
                                  skillIds: candidate,
                                })
                              }
                            >
                              {hero.id}装满{slots}个技能槽
                            </button>
                          );
                        })}
                        {currentHamletHero(game) &&
                          !visitNomadWagon(game, currentHamletHero(game)!.id).events.some(
                            (e) => e.type === "commandRefused",
                          ) && (
                            <button
                              onClick={() =>
                                dispatch({
                                  type: "visitNomadWagon",
                                  actorId: currentHamletHero(game)!.id,
                                })
                              }
                            >
                              访问游商马车
                              {["I", "II", "III"][(d.buildingLevels?.nomadWagon ?? 1) - 1]}
                              ：陈列与购买饰品
                            </button>
                          )}
                        {blacksmithOptions(game).map((option) => (
                          <button
                            key={option.command.skillId}
                            disabled={
                              d.gold < 1 ||
                              d.hamlet?.blockedBuildings.includes("blacksmith") ||
                              d.hamlet?.visitedBuildings?.includes("blacksmith")
                            }
                            onClick={() => dispatch(option.command)}
                          >
                            {option.label}
                          </button>
                        ))}
                        {hamletActionOptions(game).map((option) => (
                          <button
                            key={JSON.stringify(option.command)}
                            onClick={() => dispatch(option.command)}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                      <p>
                        已开放修道院、酒馆、疗养院、生存专家、墓地、铁匠及公会技能升级服务及 Sharpen
                        Spear / Intimidate / Zealous Speech / Pray /
                        Chant。其他服务与村庄技能继续开发。
                      </p>
                    </>
                  )}
                  {d.hamlet.phase === "preparationComplete" && (
                    <>
                      <p>
                        准备天数已用完。可抽取下一任务（至多两张选一，未选永久弃置）；出征时应用铁匠临时技能并在开局掷奖励补给骰。战役等级{" "}
                        {d.campaignLevel ?? 1}。正式升幕仍待 Boss 胜利与新威胁流程接通。
                      </p>
                      {!formal && (d.campaignLevel ?? 1) === 1 && (
                        <button
                          data-testid="advance-campaign-level"
                          onClick={() => dispatch({ type: "advanceCampaignLevel" })}
                        >
                          沙盒预览 I→II（跳过未实现的 Boss，不支持正式存档）
                        </button>
                      )}
                      <button
                        data-testid="offer-next-quest"
                        onClick={() => dispatch({ type: "offerNextQuest" })}
                      >
                        抽取下一任务
                      </button>
                    </>
                  )}
                </section>
              )}
            </div>
          )}
          <fieldset>
            <legend>探索间补给</legend>
            <label>
              补给接收英雄
              <select
                aria-label="探索补给接收英雄"
                value={provisionTarget}
                onChange={(e) => setProvisionTarget(e.target.value)}
              >
                {d.heroes
                  .filter((h) => !h.dead)
                  .map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.id}
                    </option>
                  ))}
              </select>
            </label>
            {d
              .explorationSetup!.provisions.filter((p) => p.face !== "torch")
              .flatMap((p) =>
                PROVISION_EFFECTS[p.face].map((effect) => (
                  <button
                    key={`${p.id}:${effect}`}
                    disabled={!dungeonProvisionWindow(d)}
                    onClick={() =>
                      dispatch({
                        type: "useProvision",
                        provisionId: p.id,
                        targetId: provisionTarget,
                        effect,
                      })
                    }
                  >
                    {provisionLabels[p.face]}（{p.id}）：{provisionEffectLabels[effect]}
                  </button>
                )),
              )}
          </fieldset>
          {d.explorationSetup!.light < 5 &&
            d
              .explorationSetup!.provisions.filter((p) => p.face === "torch")
              .map((p) => (
                <button
                  key={p.id}
                  disabled={!dungeonProvisionWindow(d)}
                  onClick={() =>
                    dispatch({
                      type: "useProvision",
                      provisionId: p.id,
                      targetId: d.heroes.find((h) => !h.dead)!.id,
                      effect: "raiseLight",
                    })
                  }
                >
                  使用 Torch（{p.id}）：光照 +1
                </button>
              ))}
          {card && shownCurio && (
            <div className="panel" data-testid="dungeon-curio">
              <h3>
                Curio · {card.name} · p{card.source.page}
              </h3>
              <p>{card.text}</p>
              <p>
                按卡面行序结算，新疾病／怪癖影响后续行；死亡取消剩余效果和未发奖励。行间使用 Torch
                只改变光照。
              </p>
              <p>
                {shownCurio.heroId || "等待选择处理英雄"} · 抽卡前{" "}
                {shownCurio.protected ? "已使用 Torch" : "未使用 Torch"} · 牌池剩余{" "}
                {d.curio!.deck?.length ?? 24} · 弃牌 {d.curio!.discard.length}
              </p>
              <ul>
                {card.rows.map((r, i) => (
                  <li key={i}>
                    {r.effect
                      ? `${curioEffectLabel(r.effect)}${shownCurio.protected && isNegativeCurioEffect(r.effect) ? " · Torch 保护" : ""}`
                      : `${r.printed} · 待确认（${r.reason}）`}
                  </li>
                ))}
              </ul>
              {d.phase === "awaitingCurio" && (
                <button
                  disabled={!!d.pending}
                  onClick={() => dispatch({ type: "resolveDungeonCurio" })}
                >
                  结算当前 Curio
                </button>
              )}
              {d.curio!.active?.blockedReason && (
                <p role="status">{d.curio!.active.blockedReason}</p>
              )}
            </div>
          )}
          {d.exploration?.rolls && (
            <p data-testid="dungeon-rolls">
              {d.exploration.rolls
                .map((r) => `${r.id} ${r.face}${r.resolved ? "（已结算）" : "（待结算）"}`)
                .join(" · ")}
            </p>
          )}
          {d.pending && (
            <div>
              <p>{d.pending.prompt}</p>
              {d.pending.id.startsWith("dungeon-fundraiser:") ? (
                <FundraiserChoice
                  key={d.pending.id}
                  choice={d.pending}
                  choose={(optionId) =>
                    dispatch({ type: "resolveChoice", choiceId: d.pending!.id, optionId })
                  }
                />
              ) : (
                d.pending.options.map((o) => (
                  <button
                    key={o.id}
                    onClick={() =>
                      dispatch({ type: "resolveChoice", choiceId: d.pending!.id, optionId: o.id })
                    }
                  >
                    {o.label}
                  </button>
                ))
              )}
            </div>
          )}
          <p data-testid="dungeon-checkpoint">
            {d.hamletReturn
              ? d.hamletReturn.phase === "complete"
                ? d.hamlet?.phase === "preparationComplete"
                  ? "村庄准备完成；可抽取下一任务"
                  : d.hamlet
                    ? "村庄准备进行中"
                    : "回村完成；等待村庄事件"
                : "回村步骤进行中；探索已经结束"
              : d.phase === "exited"
                ? `已从 ${d.position} 离开地牢；金币与英雄状态已保留，等待任务 XP / 回村接口`
                : d.phase === "ready" && d.mustLeaveRoomId === d.position
                  ? `已撤退到 ${d.position} 地图节点；房间未清理，必须离开`
                  : d.phase === "awaitingCurio"
                    ? `Curio 待结算；${d.curio?.active?.roomId ? "队伍已在房间" : "队伍尚未移动"}，不能补用 Torch 或重抽`
                    : d.phase === "awaitingReplacement"
                      ? `英雄死亡：等待驿站替换接口，${d.pressureSource === "room" ? `队伍已在 ${d.position}` : "队伍尚未移动"}`
                      : d.phase === "blockedPressure"
                        ? `压力已支付：意志卡数据待核实，${d.pressureSource === "room" ? `队伍已在 ${d.position}` : "队伍尚未移动"}`
                        : d.phase === "awaitingRoom"
                          ? `进入 ${d.position}：等待${d.roomCards?.active ? "守卫战斗准备完成；原牌已记录，房间未清理" : currentRoom?.kind === "trap" ? " Trap 分配，保留代币" : currentRoom?.kind === "dark" ? " Dark 降光，保留代币" : "非 Empty 房间效果"}`
                          : d.phase === "ready" && (d.exploration || (d.visited?.length ?? 0) > 1)
                            ? `已到达 ${d.position}；${currentRoom?.cleared ? (currentRoom.kind === "empty" ? "Empty 已清理，移除房间代币" : "已清理，移除房间代币") : currentRoom?.kind === "trap" ? "Trap 已结算，保留代币" : currentRoom?.kind === "dark" ? "Dark 已结算，保留代币" : "灰点必须停留"}`
                            : d.exploration
                              ? `${d.exploration.from} → ${d.exploration.to} · 每人 ${d.exploration.dicePerHero} 骰 · 等待危险结算，队伍尚未移动`
                              : "等待侦察 / 路线选择"}
          </p>
          <p data-testid="dungeon-events">
            {events
              .map((e) =>
                e.type === "resolveTested"
                  ? `${e.entityId}：d10 ${e.roll}，${d.resolveCards.find((c) => c.id === e.cardId)?.name}，压力归零`
                  : e.message,
              )
              .join("；")}
          </p>
          <p className="muted">
            命令 {commands.length} · 布置 RNG 游标 {d.cursor} · 探索按当前光照结算
          </p>
        </section>
      )}
    </main>
  );
}

const coreNames = ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"];
const taskSources: CoreQuestSources = {
  catalog: {
    ...battleData,
    trinkets: createTrinketPool(normalizedTrinketFileSchema.parse(rawTrinkets).cards, 1),
  },
  resolveCards: battleData.resolveCards,
  curios: curios,
  rooms: roomFileSchema.parse(rawRooms).cards,
  monsters: monsterPoolFileSchema.parse(rawMonsterPool).cards,
};
export function DungeonQuest() {
  const beginTask = useDungeonStore((s) => s.beginTask);
  const [started, setStarted] = useState(false),
    [questId, setQuestId] = useState<BasicQuestId>("quest:p001"),
    [mode, setMode] = useState<DungeonState["mode"]>("standard"),
    [seed, setSeed] = useState("1"),
    [error, setError] = useState("");
  const [party, setParty] = useState<QuestParty>(() =>
    coreNames.map((name, index) => ({
      heroStatId: battleData.heroStats.find((s) => s.name === name && s.level === 1)!.id,
      stance: (["aggressive", "defensive", "ranged", "support"] as const)[index]!,
      skillIds: battleData.skills
        .filter((s) => s.hero === name && s.level === 1)
        .slice(0, 3)
        .map((s) => s.id),
    })),
  );
  if (started) return <DungeonSandbox formal />;
  const startQuests = basicQuests.filter((q) => q.level === 1);
  const selectedQuest = startQuests.find((q) => q.id === questId) ?? startQuests[0]!;
  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">DDBG · PHASE 3</p>
          <h1>开始地牢任务</h1>
          <p>四名核心英雄 · I级遗迹 · 单设备1–4人轮流操作</p>
          <a href="/">返回战斗沙盒</a>
        </div>
      </header>
      <section className="panel">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            try {
              const game = createCoreDungeonQuest(
                Number(seed),
                selectedQuest.id,
                mode,
                party,
                taskSources,
              );
              beginTask(game, {
                seed: Number(seed),
                questId: selectedQuest.id,
                mode,
                party: party.map((hero) => ({ ...hero, skillIds: [...hero.skillIds] })),
              });
              setStarted(true);
            } catch (error) {
              setError(error instanceof Error ? error.message : String(error));
            }
          }}
        >
          <label>
            任务卡
            <select
              aria-label="任务卡"
              value={selectedQuest.id}
              onChange={(e) => setQuestId(e.target.value as BasicQuestId)}
            >
              {startQuests.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            模式
            <select
              aria-label="任务模式"
              value={mode}
              onChange={(e) => setMode(e.target.value as DungeonState["mode"])}
            >
              <option value="standard">标准模式</option>
              <option value="radiant">Radiant</option>
            </select>
          </label>
          <label>
            种子
            <input
              aria-label="任务种子"
              type="number"
              min="0"
              max="4294967295"
              step="1"
              required
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
            />
          </label>
          <p>
            QuestMap FRONT
            p1（已批准）。从起点S开始，房间代币按任务随机分布，先领取八颗开局补给。普通遗迹全部九面已接通。
          </p>
          <p>
            柴火休息 {selectedQuest.restPoints} 点。
            {selectedQuest.xpKind === "gold"
              ? "清理至少一间巢穴后，可每捐献20金币获得1XP，最多捐献60金币、获得3XP。"
              : `每清理${selectedQuest.roomsPerXp}${selectedQuest.xpKind === "lair" ? "间巢穴" : "个房间"}获得1XP，最多${selectedQuest.maxRooms / selectedQuest.roomsPerXp}XP。`}
            任务结算仅记待发XP，回村发放。
          </p>
          {party.map((hero, index) => (
            <fieldset key={hero.heroStatId}>
              <legend>
                {coreNames[index]} ·{" "}
                {
                  { aggressive: "进攻", defensive: "防御", ranged: "远程", support: "支援" }[
                    hero.stance
                  ]
                }
              </legend>
              {hero.skillIds.map((id, slot) => (
                <label key={slot}>
                  起始技能 {slot + 1}
                  <select
                    aria-label={`${coreNames[index]} 技能 ${slot + 1}`}
                    value={id}
                    onChange={(e) =>
                      setParty(
                        party.map((h, i) =>
                          i !== index
                            ? h
                            : {
                                ...h,
                                skillIds: h.skillIds.map((s, j) =>
                                  j === slot ? e.target.value : s,
                                ),
                              },
                        ),
                      )
                    }
                  >
                    {battleData.skills
                      .filter((s) => s.hero === coreNames[index] && s.level === 1)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                </label>
              ))}
            </fieldset>
          ))}
          {error && <p role="alert">{error}</p>}
          <button type="submit">进入地牢</button>
        </form>
      </section>
      <QuestSaveControls onLoad={() => setStarted(true)} />
    </main>
  );
}
