// Premium menu-driven WhatsApp shopping engine for California Farms India.
// Fully clickable: category picker, product picker, cart editing, checkout and
// address confirmation are all buttons / list menus. Typing still works.
// Replies mirror the customer's language (English / Hindi / Marathi).

import { Lang, t } from "./i18n.ts";

export type Product = Record<string, any>;

export interface LocationPayload {
  latitude: number;
  longitude: number;
  address?: string | null;
  name?: string | null;
}

export interface ShopCtx {
  phone: string;
  text: string;
  buttonId?: string | null;
  location?: LocationPayload | null;
  lang: Lang;
  conversation: Record<string, any>;
  products: Product[];
  sendText: (to: string, text: string) => Promise<unknown>;
  sendImage: (to: string, imageUrl: string, caption: string) => Promise<unknown>;
  sendButtons: (to: string, body: string, buttons: Array<{ id: string; title: string }>) => Promise<unknown>;
  sendList: (
    to: string,
    body: string,
    buttonLabel: string,
    rows: Array<{ id: string; title: string; description?: string }>,
    header?: string,
    sectionTitle?: string,
  ) => Promise<unknown>;
  updateConversation: (phone: string, updates: Record<string, unknown>) => Promise<void>;
  log: (phone: string, direction: string, text: string) => Promise<void>;
  createOrder: (phone: string, conversation: Record<string, any>) => Promise<any>;
  listOrders: (phone: string) => Promise<Array<Record<string, any>>>;
  getOrder: (orderId: string) => Promise<Record<string, any> | null>;
  cancelOrder: (orderId: string) => Promise<{ ok: boolean; reason?: string }>;
  resolveLocation: (lat: number, lng: number) => Promise<{
    address: string;
    pincode: string | null;
    city: string | null;
    distanceKm: number | null;
    serviceable: boolean;
    error?: string;
  }>;
}

const SITE = "https://zomical.com";
const PAGE_SIZE = 9;

// ─── Category taxonomy ───
interface CatDef {
  key: string;
  label: string;
  emoji: string;
  dbCategories: string[];
  keywords: string[];
}

const CATEGORY_DEFS: CatDef[] = [
  { key: "vegetables", label: "Fresh Vegetables", emoji: "🥕", dbCategories: ["vegetables", "vegetable"], keywords: ["tomato", "onion", "potato", "cabbage", "cauliflower", "brinjal", "eggplant", "lady finger", "okra", "gourd", "chilli", "capsicum", "beetroot", "radish", "carrot", "pumpkin", "corn", "beans", "drumstick", "cucumber"] },
  { key: "fruits", label: "Fresh Fruits", emoji: "🍎", dbCategories: ["fruits", "fruit"], keywords: ["mango", "banana", "apple", "papaya", "watermelon", "strawberry", "guava", "orange", "grapes", "berry"] },
  { key: "leafy", label: "Leafy Greens", emoji: "🥬", dbCategories: ["leafy", "leafy greens", "greens"], keywords: ["spinach", "palak", "fenugreek", "methi", "coriander", "mint", "curry leaves", "lettuce", "amaranth"] },
  { key: "powders", label: "Organic Powders", emoji: "🌿", dbCategories: ["health", "powders", "organic powders"], keywords: ["powder"] },
  { key: "seeds", label: "Seeds & Dry Products", emoji: "🌱", dbCategories: ["seeds", "groceries", "dry", "dry products"], keywords: ["seed", "flour", "dal", "pulse", "nut", "dry"] },
  { key: "spices", label: "Spices", emoji: "🌶️", dbCategories: ["spices", "spice", "masala"], keywords: ["masala", "chilli powder", "turmeric", "cumin", "coriander powder", "pepper"] },
  { key: "honey", label: "Honey & Natural", emoji: "🍯", dbCategories: ["honey", "natural", "beverages"], keywords: ["honey", "tea", "juice", "ghee", "oil"] },
];

function norm(s: unknown) {
  return String(s ?? "").toLowerCase().trim();
}

export function categoryKeyOf(p: Product): string {
  const cat = norm(p.category);
  const name = norm(p.name);
  if (name.includes("powder")) return "powders";
  for (const def of CATEGORY_DEFS) {
    if (def.dbCategories.includes(cat)) return def.key;
  }
  for (const def of CATEGORY_DEFS) {
    if (def.keywords.some((k) => name.includes(k))) return def.key;
  }
  return "vegetables";
}

export function effectivePrice(p: Product): number {
  const base = Number(p.price) || 0;
  if (p.discount_enabled && p.discount_value) {
    if (p.discount_type === "percentage") return Math.round(base * (1 - Number(p.discount_value) / 100));
    return Math.max(0, base - Number(p.discount_value));
  }
  return base;
}

export function productImage(p: Product): string | null {
  if (p.image_url) return p.image_url;
  if (Array.isArray(p.image_urls) && p.image_urls.length > 0) return p.image_urls[0];
  return null;
}

function inStock(p: Product) {
  return p.stock_quantity == null || Number(p.stock_quantity) > 0;
}

function discountPct(p: Product): number {
  const base = Number(p.price) || 0;
  if (!base) return 0;
  return Math.round(((base - effectivePrice(p)) / base) * 100);
}

// ─── Dynamic menu (always built from the LIVE product list → instant sync) ───
interface MenuEntry { key: string; label: string; emoji: string }

function buildMenuEntries(products: Product[]): MenuEntry[] {
  const entries: MenuEntry[] = [];
  for (const def of CATEGORY_DEFS) {
    if (products.some((p) => categoryKeyOf(p) === def.key && inStock(p))) {
      entries.push({ key: def.key, label: def.label, emoji: def.emoji });
    }
  }
  entries.push({ key: "bestsellers", label: "Best Sellers", emoji: "⭐" });
  if (products.some((p) => discountPct(p) > 0)) {
    entries.push({ key: "offers", label: "Today's Offers", emoji: "🔥" });
  }
  entries.push({ key: "cart", label: "My Cart", emoji: "🛒" });
  entries.push({ key: "orders", label: "My Orders", emoji: "📦" });
  entries.push({ key: "search", label: "Search Product", emoji: "🔍" });
  return entries;
}

function productsFor(key: string, products: Product[]): Product[] {
  if (key === "bestsellers") {
    const best = products.filter((p) => p.is_bestseller && inStock(p));
    return (best.length ? best : products.filter(inStock)).slice(0, 18);
  }
  if (key === "offers") return products.filter((p) => discountPct(p) > 0);
  return products.filter((p) => categoryKeyOf(p) === key);
}

function catMeta(key: string) {
  if (key === "bestsellers") return { label: "Top Selling Products", emoji: "⭐" };
  if (key === "offers") return { label: "Today's Offers", emoji: "🔥" };
  if (key === "search") return { label: "Search Results", emoji: "🔍" };
  const def = CATEGORY_DEFS.find((d) => d.key === key);
  return { label: def?.label ?? "Products", emoji: def?.emoji ?? "🌿" };
}

function priceLine(p: Product): string {
  const eff = effectivePrice(p);
  const base = Number(p.price);
  const tag = !inStock(p) ? " • out of stock" : Number(p.stock_quantity) <= 5 && p.stock_quantity != null ? " • few left" : "";
  return eff !== base ? `₹${eff} (was ₹${base}) /${p.unit}${tag}` : `₹${eff} /${p.unit}${tag}`;
}

function productCard(p: Product, lang: Lang): string {
  const eff = effectivePrice(p);
  const lines: string[] = [];
  lines.push(`${catMeta(categoryKeyOf(p)).emoji} *${p.name}*`);
  lines.push("⭐ Premium Quality");
  lines.push("");
  lines.push("💰 *Price*");
  if (eff !== Number(p.price)) lines.push(`1 ${p.unit} — ₹${eff}  ~₹${p.price}~  (${discountPct(p)}% OFF)`);
  else lines.push(`1 ${p.unit} — ₹${eff}`);

  const variants = (Array.isArray(p.product_variants) ? p.product_variants : [])
    .filter((v: any) => v.is_available !== false)
    .sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0));
  if (variants.length) {
    lines.push("");
    lines.push("📦 *Pack Sizes*");
    for (const v of variants) lines.push(`• ${v.name} — ₹${v.price}`);
  }

  if (p.stock_quantity == null) lines.push(`\n${t(lang, "in_stock")}`);
  else if (Number(p.stock_quantity) <= 0) lines.push(`\n${t(lang, "out_of_stock")}`);
  else if (Number(p.stock_quantity) <= 5) lines.push(`\n${t(lang, "few_left", { n: p.stock_quantity })}`);
  else lines.push(`\n${t(lang, "in_stock")}`);

  if (p.description) lines.push(`\n_${String(p.description).slice(0, 180)}_`);
  return lines.join("\n");
}

function cartLines(cart: any[], numbered = false): { text: string; total: number } {
  let total = 0;
  const lines: string[] = [];
  cart.forEach((c, i) => {
    const sum = Number(c.price) * Number(c.qty);
    total += sum;
    lines.push(`${numbered ? `*${i + 1}.*` : "•"} ${c.name} ×${c.qty} — ₹${sum}`);
  });
  return { text: lines.join("\n"), total };
}

function similarTo(p: Product, products: Product[]): Product[] {
  const key = categoryKeyOf(p);
  return products.filter((x) => x.id !== p.id && categoryKeyOf(x) === key && inStock(x)).slice(0, 3);
}

const SLOTS = [
  { id: "Morning 8-11 AM", label: "Morning 8–11 AM" },
  { id: "Noon 12-3 PM", label: "Noon 12–3 PM" },
  { id: "Evening 4-7 PM", label: "Evening 4–7 PM" },
];

// ─── Main handler ───
export async function handleShopMessage(ctx: ShopCtx): Promise<boolean> {
  const { phone, products, conversation, lang } = ctx;
  const raw = (ctx.buttonId || ctx.text || "").trim();
  const t0 = raw.toLowerCase();
  const mc: Record<string, any> = (conversation.menu_context as Record<string, any>) || {};
  const cart: any[] = Array.isArray(conversation.cart) ? [...conversation.cart] : [];
  const state = String(conversation.conversation_state || "idle");
  const L = (key: string, vars?: Record<string, string | number>) => t(lang, key, vars);

  const say = async (text: string) => { await ctx.sendText(phone, text); await ctx.log(phone, "outbound", text); };
  const sayButtons = async (text: string, btns: Array<{ id: string; title: string }>) => {
    await ctx.sendButtons(phone, text, btns); await ctx.log(phone, "outbound", text);
  };
  const sayList = async (
    body: string,
    buttonLabel: string,
    rows: Array<{ id: string; title: string; description?: string }>,
    header?: string,
    sectionTitle?: string,
  ) => {
    await ctx.sendList(phone, body, buttonLabel, rows, header, sectionTitle);
    await ctx.log(phone, "outbound", body);
  };
  const setMc = (next: Record<string, any>) => ctx.updateConversation(phone, { menu_context: next });

  // ── Main menu: a tappable list of live categories ──
  const showMenu = async () => {
    await setMc({ view: "menu" });
    const entries = buildMenuEntries(products);
    const name = conversation.delivery_name || conversation.customer_name;
    const head = name ? `${L("welcome_back", { name })}\n\n` : "";
    const cartLine = cart.length ? `\n${L("resume_cart", { n: cart.length })}` : "";
    const body = `${head}${L("welcome_title")}\n${L("welcome_sub")}\n\n${L("welcome_help")}${cartLine}\n\n${L("welcome_hint")}`;
    await sayList(
      body,
      L("browse_button").slice(0, 20),
      entries.map((e) => ({ id: `cat:${e.key}`, title: `${e.emoji} ${e.label}` })),
      undefined,
      L("menu_sections"),
    );
  };

  // ── Category listing: tappable product picker ──
  const showList = async (key: string, page: number, ids?: string[]) => {
    const list = ids
      ? ids.map((id) => products.find((p) => p.id === id)).filter(Boolean) as Product[]
      : productsFor(key, products);
    if (!list.length) {
      await sayButtons(L("no_products"), [{ id: "menu", title: L("menu").slice(0, 20) }]);
      return;
    }
    const maxPage = Math.floor((list.length - 1) / PAGE_SIZE);
    const p = Math.min(Math.max(page, 0), maxPage);
    const slice = list.slice(p * PAGE_SIZE, p * PAGE_SIZE + PAGE_SIZE);
    await setMc({ view: "list", key, page: p, ids: list.map((x) => x.id) });

    const meta = catMeta(key);
    const rows = slice.map((prod) => ({
      id: `p:${prod.id}`,
      title: String(prod.name),
      description: priceLine(prod),
    }));
    if (p < maxPage) rows.push({ id: `page:${key}:${p + 1}`, title: L("more"), description: `${list.length - (p + 1) * PAGE_SIZE} more` });

    await sayList(
      `${meta.emoji} *${meta.label}*\n\n${L("choose_product")} 👇`,
      L("choose_product").slice(0, 20),
      rows,
      undefined,
      `${L("products_in")} ${meta.label}`.slice(0, 24),
    );
  };

  const showProduct = async (product: Product) => {
    await setMc({ view: "product", productId: product.id, back: mc.view === "list" ? { key: mc.key, page: mc.page } : null });
    const caption = productCard(product, lang);
    const img = productImage(product);
    if (img) { await ctx.sendImage(phone, img, caption); await ctx.log(phone, "outbound", caption); }
    else await say(caption);

    if (!inStock(product)) {
      const alts = similarTo(product, products);
      if (alts.length) {
        await setMc({ view: "list", key: categoryKeyOf(product), page: 0, ids: alts.map((a) => a.id) });
        await sayList(
          `${L("out_of_stock")}\n\n${L("you_may_like")}`,
          L("choose_product").slice(0, 20),
          alts.map((a) => ({ id: `p:${a.id}`, title: String(a.name), description: priceLine(a) })),
        );
        return;
      }
    }
    await sayButtons("👇", [
      { id: `add:${product.id}`, title: L("add_to_cart").slice(0, 20) },
      { id: `wish:${product.id}`, title: L("wishlist").slice(0, 20) },
      { id: "back", title: L("back").slice(0, 20) },
    ]);
  };

  const showCart = async (prefix?: string) => {
    if (!cart.length) {
      await setMc({ view: "cart", ids: [] });
      await sayButtons(`${prefix ? prefix + "\n\n" : ""}${L("cart_empty")}`, [
        { id: "menu", title: L("keep_shopping").slice(0, 20) },
      ]);
      return;
    }
    const { text, total } = cartLines(cart, true);
    await setMc({ view: "cart", ids: cart.map((c) => c.product_id ?? c.name) });
    await sayButtons(
      `${prefix ? prefix + "\n\n" : ""}${L("your_cart")}\n${text}\n\n💰 *${L("total")}: ₹${total}*\n${L("free_above")}`,
      [
        { id: "checkout", title: L("checkout").slice(0, 20) },
        { id: "cartedit", title: L("edit_item").slice(0, 20) },
        { id: "menu", title: L("keep_shopping").slice(0, 20) },
      ],
    );
  };

  const showCartEditor = async () => {
    if (!cart.length) { await showCart(); return; }
    await setMc({ ...mc, view: "cart" });
    const rows = cart.map((c, i) => ({
      id: `ci:${i + 1}`,
      title: String(c.name).slice(0, 24),
      description: `×${c.qty} — ₹${Number(c.price) * Number(c.qty)}`,
    }));
    rows.push({ id: "clear", title: L("clear_cart"), description: "" });
    await sayList(L("pick_item_to_edit"), L("edit_item").slice(0, 20), rows);
  };

  const saveCart = async () => {
    await ctx.updateConversation(phone, { cart });
    conversation.cart = cart;
  };

  const addToCart = async (product: Product) => {
    if (!inStock(product)) {
      const alts = similarTo(product, products);
      await say(`${L("out_of_stock")} — *${product.name}*${alts.length ? `\n\n${L("you_may_like")} ${alts.map((a) => a.name).join(", ")}` : ""}`);
      return;
    }
    const idx = cart.findIndex((c) => norm(c.name) === norm(product.name));
    if (idx >= 0) cart[idx].qty += 1;
    else cart.push({ name: product.name, qty: 1, price: effectivePrice(product), unit: product.unit, product_id: product.id });
    await saveCart();
    await showCart(L("added"));
  };

  const itemButtons = async (n: number) => {
    const item = cart[n - 1];
    if (!item) { await showCart(); return; }
    await sayButtons(
      `🛒 *${item.name}*\n₹${item.price} / ${item.unit} × ${item.qty} = ₹${Number(item.price) * Number(item.qty)}`,
      [
        { id: `qty+:${n}`, title: L("add_one").slice(0, 20) },
        { id: `qty-:${n}`, title: L("remove_one").slice(0, 20) },
        { id: `rm:${n}`, title: L("remove_item").slice(0, 20) },
      ],
    );
  };

  // ── Text-typed cart edits (kept as a fallback) ──
  const editCart = async (): Promise<boolean> => {
    const clean = t0.replace(/\s+/g, " ").trim();
    if (["clear", "empty cart", "clear cart", "remove all"].includes(clean)) {
      if (!cart.length) { await showCart(); return true; }
      cart.length = 0;
      await saveCart();
      await sayButtons(L("cart_cleared"), [{ id: "menu", title: L("keep_shopping").slice(0, 20) }]);
      return true;
    }
    const resolve = (n: number) => (n >= 1 && n <= cart.length ? n - 1 : -1);

    let m = clean.match(/^(?:remove|delete|del)\s+(.+)$/);
    if (m) {
      const arg = m[1].trim();
      const idx = /^\d+$/.test(arg) ? resolve(parseInt(arg, 10)) : cart.findIndex((c) => norm(c.name).includes(arg));
      if (idx < 0) { await showCart(); return true; }
      const [removed] = cart.splice(idx, 1);
      await saveCart();
      await showCart(`🗑️ *${removed.name}* — ${L("remove_item")}`);
      return true;
    }

    m = clean.match(/^(\d+)\s*(?:x|\*|=|qty|quantity)\s*(\d+)$/);
    if (m) {
      const idx = resolve(parseInt(m[1], 10));
      const qty = parseInt(m[2], 10);
      if (idx < 0) { await showCart(); return true; }
      if (qty <= 0) {
        const [removed] = cart.splice(idx, 1);
        await saveCart();
        await showCart(`🗑️ *${removed.name}*`);
        return true;
      }
      cart[idx].qty = Math.min(qty, 99);
      await saveCart();
      await showCart(`✏️ *${cart[idx].name}* × ${cart[idx].qty}`);
      return true;
    }

    m = clean.match(/^([+-])\s*(\d+)$/) || clean.match(/^(\d+)\s*([+-])$/);
    if (m) {
      const sign = /[+-]/.test(m[1]) ? m[1] : m[2];
      const num = /[+-]/.test(m[1]) ? m[2] : m[1];
      const idx = resolve(parseInt(num, 10));
      if (idx < 0) { await showCart(); return true; }
      const next = Number(cart[idx].qty) + (sign === "+" ? 1 : -1);
      if (next <= 0) {
        const [removed] = cart.splice(idx, 1);
        await saveCart();
        await showCart(`🗑️ *${removed.name}*`);
        return true;
      }
      cart[idx].qty = Math.min(next, 99);
      await saveCart();
      await showCart(`✏️ *${cart[idx].name}* × ${cart[idx].qty}`);
      return true;
    }
    return false;
  };

  // ── Order history: list past orders, reorder, cancel ──
  const STATUS_EMOJI: Record<string, string> = {
    pending: "🕐", confirmed: "✅", preparing: "👨‍🌾", out_for_delivery: "🚚",
    delivered: "📦", cancelled: "❌",
  };
  const CANCELLABLE = ["pending", "confirmed", "preparing"];

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", timeZone: "Asia/Kolkata" });

  const showOrders = async (prefix?: string) => {
    const orders = await ctx.listOrders(phone);
    if (!orders.length) {
      await sayButtons(`${prefix ? prefix + "\n\n" : ""}📦 You have no past orders yet.`, [
        { id: "menu", title: L("keep_shopping").slice(0, 20) },
      ]);
      return;
    }
    await setMc({ view: "orders", orderIds: orders.map((o) => o.id) });
    const rows = orders.slice(0, 10).map((o, i) => ({
      id: `o:${o.id}`,
      title: `#${String(o.order_number).slice(-8)}`.slice(0, 24),
      description: `${STATUS_EMOJI[o.status] ?? "•"} ${String(o.status).replace(/_/g, " ")} • ₹${o.total} • ${fmtDate(o.created_at)}`.slice(0, 72),
    }));
    await sayList(
      `${prefix ? prefix + "\n\n" : ""}📦 *Your Orders*\n\nTap an order to view it, reorder it or cancel it 👇`,
      "Select order",
      rows,
      undefined,
      "Recent orders",
    );
  };

  const showOrder = async (orderId: string, prefix?: string) => {
    const order = await ctx.getOrder(orderId);
    if (!order) { await showOrders("😔 Couldn't find that order."); return; }
    await setMc({ ...mc, view: "order", orderId });
    const items = Array.isArray(order.order_items) ? order.order_items : [];
    const lines = items.map((it: any) => `• ${it.product_name} ×${it.quantity} — ₹${it.total_price}`);
    const body = [
      `🧾 *Order #${order.order_number}*`,
      `${STATUS_EMOJI[order.status] ?? "•"} Status: *${String(order.status).replace(/_/g, " ")}*`,
      `📅 ${fmtDate(order.created_at)}`,
      "",
      lines.join("\n") || "_No items_",
      "",
      `💰 *Total: ₹${order.total}*`,
      order.delivery_address ? `📍 ${order.delivery_address}` : "",
    ].filter(Boolean).join("\n");

    const btns: Array<{ id: string; title: string }> = [{ id: `ord:${order.id}`, title: "🔁 Reorder" }];
    if (CANCELLABLE.includes(String(order.status))) btns.push({ id: `ocx:${order.id}`, title: "❌ Cancel order" });
    btns.push({ id: "orders", title: "📦 My Orders" });
    await sayButtons(body, btns);
  };

  const reorder = async (orderId: string) => {
    const order = await ctx.getOrder(orderId);
    if (!order) { await showOrders("😔 Couldn't find that order."); return; }
    const items = Array.isArray(order.order_items) ? order.order_items : [];
    const skipped: string[] = [];
    for (const it of items) {
      const p = products.find((x) => x.id === it.product_id) ||
        products.find((x) => norm(x.name) === norm(it.product_name));
      if (!p || !inStock(p)) { skipped.push(it.product_name); continue; }
      const idx = cart.findIndex((c) => norm(c.name) === norm(p.name));
      const qty = Math.max(1, Math.round(Number(it.quantity) || 1));
      if (idx >= 0) cart[idx].qty = Math.min(cart[idx].qty + qty, 99);
      else cart.push({ name: p.name, qty, price: effectivePrice(p), unit: p.unit, product_id: p.id });
    }
    await saveCart();
    const note = skipped.length ? `🔁 Added items from #${order.order_number}.\n⚠️ Unavailable: ${skipped.join(", ")}` : `🔁 Items from #${order.order_number} added to your cart.`;
    if (!cart.length) { await sayButtons(`${note}\n\n${L("cart_empty")}`, [{ id: "menu", title: L("keep_shopping").slice(0, 20) }]); return; }
    await showCart(note);
  };

  // ── Saved-profile helpers ──
  const hasSavedProfile = () =>
    Boolean(conversation.delivery_name && conversation.delivery_phone && conversation.delivery_address && conversation.delivery_pincode);

  const savedAddressCard = () => {
    const label = conversation.delivery_label || "Saved address";
    return `${L("saved_details")}\n\n🏠 *${label}*\n${conversation.delivery_address}${
      conversation.delivery_pincode ? ` — ${conversation.delivery_pincode}` : ""
    }\n👤 ${conversation.delivery_name}\n📞 ${conversation.delivery_phone}`;
  };

  const askAddress = async () => {
    await ctx.updateConversation(phone, { conversation_state: "co_address" });
    await sayButtons(L("ask_address"), [{ id: "menu", title: L("cancel").slice(0, 20) }]);
  };

  const askTime = async () => {
    await ctx.updateConversation(phone, { conversation_state: "co_time" });
    await sayButtons(L("ask_time"), SLOTS.map((s) => ({ id: `time:${s.id}`, title: s.label.slice(0, 20) })));
  };

  const showOrderConfirm = async (slot: string) => {
    const baseAddr = String(conversation.delivery_address || "").replace(/\s*\|\s*Preferred time:.*$/, "");
    const addrWithTime = `${baseAddr} | Preferred time: ${slot}`;
    conversation.delivery_address = addrWithTime;
    await ctx.updateConversation(phone, {
      delivery_address: addrWithTime,
      conversation_state: "co_confirm",
      profile_complete: true,
      customer_name: conversation.delivery_name,
    });
    const { text, total } = cartLines(cart, true);
    await sayButtons(
      `${L("order_summary")}\n${text}\n\n💰 ₹${total}\n👤 ${conversation.delivery_name}\n📞 ${conversation.delivery_phone}\n📍 ${baseAddr}\n⏰ ${slot}\n\n💳 UPI / Card / Netbanking`,
      [
        { id: "confirm", title: L("confirm_order").slice(0, 20) },
        { id: "editorder", title: "✏️ Edit items" },
        { id: "cancelorder", title: "❌ Cancel order" },
      ],
    );
  };


  const startCheckout = async () => {
    if (!cart.length) {
      await sayButtons(L("cart_empty"), [{ id: "menu", title: L("keep_shopping").slice(0, 20) }]);
      return;
    }
    if (hasSavedProfile()) {
      await ctx.updateConversation(phone, { conversation_state: "co_saved" });
      await sayButtons(savedAddressCard(), [
        { id: "usesaved", title: L("confirm_details").slice(0, 20) },
        { id: "newaddr", title: L("change_address").slice(0, 20) },
        { id: "menu", title: L("cancel").slice(0, 20) },
      ]);
      return;
    }
    await ctx.updateConversation(phone, { conversation_state: "co_name" });
    await say(L("ask_name"));
  };

  // ── Incoming WhatsApp location pin ──
  if (ctx.location) {
    const { latitude, longitude } = ctx.location;
    const resolved = await ctx.resolveLocation(latitude, longitude);
    if (!resolved.serviceable) {
      await sayButtons(`${L("location_outside")}${resolved.error ? `\n\n_${resolved.error}_` : ""}`, [
        { id: "menu", title: L("menu").slice(0, 20) },
      ]);
      return true;
    }
    await ctx.updateConversation(phone, {
      delivery_address: resolved.address,
      delivery_pincode: resolved.pincode,
      delivery_city: resolved.city,
      delivery_latitude: latitude,
      delivery_longitude: longitude,
      delivery_label: "Home",
      conversation_state: cart.length ? "co_time" : "idle",
    });
    conversation.delivery_address = resolved.address;
    conversation.delivery_pincode = resolved.pincode;
    const distLine = resolved.distanceKm != null ? `\n🚚 ${resolved.distanceKm} km from our farm` : "";
    await say(`${L("location_saved")}\n\n📍 ${resolved.address}${resolved.pincode ? ` — ${resolved.pincode}` : ""}${distLine}`);
    if (cart.length) {
      if (!conversation.delivery_name || !conversation.delivery_phone) {
        await ctx.updateConversation(phone, { conversation_state: "co_name" });
        await say(L("ask_name"));
      } else {
        await askTime();
      }
    } else {
      await showMenu();
    }
    return true;
  }

  // ── Checkout collection flow ──
  if (state.startsWith("co_")) {
    if (t0 === "menu" || t0 === "cancel") {
      await ctx.updateConversation(phone, { conversation_state: "idle" });
      await showMenu();
      return true;
    }
    if (state === "co_saved") {
      if (t0 === "usesaved") { await askTime(); return true; }
      if (t0 === "newaddr") { await askAddress(); return true; }
    }
    if (state === "co_name") {
      await ctx.updateConversation(phone, { delivery_name: raw, customer_name: raw, conversation_state: "co_phone" });
      conversation.delivery_name = raw;
      await say(`🙏 *${raw}*\n\n${L("ask_phone")}`);
      return true;
    }
    if (state === "co_phone") {
      const digits = raw.replace(/\D/g, "").slice(-10);
      if (digits.length !== 10) { await say(L("invalid_phone")); return true; }
      conversation.delivery_phone = digits;
      if (conversation.delivery_address && conversation.delivery_pincode) {
        await ctx.updateConversation(phone, { delivery_phone: digits });
        await askTime();
        return true;
      }
      await ctx.updateConversation(phone, { delivery_phone: digits, conversation_state: "co_address" });
      await say(L("ask_address"));
      return true;
    }
    if (state === "co_address") {
      conversation.delivery_address = raw;
      await ctx.updateConversation(phone, { delivery_address: raw, conversation_state: "co_pincode" });
      await say(L("ask_pincode"));
      return true;
    }
    if (state === "co_pincode") {
      const pin = raw.replace(/\D/g, "");
      if (pin.length !== 6) { await say(L("invalid_pincode")); return true; }
      conversation.delivery_pincode = pin;
      await ctx.updateConversation(phone, { delivery_pincode: pin });
      await askTime();
      return true;
    }
    if (state === "co_time") {
      const slot = raw.startsWith("time:") ? raw.slice(5) : raw;
      await showOrderConfirm(slot);
      return true;
    }
    if (state === "co_confirm") {
      if (t0 === "confirm" || t0 === "yes" || t0 === "ok") {
        await say(L("creating_order"));
        try {
          const result = await ctx.createOrder(phone, conversation);
          if (result) {
            const del = result.deliveryCharge > 0
              ? `\n🚚 ${result.distanceKm} km: ₹${result.deliveryCharge}`
              : `\n${L("delivery_free")}`;
            await say(`💳 *Order #${result.orderNumber}*\n\n🛒 ₹${result.subtotal}${del}\n💰 *${L("total")}: ₹${result.total}*\n\n${L("pay_secure")} ${result.paymentUrl}\n\n${L("link_expires")}`);
          }
        } catch (e: any) {
          await say(`😔 ${e?.message?.includes("Delivery not available") ? e.message : L("order_failed")}`);
          await ctx.updateConversation(phone, { conversation_state: "idle" });
          await showMenu();
        }
        return true;
      }
      if (t0 === "editorder" || t0 === "edit" || t0 === "cartedit") {
        await ctx.updateConversation(phone, { conversation_state: "idle" });
        await showCartEditor();
        return true;
      }
      if (t0 === "cancelorder" || t0 === "cancel" || t0 === "no" || t0 === "menu") {
        await sayButtons(
          "🤔 *What would you like to cancel?*\n\nYou can remove just one item and keep the rest — you don't have to cancel everything.",
          [
            { id: "editorder", title: "✏️ Remove 1 item" },
            { id: "cancelall", title: "❌ Cancel all" },
            { id: "backconfirm", title: "🔙 Keep order" },
          ],
        );
        return true;
      }
      if (t0 === "backconfirm") {
        const slot = String(conversation.delivery_address || "").match(/Preferred time:\s*(.+)$/)?.[1] || "Anytime";
        await showOrderConfirm(slot.trim());
        return true;
      }
      if (t0 === "cancelall") {
        cart.length = 0;
        await saveCart();
        await ctx.updateConversation(phone, { conversation_state: "idle" });
        await sayButtons(
          "❌ *Order cancelled.*\n\nNo worries — nothing was charged and your cart is now empty. 🌿\nYou can purchase anytime, we're always here for you!",
          [{ id: "menu", title: L("keep_shopping").slice(0, 20) }],
        );
        return true;
      }
      await sayButtons(
        `${L("order_summary")} 👇`,
        [
          { id: "confirm", title: L("confirm_order").slice(0, 20) },
          { id: "editorder", title: "✏️ Edit items" },
          { id: "cancelorder", title: "❌ Cancel order" },
        ],
      );
      return true;
    }

  }

  // ── Global commands ──
  if (["hi", "hello", "hey", "menu", "start", "namaste", "hii", "home", "0", "नमस्ते", "हाय", "मेन्यू"].includes(t0)) {
    await showMenu();
    return true;
  }

  if (["cart", "my cart", "view cart", "edit cart", "कार्ट"].includes(t0)) { await showCart(); return true; }
  if (t0 === "cartedit") { await showCartEditor(); return true; }
  if (t0 === "clear") { await editCart(); return true; }

  if (["orders", "my orders", "order history", "past orders", "my order"].includes(t0)) { await showOrders(); return true; }
  if (raw.startsWith("o:")) { await showOrder(raw.slice(2)); return true; }
  if (raw.startsWith("ord:")) { await reorder(raw.slice(4)); return true; }
  if (raw.startsWith("ocx:")) {
    const id = raw.slice(4);
    await sayButtons("⚠️ Are you sure you want to cancel this order?\n\nAny paid amount is refunded within 5–7 working days.", [
      { id: `ocy:${id}`, title: "✅ Yes, cancel" },
      { id: `o:${id}`, title: "🔙 Keep order" },
    ]);
    return true;
  }
  if (raw.startsWith("ocy:")) {
    const res = await ctx.cancelOrder(raw.slice(4));
    if (res.ok) await showOrders("❌ Your order has been cancelled. Refund (if paid) is processed in 5–7 working days.");
    else await showOrders(`😔 ${res.reason || "This order can no longer be cancelled."} Reply *SUPPORT* for help.`);
    return true;
  }

  // Tappable category / product / page ids
  if (raw.startsWith("cat:")) {
    const key = raw.slice(4);
    if (key === "cart") { await showCart(); return true; }
    if (key === "orders") { await showOrders(); return true; }
    if (key === "search") {
      await setMc({ view: "search" });
      await say(L("search_prompt"));
      return true;
    }
    await showList(key, 0);
    return true;
  }
  if (raw.startsWith("page:")) {
    const [, key, page] = raw.split(":");
    await showList(key, parseInt(page, 10) || 0, Array.isArray(mc.ids) ? mc.ids : undefined);
    return true;
  }
  if (raw.startsWith("p:")) {
    const p = products.find((x) => x.id === raw.slice(2));
    if (p) { await showProduct(p); return true; }
  }
  if (raw.startsWith("ci:")) {
    await itemButtons(parseInt(raw.slice(3), 10));
    return true;
  }

  // Cart edit buttons
  const btn = t0.match(/^(qty\+|qty-|rm):(\d+)$/);
  if (btn) {
    const idx = parseInt(btn[2], 10) - 1;
    const item = cart[idx];
    if (!item) { await showCart(); return true; }
    if (btn[1] === "rm" || (btn[1] === "qty-" && Number(item.qty) <= 1)) {
      cart.splice(idx, 1);
      await saveCart();
      await showCart(`🗑️ *${item.name}*`);
      return true;
    }
    item.qty = btn[1] === "qty+" ? Math.min(Number(item.qty) + 1, 99) : Number(item.qty) - 1;
    await saveCart();
    await showCart(`✏️ *${item.name}* × ${item.qty}`);
    return true;
  }

  if (await editCart()) return true;

  if (["checkout", "buy now", "place order", "order"].includes(t0)) { await startCheckout(); return true; }
  if (t0 === "usesaved" || t0 === "newaddr") { await startCheckout(); return true; }

  if (t0 === "wishlist") {
    const wl: any[] = Array.isArray(conversation.wishlist) ? conversation.wishlist : [];
    if (!wl.length) { await sayButtons(L("wishlist_empty"), [{ id: "menu", title: L("keep_shopping").slice(0, 20) }]); return true; }
    await sayList(
      L("wishlist_title"),
      L("choose_product").slice(0, 20),
      wl.slice(0, 10).map((w) => ({ id: `p:${w.id}`, title: String(w.name).slice(0, 24), description: `₹${w.price}` })),
    );
    return true;
  }

  if (raw.startsWith("add:")) {
    const p = products.find((x) => x.id === raw.slice(4));
    if (p) { await addToCart(p); return true; }
  }
  if (raw.startsWith("wish:")) {
    const p = products.find((x) => x.id === raw.slice(5));
    if (p) {
      const wl: any[] = Array.isArray(conversation.wishlist) ? [...conversation.wishlist] : [];
      if (!wl.some((w) => w.id === p.id)) wl.push({ id: p.id, name: p.name, price: effectivePrice(p) });
      await ctx.updateConversation(phone, { wishlist: wl });
      await sayButtons(L("saved_to_wishlist", { name: p.name }), [
        { id: "menu", title: L("keep_shopping").slice(0, 20) },
        { id: "wishlist", title: L("wishlist").slice(0, 20) },
      ]);
      return true;
    }
  }
  if (t0 === "back") {
    if (mc.back?.key) { await showList(mc.back.key, mc.back.page || 0); return true; }
    await showMenu();
    return true;
  }
  if (t0 === "next" || t0 === "more") {
    if (mc.view === "list" && mc.key) { await showList(mc.key, (mc.page || 0) + 1, mc.ids); return true; }
    await showMenu();
    return true;
  }
  if (t0 === "prev" || t0 === "previous") {
    if (mc.view === "list" && mc.key) { await showList(mc.key, Math.max((mc.page || 0) - 1, 0), mc.ids); return true; }
  }

  // Numeric selection (legacy typing support)
  if (/^\d{1,2}$/.test(t0)) {
    const n = parseInt(t0, 10);
    if (mc.view === "cart" && cart.length) { await itemButtons(n); return true; }
    if (mc.view === "orders" && Array.isArray(mc.orderIds)) {
      const oid = mc.orderIds[n - 1];
      if (oid) { await showOrder(oid); return true; }
    }
    if (mc.view === "list" && Array.isArray(mc.ids)) {
      const id = mc.ids[n - 1];
      const p = products.find((x) => x.id === id);
      if (p) { await showProduct(p); return true; }
    }
    const entries = buildMenuEntries(products);
    const entry = entries[n - 1];
    if (entry) {
      if (entry.key === "cart") { await showCart(); return true; }
      if (entry.key === "orders") { await showOrders(); return true; }
      if (entry.key === "search") { await setMc({ view: "search" }); await say(L("search_prompt")); return true; }
      await showList(entry.key, 0);
      return true;
    }
    await showMenu();
    return true;
  }

  // Category typed directly
  const catByName = CATEGORY_DEFS.find((d) => t0 === norm(d.label) || t0 === d.key);
  if (catByName) { await showList(catByName.key, 0); return true; }
  if (t0.includes("offer") || t0.includes("discount") || t0.includes("sale")) { await showList("offers", 0); return true; }
  if (t0.includes("best sell") || t0 === "bestsellers" || t0.includes("popular")) { await showList("bestsellers", 0); return true; }

  // Product search
  if (t0.length >= 3) {
    const matches = products.filter((p) => norm(p.name).includes(t0) || t0.includes(norm(p.name)));
    if (matches.length === 1) { await showProduct(matches[0]); return true; }
    if (matches.length > 1) {
      await showList("search", 0, matches.map((m) => m.id));
      return true;
    }
    if (mc.view === "search") {
      const alts = products.filter(inStock).slice(0, 5);
      await sayList(
        `${L("no_match", { q: raw })}\n\n${L("you_may_like")}`,
        L("choose_product").slice(0, 20),
        alts.map((a) => ({ id: `p:${a.id}`, title: String(a.name).slice(0, 24), description: priceLine(a) })),
      );
      return true;
    }
  }

  return false; // let the AI handle free-form conversation
}

export { SITE };
