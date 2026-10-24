import { isDesignPreview } from '../../dev/preview';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppNavigation as useNavigation } from '../../navigation/useAppNavigation';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { CreditCard, DollarSign, Printer, Receipt } from 'lucide-react-native';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Button } from '../../components/ui/Button';
import { Toast } from '../../components/ui/Toast';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme/tokens';
import { useAuth } from '../auth/AuthContext';

export const ReportsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { activeTenant } = useAuth();

  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  const reportData = {
    today: {
      total: 2450000,
      cash: 1800000,
      card: 490000,
      debt: 160000,
      salesCount: 24,
      avgCheck: 102083,
    },
    week: {
      total: 16800000,
      cash: 11900000,
      card: 3700000,
      debt: 1200000,
      salesCount: 162,
      avgCheck: 103703,
    },
    month: {
      total: 72400000,
      cash: 51200000,
      card: 16100000,
      debt: 5100000,
      salesCount: 685,
      avgCheck: 105693,
    },
  }[period];

  const handlePrintZReport = async () => {
    setLoadingPdf(true);
    try {
      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              body { font-family: monospace; padding: 20px; font-size: 13px; max-width: 300px; margin: auto; }
              .center { text-align: center; }
              .bold { font-weight: bold; }
              .divider { border-top: 1px dashed #000; margin: 8px 0; }
              .row { display: flex; justify-content: space-between; margin: 4px 0; }
            </style>
          </head>
          <body>
            <div class="center bold" style="font-size: 16px;">${activeTenant?.name || 'ILBI Savdo'}</div>
            <div class="center">Z-HISOBOT (KUNLIK YOPILISH)</div>
            <div class="center" style="font-size: 11px;">Sana: ${new Date().toLocaleDateString('uz-UZ')} ${new Date().toLocaleTimeString('uz-UZ')}</div>
            <div class="divider"></div>
            <div class="row"><span>Savdolar soni:</span><span class="bold">${reportData.salesCount} ta</span></div>
            <div class="row"><span>Jami tushum:</span><span class="bold">${reportData.total.toLocaleString('uz-UZ')} UZS</span></div>
            <div class="divider"></div>
            <div class="row"><span>Naqd pul:</span><span>${reportData.cash.toLocaleString('uz-UZ')} UZS</span></div>
            <div class="row"><span>Plastik karta:</span><span>${reportData.card.toLocaleString('uz-UZ')} UZS</span></div>
            <div class="row"><span>Nasiya (Qarz):</span><span>${reportData.debt.toLocaleString('uz-UZ')} UZS</span></div>
            <div class="divider"></div>
            <div class="row"><span>O'rtacha chek:</span><span>${reportData.avgCheck.toLocaleString('uz-UZ')} UZS</span></div>
            <div class="divider"></div>
            <div class="center" style="margin-top: 15px; font-size: 10px;">ilbi.uz orqali yaratildi</div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Z-Hisobotni ulashish',
          UTI: 'com.adobe.pdf',
        });
      } else {
        setToastMessage('Z-Hisobot PDF yaratildi');
      }
    } catch {
      setToastMessage('Hisobotni yaratishda xatolik');
    } finally {
      setLoadingPdf(false);
    }
  };

  if (!isDesignPreview) return <View style={{ flex: 1, padding: 24, backgroundColor: colors.background }}>
    <ScreenHeader title="API integratsiyasi kutilmoqda" onOpenDrawer={() => navigation.openDrawer()} />
    <Text style={{ color: colors.text }}>Bu bo‘lim hozircha dizayn prototipi. Haqiqiy ma’lumotlar va amallar hali tekshirilmagan.</Text>
  </View>;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Hisobotlar"
        leftAction={{
          icon: 'menu',
          onPress: () => navigation.openDrawer(),
          accessibilityLabel: 'Menyu',
        }}
      />

      {/* Segmented Period Control */}
      <View style={[styles.periodBar, { backgroundColor: colors.surfaceSecondary }]}>
        {(['today', 'week', 'month'] as const).map((p) => {
          const label = p === 'today' ? 'Bugun' : p === 'week' ? 'Haftalik' : 'Oylik';
          const active = period === p;
          return (
            <TouchableOpacity accessibilityRole="button"
              key={p}
              onPress={() => setPeriod(p)}
              style={[
                styles.periodTab,
                active && { backgroundColor: colors.surface, shadowColor: '#000', elevation: 2 },
              ]}
            >
              <Text
                style={[
                  styles.periodTabText,
                  { color: active ? colors.text : colors.textSecondary },
                  active && { fontWeight: '700' },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Main KPI Card */}
        <View style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Jami savdo tushumi</Text>
          <Text style={[styles.kpiValue, { color: colors.text }]}>
            {reportData.total.toLocaleString('uz-UZ')} <Text style={styles.kpiCurrency}>so&#39;m</Text>
          </Text>

          <View style={[styles.kpiGrid, { borderTopColor: colors.borderSubtle }]}>
            <View style={styles.kpiSubItem}>
              <Text style={[styles.subLabel, { color: colors.textTertiary }]}>Savdolar soni</Text>
              <Text style={[styles.subValue, { color: colors.text }]}>{reportData.salesCount} ta</Text>
            </View>
            <View style={[styles.verticalLine, { backgroundColor: colors.borderSubtle }]} />
            <View style={styles.kpiSubItem}>
              <Text style={[styles.subLabel, { color: colors.textTertiary }]}>O&#39;rtacha chek</Text>
              <Text style={[styles.subValue, { color: colors.text }]}>
                {reportData.avgCheck.toLocaleString('uz-UZ')} so&#39;m
              </Text>
            </View>
          </View>
        </View>

        {/* Breakdown by Payment Method */}
        <View style={[styles.breakdownCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>To&#39;lov turlari bo&#39;yicha</Text>

          {/* Cash */}
          <View style={styles.paymentRow}>
            <View style={styles.paymentLeft}>
              <View style={[styles.iconBox, { backgroundColor: colors.surfaceSecondary }]}>
                <DollarSign size={16} color={colors.text} />
              </View>
              <View>
                <Text style={[styles.payTitle, { color: colors.text }]}>Naqd pul</Text>
                <Text style={[styles.payPercent, { color: colors.textSecondary }]}>
                  {Math.round((reportData.cash / reportData.total) * 100)}%
                </Text>
              </View>
            </View>
            <Text style={[styles.payAmount, { color: colors.text }]}>
              {reportData.cash.toLocaleString('uz-UZ')} so&#39;m
            </Text>
          </View>

          {/* Card */}
          <View style={styles.paymentRow}>
            <View style={styles.paymentLeft}>
              <View style={[styles.iconBox, { backgroundColor: colors.surfaceSecondary }]}>
                <CreditCard size={16} color={colors.text} />
              </View>
              <View>
                <Text style={[styles.payTitle, { color: colors.text }]}>Plastik karta</Text>
                <Text style={[styles.payPercent, { color: colors.textSecondary }]}>
                  {Math.round((reportData.card / reportData.total) * 100)}%
                </Text>
              </View>
            </View>
            <Text style={[styles.payAmount, { color: colors.text }]}>
              {reportData.card.toLocaleString('uz-UZ')} so&#39;m
            </Text>
          </View>

          {/* Debt */}
          <View style={styles.paymentRow}>
            <View style={styles.paymentLeft}>
              <View style={[styles.iconBox, { backgroundColor: colors.surfaceSecondary }]}>
                <Receipt size={16} color={colors.text} />
              </View>
              <View>
                <Text style={[styles.payTitle, { color: colors.text }]}>Nasiya (Qarz)</Text>
                <Text style={[styles.payPercent, { color: colors.textSecondary }]}>
                  {Math.round((reportData.debt / reportData.total) * 100)}%
                </Text>
              </View>
            </View>
            <Text style={[styles.payAmount, { color: colors.text }]}>
              {reportData.debt.toLocaleString('uz-UZ')} so&#39;m
            </Text>
          </View>
        </View>

        {/* Z-Report Action Card */}
        <View style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Z-Hisobot (Smena hisoboti)</Text>
          <Text style={[styles.actionCardDesc, { color: colors.textSecondary }]}>
            Kunlik smenani rasmiy yopish, cheklar xulosasini PDF shaklida yuklab olish yoki chop etish.
          </Text>

          <Button
            title="Z-hisobotni yuklab olish / chop etish"
            variant="primary"
            icon={<Printer size={18} color={colors.primaryActionText} />}
            loading={loadingPdf}
            onPress={handlePrintZReport}
            style={{ marginTop: spacing.sm }}
          />
        </View>
      </ScrollView>

      {toastMessage && (
        <Toast
          message={toastMessage}
          variant="success"
          onDismiss={() => setToastMessage(null)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  periodBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: 3,
    borderRadius: radius.md,
  },
  periodTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  periodTabText: {
    fontSize: typography.caption.fontSize,
    fontFamily: typography.caption.fontFamily,
    fontWeight: '500',
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  kpiCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.lg,
  },
  kpiLabel: {
    fontSize: typography.caption.fontSize,
    fontFamily: typography.caption.fontFamily,
  },
  kpiValue: {
    fontSize: typography.hero.fontSize,
    fontFamily: typography.hero.fontFamily,
    fontWeight: '700',
    marginVertical: spacing.xs,
  },
  kpiCurrency: {
    fontSize: typography.body.fontSize,
    fontWeight: '400',
  },
  kpiGrid: {
    flexDirection: 'row',
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 1,
  },
  kpiSubItem: {
    flex: 1,
  },
  verticalLine: {
    width: 1,
    marginHorizontal: spacing.md,
  },
  subLabel: {
    fontSize: typography.micro.fontSize,
    fontFamily: typography.micro.fontFamily,
  },
  subValue: {
    fontSize: typography.body.fontSize,
    fontFamily: typography.body.fontFamily,
    fontWeight: '600',
    marginTop: 2,
  },
  breakdownCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
  },
  cardTitle: {
    fontSize: typography.body.fontSize,
    fontFamily: typography.body.fontFamily,
    fontWeight: '600',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payTitle: {
    fontSize: typography.body.fontSize,
    fontFamily: typography.body.fontFamily,
    fontWeight: '500',
  },
  payPercent: {
    fontSize: typography.micro.fontSize,
    fontFamily: typography.micro.fontFamily,
  },
  payAmount: {
    fontSize: typography.body.fontSize,
    fontFamily: typography.body.fontFamily,
    fontWeight: '600',
  },
  actionCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  actionCardDesc: {
    fontSize: typography.caption.fontSize,
    fontFamily: typography.caption.fontFamily,
    lineHeight: 18,
  },
});
