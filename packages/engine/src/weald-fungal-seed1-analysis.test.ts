import { expect, it } from "vitest";
import { applyCommand, type Command } from "./command";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { fungalResearchThreeObjectives } from "./test-helpers/fungal-research-three-objectives";
import { disinfectionSources as sources } from "./test-helpers/disinfection-quest";
function plain(command: Command) {
  const {
    allTrinkets,
    bossEdgeRooms,
    toxicMushrooms,
    wealdUnprepared,
    wealdPrecious,
    wealdAbyssalPuff,
    wealdOurs,
    wealdClearingHeroes,
    wealdClearingMonsters,
    ...rest
  } = command as Command & Record<string, unknown>;
  void [
    allTrinkets,
    bossEdgeRooms,
    toxicMushrooms,
    wealdUnprepared,
    wealdPrecious,
    wealdAbyssalPuff,
    wealdOurs,
    wealdClearingHeroes,
    wealdClearingMonsters,
  ];
  return rest;
}
function trace(journey: ReturnType<typeof fungalResearchThreeObjectives>) {
  let game = journey.run.initial;
  const rows = [];
  const deaths = [];
  for (const [index, command] of journey.run.commands.entries()) {
    const before = game;
    const r = applyCommand(game, command);
    expect(r.events.some((e) => e.type === "commandRefused")).toBe(false);
    game = r.state;
    const b = game.battle;
    const newlyDead =
      b?.entities.filter(
        (e) =>
          e.side === "hero" && e.dead && !before.battle?.entities.find((p) => p.id === e.id)?.dead,
      ) ?? [];
    for (const hero of newlyDead)
      deaths.push({
        commandNumber: index + 1,
        command: command.type,
        hero: hero.id,
        room: game.dungeon?.position,
        card: game.dungeon?.roomCards?.active?.cardId,
        round: b?.encounter?.round,
      });
    rows.push({
      before,
      game,
      events: r.events,
      digest: JSON.stringify({
        cursor: b?.rngCursor ?? game.dungeon?.cursor,
        turn: b?.encounter?.turn,
        entities: b?.entities.map((e) => ({
          id: e.id,
          area: e.areaId,
          stance: e.stance,
          wounds: e.wounds,
          stress: e.stress,
          dead: e.dead,
          status: e.statusStacks ?? [],
        })),
      }),
    });
  }
  expect(game).toEqual(journey.run.state);
  return { rows, deaths };
}
it("Fungal Research seed1：首处分歧为真实 Abyssal Puff，控制前缀与死亡路径可恢复", () => {
  const legacy = fungalResearchThreeObjectives(sources);
  const current = fungalResearchThreeObjectives(sources, true);
  const old = trace(legacy),
    now = trace(current);
  const first = now.rows.findIndex((row, i) => row.digest !== old.rows[i]?.digest);
  expect(first).toBe(183);
  expect(current.run.commands.slice(0, first + 1).map(plain)).toEqual(
    legacy.run.commands.slice(0, first + 1).map(plain),
  );
  const row = now.rows[first]!,
    before = row.before.battle!,
    after = row.game.battle!;
  expect(row.events).toContainEqual(
    expect.objectContaining({ type: "passiveTriggered", trigger: "abyssalPuff" }),
  );
  const affected = after.entities.filter(
    (e) =>
      e.side === "monster" &&
      !e.necroticFungus &&
      !e.dead &&
      JSON.stringify(e.statusStacks) !==
        JSON.stringify(before.entities.find((p) => p.id === e.id)?.statusStacks),
  );
  expect(affected.length).toBeGreaterThan(0);
  for (const e of affected) expect(e.statusStacks).toContainEqual({ kind: "buff", remaining: 2 });
  expect(after.rngCursor).toBe(old.rows[first]!.game.battle!.rngCursor);
  // 控制重放仅去掉 Puff 开战标记，保留其余当前版本与相同公开命令前缀。
  const controlCommands = current.run.commands.slice(0, first + 1).map((c) => {
    if (c.type !== "startBattle") return c;
    const { wealdAbyssalPuff, ...rest } = c;
    void wealdAbyssalPuff;
    return rest;
  });
  const control = controlCommands.reduce((game, c) => {
    const r = applyCommand(game, c);
    expect(r.events.some((e) => e.type === "commandRefused")).toBe(false);
    return r.state;
  }, current.run.initial);
  expect(control.battle!.entities).toEqual(old.rows[first]!.game.battle!.entities);
  for (const [game, commands] of [
    [row.before, current.run.commands.slice(0, first)],
    [row.game, current.run.commands.slice(0, first + 1)],
    [control, controlCommands],
  ] as const) {
    const save = createQuestSave(current.start, [...commands], game, sources);
    expect(loadQuestSave(JSON.parse(JSON.stringify(save)), sources).game).toEqual(game);
  }
  const cursorFirst = now.rows.findIndex(
    (r, i) =>
      (r.game.battle?.rngCursor ?? r.game.dungeon?.cursor) !==
      (old.rows[i]?.game.battle?.rngCursor ?? old.rows[i]?.game.dungeon?.cursor),
  );
  const commandFirst = current.run.commands.findIndex(
    (c, i) => JSON.stringify(plain(c)) !== JSON.stringify(plain(legacy.run.commands[i]!)),
  );
  expect({
    firstCommandNumber: first + 1,
    command: plain(current.run.commands[first]!),
    room: row.game.dungeon!.position,
    card: row.game.dungeon!.roomCards!.active!.cardId,
    affected: affected.map((e) => ({ id: e.id, area: e.areaId, card: e.monsterCardId })),
    firstCursorDifference: cursorFirst + 1,
    cursorCommand: plain(current.run.commands[cursorFirst]!),
    oldCursorEvents: old.rows[cursorFirst]!.events.map((e) => ({
      type: e.type,
      message: e.message,
    })),
    currentCursorEvents: now.rows[cursorFirst]!.events.map((e) => ({
      type: e.type,
      message: e.message,
    })),
    firstCommandDifference: commandFirst + 1,
    oldCommand: plain(legacy.run.commands[commandFirst]!),
    newCommand: plain(current.run.commands[commandFirst]!),
    legacyDeaths: old.deaths,
    currentDeaths: now.deaths,
  }).toMatchSnapshot();
  expect(legacy.run.stopReason).toBeNull();
  expect(current.run.stopReason).toBe("battle halted: heroesDefeated");
}, 180000);
