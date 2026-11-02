import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import printMap from "./player-aid-print-art-map.json";
import {
  PROVISION_PLAYER_AID_ID,
  ROOMS_PLAYER_AID_ID,
  cachedPrintPlayerAidUrl,
  lookupConditionsPlayerAidBack,
  lookupExplorationPlayerAidBack,
  lookupPrintPlayerAidFace,
  lookupProvisionPlayerAidFront,
  lookupRoomsPlayerAidFront,
  printPlayerAidArtMapMeta,
} from "./resolve-print-player-aid-art";

const rawAid = JSON.parse(
  readFileSync(
    resolve(import.meta.dirname, "../../../../packages/data/extract/corebox/raw/player_aid.json"),
    "utf8",
  ),
);

describe("print player aid art map", () => {
  it("maps both player aid designs with TrimBox geometry", () => {
    const meta = printPlayerAidArtMapMeta();
    expect(meta.schema).toBe("ddbg.print-player-aid-art-map.v1");
    expect(meta.enabledIds).toEqual([PROVISION_PLAYER_AID_ID, ROOMS_PLAYER_AID_ID]);
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

  it("aligns engine ids with raw extract page order", () => {
    for (const id of [PROVISION_PLAYER_AID_ID, ROOMS_PLAYER_AID_ID] as const) {
      const raw = rawAid.cards.find((c: { id: string }) => c.id === id);
      expect(raw?.copies).toBe(4);
      const card = printMap.cards.find((c) => c.id === id);
      expect(card?.faces.front.printPage).toBe(raw.faces.front.page);
      expect(card?.faces.back.printPage).toBe(raw.faces.back.page);
    }
    expect(lookupExplorationPlayerAidBack()?.faceEntry.textSnippet).toBe("Exploration");
    expect(lookupExplorationPlayerAidBack()?.faceEntry.pngRel).toMatch(
      /PLAYER_AIDS_BACK\.pdf_p001\.png$/,
    );
    expect(lookupRoomsPlayerAidFront()?.name).toBe("Rooms");
    expect(lookupRoomsPlayerAidFront()?.faceEntry.printPage).toBe(5);
    expect(lookupConditionsPlayerAidBack()?.faceEntry.textSnippet).toBe("Conditions");
    expect(lookupConditionsPlayerAidBack()?.faceEntry.pngRel).toMatch(
      /PLAYER_AIDS_BACK\.pdf_p005\.png$/,
    );
    expect(
      lookupPrintPlayerAidFace(PROVISION_PLAYER_AID_ID, "back")?.faceEntry.primaryPdf,
    ).toContain("PLAYER_AIDS_BACK");
  });

  it("lists only dice_net as pending confirmation", () => {
    const pending = printPlayerAidArtMapMeta().pendingConfirmation.join("\n");
    expect(pending).toMatch(/D6_Provision/);
    expect(pending).not.toMatch(/player_aid:p005/);
  });
});
