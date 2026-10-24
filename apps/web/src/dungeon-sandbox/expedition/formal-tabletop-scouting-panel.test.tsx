import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { GameState } from "@ddbg/engine";
import { FormalTabletopScoutingPanel } from "./formal-tabletop-scouting-panel";

function curioGame(overrides: { activeCurioId?: string; lastCurioId?: string }): GameState {
  return {
    seed: 1,
    notes: [],
    dungeon: {
      phase: "ready",
      mode: "standard",
      position: "n1",
      cursor: 0,
      gold: 10,
      heroes: [
        {
          id: "hero-0",
          stress: 0,
          wounds: 0,
          life: 10,
          dead: false,
          stance: "aggressive",
        },
      ],
      rooms: [{ id: "n1", kind: "curio", revealed: true, cleared: false }],
      layout: { id: "quest_map:scout_ahead", nodes: [], edges: [] },
      explorationSetup: { provisions: [], light: 5 },
      resolveCards: [],
      questDistribution: { questId: "quest:p001" },
      curio: {
        cards: [
          {
            id: "curio:iron_maiden",
            name: "Iron Maiden",
            text: "Long curio text",
            source: { page: 1 },
            rows: [],
          },
          {
            id: "curio:other",
            name: "Other Curio",
            text: "Other",
            source: { page: 2 },
            rows: [],
          },
        ],
        deck: [],
        discard: [],
        active: overrides.activeCurioId
          ? {
              cardId: overrides.activeCurioId,
              heroId: "hero-0",
              protected: false,
            }
          : undefined,
        last: overrides.lastCurioId
          ? {
              cardId: overrides.lastCurioId,
              heroId: "hero-0",
              protected: false,
            }
          : undefined,
      },
    },
  } as unknown as GameState;
}

describe("FormalTabletopScoutingPanel", () => {
  it("renders active curio in decisions and last curio only in archive", () => {
    const html = renderToStaticMarkup(
      <FormalTabletopScoutingPanel
        game={curioGame({
          activeCurioId: "curio:other",
          lastCurioId: "curio:iron_maiden",
        })}
        dispatch={() => ({})}
        events={[]}
        commands={[]}
        pendingChoice={null}
      />,
    );
    const decisions =
      html
        .split('data-testid="dungeon-exploration-decisions"')[1]
        ?.split('data-testid="dungeon-exploration-commands"')[0] ?? "";
    expect(decisions).toContain('data-testid="dungeon-curio"');
    expect(decisions).toContain("Other Curio");
    expect(decisions).not.toContain("Iron Maiden");
    expect(html).toContain('data-testid="dungeon-curio-settled"');
    expect(html).toContain("Iron Maiden");
  });

  it("omits active curio block when only last remains", () => {
    const html = renderToStaticMarkup(
      <FormalTabletopScoutingPanel
        game={curioGame({ lastCurioId: "curio:iron_maiden" })}
        dispatch={() => ({})}
        events={[]}
        commands={[]}
        pendingChoice={null}
      />,
    );
    expect(html).not.toContain('data-testid="dungeon-curio"');
    expect(html).toContain('data-testid="dungeon-curio-settled"');
  });
});
