import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DocumentType } from '@shldr/shared';
import { authClient } from '@/lib/auth-client';
import { API_URL } from '@/lib/config';

export interface APIDocument {
  id: string;
  tripId: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  size: number;
  documentType: DocumentType;
  createdAt: string;
}

export function useDocuments(tripId: string | undefined) {
  return useQuery<APIDocument[]>({
    queryKey: ['trip', tripId, 'documents'],
    queryFn: async () => {
      const res = await authClient.$fetch(`/api/trips/${tripId}/documents`, { baseURL: API_URL });
      if (res.error) throw new Error(res.error.message ?? 'Failed to load documents');
      return res.data as APIDocument[];
    },
    enabled: Boolean(tripId),
  });
}

interface UploadInput {
  tripId: string;
  documentType: DocumentType;
  file: { uri: string; name: string; mimeType: string };
}

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, documentType, file }: UploadInput) => {
      const formData = new FormData();
      // React Native's fetch/FormData accepts { uri, name, type } file objects directly.
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType,
      } as unknown as Blob);
      formData.append('documentType', documentType);

      const res = await authClient.$fetch(`/api/trips/${tripId}/documents`, {
        baseURL: API_URL,
        method: 'POST',
        body: formData,
      });
      if (res.error) throw new Error(res.error.message ?? 'Upload failed');
      return res.data as APIDocument;
    },
    onSuccess: (_doc, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trip', variables.tripId, 'documents'] });
    },
  });
}
