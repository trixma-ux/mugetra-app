import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export function StatCard({
  label,
  value,
  color,
  accent,
}: {
  label: string;
  value: string | number;
  color?: string;
  accent?: boolean;
}) {
  const colors = useColors();
  const barColor = color ?? (accent ? colors.primary : colors.secondary);
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.bar, { backgroundColor: barColor }]} />
      <View style={styles.content}>
        <Text style={[styles.value, { color: colors.foreground }]}>{value}</Text>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", borderRadius: 12, borderWidth: 1, overflow: "hidden", flex: 1, minWidth: 140 },
  bar: { width: 4 },
  content: { padding: 12, gap: 2, flex: 1 },
  value: { fontSize: 22, fontFamily: "Inter_700Bold" },
  label: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
