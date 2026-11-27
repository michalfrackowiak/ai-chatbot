'use client';

import { useMemo } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { toast } from 'sonner';
import { unstable_serialize } from 'swr/infinite';
import { updateChatVisibility } from '@/app/(chat)/actions';
import {
  getChatHistoryPaginationKey,
  type ChatHistory,
} from '@/components/sidebar-history';
import type { VisibilityType } from '@/components/visibility-selector';

export function useChatVisibility({
  chatId,
  initialVisibilityType,
}: {
  chatId: string;
  initialVisibilityType: VisibilityType;
}) {
  const { mutate, cache } = useSWRConfig();
  const history: ChatHistory = cache.get('/api/history')?.data;

  const { data: localVisibility, mutate: setLocalVisibility } = useSWR(
    `${chatId}-visibility`,
    null,
    {
      fallbackData: initialVisibilityType,
    },
  );

  const visibilityType = useMemo(() => {
    if (!history) return localVisibility;
    const chat = history.chats.find((chat) => chat.id === chatId);
    if (!chat) return 'private';
    return chat.visibility;
  }, [history, chatId, localVisibility]);

  const setVisibilityType = async (updatedVisibilityType: VisibilityType) => {
    try {
      const updated = await updateChatVisibility({
        chatId,
        visibility: updatedVisibilityType,
      });
      if (!updated) {
        toast.error(
          'Unable to change visibility. Chats with ledger activity stay private.',
        );
        return;
      }
      await setLocalVisibility(updatedVisibilityType);
      await mutate(unstable_serialize(getChatHistoryPaginationKey));
    } catch {
      toast.error('Unable to change chat visibility.');
    }
  };

  return { visibilityType, setVisibilityType };
}
