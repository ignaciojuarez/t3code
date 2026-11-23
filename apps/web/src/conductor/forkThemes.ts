import type { ThemeDefinition } from "@t3tools/shared/themePalettes";

import { CLAUDE_CLAY_THEME } from "./claudeClayTheme";
import { CONDUCTOR_THEME } from "./conductorTheme";

/** Themes the fork builds in ahead of upstream's; web only, so mobile and stock servers are unaffected. */
export const FORK_THEMES: ReadonlyArray<ThemeDefinition> = [CONDUCTOR_THEME, CLAUDE_CLAY_THEME];
