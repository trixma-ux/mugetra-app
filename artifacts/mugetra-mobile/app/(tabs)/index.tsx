import React from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import {
  useGetDashboardStats,
  useGetTresorerieResume,
  useGetActiviteRecente,
  useGetCotisationsMensuelles,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { StatCard } from "@/components/StatCard";
import { LoadingView } from "@/components/LoadingView";

function formatFCFA(amount: number): string {
  return amount.toLocaleString("fr-FR") + " FCFA";
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

const MOIS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { data: stats, isLoading: statsLoading, refetch: refetchStats, isRefetching } = useGetDashboardStats();
  const { data: tresorerie } = useGetTresorerieResume();
  const { data: activite } = useGetActiviteRecente();
  const { data: monthly } = useGetCotisationsMensuelles();

  const isLoading = statsLoading;

  if (isLoading) return <LoadingView message="Chargement du tableau de bord..." />;

  const taux = stats?.tauxRecouvrement ?? 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 100, paddingTop: Platform.OS === "web" ? 67 : 0 },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetchStats}
          tintColor={colors.primary}
        />
      }
    >
      {/* Header banner */}
      <View style={[styles.banner, { backgroundColor: colors.primary }]}>
        <Text style={styles.bannerTitle}>MUGETRA-NPG.CI</Text>
        <Text style={styles.bannerSubtitle}>Tableau de bord — {new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</Text>
      </View>

      {/* Members stats */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Membres</Text>
        <View style={styles.row}>
          <StatCard label="Total membres" value={stats?.totalMembres ?? 0} accent />
          <StatCard label="Membres actifs" value={stats?.membresActifs ?? 0} color={colors.success} />
        </View>
        <View style={styles.row}>
          <StatCard label="Défaillants" value={stats?.membresDefaillants ?? 0} color={colors.destructive} />
          <StatCard label="Membres honneur" value={stats?.membresHonneur ?? 0} color={colors.accent} />
        </View>
      </View>

      {/* Cotisations du mois */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Cotisations du mois</Text>
        <View style={[styles.bigCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.bigCardRow}>
            <View>
              <Text style={[styles.bigCardValue, { color: colors.primary }]}>
                {formatFCFA(stats?.cotisationsCollectees ?? 0)}
              </Text>
              <Text style={[styles.bigCardLabel, { color: colors.mutedForeground }]}>Collecté ce mois</Text>
            </View>
            <View style={[styles.tauxBadge, {
              backgroundColor: taux >= 80 ? "#dcfce7" : taux >= 50 ? "#fef9c3" : "#fee2e2"
            }]}>
              <Text style={[styles.tauxText, {
                color: taux >= 80 ? "#166534" : taux >= 50 ? "#854d0e" : "#991b1b"
              }]}>
                {taux.toFixed(0)}%
              </Text>
              <Text style={[styles.tauxLabel, {
                color: taux >= 80 ? "#166534" : taux >= 50 ? "#854d0e" : "#991b1b"
              }]}>recouvrement</Text>
            </View>
          </View>

          {/* Mini bar chart */}
          {monthly && monthly.length > 0 && (
            <View style={styles.miniChart}>
              {monthly.slice(-6).map((m: any, i: number) => {
                const maxVal = Math.max(...(monthly.slice(-6).map((x: any) => x.montant ?? 0)));
                const h = maxVal > 0 ? ((m.montant ?? 0) / maxVal) * 52 : 4;
                return (
                  <View key={i} style={styles.barCol}>
                    <View style={[styles.bar, { height: h, backgroundColor: colors.primary }]} />
                    <Text style={[styles.barLabel, { color: colors.mutedForeground }]}>
                      {MOIS[(m.mois ?? 1) - 1]}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>

      {/* Tresorerie */}
      {tresorerie && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Trésorerie</Text>
          <View style={[styles.bigCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.tresoRow}>
              <View style={styles.tresoItem}>
                <Feather name="trending-up" size={18} color={colors.success} />
                <Text style={[styles.tresoValue, { color: colors.foreground }]}>{formatFCFA(tresorerie.totalCotisations ?? 0)}</Text>
                <Text style={[styles.tresoLabel, { color: colors.mutedForeground }]}>Cotisations</Text>
              </View>
              <View style={[styles.tresoSep, { backgroundColor: colors.border }]} />
              <View style={styles.tresoItem}>
                <Feather name="trending-down" size={18} color={colors.destructive} />
                <Text style={[styles.tresoValue, { color: colors.foreground }]}>{formatFCFA(tresorerie.totalAssistancesPayees ?? 0)}</Text>
                <Text style={[styles.tresoLabel, { color: colors.mutedForeground }]}>Assistances</Text>
              </View>
              <View style={[styles.tresoSep, { backgroundColor: colors.border }]} />
              <View style={styles.tresoItem}>
                <Feather name="dollar-sign" size={18} color={colors.primary} />
                <Text style={[styles.tresoValue, { color: colors.primary }]}>{formatFCFA(tresorerie.solde ?? 0)}</Text>
                <Text style={[styles.tresoLabel, { color: colors.mutedForeground }]}>Solde</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Assistances en attente */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Assistances</Text>
        <StatCard
          label="Demandes en attente de validation"
          value={stats?.assistancesEnAttente ?? 0}
          color={colors.warning}
        />
      </View>

      {/* Recent activity */}
      {activite && activite.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Activité récente</Text>
          <View style={[styles.activityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {activite.slice(0, 5).map((log: any, i: number) => (
              <View key={log.id ?? i} style={[styles.activityRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                <View style={[styles.activityDot, { backgroundColor: colors.primary }]} />
                <View style={styles.activityContent}>
                  <Text style={[styles.activityAction, { color: colors.foreground }]}>{log.action ?? "Action"}</Text>
                  <Text style={[styles.activityDate, { color: colors.mutedForeground }]}>
                    {log.createdAt ? formatDate(log.createdAt) : ""}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: 0 },
  banner: {
    padding: 20,
    paddingTop: 24,
    paddingBottom: 28,
  },
  bannerTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.5,
  },
  bannerSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  bigCard: {
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    gap: 14,
  },
  bigCardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bigCardValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  bigCardLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  tauxBadge: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
  },
  tauxText: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  tauxLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  miniChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    height: 68,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    justifyContent: "flex-end",
  },
  bar: {
    width: "100%",
    borderRadius: 3,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 9,
    fontFamily: "Inter_400Regular",
  },
  tresoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  tresoItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  tresoSep: {
    width: 1,
    height: 48,
  },
  tresoValue: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  tresoLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  activityCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activityContent: { flex: 1, gap: 2 },
  activityAction: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  activityDate: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
