// app/index.tsx
import { Link, useRouter } from "expo-router";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function Landing() {
  const router = useRouter();
  return (
    <ScrollView
      style={{ backgroundColor: "#fff" }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
    >
      {/* Logo */}
      <View style={{ alignItems: "center", marginTop: 10, marginBottom: 20 }}>
        {/* Put a real logo in assets and update the require path */}
        <Image
          source={require("../assets/logo.png")}
          style={{ width: 80, height: 80, borderRadius: 16 }}
          resizeMode="contain"
        />
        <Text style={{ fontSize: 20, fontWeight: "600", marginTop: 8 }}>
          Trinket
        </Text>
        <Text style={{ color: "#666", marginTop: 4, textAlign: "center" }}>
          Your personal archive—catalog items, photos, and notes.
        </Text>
      </View>

      {/* Hero */}
      <View
        style={{
          backgroundColor: "#F5F7FB",
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: 8 }}>
          Organize everything at home
        </Text>
        <Text style={{ color: "#555", marginBottom: 12 }}>
          Snap a photo, add details, and find it fast later. Works on web and
          mobile.
        </Text>

        {/* CTAs */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Link href="/signup" asChild>
            <TouchableOpacity
              style={{
                backgroundColor: "#111827",
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 10,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>
                Create account
              </Text>
            </TouchableOpacity>
          </Link>

          <Link href="/login" asChild>
            <TouchableOpacity
              style={{
                borderColor: "#111827",
                borderWidth: 1,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 10,
              }}
            >
              <Text style={{ color: "#111827", fontWeight: "600" }}>Sign in</Text>
            </TouchableOpacity>
          </Link>
          {__DEV__ && (
            <TouchableOpacity
              onPress={() => router.replace("/home")}
              style={{
                borderColor: "#10B981",
                borderWidth: 1,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 10,
              }}
            >
              <Text style={{ color: "#10B981", fontWeight: "600" }}>Preview logged-in</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* (Optional) Hero image */}
        <View
          style={{
            backgroundColor: "#E8ECF7",
            borderRadius: 12,
            height: 160,
            marginTop: 14,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Replace with a real screenshot */}
          <Text style={{ color: "#4B5563" }}>[ App screenshot here ]</Text>
        </View>
      </View>

      {/* Value props */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 8 }}>
          Why people use Trinket
        </Text>

        <FeatureCard
          title="Fast add"
          text="Take a photo, name the item, add notes and tags."
        />
        <FeatureCard
          title="Smart search"
          text="Find by name, tag, room, or photo."
        />
        <FeatureCard
          title="PDF lookbooks"
          text="Export items into clean, shareable PDFs."
        />
        <FeatureCard
          title="Secure sync"
          text="Your data is synced across web and mobile."
        />
      </View>

      {/* How it works */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 8 }}>
          How it works
        </Text>
        <Step n="1" text="Snap photos of your items." />
        <Step n="2" text="Add details like location and value." />
        <Step n="3" text="Search, filter, and export to PDF." />
      </View>

      {/* Pricing teaser */}
      <View
        style={{
          backgroundColor: "#F9FAFB",
          borderRadius: 12,
          padding: 14,
          marginBottom: 16,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "700", marginBottom: 6 }}>
          Simple pricing
        </Text>
        <Text style={{ color: "#555", marginBottom: 10 }}>
          Free to start. Upgrade anytime.
        </Text>
        <Link href="/pricing" asChild>
          <TouchableOpacity
            style={{
              backgroundColor: "#111827",
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 10,
              alignSelf: "flex-start",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>See pricing</Text>
          </TouchableOpacity>
        </Link>
      </View>

      {/* Footer links */}
      <View style={{ alignItems: "center", gap: 8 }}>
        <Link href="/about">
          <Text style={{ color: "#2563EB" }}>About</Text>
        </Link>
        <Link href="/login">
          <Text style={{ color: "#2563EB" }}>Sign in</Text>
        </Link>
        <Text style={{ color: "#9CA3AF", marginTop: 8 }}>
          © {new Date().getFullYear()} Trinket
        </Text>
      </View>
    </ScrollView>
  );
}

function FeatureCard({ title, text }: { title: string; text: string }) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
      }}
    >
      <Text style={{ fontWeight: "700", marginBottom: 4 }}>{title}</Text>
      <Text style={{ color: "#555" }}>{text}</Text>
    </View>
  );
}

function Step({ n, text }: { n: string; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: "#111827",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 10,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "700" }}>{n}</Text>
      </View>
      <Text style={{ color: "#374151" }}>{text}</Text>
    </View>
  );
}