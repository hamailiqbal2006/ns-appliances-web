"use client";

import { useCallback, useRef, useState, useMemo, useSyncExternalStore } from "react";
import styles from "./color-wheel-picker.module.css";

// ---------------------------------------------------------------------------
// HSV <-> RGB <-> HEX Conversions
// ---------------------------------------------------------------------------

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function hexToRgb(hex: string): [number, number, number] {
  let clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  if (clean.length !== 6) return [0, 0, 0];
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return [0, 0, 0];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }

  return { h, s, v };
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  h = (h % 360 + 360) % 360;
  s = clamp(s, 0, 1);
  v = clamp(v, 0, 1);

  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let rPrime = 0;
  let gPrime = 0;
  let bPrime = 0;

  if (h >= 0 && h < 60) {
    rPrime = c;
    gPrime = x;
    bPrime = 0;
  } else if (h >= 60 && h < 120) {
    rPrime = x;
    gPrime = c;
    bPrime = 0;
  } else if (h >= 120 && h < 180) {
    rPrime = 0;
    gPrime = c;
    bPrime = x;
  } else if (h >= 180 && h < 240) {
    rPrime = 0;
    gPrime = x;
    bPrime = c;
  } else if (h >= 240 && h < 300) {
    rPrime = x;
    gPrime = 0;
    bPrime = c;
  } else if (h >= 300 && h < 360) {
    rPrime = c;
    gPrime = 0;
    bPrime = x;
  }

  return [
    Math.round((rPrime + m) * 255),
    Math.round((gPrime + m) * 255),
    Math.round((bPrime + m) * 255),
  ];
}

export interface CuratedPalettePreset {
  name: string;
  color: string;
}

export const LUXURY_PRESETS: CuratedPalettePreset[] = [
  { name: "Original NS Theme", color: "#173F43" },
  { name: "Deep Navy", color: "#0D1B2A" },
  { name: "Warm Ivory", color: "#F4EFEA" },
  { name: "Charcoal", color: "#1A1D20" },
  { name: "Champagne", color: "#DAC5A7" },
  { name: "Deep Teal", color: "#0A2626" },
];

export interface ColorWheelPickerProps {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
  id?: string;
}

export function ColorWheelPicker({ value, onChange, label, id }: ColorWheelPickerProps) {
  // Normalize initial value
  const initialRgb = useMemo(() => hexToRgb(value), [value]);
  const initialHsv = useMemo(() => rgbToHsv(...initialRgb), [initialRgb]);

  const [hsv, setHsv] = useState(initialHsv);
  const [hexInput, setHexInput] = useState(value.replace("#", "").toUpperCase());
  const [prevValue, setPrevValue] = useState(value);

  // Synchronize internal state when prop changes from outside
  if (prevValue !== value) {
    setPrevValue(value);
    const newRgb = hexToRgb(value);
    setHsv(rgbToHsv(...newRgb));
    setHexInput(value.replace("#", "").toUpperCase());
  }

  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  // Pure hue background for the SV pad
  const pureHueHex = useMemo(() => {
    const [r, g, b] = hsvToRgb(hsv.h, 1, 1);
    return rgbToHex(r, g, b);
  }, [hsv.h]);

  const updateColorFromHsv = useCallback(
    (newHsv: { h: number; s: number; v: number }) => {
      setHsv(newHsv);
      const [r, g, b] = hsvToRgb(newHsv.h, newHsv.s, newHsv.v);
      const hex = rgbToHex(r, g, b);
      setHexInput(hex.replace("#", "").toUpperCase());
      onChange(hex);
    },
    [onChange],
  );

  // Handle Saturation/Value Pad drag
  const handleSvInteraction = useCallback(
    (clientX: number, clientY: number) => {
      if (!svRef.current) return;
      const rect = svRef.current.getBoundingClientRect();
      const x = clamp(clientX - rect.left, 0, rect.width);
      const y = clamp(clientY - rect.top, 0, rect.height);
      const s = x / rect.width;
      const v = 1 - y / rect.height;
      updateColorFromHsv({ ...hsv, s, v });
    },
    [hsv, updateColorFromHsv],
  );

  const onSvMouseDown = (e: React.MouseEvent) => {
    handleSvInteraction(e.clientX, e.clientY);
    const onMouseMove = (ev: MouseEvent) => handleSvInteraction(ev.clientX, ev.clientY);
    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const onSvTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 0) return;
    handleSvInteraction(e.touches[0].clientX, e.touches[0].clientY);
    const onTouchMove = (ev: TouchEvent) => {
      if (ev.touches.length === 0) return;
      handleSvInteraction(ev.touches[0].clientX, ev.touches[0].clientY);
    };
    const onTouchEnd = () => {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onTouchEnd);
  };

  // Handle Hue Slider drag
  const handleHueInteraction = useCallback(
    (clientX: number) => {
      if (!hueRef.current) return;
      const rect = hueRef.current.getBoundingClientRect();
      const x = clamp(clientX - rect.left, 0, rect.width);
      const h = (x / rect.width) * 360;
      updateColorFromHsv({ ...hsv, h });
    },
    [hsv, updateColorFromHsv],
  );

  const onHueMouseDown = (e: React.MouseEvent) => {
    handleHueInteraction(e.clientX);
    const onMouseMove = (ev: MouseEvent) => handleHueInteraction(ev.clientX);
    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const onHueTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 0) return;
    handleHueInteraction(e.touches[0].clientX);
    const onTouchMove = (ev: TouchEvent) => {
      if (ev.touches.length === 0) return;
      handleHueInteraction(ev.touches[0].clientX);
    };
    const onTouchEnd = () => {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onTouchEnd);
  };

  // Handle manual HEX input
  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9A-Fa-f]/g, "").slice(0, 6);
    setHexInput(raw.toUpperCase());
    if (raw.length === 6 || raw.length === 3) {
      const hex = `#${raw}`;
      const [r, g, b] = hexToRgb(hex);
      setHsv(rgbToHsv(r, g, b));
      onChange(hex.toUpperCase());
    }
  };

  // EyeDropper API (Native browser eyedropper where available)
  const hasEyeDropper = useSyncExternalStore(
    () => () => {},
    () => typeof window !== "undefined" && "EyeDropper" in window,
    () => false,
  );

  const openEyeDropper = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const eyeDropper = new (window as any).EyeDropper();
      const result = await eyeDropper.open();
      if (result?.sRGBHex) {
        const hex = result.sRGBHex.toUpperCase();
        const [r, g, b] = hexToRgb(hex);
        setHsv(rgbToHsv(r, g, b));
        setHexInput(hex.replace("#", ""));
        onChange(hex);
      }
    } catch {
      // User cancelled eyedropper
    }
  };

  return (
    <div className={styles.pickerContainer}>
      {label && (
        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--admin-text)" }}>
          {label}
        </span>
      )}

      {/* 2D Saturation / Value Canvas Field */}
      <div
        ref={svRef}
        className={styles.svPad}
        style={{ backgroundColor: pureHueHex }}
        onMouseDown={onSvMouseDown}
        onTouchStart={onSvTouchStart}
        role="slider"
        aria-label="Saturation and brightness"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(hsv.v * 100)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") updateColorFromHsv({ ...hsv, s: clamp(hsv.s + 0.05, 0, 1) });
          if (e.key === "ArrowLeft") updateColorFromHsv({ ...hsv, s: clamp(hsv.s - 0.05, 0, 1) });
          if (e.key === "ArrowUp") updateColorFromHsv({ ...hsv, v: clamp(hsv.v + 0.05, 0, 1) });
          if (e.key === "ArrowDown") updateColorFromHsv({ ...hsv, v: clamp(hsv.v - 0.05, 0, 1) });
        }}
      >
        <div className={styles.svWhiteOverlay} />
        <div className={styles.svBlackOverlay} />
        <div
          className={styles.svThumb}
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            backgroundColor: value,
          }}
        />
      </div>

      {/* 360° Hue Slider */}
      <div
        ref={hueRef}
        className={styles.hueSlider}
        onMouseDown={onHueMouseDown}
        onTouchStart={onHueTouchStart}
        role="slider"
        aria-label="Color hue"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(hsv.h)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") updateColorFromHsv({ ...hsv, h: (hsv.h + 5) % 360 });
          if (e.key === "ArrowLeft") updateColorFromHsv({ ...hsv, h: (hsv.h - 5 + 360) % 360 });
        }}
      >
        <div
          className={styles.hueThumb}
          style={{
            left: `${(hsv.h / 360) * 100}%`,
            backgroundColor: pureHueHex,
          }}
        />
      </div>

      {/* Hex value & Swatch Row */}
      <div className={styles.valuesRow}>
        <div
          className={styles.currentSwatch}
          style={{ backgroundColor: value }}
          title={`Active color: ${value}`}
        />
        <div className={styles.hexInputWrap}>
          <span className={styles.hexPrefix}>#</span>
          <input
            id={id}
            type="text"
            value={hexInput}
            onChange={handleHexChange}
            maxLength={6}
            className={styles.hexInput}
            placeholder="FFFFFF"
            aria-label="HEX color code"
          />
        </div>
        {hasEyeDropper && (
          <button
            type="button"
            onClick={openEyeDropper}
            className={styles.eyeDropperBtn}
            title="Sample color from screen"
            aria-label="Sample color from screen"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m2 22 1-1h3l9-9" />
              <path d="M3 21v-3l9-9" />
              <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 0 1 0 3l-1.4 1.4-6.4-6.4 1.4-1.4a2.1 2.1 0 0 1 3 0z" />
            </svg>
          </button>
        )}
      </div>

      {/* Curated Luxury Preset Palette */}
      <div className={styles.presetsBlock}>
        <span className={styles.presetsLabel}>Curated Presets</span>
        <div className={styles.presetsList}>
          {LUXURY_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              className={styles.presetButton}
              onClick={() => {
                const [r, g, b] = hexToRgb(preset.color);
                setHsv(rgbToHsv(r, g, b));
                setHexInput(preset.color.replace("#", "").toUpperCase());
                onChange(preset.color);
              }}
              title={preset.name}
            >
              <span className={styles.presetSwatch} style={{ backgroundColor: preset.color }} />
              <span>{preset.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
