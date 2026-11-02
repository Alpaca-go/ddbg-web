import { expect, it } from "vitest";
import { questSaveKey, writeLocalQuestSave, decodeLocalQuestSave } from "./quest-save-storage";

it("普通JSON保持原样，旧存档读取不需要迁移", async () => {
  const json = JSON.stringify({ 中文: "重生池", commands: [] });
  let stored = "";
  await writeLocalQuestSave(json, {
    setItem(key, value) {
      expect(key).toBe(questSaveKey);
      stored = value;
    },
  });
  expect(stored).toBe(json);
  expect(await decodeLocalQuestSave(stored)).toBe(json);
});
it("额度不足时压缩真实JSON文本，Unicode及完整快照无损往返", async () => {
  const json = JSON.stringify({
    snapshot: { name: "重生池😀", catalog: "完整卡牌目录".repeat(10000) },
    commands: [{ type: "resolveChoice", optionId: "hero-0" }],
  });
  let stored = "old";
  await writeLocalQuestSave(json, {
    setItem(_key, value) {
      if (value.length > 2000) throw new DOMException("quota", "QuotaExceededError");
      stored = value;
    },
  });
  expect(stored.startsWith("ddbg-gzip-v1:")).toBe(true);
  expect(await decodeLocalQuestSave(stored)).toBe(json);
  expect(JSON.parse(await decodeLocalQuestSave(stored))).toEqual(JSON.parse(json));
});
it("其他存储错误与损坏压缩内容拒绝，不伪造可恢复的存档", async () => {
  const error = new DOMException("denied", "SecurityError");
  await expect(
    writeLocalQuestSave("{}", {
      setItem() {
        throw error;
      },
    }),
  ).rejects.toBe(error);
  await expect(decodeLocalQuestSave("ddbg-gzip-v1:broken")).rejects.toBeDefined();
});
