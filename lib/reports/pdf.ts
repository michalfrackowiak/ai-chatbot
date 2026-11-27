import PDFDocument from 'pdfkit';

import { formatMoney } from '@/lib/transactions/money';
import type { ReportData } from './report-data';

const COLUMN_WIDTHS = [70, 60, 110, 175, 80];

function ensureSpace(doc: PDFKit.PDFDocument, needed: number): void {
  if (doc.y + needed > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }
}

function drawTableHeader(
  doc: PDFKit.PDFDocument,
  headings: Array<string>,
): void {
  const startX = doc.page.margins.left;

  doc.rect(startX, doc.y, COLUMN_WIDTHS.reduce((a, b) => a + b, 0), 20)
    .fill('#f4f4f5');
  doc.fillColor('#18181b').fontSize(9).font('Helvetica-Bold');

  let x = startX + 4;
  headings.forEach((heading, index) => {
    doc.text(heading, x, doc.y - 15, { width: COLUMN_WIDTHS[index] - 8 });
    x += COLUMN_WIDTHS[index];
  });

  doc.moveDown(0.2).font('Helvetica');
}

export function renderReportPdf(report: ReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 45 });
    const chunks: Array<Buffer> = [];

    doc.on('data', (chunk) => chunks.push(chunk as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('Income and expenses report');
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#71717a')
      .text(`${report.from} to ${report.to} · generated ${report.generatedAt}`)
      .moveDown(0.5);

    doc.fillColor('#18181b').font('Helvetica-Bold').fontSize(12);
    doc.text(
      `Income: ${formatMoney(report.incomeCents)}    Expenses: ${formatMoney(report.expenseCents)}    Net: ${formatMoney(report.netCents)}`,
    );
    doc.moveDown(1).fontSize(11).text('By category');
    doc.moveDown(0.3);

    drawTableHeader(doc, [
      'Category',
      'Income',
      'Expenses',
      'Net',
      '',
    ]);

    if (report.categories.length === 0) {
      doc.fontSize(9).text('No transactions in this period.');
    }

    for (const category of report.categories) {
      ensureSpace(doc, 18);
      const y = doc.y;
      const startX = doc.page.margins.left;
      const values = [
        category.name,
        formatMoney(category.incomeCents),
        formatMoney(category.expenseCents),
        formatMoney(category.incomeCents - category.expenseCents),
        '',
      ];

      let x = startX + 4;
      values.forEach((value, index) => {
        doc.text(value, x, y, {
          width: COLUMN_WIDTHS[index] - 8,
          align: index === 0 ? 'left' : 'right',
          ellipsis: true,
          height: 14,
        });
        x += COLUMN_WIDTHS[index];
      });
      doc.y = y + 16;
      doc.moveTo(startX, doc.y).lineTo(startX + 495, doc.y).strokeColor('#e4e4e7').stroke();
      doc.y += 3;
    }

    doc.moveDown(1).font('Helvetica-Bold').fontSize(11).text('Transactions');
    doc.moveDown(0.3).font('Helvetica');

    drawTableHeader(doc, [
      'Date',
      'Type',
      'Category',
      'Description',
      'Amount',
    ]);

    if (report.rows.length === 0) {
      doc.fontSize(9).text('No transactions in this period.');
    }

    for (const row of report.rows) {
      ensureSpace(doc, 20);
      const y = doc.y;
      const startX = doc.page.margins.left;
      const values = [
        row.date,
        row.type,
        row.category,
        row.description,
        formatMoney(row.amountCents),
      ];

      let x = startX + 4;
      values.forEach((value, index) => {
        doc.text(value, x, y, {
          width: COLUMN_WIDTHS[index] - 8,
          align: index === 3 ? 'left' : 'right',
          ellipsis: true,
          height: 14,
        });
        x += COLUMN_WIDTHS[index];
      });
      doc.y = y + 16;
      doc.moveTo(startX, doc.y).lineTo(startX + 495, doc.y).strokeColor('#e4e4e7').stroke();
      doc.y += 3;
    }

    doc.end();
  });
}
