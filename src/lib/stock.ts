import type { Product } from '../types';

export const LOW_STOCK_THRESHOLD = 10;

export type StockStatus = 'in' | 'low' | 'out';

export function stockStatusFor(p: Product): StockStatus {
  if (p.ready <= 0) return 'out';
  if (p.ready < LOW_STOCK_THRESHOLD) return 'low';
  return 'in';
}

export function stockLabel(status: StockStatus): string {
  switch (status) {
    case 'in':
      return 'In stock';
    case 'low':
      return 'Low stock';
    case 'out':
      return 'Out of stock';
  }
}
