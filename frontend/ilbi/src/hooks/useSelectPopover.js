import { useLayoutEffect, useRef, useState } from 'react';

const pixels = (value, fallback) => typeof value === 'number' ? value
  : typeof value === 'string' && /^\d+(\.\d+)?px$/.test(value) ? Number.parseFloat(value) : fallback;
const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

// Keep menus in the browser's top layer, including when their trigger lives
// inside a scrolling dialog, table or another popover.
export function useSelectPopover({ isOpen, anchorRef, menuRef, onClose, searchable, hasFooter, menuStyle }) {
  const supported = typeof HTMLElement !== 'undefined' && typeof HTMLElement.prototype.showPopover === 'function';
  const [position, setPosition] = useState(null);
  const [portalRoot, setPortalRoot] = useState(null);
  const config = useRef(null);
  const styleKey = JSON.stringify(menuStyle);

  useLayoutEffect(() => {
    config.current = { onClose, menuStyle, searchable, hasFooter };
  });

  useLayoutEffect(() => {
    if (!supported) setPortalRoot(anchorRef.current?.closest('dialog') || document.body);
  }, [supported, anchorRef, isOpen]);

  useLayoutEffect(() => {
    if (!isOpen || !menuRef.current || !anchorRef.current) return;
    const menu = menuRef.current;
    const anchor = anchorRef.current;
    const dialog = anchor.closest('dialog');
    const close = () => config.current.onClose();
    if (dialog && !dialog.open) { close(); return; }
    dialog?.addEventListener('close', close);
    if (supported) menu.showPopover();
    let frame;
    const update = () => {
      const { menuStyle: custom, searchable: search, hasFooter: footer } = config.current;
      const rect = anchor.getBoundingClientRect();
      const viewport = window.visualViewport;
      const leftEdge = (viewport?.offsetLeft || 0) + 12;
      const topEdge = (viewport?.offsetTop || 0) + 12;
      const viewportWidth = viewport?.width || window.innerWidth;
      const viewportHeight = viewport?.height || window.innerHeight;
      const rightEdge = leftEdge + Math.max(1, viewportWidth - 24);
      const bottomEdge = topEdge + Math.max(1, viewportHeight - 24);
      const preferredWidth = pixels(custom.width, pixels(custom.minWidth, footer ? 520 : 320));
      const width = Math.min(rightEdge - leftEdge, Math.max(rect.width, preferredWidth));
      const maxDesiredHeight = pixels(custom.maxHeight, search || footer ? 460 : 320);
      const below = Math.max(0, bottomEdge - rect.bottom - 7);
      const above = Math.max(0, rect.top - topEdge - 7);
      const upward = below < Math.min(220, maxDesiredHeight) && above > below;
      const room = upward ? above : below;
      // Very short viewports/virtual keyboards need the whole visible viewport.
      const useViewport = room < Math.min(180, bottomEdge - topEdge);
      const maxHeight = Math.max(1, Math.min(maxDesiredHeight, bottomEdge - topEdge, useViewport ? bottomEdge - topEdge : room));
      const height = Math.min(menu.getBoundingClientRect().height || maxHeight, maxHeight);
      const left = clamp(custom.right !== undefined ? rect.right - width : rect.left, leftEdge, rightEdge - width);
      const top = useViewport ? topEdge : clamp(upward ? rect.top - height - 7 : rect.bottom + 7, topEdge, bottomEdge - height);
      const next = { left, top, width, maxHeight };
      setPosition(current => current && Object.keys(next).every(key => Math.abs(current[key] - next[key]) < 0.5) ? current : next);
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
    const observer = new ResizeObserver(schedule);
    observer.observe(anchor);
    observer.observe(menu);
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    window.visualViewport?.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('scroll', schedule);
    dialog?.addEventListener('animationend', schedule);
    update();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
      window.visualViewport?.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('scroll', schedule);
      dialog?.removeEventListener('animationend', schedule);
      dialog?.removeEventListener('close', close);
      if (supported && menu.matches(':popover-open')) menu.hidePopover();
    };
  }, [isOpen, supported, styleKey, anchorRef, menuRef, portalRoot]);

  return {
    supported,
    portalRoot,
    style: {
      position: 'fixed', margin: 0, right: 'auto', bottom: 'auto', minWidth: 0,
      maxWidth: 'calc(100vw - 24px)', maxHeight: searchable || hasFooter ? 460 : 320,
      width: 'min(520px, calc(100vw - 24px))', left: 0, top: 0,
      visibility: position ? 'visible' : 'hidden', ...position,
    },
  };
}
