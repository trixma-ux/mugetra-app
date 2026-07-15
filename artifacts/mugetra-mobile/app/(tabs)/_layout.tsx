import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs, useRouter } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useGetCurrentUser } from "@workspace/api-client-react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { getStoredToken } from "@/context/AuthContext";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "chart.bar", selected: "chart.bar.fill" }} />
        <Label>Tableau</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="membres">
        <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
        <Label>Membres</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="cotisations">
        <Icon sf={{ default: "banknote", selected: "banknote.fill" }} />
        <Label>Cotisations</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="assistances">
        <Icon sf={{ default: "heart", selected: "heart.fill" }} />
        <Label>Assistances</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="annonces">
        <Icon sf={{ default: "megaphone", selected: "megaphone.fill" }} />
        <Label>Annonces</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: true,
        headerStyle: { backgroundColor: colors.header },
        headerTintColor: colors.headerForeground,
        headerTitleStyle: { fontFamily: "Inter_600SemiBold", fontSize: 17 },
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.tabBar,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.tabBar }]} />
          ) : null,
        tabBarLabelStyle: { fontFamily: "Inter_500Medium", fontSize: 10 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Tableau de bord",
          tabBarLabel: "Tableau",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="chart.bar.fill" tintColor={color} size={22} />
            ) : (
              <Feather name="bar-chart-2" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="membres"
        options={{
          title: "Membres",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person.2.fill" tintColor={color} size={22} />
            ) : (
              <Feather name="users" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="cotisations"
        options={{
          title: "Cotisations",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="banknote.fill" tintColor={color} size={22} />
            ) : (
              <Feather name="credit-card" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="assistances"
        options={{
          title: "Assistances",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="heart.fill" tintColor={color} size={22} />
            ) : (
              <Feather name="heart" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="annonces"
        options={{
          title: "Annonces",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="megaphone.fill" tintColor={color} size={22} />
            ) : (
              <Feather name="bell" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: user, isError } = useGetCurrentUser({ query: { retry: false } });

  useEffect(() => {
    const init = async () => {
      const token = await getStoredToken();
      if (token) {
        setAuthTokenGetter(() => token);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (isError) {
      router.replace("/login");
    }
  }, [isError, router]);

  return <>{children}</>;
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return (
      <AuthGate>
        <NativeTabLayout />
      </AuthGate>
    );
  }
  return (
    <AuthGate>
      <ClassicTabLayout />
    </AuthGate>
  );
}
