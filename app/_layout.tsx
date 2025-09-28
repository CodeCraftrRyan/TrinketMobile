import "./app.css";
import { Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0B0F14" },
        headerTintColor: "#E5E7EB",
      }}
    />
  );
}
