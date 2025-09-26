import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Link } from "expo-router";

export default function Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏠 TrinketMobile Home</Text>

      <Link href="/login"><Text style={styles.link}>Go to Login</Text></Link>
      <Link href="/about"><Text style={styles.link}>About</Text></Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, alignItems:"center", justifyContent:"center", backgroundColor:"#F9FAFB", padding:20 },
  title:{ fontSize:26, fontWeight:"bold", color:"#1D446C", marginBottom:24 },
  link:{ fontSize:18, color:"#1D446C", marginVertical:8, textDecorationLine:"underline" }
});