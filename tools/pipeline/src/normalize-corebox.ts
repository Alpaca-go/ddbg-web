import { writeNormalizedCorebox } from "../../../packages/data/src/write";

/** 把核心盒 parsed / raw 收成规范化 JSON。实现在 packages/data。 */
export function normalizeCorebox() {
  return writeNormalizedCorebox();
}
