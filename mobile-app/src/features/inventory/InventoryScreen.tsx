import { isDesignPreview } from '../../dev/preview';
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAppNavigation as useNavigation } from '../../navigation/useAppNavigation';
import { AlertTriangle, Archive, Search, X } from 'lucide-react-native';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Badge } from '../../components/ui/Badge';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme/tokens';
import { CANONICAL_CART_ITEMS } from '../cart/CartContext';

interface InventoryItem {
  id: number;
  name: string;
  sku: string;
  barcode: string;
  currentStock: number;
  minStock: number;
  unit: string;
  costPrice: number;
  salePrice: number;
}

const INITIAL_INVENTORY: InventoryItem[] = CANONICAL_CART_ITEMS.map((item, index) => ({
  id: item.variantId,
  name: item.productName,
  sku: `SKU-${1000 + item.variantId}`,
  barcode: `478000000000${item.variantId}`,
  currentStock: [45, 12, 4, 30, 8, 15, 60, 3, 20, 10][index] || 15,
  minStock: 10,
  unit: item.unit,
  costPrice: Math.round(item.unitPrice * 0.8),
  salePrice: item.unitPrice,
}));

export const InventoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();

  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [search, setSearch] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState('');

  const filteredItems = inventory.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.barcode.includes(search) ||
      item.sku.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterLowStock ? item.currentStock <= item.minStock : true;
    return matchesSearch && matchesFilter;
  });

  const lowStockCount = inventory.filter((i) => i.currentStock <= i.minStock).length;

  const handleAdjustStock = () => {
    if (!selectedItem) return;
    const qty = parseInt(stockAdjustment, 10);
    if (isNaN(qty)) return;

    setInventory((prev) =>
      prev.map((i) =>
        i.id === selectedItem.id
          ? { ...i, currentStock: Math.max(0, i.currentStock + qty) }
          : i
      )
    );
    setSelectedItem(null);
    setStockAdjustment('');
  };

  if (!isDesignPreview) return <View style={{ flex: 1, padding: 24, backgroundColor: colors.background }}>
    <ScreenHeader title="API integratsiyasi kutilmoqda" onOpenDrawer={() => navigation.openDrawer()} />
    <Text style={{ color: colors.text }}>Bu bo‘lim hozircha dizayn prototipi. Haqiqiy ma’lumotlar va amallar hali tekshirilmagan.</Text>
  </View>;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Ombor"
        leftAction={{
          icon: 'menu',
          onPress: () => navigation.openDrawer(),
          accessibilityLabel: 'Menyu',
        }}
      />

      {/* Top Search & Filter Bar */}
      <View style={[styles.filterBar, { borderBottomColor: colors.borderSubtle }]}>
        <View style={[styles.searchInputWrapper, { backgroundColor: colors.surfaceSecondary }]}>
          <Search size={16} color={colors.textSecondary} style={{ marginRight: spacing.xs }} />
          <TextInput accessibilityLabel="Mahsulot yoki shtrix-kod qidirish..."
            value={search}
            onChangeText={setSearch}
            placeholder="Mahsulot yoki shtrix-kod qidirish..."
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
          onPress={() => setFilterLowStock(!filterLowStock)}
          style={[
            styles.filterPill,
            {
              backgroundColor: filterLowStock ? colors.primaryActionBg : colors.surfaceSecondary,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <AlertTriangle
            size={14}
            color={filterLowStock ? colors.primaryActionText : colors.textSecondary}
          />
          <Text
            style={[
              styles.filterPillText,
              { color: filterLowStock ? colors.primaryActionText : colors.text },
            ]}
          >
            Kam qolgan ({lowStockCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Items List */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isLow = item.currentStock <= item.minStock;

          return (
            <TouchableOpacity accessibilityRole="button"
              onPress={() => {
                setSelectedItem(item);
                setStockAdjustment('');
              }}
              style={[
                styles.itemCard,
                { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
              ]}
            >
              <View style={styles.itemHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.itemSub, { color: colors.textSecondary }]}>
                    {item.sku} • {item.barcode}
                  </Text>
                </View>
                <Badge
                  variant={isLow ? 'danger' : 'neutral'}
                  label={`${item.currentStock} ${item.unit}`}
                  dot={isLow}
                />
              </View>

              <View style={[styles.itemFooter, { borderTopColor: colors.borderSubtle }]}>
                <View>
                  <Text style={[styles.footerLabel, { color: colors.textTertiary }]}>Tannarxi</Text>
                  <Text style={[styles.footerVal, { color: colors.textSecondary }]}>
                    {item.costPrice.toLocaleString('uz-UZ')} so&#39;m
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.footerLabel, { color: colors.textTertiary }]}>Sotuv narxi</Text>
                  <Text style={[styles.footerVal, { color: colors.text }]}>
                    {item.salePrice.toLocaleString('uz-UZ')} so&#39;m
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Archive size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Omborda tovar topilmadi
            </Text>
          </View>
        }
      />

      {/* Stock Adjustment Bottom Sheet */}
      <BottomSheet
        visible={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title="Qoldiqni to'g'rilash"
      >
        {selectedItem && (
          <View style={styles.sheetBody}>
            <Text style={[styles.sheetItemTitle, { color: colors.text }]}>{selectedItem.name}</Text>
            <Text style={[styles.sheetItemSub, { color: colors.textSecondary }]}>
              Hozirgi qoldiq: {selectedItem.currentStock} {selectedItem.unit}
            </Text>

            <View style={styles.sheetInputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                Kiritish / Chiqarish miqdori (+ yoki -)
              </Text>
              <TextInput accessibilityLabel="Masalan: +5 yoki -2"
                value={stockAdjustment}
                onChangeText={setStockAdjustment}
                keyboardType="numeric"
                placeholder="Masalan: +5 yoki -2"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.sheetInput,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    color: colors.text,
                    borderColor: colors.borderSubtle,
                  },
                ]}
              />
            </View>

            <View style={styles.sheetActionRow}>
              <Button
                title="Bekor qilish"
                variant="secondary"
                onPress={() => setSelectedItem(null)}
                style={{ flex: 1 }}
              />
              <Button
                title="Saqlash"
                variant="primary"
                onPress={handleAdjustStock}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  itemCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  itemName: {
    fontSize: typography.body.fontSize,
    fontFamily: typography.body.fontFamily,
    fontWeight: '600',
  },
  itemSub: {
    fontSize: typography.caption.fontSize,
    fontFamily: typography.caption.fontFamily,
    marginTop: 2,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
  },
  footerLabel: {
    fontSize: typography.micro.fontSize,
    fontFamily: typography.micro.fontFamily,
  },
  footerVal: {
    fontSize: typography.caption.fontSize,
    fontFamily: typography.caption.fontFamily,
    fontWeight: '500',
    marginTop: 1,
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
  sheetItemTitle: {
    fontSize: typography.subheading.fontSize,
    fontFamily: typography.subheading.fontFamily,
    fontWeight: '600',
  },
  sheetItemSub: {
    fontSize: typography.body.fontSize,
    fontFamily: typography.body.fontFamily,
  },
  sheetInputGroup: {
    gap: spacing.xs,
  },
  inputLabel: {
    fontSize: typography.caption.fontSize,
    fontFamily: typography.caption.fontFamily,
    fontWeight: '500',
  },
  sheetInput: {
    height: 48,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    fontSize: typography.body.fontSize,
  },
  sheetActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
