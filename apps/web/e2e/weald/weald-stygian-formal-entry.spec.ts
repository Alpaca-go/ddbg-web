import { expect, test } from "@playwright/test";

test("正式新战役：核心+Weald Stygian 可出征且 0 金", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("content-pack-weald").check();
  await page.getByTestId("embark-mode-stygian").click();
  await expect(page.getByTestId("embark-stygian-warning")).toContainText("九张普通房");
  await expect(page.getByTestId("embark-stygian-warning")).toContainText("R-036");
  await page.getByRole("button", { name: "前往出征准备", exact: true }).click();
  await page.getByLabel("首趟任务抽法").selectOption("hamlet-quest-draw:weald-two");
  await page.getByRole("button", { name: "抽取首趟任务" }).click();
  await page.getByRole("button", { name: "进入地牢", exact: true }).click();
  await expect(page.getByTestId("tabletop-gold")).toHaveText("0");
});
