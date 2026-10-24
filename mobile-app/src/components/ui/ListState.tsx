import { ActivityIndicator, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Button } from './Button';
export function ListState({ loading, error, empty, onRetry, emptyLabel = 'Ma’lumot topilmadi' }: { loading?: boolean; error?: any; empty?: boolean; onRetry: () => void; emptyLabel?: string }) {
  const { colors } = useTheme();
  if (loading) return <View style={{ padding: 24 }}><ActivityIndicator accessibilityLabel="Yuklanmoqda" color={colors.text} /></View>;
  if (error) return <View style={{ padding: 16, gap: 12 }}><Text accessibilityRole="alert" style={{ color: colors.danger }}>{error.message || String(error)}</Text><Button title="Qayta urinish" variant="secondary" onPress={onRetry} /></View>;
  return empty ? <Text style={{ color: colors.textSecondary, padding: 24, textAlign: 'center' }}>{emptyLabel}</Text> : null;
}
