import { theme } from "../../theme";

export const DIRECTION_LABEL: Record<string, string> = { long: "📈 做多", short: "📉 做空", neutral: "🤔 观望" };
export const DIRECTION_COLOR: Record<string, string> = { long: theme.up, short: theme.down, neutral: theme.textSecondary };
