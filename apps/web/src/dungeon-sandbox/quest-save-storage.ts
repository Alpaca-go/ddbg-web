export const questSaveKey = "ddbg.core-quest.save.v1";
const prefix = "ddbg-gzip-v1:";

/** 保留普通JSON兼容；仅在本机存储额度不足时无损压缩，不修改引擎存档协议。 */
export async function writeLocalQuestSave(
  json: string,
  storage: Pick<Storage, "setItem"> = localStorage,
) {
  try {
    storage.setItem(questSaveKey, json);
    return;
  } catch (error) {
    if (
      !error ||
      typeof error !== "object" ||
      !("name" in error) ||
      error.name !== "QuotaExceededError"
    )
      throw error;
  }
  const buffer = await new Response(
    new Blob([json]).stream().pipeThrough(new CompressionStream("gzip")),
  ).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 32768)
    binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
  storage.setItem(questSaveKey, prefix + btoa(binary));
}

export async function decodeLocalQuestSave(raw: string): Promise<string> {
  if (!raw.startsWith(prefix)) return raw;
  const binary = atob(raw.slice(prefix.length));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Response(
    new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip")),
  ).text();
}
