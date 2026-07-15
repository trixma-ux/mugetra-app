import { useColorScheme } from "react-native";

export interface AppColors {
  background: string;
  foreground: string;
  card: string;
  border: string;
  muted: string;
  mutedForeground: string;
  primary: string;
  secondary: string;
  accent: string;
  destructive: string;
  success: string;
  warning: string;
  header: string;
  headerForeground: string;
  tabBar: string;
}

const light: AppColors = {
  background: "#f5f7f6",
  foreground: "#111827",
  card: "#ffffff",
  border: "#e5e7eb",
  muted: "#f1f5f4",
  mutedForeground: "#6b7280",
  primary: "#1a5c3a",
  secondary: "#2f6f4f",
  accent: "#b45309",
  destructive: "#dc2626",
  success: "#15803d",
  warning: "#d97706",
  header: "#1a5c3a",
  headerForeground: "#ffffff",
  tabBar: "#ffffff",
};

const dark: AppColors = {
  background: "#0f1613",
  foreground: "#f3f4f6",
  card: "#161f1b",
  border: "#26312c",
  muted: "#1c2622",
  mutedForeground: "#9ca3af",
  primary: "#3f9d6e",
  secondary: "#4c9a75",
  accent: "#d18b3d",
  destructive: "#f87171",
  success: "#4ade80",
  warning: "#fbbf24",
  header: "#122019",
  headerForeground: "#f3f4f6",
  tabBar: "#161f1b",
};

/** Reconstruit : fournit une palette cohérente claire/sombre pour toute l'app mobile. */
export function useColors(): AppColors {
  const scheme = useColorScheme();
  return scheme === "dark" ? dark : light;
}
