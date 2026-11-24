import type { RunningAgent } from "~/components/chat/ThreadRelationshipsControl";

/** More running agents than this show as dots plus a "+N" count. */
export const MAX_AGENT_DOTS = 5;

const MODEL_COLORS: ReadonlyArray<readonly [RegExp, string]> = [
  [/claude|opus|sonnet|haiku|fable/i, "#d97757"],
  [/gemini/i, "#7c8cf8"],
  [/grok/i, "#b8b4b0"],
  [/gpt|codex|o\d/i, "#d9d6d2"],
];

const DRIVER_COLORS: Readonly<Record<string, string>> = {
  claudeAgent: "#d97757",
  codex: "#d9d6d2",
  cursor: "#d9d6d2",
  grok: "#b8b4b0",
  opencode: "#6fb3a8",
};

/**
 * The dot color for a running agent: the provider instance's own accent when the user set one,
 * then the model family (one driver can host several, like Gemini over a Codex endpoint), then
 * the driver.
 */
export function agentDotColor(agent: RunningAgent): string {
  if (agent.accentColor) return agent.accentColor;
  const model = agent.model ?? "";
  for (const [pattern, color] of MODEL_COLORS) {
    if (pattern.test(model)) return color;
  }
  return (agent.driver && DRIVER_COLORS[agent.driver]) || "var(--muted-foreground)";
}
