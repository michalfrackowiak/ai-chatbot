import 'server-only';
import { z } from 'zod';
import { client } from './db/queries';

const fields = z.object({
  kind: z.enum(['income', 'expense']),
  description: z.string().trim().min(1).max(180),
  amount: z.number().positive().max(99999999).multipleOf(0.01),
  date: z.string().date(),
});
export const change = z.discriminatedUnion('action', [
  fields.extend({ action: z.literal('add') }),
  fields.extend({ action: z.literal('edit'), id: z.string().uuid() }),
  z.object({ action: z.literal('delete'), id: z.string().uuid() }),
  z.object({ action: z.literal('list') }),
]);
export function entries(owner: string) {
  return client`select id, kind, description, cents::text, booked::text as date from ledger where owner=${owner} order by booked desc,id`;
}
export async function manage(owner: string, input: z.infer<typeof change>) {
  if (input.action === 'list') return entries(owner);
  if (input.action === 'delete')
    return client`delete from ledger where owner=${owner} and id=${input.id} returning id`;
  const cents = Math.round(input.amount * 100);
  if (input.action === 'edit')
    return client`update ledger set kind=${input.kind},description=${input.description},cents=${cents},booked=${input.date} where owner=${owner} and id=${input.id} returning id`;
  return client`insert into ledger(owner,kind,description,cents,booked) values (${owner},${input.kind},${input.description},${cents},${input.date}) returning id`;
}
export async function seed(owner: string) {
  await client`insert into ledger(owner,kind,description,cents,booked,sample) select ${owner},kind,description,cents,current_date,description from (values ('income','Sample freelance invoice',125000),('expense','Sample groceries',6845),('expense','Sample train ticket',1800)) s(kind,description,cents) on conflict(owner,sample) do nothing`;
}
