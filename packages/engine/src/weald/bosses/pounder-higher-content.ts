import printed from "../../../../data/normalized/extension/weald/pounder_higher.json";
import { wealdPounderHigherContentSchema } from "../../../../data/src/weald/bosses/pounder/weald-pounder-higher";
/** 无战斗／注册器依赖的核准目录叶模块。 */
export const WEALD_POUNDER_HIGHER_CONTENT = wealdPounderHigherContentSchema.parse(printed);
