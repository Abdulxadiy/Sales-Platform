import { useDebounced, usePagedResource } from '../../hooks/usePagedResource';
import { ListState } from '../../components/ui/ListState';
import { usePermissions } from '../auth/usePermissions';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Check, ChevronRight, Plus, Search } from 'lucide-react-native';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme/tokens';
import { SelectedCustomer } from '../cart/CartContext';
import { request } from '../../api/client';



interface CustomerPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  selectedCustomerId?: number;
  onSelectCustomer: (customer: SelectedCustomer) => void;
}

const parseCustomer = (row: any): SelectedCustomer => { if (!row || typeof row.name !== 'string') throw Error('Mijoz ma’lumotlari tasdiqlanmadi.'); return { id: row.id, name: row.name, phoneNumber: row.phone_number || '' }; };

export const CustomerPickerSheet: React.FC<CustomerPickerSheetProps> = ({
  visible,
  onClose,
  selectedCustomerId,
  onSelectCustomer,
}) => {
  const { colors } = useTheme();
  const { can, requirePermission } = usePermissions();
  const [search, setSearch] = useState('');
  const query = useDebounced(search.trim());
  const resource = usePagedResource<SelectedCustomer>(visible ? '/sales/counterparties/?search=' + encodeURIComponent(query) : null, parseCustomer);
  const customers = resource.rows;
  const [selectedId, setSelectedId] = useState<number | undefined>(selectedCustomerId);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    // Reset the draft selection when its externally controlled value changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedId(selectedCustomerId);
  }, [selectedCustomerId]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase() || '')
      .join('');
  };

  const handleCreateCustomer = async () => {
    if (!newName.trim() || !newPhone.trim()) return;
    setCreateLoading(true); setCreateError('');
    try {
      requirePermission('sales.manage_counterparty');
      const created = await request('/sales/counterparties/', {
        method: 'POST',
        body: { name: newName.trim(), phone_number: newPhone.trim() },
      });

      if (!created?.id) throw Error('Server mijozni tasdiqlamadi');
      const newCust: SelectedCustomer = {
        id: created.id,
        name: created.name,
        phoneNumber: created.phoneNumber || created.phone_number,
      };

      void resource.reload();
      onSelectCustomer(newCust);
      setIsCreating(false);
      setNewName('');
      setNewPhone('');
    } catch (error: any) {
      setCreateError(error.message || 'Mijoz yaratilmadi');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleConfirmSelection = () => {
    const found = customers.find((c) => c.id === selectedId);
    if (found) {
      onSelectCustomer(found);
    }
  };

  return (
    <BottomSheet scrollable={isCreating} visible={visible} onClose={onClose} title="Mijoz tanlash">
      <View style={styles.content}>
        {createError ? <Text style={{ color: colors.danger }}>{createError}</Text> : null}
        {/* Search input */}
        <View style={[styles.searchBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
          <Search size={16} color={colors.textMuted} />
          <TextInput
            accessibilityLabel="Mijoz qidirish"
            placeholder="Ism yoki telefon"
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>

        {/* Create Customer Toggle Button */}
        {!isCreating ? (
          <TouchableOpacity accessibilityRole="button"
            disabled={!can('sales.manage_counterparty')}
            onPress={() => setIsCreating(true)}
            style={[styles.createBtn, { borderColor: colors.border }]}
          >
            <Plus size={16} color={colors.text} />
            <Text style={[styles.createBtnText, { color: colors.text }]}>Yangi mijoz</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.createForm, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <TextInput accessibilityLabel="Mijoz ismi"
              placeholder="Mijoz ismi"
              placeholderTextColor={colors.textMuted}
              value={newName}
              onChangeText={setNewName}
              style={[styles.createInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
            />
            <TextInput accessibilityLabel="+998 90 123 45 67"
              placeholder="+998 90 123 45 67"
              placeholderTextColor={colors.textMuted}
              value={newPhone}
              onChangeText={setNewPhone}
              keyboardType="phone-pad"
              style={[styles.createInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
            />
            <View style={styles.formActionRow}>
              <Button
                title="Bekor qilish"
                variant="secondary"
                size="sm"
                onPress={() => setIsCreating(false)}
                style={{ flex: 1, marginRight: spacing.sm }}
              />
              <Button
                title="Saqlash"
                size="sm"
                loading={createLoading}
                onPress={handleCreateCustomer}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}

        {/* Customer List */}
        {!isCreating && <FlatList
          data={customers}
          keyExtractor={(item) => String(item.id)}
          style={styles.list}
          onEndReached={() => { void resource.loadMore(); }}
          ListEmptyComponent={<ListState loading={resource.loading} error={resource.error} empty onRetry={resource.retry} />}
          ListFooterComponent={customers.length ? <><ListState loading={resource.loadingMore} error={resource.error} onRetry={resource.retry} />{resource.hasMore && <Button title="Yana mijozlar" variant="secondary" onPress={() => { void resource.loadMore(); }} />}</> : undefined}
          renderItem={({ item }) => {
            const isSelected = selectedId === item.id;
            return (
              <TouchableOpacity accessibilityRole="button"
                onPress={() => setSelectedId(item.id)}
                style={[
                  styles.customerRow,
                  { borderBottomColor: colors.borderSubtle },
                ]}
              >
                <View
                  style={[
                    styles.initialsCircle,
                    {
                      backgroundColor: isSelected ? colors.primaryAction : colors.surfaceSecondary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.initialsText,
                      {
                        color: isSelected ? colors.primaryActionText : colors.text,
                      },
                    ]}
                  >
                    {getInitials(item.name)}
                  </Text>
                </View>

                <View style={styles.infoCol}>
                  <Text style={[styles.custName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.custPhone, { color: colors.textSecondary }]}>
                    {item.phoneNumber}
                  </Text>
                </View>

                {isSelected ? (
                  <Check size={18} color={colors.text} strokeWidth={2.5} />
                ) : (
                  <ChevronRight size={18} color={colors.textMuted} />
                )}
              </TouchableOpacity>
            );
          }}
        />}

        {/* Confirm Selection Button */}
        <Button
          title="Tanlash"
          size="lg"
          fullWidth
          onPress={handleConfirmSelection}
          style={styles.selectBtn}
        />
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingVertical: spacing.sm,
    maxHeight: 480,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 40,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: typography.size.sm,
    paddingVertical: 0,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  createBtnText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    marginLeft: spacing.xs,
  },
  createForm: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  createInput: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    height: 38,
    marginBottom: spacing.sm,
    fontSize: typography.size.sm,
  },
  formActionRow: {
    flexDirection: 'row',
  },
  list: {
    maxHeight: 280,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  initialsCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  initialsText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
  },
  infoCol: {
    flex: 1,
  },
  custName: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  custPhone: {
    fontSize: typography.size.xs,
    marginTop: 2,
  },
  selectBtn: {
    marginTop: spacing.md,
  },
});
