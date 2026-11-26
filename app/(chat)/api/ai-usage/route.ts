import { z } from 'zod';
import { auth } from '@/app/(auth)/auth';
import {
  getMonthlyAiSpend,
  getUserAiSettings,
  setUserAiLimit,
} from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';
import { getEffectiveAiLimit } from '@/lib/ai/costs';

const limitSchema = z.object({
  monthlyLimitUsd: z.number().min(0).max(10000),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const [settings, monthToDateUsd] = await Promise.all([
    getUserAiSettings({ userId: session.user.id }),
    getMonthlyAiSpend({ userId: session.user.id }),
  ]);

  return Response.json({
    monthlyLimitUsd: getEffectiveAiLimit(
      Number(settings.monthlyLimitUsd),
      settings.adminLimitUsd === null ? null : Number(settings.adminLimitUsd),
    ),
    personalLimitUsd: Number(settings.monthlyLimitUsd),
    adminLimitUsd:
      settings.adminLimitUsd === null ? null : Number(settings.adminLimitUsd),
    monthToDateUsd,
  });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const parsed = limitSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: 'Monthly limit must be between $0 and $10,000.' },
      { status: 400 },
    );
  }

  const settings = await setUserAiLimit({
    userId: session.user.id,
    monthlyLimitUsd: parsed.data.monthlyLimitUsd,
  });

  return Response.json({
    monthlyLimitUsd: Number(settings.monthlyLimitUsd),
  });
}
