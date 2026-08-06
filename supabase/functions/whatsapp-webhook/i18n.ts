// Language detection + phrasebook for the WhatsApp bot.
// Rule: the bot mirrors the customer. It switches language ONLY when the
// customer clearly writes in another language — never on its own.

export type Lang = "en" | "hi" | "mr";

const MARATHI_MARKERS = [
  "आहे", "आहेत", "काय", "पाहिजे", "मला", "तुम्ही", "नाही", "किती", "कसे", "धन्यवाद",
  "kasa", "kase", "aahe", "pahije", "kiti", "tumhi", "majha", "mala pahije", "nahi",
];

const HINDI_MARKERS = [
  "है", "हैं", "क्या", "चाहिए", "मुझे", "आप", "नहीं", "कितना", "कैसे", "धन्यवाद", "कृपया",
  "kya", "chahiye", "mujhe", "aap", "nahi", "kitna", "kaise", "bhai", "hai", "krpya", "kripya",
  "batao", "dedo", "chaiye", "karo", "bhejo", "kitne",
];

const DEVANAGARI = /[\u0900-\u097F]/;

/** Detect the language of an inbound message. Returns null when unsure. */
export function detectLang(text: string): Lang | null {
  const raw = (text || "").trim();
  if (raw.length < 2) return null;
  const t = raw.toLowerCase();

  // Pure numbers / button ids carry no language signal
  if (/^[\d\s+\-*x:.]+$/.test(t)) return null;

  const hasDev = DEVANAGARI.test(raw);
  const mrHits = MARATHI_MARKERS.filter((m) => t.includes(m)).length;
  const hiHits = HINDI_MARKERS.filter((m) => t.includes(m)).length;

  if (hasDev) {
    if (mrHits > hiHits) return "mr";
    return "hi";
  }
  if (mrHits > 0 && mrHits >= hiHits) return "mr";
  if (hiHits > 0) return "hi";

  // Latin script with plain English words → English
  if (/[a-z]{3,}/.test(t)) return "en";
  return null;
}

/** Resolve the language to reply in: switch only on a confident detection. */
export function resolveLang(stored: string | null | undefined, incoming: string): Lang {
  const current: Lang = (stored === "hi" || stored === "mr" || stored === "en") ? stored : "en";
  const detected = detectLang(incoming);
  return detected ?? current;
}

type Dict = Record<string, string>;

const EN: Dict = {
  welcome_title: "🌿 *Welcome to California Farms India!*",
  welcome_sub: "_Fresh Vegetables • Organic Products • Farm Fresh Fruits • Healthy Foods_",
  welcome_help: "How can I help you today?",
  welcome_hint: "_Tap a button below — or just type a product name._",
  browse_button: "🛍️ Browse categories",
  menu_sections: "Shop by category",
  back: "🔙 Back",
  menu: "🏠 Main menu",
  keep_shopping: "🛍️ Keep shopping",
  view_cart: "🛒 View cart",
  checkout: "✅ Checkout",
  add_to_cart: "🛒 Add to cart",
  wishlist: "❤️ Wishlist",
  choose_product: "Pick a product",
  products_in: "Products in",
  no_products: "😔 Nothing available in this category right now.",
  cart_empty: "🛒 Your cart is empty. Tap below to start shopping.",
  your_cart: "🛒 *Your Cart*",
  total: "Total",
  free_above: "🚚 FREE delivery above ₹399",
  edit_item: "✏️ Edit items",
  pick_item_to_edit: "Which item would you like to change?",
  add_one: "➕ Add one",
  remove_one: "➖ Remove one",
  remove_item: "🗑️ Remove item",
  clear_cart: "🗑️ Clear cart",
  cart_cleared: "🗑️ Cart cleared.",
  added: "✅ *Added to cart*",
  out_of_stock: "⛔ Currently unavailable",
  in_stock: "✅ In stock",
  few_left: "⚡ Only {n} left",
  you_may_like: "You may like:",
  ask_name: "🧾 *Checkout*\n\n👤 Please tell us your *full name*.",
  ask_phone: "📞 Please share your *10-digit phone number*.",
  ask_address: "📍 *Share your address* — tap 📎 (attach) → *Location* → *Send your current location*.\n\nOr simply type your full address with a landmark.",
  ask_pincode: "📮 Please share your *6-digit pincode*.",
  invalid_phone: "📞 That doesn't look right. Please send a valid 10-digit phone number.",
  invalid_pincode: "📮 Please send a valid 6-digit pincode.",
  ask_time: "⏰ Preferred *delivery time*?",
  saved_details: "📍 *Deliver to your saved address?*",
  confirm_details: "✅ Yes, deliver here",
  change_address: "✏️ Change address",
  share_location: "📍 Share location",
  order_summary: "📋 *Order Summary*",
  confirm_order: "✅ Confirm order",
  cancel: "🔙 Cancel",
  creating_order: "⏳ Creating your order…",
  pay_secure: "👉 Pay securely:",
  link_expires: "⏰ Link expires in 30 minutes.\nYour order confirms automatically after payment ✅",
  delivery_free: "🚚 Delivery: FREE 🎉",
  location_saved: "📍 *Address saved*",
  location_outside: "😔 Sorry — we don't deliver that far yet.",
  welcome_back: "👋 Welcome back, *{name}*!",
  resume_cart: "🛒 You still have {n} item(s) in your cart.",
  search_prompt: "🔍 Type the *product name* you're looking for.",
  found: "🔍 *Found {n} products*",
  no_match: "😔 No product matched *\"{q}\"*.",
  wishlist_empty: "❤️ Your wishlist is empty.",
  wishlist_title: "❤️ *Your Wishlist*",
  saved_to_wishlist: "❤️ *{name}* saved to your wishlist.",
  order_failed: "😔 Could not create your order. Please try again.",
  more: "➡️ More products",
};

const HI: Dict = {
  welcome_title: "🌿 *California Farms India में आपका स्वागत है!*",
  welcome_sub: "_ताज़ी सब्ज़ियाँ • ऑर्गेनिक उत्पाद • फार्म फ्रेश फल • हेल्दी फूड_",
  welcome_help: "आज मैं आपकी क्या मदद करूँ?",
  welcome_hint: "_नीचे बटन दबाएँ — या प्रोडक्ट का नाम टाइप करें।_",
  browse_button: "🛍️ कैटेगरी देखें",
  menu_sections: "कैटेगरी चुनें",
  back: "🔙 वापस",
  menu: "🏠 मुख्य मेन्यू",
  keep_shopping: "🛍️ और खरीदें",
  view_cart: "🛒 कार्ट देखें",
  checkout: "✅ ऑर्डर करें",
  add_to_cart: "🛒 कार्ट में डालें",
  wishlist: "❤️ विशलिस्ट",
  choose_product: "प्रोडक्ट चुनें",
  products_in: "प्रोडक्ट्स —",
  no_products: "😔 इस कैटेगरी में अभी कुछ उपलब्ध नहीं है।",
  cart_empty: "🛒 आपका कार्ट खाली है। नीचे टैप करके खरीदारी शुरू करें।",
  your_cart: "🛒 *आपका कार्ट*",
  total: "कुल",
  free_above: "🚚 ₹399 से ऊपर डिलीवरी फ्री",
  edit_item: "✏️ आइटम बदलें",
  pick_item_to_edit: "कौन सा आइटम बदलना है?",
  add_one: "➕ एक और",
  remove_one: "➖ एक कम",
  remove_item: "🗑️ हटाएँ",
  clear_cart: "🗑️ कार्ट खाली करें",
  cart_cleared: "🗑️ कार्ट खाली कर दिया गया।",
  added: "✅ *कार्ट में जोड़ा गया*",
  out_of_stock: "⛔ फिलहाल उपलब्ध नहीं",
  in_stock: "✅ स्टॉक में",
  few_left: "⚡ सिर्फ़ {n} बचे हैं",
  you_may_like: "ये भी देखें:",
  ask_name: "🧾 *चेकआउट*\n\n👤 कृपया अपना *पूरा नाम* बताएँ।",
  ask_phone: "📞 कृपया अपना *10 अंकों का मोबाइल नंबर* भेजें।",
  ask_address: "📍 *अपना पता भेजें* — 📎 (अटैच) दबाएँ → *Location* → *Send your current location*।\n\nया अपना पूरा पता लैंडमार्क के साथ टाइप करें।",
  ask_pincode: "📮 कृपया अपना *6 अंकों का पिनकोड* भेजें।",
  invalid_phone: "📞 यह नंबर सही नहीं लग रहा। कृपया 10 अंकों का नंबर भेजें।",
  invalid_pincode: "📮 कृपया सही 6 अंकों का पिनकोड भेजें।",
  ask_time: "⏰ डिलीवरी का पसंदीदा समय?",
  saved_details: "📍 *क्या इसी सेव किए पते पर डिलीवरी करें?*",
  confirm_details: "✅ हाँ, यहीं भेजें",
  change_address: "✏️ पता बदलें",
  share_location: "📍 लोकेशन भेजें",
  order_summary: "📋 *ऑर्डर सारांश*",
  confirm_order: "✅ ऑर्डर कन्फर्म करें",
  cancel: "🔙 रद्द करें",
  creating_order: "⏳ आपका ऑर्डर बन रहा है…",
  pay_secure: "👉 सुरक्षित भुगतान करें:",
  link_expires: "⏰ लिंक 30 मिनट में समाप्त हो जाएगा।\nभुगतान के बाद ऑर्डर अपने आप कन्फर्म ✅",
  delivery_free: "🚚 डिलीवरी: फ्री 🎉",
  location_saved: "📍 *पता सेव हो गया*",
  location_outside: "😔 माफ़ कीजिए — हम इतनी दूर डिलीवरी नहीं करते।",
  welcome_back: "👋 वापसी पर स्वागत है, *{name}*!",
  resume_cart: "🛒 आपके कार्ट में अभी भी {n} आइटम हैं।",
  search_prompt: "🔍 जिस प्रोडक्ट को खोज रहे हैं उसका *नाम* टाइप करें।",
  found: "🔍 *{n} प्रोडक्ट मिले*",
  no_match: "😔 *\"{q}\"* से कोई प्रोडक्ट नहीं मिला।",
  wishlist_empty: "❤️ आपकी विशलिस्ट खाली है।",
  wishlist_title: "❤️ *आपकी विशलिस्ट*",
  saved_to_wishlist: "❤️ *{name}* विशलिस्ट में सेव हो गया।",
  order_failed: "😔 ऑर्डर नहीं बन पाया। कृपया दोबारा कोशिश करें।",
  more: "➡️ और प्रोडक्ट",
};

const MR: Dict = {
  ...HI,
  welcome_title: "🌿 *California Farms India मध्ये आपले स्वागत आहे!*",
  welcome_sub: "_ताज्या भाज्या • सेंद्रिय उत्पादने • फार्म फ्रेश फळे • आरोग्यदायी पदार्थ_",
  welcome_help: "आज मी तुमची कशी मदत करू?",
  welcome_hint: "_खालील बटण दाबा — किंवा उत्पादनाचे नाव टाइप करा._",
  browse_button: "🛍️ कॅटेगरी पहा",
  menu_sections: "कॅटेगरी निवडा",
  back: "🔙 मागे",
  menu: "🏠 मुख्य मेनू",
  keep_shopping: "🛍️ अजून खरेदी",
  view_cart: "🛒 कार्ट पहा",
  checkout: "✅ ऑर्डर करा",
  add_to_cart: "🛒 कार्टमध्ये टाका",
  choose_product: "उत्पादन निवडा",
  no_products: "😔 या कॅटेगरीत सध्या काही उपलब्ध नाही.",
  cart_empty: "🛒 तुमचे कार्ट रिकामे आहे. खाली टॅप करून खरेदी सुरू करा.",
  your_cart: "🛒 *तुमचे कार्ट*",
  total: "एकूण",
  ask_name: "🧾 *चेकआउट*\n\n👤 कृपया तुमचे *पूर्ण नाव* सांगा.",
  ask_phone: "📞 कृपया तुमचा *10 अंकी मोबाइल नंबर* पाठवा.",
  ask_address: "📍 *तुमचा पत्ता पाठवा* — 📎 (attach) दाबा → *Location* → *Send your current location*.\n\nकिंवा लँडमार्कसह पूर्ण पत्ता टाइप करा.",
  ask_pincode: "📮 कृपया तुमचा *6 अंकी पिनकोड* पाठवा.",
  saved_details: "📍 *सेव्ह केलेल्या पत्त्यावर डिलिव्हरी करू?*",
  confirm_details: "✅ हो, इथेच पाठवा",
  change_address: "✏️ पत्ता बदला",
  share_location: "📍 लोकेशन पाठवा",
  order_summary: "📋 *ऑर्डर सारांश*",
  confirm_order: "✅ ऑर्डर निश्चित करा",
  cancel: "🔙 रद्द करा",
  welcome_back: "👋 पुन्हा स्वागत आहे, *{name}*!",
};

const DICTS: Record<Lang, Dict> = { en: EN, hi: HI, mr: MR };

export function t(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  let s = DICTS[lang]?.[key] ?? EN[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
  }
  return s;
}

/** Language names for the manual switcher */
export const LANG_LABELS: Record<Lang, string> = {
  en: "English",
  hi: "हिंदी",
  mr: "मराठी",
};
