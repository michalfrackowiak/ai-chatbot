import 'server-only';
import type { LanguageModelV1Middleware } from 'ai';
import { client } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';

export function isAdmin(id?: string) {
  return Boolean(
    id &&
      process.env.FINANCE_ADMIN_IDS?.split(',')
        .map((s) => s.trim())
        .includes(id),
  );
}
export async function reserveCall(model: string) {
  return client.begin(async (tx) => {
    const [policy] =
      await tx`select daily_limit from ai_policy where id=1 for update`;
    if (policy.daily_limit !== null) {
      const [usage] =
        await tx`select count(*)::int as used from ai_call where started >= ((now() at time zone 'UTC')::date at time zone 'UTC')`;
      if (usage.used >= policy.daily_limit)
        throw new ChatSDKError(
          'rate_limit:chat',
          'Daily model call limit reached',
        );
    }
    const [row] =
      await tx`insert into ai_call(model) values(${model}) returning id`;
    return String(row.id);
  });
}
export function recordImage(id: string) {
  return client`update ai_call set usd=0.07 where id=${id}`;
}
async function record(
  id: string,
  usage: { promptTokens: number; completionTokens: number },
) {
  if (
    !Number.isFinite(usage.promptTokens) ||
    !Number.isFinite(usage.completionTokens)
  )
    return;
  const usd = (usage.promptTokens * 1.25 + usage.completionTokens * 2.5) / 1e6;
  await client`update ai_call set input=${usage.promptTokens},output=${usage.completionTokens},usd=${usd} where id=${id}`;
}
export const meter: LanguageModelV1Middleware = {
  async wrapGenerate({ model, doGenerate }) {
    const id = await reserveCall(model.modelId);
    const result = await doGenerate();
    await record(id, result.usage);
    return result;
  },
  async wrapStream({ model, doStream }) {
    const id = await reserveCall(model.modelId);
    const result = await doStream();
    return {
      ...result,
      stream: result.stream.pipeThrough(
        new TransformStream({
          async transform(part, controller) {
            if (part.type === 'finish') await record(id, part.usage);
            controller.enqueue(part);
          },
        }),
      ),
    };
  },
};
