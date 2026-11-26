import { auth } from '@/app/(auth)/auth';
import { getAdminAiUsage, setAdminAiLimit } from '@/lib/db/queries';
import { isAdminEmail } from '@/lib/ai/costs';
import { ChatSDKError } from '@/lib/errors';
import { z } from 'zod';

const limitSchema = z.object({
  userId: z.string().uuid(),
  adminLimitUsd: z.number().min(0).max(10000).nullable(),
});

async function getAdminSession() {
  const session = await auth();
  if (!session?.user) {
    return {
      session: undefined,
      response: new ChatSDKError('unauthorized:chat').toResponse(),
    };
  }

  if (!isAdminEmail(session.user.email)) {
    return {
      session: undefined,
      response: new ChatSDKError('forbidden:chat').toResponse(),
    };
  }

  return { session, response: undefined };
}

export async function GET() {
  const { session, response } = await getAdminSession();
  if (response) return response;
  if (!session) return new ChatSDKError('unauthorized:chat').toResponse();

  return Response.json(await getAdminAiUsage());
}

export async function PUT(request: Request) {
  const { session, response } = await getAdminSession();
  if (response) return response;
  if (!session) return new ChatSDKError('unauthorized:chat').toResponse();

  const parsed = limitSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      {
        error:
          'Enter a monthly admin cap from $0 to $10,000, or leave it blank to remove the cap.',
      },
      { status: 400 },
    );
  }

  const settings = await setAdminAiLimit(parsed.data);
  return Response.json({
    userId: settings.userId,
    adminLimitUsd:
      settings.adminLimitUsd === null ? null : Number(settings.adminLimitUsd),
  });
}
