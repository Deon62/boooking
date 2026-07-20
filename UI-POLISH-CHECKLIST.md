# Ardena Bookings — UI/UX Polish Checklist

A working checklist to bring the whole site into one visual language and lift it
to a premium, professional, brand-led feel. Tick items as they land. Ordered by
priority: **P0** = consistency foundations (do first), **P1** = UX quality,
**P2** = premium polish, **P3** = nice-to-have.

Legend: `- [ ]` todo · `- [x]` done · 🔴 P0 · 🟠 P1 · 🟡 P2 · ⚪ P3

---

## 0. The core problem: two design languages coexist 🔴 — ✅ DONE

~~The site is mid-migration between neomorphic soft-UI and flat premium.~~
**Resolved.** The whole site now uses one flat-premium language, flipped in one
pass by remapping the shared design tokens (see the documented `:root` block in
`index.css`): white surfaces, hairline borders, sharp corners, and a soft drop
shadow reserved for floating elements (modals, dropdowns, sticky widgets).

- [x] 🔴 **Decided: flat premium** — `--bg #f4f5f7`, `--surface #fff`, hairline
      `--card-border`, `--shadow-sm/md/lg` for elevation, sharp corners
      (`--r-sm/md/lg: 0`), pills stay round. Documented at the top of `index.css`.
- [x] 🔴 Converted **all neomorphic surfaces** at once by remapping the legacy
      `--neo-*` tokens to the flat language (raised → hairline border via a
      0-spread box-shadow, so no layout shift; pressed → inset hairline). Verified
      on Home, Login, Car Details, Messages, and Account.
- [x] 🔴 Replaced **dashed input borders** with a solid hairline (`--input-border`),
      primary border on focus (`.control`, `.msg-input .control`, `.spec-item`,
      `.report-reason`, `.dashed-card`).
- [x] 🔴 **Radius scale settled: sharp** (`--r-*: 0` for containers/inputs, pills
      round) — matches the already-sharp Trips / Trip Details / Filter / booking widget.
- [ ] 🔴 Retire the legacy `--neo-*` token names entirely (currently kept as flat
      aliases so ~100 call sites didn't need renaming; rename in a later cleanup pass).
- [ ] 🟠 Follow-up polish: sweep the ~30 `--neo-in` **active/selected** states and
      swap the inset-hairline for a `--primary-tint` fill where it reads better
      (done for `.nav-link.active`; consider `.msg-item.active`, side-nav tabs,
      `.report-reason.selected`).

---

## 1. Global design system 🔴🟠

- [ ] 🔴 **Elevation tokens**: define `--shadow-sm/-md/-lg` (real drop shadows) and
      `--border-hairline` and use them everywhere instead of ad-hoc `box-shadow`
      and inline `rgba(22,24,29,0.08)` borders (they're copy-pasted in dozens of rules).
- [ ] 🟠 **Type scale**: formalize a scale (e.g. 12 / 13.5 / 15 / 17 / 20 / 26 / 34)
      as tokens. Font sizes are currently one-off numbers (14.5px, 16.5px, 13.5px…)
      scattered across the file.
- [ ] 🟠 **Spacing scale**: adopt a 4px-based scale (4/8/12/16/24/32/48) and replace
      the many one-off paddings/margins and inline `style={{ marginTop: … }}`.
- [ ] 🟠 **Color tokens**: add semantic tokens for surfaces, borders, and text on
      surfaces (`--card`, `--card-border`, `--text-on-card`) rather than literal
      `#fff` / `#2b2d33` / `#55575e` repeated inline.
- [ ] 🟡 **Consider a refined brand accent** beyond `#007ffa` — a deeper or more
      characterful primary + one warm secondary reads more "designed" than stock blue.
- [ ] ⚪ **Dark mode** — tokens are light-only today. Optional, but a theme-aware
      palette is a strong premium signal (and the app already implies theming).

---

## 2. Interaction & motion 🟠🟡

- [x] 🟠 **Focus-visible rings** — added a global `:focus-visible` outline (primary,
      2px offset) for keyboard users; mouse/touch focus stays clean (tap-highlight
      was already removed).
- [x] 🟠 **Unified button press/hover states** — one shared transition + a single
      press-scale (`scale(0.95–0.97)`) across `.btn-primary`, `.neo-btn`, `.flat-btn`,
      `.icon-btn`, `.pill-action`, `.filter-chip`, `.search-icon-btn`; consistent
      disabled; reduced-motion aware. Also removed the leftover **blue glow** shadows
      on primary buttons, the search/filter icon, and the payments info panel.
- [x] 🟡 **Micro-interactions** — button press-scale (above), a springy **heart "pop"**
      on the wishlist button, and 120–260ms transitions as the rule. (Card hover
      lifts were already present on the clickable cards.)
- [x] 🟡 **Page/route transitions** — a gentle opacity fade as each `.page` mounts
      (opacity only, so it can't re-anchor `position:fixed` overlays); reduced-motion
      aware.
- [x] 🟡 **Modal/overlay polish** — added a `useScrollLock` hook and applied it to the
      filter modal, the photo lightbox, and the payment overlay (body no longer
      scrolls behind them); they already share the same fade-in.

---

## 3. Feedback & state (UX quality) 🟠

- [x] 🟠 **Toast/snackbar system** — built (`src/toast.jsx`, `ToastProvider` +
      `useToast`). Dark snackbar, auto-dismiss, click-to-dismiss, reduced-motion aware.
      Wired to wishlist like/unlike + share; **still to do**: route the ~10 inline
      `var(--error)` messages and other successes through it.
- [x] 🟠 **404 / not-found route** — added `<Route path="*">` → branded `NotFound`
      with an animated "404 → face" SVG (theme-coloured strokes, static "404"
      fallback under `prefers-reduced-motion`).
- [x] 🟠 **Consistent loading skeletons** — every data page now has a layout-mirroring
      skeleton: Messages, Home shelves, Trips, car lists, CarDetails, **Booking**,
      **TripDetails**, and **Notifications** (rebuilt to match its row layout).
      Payments already had one; Account renders instantly from the cached profile.
- [x] 🟠 **Consistent empty states** — one reusable `<EmptyState>` (in
      `components.jsx`) with two variants: `animation` (the `empty.webm` hero, used on
      Home) and `compact` (icon in a tinted circle, used for panels/inline). Rolled
      out to Home, Notifications, Payments, Messages (empty thread), and Trips.
      Wishlist keeps its bespoke collage placeholder. Follow-up: the old
      `.nots-empty` / `.pm-empty` CSS is now dead and can be removed in a cleanup pass.
- [x] 🟠 **Inline form validation** — Login + Signup now validate per-field
      (`src/validate.js`), with a red field border and message under each input,
      cleared as you type (`noValidate` so our messages own the UX). Forgot keeps its
      step-based validation. Follow-up: extend the pattern to the booking form.
- [x] 🟡 **Optimistic UI** — wishlist (was), notifications read/unread (was), and now
      **payment-method remove/set-default** (instant + rollback), **trip delete**
      (instant + rollback), all with toast confirmation; **trip cancel** shows a
      success/error toast.

---

## 4. Component consistency 🟠

> Note: **Phase 0 already unified the _visuals_** of these (all cards = white +
> hairline via `--card-ring`; all inputs = solid hairline `.control` with primary
> focus; chips = flat bordered). What remained here was DRY code-hygiene — a
> literal `<Card>`/`<Input>`/`<Chip>` React extraction — which is high churn across
> ~15 files for **no visual change** and real regression risk, so it's intentionally
> deferred. The behavioural consolidation (buttons, chips) landed in §2.

- [~] 🟠 **One card component** — visually unified in Phase 0 (identical white +
      hairline treatment). Literal `<Card>` extraction deferred (low value / high churn).
- [~] 🟠 **One input component** — all inputs share `.control` (solid hairline,
      primary focus, `.err` state) since Phase 0 + the validation work. Literal
      `<Input>` extraction deferred.
- [x] 🟠 **Chip consistency** — selectable chips share one flat-bordered look with a
      consistent selected state (booking `.choice-btn` + `.report-reason` now share
      dimensions/transition). Filter-modal chips keep their distinct dark-fill
      "selected" on purpose (it reads as a filter toggle, not a form choice).
      Status pills stay separate — they're semantic colour, not a control.
- [ ] 🟡 **Icon audit** — sizes range 11–22px inconsistently within the same rows.
      Standardize to 2–3 sizes and consistent stroke weight.
- [ ] 🟡 **Avatar consistency** — host avatars vary (68px on details, 96px in
      messages, circles elsewhere). Define avatar sizes as tokens.

---

## 5. Page-by-page UX 🟠🟡

### Home
- [ ] 🟡 Add a **sort control** (price, newest, seats) alongside the filter modal.
- [ ] 🟡 Show **active filters as removable chips** under the search bar (currently
      only a count badge on the search icon).
- [ ] 🟡 Make the **When/Where search actually feed availability** (dates already in
      state; wire `start_date`/`end_date` into the query for true availability).
- [ ] ⚪ "Recently viewed" rail on Home for return visitors (data already tracked).

### Car details
- [x] 🟠 Replaced bare "Loading car…" with a **full skeleton** (gallery + title + specs).
- [x] 🟡 **Photo gallery lightbox** — clicking any gallery photo (or the "View all N
      photos" pill) opens a full-screen carousel with keyboard + on-screen nav, a
      counter, and Esc/backdrop close.
- [x] 🟡 **Map for pickup location** — real OpenStreetMap embed (no API key) on Car
      Details. Prefers the car's `latitude`/`longitude`; those are null upstream
      today, so it centres on the city with an "approximate area" note and an Open-in-
      Maps link. The b2b `MAPBOX_TOKEN` is b2b-auth-only, so no client token exists
      yet — swap the OSM iframe for Mapbox GL once a public token endpoint lands.
- [ ] 🟡 **Sticky price/reserve bar on mobile** so "Reserve" is always reachable.

### Booking / Payment
- [x] 🟠 Skeleton (done) + **step indicator** — `BookingSteps` (Trip details →
      Payment → Confirmed) shown on Booking (1), Payment (2), Confirmation (3).
- [x] 🟡 **Price breakdown transparency** — "Total due now", a subtle pop animation
      when the total changes, and an inline "includes a refundable deposit, refunded
      after the trip" note (Booking + Payment).
- [x] Payment waiting animation (`payment.webm`) in the processing overlay.

### Trips / Trip details
- [x] Whole past-trip row tappable, "View" button removed.
- [x] Host card + "About this host" paragraph.
- [ ] 🟡 **Trip status timeline** (booked → confirmed → active → completed) as a
      visual stepper on the detail page.
- [ ] 🟡 Skeleton for the trip-details page.

### Messages
- [x] Loading skeleton mirroring the 3-panel layout.
- [ ] 🟡 **Empty conversation illustration** + first-message prompt.
- [ ] 🟡 Unread badge in the navbar; typing/sent states on bubbles.

### Auth (Login / Signup / Forgot)
- [ ] 🟠 Move off neomorphic `form-card` to the target card style.
- [ ] 🟡 Password strength meter on signup; show/hide already present — keep.
- [ ] 🟡 Friendlier error copy (map API errors to human sentences).

### Account / Profile / Payments / Notifications
- [ ] 🟠 Skeletons + empty states (see §3).
- [ ] 🟡 Payment methods: real card-brand art + "default" badge; add-card sheet.
- [ ] 🟡 Notifications: group by date, mark-all-read, filter tabs polish.

---

## 6. Premium / brand features to add 🟡⚪

- [ ] 🟡 **Trust layer** — verified-host badges, insurance-included badge, secure-
      payment lockup, ratings/review surfacing (copy already hints at these).
- [ ] 🟡 **Consistent illustration/animation set** — you now have `empty.webm` and
      `payment.webm`; commission a small matched set (empty, success, error,
      no-results, no-messages) in one style for a cohesive brand feel.
- [ ] 🟡 **Success confirmation moment** — the booking confirmation could use a
      celebratory but tasteful animation + shareable trip summary.
- [x] 🟡 **Favicon/meta polish** — favicon now uses the compact logomark SVG; added
      `<meta name="description">`, `theme-color`, and Open Graph/Twitter tags so
      shared links look designed.
- [ ] 🟡 **Referral / share hooks** — "share this car", "invite a friend" with clean
      share cards.
- [ ] ⚪ **Loyalty / saved searches** — save a filter set, get notified when matches
      appear.
- [ ] ⚪ **Subtle sound/haptic** on key actions (mobile) — optional, very premium.

---

## 7. Accessibility & technical polish 🟠🟡

- [ ] 🟠 **Keyboard navigation** — focus-visible rings (§2), logical tab order,
      Escape closes modals (filter already does; apply everywhere), focus trap in
      modals, return focus to trigger on close.
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

## 8. Brand & voice ⚪

- [ ] 🟡 **Logo usage rules** — navbar uses the mark, footer the wordmark; document
      when to use which, min sizes, clear space.
- [ ] 🟡 **Tone of voice** — the marketing shelf copy ("More car, less cash",
      "Room for the whole crew") is strong; extend that voice to empty states,
      errors, buttons, and confirmations for a consistent brand personality.
- [ ] ⚪ **Iconography set** — ensure all icons come from one family/stroke (the
      Lucide-style set is good; keep new icons on-style).

---

## Quick wins (high impact, low effort) ⭐ — ✅ ALL DONE

- [x] 🔴 Migrate auth `form-card` + inputs to the flat style (done in Phase 0).
- [x] 🟠 Add the 404 route (`<Route path="*">` → branded `NotFound`).
- [x] 🟠 Add a global toast for success/error (`src/toast.jsx`, `useToast`; wired to
      wishlist like/unlike and the share action — extend to more spots over time).
- [x] 🟠 Skeleton for Car Details (gallery + title + specs; replaces "Loading car…").
- [x] 🟠 Focus-visible rings site-wide (`:focus-visible` outline, mouse users unaffected).
- [x] 🟡 Favicon → logomark SVG + meta description, `theme-color`, and Open Graph tags.
