import printed from "../../../../data/normalized/extension/weald/pounder_i.json";
import { wealdPounderContentSchema } from "../../../../data/src/weald/bosses/weald-pounder";

/** 核准目录叶模块：不加载战斗／几何运行时，避免 Boss 注册时循环初始化。 */
export const WEALD_POUNDER_I_CONTENT = wealdPounderContentSchema.parse(printed);
