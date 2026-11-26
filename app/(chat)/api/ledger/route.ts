import { auth } from '@/app/(auth)/auth';
import { applyLedgerCommand, listEntries } from '@/lib/db/ledger';
import { ledgerCommand } from '@/lib/finance';

export async function GET() {
  const session = await auth();
  if (!session?.user) return new Response(null, { status: 401 });
  return Response.json(await listEntries(session.user.id), {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return new Response(null, { status: 401 });
  const mediaType = request.headers.get('Content-Type')?.split(';', 1)[0];
  if (mediaType?.trim().toLowerCase() !== 'application/json') {
    return Response.json({ error: 'Expected a JSON request' }, { status: 415 });
  }
  const command = ledgerCommand.safeParse(
    await request.json().catch(() => null),
  );
  if (!command.success)
    return Response.json({ error: 'Invalid ledger entry' }, { status: 400 });
  const result = await applyLedgerCommand(session.user.id, command.data);
  return Response.json(result, { status: 'error' in result ? 404 : 200 });
}
