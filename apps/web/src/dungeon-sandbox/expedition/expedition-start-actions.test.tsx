import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { applyCommand, createCoreDungeonQuest, createQuestSave, loadQuestSave } from "@ddbg/engine";
import type { Command } from "@ddbg/engine";
import {
  coreParty,
  coreQuestSources,
} from "../../../../../packages/engine/src/test-helpers/core-quest";
import { ExpeditionStartActions } from "./expedition-start-actions";
import { needsInitialThreat } from "../initial-threat";
const initial = (seed = 1) =>
  createCoreDungeonQuest(seed, "quest:p001", "radiant", coreParty, coreQuestSources);
const render = (game = initial(), formal = true, pending = false) =>
  renderToStaticMarkup(
    <ExpeditionStartActions
      dungeon={game.dungeon!}
      formal={formal}
      pending={pending}
      dispatch={() => {}}
    />,
  );
it("new formal campaigns must establish threat before the provision button is enabled", () => {
  const game = initial(),
    html = render(game);
  expect(needsInitialThreat(game.dungeon!)).toBe(true);
  expect(html).toContain("抽取迫近威胁");
  expect(html).toMatch(/<button disabled="">掷开局补给骰/);
  expect(render(game, false)).not.toContain("抽取迫近威胁");
  expect(render(game, false)).not.toContain("disabled");
  expect(render(game, true, true)).toMatch(/<button disabled="">抽取迫近威胁/);
});
it("all four initial bosses show a stable result and strictly restore before and during provisions", () => {
  const seen = new Set<string>();
  for (let seed = 0; seed < 32 && seen.size < 4; seed++) {
    const base = initial(seed),
      cmd: Command = { type: "establishImminentThreat", allTrinkets: true };
    const result = applyCommand(base, cmd),
      d = result.state.dungeon!;
    if (seen.has(d.activeBossThreatScriptId!)) continue;
    seen.add(d.activeBossThreatScriptId!);
    const html = render(result.state);
    expect(html).toContain('data-testid="initial-threat-result"');
    expect(html).not.toContain("抽取迫近威胁");
    expect(html).not.toContain("disabled");
    const start = {
      seed,
      questId: "quest:p001" as const,
      mode: "radiant" as const,
      party: coreParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
    };
    const saved = createQuestSave(start, [cmd], result.state, coreQuestSources);
    const restored = loadQuestSave(JSON.parse(JSON.stringify(saved)), coreQuestSources);
    expect(render(restored.game)).toBe(html);
    expect(applyCommand(restored.game, cmd).state).toBe(restored.game);
    const roll: Command = { type: "rollDungeonProvisions", allTrinkets: true };
    const rolled = applyCommand(restored.game, roll);
    expect(rolled).toEqual(applyCommand(result.state, roll));
    const provisionSave = createQuestSave(start, [cmd, roll], rolled.state, coreQuestSources);
    expect(loadQuestSave(provisionSave, coreQuestSources).game).toEqual(rolled.state);
  }
  expect(seen.size).toBe(4);
}, 30000);
it("old provision rolls, higher acts, Darkest and returning campaigns do not acquire a new threat", () => {
  const game = initial(),
    d = game.dungeon!;
  const old = applyCommand(game, { type: "rollDungeonProvisions" }).state;
  expect(needsInitialThreat(old.dungeon!)).toBe(false);
  for (const patch of [
    { campaignLevel: 2 as const },
    { questDistribution: { ...d.questDistribution!, questId: "quest:p016" as const } },
    { discardedQuests: ["quest:p002"] },
    { imminentThreatDescriptionCardId: "boss_ability:p001" },
  ])
    expect(needsInitialThreat({ ...d, ...patch })).toBe(false);
});
