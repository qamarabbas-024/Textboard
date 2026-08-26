# ⚡ TextBoard

<div align="center">

![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg?style=for-the-badge)
![Next.js 14](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js)
![NestJS](https://img.shields.io/badge/NestJS-10.4-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-WAL-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![Electron](https://img.shields.io/badge/Electron-33.2-47848F?style=for-the-badge&logo=electron&logoColor=white)

**The Local-First Personal Data Intelligence Platform & Workstation**

*Ingest, search, analyze, explore, and generate high-fidelity verifiable exports from massive communication streams and personal datasets.*

[Architecture](#-architecture) • [Supported Formats](#-supported-ingestion-formats) • [Export Capabilities](#-export-capabilities) • [Setup & Development](#-getting-started) • [Security & Privacy](#-privacy--local-first-guarantees) • [Roadmap](#-product-roadmap)

---

</div>

## 📖 Executive Mission & Overview

**TextBoard** is a high-performance, local-first personal data intelligence workstation. Designed to process massive communication archives (**10,000 to 500,000+ records**) without arbitrary file-size ceilings, TextBoard turns raw data streams into searchable indices, interactive multi-dimensional analytics, circadian timelines, and publication-grade verifiable PDF archives.

### Core Promises
1. **Local-First & Offline**: 100% of parsing, indexing, analytics, and rendering executes strictly on your local machine.
2. **Zero Mandatory Cloud / External APIs**: No telemetry, no third-party data transmission, and no required external LLM keys.
3. **No Arbitrary Tiny Size Limits**: Memory usage is strictly bounded ($\mathcal{O}(1)$ RAM) through indexed cursor streaming, chunked sinks, and sequential page generation.
4. **Verifiable Data Integrity**: Exports compute rolling cryptographic SHA-256 digests ensuring exact source-to-render parity ($\text{missing} = 0, \text{duplicates} = 0, \text{failed} = 0$).

---

## 🏛️ Architecture

```
                                  TEXTBOARD SYSTEM ARCHITECTURE
                                  
  ┌─────────────────────────────────────────┐             HTTP / REST             ┌─────────────────────────────────────────┐
  │         Next.js 14 Frontend UI          │ ◄─────────────────────────────────► │         NestJS 10 Backend Core          │
  │                                         │                                     │                                         │
  │ • Workstation Multi-View Navigation     │                                     │ • Universal Stream Ingestion Engine     │
  │ • Interactive HTML5 Canvas Charts       │                                     │ • Batched Sinks & Data Normalizers      │
  │ • Dynamic 5-Theme Token System          │                                     │ • Fast Tokenized Query Search Index     │
  │ • Stream Timeline Scrubber & Filters    │                                     │ • Anomaly Detection & Velocity Scans    │
  │ • Dual PDF Export Modal with Live Stats │                                     │ • DataIntegrityVerifier (SHA-256 Chain) │
  └─────────────────────────────────────────┘                                     └────────────────────┬────────────────────┘
                       │                                                                               │
                       ▼                                                                               ▼
  ┌─────────────────────────────────────────┐                                     ┌─────────────────────────────────────────┐
  │        Electron 33 Desktop Shell        │                                     │       Local Storage Vault (Prisma)      │
  │                                         │                                     │                                         │
  │ • Background Process Bridge             │                                     │ • High-performance SQLite (WAL mode)   │
  │ • NSIS & Portable Windows Packaging     │                                     │ • Local File Vault (.textboard/exports) │
  └─────────────────────────────────────────┘                                     └─────────────────────────────────────────┘
```

---

## 📂 Supported Ingestion Formats

TextBoard adopts a universal schema mapping incoming streams into canonical `TimelineEvent`, `Dataset`, and `Entity` models.

### Status Classification

#### ✅ CURRENT (Fully Working & Unit Tested)
- **WhatsApp Chat Archives**: `_chat.txt` and `.zip` archives with auto-format detection (iOS / Android / 12h / 24h).
- **AI / LLM Conversation Transcripts**: ChatGPT (`conversations.json`), Claude AI (`conversations.json`), Gemini Takeout, and AI Markdown transcripts with canonical role taxonomy (`human`, `assistant`, `system`, `tool`).
- **Telegram Desktop Exports**: `result.json` with rich text entities, media tags, stickers, and reactions.
- **Google Takeout & Browser History**: `MyActivity.json`, `BrowserHistory.json`, search queries, and URLs.
- **Image Media & Attachment Archives**: `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif` photo metadata and dimension extraction.
- **Discord Communication Streams**: JSON channel exports and formatted text chat logs.
- **Signal Transcripts**: Formatted Signal plain text backup exports.
- **iMessage & Slack**: Formatted `.txt` and multi-channel JSON archives.
- **Email Archives**: `.mbox` and `.eml` mail archives with header threading (`From:`, `To:`, `Subject:`, `Date:`).
- **Git Commit Histories**: `git log --pretty` and `commits.txt` history stream parser.
- **System & Application Logs**: Standardized server and application log formats (`.log`, `.access`, `.error`) with stack trace preservation.
- **Rich Documents**: Microsoft Word (`.docx`) via Mammoth, Plain Text (`.txt`), and Markdown (`.md`).
- **Structured Data**: CSV, TSV, JSON, NDJSON (newline-delimited JSON), and Excel Spreadsheets (`.xlsx`).
- **ZIP Archives**: Multi-file ZIP ingestion with automatic inner file classification.

---

## 📄 Export Capabilities

TextBoard provides two clearly separated export pipelines:

### 1. Conversation Document Archive (PDF)
- Chronological WhatsApp-style message layout with speaker bubbles and timestamps.
- Distinct participant color badges and 5-minute consecutive message collapsing.
- Date separators (`MONDAY, 24 AUGUST 2026`) and attachment indicator tags (`📷 PHOTO`, `🎙️ AUDIO`, `📄 DOCUMENT`).
- Host TrueType font resolution supporting Latin, Arabic, Urdu, and Emoji glyphs without crashes.
- Cryptographic SHA-256 verification manifest confirming $100\%$ message coverage.

### 2. Analytics Intelligence Dossier (PDF & HTML)
- Executive summary report with dataset KPIs, total actors, and date ranges.
- Hourly circadian distribution, weekday velocity, and interaction matrix.
- Thematic topic clusters and flagged forensic anomaly timeline.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0 or newer (v20+ recommended)
- **npm**: v9.0 or newer
- **Operating System**: Windows 10/11, macOS, or Linux

### Quick Setup

```bash
# 1. Clone repository
git clone https://github.com/qamarabbas-024/Textboard.git
cd Textboard

# 2. Setup Backend
cd backend
npm install
npx prisma generate
npx prisma db push
npm run start:dev

# 3. Setup Frontend (in a separate terminal)
cd ../frontend
npm install
npm run dev
```

- **Frontend Workstation**: `http://localhost:3000`
- **Backend API**: `http://localhost:3001` (Health Check: `http://localhost:3001/health`)

### Desktop Distribution (Electron)
```bash
# Launch Desktop Workstation in development
npm run electron:dev

# Build Windows NSIS / Portable installer
npm run electron:dist
```

---

## 🧪 Testing & Validation

TextBoard enforces strict automated testing across all stream parsers, analytics algorithms, and export verifiers.

```bash
# Run backend test suite (21+ suites / 89+ tests)
cd backend
npm test

# Run frontend build validation
cd ../frontend
npm run build
```

---

## 🔒 Privacy & Local-First Guarantees

- **No Remote Telemetry**: Zero external tracking, analytics beacons, or remote cloud logging.
- **Zero Cloud Leakage**: All raw files, parsed databases, and generated PDFs remain inside the local directory (`.textboard/`).
- **Cryptographic Verification**: Every export produces an immutable manifest validating exact source record counts.

---

## 🗺️ Product Roadmap

### V1.x — Foundation & Core Workstation
- [x] **V1.0**: Local-first stream ingestion, SQLite WAL engine, high-speed search, and 12 analytics views.
- [x] **V1.1**: Production O(1) PDF export engine with TrueType font resolution and SHA-256 verification.
- [x] **V1.2**: AI/LLM conversation parser (ChatGPT, Claude, Gemini, Copilot, DeepSeek).
- [x] **V1.3**: Dual-mode export selector (Analytics Dossier vs. Conversation Archive) and 5-theme token engine.

### V2.x — Universal Data Expansion
- [x] **V2.0**: Universal multi-file ingestion (Mbox Email archives, Google Takeout, Git logs, DOCX, XLSX).
- [x] **V2.1**: Forensic media gallery, image EXIF metadata extraction, and attachment relationship links.
- [x] **V2.2**: Cross-dataset comparative intelligence and vocabulary drift matrices.

### V3.x — Spatial Workstation & Deep Intelligence
- [x] **V3.0**: 3D spatial data universe explorer with interactive particle projections and orbit controls.
- [x] **V3.5**: Embedded BM25 vector similarity search with offline query intent classification.

### V4.x — Autonomous Personal Workstation
- [x] **V4.0**: Local autonomous AI intelligence assistant with multi-intent conversational synthesis.
- [x] **V4.1**: Google Takeout browser history, YouTube watch metrics, and forensic audit sealing.
- [x] **V4.2**: Real-time directory watching, local PII anonymizer, Obsidian Markdown Vault generator, and diurnal sentiment heatmap.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

Developed with precision by **Qamar Abbas**.
