import React, { useState } from "react";
import {
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useListCotisations } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { LoadingView } from "@/components/LoadingView";
import { EmptyView } from "@/components/EmptyView";

function formatFCFA(amount: number): string {
  return amount.toLocaleString("fr-FR") + " FCFA";
}

const MOIS_LABELS = [
  "", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const TYPE_LABELS: Record<string, string> = {
  especes: "Espèces",
  virement: "Virement",
  cheque: "Chèque",
  regularisation: "Régularisation",
};

export default function CotisationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);

  const { data, isLoading, refetch, isRefetching } = useListCotisations(
    { annee: year, limit: 100 },
    { query: { keepPreviousData: true } as any }
  );

  const cotisations = data?.cotisations ?? [];
  const total = cotisations.reduce((s: number, c: any) => s + (c.montant ?? 0), 0);

  if (isLoading) return <LoadingView message="Chargement des cotisations..." />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Year filter */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: Platform.OS === "web" ? 67 : 0 }]}>
        <View style={styles.yearRow}>
          <TouchableOpacity onPress={() => setYear(y => y - 1)} style={[styles.yearBtn, { backgroundColor: colors.muted }]}>
            <Feather name="chevron-left" size={18} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.yearText, { color: colors.foreground }]}>{year}</Text>
          <TouchableOpacity
            onPress={() => setYear(y => Math.min(y + 1, currentYear))}
            style={[styles.yearBtn, { backgroundColor: colors.muted, opacity: year >= currentYear ? 0.4 : 1 }]}
            disabled={year >= currentYear}
          >
            <Feather name="chevron-right" size={18} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <View style={[styles.summaryRow, { backgroundColor: colors.secondary, borderRadius: 10, padding: 12 }]}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.primary }]}>{cotisations.length}</Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>paiements</Text>
          </View>
          <View style={[styles.summarySep, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.primary }]}>{formatFCFA(total)}</Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>collecté</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={cotisations}
        keyExtractor={(item) => String(item.id)}
        scrollEnabled={!!cotisations.length}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 100 },
          cotisations.length === 0 && { flex: 1 },
        ]}
        ListEmptyComponent={
          <EmptyView
            icon="credit-card"
            title={`Aucune cotisation en ${year}`}
            subtitle="Aucun paiement enregistré pour cette période."
          />
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardTop}>
              <View>
                <Text style={[styles.memberName, { color: colors.foreground }]}>
                  {item.membrePrenom} {item.membreNom}
                </Text>
                <Text style={[styles.matricule, { color: colors.mutedForeground }]}>{item.membreMatricule}</Text>
              </View>
              <Text style={[styles.amount, { color: colors.primary }]}>{formatFCFA(item.montant ?? 0)}</Text>
            </View>
            <View style={styles.cardBottom}>
              <View style={[styles.periodBadge, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.periodText, { color: colors.primary }]}>
                  {MOIS_LABELS[item.mois ?? 0]} {item.annee}
                </Text>
              </View>
              <Text style={[styles.typeText, { color: colors.mutedForeground }]}>
                {TYPE_LABELS[item.typeReglement ?? ""] ?? item.typeReglement}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: 14,
    gap: 12,
    borderBottomWidth: 1,
  },
  yearRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  yearBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  yearText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    minWidth: 60,
    textAlign: "center",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  summaryValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  summarySep: {
    width: 1,
    height: 32,
  },
  list: { padding: 14, gap: 10 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  memberName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  matricule: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  amount: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  periodBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  periodText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  typeText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
