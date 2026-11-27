import { auth } from '@/app/(auth)/auth';
import { getTransactions } from '@/lib/db/finance-queries';
import { ChatSDKError } from '@/lib/errors';
import { buildReportHtml, buildReportPdf } from '@/lib/reports/generate';

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:api').toResponse();
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') ?? 'html';

  if (format !== 'html' && format !== 'pdf') {
    return new ChatSDKError(
      'bad_request:api',
      'format must be html or pdf',
    ).toResponse();
  }

  const transactions = await getTransactions({ userId: session.user.id });
  const date = new Date().toISOString().slice(0, 10);
  const filename = `finance-report-${date}.${format}`;

  if (format === 'html') {
    return new Response(buildReportHtml({ transactions }), {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  return new Response(buildReportPdf({ transactions }), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
