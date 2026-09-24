"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, BadgeCheck, MessageCircle, Package, Star, X } from "lucide-react";
import { ACTIVITY_FEED, type ActivityItem } from "@/data/activityFeed";
import { SITE_CONFIG } from "@/data/siteConfig";
import { useQuoteModal } from "@/components/quote/QuoteModalContext";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

const FIRST_DELAY_MS = 3000;
const VISIBLE_MS: [number, number] = [7000, 9000];
const GAP_MS: [number, number] = [10000, 12000];
const EXIT_MS = 300;
// After the pointer/focus leaves, keep the card up at least this long so it doesn't vanish instantly.
const MIN_RESUME_MS = 2000;
const DISMISSED_KEY = "jcd.activityToast.dismissed";
const NEXT_KEY = "jcd.activityToast.next";

const randomBetween = ([min, max]: [number, number]) => min + Math.random() * (max - min);

function readSession(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Storage blocked (private mode, strict settings): the preference then lasts until reload.
  }
}

const LABELS = {
  region: { en: "Client reviews and typical shipments", zh: "客户评价与典型货运" },
  review: { en: "Client review · Alibaba", zh: "客户评价 · 阿里巴巴" },
  shipment: { en: "Typical request", zh: "典型需求" },
  question: { en: "Common question", zh: "常见问题" },
  viewOnAlibaba: { en: "View on Alibaba", zh: "在阿里巴巴查看" },
  quoteOnAlibaba: { en: "Get a quote on Alibaba", zh: "在阿里巴巴询价" },
  dismiss: { en: "Hide these messages for this visit", zh: "本次访问不再显示" },
};

// Countdown line colours follow each card's label: emerald for reviews, blue for requests/questions.
const BAR_STYLES = {
  review: {
    bar: "from-emerald-600 via-emerald-500 to-emerald-400",
    halo: "bg-emerald-400/60",
    core: "shadow-[0_0_8px_2px_rgba(52,211,153,0.85)]",
  },
  info: {
    bar: "from-blue-600 via-blue-500 to-sky-400",
    halo: "bg-sky-400/60",
    core: "shadow-[0_0_8px_2px_rgba(56,189,248,0.85)]",
  },
};

interface Controls {
  pause: () => void;
  resume: () => void;
  dismiss: () => void;
  close: () => void;
}

export function ActivityToast() {
  const { isOpen: quoteOpen } = useQuoteModal();
  const { locale } = useLanguage();
  const lang = locale === "zh" ? "zh" : "en";

  const [index, setIndex] = useState<number | null>(null);
  const [shown, setShown] = useState(false);
  const asideRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const quoteOpenRef = useRef(quoteOpen);
  const controls = useRef<Controls | null>(null);

  useEffect(() => {
    quoteOpenRef.current = quoteOpen;
  }, [quoteOpen]);

  useEffect(() => {
    let timer: number | undefined;
    let nextIndex = 0;
    let stopped = false;
    let counting = false;
    let paused = false;
    let remaining = 0;
    let startedAt = 0;
    let total = 0; // the current card's full display time: the countdown line's 100%
    let barAnim: Animation | null = null;
    let onVisible: (() => void) | null = null;

    const schedule = (fn: () => void, ms: number) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(fn, ms);
    };

    // The line's width shows remaining / total. It's driven from the same numbers as the
    // close timer, so pausing, holding and resuming keep the two in step.
    const runBar = (fromFraction: number, ms: number) => {
      const el = barRef.current;
      if (!el) return;
      el.parentElement?.removeAttribute("data-paused");
      barAnim?.cancel();
      barAnim = el.animate(
        [{ transform: `translateX(${(fromFraction - 1) * 100}%)` }, { transform: "translateX(-100%)" }],
        { duration: Math.max(ms, 1), easing: "linear", fill: "forwards" }
      );
    };

    const freezeBar = () => {
      barAnim?.pause();
      barRef.current?.parentElement?.setAttribute("data-paused", "");
    };

    const startCountdown = (ms: number) => {
      counting = true;
      startedAt = Date.now();
      remaining = ms;
      schedule(onTimeUp, ms);
    };

    function showNext() {
      // One pass through the feed per visit; repeats would feel like a loop.
      if (stopped || nextIndex >= ACTIVITY_FEED.length) return;
      if (quoteOpenRef.current) {
        schedule(showNext, randomBetween(GAP_MS));
        return;
      }
      if (document.hidden) {
        onVisible = () => {
          if (document.hidden || !onVisible) return;
          document.removeEventListener("visibilitychange", onVisible);
          onVisible = null;
          schedule(showNext, MIN_RESUME_MS);
        };
        document.addEventListener("visibilitychange", onVisible);
        return;
      }
      const i = nextIndex;
      nextIndex = i + 1;
      writeSession(NEXT_KEY, String(nextIndex));
      setIndex(i);
      paused = false;
      total = randomBetween(VISIBLE_MS);
      startCountdown(total);
      // Mount hidden first, then flip to visible a frame later so the enter transition runs.
      // The line starts here too, once the card (and its bar element) is in the DOM.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setShown(true);
          const left = counting ? remaining - (Date.now() - startedAt) : remaining;
          runBar(left / total, left);
          if (!counting) freezeBar();
        })
      );
    }

    function onTimeUp() {
      // Never auto-close under the cursor or keyboard focus. This also covers a card that
      // appears beneath a mouse that hasn't moved, where no mouseenter event ever fires.
      const el = asideRef.current;
      if (el && (el.matches(":hover") || el.contains(document.activeElement))) {
        counting = false;
        paused = true;
        remaining = 0;
        freezeBar();
        return;
      }
      close();
    }

    function close() {
      counting = false;
      paused = false;
      setShown(false);
      schedule(() => {
        setIndex(null);
        schedule(showNext, randomBetween(GAP_MS));
      }, EXIT_MS);
    }

    controls.current = {
      pause() {
        if (!counting) return;
        counting = false;
        paused = true;
        window.clearTimeout(timer);
        remaining -= Date.now() - startedAt;
        freezeBar();
      },
      resume() {
        if (!paused) return;
        paused = false;
        // Continue the line from where it froze; if the 2s minimum stretches the time, the
        // line drains a little slower instead of jumping back up.
        const fromFraction = Math.max(remaining, 0) / total;
        startCountdown(Math.max(remaining, MIN_RESUME_MS));
        runBar(fromFraction, remaining);
      },
      dismiss() {
        stopped = true;
        counting = false;
        paused = false;
        writeSession(DISMISSED_KEY, "1");
        setShown(false);
        schedule(() => setIndex(null), EXIT_MS);
      },
      close() {
        if (counting || paused) close();
      },
    };

    if (readSession(DISMISSED_KEY) === "1") {
      stopped = true;
    } else {
      nextIndex = Number(readSession(NEXT_KEY)) || 0;
      schedule(showNext, FIRST_DELAY_MS);
    }

    return () => {
      window.clearTimeout(timer);
      barAnim?.cancel();
      if (onVisible) document.removeEventListener("visibilitychange", onVisible);
      controls.current = null;
    };
  }, []);

  if (index === null) return null;
  const item = ACTIVITY_FEED[index];
  // The quote wizard overlays the page; stay out of its way while it is open.
  const visible = shown && !quoteOpen;
  const barStyle = BAR_STYLES[item.kind === "review" ? "review" : "info"];

  return (
    <aside
      ref={asideRef}
      aria-label={LABELS.region[lang]}
      inert={!visible}
      onMouseEnter={() => controls.current?.pause()}
      onMouseLeave={() => controls.current?.resume()}
      onFocus={() => controls.current?.pause()}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) controls.current?.resume();
      }}
      className={cn(
        // Below 640px: slim full-width banner, lifted above the chat launcher (bottom-right).
        "fixed z-30 inset-x-3 bottom-[calc(5rem_+_env(safe-area-inset-bottom))]",
        // 640px+: card at bottom-left, narrowed so it never reaches the chat launcher.
        "sm:inset-x-auto sm:left-6 sm:bottom-6 sm:w-[min(360px,calc(100vw_-_330px))]",
        "transition-[opacity,transform] motion-reduce:transition-opacity",
        visible
          ? "opacity-100 translate-y-0 duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
          : "pointer-events-none opacity-0 translate-y-4 motion-reduce:translate-y-0 duration-300 ease-[cubic-bezier(0.4,0,1,1)]"
      )}
    >
      <div className="relative rounded-xl border border-slate-200 bg-white text-left shadow-[0_10px_25px_-5px_rgba(15,23,42,0.08),0_8px_10px_-6px_rgba(15,23,42,0.04)]">
        <a
          href={SITE_CONFIG.socials.alibabaTrustPass}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => controls.current?.close()}
          className="block w-full rounded-xl px-3 py-2.5 pr-11 sm:p-4 sm:pr-11 text-left transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <ToastBody item={item} lang={lang} />
        </a>
        {/* Countdown line: drains as the card's display time runs out; frozen and dimmed while held.
            Taller than the 3px line so the head's glow has room; clipped to the card's rounded bottom. */}
        <span
          aria-hidden="true"
          className="group/bar pointer-events-none absolute inset-x-0 bottom-0 h-4 overflow-hidden rounded-b-[11px]"
        >
          <span className="absolute inset-x-0 bottom-0 h-[3px] bg-slate-100" />
          <span
            ref={barRef}
            className={cn("absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-r will-change-transform", barStyle.bar)}
          >
            <span
              className={cn(
                "absolute right-0 -bottom-1.5 h-4 w-12 translate-x-1/2 rounded-full blur-md transition-opacity duration-300 motion-safe:animate-pulse group-data-[paused]/bar:opacity-25 group-data-[paused]/bar:animate-none",
                barStyle.halo
              )}
            />
            <span className="absolute right-0 top-0 h-full w-8 bg-gradient-to-r from-transparent to-white/80" />
            <span
              className={cn(
                "absolute right-0 top-1/2 h-[5px] w-[5px] -translate-y-1/2 translate-x-1/2 rounded-full bg-white transition-opacity duration-300 group-data-[paused]/bar:opacity-40",
                barStyle.core
              )}
            />
          </span>
        </span>
        <button
          type="button"
          onClick={() => controls.current?.dismiss()}
          aria-label={LABELS.dismiss[lang]}
          className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}

function ToastBody({ item, lang }: { item: ActivityItem; lang: "en" | "zh" }) {
  if (item.kind === "review") {
    return (
      <>
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
          <BadgeCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {LABELS.review[lang]}
          {/* Phones: the footer row is dropped to keep the banner slim, so the name moves up here. */}
          <span className="font-medium normal-case text-slate-500 sm:hidden">· {item.reviewer}</span>
        </span>
        {item.quote ? (
          <span className="mt-1.5 block text-sm leading-snug text-slate-900 line-clamp-2 sm:line-clamp-3">
            &ldquo;{item.quote}&rdquo;
          </span>
        ) : (
          <span className="mt-1.5 flex items-center gap-2 text-sm leading-snug text-slate-900">
            {item.stars ? (
              <span className="flex shrink-0 items-center gap-0.5" aria-label={`${item.stars} / 5`}>
                {Array.from({ length: item.stars }, (_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                ))}
              </span>
            ) : null}
            <span className="line-clamp-2">{item.summary?.[lang]}</span>
          </span>
        )}
        <span className="mt-2 hidden sm:flex items-center justify-between gap-3 text-xs text-slate-500">
          <span>— {item.reviewer}</span>
          <span className="inline-flex items-center gap-0.5 font-semibold text-blue-600">
            {LABELS.viewOnAlibaba[lang]}
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </span>
      </>
    );
  }

  const Icon = item.kind === "shipment" ? Package : MessageCircle;
  return (
    <>
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-blue-600">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {item.kind === "shipment" ? LABELS.shipment[lang] : LABELS.question[lang]}
      </span>
      <span className="mt-1.5 block truncate text-sm font-semibold text-slate-900">{item.title[lang]}</span>
      <span className="mt-0.5 hidden text-xs leading-snug text-slate-500 sm:line-clamp-2">{item.detail[lang]}</span>
      <span className="mt-2 hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-blue-600">
        {LABELS.quoteOnAlibaba[lang]}
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    </>
  );
}
