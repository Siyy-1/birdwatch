# BirdWatch QA Report

Date: 2026-04-11
Source of truth: `BirdWatch_PRD.md`, `RESUME.md`, `.claude/agents/*.md`
Decision overrides:
- `2026-04-11`: map stack is confirmed as `Google Maps`, so this report does not treat the `MapLibre -> Google Maps` change as a defect by itself.
- `2026-04-11`: source-of-truth priority is `user instruction > PRD > RESUME > .claude/agents`.
- `2026-04-11`: offline queue must require one user confirmation before queued uploads proceed after connectivity returns.
- `2026-04-11`: EXIF handling is `client-side strip + server/Lambda second pass`.
- `2026-04-11`: product direction is now `AI bird identification + collection guide + lightweight birding SNS`.
- `2026-04-11`: social scope for MVP/P1 is `feed + profile + hearts only`; comments, captions, follows, DMs, and stories are intentionally out of scope.

## Summary

- Overall score: `50 / 100`
- Score note: this score reflects the initial QA snapshot. Items listed under `Implemented Since Initial QA` have already improved the build, but a full rescoring has not been run yet.
- Automated verification:
- Backend tests: `26 / 26 passed`
- Mobile tests: `45 / 45 passed`
- Backend TypeScript: passed
- Mobile TypeScript: passed
- Lint:
- Backend: `9 warnings`
- Mobile: `18 warnings`

## Scorecard

| Area | Score | Notes |
|---|---:|---|
| Authentication / Onboarding | 52 | Kakao/Apple/Google, PKCE, SecureStore exist. Onboarding flow does not match PRD and is effectively bypassed. |
| AI Photo Identification | 62 | Capture-upload-identify-save exists, client-side EXIF stripping has been added, and the result screen now supports candidate review, manual correction, and training-consent override. Flash and gallery import are still missing. |
| GPS / Sighting Log | 35 | Basic save/list exists. GPS denied/failure fallback is not implemented despite PRD requiring it. |
| Collection / Species Detail | 58 | Collection and species detail screens exist, but discovery masking, grid UX, sorting persistence, and offline behavior are incomplete. |
| Map | 34 | `Google Maps` is the confirmed target, but clustering, rarity-colored pins, permission banner, full dataset loading, and sighting detail navigation are missing. |
| Gamification / Subscription | 47 | Points, streak, badges UI exist. Badge system diverges from PRD, level/challenge/payment are incomplete. |
| Non-functional Requirements | 48 | SecureStore, rate limit, some PIPA handling, and client-side EXIF stripping exist. HTTPS, PostHog, offline UX, accessibility, and in-app policy access are still incomplete. |
| Infra / Testing / Ops | 78 | Infra and CI assets are strong per `RESUME.md`, but Cognito/Lambda@Edge EXIF/PostHog self-hosted and other production-final items are still open. |

## Core Findings

### P0 defects

1. GPS non-consent currently blocks capture itself.
- PRD requires capture/save flow to continue without coordinates.
- Current camera flow opens a consent modal and `위치 없이 촬영` only closes the modal.
- References:
- `mobile/app/(tabs)/camera.tsx:415`
- `mobile/app/(tabs)/camera.tsx:641`
- `mobile/app/(tabs)/camera.tsx:833`

2. Backend requires `lat/lng` for sighting creation.
- PRD requires saving with `위치 정보 없음` when GPS is denied or unavailable.
- Current API schema makes coordinates mandatory.
- References:
- `backend/src/routes/v1/sightings.ts:217`

3. Map requests OS location permission before PIPA consent handling.
- PRD requires a dedicated consent screen before OS permission.
- Current map tab directly calls `requestForegroundPermissionsAsync`.
- References:
- `mobile/app/(tabs)/index.tsx:41`

4. Offline flow does not queue pre-identification photos.
- PRD and `.claude/agents` both require photo queueing for later AI analysis.
- Current implementation queues only already-assembled sighting payloads after capture.
- References:
- `mobile/app/(tabs)/camera.tsx:428`
- `mobile/app/(tabs)/camera.tsx:509`
- `mobile/src/services/storage/offlineQueue.ts:75`
- `.claude/agents/birdwatch-qa.md`
- `.claude/agents/birdwatch-ai.md`

5. Onboarding is effectively bypassed.
- Backend writes `terms_agreed_at` and `privacy_agreed_at` at user creation.
- Store decides onboarding need from `terms_agreed_at`, so most users will never see the onboarding flow.
- References:
- `backend/src/routes/v1/auth.ts:143`
- `mobile/src/store/authStore.ts:133`

6. API/mobile boundary checks are not fully formalized.
- `.claude/agents/birdwatch-qa.md` requires explicit API↔mobile type comparison, especially nullable/optional fields and confidence unit alignment.
- The current project has partial shared typing, but no systematic boundary matrix or CI check for shape drift.
- References:
- `.claude/agents/birdwatch-qa.md`
- `backend/src/routes/v1`
- `mobile/src/types/api.ts`

## Implemented Since Initial QA

1. GPS fallback is now partially fixed.
- Camera flow no longer blocks capture when the user chooses `위치 없이 촬영`.
- Backend sighting creation now accepts `lat/lng = null` and rejects only partial coordinate payloads.

2. Onboarding contract is now partially fixed.
- Legal agreement timestamps are no longer treated as implicit account-creation side effects.
- Onboarding completion is now recorded through a dedicated completion flow.

3. KST-boundary logic is now partially fixed.
- Daily AI limit and streak logic have been updated away from naive server-local date handling.

4. Map permission flow is now partially fixed.
- Silent OS permission requests are no longer the intended behavior; PIPA-first flow has been introduced in code.

5. EXIF defense in depth has started.
- Client-side image re-encoding before upload is now in place.
- Server/Lambda-side second-pass removal remains part of the required operating model.

6. Offline queue upload is no longer silent.
- Automatic foreground flush has been replaced with a user confirmation step before queued uploads proceed.
- Offline capture now stores sanitized local photos and resumes `upload -> AI identify -> save` after user confirmation.
- Basic duplicate insertion prevention is now in place.
- Queued captures are now reviewed before save rather than auto-saved.
- The queue is still not PRD-complete because richer retry policy and queue-specific result management UX are not implemented.

7. AI review and feedback loop are now partially implemented.
- The live AI result screen now supports top-candidate review, direct species search, global training-consent default, and per-save override.
- Backend now has a persistence path for AI feedback/training consent data.
- Remaining gap: dedicated analytics/retraining export path and operational validation of the feedback dataset lifecycle.

8. Product scope for gallery/profile has changed.
- Gallery should now be evaluated as a primary birding feed surface rather than an optional side feature.
- My Page should now be evaluated as a social profile surface with post grid + birding stats, not only a settings/status page.
- Missing comments/captions should no longer be treated as defects because they are explicitly deferred by product direction.

### Major spec mismatches

1. Map clustering is missing.
- PRD explicitly requires clustering for zoomed-out map states.
- References:
- `mobile/app/(tabs)/index.tsx:97`

2. Sensitive-species coordinate obscuring does not match PRD granularity.
- Current function uses `0.5 degree / 0.05 degree` snapping, not the PRD's `252 km² / 5 km²` target.
- `.claude/agents/birdwatch-db.md` repeats the same ambiguity, so the contract is internally inconsistent and must be normalized in one place.
- References:
- `db/functions/obscure_coordinate.sql:19`
- `BirdWatch_PRD.md:499`
- `.claude/agents/birdwatch-db.md`

3. Daily streak and daily AI limit are not guaranteed to use KST.
- Current logic depends on DB `CURRENT_DATE`.
- References:
- `backend/src/routes/v1/sightings.ts:343`
- `backend/src/routes/v1/ai.ts:168`

4. Collection screen does not match PRD collection UX.
- PRD expects grid, undiscovered silhouettes with `???`, sort persistence, and progress based on the full encyclopedia.
- Current UI is list-based and progress depends on filtered total.
- References:
- `mobile/app/(tabs)/collection.tsx:170`
- `mobile/app/(tabs)/collection.tsx:344`
- `mobile/app/(tabs)/collection.tsx:380`

5. No dedicated sighting detail view.
- Map card routes to species detail instead of sighting detail.
- PRD expects sighting detail with photo, coordinates, confidence, weather, and map thumbnail.
- References:
- `mobile/app/(tabs)/index.tsx:140`

6. AI camera UX is below PRD.
- Missing flash toggle, gallery import, manual species search modal, confidence-specific CTA treatment, and collapsible alternatives.
- References:
- `mobile/app/(tabs)/camera.tsx:84`
- `mobile/app/(tabs)/camera.tsx:711`

7. EXIF defense in depth was missing at QA start and is now partially addressed.
- `.claude/agents/birdwatch-mobile.md` and `.claude/agents/birdwatch-security.md` both require client-side EXIF removal before upload, with Lambda-side removal as a second layer.
- `2026-04-11` update: mobile upload path now re-encodes images before upload. Server/Lambda-side second-pass verification still needs operational confirmation.
- References:
- `.claude/agents/birdwatch-mobile.md`
- `.claude/agents/birdwatch-security.md`
- `mobile/app/(tabs)/camera.tsx`

8. Offline queue contract is still below the harness role docs.
- The agent docs expect FIFO ordering, duplicate protection, timestamp preservation, and pre-identification photo queue semantics.
- `2026-04-11` update: silent auto-flush has been removed, pre-identification photo queueing has been added, and queued work now resumes only after one-time user confirmation.
- Remaining gaps are richer retry policy and stronger queue-specific review management.
- References:
- `.claude/agents/birdwatch-qa.md`
- `.claude/agents/birdwatch-ai.md`
- `mobile/src/services/storage/offlineQueue.ts`

## AI model gaps

1. Species coverage is below PRD.
- Current `label_map.json` contains `141` mapped species, not `300`.
- Reference:
- `ai/models/label_map.json:1`

2. Accuracy is below PRD target.
- Current eval accuracy in `training_history.json` is `0.625`.
- Current eval top-5 accuracy is `0.899`.
- PRD target is `top-1 >= 0.80`, `top-3 >= 0.92`.
- Reference:
- `ai/models/training_history.json:1`

3. TFLite size is above PRD target.
- Current `birdwatch_v1.0.0.tflite` is `8,831,728 bytes`, above the `<= 8MB` target.
- Reference:
- `ai/models/birdwatch_v1.0.0.tflite`

## Fix List

### P0

1. Allow capture and save flow without GPS coordinates.
- Camera should not hard-block when GPS consent is missing.
- Backend should accept `lat/lng = null`.
- Add explicit `위치 정보 없음` handling in API and UI.

2. Fix onboarding contract.
- Stop writing legal agreement timestamps at account creation.
- Persist agreement timestamps only after actual onboarding completion.

3. Add proper PIPA-first location flow on map and camera.
- Dedicated consent UI first.
- OS permission request second.

4. Redesign offline queue for real PRD behavior.
- Queue the photo and metadata before AI.
- On reconnect, perform upload and identification automatically or resume the pending flow.

5. Make streak and AI limit KST-safe.
- Use explicit KST date handling instead of DB server-local `CURRENT_DATE`.

6. Rework sensitive-species obscuring logic.
- Align to PRD grid sizes and verify private-vs-shared visibility behavior.

7. Add explicit API↔mobile boundary verification.
- Compare backend route output and mobile type definitions for nullable, optional, and unit consistency.
- Add at least one CI or test-layer guard for response-shape drift.

### P1

1. Add map clustering, rarity-colored pins, denied-permission banner, and full dataset loading.
2. Add dedicated sighting detail screen.
3. Rebuild collection as a PRD-style grid with undiscovered silhouettes and persistent sort.
4. Rebuild gallery as the primary birding feed surface with hearts-only engagement and structured post metadata.
5. Add missing camera controls: flash, gallery import, stronger zoom UX.
6. Improve AI model coverage, accuracy, and size.
7. Verify the server-side EXIF second pass in dev/prod and add explicit failure observability.
8. Define offline queue invariants: FIFO, timestamp preservation, retry policy, queued-review recovery UX.
9. Add export/ops path for AI feedback dataset and retraining pipeline consumption.
10. Rebuild My Page into a profile-first surface with post grid, birding stats, and public-profile/read-only-post flows.

### P2

1. Implement subscription payment flow.
2. Add PostHog self-hosted analytics and privacy-safe event strategy.
3. Add always-available in-app privacy policy and terms screens.
4. Clean remaining lint warnings and expand device E2E coverage.

## Harness Alignment Notes

1. `.claude/agents` strengthens several existing QA findings rather than replacing PRD.
- The strongest overlaps are offline queue semantics, KST boundary logic, GPS/PIPA flow, and API↔mobile contract validation.

2. The biggest harness-vs-code gaps today are:
- mobile role expects advanced map behavior, gallery import, SQLite cache, and offline AI queue semantics that are not yet fully present
- security role expects client-side EXIF stripping and privacy-safe analytics identity handling
- API role expects stricter response-contract consistency and more complete gating/integration behavior

3. The biggest harness-doc inconsistency is the coordinate obscuring rule.
- PRD says `252 km² / 5 km²`
- DB role doc explains that target but still uses `0.5 / 0.05 degree` examples
- actual SQL also uses degree snapping
- this needs a single canonical rule before implementation continues

## Agreed Decisions

1. Offline queue behavior:
- Reconnect must not silently consume queued work.
- Queued uploads proceed only after one user confirmation.

2. EXIF strategy:
- Use defense in depth: client-side stripping before upload plus server/Lambda second-pass stripping.

3. Source-of-truth priority:
- `user instruction > PRD > RESUME > .claude/agents`

## Suggested Discussion Order

1. `P0` GPS capture/save fallback
2. `P0` onboarding contract fix
3. `P0` offline queue redesign
4. `P0` KST-safe streak / AI limit
5. `P1` EXIF second-pass verification and privacy boundary hardening
6. `P1` map and collection UX alignment
