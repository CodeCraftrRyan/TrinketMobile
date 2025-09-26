import { View, Text, StyleSheet } from "react-native";
import React from "react";

export default function About() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        ℹ️ Trinket helps you save and remember your items.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
    padding: 20,
  },
  text: {
    fontSize: 20,
    color: "#1D446C",
    textAlign: "center",
  },
});