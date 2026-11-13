import { expect, test } from "@playwright/test";

test("开局多选内容包、固定核心包，保存读取沿用原选择", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("content-pack-core")).toBeChecked();
  await expect(page.getByTestId("content-pack-core")).toBeDisabled();
  await expect(page.getByTestId("content-pack-weald")).not.toBeChecked();
  await page.getByTestId("content-pack-weald").check();
  await page.getByTestId("content-pack-cove").check();
  await page.getByTestId("content-pack-warrens").check();
  await page.getByTestId("content-pack-warrens").uncheck();
  await page.getByRole("button", { name: "前往出征准备", exact: true }).click();
  await page.getByRole("button", { name: "返回建队", exact: true }).click();
  await expect(page.getByTestId("content-pack-weald")).toBeChecked();
  await expect(page.getByTestId("content-pack-cove")).toBeChecked();
  await expect(page.getByTestId("content-pack-warrens")).not.toBeChecked();
  await page.getByRole("button", { name: "前往出征准备", exact: true }).click();
  await page.getByRole("button", { name: "抽取首趟任务", exact: true }).click();
  await page.getByRole("button", { name: "进入地牢", exact: true }).click();
  await expect(page.getByTestId("campaign-active-packs")).toContainText("核心包 + Weald + Cove");
  await expect(page.getByTestId("campaign-content-packs")).toHaveCount(0);
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("已保存");
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await expect(page.getByTestId("campaign-active-packs")).toContainText("核心包 + Weald + Cove");
});
