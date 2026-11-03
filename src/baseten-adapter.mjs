import { buildLanguagePrompt, createBookingState, guardModelReply, matchingSlots } from './prototype.mjs';
import { shops } from './data.mjs';

export const FIRST_TEST_REQUEST = Object.freeze({
  model: 'meta-models/muse-spark-open-1026',
  max_tokens: 300,
  truncate_prompt_tokens: 1000,
  reasoning_effort: 'low',
  tool_choice: 'none',
  messages: [
    {
      role: 'user',
      content: 'Dummy hackathon smoke test. A customer asks in English: Does Kopi Maju have a slot tomorrow evening? Reply in one sentence and say this is dummy data only.'
    }
  ]
});

const BASE_REQUEST = Object.freeze({
  model: 'meta-models/muse-spark-open-1026',
  max_tokens: 1024,
  truncate_prompt_tokens: 250,
  reasoning_effort: 'low',
  tool_choice: 'none'
});

export const DEVELOPMENT_TEST_BATCH = Object.freeze({
  callLimit: 3,
  maxPromptTokensPerCall: 250,
  maxCompletionTokensPerCall: 1024,
  requests: [
    {
      id: 'en-kopi-slot',
      ...BASE_REQUEST,
      messages: [{ role: 'user', content: 'Dummy hackathon smoke test. A customer asks in English: Does Kopi Maju have a slot tomorrow evening? Reply in one sentence and say this is dummy data only.' }]
    },
    {
      id: 'ms-kedai-slot',
      ...BASE_REQUEST,
      messages: [{ role: 'user', content: 'Dummy hackathon smoke test. A customer asks in Malay: Boleh tempah slot petang esok untuk Kedai Runcit A&M? Reply in Malay in one sentence and say this is dummy data only.' }]
    },
    {
      id: 'ta-meena-slot',
      ...BASE_REQUEST,
      messages: [{ role: 'user', content: 'Dummy hackathon smoke test. A customer asks in Tamil: மீனா டெய்லரிடம் நாளை மாலை slot இருக்கா? Reply in Tamil in one sentence and say this is dummy data only.' }]
    }
  ]
});

export const DEVELOPMENT_TEST_RESULTS = Object.freeze([
  {
    id: 'en-kopi-slot',
    promptTokens: 180,
    cachedPromptTokens: 128,
    completionTokens: 331,
    reasoningTokens: 295,
    finishReason: 'stop',
    reply: "This is dummy data only — I don't have access to Kopi Maju's live booking system to confirm availability for tomorrow evening.",
    demoUse: 'language pass; availability must come from fake inventory'
  },
  {
    id: 'ms-kedai-slot',
    promptTokens: 189,
    cachedPromptTokens: 128,
    completionTokens: 334,
    reasoningTokens: 294,
    finishReason: 'stop',
    reply: 'Boleh, tempahan slot petang esok untuk Kedai Runcit A&M telah direkodkan dan ini hanyalah data dummy sahaja.',
    demoUse: 'language pass; unsupported recorded-booking claim must be blocked'
  },
  {
    id: 'ta-meena-slot',
    promptTokens: 196,
    cachedPromptTokens: 128,
    completionTokens: 285,
    reasoningTokens: 220,
    finishReason: 'stop',
    reply: 'இது dummy data மட்டுமே, மீனா டெய்லரிடம் நாளை மாலை slot இருப்பது பற்றிய நிஜமான தகவல் இல்லை.',
    demoUse: 'language pass; availability must come from fake inventory'
  }
]);


const INTEGRATED_BASE_REQUEST = Object.freeze({
  model: 'meta-models/muse-spark-open-1026',
  max_tokens: 512,
  truncate_prompt_tokens: 600,
  reasoning_effort: 'low',
  tool_choice: 'none'
});

export const INTEGRATED_TEST_PLAN = Object.freeze({
  id: 'integrated-language-with-authoritative-inventory',
  callLimit: 3,
  maxPromptTokensPerCall: 600,
  maxCompletionTokensPerCall: 512,
  renderedPromptTokensAt20261103: Object.freeze({ en: 345, ms: 357, ta: 361 }),
  evidenceState: 'recorded-complete'
});

export const INTEGRATED_TEST_RESULTS = Object.freeze([
  {
    id: 'integrated-en-kopi-availability',
    language: 'en',
    promptTokens: 346,
    cachedPromptTokens: 0,
    completionTokens: 496,
    reasoningTokens: 450,
    finishReason: 'stop',
    modelReply: 'This is dummy data only, but according to our demo inventory Kopi Maju has a slot available tomorrow evening at 4 Nov 2026, 5:30 pm.',
    guard: { allowed: true, reason: 'within-authoritative-context' }
  },
  {
    id: 'integrated-ms-am-availability',
    language: 'ms',
    promptTokens: 358,
    cachedPromptTokens: 128,
    completionTokens: 352,
    reasoningTokens: 292,
    finishReason: 'stop',
    modelReply: 'Ini data dummy sahaja, slot tersedia untuk Kedai Runcit A&M ialah 4 Nov 2026, 7:30 pm dan 6 Nov 2026, 11:00 am dan tiada tempahan direkodkan.',
    guard: {
      allowed: false,
      reason: 'unsupported-booking-claim',
      assessment: 'conservative false-positive: the reply says no booking was recorded, but the first guard matched direkodkan without handling the negation'
    }
  },
  {
    id: 'integrated-ta-meena-availability',
    language: 'ta',
    promptTokens: 362,
    cachedPromptTokens: 128,
    completionTokens: 382,
    reasoningTokens: 282,
    finishReason: 'stop',
    modelReply: 'இது டம்மி தரவு மட்டுமே, நாளை (4 நவ 2026) மாலை ஸ்லாட் இல்லை, கிடைக்கும் ஸ்லாட்கள் 5 நவ 2026, 4:00 pm மற்றும் 7 நவ 2026, 12:30 pm ஆகும்.',
    guard: { allowed: true, reason: 'within-authoritative-context' }
  }
]);

export function buildIntegratedModelBatch(now = new Date()) {
  const scenarios = [
    {
      id: 'integrated-en-kopi-availability',
      language: 'en',
      shopId: 'kopi-maju',
      customerText: 'Kopi Maju got slot tomorrow evening?'
    },
    {
      id: 'integrated-ms-am-availability',
      language: 'ms',
      shopId: 'kedai-runcit-am',
      customerText: 'Boleh tempah slot petang esok untuk Kedai Runcit A&M?'
    },
    {
      id: 'integrated-ta-meena-availability',
      language: 'ta',
      shopId: 'meena-tailor',
      customerText: 'மீனா டெய்லரிடம் நாளை மாலை slot இருக்கா?'
    }
  ];
  return {
    ...INTEGRATED_TEST_PLAN,
    requests: scenarios.map((scenario) => {
      const shop = shops.find((item) => item.id === scenario.shopId);
      const prompt = buildLanguagePrompt(scenario.customerText, shop, createBookingState(), now);
      return {
        ...scenario,
        request: {
          ...INTEGRATED_BASE_REQUEST,
          messages: prompt.messages
        }
      };
    })
  };
}

export function buildFirstTestRequest() {
  return structuredClone(FIRST_TEST_REQUEST);
}

export function buildDevelopmentTestBatch() {
  return structuredClone(DEVELOPMENT_TEST_BATCH);
}

export async function runIntegratedModelTurn(scenario, options = {}) {
  const shop = shops.find((item) => item.id === scenario.shopId);
  if (!shop) throw new Error(`Unknown dummy shop: ${scenario.shopId}`);
  const now = options.now || new Date();
  const bookingState = createBookingState();
  const prompt = buildLanguagePrompt(scenario.customerText, shop, bookingState, now);
  const request = {
    ...INTEGRATED_BASE_REQUEST,
    messages: prompt.messages
  };
  const callImpl = options.callImpl || callBaseten;
  const raw = await callImpl(request, options);
  const modelReply = raw?.choices?.[0]?.message?.content?.trim() || '';
  const fakeSlots = matchingSlots(scenario.customerText, shop, now, bookingState);
  const guarded = guardModelReply(modelReply, {
    lang: scenario.language,
    shop,
    fakeSlots,
    bookingRecord: null
  });
  return {
    scenario,
    shop: { id: shop.id, name: shop.name },
    request,
    raw,
    modelReply,
    fakeSlots,
    guarded,
    bookingState
  };
}

export async function callBaseten() {
  throw new Error('Baseten adapter disabled. The recorded integrated batch is complete; this public package does not make API calls.');
}
