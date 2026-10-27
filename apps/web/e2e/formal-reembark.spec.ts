import { expect, test } from "@playwright/test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import type { QuestSave } from "../../../packages/data/src/quest-save";

test("B12：回村结算后抽取下一任务并进入第二任务开局补给", async ({ page }) => {
  test.setTimeout(180_000);
  page.setDefaultTimeout(15_000);

  const server = await createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true },
  });
  let save: QuestSave;
  try {
    const plugin = await server.ssrLoadModule(
      fileURLToPath(new URL("../battle-data-plugin.ts", import.meta.url)),
    );
    const code = plugin.battleDataPlugin().load("\0virtual:quest-battle-data");
    const battleData = JSON.parse(code.slice("export const battleData = ".length, -1));
    const sourceHelpers = await server.ssrLoadModule(
      fileURLToPath(
        new URL("../../../packages/engine/src/test-helpers/core-quest.ts", import.meta.url),
      ),
    );
    const offerHelper = await server.ssrLoadModule(
      fileURLToPath(
        new URL("../../../packages/engine/src/test-helpers/quest-offer-seed.ts", import.meta.url),
      ),
    );
    const sources = {
      ...sourceHelpers.coreQuestSources,
      catalog: { ...battleData, trinkets: sourceHelpers.coreQuestSources.catalog.trinkets },
    };
    const seed = offerHelper.scoutThenWipeOfferSeed(sources);
    const fixture = offerHelper.firstQuestHamletReadySave(sources, seed, "quest:p001", 4);
    expect(fixture.game.dungeon!.hamlet!.phase).toBe("preparationComplete");
    save = fixture.save;
  } finally {
    await server.close();
  }

  await page.goto("/");
  await page.evaluate(
    (payload) => localStorage.setItem("ddbg.core-quest.save.v1", payload),
    JSON.stringify(save),
  );
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();

  await expect(page.getByTestId("hamlet-event")).toContainText("准备天数已用完");
  await expect(page.getByTestId("offer-next-quest")).toBeVisible();

  await page.getByTestId("offer-next-quest").click();
  const choice = page.getByTestId("dungeon-pending-choice");
  await expect(choice).toContainText("选择下一任务");
  const questButton = choice.getByRole("button").first();
  const questLabel = (await questButton.innerText()).trim();
  await questButton.click();

  await expect(page.getByRole("button", { name: "掷开局补给骰", exact: true })).toBeVisible();
  await expect(page.getByTestId("phase-crumb-expeditionPrep")).toHaveAttribute(
    "aria-current",
    "step",
  );
  await expect(page.getByRole("heading", { name: questLabel, exact: true })).toBeVisible();
});
