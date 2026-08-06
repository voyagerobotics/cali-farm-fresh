# WhatsApp Bot Manager — Phase 2 & 3

Six connected features. They ship in four steps so each one is usable as soon as it lands.

## Step 1 — Smarter bot conversation (highest impact)

**Remembered customer details**
- The bot stores name, phone, address, pincode and coordinates on the conversation record and links them to the saved-address list already used by the website.
- On a repeat order it never re-asks. It shows a confirmation card instead:
  "Deliver to Home — 105, Wakekar layout, Nagpur 440024 · Rohit · 86000 11641" with buttons *Confirm*, *Change address*, *Add new*.
- Cart, last order, viewed products and wishlist persist between chats, so returning customers resume where they left off.

**Location sharing**
- A prompt with the exact wording: "📍 Share your address — tap 📎 (attach) → Location → Send your current location".
- Incoming WhatsApp location pins are reverse-geocoded to a full address, checked against the delivery radius, saved, and confirmed back to the customer.

**Language mirroring**
- The bot detects the language of each incoming message (English / Hindi / Marathi, Roman script included) and replies in that language.
- It only switches when the customer switches. It never changes language on its own.

**Everything clickable**
- Category browsing, product picking, quantity +/-, cart edits, checkout steps, address choice, payment and order actions all become interactive buttons and list menus. Typing still works as a fallback.

## Step 2 — Product Sync

- Product add / edit / delete and any stock or price change is picked up by the bot on the very next message, with no redeploy.
- Bot menus and categories are built from live product data plus the admin-managed menu tree instead of the hardcoded list in the bot code.
- A "Sync now" button and a last-synced indicator in the Bot Manager clear the short-lived cache immediately.
- Out-of-stock items disappear from browsing automatically; price and discount changes reflect in cards and carts.

## Step 3 — Customer CRM + Conversation inbox

**Customer Management**
- Table of every WhatsApp customer: name, number, city, first contact, last active, orders, lifetime spend, favourite products, tags, status.
- Search by name, number, product, city or order number. Filter by tag, status and spend.
- Favourites/starred customers and free-form tags (VIP, wholesale, etc.).
- Customer profile drawer: full chat history, orders, payments, addresses, cart, wishlist and staff-only notes.

**Conversation Manager (inbox)**
- Live list of conversations with unread counts and last message preview.
- Reply from the admin panel, assign to a teammate, mark resolved, star, archive.
- Filter by unread / open / resolved / archived / assignee, and search message text.

## Step 4 — Broadcast Manager + Smart Address & Delivery Zones

**Broadcast Manager**
- Compose campaigns with text, image/video/PDF upload, buttons, coupon codes and product cards.
- Audience filters: all, VIP, new, returning, city, bought a product, abandoned cart, last purchase window.
- Schedule sends, per-recipient delivery log, opt-outs always respected, and a warning when a Meta-approved template is required.

**Smart Address & Delivery Zones**
- Map pin selection and address autocomplete for both the bot link flow and the admin panel.
- Saved addresses shared across website, bot and admin.
- Delivery availability check on every address: inside radius → charge and ETA; outside → polite refusal with the reason.
- Admin screen for zones (distance band, charge, minimum order, free-delivery threshold, ETA, enable/disable).

## Technical notes

- New tables (all public schema, GRANTs, admin-only RLS, updated_at triggers): customer tags/notes, conversation inbox state (assignee, status, starred, archived, unread), broadcast campaigns and recipients.
- `whatsapp_conversations` gains fields for saved profile details, preferred language and last-known coordinates.
- Bot config is read through a shared helper in `supabase/functions/whatsapp-webhook/`, cached for a few seconds, so admin edits apply on the next message.
- Location handling reuses the existing Leaflet/OSM picker, Nominatim reverse geocoding and the delivery-distance edge function; no new paid map service.
- Broadcast sending runs through the existing WhatsApp Cloud API helper and activity log.
