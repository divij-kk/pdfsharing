export type Role = 'pending' | 'customer' | 'sales' | 'counter' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  role: Role;
  createdAt: number;
  // Customer intake fields (collected once, on first catalog visit).
  name?: string;
  mobile?: string;
  location?: string;
}

export interface Product {
  sku: string; // Firestore doc id
  type: string;
  name: string;
  actual: number;
  booked: number;
  ready: number;
  pdfUrl: string; // Firebase Storage download URL, '' if none
}

// One row per PDF opened in the customer catalog — lets staff see who's
// been looking at what, for follow-up.
export interface PdfViewLog {
  id: string; // Firestore doc id
  uid: string;
  name: string;
  mobile: string;
  email: string;
  location: string;
  productSku: string;
  productName: string;
  productType: string;
  viewedAt: number | null; // epoch ms, null for an instant until the server timestamp lands
}
