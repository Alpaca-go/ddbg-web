import baseline from "../../../dictionary/icon-dictionary-v1.8.json";
import additions from "../../../dictionary/print-icon-additions.json";
import { iconDictionarySchema } from "./schema";

/** 旧版词典及后来核准的映射共享连续且稳定的印刷变体序号。 */
export function loadIconDictionary() {
  return iconDictionarySchema.parse({ ...baseline, icons: [...baseline.icons, ...additions] });
}
