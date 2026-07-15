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
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { useListAssistances } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { StatusBadge } from "@/components/StatusBadge";
import { LoadingView } from "@/components/LoadingView";
import { EmptyView } from "@/components/EmptyView";

function formatFCFA(amount: number): string {
  return amount.toLocaleString("fr-FR") + " FCFA";
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

const TYPE_LABELS: Record<string, string> = {
  deces_membre: "Décès membre",
  deces_conjoint: "Décès conjoint",
  deces_enfant: "Décès enfant",
  deces_parent: "Décès parent",
  deces_beau_parent: "Décès beau-parent",
  deces_mort_ne: "Mort-né",
  mariage: "Mariage",
  retraite: "Retraite",
  retraite_complementaire: "Retraite complémentaire",
  pret_sante: "Prêt santé",
  licenciement: "Licenciement",
};

const STATUTS = ["", "en_attente", "approuvee", "rejetee", "payee"];
const STATUT_LABELS = ["Tous", "En attente", "Approuvées", "Rejetées", "Payées"];

export default function AssistancesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [filterIdx, setFilterIdx] = useState(0);

  const selectedStatut = STATUTS[filterIdx] || undefined;

  const { data, isLoading, refetch, isRefetching } = useListAssistances(
    { statut: selectedStatut as any, limit: 50 },
    { query: { keepPreviousData: true } as any }
  );

  const assistances = data?.assistances ?? [];

  if (isLoading) return <LoadingView message="Chargement des assistances..." />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Filter chips */}
      <View style={[styles.filters, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: Platform.OS === "web" ? 67 : 0 }]}>
        <View style={styles.chips}>
          {STATUT_LABELS.map((label, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.chip,
                { backgroundColor: filterIdx === i ? colors.primary : colors.muted, borderColor: filterIdx === i ? colors.primary : colors.border },
              ]}
              onPress={() => setFilterIdx(i)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, { color: filterIdx === i ? "#fff" : colors.foreground }]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.count, { color: colors.mutedForeground }]}>{data?.total ?? 0} demandes</Text>
      </View>

      <FlatList
        data={assistances}
        keyExtractor={(item) => String(item.id)}
        scrollEnabled={!!assistances.length}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 100 },
          assistances.length === 0 && { flex: 1 },
        ]}
        ListEmptyComponent={
          <EmptyView
            icon="heart"
            title="Aucune demande"
            subtitle="Aucune demande d'assistance dans cette catégorie."
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(`/assistance/${item.id}` as any)}
            activeOpacity={0.75}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.typeIcon, { backgroundColor: colors.secondary }]}>
                <Feather name="heart" size={18} color={colors.primary} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={[styles.typeLabel, { color: colors.foreground }]}>
                  {TYPE_LABELS[item.type ?? ""] ?? item.type}
                </Text>
                <Text style={[styles.date, { color: colors.mutedForeground }]}>
                  {formatDate(item.createdAt)}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </View>
            <View style={styles.cardFooter}>
              <StatusBadge status={item.statut ?? ""} />
              {item.montantDemande != null && (
                <Text style={[styles.amount, { color: colors.primary }]}>
                  {formatFCFA(item.montantDemande)}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filters: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  count: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  list: { padding: 14, gap: 10 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  typeIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: { flex: 1 },
  typeLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  date: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  amount: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
});
