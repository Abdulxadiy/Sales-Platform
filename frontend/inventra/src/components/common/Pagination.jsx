import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export default function Pagination({
  currentPage = 1,
  totalItems = 0,
  pageSize = 20,
  onPageChange,
  showInfo = true,
  compact = false,
  style = {},
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (totalItems <= 0 || totalPages <= 1) {
    return null;
  }

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers with ellipses
  const getPageNumbers = () => {
    const pages = [];
    const delta = compact ? 1 : 2; // how many pages to show around current
    const left = Math.max(2, currentPage - delta);
    const right = Math.min(totalPages - 1, currentPage + delta);

    pages.push(1);

    if (left > 2) {
      pages.push('...');
    }

    for (let i = left; i <= right; i++) {
      pages.push(i);
    }

    if (right < totalPages - 1) {
      pages.push('...');
    }

    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  const buttonStyle = (isActive = false, isDisabled = false) => ({
    minWidth: compact ? 28 : 34,
    height: compact ? 28 : 34,
    padding: compact ? '0 5px' : '0 8px',
    borderRadius: compact ? 6 : 8,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: compact ? 12 : 13,
    fontWeight: isActive ? 700 : 500,
    border: isActive ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
    background: isActive
      ? 'var(--primary)'
      : isDisabled
      ? 'transparent'
      : 'var(--bg-card)',
    color: isActive
      ? 'var(--primary-foreground)'
      : isDisabled
      ? 'var(--text-muted)'
      : 'var(--text-primary)',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.4 : 1,
    transition: 'all 0.15s ease',
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: compact ? 8 : 12,
        padding: compact ? '8px 14px' : '16px 20px',
        marginTop: compact ? 8 : 16,
        borderRadius: compact ? 10 : 12,
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        ...style,
      }}
    >
      {/* Range Info */}
      {showInfo && (
        <div style={{ fontSize: compact ? 12 : 13, color: 'var(--text-secondary)' }}>
          Jami <strong style={{ color: 'var(--primary)' }}>{totalItems}</strong> tadan{' '}
          <strong style={{ color: 'var(--text-primary)' }}>
            {startItem}–{endItem}
          </strong>{' '}
          ko‘rsatilmoqda (Sahifa {currentPage} / {totalPages})
        </div>
      )}

      {/* Buttons Container */}
      <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 4 : 6, marginLeft: 'auto' }}>
        {/* First Page */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          style={buttonStyle(false, currentPage === 1)}
          title="Birinchi sahifa"
        >
          <ChevronsLeft size={compact ? 14 : 16} />
        </button>

        {/* Previous Page */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={buttonStyle(false, currentPage === 1)}
          title="Oldingi sahifa"
        >
          <ChevronLeft size={compact ? 14 : 16} />
        </button>

        {/* Numeric Page Buttons */}
        {pageNumbers.map((p, idx) => {
          if (p === '...') {
            return (
              <span
                key={`ellipsis-${idx}`}
                style={{
                  minWidth: compact ? 22 : 28,
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: compact ? 12 : 13,
                  userSelect: 'none',
                }}
              >
                ...
              </span>
            );
          }

          const isCurrent = p === currentPage;
          return (
            <button
              key={`page-${p}`}
              type="button"
              onClick={() => onPageChange(p)}
              style={buttonStyle(isCurrent, false)}
            >
              {p}
            </button>
          );
        })}

        {/* Next Page */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={buttonStyle(false, currentPage === totalPages)}
          title="Keyingi sahifa"
        >
          <ChevronRight size={compact ? 14 : 16} />
        </button>

        {/* Last Page */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          style={buttonStyle(false, currentPage === totalPages)}
          title="Oxirgi sahifa"
        >
          <ChevronsRight size={compact ? 14 : 16} />
        </button>
      </div>
    </div>
  );
}
