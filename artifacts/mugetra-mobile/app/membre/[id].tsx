import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
  TouchableOpacity,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useGetMembre, useGetCotisationsResume } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { StatusBadge } from "@/components/StatusBadge";
import { LoadingView } from "@/components/LoadingView";
import { EmptyView } from "@/components/EmptyView";

function formatFCFA(amount: number): string {
  return amount.toLocaleString("fr-FR") + " FCFA";
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  const colors = useColors();
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

const LIEN_LABELS: Record<string, string> = {
  conjoint: "Conjoint(e)",
  enfant: "Enfant",
  parent: "Parent",
  beau_parent: "Beau-parent",
};

export default function MembreDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: membre, isLoading, isError } = useGetMembre(Number(id), {
    query: { enabled: !!id },
  });

  const { data: cotisResume } = useGetCotisationsResume(Number(id), {
    query: { enabled: !!id },
  });

  if (isLoading) return <LoadingView message="Chargement du membre..." />;
  if (isError || !membre) {
    return (
      <EmptyView
        icon="user-x"
        title="Membre introuvable"
        subtitle="Ce membre n'existe pas ou a été supprimé."
        actionLabel="Retour"
        onAction={() => router.back()}
      />
    );
  }

  const allDependents = [
    ...(membre.conjoint ? [{ ...membre.conjoint, lienParente: "conjoint" }] : []),
    ...(membre.enfants ?? []).map((e: any) => ({ ...e, lienParente: "enfant" })),
    ...(membre.parents ?? []).map((p: any) => ({ ...p, lienParente: "parent" })),
    ...(membre.beauxParents ?? []).map((bp: any) => ({ ...bp, lienParente: "beau_parent" })),
  ];

  const handlePdfFiche = async () => {
    const token = await AsyncStorage.getItem("mugetra_token");
    const base = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
    await Linking.openURL(`${base}/api/pdf/membres/${id}/fiche-adhesion?token=${token}`);
  };

  const handlePdfReleve = async () => {
    const token = await AsyncStorage.getItem("mugetra_token");
    const base = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
    await Linking.openURL(`${base}/api/pdf/cotisations/${id}?token=${token}`);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingTop: Platform.OS === "web" ? 67 : 0 }}
    >
      {/* Header card */}
      <View style={[styles.headerCard, { backgroundColor: colors.primary }]}>
        <View style={styles.avatarBig}>
          <Text style={styles.avatarBigText}>
            {(membre.prenom?.[0] ?? "") + (membre.nom?.[0] ?? "")}
          </Text>
        </View>
        <Text style={styles.fullName}>{membre.prenom} {membre.nom}</Text>
        <Text style={styles.matricule}>{membre.matricule}</Text>
        <StatusBadge status={membre.statut} />
      </View>

      {/* PDF Actions */}
      <View style={styles.pdfRow}>
        <TouchableOpacity style={[styles.pdfBtn, { borderColor: "#1a5c3a" }]} onPress={handlePdfFiche} activeOpacity={0.8}>
          <Feather name="file-text" size={15} color="#1a5c3a" />
          <Text style={[styles.pdfBtnText, { color: "#1a5c3a" }]}>Fiche d'adhésion</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.pdfBtn, { borderColor: "#1a5c3a" }]} onPress={handlePdfReleve} activeOpacity={0.8}>
          <Feather name="download" size={15} color="#1a5c3a" />
          <Text style={[styles.pdfBtnText, { color: "#1a5c3a" }]}>Relevé cotisations</Text>
        </TouchableOpacity>
      </View>

      {/* Identity */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Informations personnelles</Text>
        <InfoRow label="Email" value={membre.email} />
        <InfoRow label="Téléphone" value={membre.telephone} />
        <InfoRow label="Date de naissance" value={formatDate(membre.dateNaissance)} />
        <InfoRow label="Situation familiale" value={membre.situationFamiliale} />
        <InfoRow label="Type d'adhésion" value={membre.typeAdhesion} />
        <InfoRow label="Date d'adhésion" value={formatDate(membre.dateAdhesion)} />
      </View>

      {/* Professional */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Informations professionnelles</Text>
        <InfoRow label="Poste" value={membre.poste} />
        <InfoRow label="Département" value={membre.departement} />
        <InfoRow label="Date d'embauche" value={formatDate(membre.dateEmbauche)} />
        <InfoRow label="Date CDI" value={formatDate(membre.dateCdi)} />
        <View style={styles.boolRow}>
          {membre.retraiteComplementaire && (
            <View style={[styles.boolBadge, { backgroundColor: colors.secondary }]}>
              <Feather name="check-circle" size={12} color={colors.primary} />
              <Text style={[styles.boolText, { color: colors.primary }]}>Retraite complémentaire</Text>
            </View>
          )}
          {membre.renonciationAssistances && (
            <View style={[styles.boolBadge, { backgroundColor: "#fee2e2" }]}>
              <Feather name="x-circle" size={12} color="#dc2626" />
              <Text style={[styles.boolText, { color: "#dc2626" }]}>Renonciation assistances</Text>
            </View>
          )}
        </View>
      </View>

      {/* Cotisations summary */}
      {cotisResume && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Cotisations</Text>
          <View style={styles.cotisRow}>
            <View style={styles.cotisItem}>
              <Text style={[styles.cotisValue, { color: colors.primary }]}>
                {formatFCFA(cotisResume.totalPaye ?? 0)}
              </Text>
              <Text style={[styles.cotisLabel, { color: colors.mutedForeground }]}>Total payé</Text>
            </View>
            <View style={[styles.cotisSep, { backgroundColor: colors.border }]} />
            <View style={styles.cotisItem}>
              <Text style={[styles.cotisValue, { color: (cotisResume.arrieres ?? 0) > 0 ? colors.destructive : colors.success }]}>
                {formatFCFA(cotisResume.arrieres ?? 0)}
              </Text>
              <Text style={[styles.cotisLabel, { color: colors.mutedForeground }]}>Arriérés</Text>
            </View>
          </View>
        </View>
      )}

      {/* Dependents */}
      {allDependents.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Personnes déclarées</Text>
          {allDependents.map((p: any) => (
            <View key={p.id} style={[styles.depRow, { borderTopColor: colors.border }]}>
              <View style={[styles.depAvatar, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.depAvatarText, { color: colors.primary }]}>
                  {(p.prenom?.[0] ?? "") + (p.nom?.[0] ?? "")}
                </Text>
              </View>
              <View>
                <Text style={[styles.depName, { color: colors.foreground }]}>{p.prenom} {p.nom}</Text>
                <Text style={[styles.depLien, { color: colors.mutedForeground }]}>
                  {LIEN_LABELS[p.lienParente] ?? p.lienParente}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* View assistances button */}
      <TouchableOpacity
        style={[styles.viewAssistancesBtn, { borderColor: colors.primary }]}
        onPress={() => router.push({ pathname: "/(tabs)/assistances" })}
        activeOpacity={0.8}
      >
        <Feather name="heart" size={16} color={colors.primary} />
        <Text style={[styles.viewAssistancesText, { color: colors.primary }]}>
          Voir les assistances
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerCard: {
    padding: 24,
    alignItems: "center",
    gap: 10,
    paddingBottom: 28,
  },
  avatarBig: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  avatarBigText: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    textTransform: "uppercase",
  },
  fullName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    textAlign: "center",
  },
  matricule: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
  },
  section: {
    margin: 14,
    marginBottom: 0,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 2,
    textAlign: "right",
  },
  boolRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  boolBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  boolText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  cotisRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cotisItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  cotisSep: { width: 1, height: 40 },
  cotisValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  cotisLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  depRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  depAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  depAvatarText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
  },
  depName: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  depLien: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  viewAssistancesBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    margin: 14,
    marginTop: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingVertical: 13,
  },
  viewAssistancesText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  pdfRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  pdfBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
  },
  pdfBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
});
