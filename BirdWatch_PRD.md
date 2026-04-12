# Product Requirements Document: BirdWatch (버드워치)

**Version:** 1.2
**Last Updated:** 2026-04-12
**Document Owner:** Product Team
**Status:** Draft
**AI-Optimization Score:** See Appendix D

---

## 1. Executive Summary and Vision

### Vision Statement

BirdWatch transforms real-world bird watching into an addictive collection game — Pok&eacute;mon GO meets field ornithology — making Korea's 603+ bird species discoverable, collectable, and shareable for the MZ generation.

### Executive Summary

BirdWatch is a GPS-aware bird watching game app where users photograph real birds, receive instant AI species identification, build a personal bird encyclopedia (Pok&eacute;dex-style collection), and optionally share their sightings in a lightweight birding social feed. Sightings are timestamped and can be GPS-tagged when the user consents and location is available, while the product still supports saving sightings without coordinates when GPS is unavailable or declined. Bird rarity is grounded in real-world data: ABA rarity codes combined with GBIF occurrence frequency determine point values, while Korea's legally designated Natural Monument species (천연기념물) serve as legendary-tier collectibles.

The Korean market presents a first-mover opportunity. Zero gamified birding apps exist in Korean. Meanwhile, 24 million Korean mobile gamers play actively, K-outdoor culture is surging (2024 camping/hiking boom), and Korea hosts world-class birding sites including UNESCO Getbol tidal flats and Cheorwon crane habitats. Global competitors Merlin (10M users, no gamification), Birda (Apple App of the Day in 150 countries), and Birdex (200K sightings at UK launch) validate demand but none serve Korean species, language, or cultural context.

The business model is freemium: free tier with 10 AI identifications/day and 200 species, Explorer Pass at 6,900 KRW/month unlocks unlimited IDs, full 300+ species catalog, and expanded social visibility features. Organic acquisition via KakaoTalk sharing and community feed discovery targets LTV:CAC of 17:1. Launch timing is spring 2027 migration peak to maximize Day-1 species diversity and media coverage.

### Key Benefits

- **For casual gamers (김지연 persona):** Turns any outdoor walk into a collection game with real-world discovery, streak mechanics, and social sharing — zero ornithology knowledge required
- **For hobbyist birders (박선호 persona):** First Korean-language bird identification tool with GPS-tagged sighting history, rarity scoring, and exportable field data
- **For competitive collectors (이준호 persona):** Leaderboard competition, legendary-tier Natural Monument species requiring real travel, and seasonal migration events as limited-time content
- **For the Korean market:** First gamified birding app with native Kakao Login, Korean species taxonomy, PIPA-compliant data handling, and Seoul-region hosting

### Implementation Alignment Update (2026-04-12)

The following decisions are locked for the current build and should be treated as the latest implementation-aligned product direction until the next full PRD rewrite:

- **Map stack:** Google Maps is the confirmed map stack for launch builds.
- **Social scope:** MVP/P1 social engagement is **hearts-only**. Comments, captions, follows, DMs, and stories remain out of scope.
- **Gallery direction:** The Gallery tab is a structured **birding feed**, not a generic image list.
- **Profile direction:** My Page is **profile-first** with a profile header, shared post grid, and clear entry points to collection/records.
- **GPS behavior:** Users can still photograph, identify, and save sightings when GPS consent is denied or location capture fails; those sightings save without coordinates.
- **Consent timing:** Terms/privacy consent is recorded on onboarding completion, not automatically at account creation.
- **Photo privacy:** EXIF stripping is two-stage: mobile pre-upload sanitization plus a server-side sanitization pass before AI identify/save.
- **Offline queue UX:** Offline identifications are queued and preserved with the original capture timestamp. Connectivity recovery does not auto-flush immediately; the user confirms once before resume.
- **AI review flow:** Users review top candidates, can search/select a different species, and corrections feed the AI feedback loop.
- **AI feedback defaults:** Global AI training consent defaults to OFF, with per-save override support.

---

## 2. Problem Statement

### Current Challenges

**For Korean Casual Gamers (24M mobile gamers):**
- Pok&eacute;mon GO engagement declining (Korea launch 2017, 9 years stale) — no fresh GPS-based collection game with real-world grounding
- Outdoor gaming genre is 100% fictional creatures; no app connects gaming mechanics to real natural discovery
- Existing birding apps (Merlin, eBird) are English-first, academic-tone, zero gamification — 0% overlap with casual gamer UX expectations

**For Korean Hobbyist Birders (~120K estimated active):**
- Merlin Bird ID has no Korean UI, no Korean species specialization, no GPS sighting export
- Korean birding communities rely on Naver Cafe + manual spreadsheets for sighting logs
- No app provides Korean-language species identification with real-time AI

**For Competitive/Social MZ Users:**
- No app turns real-world nature exploration into a competitive, shareable experience
- KakaoTalk share of "first sighting" or rare bird discovery has zero existing app support
- Seasonal migration (spring/fall) creates natural live-event cadence that no Korean app exploits

### Market Opportunity

| Metric | Value | Source |
|--------|-------|--------|
| Korean mobile gamers | 24M | Korea Creative Content Agency 2025 |
| Korean gamified bird apps | 0 | App Store/Play Store audit 2026-03 |
| Merlin Bird ID active users (global) | 10M+ | Cornell Lab 2025 report |
| Birdex UK launch sightings | 200K in first month | TechCrunch 2025 |
| PictureThis (plant ID equivalent) annual iOS revenue | ~$44M+ | Sensor Tower 2025 |
| Korea bird species count | 603+ | NIBR 2025 checklist |
| Korea UNESCO birding sites | 5+ (Getbol tidal flats, Cheorwon, etc.) | UNESCO/BirdLife |

### Why This Matters Now

1. **Spring migration peak (March-May):** Optimal launch window — species diversity is highest, birding media coverage peaks
2. **Zero Korean competitor:** First-mover window is open but Birdex (UK) and Birda (global) are expanding — 12-18 month window to establish Korean market dominance
3. **K-outdoor boom:** Post-COVID outdoor activity participation in Korea up 34% (2023-2025), camping/hiking equipment market at 4.2T KRW
4. **AI model maturity:** On-device bird identification now achievable at <8MB model size with >80% accuracy — was not viable 2 years ago
5. **GBIF data availability:** CC BY 4.0 commercial-use bird occurrence data eliminates dependency on eBird's restrictive commercial license

---

## 3. Goals and Success Metrics

### Business Goals

1. **Establish Korean market dominance:** Achieve 5,000 WAU within 90 days of Korea launch
2. **Validate freemium model:** Achieve 4.5% free-to-paid conversion rate within 6 months
3. **Build defensible data moat:** Accumulate 100,000 verified Korean bird sightings in first year (community-generated occurrence data)
4. **Achieve sustainable unit economics:** LTV:CAC ratio of 10:1 or better by Month 6

### User Goals

1. **Collection completion:** Average user discovers 15+ species in first 30 days
2. **Habit formation:** Day-30 retention >= 20% (benchmark: casual game median is 8%)
3. **AI trust:** Users accept AI identification >= 70% of attempts (reject/re-photo rate < 30%)
4. **Social virality:** 15% of users share at least one sighting via KakaoTalk in first 14 days

### Success Metrics

#### Primary Metrics (P0) — 90-Day Post-Launch

| Metric | Baseline (Launch Day) | Target (Day 90) | Measurement |
|--------|-----------------------|------------------|-------------|
| Korea WAU | 0 | >= 5,000 | PostHog weekly active users |
| Day-30 Retention | N/A | >= 20% | Cohort analysis, PostHog |
| AI Acceptance Rate | N/A | >= 70% | (accepted IDs) / (total ID attempts) |
| Avg Sightings/Active User/Week | N/A | >= 3.0 | PostHog event tracking |
| App Store Rating | N/A | >= 4.2 / 5.0 | App Store Connect + Google Play Console |

#### Secondary Metrics (P1) — 6-Month Post-Launch

| Metric | Target | Measurement |
|--------|--------|-------------|
| Free-to-Paid Conversion | >= 4.5% | Subscription analytics |
| Monthly Recurring Revenue | >= 15M KRW | Revenue dashboard |
| KakaoTalk Share Rate | >= 15% of users | Share event tracking |
| Avg Session Duration | >= 8 min | PostHog session tracking |
| Species per User (30-day) | >= 15 unique species | Collection analytics |

#### Instrumentation Requirements

- PostHog self-hosted (Seoul region) for all analytics — PIPA compliant, no third-party data transfer
- Events to track: `app_open`, `camera_launched`, `photo_taken`, `id_requested`, `id_accepted`, `id_rejected`, `id_corrected`, `sighting_saved`, `species_unlocked`, `badge_earned`, `map_viewed`, `gallery_viewed`, `post_shared`, `heart_toggled`, `profile_viewed`, `share_initiated`, `share_completed`, `subscription_started`, `subscription_cancelled`
- Attribution: UTM parameters on KakaoTalk share links
- Performance: API latency p50/p95/p99, AI inference time, map tile load time

### Non-Goals and Boundaries

#### Explicit Non-Goals

- **Full social network:** BirdWatch includes a lightweight birding feed and profile surfaces, but it is NOT a full social network. No comments, captions, followers, DMs, stories, or creator-style text posting in MVP/P1.
- **Scientific data collection tool:** BirdWatch is a GAME first. Data quality is important but gamification takes priority over citizen-science rigor. We are not building eBird.
- **Hardcore ornithologist features:** No audio spectrogram analysis, no field mark annotation, no taxonomy dispute resolution. Target is MZ casual gamers.
- **Global species coverage at launch:** MVP covers 300 Korean species only. Global expansion is post-MVP.
- **Real-time multiplayer:** No real-time co-op, PvP, or shared AR experiences. Leaderboard is async only.
- **Augmented Reality (AR):** No AR bird overlays. Camera is for real photo capture only.
- **Offline AI identification:** MVP requires network connectivity for AI identification. Offline mode queues photos for later ID, does not run on-device inference.
- **Background location tracking:** MVP is foreground-only GPS. Background location is v1.1+ (App Store rejection risk).
- **Monetization beyond subscription:** No ads, no loot boxes, no gacha, no NFTs. Subscription only.
- **Desktop or web app:** Mobile-only (iOS + Android) for MVP.

#### Phase 1 Boundaries

- Authentication: Kakao Login + Apple Sign-In + Google OAuth only. No email/password, no phone number auth.
- Species count: 300 Korean species (of 603+ total). Expansion in Phase 2.
- AI model: Photo identification only. Sound identification (BirdNET integration) is P1.
- Map: View-only sighting pins. No heatmaps, no spawn prediction, no route planning.
- Gamification: Badges + rarity points + streaks only. No leaderboard, no seasonal events in MVP.
- Language: Korean only. English localization is post-MVP.

#### Future Considerations (Post-MVP)

- BirdNET sound identification integration (MIT license, 6,522 species)
- Seasonal migration events as limited-time game events
- Regional/global leaderboards
- Community features (sighting verification, photo sharing)
- English and additional language support
- Species expansion to 600+ Korean species, then global
- Apple Watch companion (quick-log sighting)
- Export to eBird format for citizen-science contribution

---

## 4. User Personas and Use Cases

### Persona 1: 김지연 (Kim Jiyeon) — Casual Explorer (Primary)

**Demographics:** 27 years old, marketer at a Seoul tech startup
**Experience:** Zero birding knowledge. Plays casual mobile games 30-40 min/day. Active Instagram and KakaoTalk user.
**Device:** iPhone 15, always-on data

**Goals:**
- Turn weekend walks along Hangang (한강) into something more engaging than step counting
- Collect things — any collection mechanic hooks her (played Pok&eacute;mon GO for 2 years)
- Share interesting discoveries with friends via KakaoTalk
- Maintain daily streaks (motivated by streak-based apps like Duolingo)

**Pain Points:**
- Pok&eacute;mon GO feels stale and fictional — wants real-world discovery
- Existing birding apps are intimidating, academic, and entirely in English
- No idea what birds she sees daily — wants instant "what is that?" answers

**Use Cases:**
- UC-JY-01: Walking along Hangang, sees a colorful bird, opens BirdWatch, takes photo, gets instant ID ("물총새 / Common Kingfisher, 3pts!"), species added to collection
- UC-JY-02: Opens app Monday morning, sees "7-day streak!" notification, walks to park during lunch to maintain streak
- UC-JY-03: Unlocks rare species (황조롱이 / Kestrel), shares collection card to KakaoTalk group chat, friend downloads app from share link

**Key Metrics:** Streak length, species count growth rate, KakaoTalk share frequency
**Monetization Path:** Hits 10 daily ID limit around Day 12 (47 species collected), converts to Explorer Pass at 6,900 KRW/month

---

### Persona 2: 박선호 (Park Sunho) — Hobbyist Birder (Secondary)

**Demographics:** 41 years old, amateur photographer, lives in Bundang (경기도)
**Experience:** 3 years casual birding, owns 200-400mm telephoto lens. Active on Naver Cafe birding community. Recognizes ~80 species by sight.
**Device:** Samsung Galaxy S24 Ultra (200MP camera)

**Goals:**
- Log sightings with GPS coordinates instead of manual spreadsheets
- Get AI assistance for species he is unsure about (especially winter migrants)
- Build a definitive personal life list with dates and locations
- Earn recognition in the birding community for rare sighting documentation

**Pain Points:**
- Merlin Bird ID is English-only and misidentifies many Korean subspecies
- No app provides Korean-language species information with habitat/behavior data
- Manually recording GPS coordinates for each sighting is tedious
- Korean birding communities have no standardized digital sighting log

**Use Cases:**
- UC-SH-01: At Cheorwon (철원), photographs a crane, AI identifies as 두루미 (Red-crowned Crane, 천연기념물 #202, 25pts!), sighting auto-logged with GPS coordinates
- UC-SH-02: Reviews monthly sighting map, notices cluster near specific wetland, plans return visit
- UC-SH-03: AI misidentifies a warbler, manually corrects to 쇠솔새 (Yellow-browed Warbler), correction logged for model improvement

**Key Metrics:** Species accuracy acceptance rate, sightings per week, session duration
**Monetization Path:** Subscribes Day 1 for full species catalog and GPS export. High LTV (12+ month retention).

---

### Persona 3: 이준호 (Lee Junho) — Competitive Collector (Secondary)

**Demographics:** 22 years old, KAIST student (Daejeon), CS major
**Experience:** Competitive gamer — Lost Ark, Pok&eacute;mon GO (Level 45), MapleStory. Zero birding background but loves completion mechanics and travel.
**Device:** iPhone 16 Pro

**Goals:**
- 100% collection completion — wants to catch them all
- Compete on leaderboard for rarity points
- Plan real trips to specific locations for legendary-tier species
- Min-max the rarity point system

**Pain Points:**
- Pok&eacute;mon GO has no real discovery — spawns are algorithmic and repetitive
- Wants a collection game grounded in reality where travel genuinely matters
- No existing game rewards visiting specific Korean natural heritage sites

**Use Cases:**
- UC-JH-01: Sees that 흑두루미 (Hooded Crane, 천연기념물, 25pts) is only sightable at Suncheon Bay (순천만) in winter, plans KTX trip
- UC-JH-02: Checks leaderboard, sees he is 200 points behind #1, identifies that 3 rare migratory species are passing through Socheong Island this week
- UC-JH-03: Discovers a 희귀종 (rare vagrant species) not yet in anyone's collection, shares screenshot to gaming community Discord

**Key Metrics:** Total rarity points, unique species count, collection completion %, travel distance
**Monetization Path:** Subscribes immediately for competitive advantage. Willing to spend 15,000 KRW/month. Drives word-of-mouth in gaming communities.

---

## 5. Functional Requirements

### 5.1 Authentication & Onboarding

**FR-001: Kakao Login (OAuth 2.0)** (P0)
Users must be able to sign in using Kakao Login, the dominant Korean social login (47M+ registered users).

*Acceptance Criteria:*
- Given a user with a Kakao account, when they tap "카카오로 시작하기", then they are redirected to Kakao OAuth consent screen
- Given successful Kakao OAuth, when the app receives the auth token, then a BirdWatch account is created (or existing account linked) within 2 seconds
- Given Kakao OAuth consent, when the user returns to the app, then their Kakao profile name and thumbnail are pre-populated
- Given a Kakao login failure (network error, user cancellation), when the error occurs, then user sees a Korean-language error message with retry option

*Technical Notes:*
- Kakao REST API v2 (`/v2/user/me`)
- Required scopes: `profile_nickname`, `profile_image`
- Token refresh via AWS Cognito federated identity

---

**FR-002: Apple Sign-In** (P0)
iOS users must have Apple Sign-In as an authentication option (Apple App Store requirement when offering third-party login).

*Acceptance Criteria:*
- Given an iOS user, when they tap "Apple로 로그인", then the native Apple Sign-In sheet appears
- Given successful Apple authentication, when returning to app, then account is created/linked within 2 seconds
- Given Apple "Hide My Email" is selected, when account is created, then the relay email is stored and functions correctly for account recovery

---

**FR-003: Google OAuth 2.0** (P0)
Users must be able to sign in using Google accounts (required for Android reach and global expansion).

*Acceptance Criteria:*
- Given a user with a Google account, when they tap "Google로 로그인", then standard Google OAuth flow initiates
- Given successful Google authentication, when returning to app, then account is created/linked within 2 seconds

---

**FR-004: Onboarding Flow** (P0)
First-time users must complete a brief onboarding that establishes core mechanics and collects required consents.

*Acceptance Criteria:*
- Given a first-time authenticated user, when they enter the app, then they see a 3-screen onboarding:
  1. "새를 찾아 사진을 찍으세요" (Find birds and take photos) — camera mechanic
  2. "AI가 종을 알려드려요" (AI identifies the species) — identification mechanic
  3. "나만의 도감을 완성하세요" (Complete your encyclopedia) — collection goal
- Given onboarding completion, when user taps "시작하기", then required consent timestamps are stored and they land on the Map View (home screen)
- Each onboarding screen must be swipeable and skippable via "건너뛰기" button
- Total onboarding flow must complete in < 30 seconds (no forced tutorials)

---

**FR-005: PIPA-Compliant GPS Consent** (P0)
Users must explicitly consent to GPS data collection per Korean Personal Information Protection Act (PIPA) before any location data is accessed.

*Acceptance Criteria:*
- Given a user who has not consented to GPS collection, when the app first requests location, then a dedicated PIPA consent screen appears BEFORE the OS-level location permission dialog
- The consent screen must include:
  - Purpose of GPS collection ("탐조 위치 기록 및 지도 표시")
  - Data retention period ("탈퇴 시까지 보관, 탈퇴 후 30일 이내 파기")
  - Third-party sharing scope ("제3자 제공 없음, 민감종 좌표 자동 난독화")
  - User rights ("동의 철회, 열람, 정정, 삭제 요청 가능")
- Given the user declines GPS consent, when they return to the app, then the app still supports photo capture, AI identification, and sighting save without coordinates while suppressing current-location features
- Consent record must be stored with timestamp and version hash in the user profile

---

### 5.2 AI Photo Identification

**FR-010: Camera Capture Interface** (P0)
Users must be able to capture bird photos through an in-app camera optimized for bird identification.

*Acceptance Criteria:*
- Given a user on the main screen, when they tap the camera button (center bottom FAB), then the camera interface opens within 500ms
- Camera interface includes: viewfinder, shutter button, flash toggle (auto/on/off), zoom pinch gesture (1x-10x), vertical zoom slider on the right edge for one-handed quick adjustment (1x–10x range), gallery import button
- Zoom slider is optimized for bird photography at distance: tap-to-snap at 2x, 5x, 10x presets on long-press; smooth drag for fine control
- Zoom level persists between shots within the same session; resets to 1x on camera close
- Given a photo is captured, when the image is saved, then it is stored at minimum 1024x1024 resolution for AI processing
- Given a photo from the device gallery, when the user taps the gallery import button, then they can select an existing photo for identification
- Camera preview must maintain >= 24fps on target devices (iPhone 12+ / Galaxy S21+)

---

**FR-011: AI Species Identification Request** (P0)
Captured or imported photos must be sent to the AI identification service and return results.

*Acceptance Criteria:*
- Given a captured photo, when the user taps "이 새는 뭘까?" (What bird is this?), then the photo is uploaded to the identification API
- Given a successful upload, when AI processing completes, then results are returned in < 5 seconds (p95) including network round-trip
- Given network unavailability, when the user attempts identification, then the photo is queued locally with a message that analysis will resume after connectivity is restored and the user confirms recovery
- Upload must use presigned S3 URLs (no raw credentials on device)
- Photo EXIF data must be stripped before upload (privacy: removes device serial, precise location metadata from the image file itself — GPS is captured separately via the app)

---

**FR-012: AI Identification Results Display** (P0)
Identification results must present the top species match with confidence and alternatives.

*Acceptance Criteria:*
- Given AI results are received, when displayed to user, then the result card shows:
  - Top-1 species: Korean name (한국명), scientific name, English name
  - Confidence percentage (displayed as "확신도 87%")
  - Rarity badge and point value
  - Species silhouette or reference photo
  - Top-3 alternatives in a collapsible "다른 후보" section
- Given confidence >= 85%, when the result is shown, then "맞아요!" (Correct!) is the primary CTA and "다시 찍기" (Retake) is secondary
- Given confidence 50-84%, when the result is shown, then both "맞아요!" and "다른 종이에요" (Different species) buttons are equally prominent
- Given confidence < 50%, when the result is shown, then display "확인이 어렵습니다. 다시 찍어보세요" (Hard to confirm. Try retaking.) with "다시 찍기" as primary CTA

---

**FR-013: AI Identification Acceptance / Rejection** (P0)
Users must be able to review, confirm, or correct AI identification results before saving.

*Acceptance Criteria:*
- Given AI results are received, when presented, then the user sees a review surface with top candidates and a clear final-save action
- Given the user taps "맞아요!" (accept), when confirmed, then the sighting is saved with species ID, photo, optional GPS, timestamp, and confidence score
- Given the user taps "다른 종이에요" (reject), when tapped, then a species search modal opens where user can manually select the correct species
- Given the user manually corrects species, when saved, then both the AI suggestion and user correction are logged (for model retraining data)
- Given the user taps "다시 찍기" (retake), when tapped, then camera reopens and the failed attempt is logged as an event (not saved as sighting)

---

**FR-014: AI Model Specifications** (P0)
The AI identification model must meet defined accuracy and performance thresholds.

*Acceptance Criteria:*
- Model architecture: EfficientNet-Lite B2 quantized to INT8
- Model size: <= 8MB (for on-device inference in future versions; server-side for MVP)
- Species coverage: 300 Korean species (200 species at >= 80% top-1 accuracy, remaining 100 at >= 60%)
- Top-1 accuracy on Korean species validation set: >= 80% (weighted average across all 300 species)
- Top-3 accuracy on Korean species validation set: >= 92%
- Inference time (server-side, GPU): < 500ms per image
- Training data: NIBR (National Institute of Biological Resources) Korean bird image dataset + iNaturalist Korean observations + curated web images
- Validation set: 50 images per species minimum, geographically diverse within Korea, seasonal coverage

*Example:*
```
Input: Photo of 물총새 (Common Kingfisher) taken at Hangang, 1024x1024px
→ Output:
  {
    "top_1": {"species_id": "KR-142", "name_ko": "물총새", "name_sci": "Alcedo atthis", "confidence": 0.91},
    "top_3": [
      {"species_id": "KR-142", "name_ko": "물총새", "confidence": 0.91},
      {"species_id": "KR-143", "name_ko": "청호반새", "confidence": 0.05},
      {"species_id": "KR-141", "name_ko": "호반새", "confidence": 0.02}
    ],
    "inference_ms": 312
  }
```

---

**FR-015: Free Tier Daily Identification Limit** (P0)
Free-tier users are limited to 10 AI identifications per day.

*Acceptance Criteria:*
- Given a free-tier user, when they have used 10 IDs today, then the next attempt shows "오늘의 무료 분석을 모두 사용했어요" with a CTA to upgrade to Explorer Pass
- Daily limit resets at 00:00 KST (UTC+9)
- Remaining count is displayed on the camera button badge: "7/10"
- Given an Explorer Pass subscriber, when they attempt identification, then no daily limit applies
- Gallery imports count toward the daily limit equally with camera captures

---

**FR-016: Identification Queue (Offline)** (P1)
Photos taken without network connectivity must be queued for identification when connectivity resumes.

*Acceptance Criteria:*
- Given no network connectivity, when user takes a photo and requests ID, then photo is saved locally with optional GPS and original capture timestamp
- Queue displays in a "대기 중" (Pending) section with photo thumbnails and "분석 대기 중" status
- Given network connectivity resumes, when the app detects connectivity, then the user is prompted once to resume queued processing
- Given the user confirms recovery, when resume starts, then queued photos are uploaded in FIFO order using the original capture timestamp
- Maximum queue depth: 50 photos (beyond 50, oldest queued photo is warned for deletion)
- Queue persists across app restarts

---

**FR-017: Photo Quality Validation** (P1)
Photos should be pre-validated for identification quality before consuming a daily ID attempt.

*Acceptance Criteria:*
- Given a captured photo, when analyzed locally, then the following quality checks run before upload:
  - Blur detection: if image sharpness score < threshold, show "사진이 흐릿해요. 다시 찍어보세요" (Photo is blurry)
  - Brightness: if image is severely under/over-exposed, show "너무 어두워요/밝아요" (Too dark/bright)
  - Bird detection: basic object detection confirms a bird-shaped object exists in frame (reduces wasted IDs on landscapes/pets)
- Quality validation must complete in < 1 second on-device
- User can override quality warnings and submit anyway ("그래도 분석하기")
- Quality check failures do NOT count against daily ID limit

---

**FR-018: AI Model Update Mechanism** (P1)
The AI model must be updateable without requiring an app store update.

*Acceptance Criteria:*
- Given a new model version is available, when the app launches (or enters foreground after 24h), then it checks for model updates
- Model download must be background-capable and resumable
- Given a model update is available, when download completes, then the new model is activated on next identification attempt (not mid-session)
- Rollback: if new model fails validation (crash or accuracy regression), revert to previous version automatically
- Model versions are tracked in analytics events

---

### 5.3 GPS Sighting Log

**FR-030: GPS Tagging with Location-Optional Save** (P0)
Confirmed sightings must store GPS coordinates when consented and available, while still allowing save without coordinates.

*Acceptance Criteria:*
- Given a sighting is confirmed (user taps "맞아요!"), when GPS is available and consented, then coordinates (latitude, longitude) are attached with accuracy radius
- GPS accuracy must be <= 20 meters. If accuracy > 20m, display a warning icon on the sighting with "위치 정확도가 낮습니다"
- Coordinate format: WGS84 decimal degrees, stored to 6 decimal places (sub-meter precision)
- Given GPS is unavailable (denied or hardware failure), when a sighting is confirmed, then it is saved without coordinates with status "위치 정보 없음"

---

**FR-031: Timestamp Recording** (P0)
Every sighting must be timestamped in both UTC and local time.

*Acceptance Criteria:*
- Given a sighting is confirmed, when saved, then both UTC timestamp and local timezone (e.g., `Asia/Seoul`) are recorded
- Display format in UI: "2026년 3월 28일 오후 2:34" (Korean date format)
- Given a queued offline photo, when eventually processed, then the ORIGINAL capture timestamp (not upload time) is used

---

**FR-032: Sighting Detail View** (P0)
Each saved sighting must have a detail view with all captured data.

*Acceptance Criteria:*
- Given a user opens a sighting, when the detail view loads, then it displays:
  - User's photo (full resolution, zoomable)
  - Species Korean name, scientific name, English name
  - Rarity badge and point value
  - Date and time (local)
  - Map thumbnail showing pin location
  - AI confidence score
  - Weather conditions at time of sighting (temperature, weather icon — pulled from Open-Meteo API)
- Detail view loads within 1 second (image lazy-loaded)

---

**FR-033: Sighting History List** (P0)
Users must be able to browse all their past sightings.

*Acceptance Criteria:*
- Given a user navigates to "내 기록" (My Records), when the list loads, then sightings are displayed in reverse chronological order
- Each list item shows: species thumbnail, Korean name, date, location name (reverse geocoded), rarity badge
- List must support infinite scroll with 20-item page size
- Filter options: by species, by date range, by rarity tier, by location (시/도 level)
- Search: text search by Korean or scientific species name

---

**FR-034: Sensitive Species Coordinate Obscuring** (P0)
Sightings of sensitive species must have coordinates obscured in all shared/public contexts.

*Acceptance Criteria:*
- **Tier 1 (천연기념물 / Natural Monuments):** Coordinates obscured to 252 km^2 grid cell in any shared context (API response, map pins, exports). The original user can see exact coordinates in their private sighting detail only.
- **Tier 2 (멸종위기종 / Endangered Species, EN/CR on IUCN Red List):** Coordinates obscured to 5 km^2 grid cell in shared contexts.
- **Tier 3 (일반종 / General species):** Exact coordinates shown.
- Obscuring is applied server-side before any data leaves the user's private scope.
- Species sensitivity tier is defined in the species database and reviewed quarterly.
- Given a user views their OWN Tier 1 sighting, when on their private sighting detail, then exact coordinates are visible
- Given ANY API request for Tier 1 sighting coordinates by non-owner, when served, then only the obscured grid cell center is returned

*Example:*
```
Tier 1 sighting (두루미 / Red-crowned Crane, 천연기념물 #202):
  Original coordinates: 38.1234, 127.5678
  Obscured (252km² grid): 38.07, 127.50  (grid cell center)
  Private owner view: 38.1234, 127.5678  (exact)
```

---

**FR-035: Sighting Deletion** (P1)
Users must be able to delete their own sightings.

*Acceptance Criteria:*
- Given a user is on their sighting detail, when they tap "삭제" and confirm, then the sighting is soft-deleted (retained 30 days for abuse review, then hard-deleted)
- Species collection status recalculates: if the deleted sighting was the only observation of that species, the species reverts to "미발견" (undiscovered) silhouette state
- Rarity points are recalculated accordingly
- Deletion confirmation dialog: "이 관찰 기록을 삭제하시겠어요? 포인트가 차감됩니다." (Delete this sighting? Points will be deducted.)

---

### 5.4 Species Collection (Bird Encyclopedia / 도감)

**FR-040: Species Encyclopedia Grid View** (P0)
Users must be able to browse all collectible species in an encyclopedia (도감) format.

*Acceptance Criteria:*
- Given a user opens "도감" (Encyclopedia), when the view loads, then all 300 species are displayed in a grid (6 columns on tablet, 4 on phone)
- **Discovered species:** Full-color species reference photo, Korean name, rarity badge
- **Undiscovered species:** Dark silhouette shape, "???" as name, rarity badge visible (to entice collection)
- Grid can be filtered by: rarity tier, taxonomic order, discovered/undiscovered, habitat type
- Grid default sort: **수집한 종 먼저 (Collected First)** — discovered species appear at the top, undiscovered silhouettes below; within each group, sorted by most recently collected
- Additional sort options: rarity points (highest first), Korean name (가나다순), collection order (oldest first)
- "수집한 종 먼저" sort state persists across app sessions
- Collection progress bar at top: "127 / 300 종 발견" (127 of 300 species discovered)

---

**FR-041: Species Discovery Animation** (P0)
First-time species discoveries must trigger a celebratory reveal animation.

*Acceptance Criteria:*
- Given a user confirms a sighting of a species they have never seen before, when saved, then a full-screen reveal animation plays:
  - Silhouette transforms into the full-color species image
  - Korean name appears with rarity badge
  - Point value displays with "+3pt" animation
  - Confetti/particle effect scaled by rarity (텃새: subtle shimmer, 천연기념물: golden explosion)
- Animation duration: 2-3 seconds, skippable by tap
- Sound effect plays (muted if device is on silent)
- "새로운 종 발견!" (New species discovered!) banner

---

**FR-042: Species Detail Page** (P0)
Each species in the encyclopedia must have a dedicated detail page with educational and game information.

*Acceptance Criteria:*
- Given a user taps a discovered species in the encyclopedia, when the detail page loads, then it displays:
  - **Header:** Korean name (한국명), scientific name, English name, IOC taxonomy (order/family)
  - **User's photos:** Horizontal photo carousel showing all of the user's sighting photos for this species, sorted newest-first; tap to view full-screen with swipe navigation; photo count badge (e.g. "내 사진 3장"); shown only for discovered species
  - **Rarity info:** Rarity tier (텃새/나그네새/희귀종/천연기념물), point value, ABA code equivalent
  - **Species info:** Size (cm), habitat description (Korean), seasonal presence calendar (12-month bar showing when species is present in Korea), conservation status (IUCN)
  - **Sighting history:** List of user's sightings of this species with dates and locations
  - **Fun fact:** One curated Korean-language fun fact per species ("물총새는 시속 40km로 다이빙합니다")
- Given an undiscovered species, when tapped, then only the silhouette, rarity tier, habitat type, and seasonal calendar are visible (no name, no photos, no fun fact — creates discovery incentive)

---

**FR-043: Species Data Source — IOC World Bird List** (P0)
All species taxonomy must follow IOC World Bird List standards (the Asian ornithological standard), not Clements (American standard).

*Acceptance Criteria:*
- Species names, taxonomic order, and family classification follow IOC World Bird List v14.x
- Korean names (한국명) follow NIBR Korean Bird Checklist
- Scientific names match IOC authority
- Given an IOC taxonomy update, when the species database is updated, then existing sightings retain their original species ID with a migration note

---

**FR-044: Rarity System** (P0)
Species rarity must be tiered based on real-world occurrence data and Korean legal designations.

*Acceptance Criteria:*

| Tier | Korean Name | Criteria | Points | Badge Color |
|------|-------------|----------|--------|-------------|
| Common | 텃새 (Resident) | ABA Code 1-2, year-round resident | 1 pt | Green |
| Migrant | 나그네새 (Migrant) | ABA Code 3, seasonal visitor | 3 pt | Blue |
| Rare | 희귀종 (Rare Visitor) | ABA Code 4, irregular/uncommon | 10 pt | Purple |
| Legendary | 천연기념물 (Natural Monument) | Korean Cultural Heritage designated species | 25 pt | Gold |

- Rarity tier is assigned per species in the species database and is NOT dynamic
- 천연기념물 tier includes all bird species designated as Korean Natural Monuments by the Cultural Heritage Administration (approximately 50 species)
- Total rarity points displayed on user profile: sum of all unique species points (no double-counting for multiple sightings of same species)

---

**FR-045: Free Tier Species Limit** (P0)
Free-tier users can only view/collect 200 of the 300 species.

*Acceptance Criteria:*
- Given a free-tier user, when they browse the encyclopedia, then 200 species are visible (silhouette or discovered) and 100 species show a lock icon with "Explorer Pass로 잠금 해제" (Unlock with Explorer Pass)
- Locked species are the 100 highest-rarity species (all 천연기념물, all 희귀종, and some 나그네새)
- Given a free-tier user identifies a locked species, when the result is shown, then they see the species name and result but CANNOT save it to their collection without upgrading
- "이 종을 도감에 추가하려면 Explorer Pass가 필요해요" (Explorer Pass required to add this species to your collection)

---

### 5.5 Map View

**FR-060: Map Display with Sighting Pins** (P0)
Users must be able to view their sightings on an interactive map.

*Acceptance Criteria:*
- Given a user opens the Map View (home screen / default tab), when the map loads, then:
  - Map displays using Google Maps native rendering
  - User's current location is shown with a pulsing blue dot
  - All user's sightings are shown as pins colored by rarity tier (green/blue/purple/gold)
  - Map centers on user's current location at city-level zoom by default
- Map tiles must load within 3 seconds on 4G LTE connection
- Map is pannable, zoomable (pinch/double-tap), and rotatable
- Map style: clean outdoor/nature theme (not urban/road-focused)

---

**FR-061: Pin Clustering** (P0)
When zoomed out, nearby sighting pins must cluster to prevent visual clutter.

*Acceptance Criteria:*
- Given zoom level < 12 (approximately city-wide view), when multiple pins overlap, then they cluster into a single numbered circle showing count
- Cluster circle color reflects the highest-rarity species in the cluster (gold if any 천연기념물 included)
- Given a user taps a cluster, when tapped, then the map zooms to the cluster's bounding box, expanding pins
- Cluster animations must be smooth (no jarring jumps)

---

**FR-062: Pin Detail Popup** (P0)
Tapping a sighting pin must show a summary popup.

*Acceptance Criteria:*
- Given a user taps a sighting pin, when the popup appears, then it shows:
  - Species Korean name and rarity badge
  - Sighting date
  - User's photo thumbnail
  - "자세히 보기" (View Details) link to full sighting detail (FR-032)
- Popup appears within 200ms of tap
- Popup dismisses on background tap or swipe down

---

**FR-063: Map Location Permission Handling** (P0)
Map must gracefully handle various location permission states.

*Acceptance Criteria:*
- Given location permission is granted, when map opens, then current location blue dot is shown
- Given location permission is denied, when map opens, then map centers on Seoul (37.5665, 126.9780) as default and a persistent banner says "위치 권한을 허용하면 현재 위치를 볼 수 있어요" with a "설정으로 이동" (Go to Settings) button
- Given location permission is "while using app" (foreground only), when the app is in foreground, then location updates normally

---

**FR-064: Map Tile Caching** (P1)
Map tiles must be cached for reduced data usage and faster repeat loads.

*Acceptance Criteria:*
- Given a map region has been viewed, when the user revisits the same region within 7 days, then cached tiles are used (no re-download)
- Maximum cache size: 200MB (configurable)
- Cache eviction: LRU (least recently used)
- Given cached tiles are used, when displayed, then map loads within 1 second

---

### 5.6 Gamification

**FR-070: Milestone Badges** (P0)
Users earn achievement badges for reaching defined milestones.

*Acceptance Criteria:*

| Badge ID | Name (Korean) | Condition | Icon Theme |
|----------|---------------|-----------|------------|
| BDG-001 | 첫 만남 (First Encounter) | Log first sighting | Egg hatching |
| BDG-002 | 탐조 입문 (Beginner Birder) | Discover 10 species | Binoculars |
| BDG-003 | 열정 탐조인 (Passionate Birder) | Discover 50 species | Field guide |
| BDG-004 | 전문 탐조인 (Expert Birder) | Discover 150 species | Telescope |
| BDG-005 | 전설의 탐조인 (Legendary Birder) | Discover 300 species (100%) | Golden eagle |
| BDG-006 | 텃새 마스터 (Resident Master) | Discover all 텃새 (common) species | Nest |

- Given a badge condition is met, when triggered, then a toast notification appears with badge icon and name
- Badge detail view shows: name, description, date earned, rarity (how many users have earned it)
- Badges are displayed on the user's profile summary
- Badge earned event is tracked in analytics

---

**FR-071: Rarity Score (Total Points)** (P0)
Users accumulate rarity points based on unique species discovered.

*Acceptance Criteria:*
- Total rarity score = sum of point values for all unique species in collection
- Points are awarded per UNIQUE species only (multiple sightings of the same species do not add points)
- Score is displayed prominently on user profile and in the encyclopedia header
- Score breakdown is viewable: "텃새 45pt + 나그네새 24pt + 희귀종 30pt + 천연기념물 50pt = 149pt"
- Given a sighting is deleted (FR-035) and it was the only sighting of that species, then points for that species are deducted

---

**FR-072: Daily Streak Counter** (P0)
Users earn streak rewards for consecutive days of logging at least one sighting.

*Acceptance Criteria:*
- Given a user logs at least one sighting today, when the day ends (00:00 KST), then the streak counter increments
- Streak is displayed on the home screen: "연속 7일 탐조 중!" (7-day birding streak!)
- Streak breaks if a calendar day (KST) passes with zero sightings
- Streak milestones trigger bonus recognition:
  - 7 days: "1주일 연속!" toast
  - 30 days: "한 달 연속!" toast + special badge
  - 100 days: "100일 연속!" toast + special badge
- Streak reset is immediate and not retroactively fixable (no "streak freeze" in MVP)

---

**FR-073: Level / Rank System** (P1)
Users progress through ranks based on total rarity points and activity.

*Acceptance Criteria:*
- Rank tiers based on total rarity points:

| Level | Name | Points Required |
|-------|------|-----------------|
| 1 | 참새 (Sparrow) | 0 |
| 2 | 박새 (Tit) | 10 |
| 3 | 딱새 (Robin) | 30 |
| 4 | 물총새 (Kingfisher) | 75 |
| 5 | 황조롱이 (Kestrel) | 150 |
| 6 | 수리부엉이 (Eagle Owl) | 300 |
| 7 | 독수리 (Vulture) | 500 |
| 8 | 두루미 (Crane) | 750 |

- Level-up animation plays when threshold is crossed
- Rank name and icon appear on user profile

---

**FR-074: Weekly Challenge System** (P2)
Users receive weekly challenges for bonus engagement.

*Acceptance Criteria:*
- One challenge active per week, refreshing Monday 00:00 KST
- Challenge types: "이번 주에 물새 3종 발견하기" (Discover 3 waterbird species this week), "새로운 장소에서 탐조하기" (Bird in a new location), etc.
- Completion grants bonus badge or points
- Challenge is displayed on home screen below streak counter

---

### 5.7 P1 Features (Post-MVP, FR-100+)

**FR-100: BirdNET Sound Identification** (P1)
Users can identify birds by sound recording using the BirdNET open-source model.

*Acceptance Criteria:*
- Given a user taps "소리로 찾기" (Find by sound), when recording starts, then ambient audio is captured for 3-15 seconds
- Given a recording is submitted, when BirdNET processes it, then top-3 species matches are returned with confidence
- BirdNET model (MIT license) runs server-side; 6,522 species coverage
- Sound identifications count toward the daily free-tier limit
- Sound sightings are tagged "소리 관찰" (audio observation) in the sighting log

---

**FR-101: Seasonal Migration Events** (P1)
Real-world bird migration patterns drive in-game seasonal events.

*Acceptance Criteria:*
- Given a migration event is active (e.g., "봄 도래 이벤트" / Spring Arrival Event), when users open the app, then a banner announces the event with featured species
- Event duration: aligned with real migration windows (spring: March-May, fall: September-November)
- Featured species during events have 2x rarity points
- Event completion badge for discovering N featured species during the event window
- Events are configured server-side (no app update required)
- Maximum 4 major events per year (aligned with Korean birding seasons)

---

**FR-102: Leaderboard** (P1)
Users can compare rarity scores on regional and national leaderboards.

*Acceptance Criteria:*
- Leaderboard tabs: "내 지역" (My Region, 시/도 level), "전국" (National), "주간" (Weekly)
- Display: rank, username (or 익명 if opted out), rarity score, top species
- Updated every 15 minutes (not real-time)
- User's own rank is highlighted and always visible (even if not in top 100)
- Explorer Pass required to view leaderboard (free tier sees their own rank only)

---

**FR-103: KakaoTalk Sharing** (P1)
Users can share sighting cards and collection achievements via KakaoTalk.

*Acceptance Criteria:*
- Given a user taps "공유" on a sighting or badge, when the share sheet opens, then KakaoTalk is the primary option
- Shared content: rendered card image with species photo, Korean name, rarity badge, and BirdWatch branding
- KakaoTalk share link includes deep link (opens species detail in app, or App Store if not installed)
- UTM parameters embedded for attribution tracking
- Share card respects sensitive species rules (Tier 1/2 species show obscured location or no location)

---

**FR-104: Gallery Tab — Community Photo Feed** (P1)
Users can share their bird photos to a community gallery and browse, filter, and react to other users' photos.

*Overview:*
The Gallery tab is the primary social discovery surface of BirdWatch: an Instagram-like birding feed built around structured sighting posts, not free-form text content. Users opt-in to share individual sighting photos publicly. The feed is chronological by default with species/region/rarity filters. Engagement is intentionally lightweight in MVP/P1: hearts (좋아요) only. Captions, comments, follows, DMs, and stories are explicitly out of scope. Location is limited to province (도) level to protect privacy.

*Acceptance Criteria — Feed:*
- Given a user opens the "갤러리" tab, when the feed loads, then a chronological list of community-shared photos is displayed
- Each feed card shows: species photo (full-width), Korean species name + rarity badge, nickname (닉네임), approximate location (도 단위, e.g. "경상북도" — only if user allowed location), time ago (e.g. "3시간 전"), heart count
- Feed cards do not support free-form captions or comments in MVP/P1
- Feed is paginated (20 cards per page, infinite scroll)
- Sensitive species (천연기념물 / 희귀종) are **excluded from the gallery entirely** (PIPA + poaching risk)
- Tapping the creator nickname/avatar opens that user's public birding profile
- Tapping the photo/card opens a read-only post detail surface for that sighting photo; from there the user can navigate to the species detail page

*Acceptance Criteria — Filters:*
- Filter bar above the feed with three independent filters (combinable):
  - **종 (Species):** search by Korean name or select from dropdown
  - **지역 (Region):** select by 도 (province); options: 서울/경기, 강원도, 충청도, 전라도, 경상도, 제주도 + "전국 (All)"
  - **희귀도 (Rarity):** 텃새 / 나그네새 / 희귀종 (천연기념물 excluded, never in gallery)
- Active filters shown as removable chips; "전체 초기화" (Reset all) button
- Filter state persists during the session; resets on app close

*Acceptance Criteria — Hearts:*
- Given a user taps the heart icon on a feed card, when tapped, then the heart toggles (filled/outline) and count updates optimistically
- A user can heart their own photos (counts toward total but is visually distinguished)
- Heart count visible on each card; no breakdown of who hearted in P1

*Acceptance Criteria — Sharing a Photo:*
- Given a user is on the AI result screen or the sighting detail screen, when they tap "갤러리에 공유" (Share to Gallery), then a share confirmation sheet appears showing:
  - Photo preview
  - Species name + rarity badge
  - Location toggle: "위치 공개 (도 단위)" ON/OFF (default: OFF)
  - Share button
- Given location toggle is ON, when the photo is shared, then the province (도) is reverse-geocoded from the sighting GPS coordinates and stored as text (e.g. "전라남도") — raw GPS coordinates are never stored in the gallery record
- Given location toggle is OFF, when the photo is shared, then location field is null and no location text appears on the feed card
- A shared photo can be unshared (removed from gallery) at any time from the sighting detail screen; deletion is immediate

*Acceptance Criteria — Sharing Limits:*
- **Free tier:** maximum 30 photos total in the gallery at any time
  - Given a free-tier user reaches the 30-photo limit, when they attempt to share another photo, then a paywall sheet appears: "갤러리 공유는 최대 30장까지 가능해요. Explorer Pass로 무제한 공유하세요."
  - Deleting a shared photo restores one slot (limit is on currently-shared count, not lifetime total)
- **Explorer Pass:** unlimited gallery shares
- Sharing limit counter shown in user profile: "갤러리 사진 12 / 30장"

*Acceptance Criteria — Privacy & Safety:*
- Sensitive species (천연기념물, 희귀종) cannot be shared to the gallery — the "갤러리에 공유" button is hidden for these species
- Province-level location only; 시/군/구 or finer granularity is never shown
- Users can report inappropriate photos (report → hidden from reporter immediately, queued for admin review)
- Blocked users' photos are hidden from the feed

---

**FR-105: Profile Tab / Public Birding Profile** (P1)
Users can browse a birding-focused public profile and use their My Page as a lightweight social profile anchored in sightings, not text posting.

*Overview:*
The Profile tab should feel familiar to users of modern photo apps, but BirdWatch remains a birding product first. My Page and public profiles emphasize bird sightings, collection progress, and streak/rarity stats. The main social artifact is the shared sighting photo grid. Engagement remains lightweight: no captions, comments, followers, or DMs in MVP/P1.

*Acceptance Criteria — Profile Header:*
- Given a user opens their own My Page, when the screen loads, then they see profile image, nickname, total shared posts count, unique species count, total rarity score, and current streak
- Given a user opens another user's public profile from the gallery, when the screen loads, then they see the same public summary except private-only controls are hidden
- Profile header does not show follower/following counts in MVP/P1

*Acceptance Criteria — Profile Tabs:*
- My Page includes three top-level sections:
  - **게시물 (Posts):** shared birding photo grid
  - **도감 (Collection):** discovered species progress summary with entry point to encyclopedia
  - **기록 (Records):** personal sighting timeline/map summary
- Public profiles expose only the **게시물 (Posts)** section in MVP/P1

*Acceptance Criteria — Post Grid:*
- Posts section uses a dense 3-column square grid on phone and expands appropriately on tablet
- Each tile represents a shared sighting photo and preserves existing privacy rules for species/location
- Tapping a tile opens the read-only post detail surface for that shared sighting
- Grid is sorted newest-first by default

*Acceptance Criteria — My Page Actions:*
- Given a user is viewing their own profile, when they inspect the page, then they can access settings, subscription state, AI training consent, and gallery sharing counter
- Shared post management (unshare/delete) remains available only to the owner
- My Page remains the entry point for profile editing and privacy preferences

*Acceptance Criteria — Out of Scope:*
- No captions
- No comments
- No follower / following graph
- No DM or story-style ephemeral content

---

## 6. Non-Functional Requirements

### Performance

**NFR-PERF-001: API Response Time** (P0)
- All API endpoints must respond within 500ms (p50), 1000ms (p95), 3000ms (p99)
- AI identification endpoint: < 5 seconds (p95) including image upload + inference
- Measured from Seoul, Korea client to ap-northeast-2 backend

**NFR-PERF-002: App Launch Time** (P0)
- Cold start to interactive home screen: < 3 seconds on iPhone 12 / Galaxy S21
- Warm start (from background): < 1 second

**NFR-PERF-003: Map Tile Load** (P0)
- Initial map tile render: < 3 seconds on 4G LTE
- Subsequent pan/zoom tile load: < 1 second (from cache or network)
- Map frame rate: >= 30fps during pan/zoom on target devices

**NFR-PERF-004: Image Upload** (P0)
- Photo upload to S3 (via presigned URL): < 3 seconds for 5MB image on 4G LTE
- Upload progress indicator must be shown for any upload > 1 second

### Security

**NFR-SEC-001: Authentication Token Management** (P0)
- Access tokens: JWT, 1-hour expiry, stored in secure keychain (iOS Keychain / Android Keystore)
- Refresh tokens: 30-day expiry, stored in secure keychain
- All auth flows use PKCE (Proof Key for Code Exchange) for OAuth

**NFR-SEC-002: API Security** (P0)
- All API communication over HTTPS (TLS 1.2+)
- API rate limiting: 100 requests/minute per user, 1000 requests/minute per IP
- Presigned S3 URLs: 15-minute expiry, single-use

**NFR-SEC-003: Data Encryption** (P0)
- Data at rest: AES-256 (S3, RDS, device local storage)
- Data in transit: TLS 1.2+ (all API calls, S3 uploads)
- Database: PostgreSQL RDS encryption enabled

### Privacy (PIPA Compliance)

**NFR-PRIV-001: GPS Data Handling** (P0)
- GPS coordinates are classified as personal information under PIPA
- Separate explicit consent required before ANY GPS collection (FR-005)
- GPS data stored in Seoul region (ap-northeast-2) only — no cross-border transfer
- User can request complete GPS data deletion at any time
- Deletion executes within 30 days (PIPA requirement)

**NFR-PRIV-002: Photo Data Handling** (P0)
- EXIF data stripped from photos before upload (device serial number, embedded GPS, camera model)
- Photos stored in S3 Seoul region with user-scoped access controls
- Photos deleted within 30 days of account deletion

**NFR-PRIV-003: Analytics Privacy** (P0)
- PostHog self-hosted on Seoul region infrastructure (no third-party data transfer)
- No personally identifiable information in analytics events (user ID is pseudonymous hash)
- Analytics data retention: 12 months, then auto-purged

**NFR-PRIV-004: Privacy Policy & Terms** (P0)
- Korean-language privacy policy accessible in-app at all times
- Privacy policy must enumerate: data collected, purpose, retention period, third-party sharing, user rights
- Terms of Service in Korean, including species identification disclaimer ("AI 분석 결과는 참고용이며 정확성을 보장하지 않습니다")

### Battery & Resource Usage

**NFR-BAT-001: Battery Consumption** (P0)
- Foreground GPS usage must not exceed 5% battery per hour of active use on iPhone 14 / Galaxy S23
- No background location tracking in MVP (foreground-only)
- GPS polling interval: 10 seconds when camera is active, 30 seconds on map view, stopped when on encyclopedia/profile views

**NFR-BAT-002: Storage Usage** (P0)
- App binary size: < 80MB (excluding model, which downloads post-install)
- AI model download: < 10MB
- Photo cache: configurable, default 500MB, auto-eviction of oldest
- Map tile cache: configurable, default 200MB, LRU eviction
- Total maximum local storage: < 1GB with defaults

### Offline Capability

**NFR-OFF-001: Offline Mode** (P0)
- Without network: camera capture works, photo is queued for ID (FR-016), GPS is tagged, encyclopedia browse works (cached data), map shows cached tiles only
- Without network: AI identification does NOT work (MVP is server-side inference)
- Offline queue syncs automatically when connectivity resumes
- App must not crash or show blank screens when offline — all offline limitations must have clear Korean-language messaging

### Accessibility

**NFR-ACC-001: Minimum Accessibility** (P1)
- VoiceOver (iOS) and TalkBack (Android) support for all primary flows
- Minimum touch target size: 44x44pt (iOS) / 48x48dp (Android)
- Color contrast ratio: >= 4.5:1 for text, >= 3:1 for UI elements
- Rarity badges use both color AND icon shape (not color-only differentiation)

---

## 7. Technical Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        MOBILE CLIENT                            │
│  React Native (TypeScript)                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ Camera   │ │ Google   │ │ Encyclop │ │ Auth     │           │
│  │ Module   │ │ Maps SDK │ │ Module   │ │ Module   │           │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘           │
│       │             │            │             │                 │
│  ┌────┴─────────────┴────────────┴─────────────┴──────────┐     │
│  │              Local SQLite Cache                         │     │
│  │  (species DB, sighting queue, map tiles, preferences)   │     │
│  └─────────────────────────┬───────────────────────────────┘     │
└────────────────────────────┼────────────────────────────────────┘
                             │ HTTPS (TLS 1.2+)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AWS (ap-northeast-2, Seoul)                   │
│                                                                 │
│  ┌──────────────┐    ┌──────────────────────────────────────┐   │
│  │ CloudFront   │    │        API Gateway (ALB)              │   │
│  │ (CDN, static │    │                                       │   │
│  │  assets)     │    │  ┌──────────────────────────────┐     │   │
│  └──────────────┘    │  │  Fastify (Node.js) API Server│     │   │
│                      │  │                              │     │   │
│  ┌──────────────┐    │  │  /auth    → Cognito          │     │   │
│  │ S3 Bucket    │    │  │  /identify→ AI Inference Svc │     │   │
│  │ (photos,     │◄───│  │  /sighting→ PostGIS queries  │     │   │
│  │  models)     │    │  │  /species → Species DB       │     │   │
│  └──────────────┘    │  │  /map     → Tile proxy/cache │     │   │
│                      │  │  /gamify  → Badge/score logic │     │   │
│  ┌──────────────┐    │  └───────────────┬──────────────┘     │   │
│  │ AWS Cognito  │    │                  │                     │   │
│  │ (Identity    │    └──────────────────┼─────────────────────┘   │
│  │  Pool)       │                       │                         │
│  └──────────────┘                       ▼                         │
│                      ┌──────────────────────────────────────┐     │
│                      │  PostgreSQL 15 + PostGIS 3.4         │     │
│                      │  (RDS, Multi-AZ, encrypted)          │     │
│                      │                                       │    │
│                      │  Tables: users, sightings, species,   │    │
│                      │  badges, subscriptions, corrections   │    │
│                      └──────────────────────────────────────┘     │
│                                                                   │
│  ┌──────────────────────────────────────┐                         │
│  │  AI Inference Service (ECS Fargate)  │                         │
│  │  EfficientNet-Lite B2 INT8           │                         │
│  │  TensorFlow Serving on GPU instance  │                         │
│  │  Auto-scaling: 1-4 instances         │                         │
│  └──────────────────────────────────────┘                         │
│                                                                   │
│  ┌──────────────────────────────────────┐                         │
│  │  PostHog (Self-Hosted, EC2)          │                         │
│  │  Analytics, event tracking           │                         │
│  │  PIPA compliant (Seoul region)       │                         │
│  └──────────────────────────────────────┘                         │
└───────────────────────────────────────────────────────────────────┘

External Services:
  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │ Kakao OAuth  │  │ Google Maps  │  │ Open-Meteo   │
  │ (Auth)       │  │ (Maps/Geo)   │  │ (Weather)    │
  └──────────────┘  └──────────────┘  └──────────────┘
  ┌──────────────┐  ┌──────────────┐
  │ Apple/Google │  │ GBIF API     │
  │ OAuth        │  │ (Spawn data) │
  └──────────────┘  └──────────────┘
```

### Technical Stack Decisions with Rationale

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Mobile Framework | React Native (TypeScript) | Cross-platform from single codebase; large ecosystem; 1-person team efficiency; Expo integration for build pipeline |
| AI Model | EfficientNet-Lite B2 INT8 | 8MB model size enables future on-device inference; proven accuracy on fine-grained image classification; NIBR Korean fine-tuning feasible |
| Backend Runtime | Node.js + Fastify | Highest-performance Node framework; TypeScript end-to-end with mobile; small team single-language advantage |
| Database | PostgreSQL 15 + PostGIS 3.4 | PostGIS spatial queries for sighting map + species range; industry standard; RDS managed reduces ops burden |
| Map Rendering | Google Maps SDK | Stable mobile-native rendering, reliable POI/terrain quality in Korea, and lower product risk than self-managed tile infrastructure |
| Map Provider | Google Maps Platform | Confirmed product direction for launch build; consistent geocoding, mobile SDK support, and operational simplicity |
| Auth | AWS Cognito + Kakao/Apple/Google OAuth | Managed auth reduces security risk; Kakao federated identity support; PKCE flow built-in |
| Object Storage | S3 + CloudFront | Presigned URL pattern eliminates credential exposure; CloudFront for fast photo serving in Korea; client-side EXIF strip before upload plus server-side sanitize before identify/save |
| Analytics | PostHog (Self-Hosted) | PIPA compliance (Seoul region hosting, no third-party transfer); open-source; feature flags for rollout control |
| Spawn Data | GBIF CC BY 4.0 | Commercially usable (unlike eBird); global coverage; sufficient Korean bird occurrence data for spawn zone generation |
| Taxonomy | IOC World Bird List | Asian ornithological standard (not Clements/American); aligns with NIBR Korean checklist |

### Key Architecture Decisions

**AD-001: Server-Side AI Inference for MVP**
- Decision: Run AI inference server-side (ECS Fargate + GPU), not on-device
- Rationale: Simplifies MVP; allows model updates without app releases; GPU inference is faster and more accurate than mobile INT8; on-device inference planned for v2.0
- Trade-off: Requires network connectivity for identification; offline queue mitigates

**AD-002: PostGIS for Spatial Queries**
- Decision: Use PostGIS extension for all geospatial operations
- Rationale: Native spatial indexing (GiST) for sighting queries; coordinate obscuring functions built-in; distance calculations for "nearby sightings"; future heatmap generation
- Alternative rejected: MongoDB GeoJSON (less mature spatial indexing, team has PostgreSQL experience)

**AD-003: Google Maps over MapLibre / OpenFreeMap**
- Decision: Use Google Maps as the shipping map stack for MVP/P1
- Rationale: Better reliability and Korea map quality, faster implementation on the current team, and lower launch risk than self-managed tile/provider fallback logic
- Risk: Usage-based map cost must be monitored; mitigate with scoped API keys, quota alarms, and map screen instrumentation

**AD-004: GBIF over eBird for Spawn Data**
- Decision: Use GBIF (CC BY 4.0) for species occurrence/spawn data, NOT eBird
- Rationale: eBird has no public commercial API; Cornell Lab requires individual negotiation for commercial use; GBIF provides CC BY 4.0 bird occurrence data sufficient for spawn zone generation
- Limitation: GBIF data is less real-time than eBird; acceptable for static spawn zones refreshed quarterly

---

## 8. Data Architecture

### Core Database Schema

```sql
-- Users
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_provider   VARCHAR(20) NOT NULL,  -- 'kakao', 'apple', 'google'
    auth_provider_id VARCHAR(255) NOT NULL,
    display_name    VARCHAR(50),
    profile_image_url TEXT,
    tier            VARCHAR(20) DEFAULT 'free',  -- 'free', 'explorer'
    gps_consent     BOOLEAN DEFAULT FALSE,
    gps_consent_at  TIMESTAMPTZ,
    gps_consent_version VARCHAR(10),
    total_points    INTEGER DEFAULT 0,
    streak_current  INTEGER DEFAULT 0,
    streak_last_date DATE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,  -- soft delete
    UNIQUE(auth_provider, auth_provider_id)
);

-- Species (300 Korean species)
CREATE TABLE species (
    id              VARCHAR(10) PRIMARY KEY,  -- 'KR-001' to 'KR-300'
    name_ko         VARCHAR(50) NOT NULL,     -- 한국명
    name_sci        VARCHAR(100) NOT NULL,    -- Scientific name
    name_en         VARCHAR(100) NOT NULL,    -- English name
    ioc_order       VARCHAR(50),              -- IOC taxonomic order
    ioc_family      VARCHAR(50),              -- IOC family
    rarity_tier     VARCHAR(20) NOT NULL,     -- 'common', 'migrant', 'rare', 'legendary'
    rarity_points   INTEGER NOT NULL,         -- 1, 3, 10, 25
    sensitivity_tier INTEGER DEFAULT 3,       -- 1=천연기념물, 2=멸종위기, 3=일반
    aba_code        INTEGER,                  -- 1-5
    iucn_status     VARCHAR(5),               -- LC, NT, VU, EN, CR
    size_cm         INTEGER,
    habitat_ko      TEXT,                     -- 서식지 설명 (Korean)
    fun_fact_ko     TEXT,                     -- 재미있는 사실 (Korean)
    seasonal_presence JSONB,                  -- {"jan":true,"feb":true,...,"dec":false}
    reference_image_url TEXT,
    silhouette_image_url TEXT,
    natural_monument_number INTEGER,          -- 천연기념물 번호 (e.g., 202 for 두루미)
    free_tier_accessible BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Sightings
CREATE TABLE sightings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    species_id      VARCHAR(10) NOT NULL REFERENCES species(id),
    photo_s3_key    TEXT NOT NULL,
    location        GEOMETRY(Point, 4326),    -- PostGIS point (WGS84)
    location_accuracy_m FLOAT,               -- GPS accuracy in meters
    location_name   VARCHAR(200),            -- Reverse geocoded 시/군/구
    observed_at     TIMESTAMPTZ NOT NULL,    -- Observation timestamp (UTC)
    observed_tz     VARCHAR(50) DEFAULT 'Asia/Seoul',
    ai_confidence   FLOAT,                   -- 0.0 - 1.0
    ai_top3         JSONB,                   -- Full AI result (top 3)
    user_corrected  BOOLEAN DEFAULT FALSE,
    correction_species_id VARCHAR(10),
    weather_temp_c  FLOAT,
    weather_icon    VARCHAR(20),
    is_first_species BOOLEAN DEFAULT FALSE,  -- First time user saw this species
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,             -- soft delete
    CONSTRAINT fk_sighting_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_sightings_user ON sightings(user_id);
CREATE INDEX idx_sightings_species ON sightings(species_id);
CREATE INDEX idx_sightings_location ON sightings USING GIST(location);
CREATE INDEX idx_sightings_observed ON sightings(observed_at);

-- User Species Collection (denormalized for fast lookups)
CREATE TABLE user_species (
    user_id         UUID NOT NULL REFERENCES users(id),
    species_id      VARCHAR(10) NOT NULL REFERENCES species(id),
    first_sighting_id UUID REFERENCES sightings(id),
    first_seen_at   TIMESTAMPTZ NOT NULL,
    sighting_count  INTEGER DEFAULT 1,
    PRIMARY KEY (user_id, species_id)
);

-- Badges
CREATE TABLE badges (
    id              VARCHAR(20) PRIMARY KEY,  -- 'BDG-001'
    name_ko         VARCHAR(50) NOT NULL,
    description_ko  TEXT NOT NULL,
    icon_url        TEXT,
    condition_type  VARCHAR(50),              -- 'species_count', 'streak', 'rarity_tier_complete'
    condition_value INTEGER,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- User Badges
CREATE TABLE user_badges (
    user_id         UUID NOT NULL REFERENCES users(id),
    badge_id        VARCHAR(20) NOT NULL REFERENCES badges(id),
    earned_at       TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, badge_id)
);

-- Subscriptions
CREATE TABLE subscriptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    platform        VARCHAR(10) NOT NULL,     -- 'ios', 'android'
    store_txn_id    VARCHAR(255),
    plan            VARCHAR(20) NOT NULL,     -- 'monthly', 'annual'
    price_krw       INTEGER NOT NULL,
    status          VARCHAR(20) DEFAULT 'active', -- 'active','cancelled','expired'
    starts_at       TIMESTAMPTZ NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- AI Corrections (for model retraining)
CREATE TABLE ai_corrections (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sighting_id     UUID NOT NULL REFERENCES sightings(id),
    ai_species_id   VARCHAR(10) NOT NULL,     -- What AI predicted
    ai_confidence   FLOAT,
    user_species_id VARCHAR(10) NOT NULL,     -- What user corrected to
    photo_s3_key    TEXT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### Sensitive Species Policy (Data Architecture Level)

The `species.sensitivity_tier` field drives coordinate obscuring logic in all API responses:

```
Tier 1 (sensitivity_tier = 1):
  천연기념물 (Natural Monument) designated species
  Obscuring: 252 km² grid (≈15.87 km × 15.87 km)
  Implementation: FLOOR(lat / 0.143) * 0.143, FLOOR(lon / 0.179) * 0.179

Tier 2 (sensitivity_tier = 2):
  IUCN EN (Endangered) or CR (Critically Endangered) species
  Obscuring: 5 km² grid (≈2.24 km × 2.24 km)
  Implementation: FLOOR(lat / 0.02) * 0.02, FLOOR(lon / 0.025) * 0.025

Tier 3 (sensitivity_tier = 3):
  All other species
  Obscuring: None (exact coordinates)
```

The obscuring function is a PostgreSQL server-side function applied in ALL queries that return sighting data to non-owner consumers:

```sql
CREATE FUNCTION obscure_location(
    loc GEOMETRY, sensitivity INTEGER, requester_id UUID, owner_id UUID
) RETURNS GEOMETRY AS $$
BEGIN
    IF requester_id = owner_id THEN RETURN loc; END IF;
    IF sensitivity = 1 THEN
        RETURN ST_SetSRID(ST_MakePoint(
            FLOOR(ST_X(loc) / 0.179) * 0.179 + 0.0895,
            FLOOR(ST_Y(loc) / 0.143) * 0.143 + 0.0715
        ), 4326);
    ELSIF sensitivity = 2 THEN
        RETURN ST_SetSRID(ST_MakePoint(
            FLOOR(ST_X(loc) / 0.025) * 0.025 + 0.0125,
            FLOOR(ST_Y(loc) / 0.02) * 0.02 + 0.01
        ), 4326);
    ELSE
        RETURN loc;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### Species Data Pipeline

```
GBIF CC BY 4.0 occurrence data
  → Filter: Korea bounding box (33°N-43°N, 124°E-132°E)
  → Filter: Aves class only
  → Map to IOC taxonomy (species ID reconciliation)
  → Aggregate: monthly occurrence frequency per 10km grid cell
  → Output: species_spawn_zones table (species_id, grid_cell, month, frequency)
  → Refresh: Quarterly batch job

NIBR Korean Bird Checklist
  → 603+ species master list
  → Filter: 300 MVP species (highest GBIF occurrence count in Korea)
  → Map: Korean name, scientific name, English name, rarity tier, sensitivity
  → Manual curation: fun facts, habitat descriptions (Korean)
  → Output: species table seed data
```

---

## 9. Implementation Phases

### Phase 1: Foundation (Weeks 1-8)

**Objectives:**
- Establish development environment and CI/CD pipeline
- Implement authentication flow (Kakao + Apple + Google)
- Build database schema and API scaffold
- Integrate AI model for species identification
- Deliver basic camera-to-identification flow

**Deliverables:**

| Week | Deliverable | Dependencies |
|------|-------------|--------------|
| 1-2 | RN project setup, CI/CD (EAS Build), linting, testing scaffold; AWS infrastructure (Terraform): RDS, S3, ECS, Cognito | None |
| 2-3 | Database schema migration; Fastify API scaffold with auth middleware; Cognito + Kakao/Apple/Google OAuth integration | AWS infra |
| 3-4 | Species DB seeded (300 species from NIBR/IOC); S3 photo upload with presigned URLs + mobile EXIF strip + server-side sanitize path | DB schema |
| 4-6 | AI model training pipeline: EfficientNet-Lite B2 fine-tuning on NIBR Korean dataset; TensorFlow Serving on ECS; inference API endpoint | S3, DB |
| 6-8 | Mobile camera interface; photo capture + upload + AI ID request + result display; acceptance/rejection flow; PIPA consent flow | Auth, AI API |

**Milestone Gate (Week 8):** A user can sign in via Kakao, take a photo of a bird, receive AI identification result, review/correct it, and save the sighting. Photo privacy safeguards are active and location save works with or without GPS.

**Phase 1 Risks:**
- NIBR dataset access may require formal MOU (start negotiation Week 1)
- Kakao OAuth sandbox testing requires Kakao developer account approval (1-2 weeks)

---

### Phase 2: Core Features (Weeks 9-16)

**Objectives:**
- Build species encyclopedia with discovery mechanic
- Implement map view with sighting pins
- Add gamification layer (badges, points, streaks)
- Build subscription/paywall

**Deliverables:**

| Week | Deliverable | Dependencies |
|------|-------------|--------------|
| 9-10 | Species encyclopedia grid view; silhouette/discovered states; species detail page; discovery animation | Phase 1 complete |
| 10-12 | Google Maps integration; sighting pin rendering; pin clustering; location permission handling | Phase 1 sightings |
| 12-13 | Rarity system implementation; point calculation; user profile with score; free-tier species locking | Species DB, sightings |
| 13-14 | Badge system (6 milestone badges); streak counter; level/rank system; notification toasts | Points system |
| 14-16 | Subscription paywall (App Store + Play Store IAP); free-tier limits enforcement; sighting history list + filters; offline queue | All above |

**Milestone Gate (Week 16):** Full MVP feature set functional. A user can authenticate, photograph birds, browse encyclopedia, view map, earn badges, maintain streaks, and subscribe to Explorer Pass.

**Phase 2 Risks:**
- Google Maps SDK quota / API-key restrictions may block map rendering if not validated early
- App Store IAP review can be slow (submit test build Week 14)

---

### Phase 3: Polish & Launch (Weeks 17-22)

**Objectives:**
- Performance optimization and battery testing
- PIPA compliance audit
- Sensitive species coordinate obscuring verification
- App Store / Play Store submission and review
- Load testing and monitoring setup

**Deliverables:**

| Week | Deliverable | Dependencies |
|------|-------------|--------------|
| 17-18 | Performance profiling: map FPS, API latency, battery drain testing; optimization pass | Phase 2 complete |
| 18-19 | PIPA legal review: consent flows, data retention, privacy policy; sensitive species obscuring end-to-end test | Legal counsel |
| 19-20 | Load testing: simulate 5,000 concurrent users; monitoring dashboards (CloudWatch + PostHog); alerting | All infrastructure |
| 20-21 | UI/UX polish pass: animations, transitions, error states, empty states, Korean copy review | Feature complete |
| 21-22 | App Store submission (iOS review: 1-3 days); Play Store submission (review: 1-7 days); soft launch (TestFlight / internal track) | All above |

**Milestone Gate (Week 22):** App approved on both stores. Soft launch to 500 beta users (invited via Birds Korea community). All P0 metrics instrumented and dashboards live.

**Phase 3 Risks:**
- iOS App Store rejection for location permission usage justification (prepare detailed justification document)
- PIPA compliance gaps discovered late (engage legal counsel from Week 1, not Week 18)

---

### Post-Launch Phases (Indicative)

**Phase 4 (Weeks 23-30): P1 Product Surfaces**
- Community birding feed + public post detail (FR-104, hearts only)
- Profile-first My Page + public birding profile (FR-105)
- Offline queue recovery UX hardening
- AI feedback export / review / retraining operations
- Map clustering + rarity pin polish + sighting detail linkage

**Phase 5 (Weeks 31-40): Engagement & Retention**
- BirdNET sound identification (FR-100)
- KakaoTalk sharing (FR-103)
- Seasonal migration events (FR-101)
- Leaderboard (FR-102)
- Weekly challenges (FR-074)
- On-device AI inference (offline ID)
- Apple Watch companion

---

## 10. Risk Assessment

| # | Risk | Probability | Impact | Mitigation | Contingency |
|---|------|-------------|--------|------------|-------------|
| R1 | **PIPA non-compliance** — GPS data collection without proper consent flow causes legal exposure | Low (if addressed early) | Critical | Engage Korean data privacy legal counsel from Week 1; implement FR-005 consent flow before any GPS collection; Seoul-region-only hosting; conduct PIPA audit at Week 18 | Disable GPS features entirely until compliant; app functions as photo-only ID tool |
| R2 | **Endangered species location exposure** — Public display of 천연기념물 or EN/CR species coordinates enables poaching/disturbance | Medium | Critical | Implement 3-tier coordinate obscuring (FR-034) at database level; exclude Tier 1/2 species from community feed entirely; server-side enforcement (not client-side) | Emergency species removal from public endpoints; coordinate data purge if breach detected |
| R3 | **Korean species AI accuracy below 80%** — NIBR fine-tuning insufficient, users reject AI results > 30% of the time | Medium | High | Secure NIBR dataset MOU in Week 1; augment with iNaturalist Korean observations; benchmark gate at Phase 1 milestone (Week 8); iterative model improvement from user corrections (FR-013) | Launch with 200 high-confidence species (instead of 300); clearly label confidence levels; expand species as accuracy improves |
| R4 | **App Store rejection for location permission** — Apple rejects app citing insufficient justification for foreground location access | Medium | Medium | Prepare detailed location usage justification document; foreground-only GPS (no background tracking in MVP); clear user-facing explanation of GPS purpose in consent flow; review Apple's latest location permission guidelines | Resubmit with enhanced justification; worst case: launch Android-first while iOS review resolves |
| R5 | **Google Maps quota / key misconfiguration** — API restriction errors or quota exhaustion can blank the map screen | Medium | High | Separate Android/iOS keys, quota alarms, startup health checks, and staging validation on real devices | Temporary fallback to static map placeholder + key rotation + emergency quota raise |
| R6 | **Solo developer burnout / scope creep** — 22-week timeline with single developer is aggressive | High | High | Strict P0-only MVP scope; no P1 features until Phase 4; weekly scope review against timeline; pre-built component libraries (React Native Elements, etc.) | Extend timeline to 28 weeks; cut P0 scope to auth + AI ID + encyclopedia only (no map, no gamification in MVP) |
| R7 | **eBird/Cornell legal challenge** — Cornell Lab claims spawn data derived from eBird violates terms | Low | Medium | Use only GBIF CC BY 4.0 data (explicitly commercially usable); document data provenance chain; no eBird API calls, no eBird data in pipeline | If challenged, switch to GBIF CC0 subset only; remove any contested data within 48 hours |

---

## 11. Business Model

### Pricing Structure

| Tier | Price | Features |
|------|-------|----------|
| Free (무료) | 0 KRW | 10 AI IDs/day, 200 species catalog, sighting log, map view, badges/streaks, gallery 최대 30장 공유 |
| Explorer Pass (탐험가 패스) Monthly | 6,900 KRW/month | Unlimited AI IDs, full 300 species catalog, **갤러리 무제한 공유**, community feed, leaderboard, GPS export |
| Explorer Pass Annual | 59,000 KRW/year (4,917/month, 29% discount) | Same as monthly |

### Revenue Projections (Conservative)

**Assumptions:**
- Launch with 500 beta users (Birds Korea community)
- Organic growth via KakaoTalk viral sharing (k-factor 0.3)
- 4.5% free-to-paid conversion rate
- Monthly churn: 8% (retention-focused app)
- No paid acquisition in first 6 months (organic only)

| Month | MAU | Paid Users | MRR (KRW) | Cumulative Revenue (KRW) |
|-------|-----|------------|-----------|--------------------------|
| 1 | 2,000 | 90 | 621,000 | 621,000 |
| 3 | 8,000 | 360 | 2,484,000 | 5,589,000 |
| 6 | 15,000 | 675 | 4,657,500 | 18,922,500 |
| 12 | 30,000 | 1,350 | 9,315,000 | 75,712,500 |

**Unit Economics (Month 6 estimate):**
- ARPU (all users): ~310 KRW/month
- ARPPU (paying users): ~6,900 KRW/month
- CAC (organic): ~400 KRW (KakaoTalk viral loop)
- LTV (12-month, paying user): ~68,000 KRW
- LTV:CAC: ~17:1

### Go-To-Market Strategy

1. **Pre-Launch (4 weeks before):**
   - Birds Korea community partnership announcement
   - Korean birding Naver Cafe seeding (후기/리뷰 posts from beta users)
   - Press kit for Korean outdoor/tech media (한겨레 환경, 동아사이언스, etc.)

2. **Launch Week:**
   - Timed to spring migration peak (species diversity maximizes first-session discovery)
   - KakaoTalk share incentive: "친구 초대 시 무료 분석 +5회" (Invite friend, get 5 free IDs)
   - Birds Korea social media cross-promotion

3. **Post-Launch (ongoing):**
   - Seasonal migration events as recurring engagement hooks
   - Korean Natural Monument species as "legendary tier" press hooks ("두루미를 찾아 철원으로!")
   - User-generated sighting content for social media (Instagram Reels, YouTube Shorts)

---

## 12. Success Metrics — Leading and Lagging Indicators

### Leading Indicators (Predict Future Success)

| Indicator | Target | Why It Matters | Frequency |
|-----------|--------|----------------|-----------|
| Day-1 Retention | >= 40% | Predicts Day-30 retention (industry correlation 0.7+) | Daily |
| AI Acceptance Rate | >= 70% | If users reject AI too often, core loop breaks | Daily |
| Onboarding Completion Rate | >= 80% | Drop-off here means UX friction | Daily |
| Camera Opens per DAU | >= 2.0 | Core engagement action | Daily |
| KakaoTalk Shares per WAU | >= 0.15 | Viral growth coefficient | Weekly |
| Species per User (7-day) | >= 5 | Collection momentum predicts retention | Weekly |

### Lagging Indicators (Confirm Strategy)

| Indicator | Target (90-day) | Target (6-month) | Frequency |
|-----------|-----------------|-------------------|-----------|
| WAU (Korea) | >= 5,000 | >= 12,000 | Weekly |
| Day-30 Retention | >= 20% | >= 22% | Monthly cohort |
| Free-to-Paid Conversion | >= 3% | >= 4.5% | Monthly |
| MRR | >= 2.5M KRW | >= 4.6M KRW | Monthly |
| App Store Rating | >= 4.2 | >= 4.4 | Monthly |
| Avg Sightings/Active User/Week | >= 3.0 | >= 3.5 | Weekly |
| Total Verified Sightings (Korea) | >= 25,000 | >= 100,000 | Monthly |

### North Star Metric

**Sightings per Active User per Week >= 3.0**

This is the single metric that captures the health of the entire product:
- It requires users to open the app (retention)
- It requires them to find and photograph birds (core loop engagement)
- It requires AI to work well enough to save sightings (AI quality)
- It correlates with collection growth (gamification engagement)
- It drives KakaoTalk shares (viral growth — users share interesting sightings)

---

## 13. Open Questions

| # | Question | Owner | Deadline | Impact if Unresolved |
|---|----------|-------|----------|----------------------|
| OQ-1 | **NIBR dataset MOU:** Can we secure access to NIBR Korean bird image dataset for model training? What are the terms? | Product/BD | Week 2 | Cannot train Korean-specific AI model; must rely on global dataset (lower accuracy) |
| OQ-2 | **Birds Korea partnership terms:** What does Birds Korea want in exchange for co-branding and community access? Scientific review of species data? Revenue share? | Product/BD | Week 4 | Lose credibility multiplier and beta user pool |
| OQ-3 | **천연기념물 coordinate obscuring grid size:** Is 252 km^2 sufficient for Korean Natural Monument species, or does the Cultural Heritage Administration require larger grids? | Legal/Conservation | Week 6 | May need to increase obscuring radius, impacting map UX |
| OQ-4 | **PIPA consent flow design:** Does the separate GPS consent screen need to be a full page, or can it be a modal? Does it need to be re-displayed periodically? | Legal | Week 4 | Consent flow may need redesign mid-development |
| OQ-5 | **AI model accuracy on Korean raptors:** Raptors (매류) are notoriously difficult to distinguish in photos. Can we achieve 80% top-1 on raptor species, or should they be excluded from MVP 300? | AI/ML | Week 6 (Phase 1 benchmark) | May need to reduce MVP species count or add manual-only raptor ID |
| OQ-6 | **Google Maps cost envelope:** At target WAU, what monthly map cost range should be budgeted under actual feed/profile engagement? | Engineering | Week 2 (spike) | May need stronger quota controls or lower-frequency map loading |
| OQ-7 | **App Store IAP for Korean won:** Does Apple allow 6,900 KRW pricing tier, or must we use Apple's nearest tier (possibly 6,600 or 7,500)? | Engineering | Week 14 | Pricing may need adjustment to match App Store tier grid |
| OQ-8 | **Birding SNS moderation envelope:** Are report/unshare-only controls sufficient for MVP/P1 without comments/captions, or is block/report tooling expansion needed before wider launch? | Product / Ops | Week 6 | Could delay public feed rollout if abuse handling is too thin |

---

## Appendices

### Appendix A: Glossary

| Term | Definition |
|------|-----------|
| ABA Code | American Birding Association rarity code (1-5 scale). Used as basis for BirdWatch rarity system adapted for Korean species. |
| 천연기념물 | Korean Natural Monument. Species designated by the Cultural Heritage Administration as nationally protected natural heritage. |
| 도감 | Encyclopedia/Field guide. Used in Korean to describe collection-style species databases (equivalent to Pok&eacute;dex concept). |
| GBIF | Global Biodiversity Information Facility. Provides CC BY 4.0 biodiversity occurrence data. |
| IOC | International Ornithological Congress. Maintains the IOC World Bird List, the standard taxonomy used in Asian ornithology. |
| NIBR | National Institute of Biological Resources (국립생물자원관). Korean government body managing biodiversity data. |
| PIPA | Personal Information Protection Act (개인정보 보호법). Korea's primary data privacy law, comparable to GDPR. |
| PostGIS | PostgreSQL extension for geographic information systems. Enables spatial queries on coordinate data. |
| 텃새 | Resident bird. Species that lives year-round in Korea without seasonal migration. |
| 나그네새 | Migratory bird. Species that passes through Korea during spring/fall migration or visits seasonally. |
| 희귀종 | Rare species. Infrequently observed birds with irregular occurrence patterns. |
| MZ Generation | Millennials + Generation Z. Korean market term for the 20-39 age demographic. |

### Appendix B: Korean-Specific Requirements Checklist

- [ ] Kakao Login as PRIMARY auth method (not just "also available")
- [ ] All UI text in Korean (한국어) — no English fallback in MVP
- [ ] PIPA-compliant GPS consent flow with legally required disclosures
- [ ] Seoul region (ap-northeast-2) hosting for all personal data
- [ ] IOC taxonomy (not Clements) for species naming
- [ ] NIBR Korean Bird Checklist for 한국명 (Korean species names)
- [ ] 천연기념물 designation as highest rarity tier (culturally resonant)
- [ ] KST (UTC+9) as default timezone for streaks, daily limits, events
- [ ] Korean Won (KRW) pricing for subscriptions
- [ ] PostHog self-hosted for PIPA analytics compliance
- [ ] Coordinate obscuring for 천연기념물 and 멸종위기종

### Appendix C: Competitive Landscape

| Feature | BirdWatch | Merlin Bird ID | Birda | Birdex |
|---------|-----------|----------------|-------|--------|
| Korean language | Yes (native) | No | No | No |
| Korean species AI | NIBR fine-tuned | Global model | No AI | No AI |
| Kakao Login | Yes | No | No | No |
| Gamification | Full (badges, points, streaks, levels) | None | Light (challenges) | Full (Pok&eacute;mon-style) |
| Collection/Pok&eacute;dex | Yes (300 species) | Life list only | Yes (basic) | Yes |
| Map view | Yes (Google Maps) | No | Yes | Yes |
| Sound ID | P1 (BirdNET) | Yes (proprietary) | No | No |
| PIPA compliant | Yes | Unknown | No | No |
| Korean market focus | Primary | Global | Global | UK-first |
| Price | Free / 6,900 KRW/mo | Free | Free / $4.99/mo | Free / $4.99/mo |

### Appendix D: AI-Optimization Self-Score

#### Category 1: AI-Specific Optimization (23 / 25)

| Criterion | Score | Notes |
|-----------|-------|-------|
| Sequential Phase Structure (10) | 9/10 | 3 phases dependency-ordered with week-level granularity; could add more sub-phase detail for AI executor |
| Explicit Non-Goals & Boundaries (8) | 8/8 | Dedicated section with 10 explicit non-goals + phase boundaries + future considerations |
| Structured Document Format (7) | 6/7 | 13 major sections, consistent formatting, FR-ID system throughout; minor formatting inconsistencies in appendices |

#### Category 2: Traditional PRD Core (24 / 25)

| Criterion | Score | Notes |
|-----------|-------|-------|
| Problem Statement & Context (7) | 7/7 | Quantified by segment, market table, competitive landscape, "why now" with 5 reasons |
| Goals & Success Metrics (8) | 8/8 | SMART goals, P0/P1 split, baseline vs target table, instrumentation requirements, north star metric |
| Target Audience & Personas (5) | 5/5 | 3 detailed personas with demographics, goals, pain points, use cases, monetization path |
| Technical Specifications (5) | 4/5 | Version requirements specified; performance thresholds defined; could add formal compatibility matrix (iOS min version, Android min API level) |

#### Category 3: Implementation Clarity (28 / 30)

| Criterion | Score | Notes |
|-----------|-------|-------|
| Functional Requirements (10) | 10/10 | FR-ID system, P0/P1/P2 priorities, Given-When-Then acceptance criteria, code examples, 30+ requirements |
| Non-Functional Requirements (5) | 5/5 | Security, performance, privacy, battery, offline, accessibility — all with specific thresholds |
| Technical Architecture (10) | 9/10 | ASCII diagram, stack rationale table, architecture decisions with trade-offs; could add API contract examples |
| Implementation Phases (5) | 4/5 | 3 phases with weekly breakdown, milestone gates, risk callouts; time estimates could be more granular for AI executor |

#### Category 4: Completeness & Quality (19 / 20)

| Criterion | Score | Notes |
|-----------|-------|-------|
| Risk Assessment (5) | 5/5 | 7 risks with probability/impact, mitigation AND contingency for each |
| Dependencies (3) | 3/3 | External (NIBR, Birds Korea, GBIF, Apple/Google/Kakao) and internal dependencies explicit |
| Examples & Templates (7) | 6/7 | AI response JSON example, SQL schema examples, obscuring function example; could add more API request/response examples |
| Documentation Quality (5) | 5/5 | Professional formatting, glossary, competitive matrix, Korean-specific checklist, version metadata |

#### Total Score: 94 / 100

---

*End of Document*
