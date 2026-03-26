import { createTheme } from "@mantine/core";

/**
 * Mantine theme aligned with docs/music-theme-template.md (burgundy + gold).
 */
const burgundy = [
  "#fcf2f4",
  "#f2d5dc",
  "#e5a8b6",
  "#d47a8f",
  "#bf4f6a",
  "#a33552",
  "#8b2942",
  "#6f2135",
  "#521828",
  "#361018",
] as const;

const gold = [
  "#fdf8e8",
  "#f9ecc4",
  "#f0d890",
  "#e4c255",
  "#d4a832",
  "#b8860b",
  "#96700a",
  "#755509",
  "#553c07",
  "#362604",
] as const;

export const practiceMantineTheme = createTheme({
  primaryColor: "burgundy",
  colors: {
    burgundy: [...burgundy],
    gold: [...gold],
  },
  fontFamily: "var(--font-geist-sans), system-ui, -apple-system, sans-serif",
  fontFamilyMonospace: "var(--font-geist-mono), ui-monospace, monospace",
  headings: {
    fontFamily: "var(--font-geist-sans), system-ui, -apple-system, sans-serif",
    fontWeight: "650",
  },
  defaultRadius: "md",
  components: {
    Button: {
      defaultProps: { fw: 600 },
    },
    Card: {
      defaultProps: { withBorder: true },
    },
  },
});
