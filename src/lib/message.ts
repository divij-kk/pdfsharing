import type { Product } from '../types';

export function buildWhatsAppMessage(selected: Product[]): string {
  const byType: Record<string, Product[]> = {};
  selected.forEach((p) => {
    if (!byType[p.type]) byType[p.type] = [];
    byType[p.type].push(p);
  });

  const lines: string[] = [];
  Object.keys(byType).forEach((type, idx) => {
    if (idx > 0) lines.push('');
    lines.push(`*${type}*`);
    lines.push(''); // blank line after the type header
    byType[type].forEach((p) => {
      let line = `• ${p.name}`;
      if (p.pdfUrl) line += ` — ${p.pdfUrl}`;
      lines.push(line);
    });
  });

  return lines.join('\n');
}
