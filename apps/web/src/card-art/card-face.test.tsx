import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CardFace } from "./card-face";
it("Transform can display its playable reverse from the private print cache", () => {
  const front = renderToStaticMarkup(<CardFace skillId="hero_skill:p221" />);
  const back = renderToStaticMarkup(
    <CardFace skillId="hero_skill:p221" face="back" label="Transform to Human II" />,
  );
  expect(front).toContain("SKILLS_FRONT.pdf_p221.png");
  expect(back).toContain("SKILLS_BACK.pdf_p221.png");
  expect(back).toContain("Transform to Human II");
  expect(back).not.toContain("steamusercontent");
});
