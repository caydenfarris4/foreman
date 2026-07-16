# Shipping Foreman to Google Play

Foreman is a web app, so the Play Store build is a **Trusted Web Activity
(TWA)** — a real Play listing whose app opens https://foreman.coach
full-screen, with no browser chrome. Google explicitly supports this route.
The PWA groundwork (manifest, icons, service worker, offline page,
assetlinks scaffold) is already in the repo; this doc covers everything
after that.

## What's already in the repo

| Piece | Where | Served at |
| --- | --- | --- |
| Web app manifest | `app/manifest.ts` | `/manifest.webmanifest` |
| Launcher icons (192/512/maskable) | `public/icons/` | `/icons/*.png` |
| Apple touch icon + favicon | `public/icons/`, `app/icon.png` | auto-linked |
| Service worker (offline fallback only) | `public/sw.js` | `/sw.js` |
| Offline page | `public/offline.html` | `/offline.html` |
| Digital Asset Links scaffold | `public/.well-known/assetlinks.json` | `/.well-known/assetlinks.json` |
| Icon generator | `scripts/generate-pwa-icons.py` | — |

**Deploy this branch to production first.** Everything below reads the live
site, starting with `https://foreman.coach/manifest.webmanifest`.

Sanity check after deploying: open the site in Chrome → DevTools →
Application → Manifest. It should show the Foreman name and icons with no
warnings, and the Service Workers panel should show `sw.js` activated.

## 1. Package the TWA with Bubblewrap

On any machine with Node 18+ and a JDK (Bubblewrap can download the
JDK/Android SDK for you on first run):

```bash
npm i -g @bubblewrap/cli
mkdir foreman-twa && cd foreman-twa
bubblewrap init --manifest https://foreman.coach/manifest.webmanifest
```

Answers to the prompts that matter:

- **Application ID:** `coach.foreman.app` — must match
  `public/.well-known/assetlinks.json`. Never change it after first upload;
  Play treats it as the app's permanent identity.
- **Host / start URL:** `foreman.coach` / `/`
- **Signing key:** let Bubblewrap create one. **Back up the `.keystore`
  file and passwords somewhere safe (password manager).** Losing it means
  you can never update the app.
- Display mode `standalone`, status bar color the cream `#fefbf7` —
  Bubblewrap pre-fills these from the manifest.

Then build:

```bash
bubblewrap build
```

This produces `app-release-bundle.aab` (what you upload to Play) and an
`app-release-signed.apk` (handy for sideloading onto a phone to test).

## 2. Create the app in Play Console

At https://play.google.com/console → **Create app** (name: Foreman,
type: App, free). Then work through the **Set up your app** checklist:

- **Store listing:** short + full description, at least 2 phone
  screenshots (take them from the installed test APK or Chrome device
  mode, min 320px, 16:9-ish), a 512×512 icon (use
  `public/icons/icon-512.png`), and a 1024×500 feature graphic.
- **Privacy policy URL:** required. Foreman needs a public privacy-policy
  page (e.g. `/privacy`) covering account data, check-in content sent to
  Anthropic for coaching, emails via Resend, and payments via Stripe.
  *This page doesn't exist yet — it's the one real content task left.*
- **Data safety form:** declare collection of email address (account),
  user-generated content (check-ins/situations), and purchase history
  (Stripe). All encrypted in transit; account deletion available.
- **Content rating questionnaire:** Foreman is a productivity/self-help
  app with no objectionable content — comes out "Everyone".
- **Ads:** none. **Target audience:** 18+.

## 3. Wire up Digital Asset Links (removes the browser bar)

The TWA only hides the URL bar once Android can verify the app and the
site belong together:

1. In Play Console → **Test and release → Setup → App signing**, copy the
   **SHA-256 certificate fingerprint** (Play re-signs your app, so use the
   fingerprint shown *there*, not your local keystore's).
2. Paste it into `public/.well-known/assetlinks.json` in this repo,
   replacing the placeholder. If you also sideload debug builds, add a
   second entry with your local keystore's fingerprint
   (`keytool -list -v -keystore android.keystore` shows it).
3. Deploy, then verify with
   https://developers.google.com/digital-asset-links/tools/generator.

Until this is done the app still works but shows a Chrome custom-tab bar.

## 4. Closed testing — the 14-day gate

New **personal** developer accounts must run a closed test before they can
publish to production: **at least 12 testers opted in continuously for 14
days** (Google's requirement at the time of writing — check the current
numbers in Play Console). Plan for this:

1. Upload the `.aab` to **Testing → Closed testing → Create track**.
2. Add a tester email list; send friends/colleagues the opt-in link.
3. After 14 days with 12+ testers, apply for **production access** from
   the Play Console dashboard, answer their questions about how you
   tested, then promote the release to Production.

Review itself typically takes a few days for a first submission.

## 5. The Stripe question (decide before submitting)

Google Play requires **digital subscriptions bought inside the app** to
use Google Play Billing (15–30% cut). Foreman sells its subscription via
Stripe Checkout. Options, easiest first:

1. **Don't sell in the app.** Detect the TWA (Bubblewrap can append a
   query param like `?utm_source=twa` to the start URL, or check the
   referrer) and hide upgrade/checkout buttons there; users subscribe on
   the website. Reader-app-style setups like this are the common
   workaround — but it needs a small code change before submission.
2. **Risk it as-is.** Some TWAs pass review with external checkout;
   rejection or later removal is a real possibility. Not recommended.
3. **Integrate Play Billing** via the `android-browser-helper` billing
   extension. Real engineering work; do it later only if the app earns it.

## 6. Updating the app

Web changes ship instantly — the TWA is the live site, so there's nothing
to resubmit for content/feature changes. You only rebuild and re-upload
the `.aab` (bump `appVersionCode` in `twa-manifest.json`, then
`bubblewrap update && bubblewrap build`) when the *wrapper* changes: icon,
name, start URL, or manifest-level settings.

If icons ever need regenerating: `pip install pillow`, then
`python3 scripts/generate-pwa-icons.py`.

## iOS (later)

Apple has no TWA equivalent and rejects bare website wrappers
(guideline 4.2 "minimum functionality"). When iOS is worth it: Apple
Developer Program ($99/yr), wrap with Capacitor, add native value (push
notifications for the daily prompt is the obvious one), and budget for a
stricter review. Ship Android first.
