import { auth } from '@/app/(auth)/auth';
import { listEntries } from '@/lib/db/ledger';
import { ledgerReport } from '@/lib/ledger-report';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return new Response(null, { status: 401 });
  const format = new URL(request.url).searchParams.get('format');
  if (format !== 'html' && format !== 'pdf')
    return new Response(null, { status: 400 });
  return new Response(
    ledgerReport(await listEntries(session.user.id), format === 'pdf'),
    {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, no-store',
        'Content-Security-Policy':
          "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
        ...(format === 'html' && {
          'Content-Disposition': 'attachment; filename="ledger-report.html"',
        }),
      },
    },
  );
}
