export type Role = 'pending' | 'customer' | 'sales' | 'counter' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  role: Role;
  createdAt: number;
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
