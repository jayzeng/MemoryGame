# Squishmallow Memory Parade – Figma‑Ready UI Layout Specs

## Overview
This document contains complete, production‑ready Figma layout specifications for **Squishmallow Memory Parade**, a memory game designed for children ages 5–10.  
It includes design system definitions, reusable components, frame sizes, screen layouts, Auto Layout rules, and interaction annotations.

---

## 1. Global Design System

### Color Styles
| Name | Hex | Usage |
|---|---|---|
| Sky Blue | #CDEBFF | Backgrounds |
| Cloud White | #FFFFFF | Cards, modals |
| Soft Pink | #FFD6E8 | Primary buttons |
| Lavender | #DCCBFF | Secondary buttons |
| Mint Green | #CFF3E2 | Success states |
| Sunshine Yellow | #FFE9A8 | Stars, highlights |
| Soft Gray | #E6E6E6 | Disabled / locked |
| Ink Brown | #6B4F3F | Text / icons |

**Notes**
- Avoid pure black
- Maintain soft contrast ratios

---

### Typography Styles
**Primary fonts:** Nunito / Baloo / SF Rounded

| Style | Size | Weight | Usage |
|---|---|---|---|
| H1 | 36 | Bold | Screen titles |
| H2 | 28 | Bold | Section headers |
| Body | 20 | Medium | Instructions |
| Button | 22 | Bold | CTA buttons |
| Caption | 16 | Medium | Helper text |

Line height: 1.2–1.4×

---

### Effect Styles
**Card Shadow**
- X: 0
- Y: 6
- Blur: 20
- Color: Black @10%

**Success Glow**
- Outer glow
- Mint Green @40%
- Blur: 24

---

## 2. Frame Sizes

| Device | Size |
|---|---|
| iPad Portrait | 834 × 1194 |
| Phone Portrait | 390 × 844 |

Design iPad first, then scale down.

---

## 3. Reusable Components

### Memory Card
**Component:** Card / Memory  
- Size: 140×140  
- Radius: 24  
- States: Back, Flipped, Matched  
- Auto Layout: Centered, padding 12  

---

### Primary Button
**Component:** Button / Primary  
- Min size: 280×72  
- Radius: 36  
- Padding: 24h / 16v  

Variants:
- Default
- Pressed (scale 0.96)
- Disabled

---

### Star Indicator
**Component:** Indicator / Star  
- Size: 32×32  
- Animated rotation

---

### Squishmallow Avatar
**Component:** Avatar / Squishmallow  
- Size: 96×96  
- Circular mask  
- Optional accessory overlay  

---

## 4. Screen Layout Specifications

### Home Screen – Parade Plaza
- Centered vertical Auto Layout
- Title (H1)
- Animated parade container (300px height)
- Play button (primary)
- Secondary icons: Parade Book, Parent Gate

---

### World Select Screen
**World Card**
- Full width × 140
- Radius: 28
- Contains icon, title, star progress

Scrollable vertical list.

---

### Level Select – Parade Path
- SVG path line
- Level nodes (48×48)
- States: Completed, Current, Locked

---

### Gameplay Screen
**Top Bar**
- Height: 80
- Left: Stars
- Right: Pause

**Memory Grid**
- Responsive grid
- Gap: 16
- Center aligned

**Assist Button**
- Appears only after mistakes

---

### Match Celebration Overlay
- Full screen overlay (white @60%)
- Center card: 320×280
- Auto dismiss after 1s

---

### Level Complete Screen
- Star animation
- Unlock reveal
- Buttons: Next Level, Home

---

### Parade Book
- 3‑column grid (iPad)
- Locked tiles use gray overlay + lock icon

---

### Pause Menu
- Modal width: 360
- Vertical button stack
- Resume / Restart / Home

---

## 5. Auto Layout Rules
- All stacks use Auto Layout
- Buttons hug contents
- Cards fixed size
- Grids scale proportionally

---

## 6. Prototype Interaction Notes
- Card flip: Smart Animate
- Wrong match: shake ±8px
- Correct match: glow + scale 1.05
- Idle animations loop every 4–6s

---

## Deliverables Checklist
- Component library
- Color & text styles
- Screen frames
- Prototype links
- Interaction annotations

---

End of document.
