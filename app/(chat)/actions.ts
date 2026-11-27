'use server';

import { generateText, type UIMessage } from 'ai';
import { cookies } from 'next/headers';
import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
  updateChatVisiblityById,
} from '@/lib/db/queries';
import type { VisibilityType } from '@/components/visibility-selector';
import { myProvider } from '@/lib/ai/providers';
import { z } from 'zod';

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set('chat-model', model);
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: UIMessage;
}) {
  const { text: title } = await generateText({
    model: myProvider.languageModel('title-model'),
    system: `\n
    - you will generate a short title based on the first message a user begins a conversation with
    - ensure it is not more than 80 characters long
    - the title should be a summary of the user's message
    - do not use quotes or colons`,
    prompt: JSON.stringify(message),
  });

  return title;
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const [message] = await getMessageById({ id });

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  await updateChatVisiblityById({ chatId, visibility });
}

export async function parseAndCreateIncomeFromMessage({ messageText }: { messageText: string }) {
  'use server';
  
  // Parse patterns like "add income $100 for salary" or "I earned $100 as salary"
  const incomePattern = /(?:add |earned|received|made)\s+income\s+\$?([\d,.]+)\s+(?:for|as)\s+(.+)/i;
  const match = messageText.match(incomePattern);
  
  if (!match) {
    return { success: false, error: 'Could not parse income from message' };
  }
  
  const amount = match[1].replace(/,/g, '');
  const description = match[2].trim();
  
  try {
    // TODO: Get actual userId from auth session
    const result = await import('@/lib/db/queries').then((mod) => mod.createIncome({
      amount,
      description,
      userId: 'current-user',
    }));
    
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to create income' };
  }
}

export async function parseAndCreateExpenseFromMessage({ messageText }: { messageText: string }) {
  'use server';
  
  // Parse patterns like "add expense $50 for coffee" or "I spent $50 on coffee"
  const expensePattern = /(?:add |spent|paid)\s+expense\s+\$?([\d,.]+)\s+(?:for|on)\s+(.+)/i;
  const match = messageText.match(expensePattern);
  
  if (!match) {
    return { success: false, error: 'Could not parse expense from message' };
  }
  
  const amount = match[1].replace(/,/g, '');
  const description = match[2].trim();
  
  try {
    // TODO: Get actual userId from auth session
    const result = await import('@/lib/db/queries').then((mod) => mod.createExpense({
      amount,
      description,
      userId: 'current-user',
    }));
    
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to create expense' };
  }
}
