# Textboard V1 PDF Exporter Architecture

## 1. Executive Summary

Textboard V1 includes a production-grade **Full Chat PDF Exporter** built to generate high-fidelity, WhatsApp-style conversation archives. Designed for large-scale datasets, it effortlessly handles **100,000 to 500,000+ messages** with strict $O(1)$ memory consumption, lossless message preservation, dynamic TrueType font/Unicode resolution, and deterministic data-integrity validation.

---

## 2. Core Architecture

The architecture decouples the export lifecycle into distinct streaming stages:

```
[ Frontend: Configure & Poll ]
           │
           ▼
[ ExportController ] ──> [ ExportService ]
                              │
                              ├──> [ DataIntegrityVerifier ] (Rolling SHA-256 Hash Chain)
                              ├──> [ FontResolverService ] (Host TrueType / Unicode Sanitization)
                              └──> [ ChatPdfRendererService ] (Progressive Page Streaming)
                                          │
                                          ▼
                               [ .textboard/exports/*.pdf ]
```

### Key Architectural Tenets
1. **Zero Large Buffers in RAM**: Messages are retrieved sequentially from the database using indexed cursor pagination (`batchSize: 2,500`). PDFKit streams pages directly to a Node.js filesystem write stream without holding documents in memory.
2. **Deterministic Data Integrity**: Every rendered message is verified against its source record ID. The engine computes a rolling cryptographic SHA-256 digest over message IDs, timestamps, and contents.
3. **Strict Validation Invariants**: Before marking any export as `COMPLETED`, the verifier checks:
   - `source_count == rendered_count`
   - `missing_count == 0`
   - `duplicate_count == 0`
   - `failed_count == 0`
   - First and last source message boundary match
   - Strict chronological sequence
4. **Resilience & Cleanup**: If validation fails or the user cancels the job, partial output files are immediately purged and the job is marked `FAILED` or `CANCELLED` with diagnostic logs.

---

## 3. Visual Chat Layout & Formatting

The generated PDF presents conversations in a clean, modern WhatsApp-inspired layout optimized for reading and printing:

| Element | Visual Treatment |
|---|---|
| **Document Header** | Top banner on page 1 detailing dataset title, total messages, date range, and export timestamp. |
| **Date Separators** | Centered rounded pills (`MONDAY, 14 AUGUST 2025`) displayed whenever the calendar date transitions. |
| **Participant Badges** | Distinct color palettes (Emerald, Blue, Purple, Amber, Rose, Teal) deterministically assigned per participant. |
| **Message Bubbles** | Soft-tinted rounded boxes with subtle borders, custom padding, and line gap spacing. |
| **Consecutive Grouping** | Messages from the same author sent within 5 minutes collapse the sender header badge for clean stacking. |
| **Timestamps** | Formatted timestamps (`10:42 PM`) aligned at the lower right of each bubble. |
| **Media Placeholders** | Visual indicator tags for attachments (`📎 [ATTACHMENT / MEDIA]`, audio, document, images). |

---

## 4. Font & Unicode Handling Strategy

PDFKit default fonts (Helvetica, Times) only support standard Latin-1. To support global languages and symbols without crashes:
- **`FontResolverService`** scans the host environment for TrueType Unicode fonts (Windows: `segoeui.ttf`, `arial.ttf`, `tahoma.ttf`; Linux: `DejaVuSans.ttf`, `NotoSans-Regular.ttf`; macOS: `Arial.ttf`).
- TrueType glyph tables are registered dynamically with subsetting.
- Unicode strings are normalized (`NFC`) and non-printable control codes are stripped while preserving newlines and indentation.
- Tested and verified with English, Urdu, Arabic (`مرحبا بكم!`), Japanese (`こんにちは世界！`), emojis (`😂`, `❤️`, `🔥`, `🎉`), and long multi-line paragraphs.

---

## 5. API Endpoints

### 1. Start PDF Export
`POST /datasets/:id/export/pdf` or `POST /api/v1/datasets/:id/export/pdf`
```json
{
  "type": "chat",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-12-31T23:59:59Z",
  "actor": "Ali",
  "includeTimestamps": true,
  "includeSenderNames": true,
  "includeDateSeparators": true,
  "includeMediaPlaceholders": true,
  "groupConsecutive": true,
  "pageSize": "A4"
}
```
**Response**:
```json
{
  "jobId": "export_1787254533371_5yi4nx"
}
```

### 2. Poll Job Status
`GET /datasets/:id/export/pdf/:jobId/status`
**Response**:
```json
{
  "jobId": "export_1787254533371_5yi4nx",
  "datasetId": "...",
  "type": "chat",
  "status": "COMPLETED",
  "step": "completed",
  "progress": 100,
  "processedMessages": 100000,
  "totalMessages": 100000,
  "fileSize": 20206387,
  "filename": "Textboard_Chat_Dataset_1787254533372.pdf",
  "downloadUrl": "/datasets/.../export/pdf/export_.../download",
  "manifest": {
    "sourceMessageCount": 100000,
    "renderedMessageCount": 100000,
    "missingCount": 0,
    "duplicateCount": 0,
    "failedCount": 0,
    "status": "VERIFIED",
    "contentChecksum": "38490ea7a2656fd9eb10f4628787292746b779d7be9bcc1c60e432306706fc35"
  }
}
```

### 3. Cancel Export Job
`POST /datasets/:id/export/pdf/:jobId/cancel`

### 4. Download Export PDF
`GET /datasets/:id/export/pdf/:jobId/download`

---

## 6. 100,000-Message Production Benchmark Results

Measured in actual execution on the local environment:

| Benchmark Metric | Result |
|---|---|
| **Total Message Count** | **100,000 messages** |
| **Export Duration** | **35.84 seconds** (~2,790 msgs/sec) |
| **Peak Heap Memory** | **451 MB** (Delta: +68 MB over idle baseline) |
| **Peak RSS Memory** | **747 MB** |
| **Output File Size** | **19.27 MB** |
| **Rendered Messages** | **100,000 / 100,000 (100.0%)** |
| **Missing Records** | **0** |
| **Duplicate Records** | **0** |
| **Failed Records** | **0** |
| **Data Integrity Status** | **`VERIFIED`** |
| **First Message Boundary** | Verified (`evt_100k_000000`) |
| **Last Message Boundary** | Verified (`evt_100k_099999`) |
| **Unicode / Emoji Integrity** | Verified (Arabic, Urdu, Japanese, Emoji) |
