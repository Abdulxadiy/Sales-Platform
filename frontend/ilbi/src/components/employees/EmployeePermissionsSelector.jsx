import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Package,
  Layers,
  ShoppingCart,
  KeyRound,
  Check,
  Minus,
  ChevronDown,
  ChevronUp,
  Crown,
  Search,
  Users,
  RotateCcw,
  TrendingUp,
  Briefcase,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';

const CATEGORY_META = {
  tenants: { name: 'Do‘kon sozlamalari', icon: Briefcase, color: 'var(--primary)', description: 'Chek, soliq, kurs va bildirishnoma sozlamalari' },
  cashbox: {
    name: 'Kassa va Smenalar',
    icon: Wallet,
    color: 'var(--accent-emerald)',
    description: 'Smena ochish/yopish, kassa kirim-chiqimlari va hisobotlar',
  },
  catalog: {
    name: 'Katalog va Mahsulotlar',
    icon: Package,
    color: 'var(--primary)',
    description: 'Mahsulotlar, kategoriyalar, narxlar va tannarxni ko‘rish',
  },
  inventory: {
    name: 'Ombor va Zaxira',
    icon: Layers,
    color: 'var(--chart-profit)',
    description: 'Zaxiralar, tezkor kirim, qoldiqlarni tuzatish va do‘konlararo transfer',
  },
  sales: {
    name: 'Savdo va POS',
    icon: ShoppingCart,
    color: 'var(--accent-purple)',
    description: 'POS kassa savdosi, sotuvni bekor qilish, mijozlar va qarz to‘lovlari',
  },
  analytics: {
    name: 'Hisobot va Analitika',
    icon: TrendingUp,
    color: 'var(--accent-cyan)',
    description: 'Dashboard analitikasi, savdo ko‘rsatkichlari va davriy hisobotlar',
  },
};

const PERMISSION_DESCRIPTIONS = {
  manage_settings: 'Faol do‘konning chek, soliq, kurs va bildirishnoma sozlamalarini boshqarish',
  manage_shift: 'Smenani ochish, yakunlash va kassa hisobotini topshirish',
  record_expense: 'Kassadan naqd pul chiqimi (xarajat) kiritish',
  record_income: 'Kassaga naqd pul kirimi kiritish',
  view_cashbox: 'X-Hisobot, Z-Hisobot va kassa tarixini ko‘rish',
  view_category: 'Katalogdagi kategoriyalar ro‘yxatini ko‘rish',
  add_category: 'Yangi tovar kategoriyasini yaratish',
  change_category: 'Mavjud kategoriyani tahrirlash',
  archive_category: 'Kategoriyani arxivlash va o‘chirish',
  view_product: 'Katalogdagi tovarlar va variantlarni ko‘rish',
  add_product: 'Yangi tovar va uning parametrlarini qo‘shish',
  change_product: 'Tovarlar narxi va ma’lumotlarini tahrirlash',
  archive_product: 'Tovarni arxivlash va ro‘yxatdan chiqarish',
  view_cost_price: 'Tovarning tannarxi va do‘kon foydasini ko‘rish (Maxfiy)',
  view_stock: 'Ombordagi tovarlar qoldig‘i va zaxirani ko‘rish',
  add_stock_intake: 'Omborga tovarlarni tezkor qabul qilish (Kirim)',
  adjust_stock: 'Ombor qoldiqlarini qo‘lda inventarizatsiya/tuzatish',
  transfer_stock: 'Filiallar o‘rtasida tovarlarni jo‘natish va qabul qilish',
  view_sale: 'Barcha amalga oshirilgan savdolar tarixini ko‘rish',
  add_sale: 'Kassada yangi savdo va chek chiqarish (POS)',
  void_sale: 'Xato qilingan savdoni qaytarish va bekor qilish (Muhim)',
  manage_counterparty: 'Mijozlar (kontragentlar) ro‘yxatini boshqarish',
  manage_b2b: 'B2B shartnomalar va ulgurji transferlarni boshqarish',
  record_debt_payment: 'Mijozlardan qarz to‘lovlarini qabul qilish va kiritish',
  view_dashboard: 'Dashboard, savdo grafiklari va umumiy biznes ko‘rsatkichlarini ko‘rish',
  view_reports: 'Moliyaviy va umumiy davriy hisobotlarni ko‘rish hamda yuklab olish',
};

// Role presets imported from rolePresets.js
import { ROLE_PRESETS, PRESETS } from './rolePresets.js';

/**
 * Modern Neumorphic / Smooth Pill Switch
 * Matches the reference image with smooth knob animation and glowing accent.
 */
function NeumorphicSwitch({ checked, onChange, disabled, id }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      id={id}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onChange(!checked);
      }}
      className={`neumorphic-switch ${checked ? 'checked' : ''}`}
      style={{
        position: 'relative',
        width: 44,
        height: 24,
        borderRadius: 9999,
        border: checked
          ? '1px solid var(--primary)'
          : '1px solid var(--border-subtle, rgba(255,255,255,0.12))',
        background: checked
          ? 'var(--primary)'
          : 'var(--bg-chip, rgba(255,255,255,0.06))',
        boxShadow: checked
          ? 'var(--shadow-sm)'
          : 'inset 0 2px 4px rgba(0,0,0,0.35)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
        padding: 0,
        outline: 'none',
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
      }}
    >
      <span
        style={{
          display: 'block',
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: checked ? 'var(--text-on-primary)' : 'var(--text-muted)',
          boxShadow: checked
            ? '0 2px 5px rgba(0, 0, 0, 0.35)'
            : '0 2px 4px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255,255,255,0.4)',
          transform: checked ? 'translateX(22px)' : 'translateX(2px)',
          transition: 'transform 0.22s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.22s ease',
        }}
      />
    </button>
  );
}

/**
 * Stylish Category Master Checkbox
 * Supports Checked, Indeterminate, and Unchecked states.
 */
function StylishCategoryCheckbox({ checked, indeterminate, onChange, disabled }) {
  return (
    <div
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      tabIndex={disabled ? -1 : 0}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onChange();
      }}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) onChange();
        }
      }}
      title={checked ? 'Bo‘limdagi barcha ruxsatlarni bekor qilish' : 'Bo‘limdagi barcha ruxsatlarni berish'}
      style={{
        width: 20,
        height: 20,
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: checked
          ? 'var(--primary)'
          : indeterminate
          ? 'rgba(99, 102, 241, 0.15)'
          : 'var(--bg-surface, rgba(255,255,255,0.03))',
        border: checked || indeterminate
          ? '1.5px solid var(--primary)'
          : '1.5px solid var(--border-hover, rgba(255,255,255,0.25))',
        boxShadow: checked ? '0 0 8px rgba(99, 102, 241, 0.35)' : 'none',
        transition: 'all 0.18s ease',
        flexShrink: 0,
      }}
    >
      {checked && <Check size={13} strokeWidth={3} color="var(--text-on-primary)" />}
      {!checked && indeterminate && <Minus size={13} strokeWidth={3} color="var(--primary)" />}
    </div>
  );
}

/**
 * Main EmployeePermissionsSelector Component
 */
export default function EmployeePermissionsSelector({
  permissionChoices = [],
  selectedIds = [],
  onChange,
  onPresetSelect,
  currentPosition = '',
  disabled = false,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({});
  const [presetsOpen, setPresetsOpen] = useState(false);

  const allAvailableIds = useMemo(
    () => permissionChoices.map((p) => p.id),
    [permissionChoices]
  );

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const isFullAccess =
    allAvailableIds.length > 0 &&
    allAvailableIds.every((id) => selectedSet.has(id));

  // Determine active preset (if current permissions match any role preset)
  const activePreset = useMemo(() => {
    if (selectedIds.length === 0) return null;
    // 1. Exact match on permissions
    for (const preset of ROLE_PRESETS) {
      const presetIds = permissionChoices
        .filter((p) => preset.permissions.includes(p.codename))
        .map((p) => p.id);
      if (
        presetIds.length > 0 &&
        presetIds.length === selectedIds.length &&
        presetIds.every((id) => selectedSet.has(id))
      ) {
        return preset;
      }
    }
    // 2. Match by currentPosition if defined and all its permissions are active
    if (currentPosition) {
      const found = ROLE_PRESETS.find(
        (p) => p.label.toLowerCase() === currentPosition.trim().toLowerCase()
      );
      if (found) {
        const foundIds = permissionChoices
          .filter((p) => found.permissions.includes(p.codename))
          .map((p) => p.id);
        if (foundIds.length > 0 && foundIds.every((id) => selectedSet.has(id))) {
          return found;
        }
      }
    }
    return null;
  }, [selectedIds, selectedSet, permissionChoices, currentPosition]);

  // Group permissions by category
  const groupedCategories = useMemo(() => {
    const groups = {};
    const q = searchQuery.trim().toLowerCase();

    permissionChoices.forEach((perm) => {
      const catKey = perm.category || 'other';
      if (!groups[catKey]) {
        groups[catKey] = [];
      }
      const matchesSearch =
        !q ||
        (perm.name || '').toLowerCase().includes(q) ||
        (perm.codename || '').toLowerCase().includes(q) ||
        (PERMISSION_DESCRIPTIONS[perm.codename] || '').toLowerCase().includes(q);

      if (matchesSearch) {
        groups[catKey].push(perm);
      }
    });

    return groups;
  }, [permissionChoices, searchQuery]);

  // Toggle single permission
  const handleTogglePermission = (id) => {
    if (disabled) return;
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((pId) => pId !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  // Toggle full access (all permissions)
  const handleToggleFullAccess = () => {
    if (disabled) return;
    if (isFullAccess) {
      onChange([]);
    } else {
      onChange([...allAvailableIds]);
    }
  };

  // Toggle all permissions within a specific category
  const handleToggleCategory = (catKey) => {
    if (disabled) return;
    const catPerms = permissionChoices.filter((p) => (p.category || 'other') === catKey);
    const catIds = catPerms.map((p) => p.id);
    const allSelectedInCat = catIds.length > 0 && catIds.every((id) => selectedSet.has(id));

    if (allSelectedInCat) {
      // Uncheck all in category
      onChange(selectedIds.filter((id) => !catIds.includes(id)));
    } else {
      // Check all in category
      const merged = new Set([...selectedIds, ...catIds]);
      onChange(Array.from(merged));
    }
  };

  // Apply quick preset
  const handleApplyPreset = (preset) => {
    if (disabled) return;
    const codenames = preset.permissions || [];
    const matchedIds = permissionChoices
      .filter((p) => codenames.includes(p.codename))
      .map((p) => p.id);

    onChange?.(matchedIds);
    onPresetSelect?.({
      key: preset.key,
      label: preset.label,
      ids: matchedIds,
    });
  };

  // Accordion toggle
  const toggleAccordion = (catKey) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catKey]: !prev[catKey],
    }));
  };

  // Expand all / Collapse all
  const handleExpandAll = (expand) => {
    const updated = {};
    Object.keys(groupedCategories).forEach((key) => {
      updated[key] = expand;
    });
    setExpandedCategories(updated);
  };

  const totalSelectedCount = selectedIds.length;
  const totalAvailableCount = allAvailableIds.length;

  return (
    <div
      className="employee-permissions-selector"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        borderRadius: 14,
        background: 'var(--bg-card, #12141a)',
        border: '1px solid var(--border-card, rgba(255, 255, 255, 0.08))',
        padding: '14px',
      }}
    >
      {/* 1. Header with Full Access Master Card */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={handleToggleFullAccess}
        style={{
          padding: '12px 16px',
          borderRadius: 12,
          background: isFullAccess
            ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.12) 100%)'
            : 'var(--bg-surface, rgba(255, 255, 255, 0.03))',
          border: isFullAccess
            ? '1px solid rgba(99, 102, 241, 0.45)'
            : '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.25s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: isFullAccess
                ? 'var(--primary)'
                : 'var(--bg-chip, rgba(255, 255, 255, 0.06))',
              color: isFullAccess ? 'var(--text-on-primary)' : 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: isFullAccess ? '0 0 12px rgba(99, 102, 241, 0.5)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <Crown size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                To‘liq ruxsat (Full Access)
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: isFullAccess
                    ? 'rgba(var(--success-rgb), 0.2)'
                    : 'var(--bg-chip, rgba(255, 255, 255, 0.06))',
                  color: isFullAccess
                    ? 'var(--accent-emerald)'
                    : 'var(--text-muted, #9ca3af)',
                  border: isFullAccess
                    ? '1px solid rgba(var(--success-rgb), 0.35)'
                    : '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
                }}
              >
                {isFullAccess
                  ? `Barchasi faol (${totalSelectedCount}/${totalAvailableCount})`
                  : `${totalSelectedCount} / ${totalAvailableCount} ta faol`}
              </span>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.35 }}>
              Do‘kon egasi kabi barcha bo‘limlar va operatsiyalarga to‘liq ruxsat berish
            </p>
          </div>
        </div>

        <NeumorphicSwitch checked={isFullAccess} onChange={handleToggleFullAccess} disabled={disabled} />
      </div>

      {/* 2. Quick Presets & Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          paddingTop: 4,
          paddingBottom: 4,
        }}
      >
        {/* Collapsible Presets Toggle & Clear */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={disabled}
            style={{
              padding: '5px 12px',
              fontSize: 12,
              borderRadius: 8,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: presetsOpen
                ? 'var(--primary)'
                : activePreset
                ? 'rgba(99, 102, 241, 0.15)'
                : 'var(--bg-chip, rgba(255, 255, 255, 0.05))',
              color: presetsOpen ? 'var(--text-on-primary)' : activePreset ? 'var(--primary)' : 'var(--text-primary)',
              border: presetsOpen || activePreset
                ? '1px solid var(--primary)'
                : '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
              fontWeight: 600,
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: presetsOpen ? '0 0 10px rgba(99, 102, 241, 0.35)' : 'none',
            }}
            onClick={() => setPresetsOpen((prev) => !prev)}
            title="Tayyor lavozim shablonlarini ochish yoki yig‘ishtirish"
          >
            <Sparkles size={13} color={presetsOpen ? 'var(--text-on-primary)' : (activePreset?.color || 'var(--primary)')} />
            <span>
              {activePreset ? `Shablon: ${activePreset.label}` : 'Lavozim shablonlari (8)'}
            </span>
            {presetsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {totalSelectedCount > 0 && (
            <button
              type="button"
              className="btn btn-secondary"
              disabled={disabled}
              style={{
                padding: '5px 10px',
                fontSize: 11.5,
                borderRadius: 8,
                color: 'var(--accent-rose)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
              onClick={() => onChange([])}
              title="Barcha tanlangan ruxsatlarni tozalash"
            >
              <RotateCcw size={12} /> Tozalash
            </button>
          )}
        </div>

        {/* Search input & Expand controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200, justifyContent: 'flex-end' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 220 }}>
            <Search
              size={13}
              style={{
                position: 'absolute',
                left: 9,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              className="input-field"
              placeholder="Ruxsatlarni qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: 28,
                paddingTop: 5,
                paddingBottom: 5,
                fontSize: 12,
                borderRadius: 8,
              }}
            />
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: 11, borderRadius: 6 }}
            onClick={() => handleExpandAll(true)}
            title="Barcha bo‘limlarni yoyish"
          >
            Ochish
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: 11, borderRadius: 6 }}
            onClick={() => handleExpandAll(false)}
            title="Barcha bo‘limlarni yig‘ish"
          >
            Yopish
          </button>
        </div>
      </div>

      {/* 2.1 Collapsible Presets Panel */}
      {presetsOpen && (
        <div
          style={{
            borderRadius: 12,
            background: 'var(--bg-surface, rgba(255, 255, 255, 0.03))',
            border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {/* Header inside drawer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  background: 'rgba(99, 102, 241, 0.2)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Sparkles size={14} />
              </div>
              <div>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Tayyor lavozim shablonlari
                </span>
                <span style={{ fontSize: 11.5, color: 'var(--text-muted)', marginLeft: 8 }}>
                  (Shablon tanlanganda lavozim nomi va mos ruxsatlar avtomatik to‘ldiriladi)
                </span>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              style={{
                padding: '3px 8px',
                fontSize: 11,
                borderRadius: 6,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
              onClick={() => setPresetsOpen(false)}
              title="Shablonlar panelini yig‘ishtirish"
            >
              <ChevronUp size={13} /> Yig‘ishtirish
            </button>
          </div>

          {/* Grid of presets */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
              gap: 8,
              maxHeight: 250,
              overflowY: 'auto',
              paddingRight: 4,
            }}
          >
            {ROLE_PRESETS.map((preset) => {
              const IconComp = preset.icon;
              const isCurrent = activePreset?.key === preset.key;
              const matchedCount = permissionChoices.filter((p) =>
                preset.permissions.includes(p.codename)
              ).length;

              return (
                <div
                  key={preset.key}
                  role="button"
                  tabIndex={disabled ? -1 : 0}
                  onClick={() => handleApplyPreset(preset)}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      handleApplyPreset(preset);
                    }
                  }}
                  style={{
                    padding: '9px 11px',
                    borderRadius: 9,
                    background: isCurrent
                      ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.18) 0%, rgba(99, 102, 241, 0.08) 100%)'
                      : 'var(--bg-chip, rgba(255, 255, 255, 0.03))',
                    border: isCurrent
                      ? '1.5px solid var(--primary)'
                      : '1px solid var(--border-subtle, rgba(255, 255, 255, 0.07))',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 5,
                    transition: 'all 0.16s ease',
                    boxShadow: isCurrent ? '0 0 10px rgba(99, 102, 241, 0.25)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isCurrent) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isCurrent) e.currentTarget.style.borderColor = 'var(--border-subtle, rgba(255, 255, 255, 0.07))';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 7,
                          background: 'color-mix(in srgb, ' + preset.color + ' 13%, transparent)',
                          color: preset.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <IconComp size={14} />
                      </div>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {preset.label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: '1px 6px',
                          borderRadius: 999,
                          background: isCurrent
                            ? 'var(--primary)'
                            : 'rgba(255, 255, 255, 0.06)',
                          color: isCurrent ? 'var(--text-on-primary)' : 'var(--text-muted)',
                        }}
                      >
                        {matchedCount} ta
                      </span>
                      {isCurrent && <Check size={13} color="var(--text-on-primary)" strokeWidth={3} />}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 10.5,
                      color: 'var(--text-muted)',
                      lineHeight: 1.3,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {preset.description}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Category Sections List */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          maxHeight: 380,
          overflowY: 'auto',
          paddingRight: 4,
          minHeight: 0,
        }}
      >
        {Object.keys(groupedCategories).length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            "{searchQuery}" so‘rovi bo‘yicha hech qanday ruxsat topilmadi.
          </div>
        ) : (
          Object.entries(groupedCategories).map(([catKey, perms]) => {
            const meta = CATEGORY_META[catKey] || {
              name: catKey.toUpperCase(),
              icon: KeyRound,
              color: 'var(--primary)',
              description: 'Bo‘lim ruxsatlari',
            };
            const IconComponent = meta.icon;

            const catAllPerms = permissionChoices.filter((p) => (p.category || 'other') === catKey);
            const catAllIds = catAllPerms.map((p) => p.id);
            const catSelectedCount = catAllIds.filter((id) => selectedSet.has(id)).length;
            const isCatAllSelected = catAllIds.length > 0 && catSelectedCount === catAllIds.length;
            const isCatIndeterminate = catSelectedCount > 0 && catSelectedCount < catAllIds.length;
            const isExpanded = searchQuery.trim().length > 0 || Boolean(expandedCategories[catKey]);

            return (
              <div
                key={catKey}
                style={{
                  borderRadius: 10,
                  background: 'var(--bg-surface, rgba(255, 255, 255, 0.02))',
                  border: isCatAllSelected
                    ? '1px solid rgba(99, 102, 241, 0.3)'
                    : '1px solid var(--border-subtle, rgba(255, 255, 255, 0.06))',
                  overflow: 'hidden',
                  transition: 'border-color 0.2s ease',
                  flexShrink: 0,
                }}
              >
                {/* Section Header */}
                <div
                  style={{
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    background: isCatAllSelected
                      ? 'rgba(99, 102, 241, 0.07)'
                      : 'rgba(255, 255, 255, 0.02)',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                  onClick={() => toggleAccordion(catKey)}
                >
                  {/* Left: Icon, Title & Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        background: 'color-mix(in srgb, ' + meta.color + ' 10%, transparent)',
                        color: meta.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <IconComponent size={16} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                          {meta.name}
                        </span>
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: 999,
                            background: isCatAllSelected
                              ? 'rgba(var(--success-rgb), 0.2)'
                              : catSelectedCount > 0
                              ? 'rgba(99, 102, 241, 0.18)'
                              : 'var(--bg-chip, rgba(255, 255, 255, 0.05))',
                            color: isCatAllSelected
                              ? 'var(--accent-emerald)'
                              : catSelectedCount > 0
                              ? 'var(--primary)'
                              : 'var(--text-muted, #9ca3af)',
                          }}
                        >
                          {isCatAllSelected
                            ? `Barchasi (${catSelectedCount}/${catAllIds.length})`
                            : `${catSelectedCount} / ${catAllIds.length}`}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                        {meta.description}
                      </div>
                    </div>
                  </div>

                  {/* Right: Master Checkbox & Accordion Toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                      Bo‘limga ruxsat:
                    </span>
                    <StylishCategoryCheckbox
                      checked={isCatAllSelected}
                      indeterminate={isCatIndeterminate}
                      onChange={() => handleToggleCategory(catKey)}
                      disabled={disabled}
                    />
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAccordion(catKey);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title={isExpanded ? 'Yig‘ish' : 'Ochish'}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Section Body with Individual Switches */}
                {isExpanded && (
                  <div
                    style={{
                      padding: '8px 12px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      borderTop: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.05))',
                    }}
                  >
                    {perms.map((perm) => {
                      const isChecked = selectedSet.has(perm.id);
                      const desc = PERMISSION_DESCRIPTIONS[perm.codename];
                      const isSensitive =
                        perm.codename === 'view_cost_price' || perm.codename === 'void_sale';

                      return (
                        <div
                          key={perm.id}
                          role="button"
                          tabIndex={disabled ? -1 : 0}
                          onClick={() => handleTogglePermission(perm.id)}
                          onKeyDown={(e) => {
                            if (e.key === ' ' || e.key === 'Enter') {
                              e.preventDefault();
                              handleTogglePermission(perm.id);
                            }
                          }}
                          style={{
                            padding: '8px 10px',
                            borderRadius: 8,
                            background: isChecked
                              ? 'rgba(99, 102, 241, 0.08)'
                              : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (!isChecked) e.currentTarget.style.background = 'var(--bg-card-hover, rgba(255, 255, 255, 0.03))';
                          }}
                          onMouseLeave={(e) => {
                            if (!isChecked) e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          {/* Permission info */}
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: isChecked ? 600 : 500,
                                  color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)',
                                }}
                              >
                                {perm.name}
                              </span>
                              {isSensitive && (
                                <span
                                  style={{
                                    fontSize: 9.5,
                                    fontWeight: 700,
                                    padding: '1px 5px',
                                    borderRadius: 4,
                                    background: 'rgba(var(--danger-rgb), 0.15)',
                                    color: 'var(--accent-rose)',
                                    border: '1px solid rgba(var(--danger-rgb), 0.3)',
                                  }}
                                >
                                  {perm.codename === 'view_cost_price' ? 'Maxfiy' : 'Muhim'}
                                </span>
                              )}
                            </div>
                            {desc && (
                              <div
                                style={{
                                  fontSize: 11.5,
                                  color: 'var(--text-muted)',
                                  marginTop: 1,
                                  lineHeight: 1.3,
                                }}
                              >
                                {desc}
                              </div>
                            )}
                          </div>

                          {/* Neumorphic Switch */}
                          <NeumorphicSwitch
                            checked={isChecked}
                            onChange={() => handleTogglePermission(perm.id)}
                            disabled={disabled}
                            id={`perm-${perm.id}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
