import React from "react";
import {
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useListAnnonces } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { LoadingView } from "@/components/LoadingView";
import { EmptyView } from "@/components/EmptyView";

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function AnnoncesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { data: annonces, isLoading, refetch, isRefetching } = useListAnnonces();

  if (isLoading) return <LoadingView message="Chargement des annonces..." />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={annonces ?? []}
        keyExtractor={(item) => String(item.id)}
        scrollEnabled={!!(annonces?.length)}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
        contentContainerStyle={[
          styles.list,
          { paddingTop: Platform.OS === "web" ? 67 + 14 : 14, paddingBottom: insets.bottom + 100 },
          (!annonces || annonces.length === 0) && { flex: 1 },
        ]}
        ListEmptyComponent={
          <EmptyView
            icon="bell"
            title="Aucune annonce"
            subtitle="Il n'y a aucune annonce pour le moment."
          />
        }
        renderItem={({ item }) => (
          <View style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: item.important ? colors.accent : colors.border },
            item.important && { borderWidth: 2 }
          ]}>
            {item.important && (
              <View style={[styles.importantBadge, { backgroundColor: colors.accent }]}>
                <Feather name="alert-circle" size={12} color="#fff" />
                <Text style={styles.importantText}>Important</Text>
              </View>
            )}
            <Text style={[styles.title, { color: colors.foreground }]}>{item.titre}</Text>
            <Text style={[styles.contenu, { color: colors.mutedForeground }]} numberOfLines={4}>
              {item.contenu}
            </Text>
            <View style={styles.footer}>
              <Text style={[styles.date, { color: colors.mutedForeground }]}>
                {formatDate(item.createdAt)}
              </Text>
              {item.publiePar && (
                <Text style={[styles.author, { color: colors.mutedForeground }]}>
                  Par {item.publiePar}
                </Text>
              )}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: 14, gap: 12 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  importantBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  importantText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  title: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    lineHeight: 22,
  },
  contenu: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  date: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  author: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
});
