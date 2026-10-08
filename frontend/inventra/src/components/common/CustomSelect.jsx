import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

const renderIconNode = (IconNode, size) => {
  if (!IconNode) return null;
  if (React.isValidElement(IconNode)) return IconNode;
  if (
    typeof IconNode === 'function' ||
    (typeof IconNode === 'object' && IconNode !== null && (IconNode.$$typeof || typeof IconNode.render === 'function'))
  ) {
    return React.createElement(IconNode, { size });
  }
  if (typeof IconNode === 'string' || typeof IconNode === 'number') {
    return IconNode;
  }
  return null;
};

/**
 * Universal Glassmorphic CustomSelect Component
 * Replaces native browser <select> with a sleek, accessible, theme-integrated dropdown.
 */
export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Tanlang...',
  icon: Icon = null,
  disabled = false,
  className = '',
  style = {},
  menuStyle = {},
  size = 'md', // 'sm' | 'md' | 'lg'
  name = '',
  id = '',
  fullWidth = false,
  title = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Normalize options to [{ value, label, icon, badge, disabled }]
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'object' && opt !== null) {
      return {
        value: opt.value ?? '',
        label: opt.label ?? opt.name ?? String(opt.value ?? ''),
        icon: opt.icon ?? null,
        badge: opt.badge ?? null,
        disabled: Boolean(opt.disabled),
        color: opt.color ?? null,
      };
    }
    return {
      value: opt,
      label: String(opt),
      icon: null,
      badge: null,
      disabled: false,
      color: null,
    };
  });

  const selectedOption = normalizedOptions.find(
    (opt) => String(opt.value) === String(value)
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (opt) => {
    if (opt.disabled || disabled) return;
    setIsOpen(false);

    if (typeof onChange === 'function') {
      const syntheticEvent = {
        target: { name, value: opt.value },
        currentTarget: { name, value: opt.value },
        preventDefault: () => {},
        stopPropagation: () => {},
      };

      try {
        // First try standard callback with direct value and synthetic event as second arg
        onChange(opt.value, syntheticEvent);
      } catch (err) {
        // If caller expected (e) => e.target.value and crashed on primitive value:
        try {
          onChange(syntheticEvent);
        } catch (_) {}
      }
    }
  };

  // Size variations
  const sizeStyles = {
    sm: {
      padding: '5px 9px',
      fontSize: 12,
      minHeight: 30,
      iconSize: 13,
      gap: 5,
    },
    md: {
      padding: '8px 12px',
      fontSize: 13,
      minHeight: 38,
      iconSize: 14,
      gap: 7,
    },
    lg: {
      padding: '11px 14px',
      fontSize: 14,
      minHeight: 44,
      iconSize: 16,
      gap: 8,
    },
  }[size] || {
    padding: '8px 12px',
    fontSize: 13,
    minHeight: 38,
    iconSize: 14,
    gap: 7,
  };

  return (
    <div
      ref={containerRef}
      id={id ? `${id}-container` : undefined}
      className={`custom-select-wrapper ${className}`}
      style={{
        position: 'relative',
        display: fullWidth ? 'flex' : 'inline-flex',
        width: fullWidth ? '100%' : 'auto',
        userSelect: 'none',
      }}
      title={title}
    >
      {/* Hidden input for form serialization */}
      {name && <input type="hidden" name={name} value={value ?? ''} id={id} />}

      {/* Main Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: sizeStyles.gap,
          width: fullWidth ? '100%' : 'auto',
          minHeight: sizeStyles.minHeight,
          padding: sizeStyles.padding,
          fontSize: sizeStyles.fontSize,
          fontWeight: 600,
          borderRadius: 'var(--radius-sm, 10px)',
          border: isOpen ? '1px solid var(--primary)' : '1px solid var(--border-card)',
          background: 'var(--bg-input, rgba(255, 255, 255, 0.04))',
          color: selectedOption ? 'var(--text-primary)' : 'var(--text-muted)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          boxShadow: isOpen ? '0 0 0 2px rgba(245, 158, 11, 0.2)' : 'none',
          transition: 'all 0.15s ease',
          opacity: disabled ? 0.6 : 1,
          textAlign: 'left',
          whiteSpace: 'nowrap',
          ...style,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: sizeStyles.gap, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {Icon && (
            <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--primary)', flexShrink: 0 }}>
              {renderIconNode(Icon, sizeStyles.iconSize)}
            </span>
          )}

          {selectedOption?.icon && (
            <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--primary)', flexShrink: 0 }}>
              {renderIconNode(selectedOption.icon, sizeStyles.iconSize)}
            </span>
          )}

          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>

          {selectedOption?.badge && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 4,
                background: 'rgba(245, 158, 11, 0.15)',
                color: 'var(--primary)',
                marginLeft: 2,
              }}
            >
              {selectedOption.badge}
            </span>
          )}
        </div>

        <ChevronDown
          size={sizeStyles.iconSize}
          style={{
            color: 'var(--text-muted)',
            flexShrink: 0,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            marginLeft: 4,
          }}
        />
      </button>

      {/* Floating Glassmorphic Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 5px)',
            left: 0,
            minWidth: '100%',
            maxWidth: 360,
            maxHeight: 280,
            overflowY: 'auto',
            background: 'var(--bg-card, #1e222d)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid var(--border-medium, rgba(255, 255, 255, 0.12))',
            borderRadius: 'var(--radius-sm, 10px)',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45)',
            zIndex: 1050,
            padding: 5,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            ...menuStyle,
          }}
        >
          {normalizedOptions.length === 0 ? (
            <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
              Variantlar yo‘q
            </div>
          ) : (
            normalizedOptions.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              const OptIcon = opt.icon;

              return (
                <div
                  key={String(opt.value)}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(opt)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-xs, 6px)',
                    fontSize: sizeStyles.fontSize,
                    fontWeight: isSelected ? 700 : 500,
                    color: isSelected
                      ? 'var(--primary)'
                      : opt.disabled
                      ? 'var(--text-muted)'
                      : 'var(--text-primary)',
                    background: isSelected
                      ? 'rgba(245, 158, 11, 0.12)'
                      : 'transparent',
                    cursor: opt.disabled ? 'not-allowed' : 'pointer',
                    transition: 'background 0.15s ease, color 0.15s ease',
                    whiteSpace: 'nowrap',
                    opacity: opt.disabled ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && !opt.disabled) {
                      e.currentTarget.style.background = 'var(--bg-app, rgba(255, 255, 255, 0.06))';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected && !opt.disabled) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {OptIcon && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', color: isSelected ? 'var(--primary)' : 'var(--text-muted)' }}>
                        {renderIconNode(OptIcon, sizeStyles.iconSize)}
                      </span>
                    )}
                    <span>{opt.label}</span>
                    {opt.badge && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: 4,
                          background: isSelected ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                          color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
                        }}
                      >
                        {opt.badge}
                      </span>
                    )}
                  </div>

                  {isSelected && (
                    <Check size={14} style={{ color: 'var(--primary)', flexShrink: 0, marginLeft: 8 }} />
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
