import { View, Text, Pressable } from "react-native";

export default function Home() {
  return (
    <View className="flex-1 bg-bg items-center justify-center">
      <Text className="text-text text-2xl mb-6">Tailwind Works!</Text>
      <Pressable className="bg-primary px-4 py-3 rounded-md">
        <Text className="text-white">Button</Text>
      </Pressable>
    </View>
  );
}