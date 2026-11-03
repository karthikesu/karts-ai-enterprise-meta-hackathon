import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLanguagePrompt,
  createBookingState,
  hasUnsupportedBookingClaim,
  detectLanguage,
  guardModelReply,
  handleMessage,
  matchingSlots,
  persistDummyBooking
} from '../src/prototype.mjs';
import { malaysiaDateAfter, shops } from '../src/data.mjs';
import {
  buildDevelopmentTestBatch,
  buildFirstTestRequest,
  callBaseten,
  DEVELOPMENT_TEST_RESULTS,
  buildIntegratedModelBatch,
  INTEGRATED_TEST_RESULTS,
  FIRST_TEST_REQUEST,
  runIntegratedModelTurn
} from '../src/baseten-adapter.mjs';

test('detects Tamil, Malay and English demo text', () => {
  assert.equal(detectLanguage('மீனா டெய்லர் இன்று slot இருக்கா?'), 'ta');
  assert.equal(detectLanguage('Boleh tempah slot petang ini?'), 'ms');
  assert.equal(detectLanguage('Do you have a slot tomorrow?'), 'en');
});

test('checks a tomorrow-evening dummy slot and persists the demo booking before confirming', () => {
  const now = new Date('2026-11-03T12:00:00+08:00');
  const bookingState = createBookingState();
  const check = handleMessage('Kopi Maju got slot tomorrow evening?', { bookingState }, now);
  assert.equal(check.kind, 'slots');
  assert.equal(check.shopId, 'kopi-maju');
  assert.equal(check.offeredSlot, `${malaysiaDateAfter(1, now)}T17:30:00+08:00`);
  assert.match(check.reply, /dummy slots/i);
  const booking = handleMessage('book it', { shopId: check.shopId, offeredSlot: check.offeredSlot, bookingState }, now);
  assert.equal(booking.kind, 'booking');
  assert.equal(booking.booking.dummy, true);
  assert.equal(bookingState.records.length, 1);
  assert.match(booking.reply, /dummy data only/i);
  assert.match(booking.reply, /no real shop/i);
});


test('a Malay slot-booking request offers a dummy slot before any confirmation', () => {
  const now = new Date('2026-11-03T12:00:00+08:00');
  const result = handleMessage('Boleh tempah slot petang esok untuk Kedai Runcit A&M?', {}, now);
  assert.equal(result.kind, 'slots');
  assert.equal(result.shopId, 'kedai-runcit-am');
  assert.equal(result.offeredSlot, `${malaysiaDateAfter(1, now)}T19:30:00+08:00`);
  assert.match(result.reply, /Slot dummy seterusnya/i);
});


test('a newly named shop overrides the previous conversation shop', () => {
  const now = new Date('2026-11-03T12:00:00+08:00');
  const state = { shopId: 'kopi-maju', bookingState: createBookingState() };
  const result = handleMessage('Boleh tempah slot petang esok untuk Kedai Runcit A&M?', state, now);
  assert.equal(result.shopId, 'kedai-runcit-am');
  assert.equal(result.offeredSlot, `${malaysiaDateAfter(1, now)}T19:30:00+08:00`);
  assert.match(result.reply, /Kedai Runcit A&M/);
});

test('does not offer a wrong-date slot for a tomorrow-evening request', () => {
  const now = new Date('2026-11-03T12:00:00+08:00');
  const meena = shops.find((shop) => shop.id === 'meena-tailor');
  assert.deepEqual(matchingSlots('Meena Tailor got slot tomorrow evening?', meena, now), []);
  const result = handleMessage('Meena Tailor got slot tomorrow evening?', {}, now);
  assert.equal(result.kind, 'slots');
  assert.equal(result.offeredSlot, undefined);
  assert.match(result.reply, /No dummy evening slot tomorrow/i);
  assert.match(result.reply, /Next dummy slots/i);
});

test('booking engine owns state and rejects duplicate or unknown-slot confirmation', () => {
  const now = new Date('2026-11-03T12:00:00+08:00');
  const kopi = shops.find((shop) => shop.id === 'kopi-maju');
  const bookingState = createBookingState();
  const slot = `${malaysiaDateAfter(1, now)}T17:30:00+08:00`;
  const first = persistDummyBooking(bookingState, kopi, slot, now);
  assert.equal(first.ok, true);
  assert.equal(bookingState.records.length, 1);
  const duplicate = persistDummyBooking(bookingState, kopi, slot, now);
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.reason, 'slot-already-booked');
  const unknown = persistDummyBooking(bookingState, kopi, `${malaysiaDateAfter(1, now)}T23:00:00+08:00`, now);
  assert.equal(unknown.ok, false);
  assert.equal(unknown.reason, 'slot-not-in-fake-inventory');
  assert.equal(bookingState.records.length, 1);
  const blocked = handleMessage('book it', { shopId: kopi.id, bookingState }, now);
  assert.equal(blocked.kind, 'booking_blocked');
  assert.match(blocked.reply, /booking-engine record/i);
});

test('blocks the actual Malay recorded-booking output when no booking record exists', () => {
  const actual = DEVELOPMENT_TEST_RESULTS.find((result) => result.id === 'ms-kedai-slot');
  const shop = shops.find((item) => item.id === 'kedai-runcit-am');
  const guarded = guardModelReply(actual.reply, { lang: 'ms', shop, fakeSlots: shop.slots, bookingRecord: null });
  assert.equal(guarded.allowed, false);
  assert.equal(guarded.reason, 'unsupported-booking-claim');
  assert.match(guarded.reply, /tidak akan sahkan tanpa rekod booking engine/i);
});

test('replaces actual English and Tamil context refusals when fake inventory is supplied', () => {
  const kopi = shops.find((item) => item.id === 'kopi-maju');
  const meena = shops.find((item) => item.id === 'meena-tailor');
  const englishActual = DEVELOPMENT_TEST_RESULTS.find((result) => result.id === 'en-kopi-slot');
  const tamilActual = DEVELOPMENT_TEST_RESULTS.find((result) => result.id === 'ta-meena-slot');
  const english = guardModelReply(englishActual.reply, { lang: 'en', shop: kopi, fakeSlots: kopi.slots, bookingRecord: null });
  const tamil = guardModelReply(tamilActual.reply, { lang: 'ta', shop: meena, fakeSlots: meena.slots, bookingRecord: null });
  assert.equal(english.allowed, false);
  assert.equal(english.reason, 'ignored-fake-inventory');
  assert.match(english.reply, /authoritative slots/i);
  assert.equal(tamil.allowed, false);
  assert.equal(tamil.reason, 'ignored-fake-inventory');
  assert.match(tamil.reply, /authoritative slots/i);
});

test('future full language prompt supplies fake inventory and the no-claim booking rule', () => {
  const now = new Date('2026-11-03T12:00:00+08:00');
  const kopi = shops.find((item) => item.id === 'kopi-maju');
  const prompt = buildLanguagePrompt('Kopi Maju got slot tomorrow evening?', kopi, createBookingState(), now);
  const serialized = JSON.stringify(prompt);
  assert.match(serialized, /fake_inventory/i);
  assert.match(serialized, /2026-11-04T17:30:00\+08:00/);
  assert.match(serialized, /Never say a booking is recorded/i);
  assert.match(serialized, /booking engine is authoritative/i);
  assert.match(serialized, /dummy data only/i);
});

test('integrated model batch shape carried fake inventory in every full prompt', async () => {
  const now = new Date('2026-11-03T12:00:00+08:00');
  const batch = buildIntegratedModelBatch(now);
  assert.equal(batch.callLimit, 3);
  assert.equal(batch.requests.length, 3);
  assert.equal(batch.maxPromptTokensPerCall, 600);
  assert.equal(batch.maxCompletionTokensPerCall, 512);
  assert.equal(batch.evidenceState, 'recorded-complete');
  for (const item of batch.requests) {
    assert.equal(item.request.model, 'meta-models/muse-spark-open-1026');
    assert.equal(item.request.max_tokens, 512);
    assert.equal(item.request.truncate_prompt_tokens, 600);
    assert.equal(item.request.reasoning_effort, 'low');
    assert.equal(item.request.tool_choice, 'none');
    const serialized = JSON.stringify(item.request.messages);
    assert.match(serialized, /fake_inventory/i);
    assert.match(serialized, /booking_record/i);
    assert.match(serialized, /Never say a booking is recorded/i);
    assert.doesNotMatch(serialized, /customer@|whatsapp|telegram|UYIR|VEGAM|api[_-]?key/i);
  }
  await assert.rejects(callBaseten(batch.requests[0].request), /does not make API calls/i);
});


test('recorded integrated batch preserves guard evidence', () => {
  assert.equal(INTEGRATED_TEST_RESULTS.length, 3);
  assert.equal(INTEGRATED_TEST_RESULTS.reduce((sum, result) => sum + result.promptTokens, 0), 1066);
  assert.equal(INTEGRATED_TEST_RESULTS.reduce((sum, result) => sum + result.completionTokens, 0), 1230);
  assert.equal(INTEGRATED_TEST_RESULTS.filter((result) => result.finishReason === 'stop').length, 3);
  assert.equal(INTEGRATED_TEST_RESULTS.filter((result) => result.guard.allowed).length, 2);
  const malay = INTEGRATED_TEST_RESULTS.find((result) => result.language === 'ms');
  assert.equal(malay.guard.allowed, false);
  assert.equal(malay.guard.reason, 'unsupported-booking-claim');
  assert.match(malay.guard.assessment, /false-positive/i);
});

test('booking guard distinguishes a truthful negative booking statement from an unsupported claim', () => {
  assert.equal(hasUnsupportedBookingClaim('Ini data dummy sahaja, slot tersedia untuk Kedai Runcit A&M ialah 4 Nov 2026, 7:30 pm dan 6 Nov 2026, 11:00 am dan tiada tempahan direkodkan.'), false);
  assert.equal(hasUnsupportedBookingClaim('Boleh, tempahan slot petang esok untuk Kedai Runcit A&M telah direkodkan.'), true);
  assert.equal(hasUnsupportedBookingClaim('This booking is confirmed.'), true);
  assert.equal(hasUnsupportedBookingClaim('No booking was recorded.'), false);
});


test('model booking confirmation passes only after the booking engine persists a dummy record', () => {
  const now = new Date('2026-11-03T12:00:00+08:00');
  const shop = shops.find((item) => item.id === 'kopi-maju');
  const bookingState = createBookingState();
  const slot = shop.slots[0];
  const claim = 'Demo booking confirmed: Kopi Maju, 4 Nov 2026, 5:30 pm.';
  const before = guardModelReply(claim, { lang: 'en', shop, fakeSlots: shop.slots, bookingRecord: null });
  assert.equal(before.allowed, false);
  assert.equal(before.reason, 'unsupported-booking-claim');
  const persisted = persistDummyBooking(bookingState, shop, slot, now);
  assert.equal(persisted.ok, true);
  const after = guardModelReply(claim, { lang: 'en', shop, fakeSlots: shop.slots, bookingRecord: persisted.booking });
  assert.equal(after.allowed, true);
  assert.equal(after.reason, 'within-authoritative-context');
  assert.equal(bookingState.records.length, 1);
});

test('integrated model turn wires the app prompt, inventory and guard without a live call when stubbed', async () => {
  const now = new Date('2026-11-03T12:00:00+08:00');
  const turn = await runIntegratedModelTurn({
    id: 'stubbed-integrated-path',
    language: 'en',
    shopId: 'kopi-maju',
    customerText: 'Kopi Maju got slot tomorrow evening?'
  }, {
    now,
    callImpl: async (request) => {
      const serialized = JSON.stringify(request.messages);
      assert.match(serialized, /fake_inventory/i);
      assert.match(serialized, /booking_record/i);
      assert.equal(request.max_tokens, 512);
      assert.equal(request.truncate_prompt_tokens, 600);
      return {
        id: 'stubbed-completion',
        model: request.model,
        choices: [{ finish_reason: 'stop', message: { content: 'This is dummy data only, Kopi Maju has the 4 Nov 2026, 5:30 pm dummy slot.' } }],
        usage: { prompt_tokens: 1, completion_tokens: 1 }
      };
    }
  });
  assert.equal(turn.guarded.allowed, true);
  assert.equal(turn.fakeSlots[0], '2026-11-04T17:30:00+08:00');
  assert.equal(turn.bookingState.records.length, 0);
});

test('hands uncertain requests to the owner instead of guessing', () => {
  const result = handleMessage('I want a refund and legal complaint');
  assert.equal(result.kind, 'handoff');
  assert.match(result.reply, /owner/i);
  assert.match(result.reply, /Demo handoff/i);
});

test('first test request is bounded and uses no tools or private data', async () => {
  const request = buildFirstTestRequest();
  assert.deepEqual(request, FIRST_TEST_REQUEST);
  assert.equal(request.model, 'meta-models/muse-spark-open-1026');
  assert.equal(request.max_tokens, 300);
  assert.equal(request.truncate_prompt_tokens, 1000);
  assert.equal(request.reasoning_effort, 'low');
  assert.equal(request.tool_choice, 'none');
  assert.equal(request.messages.length, 1);
  assert.match(request.messages[0].content, /Dummy hackathon smoke test/i);
  assert.doesNotMatch(JSON.stringify(request), /customer@|whatsapp|telegram|UYIR|VEGAM/i);
  await assert.rejects(callBaseten, /disabled/i);
});

test('recorded development batch is complete and API calls stay disabled', async () => {
  const batch = buildDevelopmentTestBatch();
  assert.equal(batch.callLimit, 3);
  assert.equal(batch.requests.length, 3);
  assert.equal(batch.maxPromptTokensPerCall, 250);
  assert.equal(batch.maxCompletionTokensPerCall, 1024);
  assert.equal(DEVELOPMENT_TEST_RESULTS.length, 3);
  assert.equal(DEVELOPMENT_TEST_RESULTS.reduce((sum, result) => sum + result.promptTokens, 0), 565);
  assert.equal(DEVELOPMENT_TEST_RESULTS.reduce((sum, result) => sum + result.completionTokens, 0), 950);
  for (const result of DEVELOPMENT_TEST_RESULTS) {
    assert.equal(result.finishReason, 'stop');
    assert.ok(result.reply.length > 0);
  }
  for (const request of batch.requests) {
    assert.equal(request.model, 'meta-models/muse-spark-open-1026');
    assert.equal(request.reasoning_effort, 'low');
    assert.equal(request.tool_choice, 'none');
    assert.equal(request.messages.length, 1);
    assert.doesNotMatch(JSON.stringify(request), /customer@|whatsapp|telegram|UYIR|VEGAM|api[_-]?key/i);
  }
  await assert.rejects(callBaseten, /does not make API calls/i);
});
