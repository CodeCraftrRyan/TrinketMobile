import { Platform, StyleSheet, Text, View } from 'react-native';
import { tokens } from '../../lib/tokens';
import { Button } from './Button';

type Props = {
  title: string;
  actionTitle?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  actionVariant?: 'primary' | 'soft' | 'ghost';
  style?: object;
  icon?: React.ReactNode;
};

export default function TabHeader({ title, actionTitle, onAction, actionDisabled, actionVariant = 'primary', style, icon }: Props) {
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.title}>{title}</Text>
      {icon}
      {actionTitle && onAction ? (
        <Button title={actionTitle} onPress={onAction} disabled={actionDisabled} variant={actionVariant} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingTop: Platform.OS === 'ios' ? 14 : 10, paddingRight: 4 },
  title: { fontSize: 22, fontWeight: '300', color: tokens.colors.ink, fontFamily: 'CormorantGaramond_300Light' },
});
