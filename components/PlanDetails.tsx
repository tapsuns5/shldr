'use client';

import { useState } from 'react';
import { Alert, Box, Link, Snackbar, Typography } from '@mui/material';
import AddressMenu from './AddressMenu';
import { getReservationDetailLines, type APIReservation } from '@/hooks/use-reservations';

function splitPhoneSuffix(text: string): { text: string; phone?: string } {
  const phoneRe = /([,]\s*|\s+)(\+?[\d\s\-.()]{6,}\d)\s*$/;
  const m = text.match(phoneRe);
  if (!m) return { text };
  const phone = m[2].trim();
  if (phone.replace(/\D/g, '').length < 7) return { text };
  const prefix = text.slice(0, text.length - m[0].length).trim().replace(/,\s*$/, '');
  if (!prefix) return { text };
  return { text: prefix, phone };
}

function isPhoneNumber(text: string): boolean {
  const phoneRe = /^\s*(\+?[\d\s\-.()]{6,}\d)\s*$/;
  const m = text.match(phoneRe);
  if (!m) return false;
  return m[1].replace(/\D/g, '').length >= 7;
}

function PhoneLink({ phone }: { phone: string }) {
  return (
    <Link
      href={`tel:${phone.replace(/[\s\-.()]/g, '')}`}
      variant="body2"
      underline="hover"
      sx={{ color: 'primary.main' }}
      onClick={(e) => e.stopPropagation()}
    >
      {phone}
    </Link>
  );
}

function CopyableLine({ text, value }: { text: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Fallback for environments without clipboard API
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setCopied(true);
      } catch {
        /* ignore */
      }
      document.body.removeChild(ta);
    }
  };

  // If the line text ends with the copyable value (e.g. "Confirmation BXVNTN"),
  // render the prefix as plain secondary text and only the value as underlined/clickable.
  const prefix = value && text.endsWith(value) ? text.slice(0, text.length - value.length) : '';
  const clickable = prefix ? value : text;

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
        {prefix && (
          <Typography variant="body2" color="text.secondary" component="span">
            {prefix}
          </Typography>
        )}
        <Typography
          variant="body2"
          color="text.secondary"
          component="span"
          role="button"
          tabIndex={0}
          onClick={handleCopy}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleCopy(e as unknown as React.MouseEvent<HTMLElement>);
            }
          }}
          sx={{
            color: 'primary.main',
            fontWeight: 500,
            cursor: 'pointer',
            textDecoration: 'underline',
            textUnderlineOffset: 2,
          }}
        >
          {clickable}
        </Typography>
      </Box>
      <Snackbar
        open={copied}
        autoHideDuration={2500}
        onClose={() => setCopied(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setCopied(false)}>
          Confirmation number copied to clipboard!
        </Alert>
      </Snackbar>
    </>
  );
}

interface PlanDetailsProps {
  reservation: APIReservation;
}

export default function PlanDetails({ reservation }: PlanDetailsProps) {
  const lines = getReservationDetailLines(reservation);
  if (lines.length === 0) return null;

  return (
    <Box sx={{ mt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
      {lines.map((line, idx) => {
        if (line.copyValue) {
          return <CopyableLine key={idx} text={line.text} value={line.copyValue} />;
        }

        if (isPhoneNumber(line.text)) {
          return (
            <Box key={idx} sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }} component="span">
              <PhoneLink phone={line.text.trim()} />
            </Box>
          );
        }

        if (line.address) {
          const { text: displayText, phone } = splitPhoneSuffix(line.text);
          const { text: mapAddress } = splitPhoneSuffix(line.address);
          return (
            <Box key={idx} sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, flexWrap: 'wrap' }} component="span">
              <AddressMenu address={mapAddress}>{displayText}</AddressMenu>
              {phone && (
                <>
                  <Typography component="span" variant="body2" color="text.secondary">,</Typography>
                  <PhoneLink phone={phone} />
                </>
              )}
            </Box>
          );
        }

        return (
          <Box key={idx} sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
            <Typography
              variant="body2"
              color="text.secondary"
              component="span"
              sx={line.text.includes('\n') ? { whiteSpace: 'pre-line' } : undefined}
            >
              {line.text}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
