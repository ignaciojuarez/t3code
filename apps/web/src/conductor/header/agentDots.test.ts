import { describe, expect, it } from "vite-plus/test";

import { agentDotColor } from "./agentDots";

const agent = (overrides: Partial<Parameters<typeof agentDotColor>[0]>) => ({
  key: "a",
  driver: undefined,
  model: undefined,
  accentColor: undefined,
  ...overrides,
});

describe("agentDotColor", () => {
  it("prefers the provider instance accent", () => {
    expect(agentDotColor(agent({ accentColor: "#123456", model: "claude-opus-5-5" }))).toBe(
      "#123456",
    );
  });

  it("colors by model family before driver", () => {
    expect(agentDotColor(agent({ driver: "codex", model: "gemini-3.8-flash-high" }))).toBe(
      "#7c8cf8",
    );
    expect(agentDotColor(agent({ driver: "claudeAgent", model: "claude-sonnet-5-5" }))).toBe(
      "#d97757",
    );
  });

  it("falls back to the driver, then to the muted color", () => {
    expect(agentDotColor(agent({ driver: "opencode" }))).toBe("#6fb3a8");
    expect(agentDotColor(agent({}))).toBe("var(--muted-foreground)");
  });
});
