# Green Coins – Smart Waste Segregation Reward Platform

Households photograph their segregated waste. A vision model checks the photo against the category the citizen chose, approved photos earn **Green Coins**, and participating local shops accept coins under fixed program rules. Anything the AI is unsure about goes to a human reviewer.

**Stack:** Next.js 14 (App Router, React) · PostgreSQL (Neon) · Prisma · Claude vision API · JWT cookie sessions with OTP login.

## What it does
| Role | Can do |
|---|---|
| Citizen | Register with mobile OTP · pick a category and upload a photo · see instant verdict · coin wallet and history · get a one-time redemption code · community impact stats |
| Partner shop | Apply with licence details · set its own offer, coin price and daily limit · pause anytime · verify citizen codes |
| Collection worker | See pickups assigned to them · enter the citizen's handover code and the weighed kg to mark a pickup collected |
| Municipal officer | Locality analytics (participation, delays, verified kg collected) · assign pickups to workers · verify or cancel pickups |
| Reviewer / admin | Review queue for photos the AI was unsure about (photo deleted on decision) · approve or reject shop applications · platform stats |

## How a photo is verified
1. Browser shrinks the photo to 1024px (faster upload, strips GPS/EXIF).
2. Server checks real file type (magic bytes), size, SHA-256 duplicate fingerprint, and the daily/monthly limits.
3. The vision model **only reports what it sees** (category, quality, screenshot/face/stock flags, confidence).
4. `lib/decide.js` – plain, unit-tested rules – makes the decision: **approve** (confident match), **reject with a reason** (confident mismatch / screenshot / face / blurry), otherwise **human review**. If the AI fails, the photo goes to review, never auto-approve.
5. Approval writes a ledger row and updates the balance in one DB transaction.

## Doorstep pickup workflow
`Requested -> Assigned -> Collected -> Verified` (or Cancelled before collection).
1. **Citizen** requests a pickup (category, approx. kg, a day in the next 7) and gets a one-time **handover code**.
2. **Municipal officer** assigns it to a collection worker.
3. **Worker** arrives, weighs the waste, and enters the citizen's code and the weight. The code proves the worker was really at the door; the weight is the worker's, not the citizen's estimate.
4. **Citizen confirms** (or an officer verifies) and coins are credited exactly once, in one DB transaction with the ledger row.

Rules (`PICKUP` in `lib/config.js`): coins per verified kg (wet 1, dry 2, recyclable 4, hazardous 5, e-waste 6), max 30 per pickup, 0.2-25 kg, max 2 open requests, one request per category per 7 days. Status changes use conditional updates so a request can never skip a step or pay twice, and request creation runs in a serializable transaction so the open-request limit cannot be bypassed by simultaneous requests.

## Municipal analytics (`/municipal`)
Per locality over the last 7/30/90 days: registered households, **participation** (households with an approved photo or collected pickup), approved photos, **verified kg collected** by category, **overdue pickups** (still waiting after the chosen day ended), and average days from request to collection. Localities below 25% participation (with at least 3 households) are flagged. Only worker-weighed, verified kilograms are counted as diverted; nothing is estimated, and no carbon-saving claim is made. Localities are matched ignoring case and extra spaces, since the locality is free text at registration.

## Program rules (all in `lib/config.js`)
Wet 5 · Dry 5 · Recyclable 10 · Hazardous 15 · E-waste 20 coins. Max 3 approved photos/day, 1 per category per day, 20 coins/day, 200/month. Redemption codes work once and expire in 15 minutes (unused coins are refunded). One redemption at a time, shops cannot redeem at their own shop, shops have daily limits. Coins are loyalty points with no cash value.

## Privacy and safety by design
- Approved and rejected photos are **never stored**; only a SHA-256 fingerprint is kept.
- A photo waiting for review is stored in the DB and **wiped when the reviewer decides**.
- Mobile numbers are used only for sign-in; OTPs are HMAC-hashed, rate-limited, expire in 5 minutes.
- Append-only coin ledger; balance can never go negative (atomic conditional update).
- Text inside a photo is treated as untrusted; the AI can't approve anything by itself.

## Run it
```bash
npm install
cp .env.example .env.local        # fill DATABASE_URL, DIRECT_URL, JWT_SECRET, OTP_SECRET
cp .env.local .env                # Prisma CLI reads .env (keep both git-ignored)
npx prisma migrate dev --name init
npm run db:seed                   # optional: 3 demo partner shops
npm run dev                       # http://localhost:3000
npm test                          # unit tests for the verification and limit rules
```
- **AI:** set `ANTHROPIC_API_KEY` (model via `AI_MODEL`, default `claude-haiku-5-5`). With no key the app runs in clearly labelled **demo mode** with fake verdicts.
- **Admin:** put your phone in `ADMIN_PHONES=+91XXXXXXXXXX`, then sign in; a "Review panel" link appears.
- **Roles:** `MUNICIPAL_PHONES` and `WORKER_PHONES` work like `ADMIN_PHONES` (comma-separated, role applied at sign-in; roles are never removed automatically). `npm run db:seed-demo` fills sample localities and pickups in every state.
- **SMS:** `SMS_PROVIDER=console` prints the OTP in the terminal; `msg91` / `twilio` for real SMS.

## Pages and API
`/` landing · `/how-it-works` · `/program-rules` · `/partner-shops` · `/register` · `/login` · `/dashboard` · `/shop` · `/admin` · `/municipal` · `/worker`

`POST /api/submissions` · `GET /api/submissions` · `GET /api/wallet` · `GET /api/shops` · `GET|POST /api/redemptions` · `POST /api/shop/apply` · `GET|PATCH /api/shop/me` · `POST /api/shop/verify` · `GET /api/admin/review` · `POST /api/admin/review/[id]` · `GET /api/admin/shops` · `POST /api/admin/shops/[id]` · `GET /api/admin/stats` · `GET /api/impact` · `GET|POST /api/pickups` · `POST /api/pickups/[id]` (cancel, confirm) · `GET /api/worker/pickups` · `POST /api/worker/pickups/[id]` · `GET /api/municipal/pickups` · `POST /api/municipal/pickups/[id]` (assign, verify, cancel) · `GET /api/municipal/workers` · `GET /api/municipal/analytics`

## Not built yet / before a real launch
Pickup notifications (SMS/push) · worker location or route planning · 
Coin expiry after 6 months · Redis-backed rate limiting for multi-instance hosting · production SMS template (DLT in India) · accuracy testing of the AI on real local waste photos · a legal review of the coin rules · decision on who funds shop discounts.
