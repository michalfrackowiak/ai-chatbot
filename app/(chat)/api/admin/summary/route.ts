import { auth } from '@/app/(auth)/auth';
import { isAdminEmail } from '@/lib/admin';
import { getAdminSummary } from '@/lib/db/usage';
import { ChatSDKError } from '@/lib/errors';

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:auth').toResponse();
  }

  if (!isAdminEmail(session.user.email)) {
    return new ChatSDKError('forbidden:admin').toResponse();
  }

  try {
    return Response.json(await getAdminSummary());
  } catch (error) {
    if (error instanceof ChatSDKError) return error.toResponse();
    return new ChatSDKError('bad_request:admin').toResponse();
  }
}
