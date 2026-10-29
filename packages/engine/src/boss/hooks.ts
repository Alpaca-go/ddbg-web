import type {
  BossFaceTheThreatContext,
  BossHookName,
  BossHookOk,
  BossHookStubResult,
  BossMonsterTurnContext,
  BossScriptDefinition,
  BossScriptHooks,
  BossSlotPlacementContext,
  BossSummonContext,
  BossSentenceRenderedContext,
  BossOneBodyMorphContext,
  BossThreatPassiveContext,
} from "./types";

type HookContextMap = {
  threatPassiveDungeon: BossThreatPassiveContext;
  threatPassiveHamlet: BossThreatPassiveContext;
  faceTheThreatEmbark: BossFaceTheThreatContext;
  bossSlotPlacement: BossSlotPlacementContext;
  monsterTurnActionCount: BossMonsterTurnContext;
  summon: BossSummonContext;
  sentenceRendered: BossSentenceRenderedContext;
  oneBodyMorph: BossOneBodyMorphContext;
};

export type RunBossHookResult<N extends BossHookName> =
  NonNullable<BossScriptHooks[N]> extends (ctx: HookContextMap[N]) => infer R ? R : never;

/** 执行已注册脚本上的单个钩子；未定义钩子返回明确 stub。 */
export function runBossHook<N extends BossHookName>(
  script: BossScriptDefinition,
  hook: N,
  context: HookContextMap[N],
): RunBossHookResult<N> | BossHookStubResult {
  const handler = script.hooks[hook];
  if (!handler) {
    return {
      status: "stub",
      message: `Boss 脚本 ${script.id} 未定义钩子 ${hook}`,
      hold: "Phase 5 后续 PR",
    };
  }
  return (handler as (ctx: HookContextMap[N]) => RunBossHookResult<N> | BossHookStubResult)(
    context,
  ) as RunBossHookResult<N>;
}

export function defaultMonsterTurnActionCount(
  script: BossScriptDefinition,
  context: BossMonsterTurnContext,
): BossHookOk<number> | BossHookStubResult {
  const result = runBossHook(script, "monsterTurnActionCount", context);
  if (result.status === "stub") return { status: "ok", value: 1 };
  return result;
}
