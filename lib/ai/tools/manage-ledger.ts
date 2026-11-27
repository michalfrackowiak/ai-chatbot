import { tool, type DataStreamWriter } from 'ai';
import { z } from 'zod';
import { applyLedgerCommand, protectLedgerChat } from '@/lib/db/ledger';
import { amountValue, entryFields, ledgerCommand } from '@/lib/finance';

export function manageLedger(
  userId: string,
  chatId: string,
  dataStream: DataStreamWriter,
) {
  return tool({
    description:
      'List or manage the signed-in user’s income and expenses. Writes require an explicit user request. List first to find the exact ID for edits and deletes. Ask for missing details or ambiguous matches. Sample loads example entries. Use a local calendar date if the user supplies one. Use report to get an HTML download or printable PDF link.',
    parameters: z.object({
      action: z.enum(['list', 'add', 'update', 'delete', 'sample', 'report']),
      id: z.string().uuid().optional(),
      entry: entryFields.optional(),
      format: z.enum(['html', 'pdf']).optional(),
    }),
    execute: async (input) => {
      if (input.action === 'report') {
        return { url: `/api/ledger/report?format=${input.format ?? 'html'}` };
      }
      const command = ledgerCommand.safeParse(input);
      if (!command.success) {
        return {
          error: command.error.issues.map(({ message }) => message).join(', '),
        };
      }
      if (!(await protectLedgerChat(userId, chatId))) {
        return { error: 'Start a private chat to manage your ledger.' };
      }
      const result = await applyLedgerCommand(userId, command.data);
      if (command.data.action !== 'list' && !('error' in result)) {
        dataStream.writeData({ type: 'ledger-changed', content: '' });
      }
      if ('entries' in result && result.entries) {
        return {
          entries: result.entries.map(
            ({ userId: _owner, amountMinor, ...entry }) => ({
              ...entry,
              amount: amountValue(amountMinor, entry.currency),
            }),
          ),
        };
      }
      if ('entry' in result && result.entry) {
        const { userId: _owner, amountMinor, ...entry } = result.entry;
        return {
          entry: { ...entry, amount: amountValue(amountMinor, entry.currency) },
        };
      }
      return result;
    },
  });
}
