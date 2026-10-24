import { EMBARK_ROSTER_SLOT_STANCES } from "@ddbg/engine";

/** Kyries 本地资源根目录（gitignore）；由 Vite 插件挂载。 */
export const ASSETS_PLUS_PUBLIC_PREFIX = "/ddbg-assets-plus";

export function menuArrowUrl(direction: "left" | "right"): string {
  return `${ASSETS_PLUS_PUBLIC_PREFIX}/menu.${direction}_arrow.png`;
}

export function selectedAbilityFrameUrl(): string {
  return `${ASSETS_PLUS_PUBLIC_PREFIX}/selected_ability.png`;
}

export function heroActivityConfirmButtonUrl(): string {
  return `${ASSETS_PLUS_PUBLIC_PREFIX}/hero_activity.confirm_button.png`;
}

export function heroActivityCancelButtonUrl(): string {
  return `${ASSETS_PLUS_PUBLIC_PREFIX}/hero_activity.cancel_button.png`;
}

export const HERO_ACTIVITY_CONFIRM_BUTTON_WIDTH_PX = 64;
export const HERO_ACTIVITY_CONFIRM_BUTTON_HEIGHT_PX = 32;
export const HERO_ACTIVITY_CANCEL_BUTTON_WIDTH_PX = 70;
export const HERO_ACTIVITY_CANCEL_BUTTON_HEIGHT_PX = 38;

/** 建队底栏四格未确认时，从左到右的站位图标（对应 `hero.position.<stance>.png`）。 */
export const EMBARK_ROSTER_POSITION_STANCES = EMBARK_ROSTER_SLOT_STANCES;

export type EmbarkRosterPositionStance = (typeof EMBARK_ROSTER_POSITION_STANCES)[number];

export function embarkRosterPositionUrl(stance: EmbarkRosterPositionStance): string {
  return `${ASSETS_PLUS_PUBLIC_PREFIX}/hero.position.${stance}.png`;
}

/** 偏好位置：已选技能在某姿态出现 2 / 3+ 次时的黄色光晕档位（0 = 无）。 */
export function embarkPositionStanceGlowTier(litStanceCount: number): 0 | 2 | 3 {
  if (litStanceCount <= 1) return 0;
  if (litStanceCount === 2) return 2;
  return 3;
}

/** 建队页底部编队头像条外框（412×113）。 */
export function embarkPartyBackgroundUrl(): string {
  return `${ASSETS_PLUS_PUBLIC_PREFIX}/embark_party.background.png`;
}

/** 与 `embark_party.background.png` 裁切尺寸一致，用于 `aspect-ratio`。 */
export const EMBARK_PARTY_BACKGROUND_WIDTH_PX = 412;
export const EMBARK_PARTY_BACKGROUND_HEIGHT_PX = 113;

/** 建队页底栏站位条下方「前往出征准备」按钮（312×80）。 */
export function embarkBeginButtonUrl(): string {
  return `${ASSETS_PLUS_PUBLIC_PREFIX}/begin_button.png`;
}

export function embarkBeginButtonHoverUrl(): string {
  return `${ASSETS_PLUS_PUBLIC_PREFIX}/begin_button.hover.png`;
}

export const EMBARK_BEGIN_BUTTON_WIDTH_PX = 312;
export const EMBARK_BEGIN_BUTTON_HEIGHT_PX = 80;

/** 裁切后 `selected_ability.png` 像素尺寸（与技能 icon 72×72 同比例缩放显示）。 */
export const SELECTED_ABILITY_FRAME_WIDTH_PX = 78;
export const SELECTED_ABILITY_FRAME_HEIGHT_PX = 90;
