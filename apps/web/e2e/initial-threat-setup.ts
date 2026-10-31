import type { Page } from "@playwright/test";
export async function establishInitialThreatIfShown(page: Page) {
  const draw = page.getByRole("button", { name: "抽取迫近威胁", exact: true });
  if (await draw.count()) await draw.click();
}
