# Liquid Glass / macOS-style Shell — Style Reference

> Exact values used in the Sala de Pesquisa (`ResearchShell`) shell.  
> Apply these patterns to any other page that needs the same visual language.

---

## 1. Outer Shell (the main container)

```tsx
style={{
  display: "grid",
  gridTemplateColumns: "2.33fr 1fr",   // 70 / 30 split
  gap: 14,
  height: "72vh",
  minHeight: 560,
  maxHeight: 760,
  borderRadius: 22,

  // Glass background — dark navy at ~55 % opacity
  background: "rgba(22,22,34,0.55)",

  // Subtle white border
  border: "1px solid rgba(255,255,255,0.12)",

  // The core liquid-glass effect
  backdropFilter: "blur(40px) saturate(180%)",
  WebkitBackdropFilter: "blur(40px) saturate(180%)",   // Safari

  // Deep shadow + top highlight inset
  boxShadow:
    "0 40px 100px -30px rgba(0,0,0,0.85), " +
    "inset 0 1px 0 rgba(255,255,255,0.10)",

  padding: 14,
  overflow: "hidden",
}}
```

Key numbers at a glance:

| Token | Value |
|---|---|
| **Background** | `rgba(22,22,34,0.55)` |
| **Border** | `1px solid rgba(255,255,255,0.12)` |
| **Blur** | `blur(40px) saturate(180%)` |
| **Outer shadow** | `0 40px 100px -30px rgba(0,0,0,0.85)` |
| **Top-edge highlight** | `inset 0 1px 0 rgba(255,255,255,0.10)` |
| **Border radius** | `22px` |
| **Height** | `72vh` (min 560 px, max 760 px) |

---

## 2. Inner Panels (left & right sub-surfaces)

```tsx
style={{
  background: "rgba(255,255,255,0.045)",   // very faint white frost
  border: "1px solid rgba(255,255,255,0.10)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",  // inner top highlight
}}
className="rounded-[18px]"
```

---

## 3. Window-Switcher Pill Tabs

### Active tab

```tsx
style={{
  color: "#fff",
  background: "linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.06))",
  border: "1px solid rgba(255,255,255,0.28)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.45), " +
    "0 8px 20px -8px rgba(139,92,246,0.85)",  // violet glow
}}
className="h-8 px-3 rounded-[11px] text-[11px]"
```

### Inactive tab

```tsx
style={{
  color: "#b8b8d0",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.10)",
}}
```

---

## 4. Dock (bottom of right panel)

```tsx
// Dock strip
style={{
  background: "rgba(0,0,0,0.28)",
  border: "1px solid rgba(255,255,255,0.10)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
}}
className="flex gap-1.5 justify-center p-2 rounded-[15px]"

// Dock button — inactive
style={{
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.12)",
}}
className="w-9 h-9 rounded-[11px]"

// Dock button — active
style={{
  background: "linear-gradient(180deg, rgba(139,92,246,0.4), rgba(34,211,238,0.18))",
  border: "1px solid rgba(255,255,255,0.35)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.4), " +
    "0 6px 16px -6px rgba(139,92,246,0.8)",
}}
```

### Badge (counter pill on dock icon)

```tsx
style={{ background: "linear-gradient(90deg, #8b5cf6, #22d3ee)" }}
className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full text-[7px] font-black text-white"
```

---

## 5. Document Icon (DocIcon)

```tsx
// Card
style={{
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  backdropFilter: "blur(8px)",
}}
className="rounded-[14px] p-2 flex flex-col items-center gap-1.5 cursor-pointer"

// Play badge — always visible, centered on icon
style={{
  background: "rgba(255,255,255,0.18)",
  border: "1px solid rgba(255,255,255,0.3)",
  backdropFilter: "blur(6px)",
}}
className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm"

// Hover overlay
style={{ background: "rgba(139,92,246,0.35)" }}
className="absolute inset-0 rounded-[14px] flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
```

---

## 6. Citation Popover (cursor-anchored floating panel)

```tsx
style={{
  position: "absolute",
  top: pos.y,
  left: pos.x + 10,
  transform: "translateY(-50%)",
  zIndex: 40,
  width: 280,
  borderRadius: 14,
  padding: "12px 14px",
  background: "rgba(15,15,28,0.92)",
  border: "1px solid rgba(139,92,246,0.55)",
  backdropFilter: "blur(24px) saturate(160%)",
  boxShadow:
    "0 16px 48px -12px rgba(0,0,0,0.8), " +
    "inset 0 1px 0 rgba(255,255,255,0.12)",
}}
```

---

## 7. Colour Palette

| Name | Hex / value | Usage |
|---|---|---|
| **Violet** | `#8b5cf6` | Active states, glow, gradients |
| **Cyan** | `#22d3ee` | Secondary accent, badges, gradients |
| **Deep navy** | `rgba(22,22,34,…)` | Shell background |
| **Ghost white** | `rgba(255,255,255,0.045–0.12)` | Inner surfaces, borders |
| **Muted label** | `#9595b4` | Section headings inside panels |
| **Dim label** | `#9a9ab6` | Progress text |
| **Darker dim** | `#767692` | Sub-labels |

---

## 8. Progress Bar

Two-stage honest indicator (no fake ticker):

| Stage | Width | Label |
|---|---|---|
| `"pdf"` | 25 % | "Baixando PDF…" |
| `"ai"` | 70 % | "Analisando com IA…" |
| `null` (done) | 100 % | hides |

```tsx
// Track
style={{ background: "rgba(255,255,255,0.08)" }}
className="h-[5px] rounded-full overflow-hidden"

// Fill
style={{
  width: `${progress}%`,
  transition: "width 0.9s ease-out",
  background: "linear-gradient(90deg, #8b5cf6, #22d3ee)",
  boxShadow: "0 0 8px rgba(34,211,238,.7)",
}}
className="h-full rounded-full"
```

---

## 9. Typography inside shell

```
section headers  : text-[9px] font-black uppercase tracking-[0.16em]
body / file names: text-[10.5px]
badges / labels  : text-[9px] or text-[10px]
tab pills        : text-[11px]
```

---

## 10. Applying to a new page

Minimum recipe for any glass card:

```tsx
<div
  style={{
    borderRadius: 18,                               // or 22 for outer shell
    background: "rgba(22,22,34,0.55)",             // dark frost
    border: "1px solid rgba(255,255,255,0.12)",
    backdropFilter: "blur(40px) saturate(180%)",
    WebkitBackdropFilter: "blur(40px) saturate(180%)",
    boxShadow:
      "0 40px 100px -30px rgba(0,0,0,0.85), " +
      "inset 0 1px 0 rgba(255,255,255,0.10)",
  }}
>
  {/* inner surface */}
  <div
    style={{
      borderRadius: 14,
      background: "rgba(255,255,255,0.045)",
      border: "1px solid rgba(255,255,255,0.10)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
    }}
  >
    …
  </div>
</div>
```

> **Prerequisite**: the page background should be dark (`#030014` or similar) for the glass effect to read correctly.  
> On light backgrounds, lower the blur to `blur(20px)` and increase background opacity to `rgba(255,255,255,0.6)` for a light-glass variant.
