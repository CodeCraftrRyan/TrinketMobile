import React from "react";
import { View, Text } from "react-native";

export default function About() {
  return (
    <View style={{ flex:1, alignItems:"center", justifyContent:"center", padding:20 }}>
      <Text style={{ fontSize:20, textAlign:"center" }}>
        ℹ️ Trinket helps you save and remember your items.
      </Text>
    </View>
  );
}