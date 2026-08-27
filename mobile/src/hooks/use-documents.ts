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

export interface TravelDoc {
  id: string;
  accountId: string;
  userId: string;
  label: string;
  fieldType: 'text' | 'file';
  value: string | null;
  fileUrl: string | null;
  fileName: string | null;
  mimeType: string | null;
  size: number | null;
  isDefault: boolean;
  createdAt: string;
}

export interface AccountMember {
  id: string;
  role: string;
  user: { id: string; name: string; email: string; image: string | null };
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

export function useAccountMembers(accountId: string | undefined) {
  return useQuery<AccountMember[]>({
    queryKey: ['account', accountId, 'members'],
    queryFn: async () => {
      const res = await authClient.$fetch(`/api/accounts/${accountId}/members`, { baseURL: API_URL });
      if (res.error) throw new Error(res.error.message ?? 'Failed to load account members');
      return res.data as AccountMember[];
    },
    enabled: Boolean(accountId),
  });
}

export function useUserTravelDocs(userId: string | null) {
  return useQuery<TravelDoc[]>({
    queryKey: ['user-travel-docs', userId],
    queryFn: async () => {
      const res = await authClient.$fetch(`/api/user-travel-docs?userId=${encodeURIComponent(userId!)}`, {
        baseURL: API_URL,
      });
      if (res.error) throw new Error(res.error.message ?? 'Failed to load travel details');
      return res.data as TravelDoc[];
    },
    enabled: Boolean(userId),
  });
}

interface SaveTravelDocInput {
  label: string;
  value: string;
  targetUserId: string;
}

export function useCreateTravelDoc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ label, value, targetUserId }: SaveTravelDocInput) => {
      const res = await authClient.$fetch('/api/user-travel-docs', {
        baseURL: API_URL,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, fieldType: 'text', value, targetUserId }),
      });
      if (res.error) throw new Error(res.error.message ?? 'Failed to add field');
      return res.data as TravelDoc;
    },
    onSuccess: (_doc, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-travel-docs', variables.targetUserId] });
    },
  });
}

export function useUpdateTravelDoc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, value, userId }: { id: string; value: string; userId: string }) => {
      const res = await authClient.$fetch('/api/user-travel-docs', {
        baseURL: API_URL,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, value }),
      });
      if (res.error) throw new Error(res.error.message ?? 'Failed to save field');
      return res.data as TravelDoc;
    },
    onSuccess: (doc, variables) => {
      queryClient.setQueryData<TravelDoc[]>(['user-travel-docs', variables.userId], (docs) =>
        docs?.map((item) => (item.id === doc.id ? doc : item)),
      );
    },
  });
}

interface UploadTravelDocInput {
  label: string;
  targetUserId: string;
  file: { uri: string; name: string; mimeType: string };
}

export function useUploadTravelDoc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ label, targetUserId, file }: UploadTravelDocInput) => {
      const formData = new FormData();
      formData.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
      formData.append('label', label);
      formData.append('targetUserId', targetUserId);
      const res = await authClient.$fetch('/api/user-travel-docs', {
        baseURL: API_URL,
        method: 'POST',
        body: formData,
      });
      if (res.error) throw new Error(res.error.message ?? 'Failed to upload field');
      return res.data as TravelDoc;
    },
    onSuccess: (_doc, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-travel-docs', variables.targetUserId] });
    },
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
