import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Smile, Briefcase } from 'lucide-react';

export const STICKERS = [
  // Biznes va Savdo
  { id: 'tg_money', emoji: '💰', label: 'To‘lov qabul', category: 'business' },
  { id: 'tg_box', emoji: '📦', label: 'Yuk yetib keldi', category: 'business' },
  { id: 'tg_rocket', emoji: '🚀', label: 'Tezkor bajarildi', category: 'business' },
  { id: 'tg_handshake', emoji: '🤝', label: 'Kelishdik / Rahmat', category: 'business' },
  { id: 'tg_bolt', emoji: '⚡', label: 'Kassa / Tezlik', category: 'business' },
  { id: 'tg_receipt', emoji: '🧾', label: 'Chek chiqdi', category: 'business' },
  { id: 'tg_cart', emoji: '🛒', label: 'Yangi savdo', category: 'business' },
  { id: 'tg_shield', emoji: '🛡️', label: 'Kafolatlangan', category: 'business' },
  { id: 'tg_truck', emoji: '🚚', label: 'Yetkazib berilmoqda', category: 'business' },
  { id: 'tg_chart', emoji: '📈', label: 'Savdo o‘smoqda', category: 'business' },
  { id: 'tg_bank', emoji: '🏦', label: 'Bank o‘tkazmasi', category: 'business' },
  { id: 'tg_lock', emoji: '🔒', label: 'Xavfsiz saqlash', category: 'business' },

  // Hissiyotlar va Reaksiyalar
  { id: 'tg_thumbsup', emoji: '👍', label: 'A‘lo / Ma‘qul', category: 'reactions' },
  { id: 'tg_fire', emoji: '🔥', label: 'Super natija', category: 'reactions' },
  { id: 'tg_heart', emoji: '❤️', label: 'Katta rahmat', category: 'reactions' },
  { id: 'tg_party', emoji: '🎉', label: 'Tabriklaymiz!', category: 'reactions' },
  { id: 'tg_laugh', emoji: '😄', label: 'Tushunarli', category: 'reactions' },
  { id: 'tg_clap', emoji: '👏', label: 'Ofarin!', category: 'reactions' },
  { id: 'tg_coffee', emoji: '☕', label: 'Tanaffus', category: 'reactions' },
  { id: 'tg_clock', emoji: '⏳', label: 'Kutilmoqda', category: 'reactions' },
  { id: 'tg_bulb', emoji: '💡', label: 'Yechim topildi', category: 'reactions' },
  { id: 'tg_target', emoji: '🎯', label: 'Aniq nishon', category: 'reactions' },
  { id: 'tg_ok', emoji: '👌', label: 'Hammasi joyida', category: 'reactions' },
  { id: 'tg_star', emoji: '⭐', label: '5 yulduzli xizmat', category: 'reactions' },
];

export const STICKER_DICT = Object.fromEntries(STICKERS.map((s) => [s.id, s]));

export function StickerItem({ stickerId, className = '', showLabel = false }) {
  const item = STICKER_DICT[stickerId];
  if (!item) {
    return <span className={`support-unknown-sticker ${className}`}>✨</span>;
  }
  return (
    <div className={`support-sticker-render ${className}`} title={item.label}>
      <span className="support-sticker-emoji">{item.emoji}</span>
      {showLabel && <span className="support-sticker-label">{item.label}</span>}
    </div>
  );
}

export default function StickerPicker({ onSelect, onClose }) {
  const [activeTab, setActiveTab] = useState('business');
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const filteredStickers = STICKERS.filter((s) => s.category === activeTab);

  return (
    <div className="support-sticker-picker" ref={containerRef}>
      <div className="support-sticker-header">
        <div className="support-sticker-tabs">
          <button
            type="button"
            className={`support-sticker-tab ${activeTab === 'business' ? 'active' : ''}`}
            onClick={() => setActiveTab('business')}
          >
            <Briefcase size={13} />
            <span>Savdo & Biznes</span>
          </button>
          <button
            type="button"
            className={`support-sticker-tab ${activeTab === 'reactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('reactions')}
          >
            <Smile size={13} />
            <span>Reaksiyalar</span>
          </button>
        </div>
      </div>

      <div className="support-sticker-grid">
        {filteredStickers.map((stk) => (
          <button
            key={stk.id}
            type="button"
            className="support-sticker-btn"
            onClick={() => {
              onSelect(stk.id);
              onClose();
            }}
            title={stk.label}
          >
            <span className="support-sticker-btn-emoji">{stk.emoji}</span>
            <span className="support-sticker-btn-title">{stk.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
