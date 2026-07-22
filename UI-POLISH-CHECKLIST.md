# Ardena Bookings — UI/UX Polish Checklist

Remaining work only — everything already shipped has been removed. Ordered by
priority: **P0** = consistency foundations, **P1** = UX quality, **P2** = premium
polish, **P3** = nice-to-have.

Legend: `- [ ]` todo · 🔴 P0 · 🟠 P1 · 🟡 P2 · ⚪ P3

---

## 1. Global design system & token cleanup 🔴🟠 — ✅ DONE

The whole site now reads from one token sheet at the top of `index.css`:
semantic color tokens (surfaces, wells, dividers, ink-inversion chips,
on-primary text), a formal type scale (`--fs-2xs…--fs-3xl`), a 4px spacing
scale (`--sp-1…--sp-7`), an amber secondary accent (`--accent`, used for
rating stars), and a **dark theme** (graphite + sky-mint, mirroring the b2b
dashboard) applied via `data-theme="dark"` on `<html>` — toggle in the header,
per-device via localStorage `ardena-theme` (`src/theme.js`). Legacy `.neo-*`
classes are gone (`.neo-btn` → `.btn-secondary`; unused primitives deleted).

Scale adoption is finished in both `index.css` and JSX inline styles, and the
dark theme has been swept across every page and overlay (home, car details,
booking, payments, profile, login, trips, notifications, wishlist, messages,
404, filter modal, date-range calendar, city dropdown). The one regression
found — the Payments "How payments work" panel becoming a full mint slab —
is fixed via `--brand-panel-*` tokens: an accent fill in light, a plain card
in dark.

Deliberate exceptions, do not "fix": the QR code, Google button, photo-overlay
badges, and switch knob stay hard-white; Mastercard/Visa marks keep brand
colours.

---

## 2. Feedback & state follow-ups 🟠

- [ ] 🟠 **Toast rollout** — the toast system exists (`src/toast.jsx`); route the
      ~10 remaining inline `var(--error)` messages and other successes through it.
- [ ] 🟠 **Extend inline validation to the booking form** (Login/Signup already
      validate per-field via `src/validate.js`).
- [ ] 🟡 Remove the now-dead `.nots-empty` / `.pm-empty` CSS (replaced by the
      shared `<EmptyState>`).

---

## 3. Component consistency 🟡

- [ ] 🟡 **Icon audit** — sizes range 11–22px inconsistently within the same rows.
      Standardize to 2–3 sizes and consistent stroke weight.
- [ ] 🟡 **Avatar consistency** — host avatars vary (68px on details, 96px in
      messages, circles elsewhere). Define avatar sizes as tokens.

---

## 4. Page-by-page UX 🟠🟡

### Home
- [ ] 🟡 Add a **sort control** (price, newest, seats) alongside the filter modal.
- [ ] 🟡 Make the **When/Where search actually feed availability** (dates already in
      state; wire `start_date`/`end_date` into the query for true availability).
- [ ] ⚪ "Recently viewed" rail on Home for return visitors (data already tracked).

### Car details
- [ ] 🟡 **Sticky price/reserve bar on mobile** so "Reserve" is always reachable.
- [ ] 🟡 Map upgrade: swap the OSM iframe for Mapbox GL once a public token
      endpoint lands (the b2b `MAPBOX_TOKEN` is b2b-auth-only today).

### Trips / Trip details
- [ ] 🟡 **Trip status timeline** (booked → confirmed → active → completed) as a
      visual stepper on the detail page.

### Messages
- [ ] 🟡 Unread badge in the navbar; typing/sent states on bubbles.

### Auth (Login / Signup / Forgot)
- [ ] 🟡 Password strength meter on signup (show/hide already present — keep).
- [ ] 🟡 Friendlier error copy (map API errors to human sentences).

### Payments / Notifications
- [ ] 🟡 Payment methods: real card-brand art + "default" badge; add-card sheet.
- [ ] 🟡 Notifications: group by date, mark-all-read, filter tabs polish.

---

## 5. Premium / brand features to add 🟡⚪

- [ ] 🟡 **Trust layer** — verified-host badges, insurance-included badge, secure-
      payment lockup, ratings/review surfacing (copy already hints at these).
- [ ] 🟡 **Consistent illustration/animation set** — `empty.webm` and `payment.webm`
      exist; commission a small matched set (empty, success, error, no-results,
      no-messages) in one style for a cohesive brand feel.
- [ ] 🟡 **Success confirmation moment** — the booking confirmation could use a
      celebratory but tasteful animation + shareable trip summary.
- [ ] 🟡 **Referral / share hooks** — "share this car", "invite a friend" with clean
      share cards.
- [ ] ⚪ **Loyalty / saved searches** — save a filter set, get notified when matches
      appear.
- [ ] ⚪ **Subtle sound/haptic** on key actions (mobile) — optional, very premium.

---

## 6. Accessibility & technical polish 🟠🟡

- [ ] 🟠 **Keyboard navigation** — focus-visible rings are done; still needed:
      logical tab order, Escape closes every modal (filter already does), focus
      trap in modals, return focus to trigger on close.
- [ ] 🟠 **Color contrast** — check `--hint` (#6a6a6a) and light grey text on the
      `#eef1f8` background against WCAG AA.
- [ ] 🟠 **Alt text & ARIA** — car images have alt; audit icon-only buttons for
      `aria-label` (mostly present), and `aria-live` for toasts/loading.
- [ ] 🟡 **Respect `prefers-reduced-motion`** globally (partially done for skeletons
      and the payment dots) — gate all new motion behind it.
- [ ] 🟡 **Responsive audit** — verify every page at 360 / 768 / 1024 / 1440; the
      filter modal, msg layout, and details layouts have breakpoints, others may not.
- [ ] 🟡 **Image performance** — Supabase originals are large; request/derive
      thumbnails for cards and use `loading="lazy"` (present) + explicit sizes to
      avoid layout shift.
- [ ] ⚪ **SEO/meta per route** (hash routing limits this, but titles can update).

---

## 7. Brand & voice ⚪

- [ ] 🟡 **Logo usage rules** — navbar uses the mark, footer the wordmark; document
      when to use which, min sizes, clear space.
- [ ] 🟡 **Tone of voice** — the marketing shelf copy ("More car, less cash",
      "Room for the whole crew") is strong; extend that voice to empty states,
      errors, buttons, and confirmations for a consistent brand personality.
- [ ] ⚪ **Iconography set** — ensure all icons come from one family/stroke (the
      Lucide-style set is good; keep new icons on-style).
