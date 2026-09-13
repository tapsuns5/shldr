export interface TripDocument {
  id: string;
  tripId: string;
  reservationId: string | null;
  uploadedBy: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  size: number;
  documentType: string;
  createdAt: string;
  updatedAt: string;
}
