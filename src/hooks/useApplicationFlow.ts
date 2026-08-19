import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createApplication,
  generateApplicationPdf,
  getApplication,
  patchApplicationFields,
} from '../api/applications';
import { useSessionStore } from '../stores/sessionStore';

export function useApplicationQuery(appId: string | undefined) {
  const token = useSessionStore((s) => s.token);
  return useQuery({
    queryKey: ['application', appId],
    queryFn: () => getApplication(appId as string, token as string),
    enabled: !!appId && !!token,
  });
}

export function useCreateApplicationMutation() {
  const sessionId = useSessionStore((s) => s.sessionId);
  const token = useSessionStore((s) => s.token);
  const setLatestApplicationId = useSessionStore((s) => s.setLatestApplicationId);

  return useMutation({
    mutationFn: (programIds: string[]) => createApplication(sessionId as string, token as string, programIds),
    onSuccess: (data) => setLatestApplicationId(data.applicationId),
  });
}

export function usePatchFieldsMutation(appId: string) {
  const token = useSessionStore((s) => s.token);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fields: Record<string, string>) => patchApplicationFields(appId, token as string, fields),
    onSuccess: (data) => {
      queryClient.setQueryData(['application', appId], (prev: unknown) => {
        if (!prev || typeof prev !== 'object') return prev;
        return { ...prev, fields: data.fields };
      });
    },
  });
}

export function useGeneratePdfMutation(appId: string) {
  const token = useSessionStore((s) => s.token);

  return useMutation({
    mutationFn: () => generateApplicationPdf(appId, token as string),
    onSuccess: ({ blob, filename }) => {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    },
  });
}
