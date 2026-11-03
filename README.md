# KARTS guarded multilingual shop assistant

KARTS AI ENTERPRISE built this dummy-data prototype for the Meta Global AI Developer Hackathon. It demonstrates a guarded Malaysian shop-enquiry assistant in English, Malay and Tamil.

The project used Meta's Muse Spark Open model through Baseten's Model API for recorded multilingual language turns. A deterministic local booking engine owns fake availability and dummy booking records, so the model can help phrase a reply but cannot confirm a booking unless the engine has saved a record.

Built with Muse Spark Open.

## What is included

- `src/prototype.mjs` - language detection, relative-date slot matching, booking guardrails, deterministic dummy booking persistence and owner handoff.
- `src/baseten-adapter.mjs` - the app integration path and recorded model evidence used for the hackathon tests; API calls are disabled in this public package.
- `src/app.js`, `index.html`, `styles.css` - browser demo shell.
- `demo-replay.html` - the 3-minute screen-recording page. It replays deterministic state and shows recorded model evidence; it makes no API call.
- `demo-public.mp4` - the 3-minute recorded demo prepared for public submission.
- `demo-evidence.html` - human-readable evidence summary.
- `integrated-batch-evidence.json` - public-safe integrated batch evidence with private identifiers and account details removed.
- `mock-test-results.txt` - current regression output: 17/17 passing.
- `test/prototype.test.mjs` - regression suite for language, dates, named-shop switching, guardrails, booking persistence, duplicate and unknown-slot rejection, owner handoff and API-call disablement.

## Recorded model evidence

Seven recorded Baseten test calls were made on 3 Nov 2026:

1. One smoke call proved the connection but stopped at `finish_reason: length`.
2. Three development calls proved English, Malay and Tamil replies; the raw Malay reply overclaimed a booking, so the deterministic guard blocked it.
3. Three integrated app-path calls passed fake-inventory use in English, Malay and Tamil. The integrated batch used 1,066 prompt tokens (256 cached) and 1,230 completion tokens (1,024 reasoning).

Availability language and fake-inventory use are verified through the recorded integrated calls. Booking persistence is verified offline and deterministically; no live booking-confirmation model call is part of this demo.

## Truth boundary

This repository uses dummy shops, dummy customers and local fake slots only. It contains no API key, customer data, private KARTS/VEGAM/UYIR code, production system or real booking integration. The replay page must not be described as a live API call.

## License and third-party rights

The MIT License in `LICENSE` applies only to the KARTS-authored code, documentation, synthetic data and demo assets in this repository. It does not grant, transfer or sublicense any rights in Meta's models, Muse Spark Open, Baseten's services, or any other third-party product.

Muse Spark Open is developed by Meta and is subject to the Muse Model License and its usage policy. Baseten's Model API and platform are subject to Baseten's terms. This repository contains no model weights, model checkpoints, provider SDK code, credentials or private account data.

## Run the checks

```bash
npm test
```

Open `index.html` for the guarded chat replay, `demo-replay.html` for the recording page, or `demo-evidence.html` for the evidence summary.
