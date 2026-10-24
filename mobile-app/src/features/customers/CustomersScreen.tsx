import { usePermissions } from '../auth/usePermissions';
import { isDesignPreview } from '../../dev/preview';
import React, { useState } from 'react';
import { FlatList, Linking, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAppNavigation as useNavigation } from '../../navigation/useAppNavigation';
import { Clock, Phone, Search, Users, X } from 'lucide-react-native';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Badge } from '../../components/ui/Badge';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme/tokens';
import { request } from '../../api/client';

interface CustomerItem {
  id: number;
  name: string;
  phone_number: string;
  debt_amount: number;
  sales_count: number;
}

const INITIAL_CUSTOMERS: CustomerItem[] = [
  { id: 1, name: 'Ali Valiyev', phone_number: '+998 90 123 45 67', debt_amount: 320000, sales_count: 14 },
  { id: 2, name: 'Sardor Rahimov', phone_number: '+998 91 234 56 78', debt_amount: 190000, sales_count: 8 },
  { id: 3, name: 'Nodir Qodirov', phone_number: '+998 93 345 67 89', debt_amount: 150000, sales_count: 5 },
  { id: 4, name: 'Jasur Bekmirzayev', phone_number: '+998 94 456 78 90', debt_amount: 200000, sales_count: 11 },
  { id: 5, name: 'Dilshod Karimov', phone_number: '+998 97 567 89 01', debt_amount: 0, sales_count: 22 },
  { id: 6, name: 'Otabek Umarov', phone_number: '+998 99 678 90 12', debt_amount: 0, sales_count: 19 },
];

export const CustomersScreen: React.FC = () => {
  const navigation = useNavigation();
  const { can, requirePermission } = usePermissions();
  const { colors } = useTheme();

  const [customers, setCustomers] = useState<CustomerItem[]>(isDesignPreview ? INITIAL_CUSTOMERS : []);
  const [search, setSearch] = useState('');
  const [filterWithDebt, setFilterWithDebt] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('+998 ');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const filtered = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone_number.includes(search);
    const matchesDebt = filterWithDebt ? c.debt_amount > 0 : true;
    return matchesSearch && matchesDebt;
  });

  const totalDebt = customers.reduce((sum, c) => sum + c.debt_amount, 0);

  const handleCreateCustomer = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    setSaveError('');
    try {
      requirePermission('sales.manage_counterparty');
      const res = await request('/sales/counterparties/', { method: 'POST', body: { name: newName.trim(), phone_number: newPhone.trim() } });
      if (!res.id) throw Error('Server mijozni tasdiqlamadi');
      setCustomers(previous => [{ id: res.id, name: res.name, phone_number: res.phone_number || '', debt_amount: 0, sales_count: 0 }, ...previous]);

      setNewName('');
      setNewPhone('+998 ');
      setShowAddSheet(false);
    } catch (error: any) {
      setSaveError(error.message || 'Mijoz yaratilmadi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Mijozlar"
        leftAction={{
          icon: 'menu',
          onPress: () => navigation.openDrawer(),
          accessibilityLabel: 'Menyu',
        }}
        rightAction={can('sales.manage_counterparty') ? {
          icon: 'plus',
          onPress: () => { if (can('sales.manage_counterparty')) setShowAddSheet(true); },
          accessibilityLabel: 'Yangi mijoz',
        } : undefined}
      />

      {/* Overview Metric Banner */}
      <View style={[styles.metricBanner, { backgroundColor: colors.surface, borderBottomColor: colors.borderSubtle }]}>
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Jami mijozlar</Text>
          <Text style={[styles.metricValue, { color: colors.text }]}>{customers.length} nafar</Text>
        </View>
        <View style={[styles.metricDivider, { backgroundColor: colors.borderSubtle }]} />
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Umumiy nasiya</Text>
          <Text style={[styles.metricValue, { color: colors.text }]}>
            {totalDebt.toLocaleString('uz-UZ')} so&#39;m
          </Text>
        </View>
      </View>

      {/* Search & Filter Bar */}
      <View style={[styles.filterBar, { borderBottomColor: colors.borderSubtle }]}>
        <View style={[styles.searchInputWrapper, { backgroundColor: colors.surfaceSecondary }]}>
          <Search size={16} color={colors.textSecondary} style={{ marginRight: spacing.xs }} />
          <TextInput accessibilityLabel="Ism yoki telefon raqami..."
            value={search}
            onChangeText={setSearch}
            placeholder="Ism yoki telefon raqami..."
            placeholderTextColor={colors.textTertiary}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {search ? (
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Qidiruvni tozalash" onPress={() => setSearch('')}>
              <X size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity accessibilityRole="button"
          onPress={() => setFilterWithDebt(!filterWithDebt)}
          style={[
            styles.filterPill,
            {
              backgroundColor: filterWithDebt ? colors.primaryActionBg : colors.surfaceSecondary,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <Clock size={14} color={filterWithDebt ? colors.primaryActionText : colors.textSecondary} />
          <Text
            style={[
              styles.filterPillText,
              { color: filterWithDebt ? colors.primaryActionText : colors.text },
            ]}
          >
            Qarzdorlar
          </Text>
        </TouchableOpacity>
      </View>

      {/* Customer List */}
      {saveError ? <Text accessibilityRole="alert" style={{ color: colors.danger, padding: 12 }}>{saveError}</Text> : null}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View
            style={[
              styles.customerCard,
              { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.nameSection}>
                <Text style={[styles.nameText, { color: colors.text }]}>{item.name}</Text>
                <TouchableOpacity accessibilityRole="button"
                  onPress={() => Linking.openURL(`tel:${item.phone_number}`)}
                  style={styles.phoneLink}
                >
                  <Phone size={13} color={colors.textSecondary} />
                  <Text style={[styles.phoneText, { color: colors.textSecondary }]}>
                    {item.phone_number}
                  </Text>
                </TouchableOpacity>
              </View>

              {item.debt_amount > 0 ? (
                <Badge
                  variant="danger"
                  label={`${item.debt_amount.toLocaleString('uz-UZ')} so'm`}
                  dot
                />
              ) : (
                <Badge variant="neutral" label="Qarzi yo'q" />
              )}
            </View>

            <View style={[styles.cardFooter, { borderTopColor: colors.borderSubtle }]}>
              <Text style={[styles.footerText, { color: colors.textTertiary }]}>
                Savdolar soni: {item.sales_count} ta
              </Text>

              {item.debt_amount > 0 && (
                <TouchableOpacity accessibilityRole="button"
                  onPress={() => (navigation as any).navigate('MainTabs', { screen: 'Qarz' })}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.qarzActionLink, { color: colors.text }]}>
                    Qarzni yopish →
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Users size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Mijoz topilmadi
            </Text>
          </View>
        }
      />

      {/* Add Customer Sheet */}
      <BottomSheet
        visible={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        title="Yangi mijoz qo'shish"
      >
        <View style={styles.sheetBody}>
          <Input
            label="Mijoz ismi va familiyasi"
            value={newName}
            onChangeText={setNewName}
            placeholder="Masalan: Jasur Bekmirzayev"
          />

          <Input
            label="Telefon raqami"
            value={newPhone}
            onChangeText={setNewPhone}
            keyboardType="phone-pad"
            placeholder="+998 90 123 45 67"
          />

          <View style={styles.sheetActions}>
            <Button
              title="Bekor qilish"
              variant="secondary"
              onPress={() => setShowAddSheet(false)}
              style={{ flex: 1 }}
            />
            <Button
              title="Saqlash"
              variant="primary"
              loading={saving}
              disabled={!newName.trim()}
              onPress={handleCreateCustomer}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  metricBanner: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: '100%',
  },
  metricLabel: {
    fontSize: typography.micro.fontSize,
    fontFamily: typography.micro.fontFamily,
  },
  metricValue: {
    fontSize: typography.subheading.fontSize,
    fontFamily: typography.subheading.fontFamily,
    fontWeight: '700',
    marginTop: 2,
  },
  filterBar: {
    padding: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.body.fontSize,
    fontFamily: typography.body.fontFamily,
    paddingVertical: 0,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: typography.caption.fontSize,
    fontFamily: typography.caption.fontFamily,
    fontWeight: '500',
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  customerCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  nameSection: {
    flex: 1,
  },
  nameText: {
    fontSize: typography.body.fontSize,
    fontFamily: typography.body.fontFamily,
    fontWeight: '600',
  },
  phoneLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  phoneText: {
    fontSize: typography.caption.fontSize,
    fontFamily: typography.caption.fontFamily,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: typography.caption.fontSize,
    fontFamily: typography.caption.fontFamily,
  },
  qarzActionLink: {
    fontSize: typography.caption.fontSize,
    fontFamily: typography.caption.fontFamily,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: typography.body.fontSize,
    fontFamily: typography.body.fontFamily,
  },
  sheetBody: {
    padding: spacing.md,
    gap: spacing.md,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
