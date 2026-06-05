# CrIAtiva Desk — Design System MASTER
# Source of Truth for all pages and components

---

## Brand Identity

**Project:** CrIAtiva Desk  
**Tagline:** "Do briefing ao post publicado, tudo em um só lugar."  
**Style:** Minimalism & Swiss Style (structure) + Soft UI Evolution (cards)  
**Mood:** Clean, premium, editorial, professional

---

## Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `wine` | `#6B2D3E` | Primary — dark page backgrounds, main CTAs |
| `wine-medium` | `#8B3A4E` | Hover states, gradient mid |
| `wine-light` | `#C4697A` | Accents, badges, highlights |
| `wine-subtle` | `#F5E8EB` | Tints on cream backgrounds |
| `cream` | `#FAF7F2` | Light page backgrounds |
| `cream-warm` | `#FFF9F0` | Cards on dark backgrounds |
| `gold` | `#C9A96E` | Premium details, special icons |
| `black` | `#0F0F0F` | Primary text |
| `black-soft` | `#1A1A1A` | Dark backgrounds where needed |
| `gray-text` | `#5C5C5C` | Secondary text on light bg |
| `gray-border` | `#E8E2DA` | Borders on light backgrounds |
| `gray-light` | `#F2EDE6` | Subtle fills |

### Status Colors
| Status | Hex | Token |
|--------|-----|-------|
| Ideia | `#94A3B8` | `status-idea` |
| Briefing | `#60A5FA` | `status-briefing` |
| Aguardando gravação | `#FBBF24` | `status-recording` |
| Vídeo recebido | `#F97316` | `status-received` |
| Em edição | `#A78BFA` | `status-editing` |
| Aguardando aprovação | `#3B82F6` | `status-approval` |
| Com ajustes | `#EF4444` | `status-changes` |
| Aprovado | `#10B981` | `status-approved` |
| Agendado | `#6B2D3E` | `status-scheduled` |
| Publicado | `#059669` | `status-published` |

### Social Network Colors
| Network | Hex |
|---------|-----|
| Instagram | `#E1306C` |
| Facebook | `#1877F2` |
| TikTok | `#010101` |
| YouTube | `#FF0000` |
| Google Business | `#4285F4` |
| Kwai | `#FF6602` |
| LinkedIn | `#0A66C2` |
| Pinterest | `#BD081C` |
| Threads | `#000000` |

---

## Page Groups (Visual Variation — REQUIRED)

| Group | Background | Text | Pages |
|-------|-----------|------|-------|
| **A** | `#6B2D3E` wine | White | Login, Register, Onboarding, CopyDesk, TrendDesk |
| **B** | `#FAF7F2` cream | `#0F0F0F` black | Dashboard, Projects, Calendar, Reports, Settings |
| **C** | `#FFFFFF` white + wine accents | `#0F0F0F` | Post Creator, Library, SearchDesk, DesignDesk |
| **D** | Neutral (alternating cards) | Mixed | Approvals, Scheduling, Videos, Inbox |
| **Public** | Varies per page | Mixed | Professional Portal (wine), Client Approval (cream) |

---

## Typography

| Role | Family | Weights | Usage |
|------|--------|---------|-------|
| Heading | Playfair Display | 400, 600, 700 | Page titles, section headers, brand moments |
| Body / UI | Inter | 300, 400, 500, 600 | All UI text, labels, captions, forms |

```html
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
```

**Rules:**
- Body text: minimum 16px, line-height 1.5–1.75
- Line length: 65–75 characters max
- Never use Playfair for small UI labels (<14px)
- Inter 500 for all button labels

---

## Spacing & Layout

| Token | Value | Usage |
|-------|-------|-------|
| Sidebar width | 240px | Fixed left sidebar |
| Topbar height | 64px | Fixed top bar |
| Content padding | 32px | Main content area |
| Card gap | 16–24px | Between cards |
| Section gap | 32–48px | Between page sections |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-card` | `0.75rem` (12px) | Cards, panels |
| `rounded-btn` | `0.5rem` (8px) | Buttons |
| `rounded-xl` | `1rem` (16px) | Modals, drawers |
| `rounded-full` | `9999px` | Badges, avatars, pills |

---

## Shadows

| Token | Value | Usage |
|-------|-------|-------|
| Card | `0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)` | Default card |
| Hover | `0 4px 16px rgba(107,45,62,0.15)` | Card on hover |
| Wine | `0 8px 32px rgba(107,45,62,0.25)` | Featured elements |
| Modal | `0 20px 60px rgba(0,0,0,0.2)` | Modals/drawers |

---

## Animation (Framer Motion)

```ts
// Page transitions
const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } }
}

// Dashboard card stagger
const containerVariants = {
  animate: { transition: { staggerChildren: 0.05 } }
}
const cardVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } }
}

// Drawer slide
const drawerVariants = {
  initial: { x: "100%" },
  animate: { x: 0, transition: { duration: 0.25, ease: "easeOut" } },
  exit: { x: "100%", transition: { duration: 0.2 } }
}

// Card hover
const cardHover = {
  whileHover: { scale: 1.01, boxShadow: "0 4px 16px rgba(107,45,62,0.15)" },
  transition: { duration: 0.15, ease: "easeOut" }
}
```

**Rules:**
- Duration: 150–300ms for all micro-interactions
- Use `transform` and `opacity` only (GPU-accelerated)
- Respect `prefers-reduced-motion`
- AnimatePresence on all route changes

---

## Component Patterns

### Buttons
```
Primary:   bg-wine text-white hover:bg-wine-medium rounded-btn px-4 py-2 font-medium transition-colors duration-150
Secondary: border border-gray-border text-black hover:bg-gray-light rounded-btn px-4 py-2
Ghost:     text-wine hover:bg-wine-subtle rounded-btn px-4 py-2
Danger:    bg-red-500 text-white hover:bg-red-600 rounded-btn px-4 py-2
```

### Cards (Grupo B pages)
```
bg-white rounded-card shadow-card p-6 hover:shadow-hover transition-shadow duration-200 cursor-pointer
```

### Cards (Grupo A pages — on wine bg)
```
bg-cream-warm rounded-card p-6 hover:shadow-wine transition-shadow duration-200
```

### Status Badges
```
inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
```

---

## Icons
- **Library:** Lucide React exclusively
- **Size:** 16px (small), 20px (default), 24px (large)
- **No emojis as icons**
- **Sidebar icons:** 20px, muted color, active = wine-light

---

## Sidebar
```
bg-black (#0F0F0F), width: 240px, fixed left
Logo: top, white text, Playfair Display
Nav items: text-gray-400 hover:text-white hover:bg-white/5, active: text-white bg-wine/20 border-l-2 border-wine-light
Section dividers: border-white/10
```

## Topbar
```
bg-cream (#FAF7F2), height: 64px, border-b border-gray-border
ProjectSwitcher: left side
Search: center (optional)
NotificationBell + Avatar: right side
```

---

## Anti-patterns to Avoid
- Heavy gradients or neon colors
- Emojis as icons
- Heavy box shadows on every element
- All pages with same background (MUST vary per group)
- Skeuomorphic effects
- Animations > 400ms
- Text smaller than 14px in UI elements
- Low contrast (minimum 4.5:1 for body text)
