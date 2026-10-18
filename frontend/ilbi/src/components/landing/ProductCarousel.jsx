import React, { useCallback, useEffect, useRef, useState } from "react";
import IlbiLoader from "../common/IlbiLoader";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ImageOff,
  Maximize2,
  MousePointer2,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { carouselScenes as scenes } from "./carouselScenes";
import { useCarouselPlayback } from "../../hooks/useCarouselPlayback";
import "./ProductCarousel.css";

const count = scenes.length;
const mod = (value) => ((value % count) + count) % count;
const offset = (index, active) =>
  mod(index - active + Math.floor(count / 2)) - Math.floor(count / 2);
const pad = (value) => String(value).padStart(2, "0");

function GalleryViewer({ index, onChange, onClose, restoreFocus }) {
  const dialog = useRef(null);
  const canvas = useRef(null);
  const [zoomed, setZoomed] = useState(false);
  const scene = scenes[index];
  useEffect(() => {
    const node = dialog.current;
    const previous = document.activeElement;
    node.showModal();
    return () => {
      node.close();
      if (previous?.isConnected && !previous.closest('[aria-hidden="true"]'))
        previous.focus({ preventScroll: true });
      else restoreFocus();
    };
  }, [restoreFocus]);
  const toggleZoom = (event) => {
    const expanded = !zoomed;
    const image = canvas.current.querySelector("img");
    const rect = image.getBoundingClientRect();
    const origin =
      event?.type === "dblclick"
        ? {
            x: (event.clientX - rect.left) / rect.width,
            y: (event.clientY - rect.top) / rect.height,
          }
        : { x: 0.5, y: 0.5 };
    setZoomed(expanded);
    requestAnimationFrame(() => {
      const area = canvas.current;
      if (area)
        area.scrollTo({
          left: expanded
            ? area.scrollWidth * origin.x - area.clientWidth / 2
            : 0,
          top: expanded
            ? area.scrollHeight * origin.y - area.clientHeight / 2
            : 0,
        });
    });
  };
  const change = (delta) => {
    setZoomed(false);
    canvas.current?.scrollTo({ top: 0, left: 0 });
    onChange(delta);
  };
  return (
    <dialog
      ref={dialog}
      className="lp-dialog pc-viewer"
      aria-labelledby="pc-viewer-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const r = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < r.left ||
            event.clientX > r.right ||
            event.clientY < r.top ||
            event.clientY > r.bottom
          )
            onClose();
        }
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (
          zoomed &&
          event.target === canvas.current &&
          (event.key === "ArrowLeft" || event.key === "ArrowRight")
        )
          return;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          change(event.key === "ArrowRight" ? 1 : -1);
        }
        if (event.key === "Tab") {
          const elements = [
            ...dialog.current.querySelectorAll(
              'button:not([disabled]),[tabindex="0"]',
            ),
          ].filter((e) => e.getClientRects().length);
          if (event.shiftKey && document.activeElement === elements[0]) {
            event.preventDefault();
            elements.at(-1)?.focus();
          } else if (
            !event.shiftKey &&
            document.activeElement === elements.at(-1)
          ) {
            event.preventDefault();
            elements[0]?.focus();
          }
        }
      }}
    >
      <div className="pc-viewer-header">
        <div>
          <span className="lp-eyebrow">ILBI / DASTURDAN LAVHALAR</span>
          <h2 id="pc-viewer-title">
            {scene.label}{" "}
            <span>
              {pad(index + 1)} / {pad(count)}
            </span>
          </h2>
        </div>
        <div>
          <button
            type="button"
            className="lp-icon-button"
            aria-label={
              zoomed
                ? "Rasmni oynaga sig‘dirish"
                : "Rasmni asl o‘lchamda ko‘rish"
            }
            aria-pressed={zoomed}
            onClick={toggleZoom}
          >
            {zoomed ? <ZoomOut size={19} /> : <ZoomIn size={19} />}
          </button>
          <button
            type="button"
            className="lp-icon-button"
            onClick={onClose}
            aria-label="Lavhani yopish"
          >
            <X size={21} />
          </button>
        </div>
      </div>
      <div
        className="pc-viewer-canvas"
        ref={canvas}
        data-zoomed={zoomed}
        tabIndex={0}
        aria-label={
          zoomed
            ? "Rasmni yon tomonga va pastga surib ko‘rish mumkin"
            : "Kattalashtirilgan dastur lavhasi"
        }
      >
        <img
          key={scene.id}
          src={scene.image}
          alt={scene.alt}
          width="1440"
          height="1100"
          draggable={false}
          onDoubleClick={toggleZoom}
        />
      </div>
      <div className="pc-viewer-footer">
        <div>
          <strong>{scene.title}</strong>
          <span>
            {zoomed
              ? "Rasmni surib, tafsilotlarni ko‘ring"
              : "Tafsilotlar uchun + tugmasini bosing"}
          </span>
        </div>
        <div>
          <button
            type="button"
            className="lp-icon-button"
            onClick={() => change(-1)}
            aria-label="Oldingi lavha"
          >
            <ArrowLeft size={19} />
          </button>
          <button
            type="button"
            className="lp-icon-button"
            onClick={() => change(1)}
            aria-label="Keyingi lavha"
          >
            <ArrowRight size={19} />
          </button>
        </div>
      </div>
    </dialog>
  );
}

export default function ProductCarousel() {
  const root = useRef(null);
  const viewport = useRef(null);
  const rail = useRef(null);
  const activeImage = useRef(null);
  const gesture = useRef(null);
  const suppressClick = useRef(0);
  const [position, setPosition] = useState(0);
  const [viewer, setViewer] = useState(false);
  const [loaded, setLoaded] = useState(() => new Set());
  const [failed, setFailed] = useState(() => new Set());
  const [retries, setRetries] = useState({});
  const active = mod(position);
  const scene = scenes[active];
  const advance = useCallback(() => setPosition((value) => value + 1), []);
  const restoreFocus = useCallback(
    () => activeImage.current?.focus({ preventScroll: true }),
    [],
  );
  const { playing, running, setPlaying, setHovered, setFocused } =
    useCarouselPlayback({
      root,
      viewport,
      index: active,
      ready: loaded.has(active) && !failed.has(active),
      blocked: viewer,
      advance,
    });

  const move = (delta) => {
    setPlaying(false);
    setPosition((value) => value + delta);
  };
  const select = (index) => {
    setPlaying(false);
    setPosition((value) => value + offset(index, mod(value)));
  };
  const enlarge = () => {
    setPlaying(false);
    setViewer(true);
  };
  const imageLoaded = (index) => {
    setLoaded((current) =>
      current.has(index) ? current : new Set(current).add(index),
    );
    setFailed((current) => {
      if (!current.has(index)) return current;
      const next = new Set(current);
      next.delete(index);
      return next;
    });
  };
  const retry = (index) => {
    setFailed((current) => {
      const next = new Set(current);
      next.delete(index);
      return next;
    });
    setRetries((current) => ({
      ...current,
      [index]: (current[index] || 0) + 1,
    }));
  };

  useEffect(() => {
    const button = rail.current?.querySelector('[aria-selected="true"]');
    if (button && rail.current.scrollWidth > rail.current.clientWidth) {
      const left =
        button.offsetLeft - (rail.current.clientWidth - button.offsetWidth) / 2;
      rail.current.scrollTo({
        left,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
    }
    if (document.activeElement?.closest('.pc-slide[aria-hidden="true"]'))
      activeImage.current?.focus({ preventScroll: true });
  }, [active]);

  const finishGesture = (event, cancelled = false) => {
    const data = gesture.current;
    if (!data || data.id !== event.pointerId) return;
    if (data.horizontal && !cancelled) {
      suppressClick.current = event.timeStamp + 350;
      if (Math.abs(data.dx) > Math.min(75, viewport.current.clientWidth * 0.12))
        move(data.dx < 0 ? 1 : -1);
    }
    gesture.current = null;
    viewport.current.classList.remove("is-dragging");
    viewport.current.style.setProperty("--pc-drag", "0px");
    if (viewport.current.hasPointerCapture(event.pointerId))
      viewport.current.releasePointerCapture(event.pointerId);
  };

  return (
    <div
      ref={root}
      className="lp-showcase lp-carousel"
      data-reveal
      role="region"
      aria-roledescription="rasmlar karuseli"
      aria-label="ILBI dasturidan haqiqiy lavhalar"
      data-active-scene={scene.id}
      data-playing={playing}
      data-running={running}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") setHovered(false);
      }}
      onFocusCapture={(event) =>
        setFocused(!event.target.closest("[data-carousel-playback]"))
      }
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
      onKeyDown={(event) => {
        if (
          event.target.closest("dialog") ||
          event.target.closest('[role="tablist"]')
        )
          return;
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          move(event.key === "ArrowRight" ? 1 : -1);
        } else if (event.key === "Home" || event.key === "End") {
          event.preventDefault();
          select(event.key === "Home" ? 0 : count - 1);
        }
      }}
    >
      <div className="pc-topline">
        <span>
          <i /> DASTURDAN LAVHALAR <span className="pc-topline-divider">/</span>{" "}
          <span>HAQIQIY INTERFEYS</span>
        </span>
        <div>
          <span className="pc-counter">
            <b>{pad(active + 1)}</b>
            <span>/ {pad(count)}</span>
          </span>
          <button
            type="button"
            className="pc-playback"
            data-carousel-playback
            aria-label={
              playing
                ? "Avtomatik almashishni to‘xtatish"
                : "Avtomatik almashishni yoqish"
            }
            aria-pressed={playing}
            onClick={() => setPlaying((value) => !value)}
          >
            {playing ? <Pause size={13} /> : <Play size={13} />}
            <span>Avtomatik</span>
          </button>
        </div>
      </div>
      <div
        className="pc-viewport"
        ref={viewport}
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0) return;
          suppressClick.current = 0;
          gesture.current = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            dx: 0,
            horizontal: false,
          };
        }}
        onPointerMove={(event) => {
          const data = gesture.current;
          if (!data || data.id !== event.pointerId) return;
          const dx = event.clientX - data.x,
            dy = event.clientY - data.y;
          if (
            !data.horizontal &&
            Math.abs(dx) > 9 &&
            Math.abs(dx) > Math.abs(dy) * 1.25
          ) {
            data.horizontal = true;
            setPlaying(false);
            viewport.current.setPointerCapture(event.pointerId);
            viewport.current.classList.add("is-dragging");
          }
          if (data.horizontal) {
            data.dx = dx;
            viewport.current.style.setProperty(
              "--pc-drag",
              `${Math.max(-110, Math.min(110, dx * 0.55))}px`,
            );
          }
        }}
        onPointerUp={(event) => finishGesture(event)}
        onPointerCancel={(event) => finishGesture(event, true)}
        onLostPointerCapture={(event) => {
          // Touch starts with capture on the image button. Its bubbling loss
          // during transfer to the viewport must not cancel our new gesture.
          if (event.target === event.currentTarget) finishGesture(event, true);
        }}
        onClickCapture={(event) => {
          if (event.timeStamp < suppressClick.current) {
            event.preventDefault();
            event.stopPropagation();
            suppressClick.current = 0;
          }
        }}
      >
        <div className="pc-stage-grid" aria-hidden="true" />
        <div className="pc-stage-orbit" aria-hidden="true" />
        {scenes.map((item, index) => {
          const distance = offset(index, active);
          const current = index === active;
          return (
            <div
              className={`pc-slide ${current ? "is-active" : ""}`}
              key={item.id}
              aria-hidden={!current}
              style={{
                "--pc-offset": distance,
                "--pc-distance": Math.abs(distance),
                zIndex: 10 - Math.abs(distance),
              }}
              data-distance={Math.abs(distance)}
            >
              <div className="pc-window">
                <div className="pc-window-bar">
                  <span className="pc-window-dots">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span>
                    <ShieldCheck size={10} />
                    ilbi.uz / {item.route}
                  </span>
                  <span className="pc-window-mode">TUNGI REJIM</span>
                </div>
                <div className="pc-image-wrap">
                  <img
                    src={`${item.image}${retries[index] ? `?retry=${retries[index]}` : ""}`}
                    width="1440"
                    height="1100"
                    alt={item.alt}
                    draggable={false}
                    loading={Math.abs(distance) <= 1 ? "eager" : "lazy"}
                    decoding="async"
                    onLoad={() => imageLoaded(index)}
                    onError={() =>
                      setFailed((value) => new Set(value).add(index))
                    }
                    className={
                      loaded.has(index) && !failed.has(index) ? "is-loaded" : ""
                    }
                  />
                  {!loaded.has(index) && !failed.has(index) && (
                    <div className="pc-image-loading" aria-hidden="true">
                      <IlbiLoader size={48} inline decorative />
                    </div>
                  )}
                  <button
                    type="button"
                    className="pc-image-action"
                    ref={current ? activeImage : null}
                    tabIndex={current ? 0 : -1}
                    aria-label={
                      current
                        ? `${item.label} lavhasini kattalashtirish`
                        : `${item.label} lavhasiga o‘tish`
                    }
                    onClick={() => (current ? enlarge() : select(index))}
                  >
                    <span>
                      <Maximize2 size={16} />
                      {current ? "Kattalashtirish" : item.label}
                    </span>
                  </button>
                  {failed.has(index) && (
                    <div className="pc-image-error">
                      <ImageOff size={25} />
                      <p>Lavhani yuklab bo‘lmadi.</p>
                      <button
                        type="button"
                        tabIndex={current ? 0 : -1}
                        onClick={() => retry(index)}
                      >
                        <RotateCcw size={14} />
                        Qayta yuklash
                      </button>
                    </div>
                  )}
                </div>
                <div className="pc-window-footer">
                  <span>
                    <item.icon size={11} />
                    {item.label}
                  </span>
                  <span>
                    SINOV MA’LUMOTLARI <i />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <span className="pc-stage-coordinate" aria-hidden="true">
          ILBI / WORKSPACE IN MOTION
        </span>
      </div>
      <div className="pc-navigation">
        <span>
          <MousePointer2 size={13} />
          <span>Surib yoki strelkalar bilan ko‘ring</span>
        </span>
        <div>
          <button
            type="button"
            className="pc-arrow"
            onClick={() => move(-1)}
            aria-label="Oldingi lavha"
          >
            <ArrowLeft size={20} />
          </button>
          <button
            type="button"
            className="pc-arrow"
            onClick={() => move(1)}
            aria-label="Keyingi lavha"
          >
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
      <div
        id="lp-product-panel"
        className="pc-caption"
        role="tabpanel"
        aria-labelledby={`lp-tab-${scene.id}`}
        tabIndex={0}
      >
        <div className="pc-caption-content" key={scene.id}>
          <span className="lp-eyebrow">{scene.eyebrow}</span>
          <h3>{scene.title}</h3>
          <p>{scene.text}</p>
          <ul>
            {scene.tags.map((tag) => (
              <li key={tag}>
                <Check size={13} />
                {tag}
              </li>
            ))}
          </ul>
        </div>
        <button type="button" className="pc-open-detail" onClick={enlarge}>
          Lavhani ochish
          <ArrowUpRight size={18} />
        </button>
      </div>
      <div
        className="pc-filmstrip"
        role="tablist"
        aria-label="Dastur lavhalarini tanlash"
        ref={rail}
      >
        {scenes.map((item, index) => (
          <button
            type="button"
            role="tab"
            id={`lp-tab-${item.id}`}
            key={item.id}
            aria-selected={active === index}
            aria-controls="lp-product-panel"
            tabIndex={active === index ? 0 : -1}
            onClick={() => select(index)}
            onKeyDown={(event) => {
              let next;
              if (event.key === "ArrowRight") next = mod(index + 1);
              else if (event.key === "ArrowLeft") next = mod(index - 1);
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = count - 1;
              if (next !== undefined) {
                event.preventDefault();
                select(next);
                document.getElementById(`lp-tab-${scenes[next].id}`)?.focus();
              }
            }}
          >
            <span className="pc-filmstrip-number">{pad(index + 1)}</span>
            <item.icon size={17} strokeWidth={1.5} />
            <strong>{item.label}</strong>
            <span className="pc-filmstrip-progress" aria-hidden="true">
              <i />
            </span>
          </button>
        ))}
      </div>
      <p
        className="pc-sr-only"
        role="status"
        aria-live={running ? "off" : "polite"}
      >
        {active + 1} / {count}. {scene.title}
      </p>
      {viewer && (
        <GalleryViewer
          index={active}
          onChange={move}
          onClose={() => setViewer(false)}
          restoreFocus={restoreFocus}
        />
      )}
    </div>
  );
}
