export interface Member {
  id: string;
  name: string;
  email: string;
  age: number;
  role: 'child' | 'parent';
  avatar: string;
  pointsBalance: number;
  pointsEarnedTotal: number;
  pointsSpentTotal: number;
  level: number;
  badge: string;
  weeklyConsistency: number; // percentage, e.g. 92
  streakDays: number;
  pin: string; // Senha/PIN de acesso à conta
}

export type RoutineCategory = 'Organização' | 'Estudos' | 'Higiene' | 'Convivência' | 'Saúde';

export interface DayOfWeekOption {
  id: number;
  short: string;
  label: string;
}

export const DAYS_OF_WEEK: DayOfWeekOption[] = [
  { id: 0, short: 'Dom', label: 'Domingo' },
  { id: 1, short: 'Seg', label: 'Segunda' },
  { id: 2, short: 'Ter', label: 'Terça' },
  { id: 3, short: 'Qua', label: 'Quarta' },
  { id: 4, short: 'Qui', label: 'Quinta' },
  { id: 5, short: 'Sex', label: 'Sexta' },
  { id: 6, short: 'Sáb', label: 'Sábado' },
];

export interface RoutineTask {
  id: string;
  regCode: string;
  taskCode: string;
  title: string;
  category: RoutineCategory;
  assigneeId: string; // member id
  basePoints: number;
  finalPoints: number;
  status: 'pending' | 'approved' | 'rejected';
  delayMinutes?: number;
  isDelayed?: boolean;
  withinTolerance?: boolean;
  deadline?: string;
  daysOfWeek?: number[]; // [0, 1, 2, 3, 4, 5, 6] (0 = Dom, 1 = Seg, ..., 6 = Sáb)
  completedDates?: string[]; // Datas em YYYY-MM-DD quando a tarefa foi realizada
  lastCompletedDate?: string; // Última data em YYYY-MM-DD
  executedAt?: string;
  durationMinutes?: number;
  expectedDurationMinutes?: number;
  acceptanceCriteria: string;
  feedback?: string;
  penaltyApplied?: boolean;
  penaltyPoints?: number;
  photoRequested?: boolean;
  hasPhotoEvidence?: boolean;
  photoEvidenceUrl?: string;
  date?: string;
}

export interface RewardItem {
  id: string;
  title: string;
  cost: number;
  targetChildId: string;
  icon: string;
  category: 'Experiência' | 'Lazer' | 'Item Físico' | 'Guloseima';
  status: 'available' | 'pending_delivery' | 'delivered';
  requestedBy?: string;
  requestedAt?: string;
  deliveredAt?: string;
  deliveredBy?: string;
  description?: string;
}

export interface Transaction {
  id: string;
  date: string;
  time: string;
  memberId: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  category: string;
  balanceAfter: number;
}

export interface Appointment {
  id: string;
  title: string;
  date: string;
  time: string;
  participants: string[]; // member ids
  status: 'pending' | 'completed';
  notes?: string;
  createdBy: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  targetUserId: string | 'all';
}

export interface FamilySettings {
  familyName: string;
  pinCode: string;
  defaultPenaltyPoints: number;
  delayToleranceMinutes: number;
  requirePinForHighValue: boolean;
  highValueThreshold: number;
  notificationsEnabled: boolean;
  currencyName: string;
  themeColor: string;
  menuLabels: Record<string, string>;
}

export type ActiveTab = 
  | 'dashboard-aprovacoes'
  | 'catalogo-de-atividades'
  | 'carteira-extrato'
  | 'loja-de-incentivos'
  | 'compromissos'
  | 'membros-da-familia'
  | 'configuracoes';
