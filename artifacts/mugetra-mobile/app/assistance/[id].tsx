import React from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";

import {
  useGetAssistance,
  useValiderAssistance,
  getListAssistancesQueryKey,
  getGetAssistanceQueryKey,
} from "@workspace/api-client-react";
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

const TYPE_LABELS: Record<string, string> = {
  deces_membre: "Décès membre actif",
  deces_conjoint: "Décès conjoint(e)",
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

const WORKFLOW_STEPS = [
  { key: "en_attente", label: "Déposée" },
  { key: "commission_affaires_sociales", label: "Com. Aff. Soc." },
  { key: "commission_prets", label: "Com. Prêts" },
  { key: "tresorerie", label: "Trésorerie" },
  { key: "bureau", label: "Bureau" },
  { key: "approuvee", label: "Approuvée" },
];

function WorkflowStepper({ statut }: { statut: string }) {
  const colors = useColors();
  if (statut === "rejetee" || statut === "payee") {
    return (
      <View style={[styles.statusFinal, {
        backgroundColor: statut === "payee" ? "#dcfce7" : "#fee2e2",
        borderColor: statut === "payee" ? "#86efac" : "#fca5a5",
      }]}>
        <Feather
          name={statut === "payee" ? "check-circle" : "x-circle"}
          size={20}
          color={statut === "payee" ? "#16a34a" : "#dc2626"}
        />
        <Text style={[styles.statusFinalText, { color: statut === "payee" ? "#16a34a" : "#dc2626" }]}>
          {statut === "payee" ? "Demande payée" : "Demande rejetée"}
        </Text>
      </View>
    );
  }

  const currentIdx = WORKFLOW_STEPS.findIndex((s) => s.key === statut);

  return (
    <View style={styles.stepper}>
      {WORKFLOW_STEPS.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <View key={step.key} style={styles.stepRow}>
            <View style={styles.stepLeft}>
              <View style={[
                styles.stepDot,
                { borderColor: done || active ? colors.primary : colors.border },
                (done || active) && { backgroundColor: done ? colors.primary : "transparent" },
              ]}>
                {done && <Feather name="check" size={10} color="#fff" />}
                {active && <View style={[styles.stepActiveDot, { backgroundColor: colors.primary }]} />}
              </View>
              {i < WORKFLOW_STEPS.length - 1 && (
                <View style={[styles.stepLine, { backgroundColor: done ? colors.primary : colors.border }]} />
              )}
            </View>
            <Text style={[
              styles.stepLabel,
              { color: active ? colors.primary : done ? colors.foreground : colors.mutedForeground },
              active && { fontFamily: "Inter_700Bold" },
            ]}>
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function AssistanceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: assistance, isLoading, isError } = useGetAssistance(Number(id), {
    query: { enabled: !!id },
  });

  const validerMutation = useValiderAssistance();

  const handleValider = (decision: "approuver" | "rejeter") => {
    const label = decision === "approuver" ? "approuver" : "rejeter";
    Alert.alert(
      `Confirmer`,
      `Voulez-vous ${label} cette demande ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: decision === "approuver" ? "Approuver" : "Rejeter",
          style: decision === "rejeter" ? "destructive" : "default",
          onPress: () => {
            validerMutation.mutate(
              {
                id: Number(id),
                data: { decision, commentaire: "" },
              },
              {
                onSuccess: () => {
                  queryClient.invalidateQueries({ queryKey: getGetAssistanceQueryKey(Number(id)) });
                  queryClient.invalidateQueries({ queryKey: getListAssistancesQueryKey() });
                },
                onError: () => {
                  Alert.alert("Erreur", "Impossible de valider la demande. Vérifiez vos droits.");
                },
              }
            );
          },
        },
      ]
    );
  };

  const handlePdfDownload = async () => {
    const token = await AsyncStorage.getItem("mugetra_token");
    const base = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
    await Linking.openURL(`${base}/api/pdf/assistances/${id}?token=${token}`);
  };

  if (isLoading) return <LoadingView message="Chargement de la demande..." />;
  if (isError || !assistance) {
    return (
      <EmptyView
        icon="alert-circle"
        title="Demande introuvable"
        subtitle="Cette demande n'existe pas ou a été supprimée."
        actionLabel="Retour"
        onAction={() => router.back()}
      />
    );
  }

  const canValidate = assistance.statut !== "approuvee" && assistance.statut !== "rejetee" && assistance.statut !== "payee";

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingTop: Platform.OS === "web" ? 67 : 0 }}
    >
      {/* Header */}
      <View style={[styles.headerCard, { backgroundColor: colors.primary }]}>
        <View style={[styles.typeIconBig, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
          <Feather name="heart" size={28} color="#fff" />
        </View>
        <Text style={styles.typeLabel}>{TYPE_LABELS[assistance.type ?? ""] ?? assistance.type}</Text>
        <StatusBadge status={assistance.statut ?? ""} />
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}
          onPress={handlePdfDownload}
          activeOpacity={0.8}
        >
          <Feather name="download" size={14} color="#fff" />
          <Text style={{ color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" }}>Télécharger PDF</Text>
        </TouchableOpacity>
      </View>

      {/* Details */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Détails de la demande</Text>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Membre</Text>
          <Text style={[styles.detailValue, { color: colors.foreground }]}>
            #{assistance.membreId}
          </Text>
        </View>
        {assistance.montantDemande != null && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Montant demandé</Text>
            <Text style={[styles.detailValue, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
              {formatFCFA(assistance.montantDemande)}
            </Text>
          </View>
        )}
        {assistance.montantApprouve != null && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Montant approuvé</Text>
            <Text style={[styles.detailValue, { color: colors.success, fontFamily: "Inter_700Bold" }]}>
              {formatFCFA(assistance.montantApprouve)}
            </Text>
          </View>
        )}
        {assistance.dateEvenement && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Date événement</Text>
            <Text style={[styles.detailValue, { color: colors.foreground }]}>
              {formatDate(assistance.dateEvenement)}
            </Text>
          </View>
        )}
        {assistance.nomDefunt && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Nom du défunt</Text>
            <Text style={[styles.detailValue, { color: colors.foreground }]}>{assistance.nomDefunt}</Text>
          </View>
        )}
        {assistance.lienParente && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Lien de parenté</Text>
            <Text style={[styles.detailValue, { color: colors.foreground }]}>{assistance.lienParente}</Text>
          </View>
        )}
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Déposée le</Text>
          <Text style={[styles.detailValue, { color: colors.foreground }]}>{formatDate(assistance.createdAt)}</Text>
        </View>
        {assistance.notes && (
          <View style={styles.notesBox}>
            <Text style={[styles.notesLabel, { color: colors.mutedForeground }]}>Notes</Text>
            <Text style={[styles.notesText, { color: colors.foreground }]}>{assistance.notes}</Text>
          </View>
        )}
      </View>

      {/* Workflow stepper */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Avancement du dossier</Text>
        <WorkflowStepper statut={assistance.statut ?? "en_attente"} />
      </View>

      {/* Validation history */}
      {(assistance as any).validations && (assistance as any).validations.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Historique des validations</Text>
          {(assistance as any).validations.map((v: any, i: number) => (
            <View key={v.id ?? i} style={[styles.histRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <View style={[styles.histDot, {
                backgroundColor: v.decision === "approuver" ? colors.success : v.decision === "rejeter" ? colors.destructive : colors.muted
              }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.histStep, { color: colors.foreground }]}>{v.etape ?? v.step}</Text>
                <Text style={[styles.histDate, { color: colors.mutedForeground }]}>{formatDate(v.createdAt)}</Text>
                {v.commentaire && (
                  <Text style={[styles.histComment, { color: colors.mutedForeground }]}>{v.commentaire}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Action buttons */}
      {canValidate && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.destructive, opacity: validerMutation.isPending ? 0.7 : 1 }]}
            onPress={() => handleValider("rejeter")}
            disabled={validerMutation.isPending}
            activeOpacity={0.8}
          >
            {validerMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Feather name="x-circle" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>Rejeter</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.success, opacity: validerMutation.isPending ? 0.7 : 1 }]}
            onPress={() => handleValider("approuver")}
            disabled={validerMutation.isPending}
            activeOpacity={0.8}
          >
            {validerMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Feather name="check-circle" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>Approuver</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerCard: {
    padding: 28,
    alignItems: "center",
    gap: 10,
  },
  typeIconBig: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  typeLabel: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    textAlign: "center",
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
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  detailValue: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 2,
    textAlign: "right",
  },
  notesBox: { gap: 4 },
  notesLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  notesText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  stepper: { gap: 0 },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    minHeight: 36,
  },
  stepLeft: {
    alignItems: "center",
    width: 20,
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  stepActiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepLine: {
    width: 2,
    flex: 1,
    minHeight: 16,
  },
  stepLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    paddingTop: 1,
    flex: 1,
  },
  statusFinal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
  },
  statusFinalText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  histRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingTop: 10,
  },
  histDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 3,
  },
  histStep: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  histDate: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  histComment: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    paddingTop: 20,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 10,
    paddingVertical: 13,
  },
  actionBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
