/**
 * Save file attachments extracted from imported emails as trip documents.
 *
 * Shared by the email-import webhook and the gmail worker pipeline so an
 * attachment on a confirmation email becomes a document on the reservation
 * created from that email.
 */

import { randomUUID } from 'crypto';
import { simpleParser, type Attachment } from 'mailparser';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { uploadToR2 } from '@/lib/r2';

export interface EmailAttachmentInput {
  fileName: string;
  contentType?: string | null;
  content: Buffer;
}

/** 10 MB cap per attachment — larger files are skipped. */
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
/** Max attachments processed per email. */
const MAX_ATTACHMENTS_PER_EMAIL = 10;

type DocumentType = 'passport' | 'visa' | 'ticket' | 'insurance' | 'hotel' | 'receipt' | 'other';

export function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[/\\?%*:|"<>]/g, '_').replace(/[\r\n]+/g, ' ').trim();
  return cleaned || 'attachment';
}

/** Best-effort document type for an attachment based on the reservation type. */
export function documentTypeForEvent(eventType: string): DocumentType {
  if (eventType === 'flight') return 'ticket';
  if (eventType === 'hotel') return 'hotel';
  return 'other';
}

/**
 * Pick storable file attachments out of a parsed email — skips inline
 * images (signatures, logos) and oversized/unnamed blobs.
 */
export function storableAttachments(parsedAttachments: Attachment[] | undefined): EmailAttachmentInput[] {
  return (parsedAttachments ?? [])
    .filter((a) => a.contentDisposition !== 'inline')
    .filter((a) => !!a.content?.length && a.content.length <= MAX_ATTACHMENT_BYTES)
    .slice(0, MAX_ATTACHMENTS_PER_EMAIL)
    .map((a) => ({
      fileName: sanitizeFileName(a.filename || 'attachment'),
      contentType: a.contentType || null,
      content: a.content,
    }));
}

/** Parse a raw MIME email and return its file attachments. Accepts a Buffer or a base64url string. */
export async function attachmentsFromRawEmail(raw: Buffer | string): Promise<EmailAttachmentInput[]> {
  let source: Buffer | string = raw;
  if (typeof raw === 'string') {
    const normalized = raw.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    source = Buffer.from(padded, 'base64');
  }
  const parsed = await simpleParser(source);
  return storableAttachments(parsed.attachments);
}

/**
 * Upload each attachment to R2 and create a documents row scoped to the
 * reservation. Idempotent: skips files already stored with the same
 * reservation + file name + size so webhook retries don't duplicate.
 */
export async function saveEmailAttachments(opts: {
  tripId: string;
  reservationId?: string | null;
  userId: string;
  attachments: EmailAttachmentInput[];
  documentType?: DocumentType;
}): Promise<number> {
  const { tripId, reservationId = null, userId, attachments, documentType = 'other' } = opts;
  let saved = 0;

  for (const attachment of attachments.slice(0, MAX_ATTACHMENTS_PER_EMAIL)) {
    if (!attachment.content?.length || attachment.content.length > MAX_ATTACHMENT_BYTES) continue;

    const fileName = sanitizeFileName(attachment.fileName);
    try {
      const existing = await db.query.documents.findFirst({
        where: and(
          eq(documents.tripId, tripId),
          reservationId ? eq(documents.reservationId, reservationId) : isNull(documents.reservationId),
          eq(documents.fileName, fileName),
          eq(documents.size, attachment.content.length),
        ),
      });
      if (existing) continue;

      const mimeType = attachment.contentType || 'application/octet-stream';
      const key = `trips/${tripId}/documents/${randomUUID()}-${fileName}`;
      const fileUrl = await uploadToR2(key, attachment.content, mimeType);

      await db.insert(documents).values({
        tripId,
        reservationId,
        uploadedBy: userId,
        fileName,
        fileUrl,
        mimeType,
        size: attachment.content.length,
        documentType,
      });
      saved += 1;
    } catch (err) {
      console.error('[import-attachments] Failed to save attachment:', fileName, err);
    }
  }

  return saved;
}
