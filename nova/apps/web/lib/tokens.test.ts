import { describe, it, expect } from "vitest";
import {
  COLOR_TOKEN_KEYS,
  RADIUS_TOKEN_KEYS,
  SHADOW_TOKEN_KEYS,
  SPACE_TOKEN_KEYS,
  TYPE_TOKEN_KEYS,
  colorTokenToCssVar,
  radiusTokenToCssVar,
  shadowTokenToCssVar,
  spaceTokenToCssVar,
  typeTokenToCssVar,
} from "./tokens";

describe("Design tokens", () => {
  it("has exactly 25 color tokens", () => {
    expect(COLOR_TOKEN_KEYS.length).toBe(25);
  });

  it("has exactly 6 radius tokens", () => {
    expect(RADIUS_TOKEN_KEYS.length).toBe(6);
  });

  it("has exactly 3 shadow tokens", () => {
    expect(SHADOW_TOKEN_KEYS.length).toBe(3);
  });

  it("has exactly 21 space tokens", () => {
    expect(SPACE_TOKEN_KEYS.length).toBe(21);
  });

  it("has exactly 11 type tokens", () => {
    expect(TYPE_TOKEN_KEYS.length).toBe(11);
  });

  it("colorTokenToCssVar produces correct format", () => {
    expect(colorTokenToCssVar("bg")).toBe("--nova-bg");
    expect(colorTokenToCssVar("bgSidebar")).toBe("--nova-bg-sidebar");
    expect(colorTokenToCssVar("chart4")).toBe("--nova-chart-4");
  });

  it("radiusTokenToCssVar produces correct format", () => {
    expect(radiusTokenToCssVar("xs")).toBe("--nova-radius-xs");
    expect(radiusTokenToCssVar("pill")).toBe("--nova-radius-pill");
  });

  it("shadowTokenToCssVar produces correct format", () => {
    expect(shadowTokenToCssVar("sm")).toBe("--nova-shadow-sm");
    expect(shadowTokenToCssVar("lg")).toBe("--nova-shadow-lg");
  });

  it("spaceTokenToCssVar produces correct format", () => {
    expect(spaceTokenToCssVar("space0")).toBe("--nova-space-0");
    expect(spaceTokenToCssVar("space20")).toBe("--nova-space-20");
  });

  it("typeTokenToCssVar produces correct format", () => {
    expect(typeTokenToCssVar("fontSans")).toBe("--nova-font-sans");
    expect(typeTokenToCssVar("textXl")).toBe("--nova-text-xl");
    expect(typeTokenToCssVar("text5xl")).toBe("--nova-text-5xl");
  });

  it("all color token keys are unique", () => {
    const unique = new Set(COLOR_TOKEN_KEYS);
    expect(unique.size).toBe(COLOR_TOKEN_KEYS.length);
  });

  it("all space token keys are unique", () => {
    const unique = new Set(SPACE_TOKEN_KEYS);
    expect(unique.size).toBe(SPACE_TOKEN_KEYS.length);
  });
});