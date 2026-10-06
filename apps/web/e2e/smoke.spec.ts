import { expect, test } from "@playwright/test";

test("首页能打开且标题正确", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("暗黑地牢桌游");
  await expect(page.getByTestId("engine-value")).toHaveText("engine-ok");
});
