# TextBoard — Project Memory & Architecture Matrix

## 1. Project Identity & Vision
- **Product Name**: TextBoard (formerly Archive Terminal)
- **Positioning**: Private, local-first intelligence workstation for large-scale communications streams, chat archives, logs, and tabular data.
- **Key Guarantee**: 100% Zero-Cloud / Zero-Hallucination deterministic analysis with high-throughput streaming pipelines.

## 2. Target Users & Personas
- **Investigators / Forensic Analysts**: Needing strict, provable audit trails and deterministic metric generation.
- **Power Users & Community Managers**: Analyzing massive WhatsApp, Discord, Telegram, and Slack exports (100k+ records) with zero browser freezing.
- **Privacy-Conscious Professionals**: Demanding zero external API leakage, local SQLite storage, and offline capabilities.

## 3. Universal Design System & Theme Engine
- **Themes (5 Curated Palettes)**:
  1. `obsidian` / `cyberpunk` (Default Cyber Titanium & Cyan)
  2. `solar` / `cream` (Solar Warm Editorial Cream with Rust Accents)
  3. `matrix` (Phosphor Green CRT Monochrome Terminal)
  4. `slate` (Midnight Slate & Ice-Cyan Command Center)
  5. `nordic` (Nordic Frost Silver & Arctic Blue)
- **Token Hierarchy**:
  - `bg-theme-base`, `bg-theme-surface`, `bg-theme-raised`, `bg-theme-active`
  - `border-theme-border`, `border-theme-border-hi`
  - `text-theme-text`, `text-theme-muted`, `text-theme-dim`, `text-theme-accent`
- **Control System**:
  - Universal `<Button>` (`primary`, `secondary`, `ghost`, `danger`, `accent-outline`)
  - Universal `<IconButton>` with accessible ARIA labels and focus-visible rings.

## 4. Ingestion & Analytical Pipeline
- **Supported Stream Formats**: WhatsApp (iOS/Android), Telegram (JSON/HTML), Discord (JSON/TXT), Apple iMessage, Signal, Slack, CSV, TSV, JSON, JSONL/NDJSON, XLSX/XLS, Plain Text, and Universal Multi-file `.ZIP` archives.
- **Ingestion Execution**: Constant O(1) memory streaming via `readline` and chunked sinks (`BatchedSinkService`), scaling to 100,000+ entries.
- **PDF Export Engine**: Vectorized multi-page PDF generation with Eye-Care cream palettes, cryptographic SHA-256 manifests, and zero-missing/zero-duplicate verification.
- **Forensic Anomaly Engine (V2.1)**: Late-night spikes (00:00-05:00), rapid velocity bursts (>25 msgs/5min), extended silence gaps (>14 days), urgency/security keywords, and ghost participant tracking.
- **Cross-Dataset Multi-Stream Correlator (V2.2)**: Side-by-side comparative analysis, temporal duration overlaps, Pearson hourly synchronicity, and lexical/emoji diffing.
- **Universal Multi-Format Export Studio (V2.3)**:
  - Zero-dependency Standalone HTML Forensic Case Dossier with embedded real-time search.
  - Obsidian-ready Markdown Archive Vault (.ZIP) with monthly partitioning and YAML frontmatter.
- **Topic Clustering & Thread Reconstruction (V3.0)**:
  - Deterministic TF-IDF thematic clustering (Financial, Technical, Scheduling, Travel, Operations, Social).
  - Conversation Thread Reconstructor grouping flat linear chat streams into discrete discussion sessions.

## 5. Security & Isolation
- **Local PIN Convenience Lock**: SHA-based client session guard preventing shoulder-surfing without pretending to replace OS-level disk encryption.
- **Offline Integrity**: SQLite WAL database at `backend/prisma/archive_local.db` with zero remote network dependencies.


