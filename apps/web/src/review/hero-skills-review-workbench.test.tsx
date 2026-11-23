import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { HeroSkillsReviewWorkbench } from "./HeroSkillsReviewWorkbench";

/**
 * 合成冒烟：验证工作台壳与缺图阻断文案。
 * 这不是印刷审阅证据，不能当作 confirmed。
 */
it("workbench smoke: Leper batch, export control, art-block banner (synthetic)", () => {
  const html = renderToStaticMarkup(<HeroSkillsReviewWorkbench />);
  expect(html).toContain("Phase A0.5");
  expect(html).toContain("Leper");
  expect(html).toContain("21+3");
  expect(html).toContain("review-export");
  expect(html).toContain("hero_skill:warrens:h14:p274");
  expect(html).toContain("复核阻断");
  expect(html).toContain("review-art-blocked");
  expect(html).toContain("review-verdict-locked");
  expect(html).toContain("resolveHeroSkillEffects");
  // 不得出现已复核完成的假口径 / 公网入口承诺
  expect(html).not.toContain("21张已复核");
  expect(html).toContain("未开通公网访问");
  expect(html).not.toContain("https://");
});
