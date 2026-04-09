export type TransactionType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  date: string;
  paymentMethod?: 'dinheiro' | 'pix' | 'credito' | 'debito' | 'cheque' | 'cortesia' | null;
  note?: string | null;
  goalId?: string | null;
  cardId?: string | null;
  installments?: number | null;
}

export interface CreditCard {
  id: string;
  name: string;
  closingDay: number;
  dueDay: number;
  userId: string;
}

export interface CreditCardInstallment {
  id: string;
  cardId: string;
  transactionId: string;
  amount: number;
  installmentNumber: number;
  totalInstallments: number;
  dueDate: string;
  userId: string;
  title: string;
  categoryId: string;
}

export interface FinancialGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetMonths: number;
  monthlyContribution: number;
  startDate: string;
  deadline: string;
  indexId?: string | null;
  indexPercentage?: number | null;
  userId: string;
}

export type PropertyType = 'terreno' | 'apartamento' | 'casa' | 'sala comercial';

export interface Property {
  id: string;
  name: string;
  address: string;
  type: PropertyType;
  value: number;
  status: 'rented' | 'vacant' | 'maintenance';
  rentalValue?: number;
  tenantName?: string;
  correctionIndex?: string;
  rentDueDate?: number;
  leaseStart?: string;
  leaseEnd?: string;
}

export interface RentalInstallment {
  id: string;
  propertyId: string;
  dueDate: string;
  amount: number;
  status: 'paid' | 'pending' | 'upcoming';
  paymentDate?: string;
  userId: string;
}

export interface PropertyExpense {
  id: string;
  propertyId: string;
  title: string;
  amount: number;
  date: string;
  category: 'repair' | 'tax' | 'utility' | 'other';
  userId: string;
}

export interface MarketIndex {
  id: string;
  name: string;
  value: number; // annual percentage
  description: string;
  userId: string;
}

export const MARKET_INDICES: MarketIndex[] = [
  { id: 'selic', name: 'Selic', value: 10.75, description: 'Taxa básica de juros da economia', userId: 'system' },
  { id: 'ipca', name: 'IPCA', value: 4.50, description: 'Índice de inflação oficial', userId: 'system' },
  { id: 'igpm', name: 'IGP-M', value: 3.20, description: 'Índice geral de preços (aluguéis)', userId: 'system' },
  { id: 'cdi', name: 'CDI', value: 10.65, description: 'Certificado de Depósito Interbancário', userId: 'system' },
  { id: 'poupanca', name: 'Poupança', value: 6.17, description: 'Rendimento da caderneta de poupança', userId: 'system' },
  { id: 'tesouro', name: 'Tesouro Direto', value: 11.25, description: 'Rendimento médio do Tesouro Selic', userId: 'system' },
];

export const CATEGORIES: Category[] = [
  { id: 'housing', name: 'Moradia', icon: 'Home', color: '#4F46E5' },
  { id: 'food', name: 'Alimentação', icon: 'Utensils', color: '#10B981' },
  { id: 'transport', name: 'Transporte', icon: 'Car', color: '#F59E0B' },
  { id: 'health', name: 'Saúde', icon: 'HeartPulse', color: '#EF4444' },
  { id: 'leisure', name: 'Lazer', icon: 'Palmtree', color: '#8B5CF6' },
  { id: 'utilities', name: 'Contas Fixas', icon: 'Zap', color: '#3B82F6' },
  { id: 'other', name: 'Outros', icon: 'MoreHorizontal', color: '#6B7280' },
  { id: 'salary', name: 'Renda/Salário', icon: 'Wallet', color: '#059669' },
];
