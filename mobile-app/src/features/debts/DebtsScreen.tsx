import { useFeedback } from '../../hooks/useFeedback';
import { usePermissions } from '../auth/usePermissions';
import { tryMoney } from '../../domain/money';
import { isDesignPreview } from '../../dev/preview';
import React, { useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAppNavigation as useNavigation } from '../../navigation/useAppNavigation';
import { Search } from 'lucide-react-native';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Button } from '../../components/ui/Button';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Toast } from '../../components/ui/Toast';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme/tokens';
import { request } from '../../api/client';
import { useAuth } from '../auth/AuthContext';
import { withFinancialIdentity, confirmFinancialIdentity } from '../../api/financialIdentity';

export interface DebtItem {
  id: number;
  customerName: string;
  phoneNumber: string;
  amount: number;
  dueDate: string;
  status: 'future' | 'soon' | 'overdue';
}

export const CANONICAL_DEBTS: DebtItem[] = [
  { id: 1, customerName: 'Ali Valiyev', phoneNumber: '+998 90 123 45 67', amount: 230000, dueDate: '30.10.2026', status: 'future' },
  { id: 2, customerName: 'Dilnoza Karimova', phoneNumber: '+998 91 234 56 78', amount: 320000, dueDate: '25.10.2026', status: 'soon' },
  { id: 3, customerName: 'Aziz Rahimov', phoneNumber: '+998 93 345 67 89', amount: 180000, dueDate: '23.10.2026', status: 'overdue' },
  { id: 4, customerName: 'Malika Sobirova', phoneNumber: '+998 94 456 78 90', amount: 130000, dueDate: '02.11.2026', status: 'future' },
];

export const DebtsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, activeTenant } = useAuth();
  const submitting = useRef(false);
  const { can, requirePermission } = usePermissions();
  const { colors } = useTheme();

  const [debts, setDebts] = useState<DebtItem[]>(CANONICAL_DEBTS);
  const [filter, setFilter] = useState<'all' | 'soon' | 'overdue'>('all');
  const [search, setSearch] = useState('');

  const [selectedDebt, setSelectedDebt] = useState<DebtItem | null>(null);
  const [payAmountStr, setPayAmountStr] = useState('');
  const [paying, setPaying] = useState(false);
  const { message: toastMessage, type: toastType, show: setToastMessage } = useFeedback();

  const totalDebt = debts.reduce((sum, d) => sum + d.amount, 0);

  const soonCount = debts.filter((d) => d.status === 'soon').length;
  const overdueCount = debts.filter((d) => d.status === 'overdue').length;

  const filteredDebts = debts.filter((d) => {
    if (filter === 'soon' && d.status !== 'soon') return false;
    if (filter === 'overdue' && d.status !== 'overdue') return false;
    if (search) {
      return (
        d.customerName.toLowerCase().includes(search.toLowerCase()) ||
        d.phoneNumber.includes(search)
      );
    }
    return true;
  });

  const handleOpenPaySheet = (debt: DebtItem) => {
    if (!can('sales.record_debt_payment')) { setToastMessage('To‘lov kiritish uchun vakolat berilmagan.'); return; }
    setSelectedDebt(debt);
    setPayAmountStr(String(debt.amount));
  };

  const handleConfirmPayment = async () => {
    if (!selectedDebt || submitting.current) return;
    const payAmount = tryMoney(payAmountStr);
    if (payAmount === null || payAmount <= 0 || payAmount > selectedDebt.amount) { setToastMessage("To‘lov miqdorini tekshiring"); return; }
    submitting.current = true;

    setPaying(true);

    try {
      requirePermission('sales.record_debt_payment');
      await request(`/sales/counterparties/${selectedDebt.id}/payments/`, {
        method: 'POST',
        body: await withFinancialIdentity('debt-' + selectedDebt.id, {
          amount: payAmount,
          currency: 'UZS',
        }, user?.id, activeTenant?.id),
      });
      await confirmFinancialIdentity('debt-' + selectedDebt.id, user?.id, activeTenant?.id);

      setDebts((prev) =>
        prev
          .map((d) =>
            d.id === selectedDebt.id ? { ...d, amount: Math.max(0, d.amount - payAmount) } : d
          )
          .filter((d) => d.amount > 0)
      );

      setToastMessage("To'lov muvaffaqiyatli qabul qilindi");
      setSelectedDebt(null);
    } catch (error: any) {
      setToastMessage(error.message || 'To‘lov qabul qilinmadi', 'error');
    } finally {
      submitting.current = false;
      setPaying(false);
    }
  };

  const getStatusDotColor = (status: DebtItem['status']) => {
    if (status === 'overdue') return colors.danger;
    if (status === 'soon') return colors.warning;
    return colors.success;
  };

  if (!isDesignPreview) return <View style={{ flex: 1, padding: 24, backgroundColor: colors.background }}>
    <ScreenHeader title="API integratsiyasi kutilmoqda" onOpenDrawer={() => navigation.openDrawer()} />
    <Text style={{ color: colors.text }}>Bu bo‘lim hozircha dizayn prototipi. Haqiqiy ma’lumotlar va amallar hali tekshirilmagan.</Text>
  </View>;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader onOpenDrawer={() => navigation.openDrawer()} />

      <Toast
        type={toastType}
        visible={Boolean(toastMessage)}
        message={toastMessage || ''}
        onDismiss={() => setToastMessage(null)}
      />

      <View style={styles.headerInfo}>
        <Text style={[styles.title, { color: colors.text }]}>Qarzlar</Text>
        <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Jami qarz</Text>
        <Text style={[styles.totalAmount, { color: colors.text }]}>
          {totalDebt.toLocaleString('ru-RU')} so&#39;m
        </Text>
      </View>

      {/* Search Box */}
      <View style={styles.searchSection}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={18} color={colors.textMuted} />
          <TextInput accessibilityLabel="Mijoz qidirish (ism, telefon, STIR)"
            placeholder="Mijoz qidirish (ism, telefon, STIR)"
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>
      </View>

      {/* Filter Tabs (Board 27A) */}
      <View style={styles.tabsRow}>
        <TouchableOpacity accessibilityRole="button"
          onPress={() => setFilter('all')}
          style={[
            styles.tabBtn,
            {
              backgroundColor: filter === 'all' ? colors.primaryAction : colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              { color: filter === 'all' ? colors.primaryActionText : colors.text },
            ]}
          >
            Barchasi ({debts.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity accessibilityRole="button"
          onPress={() => setFilter('soon')}
          style={[
            styles.tabBtn,
            {
              backgroundColor: filter === 'soon' ? colors.primaryAction : colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              { color: filter === 'soon' ? colors.primaryActionText : colors.text },
            ]}
          >
            Muddati yaqin ({soonCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity accessibilityRole="button"
          onPress={() => setFilter('overdue')}
          style={[
            styles.tabBtn,
            {
              backgroundColor: filter === 'overdue' ? colors.primaryAction : colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              { color: filter === 'overdue' ? colors.primaryActionText : colors.text },
            ]}
          >
            Kechikkan ({overdueCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Debt Rows */}
      <FlatList
        data={filteredDebts}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View
            style={[
              styles.debtCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={[styles.avatarCircle, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[styles.avatarInitials, { color: colors.text }]}>
                {item.customerName.slice(0, 2).toUpperCase()}
              </Text>
            </View>

            <View style={styles.debtInfoCol}>
              <View style={styles.nameRow}>
                <Text style={[styles.customerName, { color: colors.text }]}>
                  {item.customerName}
                </Text>
                <Text style={[styles.debtAmount, { color: colors.text }]}>
                  {item.amount.toLocaleString('ru-RU')} so&#39;m
                </Text>
              </View>

              <Text style={[styles.customerPhone, { color: colors.textSecondary }]}>
                {item.phoneNumber}
              </Text>

              <View style={styles.dueDateRow}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: getStatusDotColor(item.status) },
                  ]}
                />
                <Text style={[styles.dueDateText, { color: colors.textSecondary }]}>
                  Muddati: {item.dueDate}
                </Text>
              </View>
            </View>

            <TouchableOpacity accessibilityRole="button"
              onPress={() => handleOpenPaySheet(item)}
              style={[
                styles.payBtn,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.payBtnText, { color: colors.text }]}>To&#39;lov olish</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Payment Bottom Sheet */}
      <BottomSheet
        visible={Boolean(selectedDebt)}
        onClose={() => setSelectedDebt(null)}
        title="Qarz to'lovini qabul qilish"
      >
        {selectedDebt ? (
          <View style={styles.paySheetContent}>
            <Text style={[styles.paySheetCustName, { color: colors.text }]}>
              {selectedDebt.customerName}
            </Text>
            <Text style={[styles.paySheetDebtDue, { color: colors.textSecondary }]}>
              Qarz summasi: {selectedDebt.amount.toLocaleString('ru-RU')} so&#39;m
            </Text>

            <Text style={[styles.payInputLabel, { color: colors.textSecondary }]}>
              To&#39;lanayotgan summa
            </Text>
            <View
              style={[
                styles.payInputContainer,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
              ]}
            >
              <TextInput accessibilityLabel="To‘lov summasi"
                value={payAmountStr}
                onChangeText={setPayAmountStr}
                keyboardType="decimal-pad"
                style={[styles.payInputField, { color: colors.text }]}
              />
              <Text style={[styles.payInputSuffix, { color: colors.textSecondary }]}>so&#39;m</Text>
            </View>

            <Button
              title="To'lovni tasdiqlash"
              size="lg"
              fullWidth
              loading={paying}
              onPress={handleConfirmPayment}
              style={{ marginTop: spacing.lg }}
            />
          </View>
        ) : null}
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerInfo: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  title: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
  },
  totalLabel: {
    fontSize: typography.size.xs,
    marginTop: spacing.xs,
  },
  totalAmount: {
    fontSize: typography.size.display,
    fontWeight: typography.weight.bold,
    marginBottom: spacing.sm,
  },
  searchSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 42,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: typography.size.sm,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  tabBtn: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  tabText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 80,
  },
  debtCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarInitials: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
  },
  debtInfoCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerName: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
  },
  debtAmount: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
  },
  customerPhone: {
    fontSize: typography.size.xs,
    marginTop: 2,
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  dueDateText: {
    fontSize: 11,
  },
  payBtn: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    marginLeft: spacing.md,
  },
  payBtnText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  paySheetContent: {
    paddingVertical: spacing.sm,
  },
  paySheetCustName: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },
  paySheetDebtDue: {
    fontSize: typography.size.sm,
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  payInputLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    marginBottom: spacing.xs,
  },
  payInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  payInputField: {
    flex: 1,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
  },
  payInputSuffix: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },
});
