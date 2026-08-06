# WhatsApp Bot Manager — Admin Console

A no-code control centre for the WhatsApp AI bot, replacing the current 4-tab WhatsApp section with a full sub-console (Shopify Admin / Meta Business Suite style). Everything the bot says, shows, sells and delivers becomes editable from the dashboard and is read live by the bot — no redeploys.

This is a large build, so it ships in 4 phases. Each phase is usable on its own.

## Phase 1 — Foundation + Dashboard + Bot Content

New config tables the bot reads at runtime (nothing hardcoded):
- `whatsapp_bot_settings` — single config row: business profile (name, logo, description, address, phones, email, website, hours, support number), greeting / away / off-hours messages, AI personality, tone, default language, fallback message, upsell + cross-sell rules, notification toggles, theme + formatting prefs (currency, date format, timezone, emoji style).
- `whatsapp_menu_items` — drag-and-drop menu tree (label, icon, order, parent, visible, action type).
- `whatsapp_faqs` — question / answer knowledge base injected into the AI prompt.
- `whatsapp_bot_content` — welcome text, banner image, quick replies, suggested questions, festival/seasonal greetings.

Admin sections built in this phase:
- **Dashboard** — live stats (conversations, active/new/returning customers today, orders today, WhatsApp revenue, pending orders, abandoned carts, unread chats, top viewed/selling products) + 4 charts (daily chats, daily orders, monthly revenue, customer growth).
- **Business Profile** — full form, logo upload with crop to the existing product-images bucket, live bot-preview card using the uploaded logo.
- **Welcome Message** — edit welcome/greeting/banner/quick replies/suggested questions/seasonal greetings with instant save.
- **Menu Builder** — drag-and-drop add / rename / reorder / icon / hide / submenu.
- **AI Configuration** — personality, tone, language, recommendation/upsell/cross-sell rules, fallbacks, FAQ + knowledge base editor.
- **Notifications** — per-event on/off switches.

Bot side: `whatsapp-webhook` and `shop.ts` stop using hardcoded strings/menus and read these tables per message (short in-memory cache).

## Phase 2 — CRM, Conversations, Orders

- **Customer Management** — CRM table over `whatsapp_conversations` joined to orders/profiles: name, numbers, city, address, pincode, first contact, last active, last order, total orders, lifetime spend, favourite products, status, tags. Search by name / phone / product / city / order number.
- **Customer Profile drawer** — chat history, viewed products, wishlist, cart, orders, payments, addresses, tickets, staff-only notes (`whatsapp_customer_notes`).
- **Conversation Manager** — live inbox: reply from admin, assign, resolve, star, archive, search + filter (new state columns on `whatsapp_conversations`).
- **Order Management** — WhatsApp-source orders with edit / cancel / refund / status update, delivery partner + tracking fields, invoice print and PDF download.

## Phase 3 — Location, Delivery & Maps

- **Smart address flow in WhatsApp checkout** — saved-address picker first ("Deliver to Home / Office / Add new"), WhatsApp location-share for pin drop, plus a one-tap secure web link opening the existing map picker (autocomplete, current location, draggable pin, reverse geocode to house/street/area/landmark/city/state/pincode/lat/lng) which writes straight back into the chat cart. Addresses save to the shared `user_addresses` table so website, bot and admin stay in sync.
- **Addresses admin section** — per-customer saved addresses with labels, lat/lng, Google Maps link, default + last used, edit/delete/set-default, delivery distance.
- **Delivery Zones** — map-drawn polygons on top of the existing `delivery_zones`: min order value, charge, free-delivery threshold, ETA, enable/disable. Out-of-zone addresses get a polite bot refusal.
- **Delivery Map on order details** — store pin, customer pin, route, distance, ETA, charge, live status, plus Open in Google Maps / Call / WhatsApp / Copy address buttons.

## Phase 4 — Broadcast, Analytics, Roles, Audit

- **Broadcast Manager** — segment by all / VIP / new / returning / city / product purchased / abandoned cart / last purchase; send images, video, PDF, buttons, coupons, product cards; scheduled sends with per-recipient delivery log, respecting existing opt-outs.
- **Analytics** — conversations, conversion rate, revenue, top categories/products, AOV, retention, most-asked questions, peak chat hours.
- **Security / Roles** — extend `app_role` with `owner`, `sales`, `support`, `manager` plus a permissions matrix table; every admin section gated by permission.
- **Activity Log** — `admin_activity_log` recording who changed products, prices, AI settings, who replied or deleted messages, with timestamps.
- **Settings** — theme, primary/accent colour, button style, fonts, emoji style, date format, currency, timezone applied to both admin and bot output.

## Technical notes

- All new tables live in the public schema with GRANTs, RLS admin-only (`has_role`), and `updated_at` triggers. Customer-facing reads happen through edge functions using the service role.
- The bot reads config through a shared `config.ts` helper in `supabase/functions/whatsapp-webhook/` so changes apply on the next message with no redeploy.
- Map work reuses the existing Leaflet/OSM picker and Nominatim/OSRM helpers already in the project; no new paid map dependency unless you want Google Maps autocomplete specifically.
- Product sync needs no polling — the bot already queries `products` live; the manual "Sync now" button just clears the config/product cache.
- Broadcasts to numbers outside the 24-hour window require Meta-approved marketing templates; the UI will flag when a template is missing.

## Note on GitHub

Lovable's GitHub sync is automatic and two-way — code changes push to your repo as they are made. I cannot pause that. If you need this kept off your main branch, tell me and we can discuss branching before I start.
