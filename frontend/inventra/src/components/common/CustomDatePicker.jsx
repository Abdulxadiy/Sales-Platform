import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import CustomSelect from './CustomSelect';

const MONTH_NAMES_UZ = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
];

const WEEK_DAYS_UZ = ['Dsh', 'Ssh', 'Chsh', 'Psh', 'Jm', 'Sh', 'Ysh'];

/**
 * Universal Glassmorphic CustomDatePicker Component
 * Replaces native browser <input type="date"> with a sleek Uzbek-localized calendar.
 * Supports rapid year/month jump (ideal for birth dates), day grid, and quick presets.
 */
export default function CustomDatePicker({
  value = '',
  onChange,
  placeholder = 'Sanani tanlang...',
  min = '1920-01-01',
  max = '2030-12-31',
  disabled = false,
  className = '',
  style = {},
  size = 'md', // 'sm' | 'md' | 'lg'
  name = '',
  id = '',
  fullWidth = false,
  clearable = true,
  title = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse initial date or default to current date
  const parseDate = (str) => {
    if (!str) return null;
    const parts = str.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return new Date(y, m, d);
      }
    }
    return null;
  };

  const selectedDate = parseDate(value);
  const today = new Date();

  // Calendar view state (which month/year is currently being viewed)
  const [viewYear, setViewYear] = useState(selectedDate ? selectedDate.getFullYear() : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate ? selectedDate.getMonth() : today.getMonth());

  // Update view when value changes from outside
  useEffect(() => {
    if (selectedDate) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
    }
  }, [value]);

  // Close calendar when clicking outside or pressing Escape
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

  const minDate = parseDate(min) || new Date(1920, 0, 1);
  const maxDate = parseDate(max) || new Date(2030, 11, 31);

  const minYear = minDate.getFullYear();
  const maxYear = maxDate.getFullYear();

  // Generate Year options (descending order for fast birth-date picking)
  const yearOptions = [];
  for (let y = maxYear; y >= minYear; y--) {
    yearOptions.push(y);
  }

  // Format date to 'YYYY-MM-DD'
  const formatDateStr = (year, month, day) => {
    const yStr = String(year);
    const mStr = String(month + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    return `${yStr}-${mStr}-${dStr}`;
  };

  // Human-readable formatted string for display
  const formatDisplay = (date) => {
    if (!date) return '';
    const day = date.getDate();
    const monthName = MONTH_NAMES_UZ[date.getMonth()];
    const year = date.getFullYear();
    return `${String(day).padStart(2, '0')}-${monthName}, ${year}`;
  };

  const handleSelectDay = (day) => {
    const dateStr = formatDateStr(viewYear, viewMonth, day);
    setIsOpen(false);
    triggerChange(dateStr);
  };

  const triggerChange = (valStr) => {
    if (onChange) {
      onChange(valStr);
      // Support synthetic event for form consumers
      if (typeof onChange === 'function') {
        const syntheticEvent = {
          target: { name, value: valStr },
          currentTarget: { name, value: valStr },
          preventDefault: () => {},
          stopPropagation: () => {},
        };
        try {
          onChange(syntheticEvent);
        } catch (_) {}
      }
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    triggerChange('');
  };

  const handleToday = () => {
    const todayStr = formatDateStr(today.getFullYear(), today.getMonth(), today.getDate());
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setIsOpen(false);
    triggerChange(todayStr);
  };

  const prevMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // Calculate days in current view month
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  // Day of week for 1st day of month (0 = Sunday, 1 = Monday, ...)
  // Shift so Monday is index 0:
  let firstDayIndex = new Date(viewYear, viewMonth, 1).getDay() - 1;
  if (firstDayIndex === -1) firstDayIndex = 6; // Sunday becomes 6

  // Check if day is disabled by min/max
  const isDayDisabled = (day) => {
    const target = new Date(viewYear, viewMonth, day);
    if (target < minDate) return true;
    if (target > maxDate) return true;
    return false;
  };

  // Check if day is today
  const isToday = (day) => {
    return (
      viewYear === today.getFullYear() &&
      viewMonth === today.getMonth() &&
      day === today.getDate()
    );
  };

  // Check if day is selected
  const isSelected = (day) => {
    if (!selectedDate) return false;
    return (
      viewYear === selectedDate.getFullYear() &&
      viewMonth === selectedDate.getMonth() &&
      day === selectedDate.getDate()
    );
  };

  // Size styling
  const sizeStyles = {
    sm: {
      padding: '5px 9px',
      fontSize: 12,
      minHeight: 30,
      iconSize: 13,
    },
    md: {
      padding: '8px 12px',
      fontSize: 13,
      minHeight: 38,
      iconSize: 14,
    },
    lg: {
      padding: '11px 14px',
      fontSize: 14,
      minHeight: 44,
      iconSize: 16,
    },
  }[size] || {
    padding: '8px 12px',
    fontSize: 13,
    minHeight: 38,
    iconSize: 14,
  };

  return (
    <div
      ref={containerRef}
      id={id ? `${id}-container` : undefined}
      className={`custom-datepicker-wrapper ${className}`}
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
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          width: fullWidth ? '100%' : 'auto',
          minHeight: sizeStyles.minHeight,
          padding: sizeStyles.padding,
          fontSize: sizeStyles.fontSize,
          fontWeight: 600,
          borderRadius: 'var(--radius-sm, 10px)',
          border: isOpen ? '1px solid var(--primary)' : '1px solid var(--border-card)',
          background: 'var(--bg-input, rgba(255, 255, 255, 0.04))',
          color: selectedDate ? 'var(--text-primary)' : 'var(--text-muted)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          boxShadow: isOpen ? '0 0 0 2px rgba(245, 158, 11, 0.2)' : 'none',
          transition: 'all 0.15s ease',
          opacity: disabled ? 0.6 : 1,
          whiteSpace: 'nowrap',
          ...style,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <Calendar size={sizeStyles.iconSize} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedDate ? formatDisplay(selectedDate) : placeholder}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginLeft: 6 }}>
          {clearable && selectedDate && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              title="Tozalash"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 2,
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--accent-rose, #ef4444)';
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Floating Glassmorphic Calendar Popover */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            width: 290,
            background: 'var(--bg-card, #1e222d)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid var(--border-medium, rgba(255, 255, 255, 0.12))',
            borderRadius: 'var(--radius-sm, 12px)',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5)',
            zIndex: 1060,
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {/* Header: Month & Year Selectors + Nav Arrows */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
            <button
              type="button"
              onClick={prevMonth}
              title="Oldingi oy"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: 6,
                border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
                background: 'var(--bg-input, rgba(255, 255, 255, 0.04))',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <ChevronLeft size={15} />
            </button>

            {/* Quick Month & Year Pickers */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center' }}>
              {/* Month Picker */}
              <CustomSelect
                value={viewMonth}
                onChange={(val) => setViewMonth(parseInt(val, 10))}
                options={MONTH_NAMES_UZ.map((mName, idx) => ({
                  value: idx,
                  label: mName,
                }))}
                size="sm"
                style={{
                  minWidth: 98,
                  height: 28,
                  padding: '2px 8px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                }}
                menuStyle={{ maxHeight: 200, minWidth: 110 }}
              />

              {/* Year Picker (Supports jumping to 1980, 1995, etc. instantly!) */}
              <CustomSelect
                value={viewYear}
                onChange={(val) => setViewYear(parseInt(val, 10))}
                options={yearOptions.map((y) => ({
                  value: y,
                  label: String(y),
                }))}
                size="sm"
                style={{
                  minWidth: 76,
                  height: 28,
                  padding: '2px 8px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                }}
                menuStyle={{ maxHeight: 200, minWidth: 85 }}
              />
            </div>

            <button
              type="button"
              onClick={nextMonth}
              title="Keyingi oy"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: 6,
                border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
                background: 'var(--bg-input, rgba(255, 255, 255, 0.04))',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Days of Week Header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', gap: 2 }}>
            {WEEK_DAYS_UZ.map((dayName, idx) => (
              <div
                key={dayName}
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: idx >= 5 ? 'var(--accent-rose, #ef4444)' : 'var(--text-muted)',
                  padding: '4px 0',
                }}
              >
                {dayName}
              </div>
            ))}
          </div>

          {/* Day Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
            {/* Empty slots for start of month */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => (
              <div key={`empty-${idx}`} style={{ height: 30 }} />
            ))}

            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const disabledDay = isDayDisabled(day);
              const selected = isSelected(day);
              const currentToday = isToday(day);

              return (
                <button
                  key={day}
                  type="button"
                  disabled={disabledDay}
                  onClick={() => handleSelectDay(day)}
                  style={{
                    height: 30,
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 6,
                    border: currentToday && !selected ? '1px solid var(--primary)' : 'none',
                    background: selected
                      ? 'var(--primary, #f59e0b)'
                      : 'transparent',
                    color: selected
                      ? '#ffffff'
                      : disabledDay
                      ? 'rgba(150, 150, 150, 0.3)'
                      : 'var(--text-primary)',
                    fontSize: 12,
                    fontWeight: selected || currentToday ? 700 : 500,
                    cursor: disabledDay ? 'not-allowed' : 'pointer',
                    transition: 'all 0.12s ease',
                    outline: 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!selected && !disabledDay) {
                      e.currentTarget.style.background = 'var(--bg-app, rgba(255, 255, 255, 0.08))';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!selected && !disabledDay) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Quick Footer Action Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
              paddingTop: 8,
              marginTop: 2,
            }}
          >
            <button
              type="button"
              onClick={handleToday}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--primary)',
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
                padding: '3px 6px',
                borderRadius: 4,
              }}
            >
              Bugun
            </button>

            {selectedDate && (
              <button
                type="button"
                onClick={handleClear}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '3px 6px',
                  borderRadius: 4,
                }}
              >
                Tozalash
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
