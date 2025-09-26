import React from "react";
import { Tabs } from "expo-router";

export default function RootLayout() {
  return (
    <Tabs screenOptions={{ headerTitleAlign: "center" }}>
      {/* the tabs group */}
      <Tabs.Screen name="(tabs)" options={{ headerShown: false }} />
      {/* single screens (not in tab bar) */}
      <Tabs.Screen name="login" options={{ href: null }} />
      <Tabs.Screen name="about" options={{ href: null }} />
    </Tabs>
  );
}