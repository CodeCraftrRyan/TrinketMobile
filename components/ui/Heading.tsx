import React from "react";
import { Text, TextStyle } from "react-native";

type HeadingProps = {
	children: React.ReactNode;
	/** 1 = h1 (largest), 2 = h2, 3 = h3 */
	level?: 1 | 2 | 3;
	className?: string;
	style?: TextStyle | TextStyle[];
};

export function Heading({ children, level = 1, className = "", style }: HeadingProps) {
	const sizeClass = level === 1 ? "text-2xl" : level === 2 ? "text-xl" : "text-lg";
	const weightClass = "font-semibold";

	return (
		<Text
			className={`${sizeClass} ${weightClass} ${className}`.trim()}
			style={[{ fontFamily: level === 1 ? "Inter_700Bold" : "Inter_600SemiBold" }, ...(Array.isArray(style) ? style : [style])]}
		>
			{children}
		</Text>
	);
}

export default Heading;
