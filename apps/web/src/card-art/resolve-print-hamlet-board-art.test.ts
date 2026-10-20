import { describe, expect, it } from "vitest";
import printMap from "./hamlet-board-print-art-map.json";
import {
  cachedPrintHamletBoardUrl,
  hamletBoardArtMapMeta,
  lookupHamletBoardArt,
} from "./resolve-print-hamlet-board-art";

describe("print hamlet board art map", () => {
  it("maps HB front TrimBox geometry", () => {
    const meta = hamletBoardArtMapMeta();
    expect(meta.schema).toBe("ddbg.print-hamlet-board-art-map.v1");
    expect(meta.trimBoxPt).toMatchObject({
      widthPt: 841.89,
      heightPt: 476.22,
      x0Pt: 56.69,
      y0Pt: 56.69,
    });
    const board = lookupHamletBoardArt();
    expect(board.id).toBe("hamlet_board:p001");
    expect(board.printPage).toBe(1);
    expect(board.cropMethod).toBe("trimbox");
    expect(board.primaryPdf).toContain("BOARD_Hamlet_FRONT");
    expect(cachedPrintHamletBoardUrl(board)).toBe(`/print-card-art/${board.pngRel}`);
    expect(printMap.board.pngRel).toBe("png/hamlet-board-front.png");
  });
});
