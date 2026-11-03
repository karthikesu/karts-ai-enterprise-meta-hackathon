# KARTS 3-minute demo script

Truth boundary: the screen recording uses dummy shops and deterministic booking state. The Baseten outputs shown are from recorded calls. The replay itself makes no API call and must not be described as live.

## 0:00-0:15 - Problem and boundary
Small Malaysian shops miss enquiries after hours. This dummy demo answers in Tamil, Malay and English, checks fake slots, books only through a deterministic dummy booking engine, and hands uncertain requests to the owner.

## 0:15-1:05 - Working guarded replay
Show the prototype. Click English slot check, then Book offered dummy slot. The correct relative slot appears and the confirmation appears only after the dummy booking record is saved. Show Malay, Tamil and owner-handoff samples.

## 1:05-1:35 - Recorded integrated app-path evidence
Show the integrated evidence card. Three recorded app-path calls passed fake-inventory use in English, Malay and Tamil.

## 1:35-1:55 - Guarded architecture
Show the architecture cards: customer message, app prompt builder with fake inventory/booking state, Muse Spark Open language component, booking guard and deterministic booking engine. The model never owns booking state.

## 1:55-2:25 - Offline guard refinement
Show the recorded Malay false-positive: the model truthfully said no booking was recorded, but the first guard overblocked the negative phrase. The guard was refined offline using recorded output only; no live replay was made.

## 2:25-2:45 - Tests
Show 17/17 passing: persistence-before-confirmation, duplicate/unknown-slot rejection, prior affirmative Malay overclaim, truthful negative claim, named-shop switching, stubbed app-path wiring and recorded guard evidence.

## 2:45-3:00 - Close
Close with the truth boundary: recorded model evidence plus deterministic replay, with booking persistence proven offline.
