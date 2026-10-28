import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import printMap from "./player-aid-print-art-map.json";
import {
  PROVISION_PLAYER_AID_ID,
  cachedPrintPlayerAidUrl,
  lookupPrintPlayerAidFace,
  lookupProvisionPlayerAidFront,
  printPlayerAidArtMapMeta,
} from "./resolve-print-player-aid-art";

const rawAid = JSON.parse(
  readFileSync(
    resolve(import.meta.dirname, "../../../../packages/data/extract/corebox/raw/player_aid.json"),
    "utf8",
  ),
);

describe("print player aid art map", () => {
  it("maps Provisions reference card with TrimBox geometry", () => {
    const meta = printPlayerAidArtMapMeta();
    expect(meta.schema).toBe("ddbg.print-player-aid-art-map.v1");
    expect(meta.enabledIds).toEqual([PROVISION_PLAYER_AID_ID]);
    expect(meta.trimBoxPt).toMatchObject({
      widthPt: 198.43,
      heightPt: 340.16,
    });
    const front = lookupProvisionPlayerAidFront();
    expect(front?.name).toBe("Provisions");
    expect(front?.design).toBe("provisions");
    expect(front?.faceEntry.printPage).toBe(1);
    expect(front?.faceEntry.primaryPdf).toContain("PLAYER_AIDS_FRONT");
    expect(front?.faceEntry.cropMethod).toBe("trimbox");
    expect(front?.faceEntry.pngRel).toMatch(/PLAYER_AIDS_FRONT\.pdf_p001\.png$/);
    expect(cachedPrintPlayerAidUrl(front!.faceEntry)).toBe(
      `/print-card-art/${front!.faceEntry.pngRel}`,
    );
  });

  it("aligns engine id with raw extract player_aid:p001", () => {
    const raw = rawAid.cards.find((c: { id: string }) => c.id === PROVISION_PLAYER_AID_ID);
    expect(raw?.copies).toBe(4);
    const card = printMap.cards[0]!;
    expect(card.id).toBe(PROVISION_PLAYER_AID_ID);
    expect(card.faces.front.printPage).toBe(raw.faces.front.page);
    expect(lookupPrintPlayerAidFace(PROVISION_PLAYER_AID_ID, "back")?.faceEntry.primaryPdf).toContain(
      "PLAYER_AIDS_BACK",
    );
  });

  it("lists unmapped designs as pending confirmation", () => {
    expect(printPlayerAidArtMapMeta().pendingConfirmation.join("\n")).toMatch(/player_aid:p005/);
    expect(printPlayerAidArtMapMeta().pendingConfirmation.join("\n")).toMatch(/D6_Provision/);
  });
});
