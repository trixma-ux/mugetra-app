import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

const LABELS: Record<string, string> = {
  actif: "Actif", defaillant: "Défaillant", radie: "Radié", demissionnaire: "Démissionnaire",
  decede: "Décédé", honneur: "Membre d'honneur",
  en_attente: "En attente", commission_affaires_sociales: "Commission Aff. Sociales",
  commission_prets: "Commission Prêts", bureau: "Bureau Exécutif", direction_generale: "Direction Générale",
  tresorerie: "Trésorerie", approuvee: "Approuvée", rejetee: "Rejetée", payee: "Payée",
};

function colorFor(status: string, colors: ReturnType<typeof useColors>) {
  if (["actif", "approuvee", "payee"].includes(status)) return colors.success;
  if (["defaillant", "rejetee"].includes(status)) return colors.destructive;
  if (["radie", "demissionnaire", "decede"].includes(status)) return colors.mutedForeground;
  if (status === "honneur") return colors.accent;
  return colors.warning;
}

export function StatusBadge({ status }: { status: string }) {
  const colors = useColors();
  const color = colorFor(status, colors);
  const label = LABELS[status] ?? status;
  return (
    <View style={[styles.badge, { backgroundColor: `${color}22`, borderColor: color }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, alignSelf: "flex-start" },
  text: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
