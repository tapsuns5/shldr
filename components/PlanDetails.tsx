'use client';

import { Box, Link, Typography } from '@mui/material';
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

interface PlanDetailsProps {
  reservation: APIReservation;
}

export default function PlanDetails({ reservation }: PlanDetailsProps) {
  const lines = getReservationDetailLines(reservation);
  if (lines.length === 0) return null;

  return (
    <Box sx={{ mt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
      {lines.map((line, idx) => {
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
