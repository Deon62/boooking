# Ardena Bookings — UI/UX Polish Checklist

Remaining work only — everything already shipped has been removed. Ordered by
priority: **P0** = consistency foundations, **P1** = UX quality, **P2** = premium
polish, **P3** = nice-to-have.

Legend: `- [ ]` todo · 🔴 P0 · 🟠 P1 · 🟡 P2 · ⚪ P3

---

## 1. Global design system & token cleanup 🔴🟠

- [ ] 🔴 Retire the legacy `--neo-*` token names entirely (currently kept as flat
      aliases so ~100 call sites didn't need renaming).
- [ ] 🔴 **Elevation tokens everywhere**: `--shadow-sm/-md/-lg` and the hairline
      border exist as tokens, but ~27 inline `rgba(22,24,29,…)` borders/shadows
      are still copy-pasted across `index.css` — replace them with the tokens.
- [ ] 🟠 Sweep the ~30 `--neo-in` **active/selected** states and swap the
      inset-hairline for a `--primary-tint` fill where it reads better
      (done for `.nav-link.active`; consider `.msg-item.active`, side-nav tabs,
      `.report-reason.selected`).
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
