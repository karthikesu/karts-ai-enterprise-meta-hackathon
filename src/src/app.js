import { createBookingState, handleMessage } from './prototype.mjs';

const log = document.querySelector('#chat-log');
const form = document.querySelector('#chat-form');
const input = document.querySelector('#message');
const bookOffered = document.querySelector('#book-offered');
const state = { bookingState: createBookingState() };
let turns = 0;

function addMessage(role, text) {
  const item = document.createElement('div');
  item.className = `message ${role}`;
  item.textContent = text;
  log.appendChild(item);
  log.scrollTop = log.scrollHeight;
}

function send(text) {
  addMessage('user', text);
  const result = handleMessage(text, state);
  state.shopId = result.shopId;
  state.bookingState = result.bookingState;
  if (result.offeredSlot) state.offeredSlot = result.offeredSlot;
  if (result.bookedSlot || result.kind === 'booking_blocked') delete state.offeredSlot;
  bookOffered.hidden = !state.offeredSlot;
  turns += 1;
  addMessage('assistant', result.reply);
  document.querySelector('#turns').textContent = String(turns);
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  send(text);
});

document.querySelectorAll('[data-sample]').forEach((button) => {
  button.addEventListener('click', () => send(button.dataset.sample));
});

bookOffered.addEventListener('click', () => send('book it'));

addMessage('assistant', 'Guarded offline dummy prototype ready. The deterministic booking engine owns slots and dummy booking records; no API key, customer data, production system or real booking is connected.');


if (new URLSearchParams(window.location.search).get('demo') === '1') {
  const run = [
    [8000, 'Kopi Maju got slot tomorrow evening?'],
    [14000, 'book it'],
    [22000, 'Boleh tempah slot petang esok untuk Kedai Runcit A&M?'],
    [30000, 'மீனா டெய்லர் இன்று slot இருக்கா?'],
    [38000, 'I want a refund and legal complaint']
  ];
  for (const [delay, text] of run) window.setTimeout(() => send(text), delay);
}
