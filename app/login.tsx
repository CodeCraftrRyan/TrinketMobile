import { View, Text, StyleSheet } from "react-native";
import React from "react";

export default function Login() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔐 Login Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1D446C",
  },
});