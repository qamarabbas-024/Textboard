import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

export const UPLOAD_LIMITS = {
  TEXT_CHAT_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  SPREADSHEET_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  DOCUMENT_FILE_SIZE: 50 * 1024 * 1024, // 50MB per file
  DOCUMENT_MAX_FILES: 20, // Max 20 files
} as const;

export const ALLOWED_EXTENSIONS = {
  TEXT_CHAT: ['txt'],
  SPREADSHEET: ['csv', 'xlsx', 'xls', 'tsv'],
  DOCUMENT: ['pdf', 'docx', 'doc', 'txt', 'md', 'rtf', 'json', 'jsonl', 'mbox', 'eml', 'log', 'gitlog', 'png', 'jpg', 'jpeg', 'webp', 'zip'],
} as const;

/**
 * Sanitizes uploaded filenames against path traversal and special characters.
 */
export function sanitizeUploadFilename(rawName: string): string {
  if (!rawName) return 'unnamed_upload';
  return rawName
    .replace(/^(\.\.[\/\\])+/, '')
    .replace(/[\x00-\x1f\x80-\x9f]/g, '')
    .replace(/[<>:"/\\|?*]/g, '_')
    .slice(0, 255);
}

/**
 * Text Chat Multer options with strict fileSize limit and text validation
 */
export const textChatMulterOptions: MulterOptions = {
  limits: {
    fileSize: UPLOAD_LIMITS.TEXT_CHAT_FILE_SIZE,
  },
  fileFilter: (_req, file, callback) => {
    const isTxt =
      file.originalname.toLowerCase().endsWith('.txt') ||
      file.mimetype === 'text/plain';
    if (!isTxt) {
      return callback(
        new BadRequestException(
          'Invalid file type. Only plain text (.txt) exports are supported.',
        ),
        false,
      );
    }
    callback(null, true);
  },
};

/**
 * Spreadsheet Multer options with strict fileSize limit and extension validation
 */
export const spreadsheetMulterOptions: MulterOptions = {
  limits: {
    fileSize: UPLOAD_LIMITS.SPREADSHEET_FILE_SIZE,
  },
  fileFilter: (_req, file, callback) => {
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.SPREADSHEET.includes(ext as any)) {
      return callback(
        new BadRequestException(
          `Invalid file format .${ext}. Only CSV, XLSX, XLS, and TSV files are accepted.`,
        ),
        false,
      );
    }
    callback(null, true);
  },
};

/**
 * Document Multer options with strict fileSize limit
 */
export const documentMulterOptions: MulterOptions = {
  limits: {
    fileSize: UPLOAD_LIMITS.DOCUMENT_FILE_SIZE,
  },
};
