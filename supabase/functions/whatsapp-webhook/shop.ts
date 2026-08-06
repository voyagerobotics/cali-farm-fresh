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

// (Delivery time is no longer asked — orders follow the standard delivery schedule.)


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
    await ctx.sendButtons(phone, text, btns);
    await ctx.log(phone, "outbound", `${text}\n\n[Buttons: ${btns.map((b) => b.title).join(" | ")}]`);
  };
  const sayList = async (
    body: string,
    buttonLabel: string,
    rows: Array<{ id: string; title: string; description?: string }>,
    header?: string,
    sectionTitle?: string,
  ) => {
    await ctx.sendList(phone, body, buttonLabel, rows, header, sectionTitle);
    await ctx.log(phone, "outbound", `${body}\n\n[Menu "${buttonLabel}": ${rows.map((r) => r.title).join(" | ")}]`);
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
    await setMc({ ...mc, view: "cart", ids: cart.map((c) => c.product_id ?? c.name) });
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
    const { total } = cartLines(cart, true);
    const rows = cart.map((c, i) => ({
      id: `ci:${i + 1}`,
      title: `${i + 1}. ${String(c.name)}`.slice(0, 24),
      description: `×${c.qty} ${c.unit ?? ""} • ₹${Number(c.price) * Number(c.qty)} — tap to change`.slice(0, 72),
    }));
    rows.push({ id: "clear", title: L("clear_cart").slice(0, 24), description: "Remove every item" });
    if (mc.fromConfirm) rows.push({ id: "backconfirm", title: "🔙 Back to summary", description: "Review and confirm" });
    await sayList(
      `🛠️ *Edit your cart* (₹${total})\n\n${L("pick_item_to_edit")}\nYou can add one, remove one, or delete an item — the rest of your order stays as it is.`,
      L("edit_item").slice(0, 20),
      rows,
    );
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
    const stock = product.stock_quantity == null ? null : Number(product.stock_quantity);
    if (idx >= 0) {
      if (stock != null && Number(cart[idx].qty) + 1 > stock) {
        await offerReplacement(cart[idx], stock);
        return;
      }
      cart[idx].qty += 1;
    } else cart.push({ name: product.name, qty: 1, price: effectivePrice(product), unit: product.unit, product_id: product.id });

    await saveCart();
    await showCart(L("added"));
  };

  const itemButtons = async (n: number) => {
    const item = cart[n - 1];
    if (!item) { await showCart(); return; }
    const stock = stockOf(item);
    const stockLine = stock == null
      ? "\n✅ In stock"
      : stock <= 0
        ? "\n⛔ Out of stock right now"
        : `\n📦 Available: ${stock} ${item.unit ?? ""}`;
    await sayButtons(
      `🛒 *${item.name}*\n₹${item.price} / ${item.unit} × *${item.qty}* = ₹${Number(item.price) * Number(item.qty)}${stockLine}\n\nWhat would you like to do with this item?`,
      [
        { id: `qty+:${n}`, title: L("add_one").slice(0, 20) },
        { id: `qty-:${n}`, title: L("remove_one").slice(0, 20) },
        { id: `rm:${n}`, title: L("remove_item").slice(0, 20) },
      ],
    );
  };

  // ── Live stock validation for cart edits ──
  const productOf = (item: any): Product | undefined =>
    products.find((p) => p.id === item.product_id) || products.find((p) => norm(p.name) === norm(item.name));

  const stockOf = (item: any): number | null => {
    const p = productOf(item);
    if (!p || p.stock_quantity == null) return null;
    return Number(p.stock_quantity);
  };

  /** Offers tappable replacements when an item can't be increased further */
  const offerReplacement = async (item: any, stock: number) => {
    const p = productOf(item);
    const alts = p ? similarTo(p, products) : [];
    const body = `⛔ *Only ${stock} ${item.unit ?? ""} of ${item.name} available right now.*\n\nYour cart already has the maximum we can deliver, so we can't add more.${
      alts.length ? "\n\nYou can add a similar fresh option instead 👇" : ""
    }`;
    if (alts.length) {
      await sayList(body, L("choose_product").slice(0, 20), [
        ...alts.map((a) => ({ id: `p:${a.id}`, title: String(a.name).slice(0, 24), description: priceLine(a) })),
        { id: "cartedit", title: "🛠️ Back to cart", description: "Keep editing your items" },
      ]);
      return;
    }
    await sayButtons(body, [
      { id: "cartedit", title: "🛠️ Back to cart" },
      { id: "support", title: "💬 Contact support" },
    ]);
  };

  // ── Clickable partial / full cancellation at checkout ──
  const showCancelChooser = async () => {
    if (!cart.length) { await showCart(); return; }
    const { text, total } = cartLines(cart, true);
    const rows = cart.map((c, i) => ({
      id: `cx:${i + 1}`,
      title: `❌ ${String(c.name)}`.slice(0, 24),
      description: `Cancel only this (×${c.qty} — ₹${Number(c.price) * Number(c.qty)})`.slice(0, 72),
    }));
    rows.push({ id: "cancelall", title: `❌ Cancel all ${cart.length} items`.slice(0, 24), description: `Cancels the full ₹${total} order` });
    rows.push({ id: "cartedit", title: "🛠️ Change quantities", description: "Increase or decrease items" });
    rows.push({ id: "backconfirm", title: "🔙 Keep my order", description: "Go back to the summary" });
    rows.push({ id: "support", title: "💬 Contact support", description: "Talk to our team" });
    await sayList(
      `🤔 *What would you like to cancel?*\n\nYou have *${cart.length} item(s)* in this order:\n${text}\n\nYou can cancel just one item and still buy the rest — you don't have to cancel everything.\n💳 Nothing has been charged yet, so no refund is involved.`,
      "Choose option",
      rows,
      undefined,
      "Cancel options",
    );
  };

  const confirmCancelAll = async () => {
    if (!cart.length) { await showCart(); return; }
    const { text, total } = cartLines(cart, true);
    await sayButtons(
      `⚠️ *Cancel all ${cart.length} item(s)?*\n\nThese will be cancelled:\n${text}\n\n💰 Order value: ₹${total}\n💳 No payment was taken, so nothing will be charged and no refund is needed.`,
      [
        { id: "cancelallyes", title: `✅ Yes, cancel ${cart.length}`.slice(0, 20) },
        { id: "cartedit", title: "✏️ Keep some items" },
        { id: "backconfirm", title: "🔙 Keep order" },
      ],
    );
  };

  const doCancelAll = async () => {
    const names = cart.map((c) => `• ${c.name} ×${c.qty}`).join("\n");
    const n = cart.length;
    cart.length = 0;
    await saveCart();
    await setMc({ ...mc, fromConfirm: false, view: "cart", ids: [] });
    await ctx.updateConversation(phone, { conversation_state: "idle" });
    await sayButtons(
      `❌ *Order cancelled — all ${n} item(s) removed:*\n${names}\n\n💳 No payment was taken and nothing will be charged, so there is no refund to track.\n\n🌿 You can purchase anytime, we're always here for you!`,
      [
        { id: "menu", title: L("keep_shopping").slice(0, 20) },
        { id: "support", title: "💬 Contact support" },
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
      await setMc({ ...mc, fromConfirm: false, view: "cart", ids: [] });
      await ctx.updateConversation(phone, { conversation_state: "idle" });
      await sayButtons(
        "❌ *Full order cancelled* — all items removed.\n\n💳 No payment was taken and nothing will be charged. 🌿\nYou can purchase anytime, we're always here for you!",
        [{ id: "menu", title: L("keep_shopping").slice(0, 20) }],
      );
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
      await afterCartChange(`🗑️ *Removed only this item:* ${removed.name}\nYour other ${cart.length} item(s) are safe. 💳 Nothing has been charged yet.`);
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
        await afterCartChange(`🗑️ *Removed only this item:* ${removed.name}\nYour other ${cart.length} item(s) are safe. 💳 Nothing has been charged yet.`);
        return true;
      }
      const stockMax = stockOf(cart[idx]);
      if (stockMax != null && qty > stockMax) {
        await offerReplacement(cart[idx], stockMax);
        return true;
      }
      cart[idx].qty = Math.min(qty, 99);

      await saveCart();
      await afterCartChange(`✏️ *${cart[idx].name}* updated to × ${cart[idx].qty}. Everything else stays the same.`);
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
        await afterCartChange(`🗑️ *Removed only this item:* ${removed.name}\nYour other ${cart.length} item(s) are safe. 💳 Nothing has been charged yet.`);
        return true;
      }
      const stockCap = stockOf(cart[idx]);
      if (sign === "+" && stockCap != null && next > stockCap) {
        await offerReplacement(cart[idx], stockCap);
        return true;
      }
      cart[idx].qty = Math.min(next, 99);

      await saveCart();
      await afterCartChange(`✏️ *${cart[idx].name}* updated to × ${cart[idx].qty}. Everything else stays the same.`);
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
    const paid = String(order.payment_status) === "paid";
    const cancellable = CANCELLABLE.includes(String(order.status));
    const locked = !cancellable
      ? `\n🔒 This order is *${String(order.status).replace(/_/g, " ")}* — it can no longer be edited or cancelled here. Tap *Contact support* if you need help.`
      : String(order.status) === "preparing"
        ? "\n⚠️ Your order is already being packed — items can't be changed now, only a full cancel is possible."
        : paid
          ? "\n💳 Paid order — if you cancel, the full amount is refunded in 5–7 working days."
          : "";
    const body = [
      `🧾 *Order #${order.order_number}*`,
      `${STATUS_EMOJI[order.status] ?? "•"} Status: *${String(order.status).replace(/_/g, " ")}*`,
      `📅 ${fmtDate(order.created_at)}`,
      "",
      lines.join("\n") || "_No items_",
      "",
      `💰 *Total: ₹${order.total}*`,
      `💳 Payment: *${String(order.payment_status ?? "pending")}*`,
      order.delivery_address ? `📍 ${order.delivery_address}` : "",
      locked,
    ].filter(Boolean).join("\n");

    const btns: Array<{ id: string; title: string }> = [{ id: `ord:${order.id}`, title: "🔁 Reorder" }];
    if (cancellable) btns.push({ id: `ocx:${order.id}`, title: "❌ Cancel order" });
    else btns.push({ id: "support", title: "💬 Contact support" });
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

  const showOrderConfirm = async (prefix?: string) => {
    const baseAddr = String(conversation.delivery_address || "").replace(/\s*\|\s*Preferred time:.*$/, "");
    conversation.delivery_address = baseAddr;
    mc.fromConfirm = true;
    await setMc({ ...mc, fromConfirm: true });
    await ctx.updateConversation(phone, {
      delivery_address: baseAddr,
      conversation_state: "co_confirm",
      profile_complete: true,
      customer_name: conversation.delivery_name,
    });
    const { text, total } = cartLines(cart, true);
    await sayButtons(
      `${prefix ? prefix + "\n\n" : ""}${L("order_summary")}\n${text}\n\n💰 ₹${total}\n👤 ${conversation.delivery_name}\n📞 ${conversation.delivery_phone}\n📍 ${baseAddr}\n\n💳 UPI / Card / Netbanking\n\n_Nothing is charged until you tap Confirm._`,
      [
        { id: "confirm", title: L("confirm_order").slice(0, 20) },
        { id: "editorder", title: "✏️ Edit items" },
        { id: "cancelorder", title: "❌ Cancel order" },
      ],
    );
  };

  // ── Edit snapshots: before/after summary + undo ──
  const cloneCart = (src: any[]) => src.map((c) => ({ ...c }));
  const sumOf = (list: any[]) => list.reduce((s, c) => s + Number(c.price) * Number(c.qty), 0);

  /** Call right BEFORE mutating the cart so the change can be shown and undone */
  const snap = () => {
    if (!Array.isArray(mc.editBase)) mc.editBase = cloneCart(cart);
    mc.undo = cloneCart(cart);
  };

  const changeSummary = (): string => {
    const before: any[] = Array.isArray(mc.editBase) ? mc.editBase : [];
    const keyOf = (c: any) => String(c.product_id ?? norm(c.name));
    const beforeMap = new Map(before.map((c) => [keyOf(c), c]));
    const afterMap = new Map(cart.map((c) => [keyOf(c), c]));
    const changes: string[] = [];
    for (const [k, b] of beforeMap) {
      const a = afterMap.get(k);
      if (!a) changes.push(`🗑️ *${b.name}* — removed (was ×${b.qty})`);
      else if (Number(a.qty) !== Number(b.qty)) {
        changes.push(`${Number(a.qty) > Number(b.qty) ? "➕" : "➖"} *${a.name}* — ×${b.qty} ➜ *×${a.qty}*`);
      }
    }
    for (const [k, a] of afterMap) if (!beforeMap.has(k)) changes.push(`🆕 *${a.name}* — added ×${a.qty}`);

    const beforeText = before.length
      ? before.map((c) => `• ${c.name} ×${c.qty} — ₹${Number(c.price) * Number(c.qty)}`).join("\n")
      : "_empty cart_";
    const afterText = cart.length
      ? cart.map((c) => `• ${c.name} ×${c.qty} — ₹${Number(c.price) * Number(c.qty)}`).join("\n")
      : "_empty cart_";
    return [
      "🔄 *What changed*",
      changes.length ? changes.join("\n") : "_No changes yet._",
      "",
      `*Before* (₹${sumOf(before)})\n${beforeText}`,
      "",
      `*After* (₹${sumOf(cart)})\n${afterText}`,
    ].join("\n");
  };

  const showChangeCard = async (prefix?: string) => {
    await setMc({ ...mc });
    const btns: Array<{ id: string; title: string }> = [];
    if (Array.isArray(mc.undo)) btns.push({ id: "undoedit", title: "↩️ Undo change" });
    btns.push({ id: "confirmedits", title: "✅ Confirm changes" });
    btns.push({ id: "editorder", title: "🛠️ Keep editing" });
    await sayButtons(
      `${prefix ? prefix + "\n\n" : ""}${changeSummary()}\n\n_Nothing is final yet — you can undo before tapping Confirm changes._`,
      btns,
    );
  };

  const finishEdits = async (prefix?: string) => {
    mc.editBase = null;
    mc.undo = null;
    await setMc({ ...mc, editBase: null, undo: null });
    if (!cart.length) {
      await ctx.updateConversation(phone, { conversation_state: "idle" });
      await sayButtons(
        `${prefix ? prefix + "\n\n" : ""}🛒 Your cart is now empty, so the order was not placed.\n💳 Nothing has been charged.`,
        [{ id: "menu", title: L("keep_shopping").slice(0, 20) }],
      );
      return;
    }
    if (mc.fromConfirm) { await showOrderConfirm(prefix ? `${prefix}\n\n🧾 *Updated order summary* 👇` : undefined); return; }
    await showCart(prefix);
  };

  const undoEdit = async () => {
    if (!Array.isArray(mc.undo)) { await showCart("↩️ Nothing to undo."); return; }
    cart.length = 0;
    for (const c of mc.undo) cart.push({ ...c });
    mc.undo = null;
    await saveCart();
    await showChangeCard("↩️ *Last change undone* — your cart is back to how it was.");
  };

  // After any cart change: show the before/after card with an undo step
  const afterCartChange = async (prefix?: string) => {
    if (Array.isArray(mc.editBase)) { await showChangeCard(prefix); return; }
    await finishEdits(prefix);
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
      conversation_state: cart.length ? "co_confirm" : "idle",
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
        await showOrderConfirm();
      }
    } else {
      await showMenu();
    }
    return true;
  }

  // ── Checkout collection flow ──
  if (state.startsWith("co_")) {
    if ((t0 === "menu" || t0 === "cancel") && state !== "co_confirm") {
      await ctx.updateConversation(phone, { conversation_state: "idle" });
      await showMenu();
      return true;
    }
    if (state === "co_saved") {
      if (t0 === "usesaved") { await showOrderConfirm(); return true; }
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
        await showOrderConfirm();
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
      await showOrderConfirm();
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
        await showCancelChooser();
        return true;
      }
      if (t0 === "backconfirm") {
        await showOrderConfirm();
        return true;
      }
      if (raw.startsWith("cx:")) {
        const idx = parseInt(raw.slice(3), 10) - 1;
        const item = cart[idx];
        if (!item) { await showCancelChooser(); return true; }
        cart.splice(idx, 1);
        await saveCart();
        await afterCartChange(
          `🗑️ *Cancelled only this item:* ${item.name} ×${item.qty}\n${
            cart.length ? `✅ Your other ${cart.length} item(s) are still in the order.` : "🛒 Your cart is now empty."
          }\n💳 Nothing has been charged, so there is no refund to process.`,
        );
        return true;
      }
      if (t0 === "cancelall") {
        await confirmCancelAll();
        return true;
      }
      if (t0 === "cancelallyes") {
        await doCancelAll();
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
    const order = await ctx.getOrder(id);
    if (!order) { await showOrders("😔 Couldn't find that order."); return true; }
    if (!CANCELLABLE.includes(String(order.status))) {
      await sayButtons(
        `🔒 *Order #${order.order_number} can't be cancelled here.*\n\nIt is already *${String(order.status).replace(/_/g, " ")}*, so self-cancel is closed for this order. Our team can still help.`,
        [{ id: "support", title: "💬 Contact support" }, { id: `o:${id}`, title: "🔙 Back to order" }],
      );
      return true;
    }
    const paid = String(order.payment_status) === "paid";
    const processing = String(order.status) === "preparing";
    const warn = processing
      ? "\n\n⚠️ *This order is already being packed*, so items can't be changed — only a full cancel is possible."
      : "";
    const money = paid
      ? "\n💳 You paid ₹" + order.total + " — a *full refund* will be processed in 5–7 working days."
      : "\n💳 Nothing has been charged, so there is no refund to process.";
    
    const itemNames = (Array.isArray(order.order_items) ? order.order_items : [])
      .map((it: any) => `• ${it.product_name} ×${it.quantity}`).join("\n");
    await sayButtons(
      `⚠️ *Cancel the entire order #${order.order_number}?*\n\nThis cancels *all ${(order.order_items || []).length} item(s)*:\n${itemNames || "_items_"}${warn}${money}`,
      [
        { id: `ocy:${id}`, title: "✅ Yes, cancel all" },
        { id: `o:${id}`, title: "🔙 Keep order" },
        { id: "support", title: "💬 Contact support" },
      ],
    );
    return true;
  }
  if (raw.startsWith("ocy:")) {
    const id = raw.slice(4);
    const before = await ctx.getOrder(id);
    const res = await ctx.cancelOrder(id);
    if (res.ok) {
      const paid = before && String(before.payment_status) === "paid";
      const names = (Array.isArray(before?.order_items) ? before!.order_items : [])
        .map((it: any) => `• ${it.product_name} ×${it.quantity}`).join("\n");
      const money = paid
        ? `💰 *Refund timeline*\n• Amount: ₹${before?.total}\n• Initiated: today\n• Bank credit: 5–7 working days to your original payment method\n• You'll get a WhatsApp + email update the moment it's processed`
        : "💳 *No charge* — nothing was taken for this order, so there is no refund to process.";
      await sayButtons(
        `❌ *Order #${before?.order_number ?? ""} cancelled* — all items cancelled:\n${names || "_all items_"}\n\n${money}\n\n📲 *Next steps*\n• Track refund status under 📦 *My Orders* here on WhatsApp\n• Or check it on ${SITE}/orders\n• Need it faster? Tap *Contact support*\n\n🌿 You can purchase anytime, we're always here for you!`,
        [
          { id: "orders", title: "📦 My Orders" },
          { id: "support", title: "💬 Contact support" },
          { id: "menu", title: L("keep_shopping").slice(0, 20) },
        ],
      );
    } else {
      await sayButtons(
        `😔 ${res.reason || "This order can no longer be cancelled."}\n\n🔒 Self-cancel is closed at this stage, but our team can still help you right away.`,
        [{ id: "support", title: "💬 Contact support" }, { id: "orders", title: "📦 My Orders" }],
      );
    }
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
      await afterCartChange(`🗑️ *Removed only this item:* ${item.name}\nYour other ${cart.length} item(s) are safe. 💳 Nothing has been charged yet.`);
      return true;
    }
    if (btn[1] === "qty+") {
      const stock = stockOf(item);
      if (stock != null && Number(item.qty) + 1 > stock) {
        await offerReplacement(item, stock);
        return true;
      }
    }
    item.qty = btn[1] === "qty+" ? Math.min(Number(item.qty) + 1, 99) : Number(item.qty) - 1;
    await saveCart();
    await afterCartChange(`✏️ *${item.name}* updated to × ${item.qty}. Everything else stays the same.`);
    return true;
  }

  if (raw.startsWith("cx:")) {
    const idx = parseInt(raw.slice(3), 10) - 1;
    const item = cart[idx];
    if (!item) { await showCart(); return true; }
    cart.splice(idx, 1);
    await saveCart();
    await afterCartChange(
      `🗑️ *Cancelled only this item:* ${item.name} ×${item.qty}\n${
        cart.length ? `✅ Your other ${cart.length} item(s) are safe.` : "🛒 Your cart is now empty."
      }\n💳 Nothing has been charged, so there is no refund to process.`,
    );
    return true;
  }

  if (await editCart()) return true;

  if (t0 === "editorder") { await showCartEditor(); return true; }
  if (t0 === "cancelorder") { await showCancelChooser(); return true; }
  if (t0 === "backconfirm") {
    if (mc.fromConfirm && cart.length) { await showOrderConfirm(); return true; }
    await startCheckout();
    return true;
  }
  if (t0 === "cancelall") { await confirmCancelAll(); return true; }
  if (t0 === "cancelallyes") { await doCancelAll(); return true; }


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
