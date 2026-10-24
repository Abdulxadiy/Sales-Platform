import { useFeedback } from '../../hooks/useFeedback';
import { isDesignPreview } from '../../dev/preview';
import React, { useState } from 'react';
import { FlatList, Modal, PanResponder, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAppNavigation as useNavigation } from '../../navigation/useAppNavigation';
import Svg, { Path } from 'react-native-svg';
import { ArrowLeft, ChevronRight, Download, Edit3, FileText, Search, Share2, Trash2, X } from 'lucide-react-native';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Toast } from '../../components/ui/Toast';
import { IlbiLogo } from '../../components/brand/IlbiLogo';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme/tokens';

export interface DocumentItem {
  id: number;
  type: 'invoice' | 'act';
  number: string;
  customerName: string;
  amount: number;
  date: string;
  signed: boolean;
  signaturePath?: string;
}

export const CANONICAL_DOCUMENTS: DocumentItem[] = [
  { id: 1043, type: 'invoice', number: '1043', customerName: 'Ali Valiyev', amount: 160000, date: '24.10.2026', signed: false },
  { id: 1042, type: 'invoice', number: '1042', customerName: 'Aziz Karimov', amount: 245000, date: '23.10.2026', signed: true },
  { id: 1041, type: 'act', number: '1041', customerName: 'Botir Ahmedov', amount: 320000, date: '22.10.2026', signed: false },
  { id: 1040, type: 'invoice', number: '1040', customerName: 'Malika Xolova', amount: 118500, date: '20.10.2026', signed: true },
  { id: 1039, type: 'invoice', number: '1039', customerName: 'Sardor Nurmatov', amount: 75000, date: '18.10.2026', signed: false },
];

export const DocumentsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();

  const [documents, setDocuments] = useState<DocumentItem[]>(CANONICAL_DOCUMENTS);
  const [filter, setFilter] = useState<'all' | 'invoice' | 'act'>('all');
  const [search, setSearch] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [showSignModal, setShowSignModal] = useState(false);
  const { message: toastMessage, type: toastType, show: setToastMessage } = useFeedback();

  // Drawing canvas strokes
  const [currentStroke, setCurrentStroke] = useState<string>('');
  const [allStrokes, setAllStrokes] = useState<string[]>([]);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      setCurrentStroke(`M${locationX.toFixed(1)},${locationY.toFixed(1)}`);
    },
    onPanResponderMove: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      setCurrentStroke((prev) => `${prev} L${locationX.toFixed(1)},${locationY.toFixed(1)}`);
    },
    onPanResponderRelease: () => {
      if (currentStroke) {
        setAllStrokes((prev) => [...prev, currentStroke]);
        setCurrentStroke('');
      }
    },
  });

  const handleClearSignature = () => {
    setCurrentStroke('');
    setAllStrokes([]);
  };

  const handlePlaceSignature = () => {
    if (allStrokes.length === 0) {
      setToastMessage('Iltimos, avval imzo chizing');
      return;
    }

    const fullPath = allStrokes.join(' ');
    if (selectedDoc) {
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === selectedDoc.id
            ? { ...d, signed: true, signaturePath: fullPath }
            : d
        )
      );
      setSelectedDoc((prev) => (prev ? { ...prev, signed: true, signaturePath: fullPath } : null));
    }
    setShowSignModal(false);
    setToastMessage('Imzo muvaffaqiyatli joylashtirildi');
  };

  const filtered = documents.filter((doc) => {
    if (filter === 'invoice' && doc.type !== 'invoice') return false;
    if (filter === 'act' && doc.type !== 'act') return false;
    if (search) {
      return (
        doc.customerName.toLowerCase().includes(search.toLowerCase()) ||
        doc.number.includes(search)
      );
    }
    return true;
  });

  if (!isDesignPreview) return <View style={{ flex: 1, padding: 24, backgroundColor: colors.background }}>
    <ScreenHeader title="API integratsiyasi kutilmoqda" onOpenDrawer={() => navigation.openDrawer()} />
    <Text style={{ color: colors.text }}>Bu bo‘lim hozircha dizayn prototipi. Haqiqiy ma’lumotlar va amallar hali tekshirilmagan.</Text>
  </View>;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Hujjatlar"
        showLogo={false}
        onOpenDrawer={() => navigation.openDrawer()}
      />

      <Toast
        type={toastType}
        visible={Boolean(toastMessage)}
        message={toastMessage || ''}
        onDismiss={() => setToastMessage(null)}
      />

      {/* Search Input */}
      <View style={styles.searchSection}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={18} color={colors.textMuted} />
          <TextInput accessibilityLabel="Hujjat yoki mijoz"
            placeholder="Hujjat yoki mijoz"
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>
      </View>

      {/* Filter Tabs (Barchasi, Faktura, Dalolatnoma) */}
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
            Barchasi
          </Text>
        </TouchableOpacity>

        <TouchableOpacity accessibilityRole="button"
          onPress={() => setFilter('invoice')}
          style={[
            styles.tabBtn,
            {
              backgroundColor: filter === 'invoice' ? colors.primaryAction : colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              { color: filter === 'invoice' ? colors.primaryActionText : colors.text },
            ]}
          >
            Faktura
          </Text>
        </TouchableOpacity>

        <TouchableOpacity accessibilityRole="button"
          onPress={() => setFilter('act')}
          style={[
            styles.tabBtn,
            {
              backgroundColor: filter === 'act' ? colors.primaryAction : colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              { color: filter === 'act' ? colors.primaryActionText : colors.text },
            ]}
          >
            Dalolatnoma
          </Text>
        </TouchableOpacity>
      </View>

      {/* Documents List (Board 25A) */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity accessibilityRole="button"
            activeOpacity={0.7}
            onPress={() => setSelectedDoc(item)}
            style={[
              styles.docCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={[styles.docIconWrapper, { backgroundColor: colors.surfaceSecondary }]}>
              <FileText size={20} color={colors.text} />
            </View>

            <View style={styles.docInfoCol}>
              <View style={styles.docTitleRow}>
                <Text style={[styles.docTitle, { color: colors.text }]}>
                  {item.type === 'invoice' ? `Faktura #${item.number}` : `Qabul dalolatnomasi #${item.number}`}
                </Text>

                {item.type === 'invoice' ? (
                  <Badge
                    label={item.signed ? 'Imzolangan' : 'Imzo kutilmoqda'}
                    variant={item.signed ? 'success' : 'warning'}
                  />
                ) : null}
              </View>

              <Text style={[styles.docCustomer, { color: colors.textSecondary }]}>
                {item.customerName}
              </Text>

              <View style={styles.docBottomRow}>
                <Text style={[styles.docAmount, { color: colors.text }]}>
                  {item.amount.toLocaleString('ru-RU')} so&#39;m
                </Text>
                <Text style={[styles.docDate, { color: colors.textSecondary }]}>{item.date}</Text>
              </View>
            </View>

            <ChevronRight size={18} color={colors.textMuted} style={{ marginLeft: spacing.sm }} />
          </TouchableOpacity>
        )}
      />

      {/* A4 Document Viewer Modal (Board 25B) */}
      <Modal visible={Boolean(selectedDoc)} animationType="slide">
        {selectedDoc ? (
          <View style={[styles.viewerContainer, { backgroundColor: colors.background }]}>
            {/* Viewer Header */}
            <View style={[styles.viewerHeader, { borderBottomColor: colors.borderSubtle }]}>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Hujjatni yopish" onPress={() => setSelectedDoc(null)} style={styles.viewerHeaderBtn}>
                <ArrowLeft size={22} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.viewerTitle, { color: colors.text }]}>
                Faktura #{selectedDoc.number}
              </Text>
              <View style={styles.viewerHeaderActions}>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Hujjatni ulashish" disabled accessibilityState={{ disabled: true }} style={styles.viewerHeaderBtn}>
                  <Share2 size={20} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Hujjatni yuklab olish" disabled accessibilityState={{ disabled: true }} style={styles.viewerHeaderBtn}>
                  <Download size={20} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* A4 White Paper Display (Board 25B) */}
            <ScrollView contentContainerStyle={styles.a4PaperScroll}>
              <View style={[styles.a4Paper, { backgroundColor: colors.paperBackground }]}>
                {/* A4 Header */}
                <View style={styles.a4TopRow}>
                  <IlbiLogo height={28} monochromeColor="#141820" />
                  <View style={styles.a4CompanyInfo}>
                    <Text style={styles.a4CompanyTitle}>ILBI MAS&#39;ULIYATI CHEKLANGAN JAMIYAT</Text>
                    <Text style={styles.a4CompanySub}>Toshkent sh., Chilonzor tumani</Text>
                    <Text style={styles.a4CompanySub}>INN 123456789</Text>
                  </View>
                </View>

                <Text style={styles.a4DocTitle}>Hisob-faktura #{selectedDoc.number}</Text>

                <View style={styles.a4MetaRow}>
                  <View>
                    <Text style={styles.a4MetaText}>
                      <Text style={{ fontWeight: 'bold' }}>Mijoz: </Text>
                      {selectedDoc.customerName}
                    </Text>
                    <Text style={styles.a4MetaText}>
                      <Text style={{ fontWeight: 'bold' }}>Sana: </Text>
                      {selectedDoc.date}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.a4MetaText}>
                      <Text style={{ fontWeight: 'bold' }}>Jami: </Text>
                      {selectedDoc.amount.toLocaleString('ru-RU')} so&#39;m
                    </Text>
                  </View>
                </View>

                {/* Items Table */}
                <View style={styles.a4Table}>
                  <View style={styles.a4TableHeader}>
                    <Text style={[styles.a4Th, { flex: 0.5 }]}>#</Text>
                    <Text style={[styles.a4Th, { flex: 2 }]}>Tovar</Text>
                    <Text style={[styles.a4Th, { flex: 1, textAlign: 'center' }]}>Soni</Text>
                    <Text style={[styles.a4Th, { flex: 1.2, textAlign: 'right' }]}>Narxi</Text>
                    <Text style={[styles.a4Th, { flex: 1.3, textAlign: 'right' }]}>Jami</Text>
                  </View>

                  <View style={styles.a4TableRow}>
                    <Text style={[styles.a4Td, { flex: 0.5 }]}>1</Text>
                    <Text style={[styles.a4Td, { flex: 2 }]}>Sut 1 L</Text>
                    <Text style={[styles.a4Td, { flex: 1, textAlign: 'center' }]}>2</Text>
                    <Text style={[styles.a4Td, { flex: 1.2, textAlign: 'right' }]}>11 500</Text>
                    <Text style={[styles.a4Td, { flex: 1.3, textAlign: 'right' }]}>23 000</Text>
                  </View>
                  <View style={styles.a4TableRow}>
                    <Text style={[styles.a4Td, { flex: 0.5 }]}>2</Text>
                    <Text style={[styles.a4Td, { flex: 2 }]}>Non</Text>
                    <Text style={[styles.a4Td, { flex: 1, textAlign: 'center' }]}>3</Text>
                    <Text style={[styles.a4Td, { flex: 1.2, textAlign: 'right' }]}>4 000</Text>
                    <Text style={[styles.a4Td, { flex: 1.3, textAlign: 'right' }]}>12 000</Text>
                  </View>
                  <View style={styles.a4TableRow}>
                    <Text style={[styles.a4Td, { flex: 0.5 }]}>3</Text>
                    <Text style={[styles.a4Td, { flex: 2 }]}>Suv 1.5 L</Text>
                    <Text style={[styles.a4Td, { flex: 1, textAlign: 'center' }]}>2</Text>
                    <Text style={[styles.a4Td, { flex: 1.2, textAlign: 'right' }]}>5 000</Text>
                    <Text style={[styles.a4Td, { flex: 1.3, textAlign: 'right' }]}>10 000</Text>
                  </View>
                </View>

                {/* Signatures Area */}
                <View style={styles.a4SignaturesArea}>
                  <View style={styles.a4SignCol}>
                    <Text style={styles.a4SignLabel}>Topshirdi:</Text>
                    <View style={styles.a4SignLine} />
                    <Text style={styles.a4SignSub}>Do&#39;kon ma&#39;muri</Text>
                  </View>

                  <View style={styles.a4SignCol}>
                    <Text style={styles.a4SignLabel}>Qabul qildi:</Text>
                    {selectedDoc.signaturePath ? (
                      <Svg width={120} height={50} style={styles.drawnSignatureSvg}>
                        <Path
                          d={selectedDoc.signaturePath}
                          stroke="#0B0909"
                          strokeWidth={2.5}
                          fill="none"
                        />
                      </Svg>
                    ) : (
                      <View style={styles.a4SignLine} />
                    )}
                    <Text style={styles.a4SignSub}>{selectedDoc.customerName}</Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Bottom Actions Bar (Board 25B) */}
            <View style={[styles.viewerBottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
              <Button
                title={selectedDoc.signed ? "Qayta imzolash" : "Imzo qo'yish"}
                icon={<Edit3 size={18} color={colors.primaryActionText} />}
                onPress={() => {
                  handleClearSignature();
                  setShowSignModal(true);
                }}
                style={{ flex: 1, marginRight: spacing.sm }}
              />
              <Button
                title="Ulashish"
                variant="secondary"
                icon={<Share2 size={18} color={colors.text} />}
                onPress={() => setToastMessage("Ulashish oynasi ochildi")}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        ) : null}
      </Modal>

      {/* Drawn Signature Screen / Modal (Board 25C) */}
      <Modal visible={showSignModal} animationType="slide">
        <View style={[styles.signScreenContainer, { backgroundColor: colors.background }]}>
          <ScreenHeader
            title="Qo'lda imzo"
            showLogo={false}
            onGoBack={() => setShowSignModal(false)}
          />

          <View style={styles.signBody}>
            {/* Customer Pill Card */}
            <View style={[styles.signCustCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.signCustText, { color: colors.text }]}>
                {selectedDoc?.customerName} • #{selectedDoc?.number}
              </Text>
            </View>

            {/* Touch Drawing Canvas Box (Board 25C) */}
            <View
              {...panResponder.panHandlers}
              style={[
                styles.canvasBox,
                {
                  backgroundColor: '#FFFFFF',
                  borderColor: colors.border,
                },
              ]}
            >
              <Svg style={StyleSheet.absoluteFill}>
                {allStrokes.map((d, i) => (
                  <Path key={i} d={d} stroke="#0B0909" strokeWidth={3} fill="none" />
                ))}
                {currentStroke ? (
                  <Path d={currentStroke} stroke="#0B0909" strokeWidth={3} fill="none" />
                ) : null}
              </Svg>

              <View style={styles.canvasBaseline} />
            </View>

            <Text style={[styles.canvasInstruction, { color: colors.textSecondary }]}>
              Barmoq bilan imzo chizing
            </Text>

            {/* Clear & Cancel Controls (Board 25C) */}
            <View style={styles.signControlRow}>
              <TouchableOpacity accessibilityRole="button"
                onPress={() => setShowSignModal(false)}
                style={[styles.signCancelBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
              >
                <X size={16} color={colors.text} />
                <Text style={[styles.signControlText, { color: colors.text }]}>Bekor qilish</Text>
              </TouchableOpacity>

              <TouchableOpacity accessibilityRole="button"
                onPress={handleClearSignature}
                style={[styles.signCancelBtn, { borderColor: colors.danger, backgroundColor: colors.surface }]}
              >
                <Trash2 size={16} color={colors.danger} />
                <Text style={[styles.signControlText, { color: colors.danger }]}>Tozalash</Text>
              </TouchableOpacity>
            </View>

            {/* Primary Placement Action */}
            <Button
              title="Imzoni joylashtirish"
              fullWidth
              size="lg"
              onPress={handlePlaceSignature}
              style={styles.placeSignBtn}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
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
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  docIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  docInfoCol: {
    flex: 1,
  },
  docTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  docTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
  },
  docCustomer: {
    fontSize: typography.size.xs,
    marginBottom: 4,
  },
  docBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  docAmount: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
  },
  docDate: {
    fontSize: typography.size.xs,
  },
  viewerContainer: {
    flex: 1,
  },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  viewerHeaderBtn: {
    padding: spacing.xs,
  },
  viewerTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
  },
  viewerHeaderActions: {
    flexDirection: 'row',
  },
  a4PaperScroll: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  a4Paper: {
    width: '100%',
    minHeight: 520,
    borderRadius: radius.sm,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  a4TopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
  },
  a4CompanyInfo: {
    alignItems: 'flex-end',
  },
  a4CompanyTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#0B0909',
  },
  a4CompanySub: {
    fontSize: 8,
    color: '#4B5563',
  },
  a4DocTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0B0909',
    textAlign: 'center',
    marginVertical: spacing.sm,
  },
  a4MetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  a4MetaText: {
    fontSize: 11,
    color: '#0B0909',
    marginBottom: 2,
  },
  a4Table: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: spacing.xl,
  },
  a4TableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  a4Th: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0B0909',
  },
  a4TableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  a4Td: {
    fontSize: 10,
    color: '#0B0909',
  },
  a4SignaturesArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xxl,
  },
  a4SignCol: {
    width: 130,
    alignItems: 'center',
  },
  a4SignLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0B0909',
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
  },
  a4SignLine: {
    width: '100%',
    height: 1,
    backgroundColor: '#9CA3AF',
    marginBottom: 4,
  },
  drawnSignatureSvg: {
    height: 40,
    width: '100%',
  },
  a4SignSub: {
    fontSize: 9,
    color: '#4B5563',
  },
  viewerBottomBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  signScreenContainer: {
    flex: 1,
  },
  signBody: {
    flex: 1,
    padding: spacing.xl,
  },
  signCustCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  signCustText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  canvasBox: {
    height: 260,
    borderRadius: radius.lg,
    borderWidth: 1,
    position: 'relative',
    marginBottom: spacing.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  canvasBaseline: {
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 0.5,
    borderColor: '#D1D5DB',
    width: '85%',
    alignSelf: 'center',
    marginBottom: 50,
  },
  canvasInstruction: {
    fontSize: typography.size.xs,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  signControlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  signCancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginHorizontal: 4,
  },
  signControlText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    marginLeft: spacing.xs,
  },
  placeSignBtn: {
    marginTop: 'auto',
    marginBottom: spacing.lg,
  },
});
