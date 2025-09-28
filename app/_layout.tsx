import "./app.css";
import { Stack } from "expo-router";
import { useFonts, Inter_400Regular, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { View, StatusBar } from "react-native";

export default function Layout() {
  const [loaded] = useFonts({ Inter_400Regular, Inter_600SemiBold });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: "#0B0F14" }} />;

  return (
    <>
      <StatusBar barStyle="light-content" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0B0F14" },
          headerTintColor: "#E5E7EB",
          headerTitleStyle: { fontFamily: "Inter_600SemiBold" },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" />
      </Stack>
    </>
  );
}