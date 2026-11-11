import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { rawFileSchema } from "../extract/raw";
import {
  curioCatalogSchema,
  curioFileSchema,
  wealdCurioFileSchema,
  planCurioEffects,
} from "../curio";
import { buildWealdCurios } from "./weald-curios";
import { loadNormalizedWealdCurios, writeNormalizedWealdCurios } from "./write-weald";

const read = (file: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../${file}`, import.meta.url), "utf8")) as unknown;
const input = () => ({
  raw: rawFileSchema.parse(read("extract/extension/weald/raw/curio.json")),
});
if (process.env.WRITE_NORMALIZED === "1") writeNormalizedWealdCurios();
const built = loadNormalizedWealdCurios();

describe("Weald 16 张 Curio 转录与审阅边界（W1/W3、R14、R-048、R-233）", () => {
  it("完整保留 16 张、64 行与同名异效果，重建与提交文件一致", () => {
    expect(wealdCurioFileSchema.parse(read("normalized/extension/weald/curio.json"))).toEqual(
      built,
    );
    expect(built.cards.map((card) => card.source.page)).toEqual(
      Array.from({ length: 16 }, (_, i) => i + 1),
    );
    expect(built.cards.every((card) => card.rows.length === 4)).toBe(true);
    expect(built.cards.filter((card) => card.name === "Ancient Coffin")).toHaveLength(2);
    expect(built.cards[0]?.rows).not.toEqual(built.cards[1]?.rows);
  });

  it("R-233 核准全部 64 行，Torch 按印刷顺序保留奖励", () => {
    expect(built.cards.flatMap((card) => card.rows)).toHaveLength(64);
    expect(
      built.cards.every((card) =>
        card.rows.every((row) => row.effect !== null && row.reason === null),
      ),
    ).toBe(true);
    for (const card of built.cards)
      expect(planCurioEffects(card, false)).toEqual({
        status: "ready",
        effects: card.rows.map((row) => row.effect),
      });
    expect(planCurioEffects(built.cards[5]!, true)).toEqual({
      status: "ready",
      effects: [
        { type: "drawQuirk", polarity: "positive", count: 1 },
        { type: "gold", amount: 5 },
        { type: "drawTrinket", count: 1 },
      ],
    });
    expect(planCurioEffects(built.cards[2]!, true)).toEqual({ status: "ready", effects: [] });
  });

  it("未知行仍使整卡停点，Torch 不绕过，逐卡核准不扩展到其他卡", () => {
    const card = structuredClone(built.cards[0]!);
    card.rows[0]!.effect = null;
    card.rows[0]!.reason = "Q-186 · 未核准";
    expect(planCurioEffects(card, false).status).toBe("pending");
    expect(planCurioEffects(card, true).status).toBe("pending");
    expect(built.cards[0]!.rows[0]!.effect).toEqual({ type: "stress", amount: 1 });
  });

  it("核心 24 张约束不接受 16 张当地目录，也不接受混包替换", () => {
    expect(curioCatalogSchema.safeParse(built.cards).success).toBe(false);
    const core = read("normalized/corebox/curio.json") as { cards: unknown[] };
    expect(curioCatalogSchema.safeParse([...core.cards.slice(1), built.cards[0]]).success).toBe(
      false,
    );
    expect(
      wealdCurioFileSchema.safeParse({ ...built, cards: [...built.cards.slice(1), core.cards[0]] })
        .success,
    ).toBe(false);
  });

  it("核心 Torch 规划仍保留正面效果和印刷行序，不修改卡牌", () => {
    const core = curioFileSchema.parse(read("normalized/corebox/curio.json"));
    const card = core.cards[4]!;
    const before = structuredClone(card);
    expect(planCurioEffects(card, true)).toEqual({
      status: "ready",
      effects: [
        { type: "status", kind: "buff", duration: 2 },
        { type: "drawTrinket", count: 1 },
      ],
    });
    expect(planCurioEffects(card, false)).toEqual({
      status: "ready",
      effects: card.rows.map((row) => row.effect),
    });
    expect(card).toEqual(before);
  });

  it.each(["missing", "duplicate", "source", "back", "number", "icon", "name"])(
    "拒绝 %s 漂移",
    (mutation) => {
      const source = input();
      const first = source.raw.cards[0]!;
      if (mutation === "missing") source.raw.cards.pop();
      if (mutation === "duplicate") source.raw.cards[1] = structuredClone(first);
      if (mutation === "source") first.faces.front.file = "02_DD_CARDS_COREBOX/curio.pdf";
      if (mutation === "back") first.faces.back!.page = 2;
      if (mutation === "number")
        first.faces.front.spans = first.faces.front.spans.filter((span) => span.t.trim() !== "10");
      if (mutation === "icon")
        first.faces.front.icons = first.faces.front.icons.filter(
          (icon) => icon.iconId !== "f8686db45a",
        );
      if (mutation === "name") first.faces.front.lines[0]!.text = "Other";
      expect(() => buildWealdCurios(source.raw)).toThrow();
    },
  );
});
