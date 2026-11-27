import { z } from 'zod';

import { auth } from '@/app/(auth)/auth';
import { listTransactions } from '@/lib/db/transactions';
import { ChatSDKError } from '@/lib/errors';
import { renderReportHtml } from '@/lib/reports/html';
import { renderReportPdf } from '@/lib/reports/pdf';
import { buildReportData } from '@/lib/reports/report-data';

const querySchema = z.object({
  format: z.enum(['html', 'pdf']).default('html'),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:transaction').toResponse();
    }

    const parsed = querySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    );

    if (!parsed.success) {
      return new ChatSDKError('bad_request:report').toResponse();
    }

    const now = new Date();
    const from = parsed.data.from
      ? new Date(`${parsed.data.from}T00:00:00.000Z`)
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const to = parsed.data.to
      ? new Date(`${parsed.data.to}T23:59:59.999Z`)
      : now;

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return new ChatSDKError('bad_request:report').toResponse();
    }

    const transactions = await listTransactions({
      userId: session.user.id,
      limit: 5000,
      from,
      to,
    });
    const report = buildReportData({ transactions, from, to, now });
    const filename = `income-expenses-${report.from}-to-${report.to}`;

    if (parsed.data.format === 'pdf') {
      const pdf = await renderReportPdf(report);

      return new Response(new Uint8Array(pdf), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}.pdf"`,
        },
      });
    }

    return new Response(renderReportHtml(report), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="${filename}.html"`,
      },
    });
  } catch (error) {
    if (error instanceof ChatSDKError) return error.toResponse();
    return new ChatSDKError('bad_request:report').toResponse();
  }
}
