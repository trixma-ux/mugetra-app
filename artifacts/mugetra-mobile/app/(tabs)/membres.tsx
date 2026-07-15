import React, { useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { useListMembres } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { StatusBadge } from "@/components/StatusBadge";
import { LoadingView } from "@/components/LoadingView";
import { EmptyView } from "@/components/EmptyView";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debouncedValue;
}

export default function MembresScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading, refetch, isRefetching } = useListMembres(
    { search: debouncedSearch || undefined, limit: 50 },
    { query: { keepPreviousData: true } as any }
  );

  const membres = data?.membres ?? [];

  if (isLoading) return <LoadingView message="Chargement des membres..." />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: Platform.OS === "web" ? 67 : 0 }]}>
        <View style={[styles.searchInput, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchText, { color: colors.foreground }]}
            placeholder="Rechercher un membre..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.count, { color: colors.mutedForeground }]}>
          {data?.total ?? 0} membres
        </Text>
      </View>

      <FlatList
        data={membres}
        keyExtractor={(item) => String(item.id)}
        scrollEnabled={!!membres.length}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 100 },
          membres.length === 0 && { flex: 1 },
        ]}
        ListEmptyComponent={
          <EmptyView
            icon="users"
            title="Aucun membre trouvé"
            subtitle={debouncedSearch ? `Aucun résultat pour "${debouncedSearch}"` : "La liste des membres est vide."}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(`/membre/${item.id}` as any)}
            activeOpacity={0.75}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {(item.prenom?.[0] ?? "") + (item.nom?.[0] ?? "")}
                </Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={[styles.name, { color: colors.foreground }]}>
                  {item.prenom} {item.nom}
                </Text>
                <Text style={[styles.matricule, { color: colors.mutedForeground }]}>
                  {item.matricule}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </View>
            <View style={styles.cardFooter}>
              <StatusBadge status={item.statut} />
              {item.departement && (
                <Text style={[styles.dept, { color: colors.mutedForeground }]}>
                  {item.departement}
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
  searchBar: {
    padding: 14,
    gap: 8,
    borderBottomWidth: 1,
  },
  searchInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  count: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    paddingLeft: 4,
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
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
  },
  cardInfo: { flex: 1 },
  name: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  matricule: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dept: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
