import { malaysiaDateAfter, shops } from './data.mjs';

const tamilPattern = /[\u0B80-\u0BFF]/u;
const malayWords = /\b(boleh|tempah|esok|petang|ada|nak|saya|kamu|hari)\b/i;
const bookingWords = /\b(book|confirm|tempah|booking|reserve|take)\b/i;
const slotWords = /\b(slot|available|availability|free|open|appointment|tempah|book)\b/i;
const explicitSlotWords = /\b(slot|available|availability|free|open|appointment)\b/i;
const uncertainWords = /\b(refund|law|legal|complaint|angry|human|owner|boss|price quote|invoice)\b/i;
const tomorrowWords = /\b(tomorrow|esok|நாளை)\b/i;
const eveningWords = /\b(evening|petang|மாலை)\b/i;
const unsupportedActionWords = /\b(recorded|booked|confirmed|reserved|direkodkan|disahkan|ditempah|உறுதி)\b/i;
const negatedActionWords = /(\b(no|not|never|tiada|tidak|belum)\b[\s\p{L}]{0,50}\b(recorded|booked|confirmed|reserved|direkodkan|disahkan|ditempah)\b|\b(recorded|booked|confirmed|reserved|direkodkan|disahkan|ditempah)\b[\s\p{L}]{0,30}\b(no|not|tiada|tidak|இல்லை)\b|உறுதி\s*செய்யப்படவில்லை)/giu;
const contextRefusalWords = /(don.?t have access|do not have access|no access|real information|நிஜமான தகவல் இல்லை)/i;

export function detectLanguage(text) {
  if (tamilPattern.test(text)) return 'ta';
  if (malayWords.test(text)) return 'ms';
  return 'en';
}

function sameLanguageText(lang, key, values = {}) {
  const messages = {
    greeting: {
      ta: `வணக்கம்! ${values.shop} dummy demo assistant. நான் எப்படி உதவலாம்?`,
      ms: `Hai! Ini assistant demo dummy untuk ${values.shop}. Apa boleh saya bantu?`,
      en: `Hi! This is the dummy demo assistant for ${values.shop}. How can I help?`
    },
    slots: {
      ta: `${values.shop} க்கான அடுத்த dummy slots: ${values.slots}. ஒன்றைத் தேர்ந்தெடுத்தால் demo booking செய்கிறேன்.`,
      ms: `Slot dummy seterusnya untuk ${values.shop}: ${values.slots}. Pilih satu dan saya akan buat demo booking.`,
      en: `Next dummy slots for ${values.shop}: ${values.slots}. Pick one and I will make a demo booking.`
    },
    noSlots: {
      ta: `${values.shop} க்கு நாளை மாலை dummy slot இல்லை. அடுத்த dummy slots: ${values.slots}.`,
      ms: `Tiada slot dummy petang esok untuk ${values.shop}. Slot dummy seterusnya: ${values.slots}.`,
      en: `No dummy evening slot tomorrow for ${values.shop}. Next dummy slots: ${values.slots}.`
    },
    booked: {
      ta: `Demo booking உறுதி செய்யப்பட்டது: ${values.shop}, ${values.slot}. இது dummy data மட்டும்; உண்மையான கடை அறிவிப்பு இல்லை.`,
      ms: `Demo booking disahkan: ${values.shop}, ${values.slot}. Ini dummy data sahaja; tiada notifikasi kedai sebenar.`,
      en: `Demo booking confirmed: ${values.shop}, ${values.slot}. This is dummy data only; no real shop was notified.`
    },
    bookingBlocked: {
      ta: 'Booking engine record இல்லை, அதனால் booking உறுதி செய்ய முடியாது. Dummy slot ஒன்றை முதலில் தேர்ந்தெடுக்கவும்.',
      ms: 'Rekod booking engine tiada, jadi booking tidak boleh disahkan. Pilih satu slot dummy dahulu.',
      en: 'There is no booking-engine record, so I cannot confirm a booking. Pick a dummy slot first.'
    },
    modelBlocked: {
      ta: 'Model பதிலில் ஆதாரம் இல்லாத booking claim இருந்தது; demo அதை block செய்தது. Booking engine record இல்லாமல் உறுதி சொல்ல மாட்டேன்.',
      ms: 'Jawapan model membuat tuntutan booking tanpa sokongan; demo menyekatnya. Saya tidak akan sahkan tanpa rekod booking engine.',
      en: 'The model reply made an unsupported booking claim; the demo blocked it. I will not confirm without a booking-engine record.'
    },
    modelContextBlocked: {
      ta: `Model பதிலு fake inventory ஐ பயன்படுத்தவில்லை; demo authoritative slots ஐ பயன்படுத்துகிறது: ${values.slots}.`,
      ms: `Jawapan model tidak menggunakan fake inventory; demo menggunakan slot authoritative: ${values.slots}.`,
      en: `The model reply ignored the fake inventory; the demo uses the authoritative slots: ${values.slots}.`
    },
    handoff: {
      ta: 'இதை நான் யூகிக்க விரும்பவில்லை. Owner உங்களுக்கு பதில் சொல்வார். Demo handoff only.',
      ms: 'Saya tidak mahu meneka perkara ini. Owner akan jawab. Demo handoff sahaja.',
      en: 'I do not want to guess this. The owner will answer. Demo handoff only.'
    },
    hours: {
      ta: `${values.shop} dummy opening hours: ${values.hours}.`,
      ms: `Waktu operasi dummy ${values.shop}: ${values.hours}.`,
      en: `${values.shop} dummy opening hours: ${values.hours}.`
    }
  };
  return messages[key][lang] || messages[key].en;
}

export function formatSlot(iso) {
  return new Intl.DateTimeFormat('en-MY', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kuala_Lumpur' }).format(new Date(iso));
}

export function selectShop(text, state = {}) {
  const lower = text.toLowerCase();
  const namedShop = shops.find((shop) => shop.name.toLowerCase().split(/\s+/).some((part) => lower.includes(part)));
  if (namedShop) return namedShop;
  if (state.shopId) return shops.find((shop) => shop.id === state.shopId);
  return shops[0];
}

function malaysiaHour(iso) {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', hour12: false }).format(new Date(iso)));
}

function malaysiaDate(iso) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
}

export function createBookingState() {
  return { records: [] };
}

export function isSlotBooked(bookingState, shopId, slot) {
  return (bookingState?.records || []).some((record) => record.shopId === shopId && record.slot === slot);
}

export function availableSlots(shop, bookingState = createBookingState()) {
  return shop.slots.filter((slot) => !isSlotBooked(bookingState, shop.id, slot));
}

export function persistDummyBooking(bookingState, shop, slot, now = new Date()) {
  if (!shop.slots.includes(slot)) {
    return { ok: false, reason: 'slot-not-in-fake-inventory', bookingState };
  }
  if (isSlotBooked(bookingState, shop.id, slot)) {
    return { ok: false, reason: 'slot-already-booked', bookingState };
  }
  const record = {
    id: `dummy-${shop.id}-${bookingState.records.length + 1}`,
    shopId: shop.id,
    slot,
    createdAt: now.toISOString(),
    dummy: true
  };
  bookingState.records.push(record);
  return { ok: true, booking: record, bookingState };
}

export function matchingSlots(text, shop, now = new Date(), bookingState = createBookingState()) {
  let matches = availableSlots(shop, bookingState);
  if (tomorrowWords.test(text)) {
    const tomorrow = malaysiaDateAfter(1, now);
    matches = matches.filter((slot) => malaysiaDate(slot) === tomorrow);
  }
  if (eveningWords.test(text)) {
    matches = matches.filter((slot) => {
      const hour = malaysiaHour(slot);
      return hour >= 17 && hour < 21;
    });
  }
  return matches;
}

export function buildLanguagePrompt(customerText, shop, bookingState = createBookingState(), now = new Date()) {
  const inventory = availableSlots(shop, bookingState).map((slot) => ({ iso: slot, label: formatSlot(slot) }));
  const bookingRecord = (bookingState.records || []).filter((record) => record.shopId === shop.id).at(-1) || null;
  return {
    model: 'meta-models/muse-spark-open-1026',
    reasoning_effort: 'low',
    tool_choice: 'none',
    messages: [
      {
        role: 'system',
        content: [
          'You are only the language component of a dummy hackathon demo.',
          'The deterministic booking engine is authoritative for availability and booking state.',
          'Use only FAKE_INVENTORY for availability.',
          'Never say a booking is recorded, confirmed, booked or reserved unless BOOKING_RECORD is present.',
          'Say this is dummy data only. Reply in the customer language in one sentence.'
        ].join(' ')
      },
      {
        role: 'user',
        content: JSON.stringify({
          customer_message: customerText,
          current_malaysia_date: malaysiaDateAfter(0, now),
          shop: { id: shop.id, name: shop.name, hours: shop.hours },
          fake_inventory: inventory,
          booking_record: bookingRecord
        })
      }
    ]
  };
}

export function hasUnsupportedBookingClaim(reply) {
  const withoutNegatedClaims = reply.replace(negatedActionWords, ' ');
  return unsupportedActionWords.test(withoutNegatedClaims);
}

export function guardModelReply(reply, context) {
  const lang = context.lang || 'en';
  if (hasUnsupportedBookingClaim(reply) && !context.bookingRecord) {
    return { allowed: false, reason: 'unsupported-booking-claim', reply: sameLanguageText(lang, 'modelBlocked') };
  }
  if (contextRefusalWords.test(reply) && context.fakeSlots?.length) {
    const slots = context.fakeSlots.map(formatSlot).join(', ');
    return { allowed: false, reason: 'ignored-fake-inventory', reply: sameLanguageText(lang, 'modelContextBlocked', { slots }) };
  }
  return { allowed: true, reason: 'within-authoritative-context', reply };
}

export function handleMessage(text, state = {}, now = new Date()) {
  const lang = detectLanguage(text);
  const shop = selectShop(text, state);
  const bookingState = state.bookingState || createBookingState();
  if (uncertainWords.test(text)) {
    return { kind: 'handoff', lang, shopId: shop.id, bookingState, reply: sameLanguageText(lang, 'handoff') };
  }
  if (bookingWords.test(text) && (state.offeredSlot || !explicitSlotWords.test(text))) {
    if (!state.offeredSlot) {
      return { kind: 'booking_blocked', lang, shopId: shop.id, bookingState, reply: sameLanguageText(lang, 'bookingBlocked') };
    }
    const persisted = persistDummyBooking(bookingState, shop, state.offeredSlot, now);
    if (!persisted.ok) {
      return { kind: 'booking_blocked', lang, shopId: shop.id, bookingState, reply: sameLanguageText(lang, 'bookingBlocked') };
    }
    return { kind: 'booking', lang, shopId: shop.id, bookingState, booking: persisted.booking, bookedSlot: state.offeredSlot, reply: sameLanguageText(lang, 'booked', { shop: shop.name, slot: formatSlot(state.offeredSlot) }) };
  }
  if (slotWords.test(text)) {
    const matches = matchingSlots(text, shop, now, bookingState);
    const offeredSlot = matches[0];
    if (!offeredSlot) {
      return { kind: 'slots', lang, shopId: shop.id, bookingState, offeredSlot: undefined, reply: sameLanguageText(lang, 'noSlots', { shop: shop.name, slots: availableSlots(shop, bookingState).map(formatSlot).join(', ') || 'none' }) };
    }
    return { kind: 'slots', lang, shopId: shop.id, bookingState, offeredSlot, reply: sameLanguageText(lang, 'slots', { shop: shop.name, slots: matches.map(formatSlot).join(', ') }) };
  }
  if (/\b(hours?|open|closing|close|waktu|operasi|நேரம்)\b/i.test(text)) {
    return { kind: 'hours', lang, shopId: shop.id, bookingState, reply: sameLanguageText(lang, 'hours', { shop: shop.name, hours: shop.hours }) };
  }
  return { kind: 'greeting', lang, shopId: shop.id, bookingState, reply: sameLanguageText(lang, 'greeting', { shop: shop.name }) };
    }
