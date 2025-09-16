import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import Svg, { G, Rect, Circle, Polyline, SvgXml, Text as SvgText } from 'react-native-svg';
import ZoomableView from './ZoomableView';
// Use legacy API to avoid deprecation/runtime issues on SDK 54
import { readAsStringAsync } from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';

// Demo room index mapping room code -> approximate coordinates on the SVG viewBox
// You should replace this with real coordinates extracted from your floorplan
export const roomIndex = {
  'A.1.01': { x: 150, y: 200 },
  'B.2.01': { x: 420, y: 180 },
};

// Route computation removed: we only render markers (no path/line and no related calculations)

// Minimal XML path extractor for a subset of elements; for static display only
// Note: Full generic SVG parsing is complex. Here we draw only a background and demo overlay.
export default function MapViewer({
  svgAssetModule = require('../assets/stueetage_kl_9_cbs_porcelanshaven_2.svg'),
  width = 350,
  height = 520,
  highlightRoom,
  origin = { x: 150, y: 150 },
  onMatchChange,
  matchIndex = 0,
  debugLabels = false,
  debugWalls = false,
  autoFitOnChange = false,
}) {
  const ENABLE_DEBUG_LOGS = false;
  const zoomRef = useRef(null);
  const [svgString, setSvgString] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [detected, setDetected] = useState({ doors: [], corridors: [], entrances: [], rooms: [], walls: [] });
  const [computed, setComputed] = useState({ buildingBounds: null, roomBoxes: [], filteredWalls: [] });
  // Derive overlay viewBox from the SVG's own viewBox (preferred), else from computed building bounds, else fallback
  const rootViewBox = useMemo(() => {
    if (!svgString) return null;
    const m = /<\s*svg\b([\s\S]*?)>/i.exec(svgString);
    if (!m) return null;
    const attrsRaw = m[1] || '';
    // parse attributes key="value"
    const attrs = {};
    const attrRegex = /(\w[\w:-]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
    let a;
    while ((a = attrRegex.exec(attrsRaw))) {
      attrs[a[1]] = a[3] ?? a[4];
    }
    if (attrs.viewBox) {
      const nums = attrs.viewBox.trim().split(/[ ,]+/).map((v) => parseFloat(String(v).replace(/,/, '.')));
      if (nums.length === 4 && nums.every((n) => isFinite(n))) {
        return { minX: nums[0], minY: nums[1], w: nums[2], h: nums[3] };
      }
    }
    // Fallback to width/height if numeric
    const w = parseFloat(String(attrs.width || '').replace(/[^0-9.\-]/g, ''));
    const h = parseFloat(String(attrs.height || '').replace(/[^0-9.\-]/g, ''));
    if (isFinite(w) && isFinite(h)) return { minX: 0, minY: 0, w, h };
    return null;
  }, [svgString]);

  const overlayViewBox = useMemo(() => {
    if (rootViewBox) return rootViewBox;
    const b = computed?.buildingBounds;
    if (b && isFinite(b.minX) && isFinite(b.minY) && isFinite(b.maxX) && isFinite(b.maxY)) {
      return { minX: b.minX, minY: b.minY, w: b.maxX - b.minX, h: b.maxY - b.minY };
    }
    // Default fallback (letter page like)
    return { minX: 0, minY: 0, w: 612, h: 792 };
  }, [rootViewBox, computed.buildingBounds]);

  // Keep markers readable regardless of viewBox scaling
  const pxToUnits = useMemo(() => {
    const vbw = overlayViewBox?.w || 612;
    return vbw / Math.max(1, width);
  }, [overlayViewBox, width]);
  const U = (px) => Math.max(1, px * pxToUnits);

  // Imperative zoom helper: zoom around the center by a factor
  const zoomBy = (factor = 1.2) => {
    if (!zoomRef.current) return;
    try {
      const st = zoomRef.current.getState ? zoomRef.current.getState() : null;
      if (!st) return;
      const curScale = st.scale || 1;
      const curTx = (st.translate && st.translate.x) || 0;
      const curTy = (st.translate && st.translate.y) || 0;
      const nextScale = Math.max(0.5, Math.min(3, curScale * factor));
      if (!isFinite(nextScale) || nextScale === curScale) return;
      const cx = width / 2;
      const cy = height / 2;
      const wx = (cx - curTx) / curScale;
      const wy = (cy - curTy) / curScale;
      const nextTx = cx - wx * nextScale;
      const nextTy = cy - wy * nextScale;
      zoomRef.current.setTransform?.({ nextScale, nextTranslateX: nextTx, nextTranslateY: nextTy, animate: true, duration: 180 });
    } catch {}
  };

  // Match base preserveAspectRatio if present on root <svg>
  const overlayPAR = useMemo(() => {
    if (!svgString) return undefined;
    const m = /<\s*svg\b([\s\S]*?)>/i.exec(svgString);
    if (!m) return undefined;
    const attrsRaw = m[1] || '';
    const attrRegex = /(\w[\w:-]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
    let a; const attrs = {};
    while ((a = attrRegex.exec(attrsRaw))) {
      attrs[a[1]] = a[3] ?? a[4];
    }
    return attrs.preserveAspectRatio || 'xMidYMid meet';
  }, [svgString]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        // Resolve asset to local URI
        const asset = Asset.fromModule(svgAssetModule);
        await asset.downloadAsync();
        const uri = asset.localUri || asset.uri;
        const content = await readAsStringAsync(uri);
        if (isMounted) {
          setSvgString(content || '');
          setLoadError(content && content.length > 0 ? null : 'Empty SVG content');
        }
      } catch (e) {
        console.warn('Failed to load SVG:', e);
        if (isMounted) {
          setSvgString('');
          setLoadError(e?.message || 'Failed to load SVG');
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [svgAssetModule]);

  // --- Lightweight SVG scanner ---
  useEffect(() => {
    if (!svgString || svgString.trim().length === 0) {
      setDetected({ doors: [], corridors: [], entrances: [], rooms: [], walls: [] });
      setComputed({ buildingBounds: null, roomBoxes: [], filteredWalls: [] });
      return;
    }

    // Helpers
    const decodeEntities = (str) => {
      if (!str) return '';
      return String(str)
        .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
        .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
    };
    const parseAttributes = (tag) => {
      const attrs = {};
      // Matches key="value" or key='value'
      const attrRegex = /(\w[\w:-]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
      let m;
      while ((m = attrRegex.exec(tag))) {
        attrs[m[1]] = m[3] ?? m[4];
      }
      return attrs;
    };

    const toFloat = (v) => {
      if (v == null) return undefined;
      const num = parseFloat(String(v).replace(/,/, '.'));
      return isFinite(num) ? num : undefined;
    };

    const parseTransform = (t) => {
      if (!t) return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
      // Support translate(x[,y]) and matrix(a,b,c,d,e,f)
      const tr = /translate\s*\(\s*(-?\d*\.?\d+)\s*(?:,\s*(-?\d*\.?\d+))?\s*\)/i.exec(t);
      if (tr) {
        const tx = parseFloat(tr[1] || '0');
        const ty = parseFloat(tr[2] || '0');
        return { a: 1, b: 0, c: 0, d: 1, e: tx, f: ty };
      }
      const mx = /matrix\s*\(\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*\)/i.exec(t);
      if (mx) {
        const [a,b,c,d,e,f] = mx.slice(1).map((n) => parseFloat(n));
        return { a, b, c, d, e, f };
      }
      return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
    };

    const applyTransform = (pt, M) => ({ x: M.a * pt.x + M.c * pt.y + M.e, y: M.b * pt.x + M.d * pt.y + M.f });
    const multT = (M1, M2) => {
      // Compose affine transforms: result = M1 * M2
      return {
        a: M1.a * M2.a + M1.c * M2.b,
        b: M1.b * M2.a + M1.d * M2.b,
        c: M1.a * M2.c + M1.c * M2.d,
        d: M1.b * M2.c + M1.d * M2.d,
        e: M1.a * M2.e + M1.c * M2.f + M1.e,
        f: M1.b * M2.e + M1.d * M2.f + M1.f,
      };
    };
    const computeGroupTransformAt = (pos) => {
      // Scan from start to pos, tracking <g> stack
      const tokenRegex = /<\s*g\b[^>]*>|<\s*\/\s*g\s*>/gi;
      let m;
      const stack = [];
      while ((m = tokenRegex.exec(svgString))) {
        if (m.index >= pos) break;
        const tok = m[0];
        if (/^<\s*g\b/i.test(tok)) {
          const a = parseAttributes(tok);
          const Mt = parseTransform(a.transform);
          stack.push(Mt);
        } else {
          // closing tag
          stack.pop();
        }
      }
      // Compose all in order: outer * inner * ...
      let Macc = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
      for (const M of stack) {
        Macc = multT(Macc, M);
      }
      return Macc;
    };

    const hasType = (attrs, type) => {
      const dt = attrs['data-type'] || attrs['dataType'];
      const id = attrs['id'] || '';
      const cls = attrs['class'] || '';
      const t = (dt || '').toLowerCase();
      if (t === type) return true;
      if (id.toLowerCase().includes(type)) return true;
      if (cls.toLowerCase().includes(type)) return true;
      return false;
    };

    const parseStyleDecl = (styleStr) => {
      const map = {};
      if (!styleStr) return map;
      String(styleStr).split(';').forEach((kv) => {
        const idx = kv.indexOf(':');
        if (idx > -1) {
          const k = kv.slice(0, idx).trim().toLowerCase();
          const v = kv.slice(idx + 1).trim();
          if (k) map[k] = v;
        }
      });
      return map;
    };
    const computeGroupStyleAt = (pos) => {
      const tokenRegex = /<\s*g\b[^>]*>|<\s*\/\s*g\s*>/gi;
      let m;
      const stack = [];
      while ((m = tokenRegex.exec(svgString))) {
        if (m.index >= pos) break;
        const tok = m[0];
        if (/^<\s*g\b/i.test(tok)) {
          const a = parseAttributes(tok);
          const st = parseStyleDecl(a.style || '');
          const style = {
            fill: (a.fill || st.fill || '').toLowerCase(),
            stroke: (a.stroke || st.stroke || '').toLowerCase(),
            strokeWidth: (a['stroke-width'] || st['stroke-width'] || '').toLowerCase(),
          };
          stack.push(style);
        } else {
          stack.pop();
        }
      }
      // compose, nearest ancestor wins (later in stack overrides earlier)
      let out = { fill: '', stroke: '', strokeWidth: '' };
      for (const s of stack) {
        if (s.fill) out.fill = s.fill;
        if (s.stroke) out.stroke = s.stroke;
        if (s.strokeWidth) out.strokeWidth = s.strokeWidth;
      }
      return out;
    };
    const getFillColor = (attrs, pos) => {
      let fill = attrs.fill || '';
      if (!fill && attrs.style) {
        const m = /fill\s*:\s*([^;"\s]+)/i.exec(attrs.style);
        if (m) fill = m[1];
      }
      if (!fill && typeof pos === 'number') {
        const gs = computeGroupStyleAt(pos);
        fill = gs.fill || '';
      }
      return (fill || '').toLowerCase();
    };
    const isFloorFill = (fill) => {
      if (!fill) return false;
      const f = fill.toLowerCase();
      if (f === '#d9e2e8' || f === '#dbe2e8') return true;
      const c = parseColorHex(f);
      if (c) {
        const dr = Math.abs(c.r - 217), dg = Math.abs(c.g - 226), db = Math.abs(c.b - 232);
        if (dr + dg + db < 32) return true;
        if (c.r === 219 && c.g === 226 && c.b === 232 && (c.a === undefined || c.a === 1 || c.a === 255)) return true;
      }
      return false;
    };
    const isEntranceGreen = (color) => {
      if (!color) return false;
      const c = parseColorHex(color.toLowerCase());
      if (!c) return false;
      // Target #53b848 => (83,184,72)
      const dr = Math.abs(c.r - 83), dg = Math.abs(c.g - 184), db = Math.abs(c.b - 72);
      return (dr + dg + db) < 40;
    };

    const colorEquals = (value, hex) => {
      if (!value) return false;
      const v = value.toLowerCase();
      const h = hex.toLowerCase();
      return v === h || v === `'${h}'` || v === `"${h}"`;
    };

    const getStrokeColor = (attrs, pos) => {
      let stroke = attrs.stroke || '';
      if (!stroke && attrs.style) {
        const m = /stroke\s*:\s*([^;"\s]+)/i.exec(attrs.style);
        if (m) stroke = m[1];
      }
      if (!stroke && typeof pos === 'number') {
        const gs = computeGroupStyleAt(pos);
        stroke = gs.stroke || '';
      }
      return (stroke || '').toLowerCase();
    };
    // Approx conversion from px to user units based on root viewBox vs component width
    const pxToUnitsApprox = (() => {
      const vbw = rootViewBox?.w || 612;
      return vbw / Math.max(1, width);
    })();
    const getStrokeWidth = (attrs, pos) => {
      let sw = attrs['stroke-width'] || '';
      if (!sw && attrs.style) {
        const m = /stroke-width\s*:\s*([^;"\s]+)/i.exec(attrs.style);
        if (m) sw = m[1];
      }
      if (!sw && typeof pos === 'number') {
        const gs = computeGroupStyleAt(pos);
        sw = gs.strokeWidth || '';
      }
      if (!sw) return 1; // SVG default stroke-width is 1 user unit
      const s = String(sw).trim().toLowerCase();
      const px = /(-?\d*\.?\d+)\s*px$/.exec(s);
      const num = /(-?\d*\.?\d+)$/.exec(s);
      if (px) return parseFloat(px[1]) * pxToUnitsApprox;
      if (num) return parseFloat(num[1]);
      return undefined;
    };
    const isWallStroke = (stroke, strokeWidthUnits) => {
      // Accept walls that are either:
      // 1) Floor-like color with medium width band, OR
      // 2) Gray/black low-saturation thin strokes (common for interior walls), OR
      // 3) Dark bluish strokes near #246b89 (seen in some maps)
      if (!stroke) return false;
      const c = parseColorHex(stroke.toLowerCase());
      if (!c) return false;
      const sw = strokeWidthUnits;
      if (!isFinite(sw)) return false;

      // Common bands
      const withinUnits = sw >= 0.02 && sw <= 3.0; // ~0.12–3.0 units
      const withinPxEquivalent = (() => {
        const min = 2 * pxToUnitsApprox;
        const max = 12 * pxToUnitsApprox;
        return sw >= min && sw <= max; // ~2–12px
      })();
      const withinThinUnits = sw >= 0.02 && sw <= 1.6; // thinner band for hairline walls
      const withinThinPxEq = (() => {
        const min = 1 * pxToUnitsApprox;
        const max = 8 * pxToUnitsApprox;
        return sw >= min && sw <= max; // ~1–8px
      })();

      // 1) Floor-like color proximity
      const floor = { r: 217, g: 226, b: 232 };
      const deltaFloor = Math.abs(c.r - floor.r) + Math.abs(c.g - floor.g) + Math.abs(c.b - floor.b);
      const floorColorOk = deltaFloor <= 42;
      if ((floorColorOk && (withinUnits || withinPxEquivalent))) return true;

      // 2) Gray/black thin strokes
      const hsl = rgbToHsl({ r: c.r, g: c.g, b: c.b });
      const grayish = isGrayish(stroke);
      const grayOk = grayish && hsl.l >= 0.1 && hsl.l <= 0.8; // avoid super-light gridlines
      if (grayOk && (withinThinUnits || withinThinPxEq)) return true;

      // 3) Near #246b89 dark blue
      const blu = { r: 36, g: 107, b: 137 };
      const deltaBlu = Math.abs(c.r - blu.r) + Math.abs(c.g - blu.g) + Math.abs(c.b - blu.b);
      const blueOk = deltaBlu <= 80;
      if (blueOk && (withinUnits || withinPxEquivalent)) return true;

      return false;
    };
    const parseColorHex = (str) => {
      if (!str) return null;
      const s = str.trim().toLowerCase();
      const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
      const rgb = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i.exec(s);
      const rgba = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+(?:\.\d+)?)\s*\)$/i.exec(s);
      if (hex) {
        let h = hex[1];
        if (h.length === 3) h = h.split('').map((c) => c + c).join('');
        const r = parseInt(h.slice(0, 2), 16);
        const g = parseInt(h.slice(2, 4), 16);
        const b = parseInt(h.slice(4, 6), 16);
        return { r, g, b };
      }
      if (rgb) {
        return { r: parseInt(rgb[1], 10), g: parseInt(rgb[2], 10), b: parseInt(rgb[3], 10) };
      }
      if (rgba) {
        return { r: parseInt(rgba[1], 10), g: parseInt(rgba[2], 10), b: parseInt(rgba[3], 10), a: parseFloat(rgba[4]) };
      }
      return null;
    };
    const colorDeltaToFloor = (colorStr) => {
      const c = parseColorHex(colorStr || '');
      if (!c) return undefined;
      const floor = { r: 217, g: 226, b: 232 };
      return Math.abs(c.r - floor.r) + Math.abs(c.g - floor.g) + Math.abs(c.b - floor.b);
    };
    const rgbToHsl = ({ r, g, b }) => {
      r /= 255; g /= 255; b /= 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max - min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      return { h, s, l };
    };
    const isGrayish = (colorStr) => {
      const c = parseColorHex(colorStr);
      if (!c) return false;
      const { s } = rgbToHsl(c);
      return s < 0.2; // low saturation -> grayish
    };

  const doors = [];
  const corridors = [];
  const entrances = [];
  const rooms = [];
  const walls = [];
  const floors = []; // floor interior shapes filled with #d9e2e8
  // Debug histograms
  const strokeCounts = new Map();
  const fillCounts = new Map();
  const bumpMap = (map, key) => { if (!key) return; map.set(key, (map.get(key) || 0) + 1); };

    // Basic path parser for M/L/H/V/Z commands only
    const parsePathToSegments = (d) => {
      if (!d) return [];
      const cmds = d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g);
      if (!cmds) return [];
      let i = 0;
      const nextNum = () => (i < cmds.length ? parseFloat(cmds[i++]) : NaN);
      const segs = [];
      let cur = { x: 0, y: 0 };
      let start = { x: 0, y: 0 };
      let cmd = '';
      while (i < cmds.length) {
        const token = cmds[i++];
        if (isNaN(parseFloat(token))) {
          cmd = token;
        } else {
          // If a number appears where a command is expected, repeat the last command
          i--;
        }
        switch (cmd) {
          case 'M': {
            const x = nextNum(); const y = nextNum();
            cur = { x, y }; start = { x, y };
            // Subsequent pairs are implicit L
            while (i < cmds.length && !isNaN(parseFloat(cmds[i]))) {
              const x2 = nextNum(); const y2 = nextNum();
              segs.push({ x1: cur.x, y1: cur.y, x2: x2, y2: y2 });
              cur = { x: x2, y: y2 };
            }
            break;
          }
          case 'm': {
            const dx = nextNum(); const dy = nextNum();
            cur = { x: cur.x + dx, y: cur.y + dy }; start = { ...cur };
            while (i < cmds.length && !isNaN(parseFloat(cmds[i]))) {
              const dx2 = nextNum(); const dy2 = nextNum();
              segs.push({ x1: cur.x, y1: cur.y, x2: cur.x + dx2, y2: cur.y + dy2 });
              cur = { x: cur.x + dx2, y: cur.y + dy2 };
            }
            break;
          }
          case 'L': {
            const x = nextNum(); const y = nextNum();
            segs.push({ x1: cur.x, y1: cur.y, x2: x, y2: y });
            cur = { x, y };
            break;
          }
          case 'l': {
            const dx = nextNum(); const dy = nextNum();
            segs.push({ x1: cur.x, y1: cur.y, x2: cur.x + dx, y2: cur.y + dy });
            cur = { x: cur.x + dx, y: cur.y + dy };
            break;
          }
          case 'H': {
            const x = nextNum();
            segs.push({ x1: cur.x, y1: cur.y, x2: x, y2: cur.y });
            cur = { x, y: cur.y };
            break;
          }
          case 'h': {
            const dx = nextNum();
            segs.push({ x1: cur.x, y1: cur.y, x2: cur.x + dx, y2: cur.y });
            cur = { x: cur.x + dx, y: cur.y };
            break;
          }
          case 'V': {
            const y = nextNum();
            segs.push({ x1: cur.x, y1: cur.y, x2: cur.x, y2: y });
            cur = { x: cur.x, y };
            break;
          }
          case 'v': {
            const dy = nextNum();
            segs.push({ x1: cur.x, y1: cur.y, x2: cur.x, y2: cur.y + dy });
            cur = { x: cur.x, y: cur.y + dy };
            break;
          }
          case 'Z':
          case 'z': {
            segs.push({ x1: cur.x, y1: cur.y, x2: start.x, y2: start.y });
            cur = { ...start };
            break;
          }
          default: {
            // Skip unsupported commands by consuming numbers until next command
            while (i < cmds.length && !isNaN(parseFloat(cmds[i]))) i++;
            break;
          }
        }
      }
      return segs;
    };

    // Scan <rect ...>
    const rectRegex = /<\s*rect\b[^>]*>/gi;
    let r;
    while ((r = rectRegex.exec(svgString))) {
      const tag = r[0];
      const tagPos = r.index;
      const a = parseAttributes(tag);
      const x = toFloat(a.x) ?? 0;
      const y = toFloat(a.y) ?? 0;
      const w = toFloat(a.width) ?? 0;
      const h = toFloat(a.height) ?? 0;
  // Compose parent <g> transform with element's own transform
  const Mparent = computeGroupTransformAt(tagPos);
  const M = multT(Mparent, parseTransform(a.transform));
      const pTL = applyTransform({ x, y }, M);
      const pTR = applyTransform({ x: x + w, y }, M);
      const pBR = applyTransform({ x: x + w, y: y + h }, M);
      const pBL = applyTransform({ x, y: y + h }, M);

  bumpMap(fillCounts, getFillColor(a, tagPos));
  bumpMap(strokeCounts, getStrokeColor(a, tagPos));
      if (hasType(a, 'door')) {
        const c = applyTransform({ x: x + w / 2, y: y + h / 2 }, M);
        doors.push({ id: a.id || undefined, x: c.x, y: c.y, source: 'rect' });
      } else if (hasType(a, 'corridor')) {
        // Represent corridor rectangles as polylines for overlay
        corridors.push({ id: a.id || undefined, points: [
          pTL, pTR, pBR, pBL, pTL
        ], source: 'rect' });
  } else if (isEntranceGreen(getFillColor(a, tagPos))) {
        // Building entrance marker (green arrow might also be a rect fallback)
        const c = applyTransform({ x: x + w / 2, y: y + h / 2 }, M);
        entrances.push({ x: c.x, y: c.y, source: 'rect' });
  } else if (isFloorFill(getFillColor(a, tagPos))) {
        // Treat as a floor patch; record its bounds
        const minX = Math.min(pTL.x, pTR.x, pBR.x, pBL.x);
        const minY = Math.min(pTL.y, pTR.y, pBR.y, pBL.y);
        const maxX = Math.max(pTL.x, pTR.x, pBR.x, pBL.x);
        const maxY = Math.max(pTL.y, pTR.y, pBR.y, pBL.y);
    floors.push({ minX, minY, maxX, maxY, source: 'rect' });
    // Also push the rectangle outline as walls to strengthen navigation boundaries
    const floorStroke = '#d9e2e8';
    const fd = 0;
    walls.push({ x1: pTL.x, y1: pTL.y, x2: pTR.x, y2: pTR.y, source: 'floor-rect', strokeColor: floorStroke, strokeWidth: 2, colorDelta: fd, floorDerived: true });
    walls.push({ x1: pTR.x, y1: pTR.y, x2: pBR.x, y2: pBR.y, source: 'floor-rect', strokeColor: floorStroke, strokeWidth: 2, colorDelta: fd, floorDerived: true });
    walls.push({ x1: pBR.x, y1: pBR.y, x2: pBL.x, y2: pBL.y, source: 'floor-rect', strokeColor: floorStroke, strokeWidth: 2, colorDelta: fd, floorDerived: true });
    walls.push({ x1: pBL.x, y1: pBL.y, x2: pTL.x, y2: pTL.y, source: 'floor-rect', strokeColor: floorStroke, strokeWidth: 2, colorDelta: fd, floorDerived: true });
      }

      // Walls by stroke color on rectangles (rare, but keep for completeness)
  const stroke = getStrokeColor(a, tagPos);
  const sw = getStrokeWidth(a, tagPos);
      if (isWallStroke(stroke, sw)) {
        // Represent rect border as 4 segments
        const cd = colorDeltaToFloor(stroke);
        walls.push({ x1: pTL.x, y1: pTL.y, x2: pTR.x, y2: pTR.y, source: 'rect', strokeColor: stroke, strokeWidth: sw, colorDelta: cd });
        walls.push({ x1: pTR.x, y1: pTR.y, x2: pBR.x, y2: pBR.y, source: 'rect', strokeColor: stroke, strokeWidth: sw, colorDelta: cd });
        walls.push({ x1: pBR.x, y1: pBR.y, x2: pBL.x, y2: pBL.y, source: 'rect', strokeColor: stroke, strokeWidth: sw, colorDelta: cd });
        walls.push({ x1: pBL.x, y1: pBL.y, x2: pTL.x, y2: pTL.y, source: 'rect', strokeColor: stroke, strokeWidth: sw, colorDelta: cd });
      }
    }

    // Scan <line ...>
    const lineRegex = /<\s*line\b[^>]*>/gi;
    let ln;
    while ((ln = lineRegex.exec(svgString))) {
      const tag = ln[0];
      const tagPos = ln.index;
      const a = parseAttributes(tag);
      const x1 = toFloat(a.x1) ?? 0;
      const y1 = toFloat(a.y1) ?? 0;
      const x2 = toFloat(a.x2) ?? 0;
      const y2 = toFloat(a.y2) ?? 0;
  // Compose parent <g> transform with element's own transform
  const Mparent = computeGroupTransformAt(tagPos);
  const M = multT(Mparent, parseTransform(a.transform));
      const p1 = applyTransform({ x: x1, y: y1 }, M);
      const p2 = applyTransform({ x: x2, y: y2 }, M);
  const stroke = getStrokeColor(a, tagPos);
  const sw = getStrokeWidth(a, tagPos);
      if (isWallStroke(stroke, sw)) {
        const cd = colorDeltaToFloor(stroke);
        walls.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, source: 'line', strokeColor: stroke, strokeWidth: sw, colorDelta: cd });
      }
      if (hasType(a, 'door')) {
        doors.push({ id: a.id || undefined, x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2, source: 'line' });
      } else if (hasType(a, 'corridor')) {
        corridors.push({ id: a.id || undefined, points: [ p1, p2 ], source: 'line' });
      } else if (isEntranceGreen(getFillColor(a, tagPos))) {
        entrances.push({ x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2, source: 'line' });
      }
    }

    // Scan <polyline ...>
    const polylineRegex = /<\s*polyline\b[^>]*>/gi;
    let pl;
    while ((pl = polylineRegex.exec(svgString))) {
      const tag = pl[0];
      const tagPos = pl.index;
      const a = parseAttributes(tag);
  const pointsStr = a.points || '';
  // Compose parent <g> transform with element's own transform
  const Mparent = computeGroupTransformAt(tagPos);
  const M = multT(Mparent, parseTransform(a.transform));
      bumpMap(fillCounts, getFillColor(a, tagPos)); bumpMap(strokeCounts, getStrokeColor(a, tagPos));
      const pts = pointsStr
        .trim()
        .split(/\s+/)
        .map((p) => p.split(',').map((n) => toFloat(n)))
        .filter((arr) => arr.length === 2 && isFinite(arr[0]) && isFinite(arr[1]))
        .map(([x, y]) => applyTransform({ x, y }, M));

  const stroke = getStrokeColor(a, tagPos);
  const sw = getStrokeWidth(a, tagPos);
      if (isWallStroke(stroke, sw)) {
        // polyline broken into segments
        for (let i = 1; i < pts.length; i++) {
          const p1 = pts[i - 1];
          const p2 = pts[i];
          const cd = colorDeltaToFloor(stroke);
          walls.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, source: 'polyline', strokeColor: stroke, strokeWidth: sw, colorDelta: cd });
        }
      }
      if (hasType(a, 'door')) {
        // Door from first/last point center
        if (pts.length >= 2) {
          const mid = {
            x: (pts[0].x + pts[pts.length - 1].x) / 2,
            y: (pts[0].y + pts[pts.length - 1].y) / 2,
          };
          doors.push({ id: a.id || undefined, ...mid, source: 'polyline' });
        }
      } else if (hasType(a, 'corridor')) {
        if (pts.length >= 2) corridors.push({ id: a.id || undefined, points: pts, source: 'polyline' });
      } else if (colorEquals(getFillColor(a, tagPos), '#53b848')) {
        if (pts.length > 0) {
          const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
          const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
          entrances.push({ x: cx, y: cy, source: 'polyline' });
        }
      }
    }

    // Scan <polygon ...>
    const polygonRegex = /<\s*polygon\b[^>]*>/gi;
    let pg;
    while ((pg = polygonRegex.exec(svgString))) {
      const tag = pg[0];
      const tagPos = pg.index;
      const a = parseAttributes(tag);
  const pointsStr = a.points || '';
  // Compose parent <g> transform with element's own transform
  const Mparent = computeGroupTransformAt(tagPos);
  const M = multT(Mparent, parseTransform(a.transform));
      bumpMap(fillCounts, getFillColor(a, tagPos)); bumpMap(strokeCounts, getStrokeColor(a, tagPos));
      const pts = pointsStr
        .trim()
        .split(/\s+/)
        .map((p) => p.split(',').map((n) => toFloat(n)))
        .filter((arr) => arr.length === 2 && isFinite(arr[0]) && isFinite(arr[1]))
        .map(([x, y]) => applyTransform({ x, y }, M));
  if (isEntranceGreen(getFillColor(a, tagPos)) && pts.length > 2) {
        // polygon centroid (approx)
        const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
        const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
        entrances.push({ x: cx, y: cy, source: 'polygon' });
  } else if (isFloorFill(getFillColor(a, tagPos)) && pts.length > 2) {
        // compute polygon bounds as floor area
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of pts) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }
        if (isFinite(minX)) floors.push({ minX, minY, maxX, maxY, source: 'polygon' });
        // Add polygon edges as walls
        for (let i = 0; i < pts.length; i++) {
          const aPt = pts[i];
          const bPt = pts[(i + 1) % pts.length];
          walls.push({ x1: aPt.x, y1: aPt.y, x2: bPt.x, y2: bPt.y, source: 'floor-polygon' });
        }
      }
    }

    // Scan <path ...> for green fill (entrances) and extract rough centroid from M/L pairs
    const pathRegex = /<\s*path\b[^>]*>/gi;
    let ph;
    while ((ph = pathRegex.exec(svgString))) {
      const tag = ph[0];
      const tagPos = ph.index;
      const a = parseAttributes(tag);
  const fill = getFillColor(a, tagPos);
  const stroke = getStrokeColor(a, tagPos);
  const sw = getStrokeWidth(a, tagPos);
  bumpMap(fillCounts, fill); bumpMap(strokeCounts, stroke);
  // Compose parent <g> transform with element's own transform
  const Mparent = computeGroupTransformAt(tagPos);
  const M = multT(Mparent, parseTransform(a.transform));
      if (isWallStroke(stroke, sw)) {
        // treat as wall segments
        const segs = parsePathToSegments(a.d || '');
        for (const s of segs) {
          const p1 = applyTransform({ x: s.x1, y: s.y1 }, M);
          const p2 = applyTransform({ x: s.x2, y: s.y2 }, M);
          const cd = colorDeltaToFloor(stroke);
          walls.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, source: 'path', strokeColor: stroke, strokeWidth: sw, colorDelta: cd });
        }
      }
  if (isEntranceGreen(fill) && a.d) {
        // Extract number pairs from d (only M/L approximated)
        const pairRegex = /(-?\d*\.?\d+)[ ,](-?\d*\.?\d+)/g;
        let m;
        const pts = [];
        while ((m = pairRegex.exec(a.d))) {
          const x = toFloat(m[1]);
          const y = toFloat(m[2]);
          if (isFinite(x) && isFinite(y)) pts.push({ x, y });
        }
        if (pts.length > 0) {
          const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
          const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
          const c = applyTransform({ x: cx, y: cy }, M);
          entrances.push({ x: c.x, y: c.y, source: 'path' });
        }
      } else if (isFloorFill(fill) && a.d) {
        // approximate floor bounds from M/L/H/V/Z points
        const segs = parsePathToSegments(a.d || '');
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const s of segs) {
          const p1 = applyTransform({ x: s.x1, y: s.y1 }, M);
          const p2 = applyTransform({ x: s.x2, y: s.y2 }, M);
          minX = Math.min(minX, p1.x, p2.x); minY = Math.min(minY, p1.y, p2.y);
          maxX = Math.max(maxX, p1.x, p2.x); maxY = Math.max(maxY, p1.y, p2.y);
        }
        if (isFinite(minX)) floors.push({ minX, minY, maxX, maxY, source: 'path' });
        // Add each segment of the path as a wall
        for (const s of segs) {
          const p1 = applyTransform({ x: s.x1, y: s.y1 }, M);
          const p2 = applyTransform({ x: s.x2, y: s.y2 }, M);
          const floorStroke = '#d9e2e8';
          walls.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, source: 'floor-path', strokeColor: floorStroke, strokeWidth: 2, colorDelta: 0, floorDerived: true });
        }
      }
    }

    // Extract room labels from <text> and nested <tspan> elements
    const textRegex = /<\s*text\b([^>]*)>([\s\S]*?)<\s*\/text\s*>/gi;
    let tx;
  const allLabels = [];
    while ((tx = textRegex.exec(svgString))) {
      const attrsRaw = tx[1] || '';
      const inner = tx[2] || '';
      const startIndex = tx.index || 0;
      const a = parseAttributes(`<text ${attrsRaw} />`);
      // Base x/y may be lists; pick first numeric
      const baseX = String(a.x || '')
        .split(/[ ,]+/)
        .map(toFloat)
        .find((v) => isFinite(v));
      const baseY = String(a.y || '')
        .split(/[ ,]+/)
        .map(toFloat)
        .find((v) => isFinite(v));
      // Compose parent <g> transforms with the text's own transform
      const Mparent = computeGroupTransformAt(startIndex);
      const Mtext = parseTransform(a.transform);
      const M = multT(Mparent, Mtext);

      // Prefer tspans; if none, use inner text as one label
      const tspanRegex = /<\s*tspan\b([^>]*)>([\s\S]*?)<\s*\/tspan\s*>/gi;
      let ts;
      let hadTspan = false;
      while ((ts = tspanRegex.exec(inner))) {
        hadTspan = true;
        const tAttrsRaw = ts[1] || '';
        const tInner = ts[2] || '';
        const ta = parseAttributes(`<tspan ${tAttrsRaw} />`);
        const txs = String(ta.x || '')
          .split(/[ ,]+/)
          .map(toFloat)
          .find((v) => isFinite(v));
        const tys = String(ta.y || '')
          .split(/[ ,]+/)
          .map(toFloat)
          .find((v) => isFinite(v));
        const x = isFinite(txs) ? txs : baseX;
        const y = isFinite(tys) ? tys : baseY;
        const raw = decodeEntities(tInner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
        if (!raw) continue;
        if (isFinite(x) && isFinite(y)) {
          const p = applyTransform({ x, y }, M);
          allLabels.push({ id: raw, x: p.x, y: p.y });
        }
      }
      if (!hadTspan) {
        const raw = decodeEntities(inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
        const x = baseX;
        const y = baseY;
        if (raw && isFinite(x) && isFinite(y)) {
          const p = applyTransform({ x, y }, M);
          allLabels.push({ id: raw, x: p.x, y: p.y });
        }
      }
    }

    // If most text labels ended up with negative Y (common in PDF->SVG with flipped Y), shift by root viewBox height
    try {
      if (allLabels.length >= 5) {
        const neg = allLabels.filter((L) => isFinite(L.y) && L.y < 0).length;
        if (neg / allLabels.length > 0.6 && rootViewBox && isFinite(rootViewBox.h)) {
          for (const L of allLabels) {
            if (isFinite(L.y)) L.y = L.y + rootViewBox.h;
          }
        }
      }
    } catch {}

    // Now filter labels to room-like
    for (const L of allLabels) {
      const { id: raw, x, y } = L;
      const roomLike1 = /[A-ZÆØÅ]{1,2}\.?\d+\.\d+/.test(raw); // e.g., A.1.34 or B1.23
      const roomLike2 = /\b\d{2,}[A-Z]?\b/.test(raw); // e.g., 123, 123A
      const roomLike3 = /\b[A-ZÆØÅ]{1,2}\d{1,4}[A-Z]?\b/.test(raw); // e.g., S15, A101
      // Only accept if coordinates are finite and id looks like a room
      if (isFinite(x) && isFinite(y) && (roomLike1 || roomLike2 || roomLike3)) {
        rooms.push({ id: raw, x, y });
      }
    }

    // Note: Full <path> parsing with transforms is not handled here.

    setDetected({ doors, corridors, entrances, rooms, walls, floors });
    // Debug summary
    try {
      if (ENABLE_DEBUG_LOGS) {
        const topStrokes = Array.from(strokeCounts.entries()).sort((a,b)=>b[1]-a[1]).slice(0,8);
        const topFills = Array.from(fillCounts.entries()).sort((a,b)=>b[1]-a[1]).slice(0,8);
        console.warn('[SVG detect]', {
          doors: doors.length,
          corridors: corridors.length,
          entrances: entrances.length,
          rooms: rooms.length,
          walls: walls.length,
          floors: floors.length,
          topStrokes,
          topFills,
        });
      }
    } catch {}
  }, [svgString, rootViewBox]);

  // --- Compute building bounds, room boxes, and filtered walls ---
  useEffect(() => {
    const walls = detected.walls || [];
    const rooms = detected.rooms || [];
    const floors = detected.floors || [];
    if (!walls.length) {
      setComputed({ buildingBounds: null, roomBoxes: [], filteredWalls: [] });
      return;
    }

    // Helper functions
    const cross = (u, v) => u.x * v.y - u.y * v.x;
    const castRay = (origin, dir) => {
      let bestT = Infinity;
      let bestPt = null;
      for (const s of walls) {
        const a = { x: s.x1, y: s.y1 };
        const b = { x: s.x2, y: s.y2 };
        const v1 = { x: origin.x - a.x, y: origin.y - a.y };
        const v2 = { x: b.x - a.x, y: b.y - a.y };
        const denom = cross(dir, v2);
        if (Math.abs(denom) < 1e-6) continue; // parallel
        const t = cross(v2, v1) / denom; // along ray
        const u = cross(dir, v1) / denom;  // along segment
        if (t > 0 && u >= 0 && u <= 1) {
          const pt = { x: origin.x + t * dir.x, y: origin.y + t * dir.y };
          if (t < bestT) { bestT = t; bestPt = pt; }
        }
      }
      return bestPt;
    };

    // Bounds from walls
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const s of walls) {
      minX = Math.min(minX, s.x1, s.x2);
      minY = Math.min(minY, s.y1, s.y2);
      maxX = Math.max(maxX, s.x1, s.x2);
      maxY = Math.max(maxY, s.y1, s.y2);
    }
    const wallBounds = isFinite(minX) ? { minX, minY, maxX, maxY } : null;

    // Bounds from room label clusters (more reliable if wall colors are noisy)
    let rMinX = Infinity, rMinY = Infinity, rMaxX = -Infinity, rMaxY = -Infinity;
    for (const r of rooms) {
      rMinX = Math.min(rMinX, r.x);
      rMinY = Math.min(rMinY, r.y);
      rMaxX = Math.max(rMaxX, r.x);
      rMaxY = Math.max(rMaxY, r.y);
    }
    let roomBounds = null;
    if (isFinite(rMinX) && isFinite(rMinY) && isFinite(rMaxX) && isFinite(rMaxY)) {
      const padX = (rMaxX - rMinX) * 0.15;
      const padY = (rMaxY - rMinY) * 0.15;
      roomBounds = { minX: rMinX - padX, minY: rMinY - padY, maxX: rMaxX + padX, maxY: rMaxY + padY };
    }

    // Prefer floor areas if present; else room label bounds; else walls
    let floorBounds = null;
    if (floors.length) {
      let fminX = Infinity, fminY = Infinity, fmaxX = -Infinity, fmaxY = -Infinity;
      for (const f of floors) {
        fminX = Math.min(fminX, f.minX);
        fminY = Math.min(fminY, f.minY);
        fmaxX = Math.max(fmaxX, f.maxX);
        fmaxY = Math.max(fmaxY, f.maxY);
      }
      if (isFinite(fminX) && isFinite(fminY) && isFinite(fmaxX) && isFinite(fmaxY)) {
        floorBounds = { minX: fminX, minY: fminY, maxX: fmaxX, maxY: fmaxY };
      }
    }
    const buildingBounds = floorBounds || roomBounds || wallBounds;

    // Keep only walls inside the building bounds (with a small margin)
    let wallsInBounds = (buildingBounds && walls.length)
      ? walls.filter((s) => {
          const { minX, minY, maxX, maxY } = buildingBounds;
          const M = 10; // margin in SVG units
          const in1 = (s.x1 >= minX - M && s.x1 <= maxX + M && s.y1 >= minY - M && s.y1 <= maxY + M);
          const in2 = (s.x2 >= minX - M && s.x2 <= maxX + M && s.y2 >= minY - M && s.y2 <= maxY + M);
          return in1 || in2;
        })
      : walls.slice();

    // Deduplicate nearly-identical wall segments and drop tiny ones
    if (wallsInBounds.length) {
      const key = (s) => {
        const ax = Math.round(s.x1 * 2), ay = Math.round(s.y1 * 2);
        const bx = Math.round(s.x2 * 2), by = Math.round(s.y2 * 2);
        return ax <= bx ? `${ax},${ay}|${bx},${by}` : `${bx},${by}|${ax},${ay}`;
      };
      const map = new Map();
      for (const s of wallsInBounds) {
        const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
        if (len < 0.3) continue; // drop only extremely tiny segments (preserve thin walls)
        const k = key(s);
        if (!map.has(k)) map.set(k, s);
      }
      wallsInBounds = Array.from(map.values());
    }

    // Compute room boxes for every detected room label
    const roomBoxes = [];
    for (const r of rooms) {
      const P = { x: r.x, y: r.y };
      const up = castRay(P, { x: 0, y: -1 });
      const down = castRay(P, { x: 0, y: 1 });
      const left = castRay(P, { x: -1, y: 0 });
      const right = castRay(P, { x: 1, y: 0 });
      if (up && down && left && right) {
        const box = { id: r.id, xL: left.x, xR: right.x, yT: up.y, yB: down.y };
        roomBoxes.push(box);
      }
    }

    setComputed({ buildingBounds, roomBoxes, filteredWalls: wallsInBounds });
    // Debug summary
    try {
      if (ENABLE_DEBUG_LOGS) {
        console.warn('[SVG compute]', {
          buildingBounds,
          roomBoxes: roomBoxes.length,
          filteredWalls: wallsInBounds.length,
        });
      }
    } catch {}
  }, [detected.walls, detected.rooms, detected.floors]);

  // No route computation – markers only
  // Prefer extracted room centers if available
  const matches = useMemo(() => {
    const res = [];
    if (!highlightRoom) return res;
    const q = highlightRoom.trim().toLowerCase();
    if (!q) return res;
    for (const r of detected.rooms) {
      const id = (r.id || '').toLowerCase();
      if (id === q || id.includes(q)) res.push(r);
    }
    return res;
  }, [highlightRoom, detected.rooms]);

  const boundedMatches = useMemo(() => {
    const b = computed?.buildingBounds;
    if (!b) return matches;
    return matches.filter((m) => m.x >= b.minX && m.x <= b.maxX && m.y >= b.minY && m.y <= b.maxY);
  }, [matches, computed.buildingBounds]);

  const extractedTarget = useMemo(() => {
    const arr = boundedMatches.length ? boundedMatches : matches;
    if (!arr.length) return null;
    const idx = Math.min(Math.max(0, (matchIndex|0)), arr.length - 1);
    const r = arr[idx];
    return r && isFinite(r.x) && isFinite(r.y) ? { x: r.x, y: r.y } : null;
  }, [boundedMatches, matches, matchIndex]);

  const matchCbRef = useRef(onMatchChange);
  useEffect(() => { matchCbRef.current = onMatchChange; }, [onMatchChange]);
  useEffect(() => {
    if (matchCbRef.current) {
      const arr = boundedMatches.length ? boundedMatches : matches;
      matchCbRef.current({ count: arr.length, ids: arr.map(m => m.id) });
    }
  }, [boundedMatches, matches]);
  const target = extractedTarget || (highlightRoom && roomIndex[highlightRoom] ? roomIndex[highlightRoom] : null);

  // Choose a specific entrance as start: nearest entrance on the same building as the selected room
  const startPoint = useMemo(() => {
    const goalPt = target;
    if (!goalPt) return null; // only show a start when we actually have a goal
    const floors = detected?.floors || [];
    const entrances = detected?.entrances || [];
    const pointIn = (p, aabb) => p.x >= aabb.minX && p.x <= aabb.maxX && p.y >= aabb.minY && p.y <= aabb.maxY;
    const overlap = (a, b) => !(a.maxX < b.minX || b.maxX < a.minX || a.maxY < b.minY || b.maxY < a.minY);
    if (floors.length > 0) {
      // Build clusters of overlapping floor AABBs
      const clusters = [];
      for (const f of floors) {
        let merged = false;
        for (const c of clusters) {
          if (c.floors.some((g) => overlap(f, g))) {
            c.floors.push(f);
            c.bounds.minX = Math.min(c.bounds.minX, f.minX);
            c.bounds.minY = Math.min(c.bounds.minY, f.minY);
            c.bounds.maxX = Math.max(c.bounds.maxX, f.maxX);
            c.bounds.maxY = Math.max(c.bounds.maxY, f.maxY);
            merged = true;
            break;
          }
        }
        if (!merged) clusters.push({ floors: [f], bounds: { ...f } });
        // Merge clusters that now overlap
        let changed = true;
        while (changed) {
          changed = false;
          for (let i = 0; i < clusters.length; i++) {
            for (let j = i + 1; j < clusters.length; j++) {
              if (overlap(clusters[i].bounds, clusters[j].bounds)) {
                const a = clusters[i], b = clusters[j];
                a.floors.push(...b.floors);
                a.bounds = {
                  minX: Math.min(a.bounds.minX, b.bounds.minX),
                  minY: Math.min(a.bounds.minY, b.bounds.minY),
                  maxX: Math.max(a.bounds.maxX, b.bounds.maxX),
                  maxY: Math.max(a.bounds.maxY, b.bounds.maxY),
                };
                clusters.splice(j, 1);
                changed = true;
                break;
              }
            }
            if (changed) break;
          }
        }
      }
      const clusterOf = (p) => {
        for (let idx = 0; idx < clusters.length; idx++) {
          const c = clusters[idx];
          if (!pointIn(p, c.bounds)) continue;
          if (c.floors.some((f) => pointIn(p, f))) return idx;
        }
        return -1;
      };
      const goalCluster = clusterOf(goalPt);
      if (goalCluster >= 0) {
        const same = entrances.filter((e) => clusterOf(e) === goalCluster);
        if (same.length) {
          let best = same[0];
          let bestD = Math.hypot(best.x - goalPt.x, best.y - goalPt.y);
          for (let i = 1; i < same.length; i++) {
            const e = same[i];
            const d = Math.hypot(e.x - goalPt.x, e.y - goalPt.y);
            if (d < bestD) { best = e; bestD = d; }
          }
          return { x: best.x, y: best.y, __isEntrance: true };
        }
        return null;
      }
      return null;
    }
    // Fallback: choose nearest entrance within building bounds
    const b = computed?.buildingBounds;
    const ents = b ? entrances.filter((e) => e.x >= b.minX && e.x <= b.maxX && e.y >= b.minY && e.y <= b.maxY) : entrances;
    if (ents.length) {
      let best = ents[0];
      let bestD = Math.hypot(best.x - goalPt.x, best.y - goalPt.y);
      for (let i = 1; i < ents.length; i++) {
        const e = ents[i];
        const d = Math.hypot(e.x - goalPt.x, e.y - goalPt.y);
        if (d < bestD) { best = e; bestD = d; }
      }
      return { x: best.x, y: best.y, __isEntrance: true };
    }
    return null;
  }, [target, detected.floors, detected.entrances, computed.buildingBounds]);
  const selectedMatch = useMemo(() => {
    const arr = boundedMatches.length ? boundedMatches : matches;
    if (!arr.length) return null;
    const idx = Math.min(Math.max(0, (matchIndex|0)), arr.length - 1);
    return arr[idx];
  }, [boundedMatches, matches, matchIndex]);

  // Optional auto-center/fit: when start/selected changes
  useEffect(() => {
    if (!autoFitOnChange) return; // disabled by default
    if (!zoomRef.current) return;
    // Gather points of interest in SVG units (overlay viewBox space)
    const pts = [];
    if (selectedMatch && isFinite(selectedMatch.x) && isFinite(selectedMatch.y)) pts.push({ x: selectedMatch.x, y: selectedMatch.y });
    if (startPoint && isFinite(startPoint.x) && isFinite(startPoint.y)) pts.push({ x: startPoint.x, y: startPoint.y });
    if (pts.length === 0) return;
    // Map overlay viewBox units to pre-zoom pixels using preserveAspectRatio
    const vb = overlayViewBox;
    const viewW = width; const viewH = height;
    const par = String(overlayPAR || 'xMidYMid meet').toLowerCase();
    const hasNone = par.includes('none');
    const hasSlice = par.includes('slice');
    const alignX = par.includes('xmin') ? 'min' : par.includes('xmax') ? 'max' : 'mid';
    const alignY = par.includes('ymin') ? 'min' : par.includes('ymax') ? 'max' : 'mid';
    let sx, sy, tx0, ty0;
    if (hasNone) {
      sx = viewW / vb.w; sy = viewH / vb.h;
      tx0 = -vb.minX * sx; ty0 = -vb.minY * sy;
    } else {
      const s = hasSlice ? Math.max(viewW / vb.w, viewH / vb.h) : Math.min(viewW / vb.w, viewH / vb.h);
      sx = sy = s;
      const remW = viewW - vb.w * s;
      const remH = viewH - vb.h * s;
      const dx = alignX === 'min' ? 0 : alignX === 'max' ? remW : remW / 2;
      const dy = alignY === 'min' ? 0 : alignY === 'max' ? remH : remH / 2;
      tx0 = dx - vb.minX * s; ty0 = dy - vb.minY * s;
    }
    const toPx = (pt) => ({ x: pt.x * sx + tx0, y: pt.y * sy + ty0 });
    // Compute bounds in pixels (pre-outer-zoom)
    let minPx = Infinity, minPy = Infinity, maxPx = -Infinity, maxPy = -Infinity;
    for (const p of pts) {
      const q = toPx(p);
      minPx = Math.min(minPx, q.x); minPy = Math.min(minPy, q.y);
      maxPx = Math.max(maxPx, q.x); maxPy = Math.max(maxPy, q.y);
    }
    if (!isFinite(minPx) || !isFinite(minPy) || !isFinite(maxPx) || !isFinite(maxPy)) return;
    const padPx = Math.max(viewW, viewH) * 0.05;
    minPx -= padPx; minPy -= padPx; maxPx += padPx; maxPy += padPx;
    const contentW = Math.max(1, maxPx - minPx);
    const contentH = Math.max(1, maxPy - minPy);
    let nextScale = Math.min(viewW / contentW, viewH / contentH);
    nextScale = Math.max(0.5, Math.min(3, nextScale));
    const tx = (viewW - contentW * nextScale) / 2 - minPx * nextScale;
    const ty = (viewH - contentH * nextScale) / 2 - minPy * nextScale;
    try { zoomRef.current.setTransform({ nextScale, nextTranslateX: tx, nextTranslateY: ty, animate: true, duration: 280 }); } catch {}
  }, [width, height, overlayViewBox, selectedMatch, startPoint, autoFitOnChange]);

  if (svgString === null) {
    return (
      <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  // Render the actual uploaded SVG, and overlay markers using a separate absolute-positioned Svg
  const canRenderXml = typeof svgString === 'string' && svgString.trim().length > 0;
  return (
    <View style={{ width, height, position: 'relative' }}>
      <ZoomableView ref={zoomRef} initialScale={0.9} style={{ width, height }}>
        <View style={{ width, height, position: 'relative', backgroundColor: '#f7f9f8' }}>
        {/* Base floorplan */}
        {canRenderXml ? (
          <SvgXml xml={svgString} width={width} height={height} pointerEvents="none" />
        ) : (
          <View style={{ width, height, alignItems: 'center', justifyContent: 'center', padding: 12 }}>
            <Text style={{ color: '#666', textAlign: 'center' }}>
              Kunne ikke indlæse plantegningen.{loadError ? `\n${loadError}` : ''}
            </Text>
          </View>
        )}
        {/* Overlay */}
        <Svg
          width={width}
          height={height}
          viewBox={`${overlayViewBox.minX} ${overlayViewBox.minY} ${overlayViewBox.w} ${overlayViewBox.h}`}
          preserveAspectRatio={overlayPAR}
          style={{ position: 'absolute', top: 0, left: 0 }}
          pointerEvents="none"
        >
          {/* Overlay border for viewBox alignment */}
          {debugWalls && (
            <G key="debug-walls">
              {(((computed && computed.filteredWalls && computed.filteredWalls.length) ? computed.filteredWalls : (detected && detected.walls)) || []).map((w, i) => {
                const mx = (w.x1 + w.x2) / 2;
                const my = (w.y1 + w.y2) / 2;
                const color = w.strokeColor || '#ff00ff';
                const swTxt = typeof w.strokeWidth === 'number' ? w.strokeWidth.toFixed(2) : String(w.strokeWidth || '');
                const deltaTxt = typeof w.colorDelta === 'number' ? w.colorDelta.toFixed(0) : '';
                return (
                  <G key={`dw-${i}`} opacity={0.8}>
                    <Polyline points={`${w.x1},${w.y1} ${w.x2},${w.y2}`} fill="none" stroke="#ff00ff" strokeWidth={0.2} />
                    <Circle cx={mx} cy={my} r={0.6} fill={color} />
                    <SvgText x={mx + 0.8} y={my - 0.8} fontSize={2.2} fill="#333">{`sw:${swTxt}${deltaTxt !== '' ? ` Δ:${deltaTxt}` : ''}`}</SvgText>
                  </G>
                );
              })}
            </G>
          )}
          {/* Building bounds (debug) */}
          {computed.buildingBounds && (
            <Rect
              x={computed.buildingBounds.minX}
              y={computed.buildingBounds.minY}
              width={computed.buildingBounds.maxX - computed.buildingBounds.minX}
              height={computed.buildingBounds.maxY - computed.buildingBounds.minY}
              stroke="#8e44ad"
              strokeDasharray="4,3"
              strokeWidth={U(1)}
              fill="none"
              opacity={0.4}
            />
          )}
          {/* Floor patches detected from #d9e2e8 */}
          {debugLabels && detected.floors && detected.floors.map((f, i) => (
            <Rect key={`floor-${i}`}
              x={f.minX}
              y={f.minY}
              width={Math.max(0, f.maxX - f.minX)}
              height={Math.max(0, f.maxY - f.minY)}
              stroke="#16a085"
              strokeWidth={U(1)}
              fill="none"
              opacity={0.45}
            />
          ))}
          {/* Walls overlay (only when debugWalls) */}
          {debugWalls && computed.filteredWalls && computed.filteredWalls.length > 0 && computed.filteredWalls.map((s, idx) => (
            <Polyline
              key={`wall-${idx}`}
              points={`${s.x1},${s.y1} ${s.x2},${s.y2}`}
              stroke="#ff69b4"
              strokeWidth={U(2)}
              opacity={0.85}
              fill="none"
            />
          ))}
          {debugWalls && computed.filteredWalls && computed.filteredWalls.length === 0 && detected.walls && detected.walls.length > 0 && detected.walls.map((s, idx) => (
            <Polyline
              key={`wall-raw-${idx}`}
              points={`${s.x1},${s.y1} ${s.x2},${s.y2}`}
              stroke="#ff69b4"
              strokeWidth={U(2)}
              opacity={0.85}
              fill="none"
            />
          ))}
          {/* Debug: draw all extracted labels */}
          {debugLabels && detected?.rooms?.length > 0 && detected.rooms.map((r, i) => (
            <G key={`lab-${i}`}>
              <Circle cx={r.x} cy={r.y} r={U(3)} fill="#ff00aa" />
              <SvgText x={r.x + U(5)} y={r.y - U(4)} fontSize={U(8)} fill="#ff00aa">{r.id}</SvgText>
            </G>
          ))}
          {/* Grid overlay removed */}
          {/* Corridors overlay disabled by default */}

          {/* Doors overlay hidden */}

          {/* Only the chosen entrance (startPoint) */}
          {startPoint && startPoint.__isEntrance && (
            <G>
              <Circle cx={startPoint.x} cy={startPoint.y} r={U(5)} fill="#e67e22" />
            </G>
          )}

          {/* Detected door marker hidden */}
          {/* No separate start dot; nearest entrance is highlighted with a green ring above */}
          {/* No route polyline rendered */}
          {/* Hide all other room labels/dots */}
          {/* Only selected room marker */}
          {selectedMatch && (
            <G>
              <Circle cx={selectedMatch.x} cy={selectedMatch.y} r={U(5)} fill="#2ecc71" />
            </G>
          )}
          {debugLabels && (
            <G>
              {/* Crosshairs for selected, goal (door/target), and start */}
              {selectedMatch && (
                <G>
                  <Polyline points={`${selectedMatch.x - U(12)},${selectedMatch.y} ${selectedMatch.x + U(12)},${selectedMatch.y}`} stroke="#2980b9" strokeWidth={U(1)} />
                  <Polyline points={`${selectedMatch.x},${selectedMatch.y - U(12)} ${selectedMatch.x},${selectedMatch.y + U(12)}`} stroke="#2980b9" strokeWidth={U(1)} />
                </G>
              )}
              {target && (
                <G>
                  <Polyline points={`${target.x - U(12)},${target.y} ${target.x + U(12)},${target.y}`} stroke="#27ae60" strokeWidth={U(1)} />
                  <Polyline points={`${target.x},${target.y - U(12)} ${target.x},${target.y + U(12)}`} stroke="#27ae60" strokeWidth={U(1)} />
                </G>
              )}
              {startPoint && (
                <G>
                  <Polyline points={`${startPoint.x - U(12)},${startPoint.y} ${startPoint.x + U(12)},${startPoint.y}`} stroke="#e67e22" strokeWidth={U(1)} />
                  <Polyline points={`${startPoint.x},${startPoint.y - U(12)} ${startPoint.x},${startPoint.y + U(12)}`} stroke="#e67e22" strokeWidth={U(1)} />
                </G>
              )}
              {/* HUD */}
              <SvgText x={overlayViewBox.minX + U(8)} y={overlayViewBox.minY + U(16)} fontSize={U(10)} fill="#222" opacity={0.85}>
                {`rootVB:${rootViewBox ? `${rootViewBox.minX},${rootViewBox.minY},${rootViewBox.w},${rootViewBox.h}` : 'n/a'}`}
              </SvgText>
              <SvgText x={overlayViewBox.minX + U(8)} y={overlayViewBox.minY + U(28)} fontSize={U(10)} fill="#222" opacity={0.85}>
                {`overVB:${overlayViewBox.minX},${overlayViewBox.minY},${overlayViewBox.w},${overlayViewBox.h}`}
              </SvgText>
              <SvgText x={overlayViewBox.minX + U(8)} y={overlayViewBox.minY + U(40)} fontSize={U(10)} fill="#222" opacity={0.85}>
                {`rooms:${detected.rooms?.length||0} walls:${computed.filteredWalls?.length||0} floors:${detected.floors?.length||0}`}
              </SvgText>
              {selectedMatch && (
                <SvgText x={overlayViewBox.minX + U(8)} y={overlayViewBox.minY + U(52)} fontSize={U(10)} fill="#222" opacity={0.85}>
                  {`sel:${selectedMatch.id} (${Math.round(selectedMatch.x)},${Math.round(selectedMatch.y)})`}
                </SvgText>
              )}
            </G>
          )}
        </Svg>
        </View>
      </ZoomableView>
      {/* Zoom controls (outside ZoomableView so gestures don't intercept) */}
      <View pointerEvents="box-none" style={{ position: 'absolute', right: 12, bottom: 12, gap: 10 }}>
        <TouchableOpacity
          onPress={() => zoomBy(1.2)}
          activeOpacity={0.8}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2, marginBottom: 8 }}
        >
          <Text style={{ fontSize: 22, color: '#222' }}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => zoomBy(1 / 1.2)}
          activeOpacity={0.8}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}
        >
          <Text style={{ fontSize: 22, color: '#222' }}>−</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
