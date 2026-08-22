# ⚡ Textboard

<div align="center">

![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg?style=for-the-badge)
![Next.js 14](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js)
![NestJS](https://img.shields.io/badge/NestJS-10.0-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-WAL-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

**The Local-First Visual Intelligence & Communication Stream Analytics Workstation**

*Analyze, explore, and generate high-fidelity lossless archives from massive conversational datasets.*

[Key Features](#-key-features) • [Architecture](#-architecture) • [Getting Started](#-getting-started) • [Security & Privacy](#-security--privacy) • [Roadmap](#-master-roadmap)

---

</div>

## 📖 Overview

**Textboard** is a high-performance, local-first analytics dashboard and document stream processing workstation. Built from the ground up to handle massive communication archives (**100,000 to 500,000+ records**), Textboard transforms raw data streams into actionable intelligence, interactive timelines, and publication-ready visual PDF documents.

Everything executes locally on your hardware with strict zero-cloud data isolation, ensuring total confidentiality for your private archives and documents.

---

## ✨ Key Features

### 📊 1. Multi-Dimensional Analytics Dashboard
- **Activity & Peak Frequency**: Identify peak communication hours, day-of-week trends, and burst velocity.
- **Participant Dynamics**: Interaction matrix, word/char counts, response ratios, and engagement distribution.
- **Emoji & Sentiment Radar**: Deep emoji frequency metrics with colorful Twemoji vector rendering.
- **Topic & Keyword Clustering**: Frequency ranking, custom phrase search, and contextual conversation jump.

### 📄 2. Production $O(1)$ Stream PDF Exporter
- **Lossless Large-Scale Exports**: Effortlessly exports 500,000+ records in a single streaming pass while maintaining strictly bounded memory consumption (<120 MB RAM).
- **Executive Cover Page & KPI Badges**: Generates professional cover pages with dataset metadata, participant cards, and peak metrics.
- **Interactive Month Bookmarks**: Built-in PDF navigation tree index for instant jumping across months and years.
- **Deterministic Data Integrity**: Real-time SHA-256 cryptographic verification comparing source database records against rendered document objects.

### 🎨 3. Eye-Care Color Studio & Themes
- **Fatigue-Free Canvas**: Signature **Eye-Care Warm Cream (`#EFEAE2`)** canvas tone specifically engineered for extended reading sessions.
- **Customizable Palettes**: Choose from *Pure White*, *Soft Ice Blue*, *Executive Slate Dark*, and *Soft Mint*.
- **Interactive Bubble Studio**: Fine-tune left (received) and right (sent) message bubble colors with real-time modal preview.
- **Non-Overlapping Attachment Badges**: Dedicated visual cards with colorful icons for stickers, photos, voice notes, and documents.

### 🚨 4. Forensic Anomaly & Security Intelligence (V2.1)
- **Late-Night Surge Detector**: Identifies abnormal message bursts between 00:00 and 05:00.
- **Velocity Bursts**: Detects rapid-fire communication spikes (>25 messages in 5 minutes).
- **Communication Gaps & Dormancy**: Flags significant silent hiatus periods (>14 days).
- **Urgency & Security Tripwires**: Highlights sensitive terms (`asap`, `urgent`, `wire`, `confidential`).
- **Ghost Participant Detector**: Identifies transient actors who engaged heavily then vanished.

### 🔄 5. Multi-Stream Cross-Dataset Correlator (V2.2)
- **Side-by-Side Stream Analysis**: Compare two distinct datasets (e.g. WhatsApp vs Discord or 2024 vs 2025).
- **Temporal Overlap Index**: Overlapping duration, concurrent active days, and Pearson hourly schedule synchronicity.
- **Lexical & Emoji Diff Matrix**: Shared high-frequency terms, unique vocabulary per stream, and shared emoji expressions.
- **Participant Overlap Mapping**: Cross-platform identity matching and message volume comparison.

### 📦 6. Standalone Forensic Case Dossier & Markdown Vaults (V2.3)
- **Zero-Dependency HTML Dossier**: Single-file offline HTML case dossier with embedded CSS, KPI metrics, participant breakdown, and real-time client-side message search.
- **Obsidian-Compatible Markdown Vault (.ZIP)**: Monthly markdown logs with YAML frontmatter metadata and wiki-link index.

### 🧠 7. Semantic Topic Clustering & Thread Reconstructor (V3.0)
- **Deterministic Thematic Clusters**: Categorizes conversations into Financial, Technical, Scheduling, Travel, Operations, and Social themes with keyword relevance vectors.
- **Smart Thread Reconstruction**: Groups flat linear chat streams into discrete conversational discussion sessions with duration and participant breakdowns.

---

## 🏛️ Architecture

```
                                  TEXTBOARD SYSTEM ARCHITECTURE
                                  
  ┌─────────────────────────┐             HTTP / REST             ┌─────────────────────────┐
  │     Next.js Frontend    │ ◄─────────────────────────────────► │     NestJS Backend      │
  │                         │                                     │                         │
  │ • React 18 & Lucide     │                                     │ • Stream Ingestion      │
  │ • Virtualized Timeline  │                                     │ • Analytics Engine      │
  │ • Eye-Care Color Studio │                                     │ • Anomaly Detection     │
  │ • Topic & Thread Radar  │                                     │ • Cross-Correlator      │
  │ • 5-Theme Token Engine  │                                     │ • TrueType Font Engine  │
  └─────────────────────────┘                                     └────────────┬────────────┘
                                                                               │
                                    ┌──────────────────────────────────────────┴───────────────┐
                                    ▼                                                          ▼
                      ┌───────────────────────────┐                              ┌───────────────────────────┐
                      │    Local SQLite (WAL)     │                              │ Multi-Format Export Engine│
                      │                           │                              │                           │
                      │ • High-performance WAL   │                              │ • Streaming Vector PDF    │
                      │ • Prisma ORM Integration  │                              │ • Standalone HTML Dossier │
                      │ • Zero cloud leakage      │                              │ • Obsidian Markdown Vault │
                      └───────────────────────────┘                              └───────────────────────────┘
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18.0 or newer)
- **npm** or **yarn** / **pnpm**

### 2. Installation

Clone the repository:
```bash
git clone https://github.com/qamarabbas-024/Textboard.git
cd Textboard
```

### 3. Backend Setup
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run start:dev
```
*Backend runs on `http://localhost:3001` (Health check: `http://localhost:3001/health`)*

### 4. Frontend Setup
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:3000`*

---

## 🔒 Security & Privacy

- **100% Local-First Processing**: Raw data files, parsed message databases, and generated PDFs remain strictly on the local machine.
- **Zero Third-Party Telemetry**: No tracking scripts, analytics beacons, or remote cloud logging.
- **Strict Data Exclusion**: All user databases, uploads, and temporary archives are guarded by strict `.gitignore` filters.

---

## 🗺️ Master Roadmap

- [x] **V1.0**: Local-first stream ingestion, SQLite WAL engine, and analytics dashboard.
- [x] **V1.1**: Production $O(1)$ PDF export engine with TrueType font resolution.
- [x] **V1.2**: Full Twemoji color rendering, sticker badges, and Eye-Care Color Studio.
- [x] **V1.3**: Advanced Framer Motion animated data-scrubbing timeline.
- [x] **V1.4**: Cross-conversation multi-actor relationship graph visualization.
- [x] **V1.5**: Telegram JSON, Discord, Slack, and CSV universal stream parsers.
- [x] **V2.0**: Native desktop client distribution (Electron / Tauri packaging).
- [x] **V2.1**: Forensic Anomaly & Security Intelligence Engine (Late-Night Surges, Gaps, Ghost Contacts).
- [x] **V2.2**: Universal Multi-Stream Cross-Dataset Correlator & Lexical Diff Matrix.
- [x] **V2.3**: Standalone Single-File HTML Forensic Case Dossier & Obsidian Markdown Vault Exporter.
- [x] **V3.0**: Semantic Topic Clustering Matrix & Smart Conversational Thread Reconstructor.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

Developed with ❤️ by **Qamar Abbas**.

