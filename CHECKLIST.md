# ⚡ TextBoard — Master Roadmap & Functional Checklist

TextBoard is a local-first, privacy-grade communication forensics and timeline intelligence workstation.

---

## 📊 Summary Status

- **Current Version**: v3.3.0 (Targeting v4.0.0 Final Release)
- **Completed Commits**: **90 / 100** (90% Complete)
- **Architecture**: Next.js 14 + NestJS + SQLite (100% Offline & Local-First)

---

## ✅ Completed Features (Phases 1–9 | Commits 1–90)

### 📥 1. Ingestion Engine & Format Parsers (100% Local-First)
- [x] **WhatsApp Stream Parser**: Normalizes `_chat.txt`, attachments, system notices, multi-line transcripts.
- [x] **Telegram Desktop Parser**: Handles both `result.json` & `messages.html`, voice note durations, location pins.
- [x] **Apple iMessage / SMS Parser**: CoreData epoch timestamps, Apple Tapback reactions (Loved/Liked/etc.), attachments.
- [x] **Signal Desktop Parser**: Encrypted JSON backups, disappearing message timers, quote replies.
- [x] **Slack Workspace Parser**: JSON channels, thread hierarchies (`thread_ts`), reactions with counts, file attachments.
- [x] **Universal File Formats**: CSV, TSV, XLSX, DOCX, MBOX, EML, Git Logs, .ZIP archives.
- [x] **Local OCR Engine**: Offline text extraction from screenshots, document photos, and images.
- [x] **Ingestion Wizard**: Drag-and-drop auto-detection of 15+ formats with streaming SQLite insertion (>25k msgs/sec).

---

### 🔍 2. Timeline, Voice & Forensic Search
- [x] **TanStack Virtualized Timeline**: 60fps scrolling for 100,000+ messages without UI lag.
- [x] **Interactive Voice Note Audio Player**: Animated equalizer waveform, seeking, and 1x/1.5x/2x speed controls.
- [x] **Universal Forensic Search**: Multi-keyword highlighting, regex matching, OCR text match badges.
- [x] **Thread Reconstruction Modal**: Tree visualizer for quoted replies and conversational sub-threads.
- [x] **Media Lightbox Gallery**: In-app viewer for photos, voice notes, and documents.

---

### 🧠 3. Forensic Analytics & Intelligence
- [x] **Emotional Valence Radar**: 6-axis emotion model (*Joy, Anger, Fear, Sadness, Surprise, Anticipation*) with actor breakdown.
- [x] **Actor Behavioral Profiling**: Nocturnal index (off-hours score), response latency distribution, burstiness ratio.
- [x] **Circadian Activity Radar**: 24-Hour polar clock and interactive 7×24 diurnal hour-of-week density matrix.
- [x] **Keyphrase & TF-IDF Engine**: Local N-gram extraction (unigrams, bigrams, trigrams) with salience scoring.
- [x] **Interactive Word Cloud**: Dynamic keyword sizing, N-gram toggles, and TF-IDF inspector cards.
- [x] **Velocity Anomaly Detector**: Statistical surge detection ($Z \ge 2.5\sigma$) and sudden communication blackout alerts.
- [x] **Automated Threat Intel & Entity Extractor**: Bitcoin, Ethereum, USDT TRC-20, Solana wallet addresses, IP addresses (Private vs Public), Luhn-validated Credit Cards, IBAN accounts, and Telecom country code profiling.
- [x] **Hybrid Trust Model & Online Gateway**: Physical `Airgap Mode (Offline)` vs `Online Enhanced Mode` switch, live VirusTotal URL scanner, AbuseIPDB reputation, live Blockchain explorer, and frontier Cloud LLM (Gemini 1.5 Pro / GPT-4o) integration.
- [x] **Geospatial Map View**: SVG projection, GPS pin extraction from maps links/EXIF, route playback simulator.
- [x] **Cross-Dataset Correlator & Venn View**: Jaccard actor overlap, shared keyphrases, and interactive SVG Venn diagram.
- [x] **Dual-Voice Forensic Podcast / Audio Transcript Studio**: 100% offline boy/girl voice casting, emotional pitch/tempo inflection, bookmarking, and karaoke teleprompter.
- [x] **Standalone HTML Forensic Dossier Export**: Self-contained single-file report with embedded client-side search and SHA-256 seal.
- [x] **Offline AI Assistant Drawer**: Deterministic Q&A with direct evidence citations.
- [x] **"On This Day" Retrospective**: Historical memory timeline across past months and years.

---

### 🎨 4. Design System & Desktop UI
- [x] **Top-3 Luxury Themes**: Cyber Hyperdrive (Cyan/Violet), Tokyo 2077 (Magenta/Gold), and Emerald Quantum (Mint/Obsidian).
- [x] **Interactive Onboarding Dropzone**: Zero-friction file dropzone directly on the Home dashboard with format tags.
- [x] **Responsive Navigation Bar**: Auto-collapsing overflow menu (`More ▾`), direct stream switcher, and runtime version display.
- [x] **Anomaly Sensitivity Slider**: Real-time +1.5σ to +4.5σ threshold slider with instantaneous filtering.
- [x] **Search Boolean & CSV Export**: Interactive `AND`/`OR`/`NOT` chips and 1-click forensic CSV dossier download.
- [x] **3D Universe Actor Isolation**: Actor constellation isolation and community focus dropdown.
- [x] **Local Assistant Quick Prompts**: One-click quick analysis chips for top speakers, nocturnal scores, and coordinates.
- [x] **Geospatial Route Multiplier**: Interactive 1x/2x/5x playback velocity controls.
- [x] **Command Palette (`Ctrl+K`)**: Fast keyboard navigation across all views and datasets.
- [x] **PIN / Security Vault**: Master PIN lock for protected forensic workspaces.

---

### 📦 5. Desktop Packaging & Portability
- [x] **Fast Windows Installer (`TextBoard-Setup-3.3.0.exe`)**: 2-second installation with Desktop and Start Menu shortcuts.
- [x] **Zero-Install Portable (`TextBoard-Portable-3.3.0.exe`)**: Standalone binary ready for USB or any PC.
- [x] **Zero-Dependency DB**: Auto-initializes SQLite database in `%APPDATA%\TextBoard\database\textboard_local.db`.
- [x] **Optimized Download Size**: Stripped 650MB+ of dev bloat with maximum LZMA compression.

---

## 📋 Bucket List (Phase 10 | Commits 91–100 — v4.0.0 Release)

- [ ] **Commit 91**: Force-Directed Network Graph with Louvain Community Detection.
- [ ] **Commit 92**: 3D Spatial Universe Network Graph with Canvas node physics and cluster orbits.
- [ ] **Commit 93**: Interactive Standalone HTML Dossier Export with self-contained embedded search engine.
- [ ] **Commit 94**: Forensic Case Binder JSON-LD & CSV Archive with cryptographic SHA-256 manifest.
- [ ] **Commit 95**: In-Memory AES-256 Encryption Vault for sensitive dataset archives.
- [ ] **Commit 96**: Password / PIN Lock Modal for Protected Case Workspaces.
- [ ] **Commit 97**: Global Quick Actions Floating HUD & Omnibar Search with shortcut triggers.
- [ ] **Commit 98**: SQLite virtual table indexing and parallel chunk streaming for sub-5ms queries.
- [ ] **Commit 99**: Full end-to-end integration and load testing across all modules.
- [ ] **Commit 100**: Finalize TextBoard v4.0.0 release bundle with updated desktop .exe installers.
