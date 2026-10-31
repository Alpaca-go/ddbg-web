import { expect, test } from "@playwright/test";
test("new campaign threat is logged, saved, restored and followed by provisions", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("embark-mode-radiant").click();
  await page.getByRole("button", { name: "前往出征准备", exact: true }).click();
  await page.getByRole("button", { name: "进入地牢", exact: true }).click();
  const roll = page.getByRole("button", { name: "掷开局补给骰", exact: true });
  await expect(roll).toBeDisabled();
  await page.getByRole("button", { name: "抽取迫近威胁", exact: true }).click();
  const shown = await page.getByTestId("initial-threat-result").innerText();
  await expect(roll).toBeEnabled();
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  const read = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("ddbg.core-quest.save.v1")!));
  const saved = await read();
  expect(saved.commands.map((c: { type: string }) => c.type)).toEqual(["establishImminentThreat"]);
  expect(saved.snapshot.dungeon.imminentThreatDescriptionCardId).toMatch(/^boss_ability:p/);
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await expect(page.getByTestId("initial-threat-result")).toHaveText(shown);
  await expect(page.getByRole("button", { name: "抽取迫近威胁", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "掷开局补给骰", exact: true }).click();
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  const provisions = await read();
  expect(provisions.commands.map((c: { type: string }) => c.type)).toEqual([
    "establishImminentThreat",
    "rollDungeonProvisions",
  ]);
  expect(provisions.snapshot.dungeon.imminentThreatDescriptionCardId).toBe(
    saved.snapshot.dungeon.imminentThreatDescriptionCardId,
  );
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await expect(page.getByTestId("dungeon-pending-choice")).toBeVisible();
});
