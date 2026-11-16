import printed from "../../../../../data/normalized/extension/weald/shrieker_i.json";
import { wealdShriekerContentSchema } from "../../../../../data/src/weald-shrieker";
/** 叶模块：只解析核准数据，不加载战斗／注册器，避免初始化循环。 */
export const WEALD_SHRIEKER_I_CONTENT = wealdShriekerContentSchema.parse(printed);
