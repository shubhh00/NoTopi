<div align="center">

<img src="apps/mobile/assets/icon.png" width="112" alt="NoTopi icon" />

# NoTopi

**Is this a scam? Paste it, share it, or screenshot it, and get an answer with proof.**

*Topi pehnana* (Hindi slang): to con someone. **NoTopi**: not today.

![Android](https://img.shields.io/badge/Android-3DDC84?logo=android&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-20232A?logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Kotlin](https://img.shields.io/badge/Kotlin-7F52FF?logo=kotlin&logoColor=white)
![ML Kit](https://img.shields.io/badge/ML_Kit-on--device_OCR-4285F4?logo=google&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot_4-6DB33F?logo=springboot&logoColor=white)
![Java](https://img.shields.io/badge/Java_21-ED8B00?logo=openjdk&logoColor=white)
![SerpApi](https://img.shields.io/badge/Powered_by-SerpApi-DC2A1E)
![License: MIT](https://img.shields.io/badge/License-MIT-141414)

[Download](https://github.com/shubhh00/NoTopi/releases/latest) · [Demo](#-demo) · [What it checks](#-what-it-checks) · [How it decides](#-how-it-decides) · [Architecture](#-architecture) · [Run it](#-run-it) · [Add a scam](#-add-a-scam)

</div>

NoTopi is an open-source Android app that checks messages, phone numbers, links, apps and shop
names for scams common in India. It doesn't just say "spam": it tells you **which scam** it looks
like, **why** (with the exact words and web reports highlighted), and **what to do next**.

## 🎬 Demo

<div align="center">
     
https://github.com/user-attachments/assets/bd3e481a-8792-4cc9-9d06-eac66bbea64a

</div>

<table>
  <tr>
    <td align="center"><b>Home</b></td>
    <td align="center"><b>The verdict</b></td>
    <td align="center"><b>Why it's a scam</b></td>
  </tr>
  <tr>
    <td><img width="250" alt="Home screen" src="https://github.com/user-attachments/assets/7a11ef26-0044-4870-b16a-9cb1c79523a3" /></td>
    <td><img width="250" alt="Scam verdict" src="https://github.com/user-attachments/assets/49589671-b59e-408d-b898-8c4e6fb91102" /></td>
    <td><img width="250" alt="Highlighted message and reasons" src="https://github.com/user-attachments/assets/12676f99-9197-4930-a003-09e980140434" /></td>
  </tr>
  <tr>
    <td align="center"><b>Suspicious link</b></td>
    <td align="center"><b>What to do</b></td>
    <td align="center"><b>Share from any app</b></td>
  </tr>
  <tr>
    <td><img width="250" alt="Suspicious link verdict" src="https://github.com/user-attachments/assets/f5a3195a-90f2-4f09-a668-3673077a3f59" /></td>
    <td><img width="250" alt="Help screen" src="https://github.com/user-attachments/assets/14fd316b-3684-4689-8496-9c0955f3b3e4" /></td>
    <td><img width="250" alt="NoTopi in the Android share sheet" src="https://github.com/user-attachments/assets/f2c1dde7-c2d5-44f4-bf90-f70767b800a4" /></td>
  </tr>
</table>

## 🔍 What it checks

| You give it | NoTopi looks for |
|---|---|
| **A message** (SMS, WhatsApp) | Known scam scripts, the structure of a scam, and reports of the number it asks you to call |
| **A phone number** | Web reports, complaint sites and police warnings that name it; a matching Google business listing |
| **A link** | Look-alike brand domains (`sbi-kyc-update.xyz`), risky endings, short links, `.apk` downloads, and reports |
| **A shop or website name** | Reddit and complaint-site reports, however the name is spaced ("Bling Queen" = "blingqueen") |
| **An app** (Play Store link or package) | Age, developer details, and Play reviews describing harassment |
| **A screenshot** | Reads the text on the phone, then checks it like a message |

Three ways to use it: paste into the app, **long-press a message → Share → NoTopi**, or select any
text → **⋮ → NoTopi**.

## 🧠 How it decides

Every verdict is built from **signals**: small, explainable rules that each add or remove points,
with the evidence shown as a receipt. No black box.

1. **Scam scripts.** A community-maintained database of Indian scams (digital arrest, KYC update,
   electricity cut-off, task jobs, SIR voter list, loan-app harassment and more), each with the
   phrases scammers use and what to do. → [`patterns/`](patterns)
2. **Scam anatomy.** New scams change the story, not the structure: they claim authority, add a
   threat or a prize, push you off official channels, and ask for money or an OTP. A message with
   that shape is flagged even if nobody has written a rule for it yet. The strongest tell: *claims
   to be a government body or bank but gives a personal mobile number.*
3. **Live web and police evidence.** Through [SerpApi](https://serpapi.com), NoTopi searches the web
   and **police and government sites** (`gov.in`, `nic.in`, police accounts on X) for reports of the
   number, link or name. An official warning is the strongest single signal.

Points add up to a risk score: **Scam** (60+), **Suspicious** (30+), and **Looks clean** only with
positive proof, such as an official domain or a matching business listing. With no evidence either
way, it honestly says **Can't tell yet**.

## 📰 Scams this week

The **News** tab shows the scams police and the Indian press are warning about right now. Once a
day the server searches Google News for the week's Indian scam stories, then a language model
keeps only scams aimed at ordinary people (dropping politics and arrest-only stories), groups them,
and writes how each one works and what to do. **Every scam links the articles it came from**, and
the AI only summarises: verdicts on what you check never use it.

Models are tried in order, Groq first and then Gemini, so one busy free tier doesn't stop the feed,
and a failed summary is retried every 30 minutes without spending search credits.

<p align="center">
  <img width="280" alt="The News tab: this week's scams, each with how it works, the reports it came from, and what to do" src="docs/screenshots/scams-this-week.png" />
</p>

## 🔒 Privacy

- No account, no contacts upload, no tracking.
- Screenshots are read **on the phone** with ML Kit; images never leave the device.
- Your SerpApi key is stored in encrypted storage on the phone.
- History stays on the phone.

## 🧱 Architecture

```mermaid
flowchart LR
  A["Android app<br/>React Native + Kotlin"] -->|own SerpApi key| S[SerpApi]
  A -->|or hosted mode| B["Spring Boot server<br/>cache + rate limit"]
  B --> S
  B -->|daily news summary| L["Groq → Gemini"]
  A --- E["Verdict engine<br/>TypeScript rules"]
  E --- P[("Scam pattern<br/>database (YAML)")]
```

| Part | Tech | What it does |
|---|---|---|
| [`apps/mobile`](apps/mobile) | React Native (Expo), TypeScript | Screens, history, settings, search calls |
| [`apps/mobile/modules`](apps/mobile/modules) | **Kotlin** (Expo Modules API) | Share and text-selection intents, ML Kit OCR |
| [`packages/engine`](packages/engine) | TypeScript, Vitest | Classifies input, plans searches, scores evidence into a verdict |
| [`apps/server`](apps/server) | Java 21, Spring Boot 4 | Keeps the key server-side, caches searches for everyone, rate-limits per device, and builds the daily scam-news feed |
| [`patterns`](patterns) | YAML | Scam scripts, brand domains, official sources, scam anatomy |

### 🤖 Android (Kotlin)

- [`ShareIntentModule.kt`](apps/mobile/modules/share-intent/android/src/main/java/app/notopi/share/ShareIntentModule.kt):
  handles `ACTION_SEND` (text and images) and `ACTION_PROCESS_TEXT` (the text-selection menu), on
  launch and through `onNewIntent` when the app is already open.
- [`TextRecognizerModule.kt`](apps/mobile/modules/text-recognizer/android/src/main/java/app/notopi/ocr/TextRecognizerModule.kt):
  reads screenshots with ML Kit's bundled model, offline, from the shared `content://` URI.
- [`withShareIntent.js`](apps/mobile/plugins/withShareIntent.js): a config plugin that adds the
  intent filters and `singleTask` launch mode to the generated manifest.

The `android/` folder itself is generated by Expo (`npx expo prebuild`), so the repo only contains
native code that was written by hand.

### 💸 Search budget

The free SerpApi plan has 250 searches a month, so each check uses about **two** (one web search,
one police/government search), messages that are already a clear scam from their wording use
**none**, and results are cached for a day on the phone and on the server.

## 📊 Numbers

Measured on a OnePlus 7 (Android 12) with the release build unless noted.

| What | Result |
|---|---|
| **Release APK** | 49.5 MB (R8 code and resource shrinking, arm64 only), down from 95.1 MB for the debug build: **48% smaller** |
| **Cold start** | **~630 ms** to first frame (median of 5 launches, 605–694 ms) |
| **Memory** | ~135 MB after launch (PSS) |
| **Offline verdict** | **0.45 ms** median, 1.0 ms p95 for classifying and scoring an input (2,000 runs, Node on a laptop) |
| **Searches per check** | about **2**; **0** for messages that are already a clear scam from their wording |
| **Tests** | 72 for the engine (Vitest), 17 for the server (JUnit) |

## 🚀 Run it

**Just want the app?** Download the APK from [Releases](https://github.com/shubhh00/NoTopi/releases/latest)
(Android 7.0+, arm64 phones, which is nearly all phones from the last several years).

**To build it yourself you need:** Node 20+, Android Studio (for the SDK and its JDK 21), and a phone with USB debugging.
A [free SerpApi key](https://serpapi.com/users/sign_up) is optional: without one, NoTopi still
checks the wording of messages and links.

```bash
npm install
npm test                      # verdict engine tests
```

**App** (a development build, because of the Kotlin modules):

```bash
cd apps/mobile
npx expo run:android          # builds, installs and starts Metro
```

Then add your SerpApi key in **Settings**, or point it at a server.

**Server** (optional, needed for the News tab): copy `apps/server/.env.example` to
`apps/server/.env.local` (git-ignored) and add your keys: SerpApi, plus a free
[Groq](https://console.groq.com/keys) and/or [Gemini](https://aistudio.google.com/apikey) key for
the news summary.

```bash
cd apps/server
./gradlew bootRun             # Windows: gradlew.bat bootRun
```

In the app, set **Settings → NoTopi server** to `http://localhost:8080` over USB
(`adb reverse tcp:8080 tcp:8080`). The release app allows plain http only to `localhost`, so a
server reached over the network needs an `https://` address (a host with a certificate, or a tunnel).
That keeps the numbers and links you check encrypted in transit.

## 🤝 Add a scam

New scams appear every month. If you've received one NoTopi misses, add it to the database: copy a
file in [`patterns/in`](patterns/in), fill in the phrases and advice, and open a pull request.
[`patterns/README.md`](patterns/README.md) explains each field. Tests check every file, and the
app picks up the database on its next build.

## 🏆 Built for

The [SerpApi India Hackathon 2026](https://serpapi.github.io/serpapi-india-hackathon-2026/),
Knowledge & Public Interest track.

## 📄 Licence

[MIT](LICENSE)
