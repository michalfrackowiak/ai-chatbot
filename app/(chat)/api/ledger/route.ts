import { auth } from '@/app/(auth)/auth';
import { entries, change, manage, seed } from '@/lib/finance';
export async function GET() {
  const user = (await auth())?.user;
  if (!user) return new Response(null, { status: 401 });
  return Response.json(await entries(user.id), {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
export async function POST(req: Request) {
  const user = (await auth())?.user;
  if (!user) return new Response(null, { status: 401 });
  if (req.headers.get('content-type') !== 'application/json')
    return new Response(null, { status: 415 });
  const body = await req.json().catch(() => null);
  if (body?.action === 'sample') await seed(user.id);
  else {
    const parsed = change.safeParse(body);
    if (!parsed.success)
      return new Response('Invalid transaction', { status: 400 });
    await manage(user.id, parsed.data);
  }
  return new Response(null, { status: 204 });
}
