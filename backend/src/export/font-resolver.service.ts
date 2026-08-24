import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface RegisteredFontFamily {
  regular: string;
  bold: string;
  isCustomTtf: boolean;
}

@Injectable()
export class FontResolverService {
  private readonly logger = new Logger(FontResolverService.name);
  private cachedFontFamily: RegisteredFontFamily | null = null;

  /**
   * Discovers the best available TrueType Unicode font on the host operating system.
   */
  resolveBestFontFamily(): { regularPath: string | null; boldPath: string | null } {
    const candidatePaths = [
      // Windows
      {
        regular: 'C:\\Windows\\Fonts\\segoeui.ttf',
        bold: 'C:\\Windows\\Fonts\\segoeuib.ttf',
      },
      {
        regular: 'C:\\Windows\\Fonts\\arial.ttf',
        bold: 'C:\\Windows\\Fonts\\arialbd.ttf',
      },
      {
        regular: 'C:\\Windows\\Fonts\\tahoma.ttf',
        bold: 'C:\\Windows\\Fonts\\tahomabd.ttf',
      },
      {
        regular: 'C:\\Windows\\Fonts\\urdu.ttf',
        bold: 'C:\\Windows\\Fonts\\urdu.ttf',
      },
      {
        regular: 'C:\\Windows\\Fonts\\JameelNooriNastaleeq.ttf',
        bold: 'C:\\Windows\\Fonts\\JameelNooriNastaleeq.ttf',
      },
      {
        regular: 'C:\\Windows\\Fonts\\tradbdo.ttf',
        bold: 'C:\\Windows\\Fonts\\tradbdo.ttf',
      },
      // Linux
      {
        regular: '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        bold: '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
      },
      {
        regular: '/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf',
        bold: '/usr/share/fonts/truetype/noto/NotoSansArabic-Bold.ttf',
      },
      {
        regular: '/usr/share/fonts/truetype/noto/NotoNaskhArabic-Regular.ttf',
        bold: '/usr/share/fonts/truetype/noto/NotoNaskhArabic-Bold.ttf',
      },
      {
        regular: '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
        bold: '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
      },
      {
        regular: '/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf',
        bold: '/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf',
      },
      // macOS
      {
        regular: '/Library/Fonts/Arial.ttf',
        bold: '/Library/Fonts/Arial Bold.ttf',
      },
      {
        regular: '/System/Library/Fonts/Supplemental/Arial.ttf',
        bold: '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
      },
      {
        regular: '/System/Library/Fonts/SFArabic.ttf',
        bold: '/System/Library/Fonts/SFArabic.ttf',
      },
    ];

    for (const candidate of candidatePaths) {
      if (fs.existsSync(candidate.regular)) {
        const hasBold = fs.existsSync(candidate.bold);
        this.logger.log(
          `Discovered host TrueType font: ${candidate.regular} (Bold: ${hasBold ? candidate.bold : 'same'})`,
        );
        return {
          regularPath: candidate.regular,
          boldPath: hasBold ? candidate.bold : candidate.regular,
        };
      }
    }

    this.logger.warn('No system TrueType font found. Falling back to PDF standard Helvetica.');
    return { regularPath: null, boldPath: null };
  }

  /**
   * Registers Unicode TrueType fonts on a PDFDocument instance.
   */
  configureFonts(doc: PDFKit.PDFDocument): RegisteredFontFamily {
    const { regularPath, boldPath } = this.resolveBestFontFamily();

    if (regularPath && boldPath) {
      try {
        doc.registerFont('Textboard-Regular', regularPath);
        doc.registerFont('Textboard-Bold', boldPath);

        const symbolPath = 'C:\\Windows\\Fonts\\seguisym.ttf';
        if (fs.existsSync(symbolPath)) {
          try {
            doc.registerFont('Textboard-Symbol', symbolPath);
          } catch {}
        }

        this.cachedFontFamily = {
          regular: 'Textboard-Regular',
          bold: 'Textboard-Bold',
          isCustomTtf: true,
        };
        return this.cachedFontFamily;
      } catch (err: any) {
        this.logger.warn(`Failed to register custom TrueType font: ${err.message}`);
      }
    }

    this.cachedFontFamily = {
      regular: 'Helvetica',
      bold: 'Helvetica-Bold',
      isCustomTtf: false,
    };
    return this.cachedFontFamily;
  }

  /**
   * Sanitizes string for PDF rendering:
   * - Preserves multi-byte Unicode and Emoji characters
   * - Strips ASCII control codes (except \n, \r, \t)
   * - Normalizes newlines
   */
  sanitizeText(input: string | null | undefined): string {
    if (!input) return '';

    return (
      input
        .normalize('NFC')
        // Strip non-printable ASCII control characters except \n, \r, \t
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
    );
  }
}
