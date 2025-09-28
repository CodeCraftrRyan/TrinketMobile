import { LinearGradient } from "expo-linear-gradient";
import { View, Text, Pressable, Image } from "react-native";
import { Link } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function Index() {
  return (
    <LinearGradient
      colors={["#0B0F14", "#0B0F14", "#101827"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <View className="flex-1 items-center justify-center px-6 gap-5">
        {/* logo (optional) — currently using an icon placeholder */}
        <Ionicons name="cube-outline" size={92} color="#E5E7EB" />

        <Text
          className="text-text text-3xl text-center"
          style={{ fontFamily: "Inter_600SemiBold" }}
        >
          Trinket
        </Text>
        <Text
          className="text-muted text-center"
          style={{ fontFamily: "Inter_400Regular" }}
        >
          Save, search, and organize your stuff.
        </Text>

        <Link href="/(tabs)" asChild>
          <Pressable className="bg-primary px-6 py-3 rounded-lg w-full max-w-[320px]"
            style={{ shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 12, shadowOffset:{width:0,height:8}, elevation:6 }}>
            <Text className="text-white text-center text-base" style={{ fontFamily: "Inter_600SemiBold" }}>
              Enter App
            </Text>
          </Pressable>
        </Link>

        <View className="flex-row gap-3">
          <Link href="/(auth)/login" asChild>
            <Pressable className="bg-card border border-border px-4 py-3 rounded-md"
              style={{ shadowColor:"#000", shadowOpacity:0.15, shadowRadius:8, elevation:4 }}>
              <Text className="text-text" style={{ fontFamily: "Inter_400Regular" }}>Log in</Text>
            </Pressable>
          </Link>

          <Link href="/(auth)/signup" asChild>
            <Pressable className="bg-card border border-border px-4 py-3 rounded-md"
              style={{ shadowColor:"#000", shadowOpacity:0.15, shadowRadius:8, elevation:4 }}>
              <Text className="text-text" style={{ fontFamily: "Inter_400Regular" }}>Sign up</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </LinearGradient>
  );
}