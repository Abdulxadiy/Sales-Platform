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
} from 'lucide-react';

const CATEGORY_META = {
  cashbox: {
    name: 'Kassa va Smenalar',
    icon: Wallet,
    color: '#10b981',
    description: 'Smena ochish/yopish, kassa kirim-chiqimlari va hisobotlar',
  },
  catalog: {
    name: 'Katalog va Mahsulotlar',
    icon: Package,
    color: '#f59e0b',
    description: 'Mahsulotlar, kategoriyalar, narxlar va tannarxni ko‘rish',
  },
  inventory: {
    name: 'Ombor va Zaxira',
    icon: Layers,
    color: '#3b82f6',
    description: 'Zaxiralar, tezkor kirim, qoldiqlarni tuzatish va do‘konlararo transfer',
  },
  sales: {
    name: 'Savdo va POS',
    icon: ShoppingCart,
    color: '#8b5cf6',
    description: 'POS kassa savdosi, sotuvni bekor qilish, mijozlar va qarz to‘lovlari',
  },
};

const PERMISSION_DESCRIPTIONS = {
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
};

// PRESETS by codename
const PRESETS = {
  kassir: [
    'manage_shift',
    'view_cashbox',
    'record_income',
    'record_expense',
    'add_sale',
    'view_sale',
    'record_debt_payment',
    'view_product',
    'view_category',
  ],
  omborchi: [
    'view_stock',
    'add_stock_intake',
    'adjust_stock',
    'transfer_stock',
    'view_product',
    'view_category',
    'add_product',
    'change_product',
  ],
  menejer: [
    'manage_shift',
    'view_cashbox',
    'record_income',
    'record_expense',
    'add_sale',
    'view_sale',
    'void_sale',
    'manage_counterparty',
    'record_debt_payment',
    'view_product',
    'add_product',
    'change_product',
    'view_category',
    'add_category',
    'view_stock',
    'add_stock_intake',
    'adjust_stock',
    'transfer_stock',
  ],
};

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
          ? '1px solid var(--primary, #6366f1)'
          : '1px solid var(--border-subtle, rgba(255,255,255,0.12))',
        background: checked
          ? 'linear-gradient(135deg, var(--primary, #6366f1) 0%, #4338ca 100%)'
          : 'var(--bg-chip, rgba(255,255,255,0.06))',
        boxShadow: checked
          ? '0 0 10px rgba(99, 102, 241, 0.45), inset 0 1px 1px rgba(255,255,255,0.3)'
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
          background: checked ? '#ffffff' : '#94a3b8',
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
          ? 'var(--primary, #6366f1)'
          : indeterminate
          ? 'rgba(99, 102, 241, 0.15)'
          : 'var(--bg-surface, rgba(255,255,255,0.03))',
        border: checked || indeterminate
          ? '1.5px solid var(--primary, #6366f1)'
          : '1.5px solid var(--border-hover, rgba(255,255,255,0.25))',
        boxShadow: checked ? '0 0 8px rgba(99, 102, 241, 0.35)' : 'none',
        transition: 'all 0.18s ease',
        flexShrink: 0,
      }}
    >
      {checked && <Check size={13} strokeWidth={3} color="#ffffff" />}
      {!checked && indeterminate && <Minus size={13} strokeWidth={3} color="var(--primary, #6366f1)" />}
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
  disabled = false,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({
    cashbox: true,
    catalog: true,
    inventory: true,
    sales: true,
  });

  const allAvailableIds = useMemo(
    () => permissionChoices.map((p) => p.id),
    [permissionChoices]
  );

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const isFullAccess =
    allAvailableIds.length > 0 &&
    allAvailableIds.every((id) => selectedSet.has(id));

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
  const handleApplyPreset = (presetKey) => {
    if (disabled) return;
    const codenames = PRESETS[presetKey] || [];
    const matchedIds = permissionChoices
      .filter((p) => codenames.includes(p.codename))
      .map((p) => p.id);
    onChange(matchedIds);
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
                ? 'var(--primary, #6366f1)'
                : 'var(--bg-chip, rgba(255, 255, 255, 0.06))',
              color: isFullAccess ? '#ffffff' : 'var(--primary, #6366f1)',
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
                    ? 'rgba(16, 185, 129, 0.2)'
                    : 'var(--bg-chip, rgba(255, 255, 255, 0.06))',
                  color: isFullAccess
                    ? 'var(--accent-emerald, #10b981)'
                    : 'var(--text-muted, #9ca3af)',
                  border: isFullAccess
                    ? '1px solid rgba(16, 185, 129, 0.35)'
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
        {/* Preset Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600 }}>
            Shablonlar:
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={disabled}
            style={{ padding: '3px 9px', fontSize: 11.5, borderRadius: 6 }}
            onClick={() => handleApplyPreset('kassir')}
            title="Kassa, smenalar, savdo va qarz to‘lovlari"
          >
            <Wallet size={12} style={{ marginRight: 4 }} /> Kassir
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={disabled}
            style={{ padding: '3px 9px', fontSize: 11.5, borderRadius: 6 }}
            onClick={() => handleApplyPreset('omborchi')}
            title="Ombor zaxirasi, kirim, tuzatish va tovarlar"
          >
            <Layers size={12} style={{ marginRight: 4 }} /> Omborchi
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={disabled}
            style={{ padding: '3px 9px', fontSize: 11.5, borderRadius: 6 }}
            onClick={() => handleApplyPreset('menejer')}
            title="Savdo, kassa, katalog va ombor amallari"
          >
            <Users size={12} style={{ marginRight: 4 }} /> Menejer
          </button>
          {totalSelectedCount > 0 && (
            <button
              type="button"
              className="btn btn-secondary"
              disabled={disabled}
              style={{
                padding: '3px 9px',
                fontSize: 11.5,
                borderRadius: 6,
                color: 'var(--accent-rose, #ef4444)',
              }}
              onClick={() => onChange([])}
              title="Barcha tanlangan ruxsatlarni tozalash"
            >
              <RotateCcw size={12} style={{ marginRight: 4 }} /> Tozalash
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

      {/* 3. Category Sections List */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          maxHeight: 380,
          overflowY: 'auto',
          paddingRight: 4,
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
            const isExpanded = searchQuery.trim().length > 0 || expandedCategories[catKey] !== false;

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
                        background: `${meta.color}1a`,
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
                              ? 'rgba(16, 185, 129, 0.2)'
                              : catSelectedCount > 0
                              ? 'rgba(99, 102, 241, 0.18)'
                              : 'var(--bg-chip, rgba(255, 255, 255, 0.05))',
                            color: isCatAllSelected
                              ? 'var(--accent-emerald, #10b981)'
                              : catSelectedCount > 0
                              ? 'var(--primary, #6366f1)'
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
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    color: 'var(--accent-rose, #ef4444)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
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
