# Ardena Backend API — Auth & Cars

Reference for the booking website. Every path below is relative to the base URL and
already includes the global prefix:

```
Base URL:  https://api.ardena.xyz
Prefix:    /api/v1
```

Authenticated endpoints take a bearer header:

```
Authorization: Bearer <access_token>
```

Errors come back as FastAPI's standard shape — `{ "detail": "message" }` (or a list of
field errors on `422` validation failures). Treat any `401` as "token expired →
refresh, then retry once".

---

## 1. Auth APIs

### Register

```
POST /api/v1/client/auth/register
```

Request:

```json
{
  "full_name": "Jane Doe",
  "email": "jane@example.com",
  "password": "min 8 chars",
  "password_confirmation": "must match password"
}
```

Returns `201`:

```json
{ "id": 42, "full_name": "Jane Doe", "email": "jane@example.com", "created_at": "..." }
```

Registering does **not** log you in — call login next.

### Login

```
POST /api/v1/client/auth/login        (rate-limited: 10/minute)
```

Request:

```json
{ "email": "jane@example.com", "password": "..." }
```

Returns:

```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 3600,
  "client": { ...ClientProfile, see GET /client/me... }
}
```

`expires_in` is the access-token lifetime in seconds. Store both tokens; use
`access_token` on every request and `refresh_token` only against the refresh endpoint.

### Refresh

```
POST /api/v1/client/auth/refresh
```

Request: `{ "refresh_token": "eyJ..." }`

Returns:

```json
{ "access_token": "...", "refresh_token": "...", "token_type": "bearer", "expires_in": 3600 }
```

**Refresh tokens rotate** — the old one is invalidated on use. Always overwrite the
stored pair with the new one, and never fire two refresh calls in parallel (the second
will 401 because the first already consumed the token).

### Logout

```
POST /api/v1/client/auth/logout        (auth required)
```

Invalidates the refresh token server-side. Discard both tokens locally.

### Google sign-in (web)

```
POST /api/v1/client/auth/google
```

Request: `{ "id_token": "<credential from Google>" }`

Returns the **same shape as login** (`access_token`, `refresh_token`, `expires_in`,
`client`), so everything after sign-in is shared code. First sign-in creates the
account; an existing account with the same email gets Google linked to it.

**One-time setup (Google Cloud Console):** the backend already accepts the web OAuth
client the mobile apps use — no backend changes. But that client's **Authorized
JavaScript origins** must include this website's origins:

- your production domain (e.g. `https://booking.ardena.xyz`)
- `http://localhost:5173` for Vite dev

If the origin is missing, the Google button fails with *"The given origin is not
allowed for the given client ID"* — that error always means this console setting,
never your code.

**Integration** (Google Identity Services — no SDK install, one script tag):

```html
<script src="https://accounts.google.com/gsi/client" async></script>

<div id="googleBtn"></div>

<script>
  window.onload = () => {
    google.accounts.id.initialize({
      client_id: GOOGLE_WEB_CLIENT_ID,   // same ID the mobile apps use as webClientId
      callback: async ({ credential }) => {
        const res = await fetch(`${API_BASE}/api/v1/client/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_token: credential }),
        });
        if (!res.ok) { /* show (await res.json()).detail */ return; }
        const { access_token, refresh_token, client } = await res.json();
        // store tokens, set user, redirect — same path as email/password login
      },
    });
    google.accounts.id.renderButton(
      document.getElementById('googleBtn'),
      { theme: 'outline', size: 'large', text: 'continue_with', width: 320 },
    );
  };
</script>
```

Notes:

- The `credential` is a short-lived Google ID token — post it immediately, never store
  it. Your session lives in the returned `access_token`/`refresh_token` pair.
- No client secret is involved anywhere on the web — the backend verifies the token
  against Google's public keys.
- The consent popup shows the app name/logo from the OAuth consent screen config —
  shared with the mobile apps, so it should already be branded.

### Apple sign-in

```
POST /api/v1/client/auth/apple
```

Send the Apple **identity token** from Sign in with Apple JS. Same return shape as
login.

### Password reset (three steps)

```
POST /api/v1/client/auth/forgot-password    { "email": "..." }          → sends a 6-digit OTP
POST /api/v1/client/auth/verify-reset-otp   { "email", "otp" }          → returns a short-lived reset token
POST /api/v1/client/auth/reset-password     { reset token, new password }
```

OTPs are 6 digits, expire in 5 minutes, max 5 attempts, and requests are limited to
3 per 15 minutes per account.

### Current profile

```
GET /api/v1/client/me        (auth required)
```

Returns the client profile — the same object embedded in the login response:

```json
{
  "id": 42,
  "full_name": "Jane Doe",
  "email": "jane@example.com",
  "bio": null,
  "fun_fact": null,
  "mobile_number": "+2547...",       // may be null
  "id_number": "...",                // may be null
  "date_of_birth": "1995-04-01",     // may be null
  "gender": "...",                   // may be null
  "avatar_url": "https://...",
  "id_document_url": null,
  "license_document_url": null,
  "terms_accepted_at": "...",
  "email_notifications_enabled": true,
  "sms_notifications_enabled": true,
  "in_app_notifications_enabled": true,
  "created_at": "...",
  "updated_at": "..."
}
```

### Update profile / password

```
PUT /api/v1/client/profile             (auth) — partial update: bio, fun_fact, mobile_number, avatar_url, …
PUT /api/v1/client/change-password     (auth) — { current_password, new_password }
```

Both return the updated profile / a confirmation message.

---

## 2. Car APIs — public (no token needed)

### List / search cars

```
GET /api/v1/cars
```

Query parameters (all optional):

| Param | Type | Notes |
| --- | --- | --- |
| `skip` / `limit` | int | Pagination. `limit` 1–100, default 20. |
| `location` | str | Filter by location name. |
| `city` | str | Host operating city. |
| `min_price` / `max_price` | float | Daily rate bounds (KES). |
| `body_type` | str | e.g. `sedan`, `suv`. |
| `fuel_type` | str | |
| `transmission` | str | |
| `min_seats` | int | |
| `driver_option` | str | `self_drive` \| `chauffeur` \| `both` |
| `start_date` / `end_date` | ISO datetime | Only return cars available for this window. |

Returns:

```json
{ "cars": [ ...CarListing... ], "total": 132, "skip": 0, "limit": 20 }
```

Each `CarListing` (also the shape of the car-details endpoint):

```json
{
  "id": 7,
  "host_id": 3,
  "name": "Civic", "model": "2020", "body_type": "sedan", "year": 2020,
  "description": "...",
  "seats": 5, "fuel_type": "petrol", "transmission": "automatic",
  "color": "...", "mileage": 45000, "features": ["..."],
  "daily_rate": 5000.0, "weekly_rate": null, "monthly_rate": null,
  "min_rental_days": 1, "max_rental_days": null, "min_age_requirement": 21,
  "rules": "...",
  "deposit_required": true, "deposit_amount": 10000.0,   // added to total at checkout, refunded after trip
  "location_name": "Westlands", "latitude": -1.26, "longitude": 36.8,
  "host_city": "Nairobi",
  "cover_image": "https://...",
  "car_images": ["https://...", "..."],                   // carousel
  "car_video": null,
  "image_urls": ["..."], "video_url": null,               // legacy — prefer the fields above
  "drive_setting": "self_only",
  "allowed_drive_types": ["self"],                        // ["self"] | ["self","withDriver"] | ["withDriver"]
  "host_name": "...", "host_avatar_url": "...", "host_created_at": "...",
  "rating": 4.7,                                          // null when unrated
  "is_renters_favourite": false
}
```

### Car details

```
GET /api/v1/cars/{car_id}
```

Returns a single `CarListing` (shape above). Cached ~2 minutes server-side.

### Availability (drives the date picker)

```
GET /api/v1/cars/{car_id}/availability?start_date=...&end_date=...
```

Returns:

```json
{
  "car_id": 7,
  "available": true,
  "booked_dates":     [ { "start_date": "...", "end_date": "...", "status": "confirmed" } ],
  "blocked_dates":    [ { "start_date": "...", "end_date": "...", "reason": "..." } ],
  "unavailable_dates": [ ...booked + blocked combined, for calendar rendering... ],
  "next_available_date": "2026-07-20",
  "message": "..."
}
```

Use `unavailable_dates` to grey out calendar days; use `available` for the selected
window's verdict.

### Ratings / reviews

```
GET /api/v1/cars/{car_id}/ratings
```

Returns:

```json
{
  "ratings": [
    {
      "id": 1, "car_id": 7, "client_id": 42, "booking_id": 12,
      "rating": 5, "review": "Great car",
      "client_name": "Jane D.", "car_name": "Civic",
      "created_at": "...", "updated_at": null
    }
  ],
  "total": 12,
  "average_rating": 4.7
}
```

### Explore feed (optional auth)

```
GET /api/v1/client/cars/explore
```

Lightweight cards for a browse/landing page. Works **without** a token; send one and
`is_wishlisted` is filled in per car. Query params: `skip`/`page`, `limit`, `search`,
`location`, plus the same filters as `GET /cars`.

Returns:

```json
{
  "cars": [
    {
      "id": 7,
      "cover_image": "https://...",
      "car_name": "Civic",
      "price_per_day": 5000.0,
      "rating": 4.7,
      "is_renters_favourite": true,
      "is_wishlisted": false,
      "location_name": "Westlands"
    }
  ],
  "total": 132, "page": 1, "limit": 20, "total_pages": 7
}
```

---

## 3. Car APIs — auth required

### Wishlist

```
POST   /api/v1/client/wishlist/{car_id}     → add; returns confirmation
DELETE /api/v1/client/wishlist/{car_id}     → remove
GET    /api/v1/client/wishlist              → list of wishlisted cars (explore-card shape)
GET    /api/v1/client/wishlist/summary      → counts/ids only, for painting hearts on load
```

### Car details, personalized

```
GET /api/v1/client/cars/{car_id}
```

Same `CarListing` shape as the public detail endpoint. Exists for authed app flows;
the website can use the public `GET /cars/{car_id}` everywhere.

---

## Notes for the website

- **Token handling:** keep `access_token` in memory, refresh on `401`, and remember
  refresh tokens rotate (one concurrent refresh only).
- **Public pages** (landing, search, car details, availability, reviews) need no
  account — auth is only required at wishlist and booking/checkout time.
- Booking creation, payments, and profile documents have their own endpoints
  (`POST /client/bookings` etc.) — documented in the backend repo's README; ask for
  the booking/payment section when you get to checkout.
