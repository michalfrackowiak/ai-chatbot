import { auth } from '@/app/(auth)/auth';
import {
  getAdminUsers,
  setUsageLimit,
} from '@/lib/db/finance-queries';
import { ChatSDKError } from '@/lib/errors';
import { usageLimitSchema } from '@/lib/finance/validation';

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:auth').toResponse();
  }

  if (session.user.type !== 'admin') {
    return new ChatSDKError('forbidden:auth').toResponse();
  }

  return Response.json({ users: await getAdminUsers() }, { status: 200 });
}

export async function PUT(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:auth').toResponse();
  }

  if (session.user.type !== 'admin') {
    return new ChatSDKError('forbidden:auth').toResponse();
  }

  const parsed = usageLimitSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return new ChatSDKError('bad_request:api', 'Invalid usage limit').toResponse();
  }

  await setUsageLimit(parsed.data);

  return Response.json({ ok: true }, { status: 200 });
}
