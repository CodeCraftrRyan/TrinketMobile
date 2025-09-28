import { Pressable, Text } from "react-native";

export function Button({ title, onPress, disabled }: { title:string; onPress:() => void; disabled?:boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`bg-primary rounded-md px-4 py-3 ${disabled ? "opacity-50" : ""}`}
      style={{ shadowColor:"#000", shadowOpacity:0.25, shadowRadius:10, shadowOffset:{width:0,height:6}, elevation:5 }}
    >
      <Text className="text-white text-base text-center" style={{ fontFamily: "Inter_600SemiBold" }}>
        {title}
      </Text>
    </Pressable>
  );
}