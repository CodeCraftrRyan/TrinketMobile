import { Platform, StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';

type Props = {
  title: string;
  actionTitle?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  actionVariant?: 'primary' | 'ghost';
  style?: object;
};

export default function TabHeader({ title, actionTitle, onAction, actionDisabled, actionVariant = 'primary', style }: Props) {
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.title}>{title}</Text>
      {actionTitle && onAction ? (
        <Button title={actionTitle} onPress={onAction} disabled={actionDisabled} variant={actionVariant} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingTop: Platform.OS === 'ios' ? 14 : 10, paddingRight: 4 },
  title: { fontSize: 22, fontWeight: '600' },
});
