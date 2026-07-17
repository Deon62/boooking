---
name: verify
description: Build, run, and drive the Ardena bookings web app to verify changes
---

- Build: `npm run build` (Vite). Dev server: `npm run dev` → http://localhost:5173. Hash routing — deep links look like `http://localhost:5173/#/cars/c1`, `/#/login`.
- Drive the UI with playwright-core through Edge (no browser download needed): `npm i playwright-core` in the scratchpad, then `chromium.launch({ channel: 'msedge', headless: true })`.
- Use `waitUntil: 'domcontentloaded'` + explicit `waitForSelector`, never `networkidle` — car photos are full-size Supabase originals and load for many seconds, so networkidle times out. Wait for `.car-card` on home, `.rating-line` on details.
- Stopping the `npm run dev` background task can leave the Vite child node process holding the port; the next dev server silently moves to 5174+. Check the task output for the actual port, and kill leftover node listeners when done.
- Real backend: `https://api.ardena.xyz/api/v1` (contract in `API.md`). CORS allows localhost, so auth flows can be exercised end-to-end from the dev server.
- Safe live probes: login with wrong credentials (401 `{"detail":"Incorrect email or password"}`), forgot-password step 1 (200 even for unknown emails — doesn't leak account existence). Do NOT register accounts or complete logins against production during verification.
- Google sign-in: GIS renders an iframe into `.gsi-slot`. On an origin not authorized for the client ID it still renders but logs `[GSI_LOGGER]: The given origin is not allowed for the given client ID` and clicking fails — that's a Google Cloud Console config issue, not a code bug.
