import { Stack } from 'expo-router';

export default function ItemsLayout() {
  // Use a Stack for nested item routes so child pages (like [id].tsx) are pushed
  // onto a stack instead of becoming separate tabs in the bottom tab bar.
  return <Stack screenOptions={{ headerShown: false }} />;
}
