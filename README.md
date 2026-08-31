# ⚡ TextBoard

<div align="center">

![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg?style=for-the-badge)
![Version: 5.0.0](https://img.shields.io/badge/Version-5.0.0-cyan.svg?style=for-the-badge)
![Next.js 14](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js)
![NestJS](https://img.shields.io/badge/NestJS-10.4-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Android APK](https://img.shields.io/badge/Android-APK-3DDC84?style=for-the-badge&logo=android&logoColor=white)
![Electron](https://img.shields.io/badge/Electron-33.2-47848F?style=for-the-badge&logo=electron&logoColor=white)

**The Local-First Visual Intelligence, Forensic Stream Analytics & Cross-Platform Workstation**

*Ingest, search, analyze, explore, listen to audio transcripts, extract threat intelligence, and generate court-admissible verifiable exports across Windows, Linux, macOS, and Android.*

[Architecture](#-architecture) • [Version Milestones](#-version-chronology--release-milestones) • [Supported Formats](#-supported-ingestion-formats) • [Export Capabilities](#-export-capabilities) • [Mobile APK](#-android-mobile-app--apk-build) • [Setup & Development](#-getting-started)

---

</div>

## 📖 Executive Mission & Overview

**TextBoard** is an enterprise-grade, local-first visual intelligence workstation and forensic communication stream analyzer. Built to process massive communication archives (**10,000 to 500,000+ records**) with strictly bounded memory ($\mathcal{O}(1)$ RAM), TextBoard transforms raw unstructured chat dumps, log streams, and documents into multi-dimensional analytics, circadian heatmaps, threat intelligence dossiers, dual-voice audio dramas, and legally stamped courtroom exhibits.

### 🌟 Core Guarantees
1. **100% Airgapped Local-First Execution**: Complete parsing, database indexing, threat extraction, and speech synthesis execute locally on your PC or mobile phone.
2. **Hybrid Trust Model**: Default physical **`🔒 AIRGAP OFFLINE`** mode ensures zero external leaks. Analysts can selectively activate **`🌐 ONLINE ENHANCED`** mode to query VirusTotal, AbuseIPDB, Blockchain explorers, or Gemini 1.5 Pro.
3. **Court-Admissible Verification**: Sequential Bates stamping and cryptographic SHA-256 manifests guarantee source-to-render data integrity.
4. **Cross-Platform Zero-Dependency Packaging**: 1-click Windows installer, standalone portable `.exe`, and direct Android `.apk` mobile packages.

---

## 🏛️ System Architecture

```
                                  TEXTBOARD CROSS-PLATFORM ARCHITECTURE
                                  
  ┌─────────────────────────────────────────┐             HTTP / REST             ┌─────────────────────────────────────────┐
  │         Next.js 14 Frontend UI          │ ◄─────────────────────────────────► │         NestJS 10 Backend Core          │
  │                                         │                                     │                                         │
  │ • Top-3 Luxury Theme System             │                                     │ • Universal Stream Ingestion Engine     │
  │ • Dual-Voice Podcast Audio Drama Player │                                     │ • Threat Intel & Entity Extractor       │
  │ • Courtroom Bates Stamping Studio       │                                     │ • Linear O(N) Velocity Anomaly Detector │
  │ • MobileBottomNav Responsive Bar        │                                     │ • Hybrid Online Gateway (OSINT/Cloud)   │
  │ • Stream Timeline Scrubber & Filters    │                                     │ • SHA-256 Verifiable Dossier Generators │
  └───────────────────┬─────────────────────┘                                     └────────────────────┬────────────────────┘
                      │                                                                                │
        ┌─────────────┴─────────────┐                                                    ┌─────────────┴─────────────┐
        ▼                           ▼                                                    ▼                           ▼
  ┌───────────┐               ┌───────────┐                                        ┌───────────┐               ┌───────────┐
  │ Electron  │               │ Android   │                                        │  SQLite   │               │ Encrypted │
  │  Desktop  │               │ Capacitor │                                        │ (WAL Mode)│               │   Vault   │
  └───────────┘               └───────────┘                                        └───────────┘               └───────────┘
```

---

## 🚀 Version Chronology & Release Milestones

### 🌟 Version 5.0 — The Cross-Platform Mobile & Threat Intelligence Milestone
- **`v5.0.0` (CURRENT)**:
  - **📱 Native Android Mobile App (`.apk`)**: Full Capacitor Android runtime with native Gradle project (`com.textboard.forensics`), AndroidManifest intent filters for WhatsApp/Telegram "Share / Open With" exports, and thumb-friendly `MobileBottomNav`.
  - **🎙️ Dual-Voice Forensic Podcast & Drama Studio**: 100% offline Web Speech synthesis with automatic `👦 Boy` and `👧 Girl` voice casting, dynamic emotional pitch/tempo inflection (Joy, Alert, Anger, Somber, Surprise), persistent bookmark resume (`📌`), and live karaoke teleprompter.
  - **🛡️ Automated Threat Intel & Entity Extractor**: Scans and extracts Bitcoin (`1...`, `3...`, `bc1...`), Ethereum (`0x...`), USDT TRC-20, Solana wallets, Network IPs (LAN vs Public), Luhn-verified Credit Cards, IBANs, and Telecom country code profiling.
  - **🌐 Hybrid Trust Model & Online Gateway**: Physical Airgap switch (`🔒 AIRGAP` vs `🌐 ONLINE`), live VirusTotal URL scanner, AbuseIPDB reputation lookup, live Blockchain explorer, and frontier Cloud LLM (Gemini 1.5 Pro) connector.
  - **⚖️ Courtroom Bates Stamping & PII Redaction Studio**: Sequential exhibit stamping (`EXHIBIT-0001` through `EXHIBIT-9999`), 4-way automated PII redaction (cards, phones, crypto, IPs, sensitive keywords) with 1-click legal CSV exhibit export.

---

### 📦 Version 4.x Series (v4.0 — v4.10)
- **`v4.10`**: **Standalone Airgapped HTML Dossier**: Single-file self-contained `.html` export with embedded client-side search engine and SHA-256 seal.
- **`v4.9`**: **Top-3 Luxury Theme System**: Cyber Hyperdrive (Cyan/Violet), Tokyo 2077 (Magenta/Gold), Emerald Quantum (Mint/Obsidian), and responsive overflow navigation with stream switcher.
- **`v4.8`**: **Cross-Dataset Jaccard Correlator & Venn Diagram**: Multi-stream actor overlap calculation, shared keyphrase analysis, and interactive SVG Venn diagram.
- **`v4.7`**: **Linear $O(N)$ Velocity Anomaly Scanner**: Sub-10ms statistical sliding window detector for communication surges ($Z \ge 2.5\sigma$) and blackout periods.
- **`v4.6`**: **TF-IDF Keyphrase Salience Engine & Word Cloud**: Local N-gram extraction (unigrams, bigrams, trigrams) with salience scoring and interactive word sizing.
- **`v4.5`**: **Voice Note Audio Player & Waveform Visualizer**: Duration calculation, multi-channel waveform metadata, and integrated player in StreamTimelineView.
- **`v4.4`**: **Interactive GeoMap Intelligence**: GPS location extraction from media EXIF, interactive coordinate pins, and route playback simulator.
- **`v4.3`**: **Local Emotional Valence Radar**: 6-vector emotional radar (Anger, Joy, Fear, Sadness, Surprise, Anticipation) with rule-based lexicon.
- **`v4.2`**: **Actor Behavioral Profiler**: Diurnal circadian activity radar, hour-of-week heatmap, nocturnal score, and response latency analysis.
- **`v4.1`**: **Multi-Format Ingestion Wizard**: Universal drag-and-drop auto-detection for Telegram JSON, iMessage, Signal SQLite, Slack JSON, Discord, Mbox, CSV, XLSX, and Git logs.
- **`v4.0`**: **Autonomous Local AI Assistant**: Deterministic 100% on-device natural language question-answering with transcript citations.

---

### 📦 Version 3.x Series (v3.0 — v3.5)
- **`v3.5`**: Embedded vector similarity search with offline query intent classification and search boolean token chips (`AND`, `OR`, `NOT`).
- **`v3.3`**: Zero-dependency Windows NSIS Installer and single-file portable `.exe` with persistent AppData DB initialization.
- **`v3.0`**: 3D spatial data universe explorer with interactive particle projections, community orbits, and actor constellation isolation.

---

### 📦 Version 1.x & 2.x Series
- **`v2.0`**: Universal multi-file ingestion (Mbox email archives, Google Takeout, Git logs, DOCX, XLSX, images).
- **`v1.0`**: Core stream parser, SQLite WAL engine, high-speed indexed search, and 12 analytics views.

---

## 📂 Supported Ingestion Formats

TextBoard maps all communication formats into a unified forensic model:

| Format / Source | Description & Capabilities | Test Status |
|:---|:---|:---:|
| **WhatsApp Chat Backups** | `_chat.txt` and `.zip` archives with iOS/Android auto-detection. | **PASSED** ✅ |
| **Telegram Desktop Exports** | `result.json` and HTML exports with media, stickers, and reactions. | **PASSED** ✅ |
| **Apple iMessage / SMS** | iOS/macOS SQLite databases and exported `.txt` transcripts. | **PASSED** ✅ |
| **Signal Private Messenger** | Encrypted Signal Desktop SQLite databases and plain text backups. | **PASSED** ✅ |
| **Slack Workspaces** | Multi-channel JSON workspace exports with threaded replies. | **PASSED** ✅ |
| **Discord Servers & DMs** | JSON channel exports and formatted text chat logs. | **PASSED** ✅ |
| **AI / LLM Conversations** | ChatGPT, Claude AI, and Gemini Takeout transcripts (`conversations.json`). | **PASSED** ✅ |
| **Email Archives** | `.mbox` and `.eml` mailboxes with RFC 822 header threading. | **PASSED** ✅ |
| **Git Commit Histories** | Repository git log streams with author, hash, and commit diffs. | **PASSED** ✅ |
| **Structured Spreadsheets** | CSV, TSV, JSON, NDJSON, and Microsoft Excel (`.xlsx`). | **PASSED** ✅ |
| **System & Audit Logs** | Application log files (`.log`, `.txt`) with stack trace preservation. | **PASSED** ✅ |

---

## 📱 Android Mobile App & APK Build

TextBoard is ready for mobile deployment on Android phones and tablets.

### Build Commands:
```bash
# 1. Export static mobile assets & sync to Android project
npm run mobile:export

# 2. Open project in Android Studio (to run on physical device or emulator)
npm run mobile:open

# 3. Compile standalone Debug APK
npm run mobile:apk
```

**Output APK Location**:  
`android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🚀 Getting Started (Desktop & Web)

### Quick Setup:

```bash
# 1. Clone repository
git clone https://github.com/qamarabbas-024/Textboard.git
cd Textboard

# 2. Setup Backend Engine
cd backend
npm install
npx prisma generate
npx prisma db push
npm run start:dev

# 3. Setup Frontend Workstation (in a separate terminal)
cd ../frontend
npm install
npm run dev
```

- **Frontend Workstation**: `http://localhost:3890`
- **Backend API Core**: `http://localhost:3891` (Health: `http://localhost:3891/health`)

---

## 🧪 Testing & Validation Matrix

```bash
# Run all backend unit, stress, and E2E test suites (55 Suites / 176 Tests)
cd backend
npm test

# Run frontend Next.js production build
cd ../frontend
npm run build
```

---

## 🔒 Privacy & Airgap Guarantees

- **Strict Airgap Invariant**: Zero unexpected network calls; 100% of data stays on your machine by default.
- **Local Key Protection**: All integration API keys (Gemini, VirusTotal, AbuseIPDB) are encrypted locally in your workstation database.
- **Cryptographic Hashing**: Every export generates an immutable SHA-256 seal validating source-to-dossier parity.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

Developed with precision by **Qamar Abbas**.
