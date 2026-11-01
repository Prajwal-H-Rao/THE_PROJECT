/**
 * Nova Design Tokens — typed mirror of spec:253-277 (25 rows).
 * This file must stay in sync with globals.css. The count is exactly 25.
 */

export type ColorTokenKey =
  | "bg"
  | "bgSidebar"
  | "surface1"
  | "surface2"
  | "surface3"
  | "text"
  | "textMuted"
  | "textSubtle"
  | "border"
  | "borderStrong"
  | "primary"
  | "primaryHover"
  | "onPrimary"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "pending"
  | "focusRing"
  | "overlay"
  | "chart1"
  | "chart2"
  | "chart3"
  | "chart4";

export type RadiusTokenKey =
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "pill";

export type ShadowTokenKey = "sm" | "md" | "lg";

export type SpaceTokenKey =
  | "space0"
  | "space1"
  | "space2"
  | "space3"
  | "space4"
  | "space5"
  | "space6"
  | "space7"
  | "space8"
  | "space9"
  | "space10"
  | "space11"
  | "space12"
  | "space13"
  | "space14"
  | "space15"
  | "space16"
  | "space17"
  | "space18"
  | "space19"
  | "space20";

export type TypeTokenKey =
  | "fontSans"
  | "fontMono"
  | "textXs"
  | "textSm"
  | "textBase"
  | "textLg"
  | "textXl"
  | "text2xl"
  | "text3xl"
  | "text4xl"
  | "text5xl";

export const COLOR_TOKEN_KEYS: readonly ColorTokenKey[] = [
  "bg",
  "bgSidebar",
  "surface1",
  "surface2",
  "surface3",
  "text",
  "textMuted",
  "textSubtle",
  "border",
  "borderStrong",
  "primary",
  "primaryHover",
  "onPrimary",
  "secondary",
  "success",
  "warning",
  "danger",
  "info",
  "pending",
  "focusRing",
  "overlay",
  "chart1",
  "chart2",
  "chart3",
  "chart4",
] as const;

export const RADIUS_TOKEN_KEYS: readonly RadiusTokenKey[] = [
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "pill",
] as const;

export const SHADOW_TOKEN_KEYS: readonly ShadowTokenKey[] = ["sm", "md", "lg"] as const;

export const SPACE_TOKEN_KEYS: readonly SpaceTokenKey[] = [
  "space0",
  "space1",
  "space2",
  "space3",
  "space4",
  "space5",
  "space6",
  "space7",
  "space8",
  "space9",
  "space10",
  "space11",
  "space12",
  "space13",
  "space14",
  "space15",
  "space16",
  "space17",
  "space18",
  "space19",
  "space20",
] as const;

export const TYPE_TOKEN_KEYS: readonly TypeTokenKey[] = [
  "fontSans",
  "fontMono",
  "textXs",
  "textSm",
  "textBase",
  "textLg",
  "textXl",
  "text2xl",
  "text3xl",
  "text4xl",
  "text5xl",
] as const;

export const CSS_VAR_PREFIX = "--nova-";

export function colorTokenToCssVar(key: ColorTokenKey): string {
  return `${CSS_VAR_PREFIX}${kebabCase(key)}`;
}

export function radiusTokenToCssVar(key: RadiusTokenKey): string {
  return `${CSS_VAR_PREFIX}radius-${key}`;
}

export function shadowTokenToCssVar(key: ShadowTokenKey): string {
  return `${CSS_VAR_PREFIX}shadow-${key}`;
}

export function spaceTokenToCssVar(key: SpaceTokenKey): string {
  return `${CSS_VAR_PREFIX}space-${key.slice(5)}`;
}

export function typeTokenToCssVar(key: TypeTokenKey): string {
  return `${CSS_VAR_PREFIX}${kebabCase(key)}`;
}

function kebabCase(str: string): string {
  // Handle camelCase to kebab-case with special handling for numbers
  // chart4 -> chart-4, text5xl -> text-5xl (not text-5-xl)
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/([a-z])(\d)([a-z])/g, "$1-$2$3")
    .replace(/([a-z])(\d)(\D|$)/g, "$1-$2$3")
    .toLowerCase();
}

export function assertTokenCounts(): void {
  if (COLOR_TOKEN_KEYS.length !== 25) {
    throw new Error(
      `Expected 25 color tokens, got ${COLOR_TOKEN_KEYS.length}`
    );
  }
  if (RADIUS_TOKEN_KEYS.length !== 6) {
    throw new Error(
      `Expected 6 radius tokens, got ${RADIUS_TOKEN_KEYS.length}`
    );
  }
  if (SHADOW_TOKEN_KEYS.length !== 3) {
    throw new Error(
      `Expected 3 shadow tokens, got ${SHADOW_TOKEN_KEYS.length}`
    );
  }
  if (SPACE_TOKEN_KEYS.length !== 21) {
    throw new Error(
      `Expected 21 space tokens, got ${SPACE_TOKEN_KEYS.length}`
    );
  }
  if (TYPE_TOKEN_KEYS.length !== 11) {
    throw new Error(
      `Expected 11 type tokens, got ${TYPE_TOKEN_KEYS.length}`
    );
  }
}

assertTokenCounts();