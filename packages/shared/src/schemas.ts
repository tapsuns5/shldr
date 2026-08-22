import { z } from 'zod';

/**
 * Mirrors the validation in shldr's app/api/**\/route.ts handlers. The server
 * is the source of truth and re-validates independently — these let both
 * clients fail fast and show the same field-level errors before a request
 * round-trip.
 */

export const destinationSchema = z.object({
  city: z.string().min(1).max(255),
  state: z.string().max(255).optional(),
  country: z.string().min(1).max(255),
  lat: z.number().optional(),
  lng: z.number().optional(),
  arrivalDate: z.string().optional(),
  departureDate: z.string().optional(),
});

export const tripStatusSchema = z.enum(['planning', 'confirmed', 'active', 'completed', 'cancelled']);

export const createTripSchema = z.object({
  accountId: z.string().uuid(),
  title: z.string().min(1, 'Give your trip a name').max(255),
  description: z.string().optional(),
  status: tripStatusSchema.default('planning'),
  startDate: z.string().min(1, 'Pick a start date'),
  endDate: z.string().min(1, 'Pick an end date'),
  originAirport: z.string().max(10).optional(),
  destinationCity: z.string().max(255).optional(),
  destinationCountry: z.string().max(255).optional(),
  coverImage: z.string().optional(),
  destinations: z.array(destinationSchema).optional(),
});

export type CreateTripInput = z.infer<typeof createTripSchema>;

export const updateTripSchema = createTripSchema
  .omit({ accountId: true })
  .partial();

export type UpdateTripInput = z.infer<typeof updateTripSchema>;

export const inviteRoleSchema = z.enum(['editor', 'viewer', 'traveler']);

export const inviteTripSchema = z.object({
  emails: z.array(z.string().email()).optional(),
  role: inviteRoleSchema.default('viewer'),
});

export type InviteTripInput = z.infer<typeof inviteTripSchema>;

export const createAccountSchema = z.object({
  name: z.string().min(1, 'Give your account a name').max(255),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, and hyphens only'),
  timezone: z.string().default('UTC'),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;

export const documentTypeSchema = z.enum([
  'passport',
  'visa',
  'ticket',
  'insurance',
  'hotel',
  'receipt',
  'other',
]);

export type DocumentType = z.infer<typeof documentTypeSchema>;

export const wishlistTypeSchema = z.enum(['city', 'country']);

export const createWishlistSchema = z
  .object({
    accountId: z.string().uuid(),
    type: wishlistTypeSchema.default('city'),
    city: z.string().min(1).max(255).optional(),
    country: z.string().min(1, 'Country is required').max(255),
    countryCode: z.string().max(2).optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    note: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'city' && !data.city) {
      ctx.addIssue({
        code: 'custom',
        message: 'City is required',
        path: ['city'],
      });
    }
  });

export type CreateWishlistInput = z.infer<typeof createWishlistSchema>;

export const tripitFeedSchema = z.object({
  accountId: z.string().uuid(),
  icalUrl: z
    .string()
    .url('Enter a valid URL')
    .refine((u) => u.endsWith('.ics'), { message: 'URL must end in .ics' }),
});

export type TripitFeedInput = z.infer<typeof tripitFeedSchema>;
