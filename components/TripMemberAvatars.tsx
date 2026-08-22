'use client';

import { Avatar, AvatarGroup, Box, Tooltip, Typography, Stack } from '@mui/material';
import { useSession } from '@/lib/auth-client';
import { type APITripMember } from '@/hooks/use-trips';

interface TripMemberAvatarsProps {
  members: APITripMember[];
  createdBy: string;
}

function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function TripMemberAvatars({ members, createdBy }: TripMemberAvatarsProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const validMembers = members.filter((m) => m.user?.name);

  if (validMembers.length <= 1) return null;
  const owner = validMembers.find((m) => m.userId === createdBy);
  const others = validMembers.filter((m) => m.userId !== createdBy);

  const isViewingAsGuest = currentUserId && currentUserId !== createdBy;

  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
      {isViewingAsGuest && owner ? (
        <Tooltip
          title={
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                {owner.user.name}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>
                Trip owner
              </Typography>
            </Box>
          }
          arrow
        >
          <Box sx={{ position: 'relative', display: 'inline-flex', cursor: 'default' }}>
            <Avatar
              src={owner.user.image || undefined}
              sx={{
                width: 28,
                height: 28,
                fontSize: 11,
                fontWeight: 700,
                bgcolor: 'primary.main',
                border: '2px solid',
                borderColor: 'primary.main',
              }}
            >
              {initials(owner.user.name)}
            </Avatar>
            <Box
              sx={{
                position: 'absolute',
                bottom: -1,
                right: -1,
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                border: '1.5px solid',
                borderColor: 'background.paper',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography sx={{ fontSize: 6, color: 'white', fontWeight: 900, lineHeight: 1 }}>✦</Typography>
            </Box>
          </Box>
        </Tooltip>
      ) : (
        <AvatarGroup
          max={5}
          sx={{
            '& .MuiAvatar-root': {
              width: 28,
              height: 28,
              fontSize: 11,
              fontWeight: 700,
              border: '2px solid',
              borderColor: 'background.paper',
            },
          }}
        >
          {others.map((m) => (
            <Tooltip
              key={m.id}
              title={
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                    {m.user.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)', textTransform: 'capitalize' }}>
                    {m.role}
                  </Typography>
                </Box>
              }
              arrow
            >
              <Avatar
                src={m.user.image || undefined}
                sx={{ bgcolor: stringToColor(m.user.name), cursor: 'default' }}
              >
                {initials(m.user.name)}
              </Avatar>
            </Tooltip>
          ))}
        </AvatarGroup>
      )}
    </Stack>
  );
}

function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ['#1b6b3a', '#1565c0', '#6a1b9a', '#e65100', '#00695c', '#c62828', '#0277bd', '#4527a0'];
  return colors[Math.abs(hash) % colors.length];
}
