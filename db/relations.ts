import { relations } from 'drizzle-orm';
import {
  user,
  accounts,
  accountMembers,
  accountInvites,
  trips,
  tripMembers,
  tripDestinations,
  travelers,
  reservations,
  flightReservations,
  hotelReservations,
  carRentalReservations,
  activityReservations,
  transportReservations,
  documents,
  tripNotes,
  tripExpenses,
  tripChecklists,
  tripChecklistItems,
  emailImports,
  tripitFeeds,
  tripInvites,
  notifications,
  gmailAccounts,
  gmailSyncEvents,
  importedEmails,
  reservationImportLogs,
  userTravelDocs,
  publicShares,
  wishlistDestinations,
} from './schema';

export const userRelations = relations(user, ({ many }) => ({
  ownedAccounts: many(accounts, { relationName: 'owner' }),
  accountMemberships: many(accountMembers),
  accountInvitesSent: many(accountInvites, { relationName: 'accountInvitedBy' }),
  accountInvitesAccepted: many(accountInvites, { relationName: 'accountAcceptedBy' }),
  tripMemberships: many(tripMembers),
  createdTrips: many(trips),
  notifications: many(notifications),
  gmailAccounts: many(gmailAccounts),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  owner: one(user, {
    fields: [accounts.ownerUserId],
    references: [user.id],
    relationName: 'owner',
  }),
  members: many(accountMembers),
  invites: many(accountInvites),
  trips: many(trips),
  emailImports: many(emailImports),
  tripitFeed: one(tripitFeeds, {
    fields: [accounts.id],
    references: [tripitFeeds.accountId],
  }),
  gmailAccounts: many(gmailAccounts),
  wishlistDestinations: many(wishlistDestinations),
}));

export const tripitFeedsRelations = relations(tripitFeeds, ({ one }) => ({
  account: one(accounts, {
    fields: [tripitFeeds.accountId],
    references: [accounts.id],
  }),
}));

export const accountMembersRelations = relations(accountMembers, ({ one }) => ({
  account: one(accounts, {
    fields: [accountMembers.accountId],
    references: [accounts.id],
  }),
  user: one(user, {
    fields: [accountMembers.userId],
    references: [user.id],
  }),
}));

export const accountInvitesRelations = relations(accountInvites, ({ one }) => ({
  account: one(accounts, {
    fields: [accountInvites.accountId],
    references: [accounts.id],
  }),
  invitedByUser: one(user, {
    fields: [accountInvites.invitedByUserId],
    references: [user.id],
    relationName: 'accountInvitedBy',
  }),
  acceptedByUser: one(user, {
    fields: [accountInvites.acceptedByUserId],
    references: [user.id],
    relationName: 'accountAcceptedBy',
  }),
}));

export const tripsRelations = relations(trips, ({ one, many }) => ({
  account: one(accounts, {
    fields: [trips.accountId],
    references: [accounts.id],
  }),
  createdByUser: one(user, {
    fields: [trips.createdBy],
    references: [user.id],
  }),
  tripMembers: many(tripMembers),
  tripDestinations: many(tripDestinations),
  travelers: many(travelers),
  reservations: many(reservations),
  documents: many(documents),
  notes: many(tripNotes),
  expenses: many(tripExpenses),
  checklists: many(tripChecklists),
  invites: many(tripInvites),
  publicShares: many(publicShares),
}));

export const tripInvitesRelations = relations(tripInvites, ({ one }) => ({
  trip: one(trips, {
    fields: [tripInvites.tripId],
    references: [trips.id],
  }),
  invitedByUser: one(user, {
    fields: [tripInvites.invitedByUserId],
    references: [user.id],
    relationName: 'invitedBy',
  }),
  acceptedByUser: one(user, {
    fields: [tripInvites.acceptedByUserId],
    references: [user.id],
    relationName: 'acceptedBy',
  }),
}));

export const tripMembersRelations = relations(tripMembers, ({ one }) => ({
  trip: one(trips, {
    fields: [tripMembers.tripId],
    references: [trips.id],
  }),
  user: one(user, {
    fields: [tripMembers.userId],
    references: [user.id],
  }),
}));

export const tripDestinationsRelations = relations(tripDestinations, ({ one }) => ({
  trip: one(trips, {
    fields: [tripDestinations.tripId],
    references: [trips.id],
  }),
}));

export const travelersRelations = relations(travelers, ({ one }) => ({
  trip: one(trips, {
    fields: [travelers.tripId],
    references: [trips.id],
  }),
}));

export const reservationsRelations = relations(reservations, ({ one, many }) => ({
  trip: one(trips, {
    fields: [reservations.tripId],
    references: [trips.id],
  }),
  createdByUser: one(user, {
    fields: [reservations.createdBy],
    references: [user.id],
  }),
  flightDetails: one(flightReservations, {
    fields: [reservations.id],
    references: [flightReservations.reservationId],
  }),
  hotelDetails: one(hotelReservations, {
    fields: [reservations.id],
    references: [hotelReservations.reservationId],
  }),
  carRentalDetails: one(carRentalReservations, {
    fields: [reservations.id],
    references: [carRentalReservations.reservationId],
  }),
  activityDetails: one(activityReservations, {
    fields: [reservations.id],
    references: [activityReservations.reservationId],
  }),
  transportDetails: one(transportReservations, {
    fields: [reservations.id],
    references: [transportReservations.reservationId],
  }),
  importLogs: many(reservationImportLogs),
}));

export const flightReservationsRelations = relations(flightReservations, ({ one }) => ({
  reservation: one(reservations, {
    fields: [flightReservations.reservationId],
    references: [reservations.id],
  }),
}));

export const hotelReservationsRelations = relations(hotelReservations, ({ one }) => ({
  reservation: one(reservations, {
    fields: [hotelReservations.reservationId],
    references: [reservations.id],
  }),
}));

export const carRentalReservationsRelations = relations(carRentalReservations, ({ one }) => ({
  reservation: one(reservations, {
    fields: [carRentalReservations.reservationId],
    references: [reservations.id],
  }),
}));

export const activityReservationsRelations = relations(activityReservations, ({ one }) => ({
  reservation: one(reservations, {
    fields: [activityReservations.reservationId],
    references: [reservations.id],
  }),
}));

export const transportReservationsRelations = relations(transportReservations, ({ one }) => ({
  reservation: one(reservations, {
    fields: [transportReservations.reservationId],
    references: [reservations.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  trip: one(trips, {
    fields: [documents.tripId],
    references: [trips.id],
  }),
  uploadedByUser: one(user, {
    fields: [documents.uploadedBy],
    references: [user.id],
  }),
}));

export const tripNotesRelations = relations(tripNotes, ({ one }) => ({
  trip: one(trips, {
    fields: [tripNotes.tripId],
    references: [trips.id],
  }),
  createdByUser: one(user, {
    fields: [tripNotes.createdBy],
    references: [user.id],
  }),
  updatedByUser: one(user, {
    fields: [tripNotes.updatedBy],
    references: [user.id],
    relationName: 'updatedBy',
  }),
}));

export const tripExpensesRelations = relations(tripExpenses, ({ one }) => ({
  trip: one(trips, {
    fields: [tripExpenses.tripId],
    references: [trips.id],
  }),
  paidByTraveler: one(travelers, {
    fields: [tripExpenses.paidByTravelerId],
    references: [travelers.id],
  }),
}));

export const tripChecklistsRelations = relations(tripChecklists, ({ one, many }) => ({
  trip: one(trips, {
    fields: [tripChecklists.tripId],
    references: [trips.id],
  }),
  items: many(tripChecklistItems),
}));

export const tripChecklistItemsRelations = relations(tripChecklistItems, ({ one }) => ({
  checklist: one(tripChecklists, {
    fields: [tripChecklistItems.checklistId],
    references: [tripChecklists.id],
  }),
  completedByUser: one(user, {
    fields: [tripChecklistItems.completedBy],
    references: [user.id],
  }),
}));

export const emailImportsRelations = relations(emailImports, ({ one }) => ({
  account: one(accounts, {
    fields: [emailImports.accountId],
    references: [accounts.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(user, {
    fields: [notifications.userId],
    references: [user.id],
  }),
  trip: one(trips, {
    fields: [notifications.tripId],
    references: [trips.id],
  }),
  reservation: one(reservations, {
    fields: [notifications.reservationId],
    references: [reservations.id],
  }),
}));

export const gmailAccountsRelations = relations(gmailAccounts, ({ one, many }) => ({
  user: one(user, {
    fields: [gmailAccounts.userId],
    references: [user.id],
  }),
  account: one(accounts, {
    fields: [gmailAccounts.accountId],
    references: [accounts.id],
  }),
  syncEvents: many(gmailSyncEvents),
  importedEmails: many(importedEmails),
}));

export const gmailSyncEventsRelations = relations(gmailSyncEvents, ({ one }) => ({
  gmailAccount: one(gmailAccounts, {
    fields: [gmailSyncEvents.gmailAccountId],
    references: [gmailAccounts.id],
  }),
}));

export const importedEmailsRelations = relations(importedEmails, ({ one }) => ({
  gmailAccount: one(gmailAccounts, {
    fields: [importedEmails.gmailAccountId],
    references: [gmailAccounts.id],
  }),
  reservation: one(reservations, {
    fields: [importedEmails.reservationId],
    references: [reservations.id],
  }),
}));

export const reservationImportLogsRelations = relations(reservationImportLogs, ({ one }) => ({
  reservation: one(reservations, {
    fields: [reservationImportLogs.reservationId],
    references: [reservations.id],
  }),
}));

export const userTravelDocsRelations = relations(userTravelDocs, ({ one }) => ({
  account: one(accounts, {
    fields: [userTravelDocs.accountId],
    references: [accounts.id],
  }),
  user: one(user, {
    fields: [userTravelDocs.userId],
    references: [user.id],
  }),
  createdByUser: one(user, {
    fields: [userTravelDocs.createdBy],
    references: [user.id],
    relationName: 'createdBy',
  }),
}));

export const publicSharesRelations = relations(publicShares, ({ one }) => ({
  trip: one(trips, {
    fields: [publicShares.tripId],
    references: [trips.id],
  }),
  createdByUser: one(user, {
    fields: [publicShares.createdBy],
    references: [user.id],
  }),
}));

export const wishlistDestinationsRelations = relations(wishlistDestinations, ({ one }) => ({
  account: one(accounts, {
    fields: [wishlistDestinations.accountId],
    references: [accounts.id],
  }),
  createdByUser: one(user, {
    fields: [wishlistDestinations.createdBy],
    references: [user.id],
  }),
}));

