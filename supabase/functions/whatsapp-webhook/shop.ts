// Premium menu-driven WhatsApp shopping engine for California Farms India
// Deterministic, low-scroll, category-first navigation. Falls back to AI only
// when the message is genuinely conversational.

export type Product = Record<string, any>;

export interface ShopCtx {
  phone: string;
  text: string;
  buttonId?: string | null;
  conversation: Record<string, any>;
  products: Product[];
  sendText: (to: string, text: string) => Promise<unknown>;
  sendImage: (to: string, imageUrl: string, caption: string) => Promise<unknown>;
  sendButtons: (to: string, body: string, buttons: Array<{ id: string; title: string }>) => Promise<unknown>;
  updateConversation: (phone: string, updates: Record<string, unknown>) => Promise<void>;
  log: (phone: string, direction: string, text: string) => Promise<void>;
  createOrder: (phone: string, conversation: Record<string, any>) => Promise<any>;
}

const SITE = "https://zomical.com";
const PAGE_SIZE = 6;

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
  // Powders win over their raw category (e.g. Turmeric Powder in "spices")
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

// ─── Dynamic menu ───
interface MenuEntry { n: number; key: string; label: string; emoji: string }

function buildMenuEntries(products: Product[]): MenuEntry[] {
  const entries: MenuEntry[] = [];
  let n = 1;
  for (const def of CATEGORY_DEFS) {
    if (products.some((p) => categoryKeyOf(p) === def.key)) {
      entries.push({ n: n++, key: def.key, label: def.label, emoji: def.emoji });
    }
  }
  entries.push({ n: n++, key: "bestsellers", label: "Best Sellers", emoji: "⭐" });
  if (products.some((p) => discountPct(p) > 0)) {
    entries.push({ n: n++, key: "offers", label: "Today's Offers", emoji: "🔥" });
  }
  entries.push({ n: n++, key: "search", label: "Search Product", emoji: "🔍" });
  entries.push({ n: n++, key: "cart", label: "My Cart", emoji: "🛒" });
  return entries;
}

const NUM_EMOJI = ["0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
const numIcon = (n: number) => NUM_EMOJI[n] ?? `${n}.`;

function welcomeText(products: Product[]): string {
  const lines = [
    "🌿 *Welcome to California Farms India!*",
    "_Fresh Vegetables • Organic Products • Farm Fresh Fruits • Healthy Foods_",
    "",
    "How can I help you today?",
    "",
  ];
  for (const e of buildMenuEntries(products)) {
    lines.push(`${numIcon(e.n)} ${e.emoji} ${e.label}`);
  }
  lines.push("", "_Reply with a number or simply type the product name._");
  return lines.join("\n");
}

function productsFor(key: string, products: Product[]): Product[] {
  if (key === "bestsellers") {
    const best = products.filter((p) => p.is_bestseller);
    return (best.length ? best : products).slice(0, 12);
  }
  if (key === "offers") {
    return products.filter((p) => discountPct(p) > 0);
  }
  return products.filter((p) => categoryKeyOf(p) === key);
}

function catMeta(key: string) {
  if (key === "bestsellers") return { label: "Top Selling Products", emoji: "⭐" };
  if (key === "offers") return { label: "Today's Offers", emoji: "🔥" };
  const def = CATEGORY_DEFS.find((d) => d.key === key);
  return { label: def?.label ?? "Products", emoji: def?.emoji ?? "🌿" };
}

function listText(key: string, list: Product[], page: number): string {
  const meta = catMeta(key);
  const start = page * PAGE_SIZE;
  const slice = list.slice(start, start + PAGE_SIZE);
  const lines: string[] = [`${meta.emoji} *${meta.label}*`];
  if (key === "offers") lines.push(`🔥 Up to ${Math.max(...list.map(discountPct))}% OFF — today only`);
  lines.push("");
  slice.forEach((p, i) => {
    const eff = effectivePrice(p);
    const price = eff !== Number(p.price) ? `₹${eff} ~₹${p.price}~` : `₹${eff}`;
    const tag = !inStock(p) ? " ⛔ out of stock" : Number(p.stock_quantity) <= 5 && p.stock_quantity != null ? " ⚡ few left" : "";
    lines.push(`*${start + i + 1}.* ${p.name}`);
    lines.push(`    ${price} / ${p.unit}${tag}`);
  });
  lines.push("");
  lines.push("👉 Type the *product number* for details.");
  if (start + PAGE_SIZE < list.length) lines.push("➡️ Type *NEXT* for more products.");
  lines.push("🔙 Type *MENU* to go back.");
  return lines.join("\n");
}

function productCard(p: Product): string {
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

  if (p.stock_quantity == null) lines.push("\n✅ In stock");
  else if (Number(p.stock_quantity) <= 0) lines.push("\n⛔ Currently unavailable");
  else if (Number(p.stock_quantity) <= 5) lines.push(`\n⚡ Only ${p.stock_quantity} left`);
  else lines.push("\n✅ In stock • Freshly packed");

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

// ─── Main handler ───
export async function handleShopMessage(ctx: ShopCtx): Promise<boolean> {
  const { phone, products, conversation } = ctx;
  const raw = (ctx.buttonId || ctx.text || "").trim();
  const t = raw.toLowerCase();
  const mc: Record<string, any> = (conversation.menu_context as Record<string, any>) || {};
  const cart: any[] = Array.isArray(conversation.cart) ? [...conversation.cart] : [];
  const state = String(conversation.conversation_state || "idle");

  const say = async (text: string) => { await ctx.sendText(phone, text); await ctx.log(phone, "outbound", text); };
  const sayButtons = async (text: string, btns: Array<{ id: string; title: string }>) => {
    await ctx.sendButtons(phone, text, btns); await ctx.log(phone, "outbound", text);
  };
  const setMc = (next: Record<string, any>) => ctx.updateConversation(phone, { menu_context: next });

  const showMenu = async () => {
    await setMc({ view: "menu" });
    await say(welcomeText(products));
  };

  const showList = async (key: string, page: number) => {
    const list = productsFor(key, products);
    if (!list.length) {
      await say("😔 No products in this category right now.\n\nType *MENU* to see other categories.");
      return;
    }
    const maxPage = Math.floor((list.length - 1) / PAGE_SIZE);
    const p = Math.min(Math.max(page, 0), maxPage);
    await setMc({ view: "list", key, page: p, ids: list.map((x) => x.id) });
    await say(listText(key, list, p));
  };

  const showProduct = async (product: Product) => {
    await setMc({ view: "product", productId: product.id, back: mc.view === "list" ? { key: mc.key, page: mc.page } : null });
    const caption = productCard(product);
    const img = productImage(product);
    if (img) { await ctx.sendImage(phone, img, caption); await ctx.log(phone, "outbound", caption); }
    else await say(caption);

    if (!inStock(product)) {
      const alts = similarTo(product, products);
      if (alts.length) {
        await say(`⛔ *${product.name}* is out of stock right now.\n\nYou may like:\n${alts.map((a, i) => `${i + 1}. ${a.name} — ₹${effectivePrice(a)}/${a.unit}`).join("\n")}\n\nType the number to view.`);
        await setMc({ view: "list", key: categoryKeyOf(product), page: 0, ids: alts.map((a) => a.id) });
        return;
      }
    }
    await sayButtons("What would you like to do?", [
      { id: `add:${product.id}`, title: "🛒 Add to Cart" },
      { id: `wish:${product.id}`, title: "❤️ Wishlist" },
      { id: "back", title: "🔙 Back" },
    ]);
  };

  const showCart = async (prefix?: string) => {
    if (!cart.length) {
      await setMc({ view: "cart", ids: [] });
      await say(`${prefix ? prefix + "\n\n" : ""}🛒 Your cart is empty.\n\nType *MENU* to start shopping.`);
      return;
    }
    const { text, total } = cartLines(cart, true);
    await setMc({ view: "cart", ids: cart.map((c) => c.product_id ?? c.name) });
    await sayButtons(
      `${prefix ? prefix + "\n\n" : ""}🛒 *Your Cart*\n${text}\n\n💰 *Total: ₹${total}*\n🚚 FREE delivery above ₹399\n\n✏️ *Edit your cart*\n• *+1* / *-1* → change qty of item 1\n• *1 x3* → set item 1 quantity to 3\n• *REMOVE 1* → remove item 1\n• *CLEAR* → empty the cart`,
      [{ id: "menu", title: "🛍️ Keep Shopping" }, { id: "checkout", title: "✅ Checkout" }],
    );
  };

  const saveCart = async () => {
    await ctx.updateConversation(phone, { cart });
    conversation.cart = cart;
  };

  const addToCart = async (product: Product) => {
    if (!inStock(product)) {
      const alts = similarTo(product, products);
      await say(`⛔ *${product.name}* is out of stock.${alts.length ? `\n\nTry: ${alts.map((a) => a.name).join(", ")}` : ""}`);
      return;
    }
    const idx = cart.findIndex((c) => norm(c.name) === norm(product.name));
    if (idx >= 0) cart[idx].qty += 1;
    else cart.push({ name: product.name, qty: 1, price: effectivePrice(product), unit: product.unit, product_id: product.id });
    await saveCart();
    await showCart("✅ *Added to Cart*");
  };

  // Cart editing: qty change / removal
  const editCart = async (): Promise<boolean> => {
    const clean = t.replace(/\s+/g, " ").trim();

    if (["clear", "empty cart", "clear cart", "remove all"].includes(clean)) {
      if (!cart.length) { await showCart(); return true; }
      cart.length = 0;
      await saveCart();
      await say("🗑️ Cart cleared.\n\nType *MENU* to start shopping again.");
      return true;
    }

    const resolve = (n: number) => (n >= 1 && n <= cart.length ? n - 1 : -1);

    // REMOVE 2 / DELETE 2 / REMOVE tomato
    let m = clean.match(/^(?:remove|delete|del)\s+(.+)$/);
    if (m) {
      const arg = m[1].trim();
      let idx = /^\d+$/.test(arg) ? resolve(parseInt(arg, 10)) : cart.findIndex((c) => norm(c.name).includes(arg));
      if (idx < 0) { await say("❓ I couldn't find that item in your cart. Check the numbers above."); return true; }
      const [removed] = cart.splice(idx, 1);
      await saveCart();
      await showCart(`🗑️ *${removed.name}* removed from your cart.`);
      return true;
    }

    // "1 x3" / "1 = 3" / "1 qty 3"
    m = clean.match(/^(\d+)\s*(?:x|\*|=|qty|quantity)\s*(\d+)$/);
    if (m) {
      const idx = resolve(parseInt(m[1], 10));
      const qty = parseInt(m[2], 10);
      if (idx < 0) { await say("❓ That item number isn't in your cart."); return true; }
      if (qty <= 0) {
        const [removed] = cart.splice(idx, 1);
        await saveCart();
        await showCart(`🗑️ *${removed.name}* removed from your cart.`);
        return true;
      }
      cart[idx].qty = Math.min(qty, 99);
      await saveCart();
      await showCart(`✏️ *${cart[idx].name}* quantity set to ${cart[idx].qty}.`);
      return true;
    }

    // "+1" / "-2" / "1+" / "1-"
    m = clean.match(/^([+-])\s*(\d+)$/) || clean.match(/^(\d+)\s*([+-])$/);
    if (m) {
      const sign = /[+-]/.test(m[1]) ? m[1] : m[2];
      const num = /[+-]/.test(m[1]) ? m[2] : m[1];
      const idx = resolve(parseInt(num, 10));
      if (idx < 0) { await say("❓ That item number isn't in your cart."); return true; }
      const next = Number(cart[idx].qty) + (sign === "+" ? 1 : -1);
      if (next <= 0) {
        const [removed] = cart.splice(idx, 1);
        await saveCart();
        await showCart(`🗑️ *${removed.name}* removed from your cart.`);
        return true;
      }
      cart[idx].qty = Math.min(next, 99);
      await saveCart();
      await showCart(`✏️ *${cart[idx].name}* × ${cart[idx].qty}.`);
      return true;
    }

    return false;
  };


  // ── Checkout collection flow ──
  if (state.startsWith("co_")) {
    if (t === "menu" || t === "cancel") {
      await ctx.updateConversation(phone, { conversation_state: "idle" });
      await showMenu();
      return true;
    }
    if (state === "co_name") {
      await ctx.updateConversation(phone, { delivery_name: raw, conversation_state: "co_phone" });
      await say(`Thanks *${raw}* 🙏\n\n📞 Please share your *10-digit phone number*.`);
      return true;
    }
    if (state === "co_phone") {
      const digits = raw.replace(/\D/g, "").slice(-10);
      if (digits.length !== 10) { await say("📞 Please send a valid 10-digit phone number."); return true; }
      await ctx.updateConversation(phone, { delivery_phone: digits, conversation_state: "co_address" });
      await say("📍 Please share your *full delivery address* (with landmark).");
      return true;
    }
    if (state === "co_address") {
      await ctx.updateConversation(phone, { delivery_address: raw, conversation_state: "co_pincode" });
      await say("📮 Please share your *6-digit pincode*.");
      return true;
    }
    if (state === "co_pincode") {
      const pin = raw.replace(/\D/g, "");
      if (pin.length !== 6) { await say("📮 Please send a valid 6-digit pincode."); return true; }
      await ctx.updateConversation(phone, { delivery_pincode: pin, conversation_state: "co_time" });
      await sayButtons("⏰ Preferred *delivery time*?", [
        { id: "time:Morning 8-11 AM", title: "Morning 8-11" },
        { id: "time:Noon 12-3 PM", title: "Noon 12-3" },
        { id: "time:Evening 4-7 PM", title: "Evening 4-7" },
      ]);
      return true;
    }
    if (state === "co_time") {
      const slot = raw.startsWith("time:") ? raw.slice(5) : raw;
      const baseAddr = String(conversation.delivery_address || "").replace(/\s*\|\s*Preferred time:.*$/, "");
      const addrWithTime = `${baseAddr} | Preferred time: ${slot}`;
      const conv = { ...conversation, delivery_address: addrWithTime };
      conversation.delivery_address = addrWithTime;
      await ctx.updateConversation(phone, { delivery_address: addrWithTime, conversation_state: "co_confirm" });
      const { text, total } = cartLines(cart);

      await sayButtons(
        `📋 *Order Summary*\n${text}\n\n💰 Items: ₹${total}\n👤 ${conv.delivery_name}\n📞 ${conv.delivery_phone}\n📍 ${baseAddr}\n⏰ ${slot}\n\n💳 Payment: *UPI / Card / Netbanking* (secure online link)`,
        [{ id: "confirm", title: "✅ Confirm Order" }, { id: "menu", title: "🔙 Cancel" }],
      );
      return true;
    }
    if (state === "co_confirm") {
      if (t === "confirm" || t === "yes" || t === "ok") {
        await say("⏳ Creating your order…");
        try {
          const result = await ctx.createOrder(phone, conversation);
          if (result) {
            const del = result.deliveryCharge > 0 ? `\n🚚 Delivery (${result.distanceKm} km): ₹${result.deliveryCharge}` : "\n🚚 Delivery: FREE 🎉";
            await say(`💳 *Order #${result.orderNumber}*\n\n🛒 Subtotal: ₹${result.subtotal}${del}\n💰 *Total: ₹${result.total}*\n\n👉 Pay securely: ${result.paymentUrl}\n\n⏰ Link expires in 30 minutes.\nOrder confirms automatically after payment ✅`);
          }
        } catch (e: any) {
          await say(`😔 ${e?.message?.includes("Delivery not available") ? e.message : "Could not create your order. Please try again."}\n\nType *MENU* to restart.`);
          await ctx.updateConversation(phone, { conversation_state: "idle" });
        }
        return true;
      }
      await showMenu();
      await ctx.updateConversation(phone, { conversation_state: "idle" });
      return true;
    }
  }

  // ── Global commands ──
  if (["hi", "hello", "hey", "menu", "start", "namaste", "hii", "home", "0"].includes(t)) {
    await showMenu();
    return true;
  }

  if (t === "cart" || t === "my cart" || t === "view cart" || t === "edit cart") { await showCart(); return true; }

  // Cart edits (qty change / remove / clear)
  if (await editCart()) return true;

  if (t === "checkout" || t === "buy now" || t === "place order") {
    if (!cart.length) { await say("🛒 Your cart is empty. Type *MENU* to start shopping."); return true; }
    await ctx.updateConversation(phone, { conversation_state: "co_name" });
    await say("🧾 *Checkout*\n\n👤 Please share your *full name*.");
    return true;
  }

  if (t === "wishlist") {
    const wl: any[] = Array.isArray(conversation.wishlist) ? conversation.wishlist : [];
    if (!wl.length) { await say("❤️ Your wishlist is empty."); return true; }
    await say(`❤️ *Your Wishlist*\n${wl.map((w, i) => `${i + 1}. ${w.name} — ₹${w.price}`).join("\n")}\n\nType *MENU* to shop.`);
    return true;
  }

  // Button actions
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
      await say(`❤️ *${p.name}* saved to your wishlist.\n\nType *MENU* to keep shopping.`);
      return true;
    }
  }
  if (t === "back") {
    if (mc.back?.key) { await showList(mc.back.key, mc.back.page || 0); return true; }
    await showMenu();
    return true;
  }
  if (t === "next" || t === "more") {
    if (mc.view === "list" && mc.key) { await showList(mc.key, (mc.page || 0) + 1); return true; }
    await showMenu();
    return true;
  }
  if (t === "prev" || t === "previous") {
    if (mc.view === "list" && mc.key) { await showList(mc.key, Math.max((mc.page || 0) - 1, 0)); return true; }
  }

  // Numeric selection
  if (/^\d{1,2}$/.test(t)) {
    const n = parseInt(t, 10);
    if (mc.view === "cart" && cart.length) {
      const item = cart[n - 1];
      if (item) {
        await sayButtons(
          `🛒 *${item.name}*\n₹${item.price} / ${item.unit} × ${item.qty} = ₹${Number(item.price) * Number(item.qty)}\n\nChange this item:`,
          [
            { id: `qty+:${n}`, title: "➕ Add one" },
            { id: `qty-:${n}`, title: "➖ Remove one" },
            { id: `rm:${n}`, title: "🗑️ Remove item" },
          ],
        );
        return true;
      }
    }
    if (mc.view === "list" && Array.isArray(mc.ids)) {
      const id = mc.ids[n - 1];
      const p = products.find((x) => x.id === id);
      if (p) { await showProduct(p); return true; }
      await say("Please type a valid product number from the list above, or *MENU*.");
      return true;
    }
    // Menu selection
    const entry = buildMenuEntries(products).find((e) => e.n === n);
    if (entry) {
      if (entry.key === "search") {
        await setMc({ view: "search" });
        await say("🔍 Type the *product name* you're looking for.");
        return true;
      }
      if (entry.key === "cart") { await showCart(); return true; }
      await showList(entry.key, 0);
      return true;
    }
    await showMenu();
    return true;
  }

  // Category name typed directly
  const catByName = CATEGORY_DEFS.find((d) => t === norm(d.label) || t === d.key);
  if (catByName) { await showList(catByName.key, 0); return true; }
  if (t.includes("offer") || t.includes("discount") || t.includes("sale")) { await showList("offers", 0); return true; }
  if (t.includes("best sell") || t === "bestsellers" || t.includes("popular")) { await showList("bestsellers", 0); return true; }

  // Product search (typed name)
  if (t.length >= 3) {
    const matches = products.filter((p) => norm(p.name).includes(t) || t.includes(norm(p.name)));
    if (matches.length === 1) { await showProduct(matches[0]); return true; }
    if (matches.length > 1) {
      await setMc({ view: "list", key: "search", page: 0, ids: matches.map((m) => m.id) });
      const lines = [`🔍 *Found ${matches.length} products*`, ""];
      matches.slice(0, PAGE_SIZE).forEach((m, i) => {
        lines.push(`*${i + 1}.* ${m.name}`);
        lines.push(`    ₹${effectivePrice(m)} / ${m.unit}`);
      });
      lines.push("", "👉 Type the number for details.", "🔙 Type *MENU* to go back.");
      await say(lines.join("\n"));
      return true;
    }
    if (mc.view === "search") {
      const alt = products.slice(0, 3).map((p) => `• ${p.name} — ₹${effectivePrice(p)}/${p.unit}`).join("\n");
      await say(`😔 No product matched *"${raw}"*.\n\nYou may like:\n${alt}\n\nType *MENU* for all categories.`);
      return true;
    }
  }

  return false; // let the AI handle free-form conversation
}

export { SITE };
