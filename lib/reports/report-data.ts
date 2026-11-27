import type { Transaction } from '@/lib/db/schema';

export interface ReportRow {
  date: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amountCents: number;
}

export interface ReportCategory {
  name: string;
  incomeCents: number;
  expenseCents: number;
}

export interface ReportData {
  from: string;
  to: string;
  generatedAt: string;
  incomeCents: number;
  expenseCents: number;
  netCents: number;
  categories: Array<ReportCategory>;
  rows: Array<ReportRow>;
}

type ReportTransaction = Pick<
  Transaction,
  'type' | 'amount' | 'category' | 'description' | 'occurredAt'
>;

export function buildReportData({
  transactions,
  from,
  to,
  now = new Date(),
}: {
  transactions: Array<ReportTransaction>;
  from: Date;
  to: Date;
  now?: Date;
}): ReportData {
  const inRange = transactions
    .filter((item) => {
      const date = new Date(item.occurredAt);
      return date >= from && date <= to;
    })
    .sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    );

  const rows = inRange.map((item) => ({
    date: new Date(item.occurredAt).toISOString().slice(0, 10),
    type: item.type,
    category: item.category,
    description: item.description,
    amountCents: item.amount,
  }));

  const incomeCents = rows
    .filter((row) => row.type === 'income')
    .reduce((total, row) => total + row.amountCents, 0);
  const expenseCents = rows
    .filter((row) => row.type === 'expense')
    .reduce((total, row) => total + row.amountCents, 0);

  const categoryMap = new Map<string, ReportCategory>();
  for (const row of rows) {
    const category = categoryMap.get(row.category) ?? {
      name: row.category,
      incomeCents: 0,
      expenseCents: 0,
    };

    if (row.type === 'income') category.incomeCents += row.amountCents;
    else category.expenseCents += row.amountCents;

    categoryMap.set(row.category, category);
  }

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    generatedAt: now.toISOString(),
    incomeCents,
    expenseCents,
    netCents: incomeCents - expenseCents,
    categories: [...categoryMap.values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
    rows,
  };
}
