import React, {
  lazy,
  Suspense,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowDown,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  History,
  Layers3,
  Menu,
  Moon,
  Package,
  Play,
  ReceiptText,
  RotateCcw,
  Send,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Store,
  Sun,
  Users,
  X,
} from "lucide-react";
import IlbiLogo from "../components/common/IlbiLogo";
import { paths } from "../components/common/ilbi/logo";
import { useTheme } from "../context/ThemeContext";
import { docsApi } from "../api/client";
import { useLandingMotion } from "../hooks/useLandingMotion";
import "./Landing.css";
import "./LandingMotion.css";
import ProductCarousel from "../components/landing/ProductCarousel";

const MarkdownViewer = lazy(() => import("../components/docs/MarkdownViewer"));
// Real UI captures from isolated night-theme QA; all displayed account and
// business data are synthetic. Keep marketing captures separate from live data.
const views = [
  {
    id: "pos",
    label: "Kassa",
    icon: ShoppingCart,
    image: "/landing/pos-dark.png",
    title: "Savdoga e’tibor bering. Hisobini ILBI yuritadi.",
    text: "Mahsulotni toping, savatga qo‘shing va to‘lovni rasmiylashtiring. Kundalik savdo uchun kerakli amallar bitta oynada.",
    tags: [
      "Shtrix-kod orqali qidirish",
      "Naqd va karta to‘lovlari",
      "Elektron savdo nusxasi",
    ],
    alt: "ILBI kassasi: mahsulotlar katalogi, qidiruv va xarid savati. Namuna ma’lumotlar.",
  },
  {
    id: "dashboard",
    label: "Tahlil",
    icon: BarChart3,
    image: "/landing/dashboard-dark.png",
    title: "Raqamlar tarqoq emas. Manzara aniq.",
    text: "Savdo, xarajat va qarzdorlikni tanlangan davr bo‘yicha kuzating. Natijani bilish uchun har bir bo‘limni alohida hisoblash shart emas.",
    tags: ["Davr bo‘yicha hisobot", "Savdo dinamikasi", "Daromad va xarajat"],
    alt: "ILBI boshqaruv paneli: savdo ko‘rsatkichlari va diagrammalar. Namuna ma’lumotlar.",
  },
  {
    id: "team",
    label: "Jamoa",
    icon: Users,
    image: "/landing/team-dark.png",
    title: "Har kimning vazifasi bor. O‘ziga mos kirishi ham.",
    text: "Xodimlarni do‘konga biriktiring, rol va ruxsatlarni belgilang. Kassir, omborchi va menejerning ish maydonini alohida boshqaring.",
    tags: ["Xodimlar boshqaruvi", "Rol va ruxsatlar", "Amallar tarixi"],
    alt: "ILBI xodim qo‘shish oynasi: rol va bo‘limlar uchun ruxsatlar. Namuna ma’lumotlar.",
  },
];
const steps = [
  {
    icon: ShoppingCart,
    title: "Savdo qilinadi",
    text: "Mahsulot savatga tushadi, to‘lov turi tanlanadi va savdo qayd etiladi.",
    value: "14 500",
    unit: "so‘mlik savdo",
    detail: "1 ta mahsulot · naqd to‘lov",
    label: "KASSA",
    color: "blue",
  },
  {
    icon: Package,
    title: "Qoldiq yangilanadi",
    text: "Sotilgan mahsulot ombor hisobida aks etadi. Qancha mahsulot qolganini ko‘rib turasiz.",
    value: "31 → 30",
    unit: "dona qoldi",
    detail: "Coca-Cola 0.5 L · asosiy ombor",
    label: "OMBOR",
    color: "green",
  },
  {
    icon: Users,
    title: "Mijoz hisobi yuritiladi",
    text: "Savdoni mijozga biriktiring. Nasiya bo‘lsa, qarzdorlik va keyingi to‘lovlar alohida hisobga olinadi.",
    value: "Mijoz",
    unit: "bilan bog‘lanadi",
    detail: "Xaridlar tarixi · qarzdorlik hisobi",
    label: "MIJOZLAR",
    color: "violet",
  },
  {
    icon: BarChart3,
    title: "Natija ko‘rinadi",
    text: "Qayd etilgan savdolar hisobotda jamlanadi. Kun qanday o‘tganini bitta manzarada ko‘rasiz.",
    value: "+14 500",
    unit: "so‘m tushum",
    detail: "Bugungi savdo hisobotiga qo‘shildi",
    label: "HISOBOT",
    color: "blue",
  },
];
const faqs = [
  [
    "ILBI qanday biznes uchun?",
    "ILBI mahsulot sotadigan do‘konlarning kundalik ishlarini boshqarish uchun yaratilgan. Kassa, mahsulotlar, ombor, mijozlar, nasiya va jamoa hisobi bir platformada jamlangan.",
  ],
  [
    "Bir nechta do‘konni boshqarsa bo‘ladimi?",
    "Ha. Hisobingizga biriktirilgan do‘konlar orasida almashishingiz va har bir do‘konning mahsulotlari, qoldiqlari hamda jamoasi bilan ishlashingiz mumkin. Ko‘rinadigan ma’lumot va amallar sizga berilgan ruxsatlarga bog‘liq.",
  ],
  [
    "Xodimlar hamma ma’lumotni ko‘radimi?",
    "Xodimning kirishi uning roli va belgilangan ruxsatlariga bog‘liq. Do‘kon egasi tegishli boshqaruv bo‘limida xodimlar uchun ruxsatlarni sozlaydi.",
  ],
  [
    "Ishlash uchun nima kerak?",
    "Internetga ulangan qurilma, zamonaviy brauzer va ILBI hisobi kerak. Mahsulotlarni qidirish uchun shtrix-kod skaneridan ham foydalanish mumkin.",
  ],
  [
    "Qanday boshlayman?",
    "Hisobingiz bo‘lsa, “Tizimga kirish” tugmasidan foydalaning. Hali hisobingiz bo‘lmasa, qo‘llab-quvvatlash sahifasida murojaat qoldiring — ulanish tartibini aniqlashtirib olasiz.",
  ],
];

function BrandSculpture() {
  const id = `sculpture-${useId().replace(/:/g, "")}`;
  return (
    <svg
      className="lp-sculpture"
      viewBox="-35 -35 350 355"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={`${id}-ink`}
          x1="40"
          y1="10"
          x2="220"
          y2="265"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#a6abb8" />
          <stop offset=".43" stopColor="#343b49" />
          <stop offset="1" stopColor="#171d27" />
        </linearGradient>
        <linearGradient
          id={`${id}-blue`}
          x1="87"
          y1="0"
          x2="190"
          y2="267"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#73d4ff" />
          <stop offset=".28" stopColor="#168fff" />
          <stop offset=".7" stopColor="#006bff" />
          <stop offset="1" stopColor="#0037b8" />
        </linearGradient>
        <linearGradient
          id={`${id}-face`}
          x1="90"
          y1="20"
          x2="142"
          y2="220"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#b0eaff" />
          <stop offset=".18" stopColor="#198fff" />
          <stop offset=".8" stopColor="#0054df" />
          <stop offset="1" stopColor="#3b9bff" />
        </linearGradient>
        <linearGradient id={`${id}-turn`}>
          <stop stopColor="#0053d9" />
          <stop offset=".53" stopColor="#168aff" />
          <stop offset="1" stopColor="#7dcfff" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <path d={paths.ribbon} />
        </clipPath>
      </defs>
      <g
        className="lp-sculpture-depth"
        transform="translate(7 7)"
        fill="#09182c"
      >
        {["dot", "stem", "bowl", "ribbon"].map((k) => (
          <path key={k} d={paths[k]} />
        ))}
      </g>
      <g stroke="rgba(219,235,255,.16)" strokeWidth=".8">
        {["dot", "stem", "bowl"].map((k) => (
          <path key={k} d={paths[k]} fill={`url(#${id}-ink)`} />
        ))}
        <path d={paths.ribbon} fill={`url(#${id}-blue)`} />
        <path
          d={paths.ribbonFace}
          fill={`url(#${id}-face)`}
          clipPath={`url(#${id}-clip)`}
        />
        <path d={paths.ribbonTurn} fill={`url(#${id}-turn)`} />
      </g>
      <path
        d="M92 9 V196 C92 231 119 254 142 263"
        stroke="#9edfff"
        strokeWidth="1.2"
        opacity=".75"
      />
    </svg>
  );
}

function SaleScene() {
  const [stage, setStage] = useState(0);
  const timers = useRef([]);
  const scene = useRef(null);
  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  const play = () => {
    clear();
    setStage(1);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStage(3);
      return;
    }
    timers.current = [
      setTimeout(() => setStage(2), 750),
      setTimeout(() => setStage(3), 1550),
    ];
  };
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!media.matches)
      timers.current.push(
        setTimeout(() => {
          setStage(1);
          timers.current.push(
            setTimeout(() => setStage(2), 750),
            setTimeout(() => setStage(3), 1550),
          );
        }, 1700),
      );
    const stop = () => {
      if (media.matches) {
        clear();
        setStage(0);
      }
    };
    media.addEventListener("change", stop);
    return () => {
      clear();
      media.removeEventListener("change", stop);
    };
  }, []);
  const onPointer = (event) => {
    if (
      event.pointerType !== "mouse" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const rect = scene.current.getBoundingClientRect();
    scene.current.style.setProperty(
      "--lp-rx",
      `${-((event.clientY - rect.top) / rect.height - 0.5) * 6}deg`,
    );
    scene.current.style.setProperty(
      "--lp-ry",
      `${((event.clientX - rect.left) / rect.width - 0.5) * 7}deg`,
    );
  };
  return (
    <div
      className="lp-scene"
      ref={scene}
      onPointerMove={onPointer}
      onPointerLeave={() => {
        scene.current.style.setProperty("--lp-rx", "0deg");
        scene.current.style.setProperty("--lp-ry", "0deg");
      }}
    >
      <div className="lp-scene-grid" />
      <div className="lp-scene-orbit lp-orbit-one" />
      <div className="lp-scene-orbit lp-orbit-two" />
      <span className="lp-scene-coordinate">ILBI / CONNECTED WORKSPACE</span>
      <div className="lp-sculpture-wrap">
        <BrandSculpture />
      </div>
      <div className={`lp-stock-tag ${stage >= 2 ? "is-updated" : ""}`}>
        <span className="lp-stock-icon">
          <Package size={18} />
        </span>
        <span>
          Ombor qoldig‘i
          <strong key={stage >= 2 ? "after" : "before"}>
            {stage >= 2 ? "30" : "31"} <small>dona</small>
          </strong>
        </span>
        <span className="lp-stock-minus">{stage >= 2 ? "−1" : "—"}</span>
      </div>
      <div className={`lp-sale-card ${stage === 3 ? "is-complete" : ""}`}>
        <div className="lp-sale-heading">
          <span>
            <i /> INTERAKTIV NAMUNA
          </span>
          <ShoppingBag size={17} />
        </div>
        <div className="lp-sale-product">
          <span className="lp-product-mark">
            <ShoppingBag size={25} />
          </span>
          <span>
            <strong>Coca-Cola 0.5 L</strong>
            <small>1 dona · 14 500 so‘m</small>
          </span>
          <Check size={17} />
        </div>
        <div className="lp-sale-total">
          <span>Jami</span>
          <strong>
            14 500 <small>so‘m</small>
          </strong>
        </div>
        <button
          type="button"
          className="lp-sale-button"
          onClick={play}
          disabled={stage === 1 || stage === 2}
        >
          {stage === 3 ? (
            <>
              <RotateCcw size={15} /> Yana bir marta
            </>
          ) : stage > 0 ? (
            <>
              <span className="lp-mini-spinner" /> Qayd etilmoqda
            </>
          ) : (
            <>
              Savdoni ko‘rsatish <ArrowRight size={16} />
            </>
          )}
        </button>
        <div className="lp-sale-status" role="status" aria-live="polite">
          {stage === 3 ? (
            <>
              <Check size={13} /> Savdo qayd etildi. Hisobot yangilandi.
            </>
          ) : stage === 2 ? (
            "Ombor qoldig‘i yangilandi…"
          ) : stage === 1 ? (
            "Savdo qayd etilmoqda…"
          ) : (
            "Bir savdoning jarayonini kuzating"
          )}
        </div>
      </div>
      <span className="lp-scene-caption">
        Bir harakat. Bog‘langan jarayonlar.
      </span>
    </div>
  );
}

function keepDialogFocus(event) {
  if (event.key !== "Tab") return;
  const focusable = [
    ...event.currentTarget.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), [tabindex="0"]',
    ),
  ].filter((node) => node.getClientRects().length);
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}

function PresentationDialog({ onClose }) {
  const dialog = useRef(null);
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    const node = dialog.current;
    const previousFocus = document.activeElement;
    node.showModal();
    return () => {
      node.close();
      if (previousFocus?.isConnected)
        previousFocus.focus({ preventScroll: true });
    };
  }, []);
  const view = views[slide];
  return (
    <dialog
      ref={dialog}
      className="lp-dialog lp-tour"
      aria-labelledby="lp-tour-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
      onKeyDown={(e) => {
        keepDialogFocus(e);
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          setSlide((s) => (s + (e.key === "ArrowRight" ? 1 : 2)) % 3);
        }
      }}
    >
      <div className="lp-dialog-top">
        <span className="lp-eyebrow">
          ILBI BILAN TANISHING · 0{slide + 1} / 03
        </span>
        <button
          type="button"
          className="lp-icon-button"
          onClick={onClose}
          aria-label="Taqdimotni yopish"
        >
          <X size={20} />
        </button>
      </div>
      <div className="lp-tour-content" key={view.id}>
        <h2 id="lp-tour-title">{view.title}</h2>
        <p>{view.text}</p>
        <img src={view.image} alt={view.alt} width="1440" height="1100" />
      </div>
      <div className="lp-tour-controls">
        <span>Interfeysdagi ma’lumotlar — namuna.</span>
        <button
          type="button"
          className="lp-icon-button"
          onClick={() => setSlide((s) => (s + 2) % 3)}
          aria-label="Oldingi slayd"
        >
          <ArrowLeft size={20} />
        </button>
        <button
          type="button"
          className="lp-button lp-button-primary"
          onClick={() => (slide === 2 ? onClose() : setSlide((s) => s + 1))}
        >
          {slide === 2 ? "Yakunlash" : "Keyingisi"}
          <ArrowRight size={17} />
        </button>
      </div>
    </dialog>
  );
}

function LegalDialog({ documentKey, onClose }) {
  const dialog = useRef(null);
  const [content, setContent] = useState("");
  const [state, setState] = useState("loading");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const node = dialog.current;
    const previousFocus = document.activeElement;
    node.showModal();
    return () => {
      node.close();
      if (previousFocus?.isConnected)
        previousFocus.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    if (!documentKey) return;
    let alive = true;
    docsApi
      .getDoc(documentKey)
      .then((data) => {
        if (alive) {
          setContent(data.content || "Hujjat matni hozircha mavjud emas.");
          setState("ready");
        }
      })
      .catch(() => {
        if (alive) setState("error");
      });
    return () => {
      alive = false;
    };
  }, [documentKey, retry]);
  return (
    <dialog
      ref={dialog}
      className="lp-dialog lp-legal"
      aria-labelledby="lp-legal-title"
      onKeyDown={keepDialogFocus}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="lp-dialog-top">
        <h2 id="lp-legal-title">
          {documentKey === "maxfiylik_siyosati"
            ? "Maxfiylik siyosati"
            : "Foydalanish qoidalari"}
        </h2>
        <button
          type="button"
          className="lp-icon-button"
          onClick={onClose}
          aria-label="Hujjatni yopish"
        >
          <X size={20} />
        </button>
      </div>
      <div className="lp-legal-body">
        {state === "loading" ? (
          <p role="status">Hujjat yuklanmoqda…</p>
        ) : state === "error" ? (
          <div role="alert">
            <p>Hujjatni yuklab bo‘lmadi. Qayta urinib ko‘ring.</p>
            <button
              type="button"
              className="lp-button lp-button-primary"
              onClick={() => {
                setState("loading");
                setRetry((s) => s + 1);
              }}
            >
              Qayta yuklash
              <RotateCcw size={16} />
            </button>
          </div>
        ) : (
          <Suspense fallback={<p>Hujjat tayyorlanmoqda…</p>}>
            <MarkdownViewer content={content} />
          </Suspense>
        )}
      </div>
    </dialog>
  );
}

export default function Landing() {
  const { isDark, toggleTheme } = useTheme();
  const { hash } = useLocation();
  const root = useRef(null);
  const [menu, setMenu] = useState(false);
  const [step, setStep] = useState(0);
  const [role, setRole] = useState(0);
  const [tour, setTour] = useState(false);
  const [legal, setLegal] = useState(null);
  const [year] = useState(() => new Date().getFullYear());
  const jumpToStoryStep = useLandingMotion(root, setStep);
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
    }
  }, [hash]);
  useEffect(() => {
    if (!menu) return;
    const close = (e) => {
      if (e.key === "Escape") {
        setMenu(false);
        document.getElementById("lp-menu-toggle")?.focus();
      }
    };
    const outside = (e) => {
      if (!e.target.closest(".lp-header")) setMenu(false);
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", outside);
    };
  }, [menu]);
  const destination = "/login";
  const entry = "Tizimga kirish";
  const StageIcon = steps[step].icon;
  const nav = [
    ["#platforma", "Platforma"],
    ["#imkoniyatlar", "Imkoniyatlar"],
    ["#savollar", "Savollar"],
  ];
  return (
    <div className="ilbi-landing" ref={root}>
      <a className="lp-skip" href="#asosiy">
        Asosiy mazmunga o‘tish
      </a>
      <div className="lp-scroll-progress" />
      <header className="lp-header">
        <div className="lp-container lp-header-inner">
          <Link to="/" aria-label="ILBI bosh sahifa" className="lp-brand">
            <IlbiLogo size={36} />
          </Link>
          <nav
            className={`lp-nav ${menu ? "is-open" : ""}`}
            id="lp-navigation"
            aria-label="Asosiy navigatsiya"
          >
            {nav.map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMenu(false)}>
                {label}
              </a>
            ))}
            <Link
              to={destination}
              className="lp-mobile-entry"
              onClick={() => setMenu(false)}
            >
              {entry}
              <ArrowUpRight size={16} />
            </Link>
          </nav>
          <div className="lp-header-actions">
            <button
              type="button"
              className="lp-icon-button"
              onClick={toggleTheme}
              aria-label={
                isDark ? "Kunduzgi rejimga o‘tish" : "Tungi rejimga o‘tish"
              }
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link className="lp-header-entry" to={destination}>
              {entry}
              <ArrowUpRight size={16} />
            </Link>
            <button
              id="lp-menu-toggle"
              type="button"
              className="lp-icon-button lp-menu-button"
              onClick={() => setMenu((v) => !v)}
              aria-expanded={menu}
              aria-controls="lp-navigation"
              aria-label={menu ? "Menyuni yopish" : "Menyuni ochish"}
            >
              {menu ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>
      </header>
      <main id="asosiy">
        <section className="lp-hero lp-container" aria-labelledby="lp-title">
          <div className="lp-hero-copy">
            <div className="lp-eyebrow lp-hero-enter">
              <span className="lp-live-dot" /> SAVDO VA BOSHQARUV PLATFORMASI
            </div>
            <h1 id="lp-title" className="lp-hero-enter">
              Har bir savdo.
              <br />
              Bir butun
              <br />
              <span>manzara.</span>
            </h1>
            <p className="lp-hero-description lp-hero-enter">
              Kassa, ombor, mijozlar va jamoa.
              <br />
              Do‘koningizning kundalik ishlari — bir joyda.
            </p>
            <div className="lp-hero-actions lp-hero-enter">
              <a className="lp-button lp-button-primary" href="#platforma">
                Platformani ko‘rish
                <ArrowDown size={17} />
              </a>
              <button
                type="button"
                className="lp-button lp-button-quiet"
                onClick={() => setTour(true)}
              >
                <span className="lp-play-icon">
                  <Play size={12} fill="currentColor" />
                </span>
                Taqdimotni ochish
              </button>
            </div>
            <div className="lp-hero-note lp-hero-enter">
              <span>01 — KASSADAN HISOBOTGACHA</span>
              <span className="lp-note-line" />
            </div>
          </div>
          <SaleScene />
        </section>
        <div className="lp-capability-strip">
          <div className="lp-container">
            <span>
              Bir-biriga bog‘langan
              <br />
              <strong>ish maydoni.</strong>
            </span>
            {[
              [ShoppingCart, "Savdo"],
              [Package, "Ombor"],
              [Users, "Mijozlar"],
              [BarChart3, "Hisobotlar"],
            ].map(([Icon, label]) => (
              <span key={label}>
                <Icon size={20} />
                {label}
              </span>
            ))}
            <a href="#jarayon" aria-label="Jarayonni ko‘rish">
              <ArrowDown size={22} />
            </a>
          </div>
        </div>

        <section
          id="platforma"
          className="lp-section lp-container"
          aria-labelledby="lp-platform-title"
        >
          <div className="lp-section-heading" data-reveal>
            <div>
              <span className="lp-eyebrow">01 / PLATFORMA ICHIDA</span>
              <h2 id="lp-platform-title">
                Ishingizni ko‘ring.
                <br />
                <span>Ortiqcha murakkabliksiz.</span>
              </h2>
            </div>
            <p>
              Qulay ishlash — kerakli ma’lumot
              <br className="lp-desktop-break" /> kerakli joyda bo‘lishidan
              boshlanadi.
            </p>
          </div>
          <ProductCarousel />
          <p className="lp-sample-note">
            Tasvirlarda sinov ma’lumotlari ko‘rsatilgan. Jonli hisobingizdagi
            ma’lumotlar va imkoniyatlar ruxsatlaringizga bog‘liq.
          </p>
        </section>

        <section id="jarayon" className="lp-workflow-section" data-scroll-story>
          <div
            className="lp-container lp-section lp-story-stage"
            data-story-stage
          >
            <div className="lp-section-heading" data-reveal>
              <div>
                <span className="lp-eyebrow">02 / HAMMASI BOG‘LANGAN</span>
                <h2>
                  Bitta savdo.
                  <br />
                  <span>Davomi bor.</span>
                </h2>
              </div>
              <p>
                Kassadagi kichik harakat —<br />
                butun do‘kon hisobining bir qismi.
              </p>
            </div>
            <div className="lp-workflow" data-reveal>
              <div
                className="lp-steps"
                aria-label="Savdo jarayonining bosqichlari"
              >
                {steps.map((item, i) => (
                  <button
                    type="button"
                    className={`lp-step ${step === i ? "is-active" : ""}`}
                    key={item.title}
                    onClick={() => {
                      setStep(i);
                      jumpToStoryStep(i);
                    }}
                    aria-pressed={step === i}
                    aria-label={`${i + 1}. ${["Savdo", "Ombor", "Mijoz", "Hisobot"][i]} — ${item.title}`}
                    aria-controls="lp-step-result"
                  >
                    <span className="lp-step-number">0{i + 1}</span>
                    <span>
                      <strong>{item.title}</strong>
                      <span className="lp-step-short" aria-hidden="true">
                        {["Savdo", "Ombor", "Mijoz", "Hisobot"][i]}
                      </span>
                      <span>{item.text}</span>
                    </span>
                    <ArrowUpRight size={19} />
                  </button>
                ))}
              </div>
              <div
                id="lp-step-result"
                className={`lp-step-result lp-tone-${steps[step].color}`}
                aria-live="polite"
              >
                <div className="lp-result-top">
                  <span className="lp-eyebrow">{steps[step].label}</span>
                  <span>0{step + 1} / 04</span>
                </div>
                <div className="lp-result-orbit">
                  <span />
                  <span />
                  <div className="lp-result-icon" key={`icon-${step}`}>
                    <StageIcon size={44} strokeWidth={1.3} />
                  </div>
                </div>
                <div className="lp-result-value" key={step}>
                  <strong>{steps[step].value}</strong>
                  <span>{steps[step].unit}</span>
                </div>
                <div className="lp-result-detail">
                  <Check size={15} />
                  {steps[step].detail}
                </div>
                <p className="lp-result-explanation">{steps[step].text}</p>
                <small>Jarayonni tushuntiruvchi namuna</small>
              </div>
            </div>
            <div className="lp-story-meter" aria-hidden="true">
              {[0, 1, 2, 3].map((index) => (
                <span key={index} style={{ "--lp-segment": index }}>
                  <i />
                </span>
              ))}
            </div>
            <div className="lp-story-hint" aria-hidden="true">
              <ArrowDown size={12} />
              <span>DAVOM ETISH UCHUN SKROLL QILING</span>
              <span>0{step + 1} / 04</span>
            </div>
          </div>
        </section>

        <section
          id="imkoniyatlar"
          className="lp-container lp-section"
          aria-labelledby="lp-features-title"
        >
          <div className="lp-section-heading" data-reveal>
            <div>
              <span className="lp-eyebrow">03 / KUNDALIK NAZORAT</span>
              <h2 id="lp-features-title">
                Do‘koningiz katta bo‘lsin.
                <br />
                <span>Tashvishlar emas.</span>
              </h2>
            </div>
            <p>
              Mahsulotdan xodimgacha.
              <br />
              Har bir yo‘nalish uchun o‘z vositasi.
            </p>
          </div>
          <div className="lp-feature-grid">
            <article className="lp-feature lp-branches" data-reveal>
              <div className="lp-feature-heading">
                <Layers3 size={23} />
                <span>DO‘KONLAR VA OMBOR</span>
              </div>
              <h3>
                Bir nechta manzil.
                <br />
                Bitta boshqaruv.
              </h3>
              <p>
                Do‘konlar orasida almashing. Mahsulot kirimi, qoldiqlar va
                inventarizatsiyani alohida nazorat qiling.
              </p>
              <div
                className="lp-branch-map"
                aria-label="Bitta hisobga biriktirilgan do‘konlar namunasi"
              >
                <div className="lp-branch-hub">
                  <IlbiLogo size={28} variant="wordmark" />
                  <span>Boshqaruv</span>
                </div>
                <svg
                  viewBox="0 0 480 80"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path d="M240 0 V25 Q240 40 225 40 H95 Q80 40 80 55 V80 M240 40 V80 M240 40 H385 Q400 40 400 55 V80" />
                  <path
                    className="lp-branch-flow"
                    d="M240 0 V25 Q240 40 225 40 H95 Q80 40 80 55 V80"
                  />
                </svg>
                <div className="lp-branch-nodes">
                  {["Markaz", "Filial", "Ombor"].map((name, i) => (
                    <div key={name}>
                      {i === 2 ? <Package size={19} /> : <Store size={19} />}
                      <span>{name}</span>
                      <i />
                    </div>
                  ))}
                </div>
              </div>
            </article>
            <article className="lp-feature lp-permissions" data-reveal>
              <div className="lp-feature-heading">
                <ShieldCheck size={23} />
                <span>JAMOA VA RUXSATLAR</span>
              </div>
              <h3>
                To‘g‘ri odamga
                <br />
                kerakli imkoniyat.
              </h3>
              <p>
                Rollar va ruxsatlarni vazifaga moslang. Muhim amallar tarixini
                auditda kuzating.
              </p>
              <div className="lp-role-demo">
                <div
                  className="lp-role-buttons"
                  aria-label="Rol namunasini tanlash"
                >
                  {["Kassir", "Omborchi", "Menejer"].map((name, i) => (
                    <button
                      type="button"
                      key={name}
                      aria-pressed={role === i}
                      onClick={() => setRole(i)}
                    >
                      {name}
                    </button>
                  ))}
                </div>
                {[
                  "Savdo qilish",
                  "Ombor bilan ishlash",
                  "Hisobotlarni ko‘rish",
                ].map((label, i) => (
                  <div className="lp-permission-row" key={label}>
                    <span>{label}</span>
                    {role === 2 || role === i ? (
                      <span className="lp-allowed">
                        <Check size={14} />
                      </span>
                    ) : (
                      <span className="lp-not-allowed">—</span>
                    )}
                  </div>
                ))}
                <small>Ruxsatlarning tushuntiruvchi namunasi</small>
              </div>
            </article>
            <article className="lp-feature lp-receipt-feature" data-reveal>
              <div className="lp-feature-text">
                <div className="lp-feature-heading">
                  <ReceiptText size={23} />
                  <span>MIJOZLAR HISOBI</span>
                </div>
                <h3>
                  Har bir xaridning
                  <br />
                  o‘z tarixi bor.
                </h3>
                <p>
                  Mijozlar, nasiya va qarz to‘lovlarini qayd eting. Savdoning
                  elektron nusxasini havola orqali oching.
                </p>
              </div>
              <div className="lp-paper" aria-hidden="true">
                <IlbiLogo size={17} variant="wordmark" textColor="#17191f" />
                <span>SAVDO NUSXASI · NAMUNA</span>
                <div>
                  <span>Coca-Cola 0.5 L</span>
                  <b>14 500</b>
                </div>
                <div>
                  <span>1 dona</span>
                  <span>so‘m</span>
                </div>
                <hr />
                <div>
                  <b>JAMI</b>
                  <strong>14 500</strong>
                </div>
                <div className="lp-paper-bars" />
                <span>Xaridingiz uchun rahmat!</span>
              </div>
            </article>
            <article className="lp-feature lp-telegram-feature" data-reveal>
              <div className="lp-feature-heading">
                <Send size={23} />
                <span>XABARLAR VA YORDAM</span>
              </div>
              <h3>
                Kerakli xabar.
                <br />
                O‘z vaqtida.
              </h3>
              <p>
                Telegram bildirishnomalari va smena hisobotlari bilan
                voqealardan xabardor bo‘ling. Savol tug‘ilsa, platformaning
                o‘zida yordamga murojaat qiling.
              </p>
              <div className="lp-notification">
                <span className="lp-notification-icon">
                  <Send size={19} />
                </span>
                <div>
                  <strong>
                    ILBI <span>namuna</span>
                  </strong>
                  <p>
                    Smena yakunlandi.
                    <br />
                    Kun natijalarini ko‘rishingiz mumkin.
                  </p>
                </div>
                <Check size={14} />
              </div>
            </article>
          </div>
          <div className="lp-more-tools" data-reveal>
            {[
              [
                ArrowLeftRight,
                "Hamkorlar bilan hisob",
                "B2B operatsiyalari va hamkorlar bilan hisob-kitoblar.",
              ],
              [
                Clock3,
                "Smena nazorati",
                "Kassani ochish, yopish va kun yakunini qayd etish.",
              ],
              [
                History,
                "Amallar tarixi",
                "Muhim o‘zgarishlarni kim bajarganini kuzatish.",
              ],
            ].map(([Icon, title, text]) => (
              <div className="lp-extra-tool" key={title}>
                <Icon size={21} strokeWidth={1.4} />
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="savollar" className="lp-faq-section">
          <div className="lp-container lp-section lp-faq-layout">
            <div data-reveal>
              <span className="lp-eyebrow">04 / SAVOLLAR QOLDIMI?</span>
              <h2>
                Bilib olish
                <br />
                <span>yaxshi.</span>
              </h2>
              <p>
                Platforma haqida qisqa javoblar.
                <br />
                Boshqa savol uchun biz bilan bog‘laning.
              </p>
              <Link to="/support" className="lp-text-link">
                Savol berish
                <ArrowUpRight size={17} />
              </Link>
            </div>
            <div className="lp-faq-list" data-reveal>
              {faqs.map(([question, answer], i) => (
                <details key={question}>
                  <summary>
                    <span className="lp-faq-number">0{i + 1}</span>
                    {question}
                    <span className="lp-faq-plus">
                      <ChevronDown size={18} />
                    </span>
                  </summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-container lp-final-section" data-reveal>
          <div className="lp-final-orbit" aria-hidden="true" />
          <span className="lp-eyebrow">
            <span className="lp-live-dot" /> HAMMASI BIR JOYDAN BOSHLANADI
          </span>
          <h2>
            Do‘koningizni
            <br />
            <span>bir joydan boshqaring.</span>
          </h2>
          <p>Ishingizning har bir qismi bir-biriga bog‘lansin.</p>
          <div className="lp-final-actions">
            <Link to="/support" className="lp-button lp-button-primary">
              Boshlash haqida so‘rash
              <ArrowUpRight size={17} />
            </Link>
            <Link to={destination} className="lp-button lp-button-outline">
              {entry}
              <ArrowRight size={17} />
            </Link>
          </div>
        </section>
      </main>
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-top">
            <Link to="/" aria-label="ILBI bosh sahifa">
              <IlbiLogo size={34} />
            </Link>
            <p>Savdo. Hisob. Bir butun manzara.</p>
            <a
              href="#asosiy"
              className="lp-back-top"
              aria-label="Sahifa boshiga qaytish"
            >
              <ArrowUpRight size={20} />
            </a>
          </div>
          <div className="lp-footer-bottom">
            <span>© {year} ILBI</span>
            <nav aria-label="Qo‘shimcha havolalar">
              <button
                type="button"
                onClick={() => setLegal("maxfiylik_siyosati")}
              >
                Maxfiylik siyosati
              </button>
              <button
                type="button"
                onClick={() => setLegal("foydalanish_qoidalari")}
              >
                Foydalanish qoidalari
              </button>
              <Link to="/support">
                <CircleHelp size={14} />
                Yordam
              </Link>
            </nav>
            <span>
              ilbi.uz <span className="lp-blue-dot">●</span>
            </span>
          </div>
        </div>
      </footer>
      {tour && <PresentationDialog onClose={() => setTour(false)} />}{" "}
      {legal && (
        <LegalDialog
          key={legal}
          documentKey={legal}
          onClose={() => setLegal(null)}
        />
      )}
    </div>
  );
}
