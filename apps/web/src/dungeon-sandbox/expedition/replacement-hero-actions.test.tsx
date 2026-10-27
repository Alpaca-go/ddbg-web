import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { GameState } from "@ddbg/engine";
import { ReplacementHeroActions, replacementHeroActionsVisible } from "./replacement-hero-actions";

function awaitingReplacementGame(): GameState {
  return {
    seed: 1,
    notes: [],
    dungeon: {
      phase: "awaitingReplacement",
      mode: "standard",
      position: "A",
      cursor: 0,
      gold: 0,
      heroes: [
        {
          id: "hero-0",
          stress: 0,
          wounds: 10,
          life: 10,
          dead: true,
          stance: "aggressive",
        },
        {
          id: "hero-1",
          stress: 0,
          wounds: 0,
          life: 10,
          dead: false,
          stance: "defensive",
        },
        {
          id: "hero-2",
          stress: 0,
          wounds: 0,
          life: 10,
          dead: false,
          stance: "ranged",
        },
        {
          id: "hero-3",
          stress: 0,
          wounds: 0,
          life: 10,
          dead: false,
          stance: "support",
        },
      ],
      rooms: [],
      layout: { id: "quest_map:scout_ahead", nodes: [], edges: [] },
      explorationSetup: { provisions: [], light: 5 },
      resolveCards: [],
      questDistribution: { questId: "quest:p001" },
      replacementResume: "exploration",
      waitingHeroTokens: 2,
    },
  } as unknown as GameState;
}

describe("ReplacementHeroActions", () => {
  it("shows prepare when a dead hero lacks a prepared replacement", () => {
    const d = awaitingReplacementGame().dungeon!;
    expect(replacementHeroActionsVisible(d)).toBe(true);
    const html = renderToStaticMarkup(
      <ReplacementHeroActions game={awaitingReplacementGame()} dispatch={() => ({})} />,
    );
    expect(html).toContain('data-testid="replacement-hero-actions"');
    expect(html).toContain("准备驿站替补");
    expect(html).not.toContain("让1名替补入队并继续");
  });

  it("shows join when every dead hero has a prepared replacement", () => {
    const base = awaitingReplacementGame();
    const game: GameState = {
      ...base,
      dungeon: {
        ...base.dungeon!,
        preparedReplacements: [
          {
            deadHeroId: "hero-0",
            hero: {
              id: "hero-repl-0",
              heroStatId: "hero_stat:p006:front",
              attributesVerified: true,
              level: 1,
              heroLevel: 1,
              life: 10,
              stress: 0,
              wounds: 0,
              dead: false,
              stance: "aggressive",
              skillIds: [],
            },
          },
        ],
      },
    };
    const html = renderToStaticMarkup(
      <ReplacementHeroActions game={game} dispatch={() => ({})} />,
    );
    expect(html).toContain("让1名替补入队并继续");
  });
});
