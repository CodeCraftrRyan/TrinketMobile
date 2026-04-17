import { Text, TextStyle, View, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { theme } from '../../lib/theme';

export type BrandHeaderProps = {
  title?: string;
  subtitle?: string;
  layout?: 'row' | 'column';
  align?: 'left' | 'center';
  iconSize?: number;
  iconColor?: string;
  textColor?: string;
  subtitleColor?: string;
  iconBackgroundColor?: string;
  iconBackgroundBorderColor?: string;
  iconBackgroundSize?: number;
  iconBackgroundRadius?: number;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  subtitleStyle?: TextStyle;
};

export default function BrandHeader({
  title = 'Trinket',
  subtitle,
  layout = 'row',
  align = 'left',
  iconSize = 24,
  iconColor = theme.accent,
  textColor = theme.primary,
  subtitleColor = theme.inkLight,
  iconBackgroundColor,
  iconBackgroundBorderColor,
  iconBackgroundSize,
  iconBackgroundRadius,
  style,
  titleStyle,
  subtitleStyle,
}: BrandHeaderProps) {
  const isRow = layout === 'row';
  const alignItems = align === 'center' ? 'center' : 'flex-start';
  const textAlign: TextStyle['textAlign'] = align === 'center' ? 'center' : 'left';
  const backgroundSize = iconBackgroundSize ?? iconSize + 16;
  const backgroundRadius = iconBackgroundRadius ?? backgroundSize / 2;

  const icon = (
    <Svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 24 24"
      fill="none"
      stroke={iconColor}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <Path d="m3.3 7 8.7 5 8.7-5" />
      <Path d="M12 22V12" />
    </Svg>
  );

  return (
    <View style={[{ flexDirection: isRow ? 'row' : 'column', alignItems, gap: isRow ? 10 : 8 }, style]}>
      {iconBackgroundColor ? (
        <View
          style={{
            width: backgroundSize,
            height: backgroundSize,
            borderRadius: backgroundRadius,
            backgroundColor: iconBackgroundColor,
            borderWidth: iconBackgroundBorderColor ? 2 : 0,
            borderColor: iconBackgroundBorderColor,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </View>
      ) : (
        icon
      )}
      <View style={isRow ? undefined : { alignItems }}>
        <Text
          style={[
            {
              color: textColor,
              fontSize: 18,
              fontFamily: 'DMSans_700Bold',
              textAlign,
            },
            titleStyle,
          ]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[
              {
                color: subtitleColor,
                fontSize: 13,
                fontFamily: 'DMSans_300Light',
                letterSpacing: 1,
                marginTop: 2,
                textAlign,
              },
              subtitleStyle,
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
