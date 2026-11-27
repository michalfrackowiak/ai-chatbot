'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/app/(auth)/auth';
import { isUsageAdmin } from '@/lib/ai/usage-admin';
import { updateUsageSettings } from '@/lib/db/ai-usage';

export async function setLimits(form: FormData) {
  const session = await auth();
  if (!isUsageAdmin(session?.user)) throw new Error('Forbidden');

  const calls = form.get('calls');
  const budget = form.get('budget');
  if (
    typeof calls !== 'string' ||
    typeof budget !== 'string' ||
    !/^\d{0,9}$/.test(calls) ||
    !/^(?:\d{1,9}(?:\.\d{1,2})?)?$/.test(budget)
  ) {
    throw new Error('Invalid monthly limit');
  }
  await updateUsageSettings(
    calls === '' ? null : Number(calls),
    budget === '' ? null : Math.round(Number(budget) * 1_000_000),
  );
  revalidatePath('/admin/usage');
}
