import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Member,
  RoutineTask,
  RewardItem,
  Transaction,
  FamilySettings,
  Appointment,
  AppNotification
} from '../types';
import { hashPin } from './crypto';

// Read credentials strictly from import.meta.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    supabaseAnonKey.length > 20
  );
};

// Family identifier management for multi-tenant isolation
const FAMILY_ID_KEY = 'familyflow_supabase_family_id';
const DEFAULT_FAMILY_ID = 'a0000000-0000-0000-0000-000000000001';

/**
 * Generates a stable UUID v4
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Deduplicates members by ID and normalized email to guarantee data integrity
 */
export function deduplicateMembers(rawMembers: Member[]): Member[] {
  const seenIds = new Set<string>();
  const seenEmails = new Set<string>();
  const result: Member[] = [];

  for (const m of rawMembers) {
    if (!m || !m.id) continue;
    if (seenIds.has(m.id)) continue;

    const emailNorm = (m.email || '').trim().toLowerCase();
    if (emailNorm && emailNorm !== 'sem e-mail' && seenEmails.has(emailNorm)) {
      // Avoid duplicate profiles with the exact same email in the same family
      continue;
    }

    seenIds.add(m.id);
    if (emailNorm && emailNorm !== 'sem e-mail') {
      seenEmails.add(emailNorm);
    }
    result.push(m);
  }

  return result;
}

export const getStoredFamilyId = (): string => {
  let id = localStorage.getItem(FAMILY_ID_KEY);
  if (!id) {
    id = DEFAULT_FAMILY_ID;
    localStorage.setItem(FAMILY_ID_KEY, id);
  }
  return id;
};

export const setStoredFamilyId = (id: string): void => {
  localStorage.setItem(FAMILY_ID_KEY, id);
};

// Global Supabase client instance
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      global: {
        headers: {
          'x-family-id': getStoredFamilyId(),
        },
      },
    })
  : null;

/**
 * Ensures the family row exists in the Supabase `families` table
 */
export async function ensureFamilyExists(familyId: string, familyName: string = 'Rotinas da Família'): Promise<void> {
  if (!supabase) return;

  try {
    const { data: existing, error: selectErr } = await supabase
      .from('families')
      .select('id')
      .eq('id', familyId)
      .maybeSingle();

    if (selectErr) {
      console.warn('Aviso ao consultar família no Supabase:', selectErr);
      return;
    }

    if (!existing) {
      const { error } = await supabase.from('families').insert({
        id: familyId,
        name: familyName,
      });
      if (error && error.code !== '23505') { // Ignore duplicate key
        console.warn('Erro ao criar família no Supabase:', error);
      }
    }
  } catch (err) {
    console.warn('Erro ao verificar/criar família no Supabase:', err);
  }
}

export interface FullFamilyData {
  familyId: string;
  members: Member[];
  tasks: RoutineTask[];
  rewards: RewardItem[];
  transactions: Transaction[];
  settings: FamilySettings;
  appointments: Appointment[];
  notifications: AppNotification[];
}

/**
 * Loads all state for the current family from Supabase (Source of Truth)
 */
export async function loadFamilyDataFromSupabase(familyId: string = getStoredFamilyId()): Promise<FullFamilyData | null> {
  if (!supabase) return null;

  try {
    const safeQuery = async (queryThenable: PromiseLike<any>): Promise<any> => {
      try {
        return await queryThenable;
      } catch (err) {
        console.warn('Erro em consulta individual do Supabase:', err);
        return { data: null, error: err };
      }
    };

    const [
      { data: familyRow, error: famErr },
      { data: settingsRows },
      { data: memberRows },
      { data: taskRows },
      { data: rewardRows },
      { data: txRows },
      { data: apptRows },
      { data: notifRows }
    ] = await Promise.all([
      safeQuery(supabase.from('families').select('*').eq('id', familyId).maybeSingle()),
      safeQuery(supabase.from('family_settings').select('*').eq('family_id', familyId).maybeSingle()),
      safeQuery(supabase.from('members').select('*').eq('family_id', familyId)),
      safeQuery(supabase.from('routine_tasks').select('*').eq('family_id', familyId)),
      safeQuery(supabase.from('reward_items').select('*').eq('family_id', familyId)),
      safeQuery(supabase.from('transactions').select('*').eq('family_id', familyId).order('created_at', { ascending: false })),
      safeQuery(supabase.from('appointments').select('*').eq('family_id', familyId)),
      safeQuery(supabase.from('notifications').select('*').eq('family_id', familyId).order('created_at', { ascending: false })),
    ]);

    if (famErr && famErr.code !== 'PGRST116') {
      console.warn('Aviso ao consultar família no Supabase:', famErr);
    }

    // Map Settings
    const settings: FamilySettings = settingsRows ? {
      familyName: settingsRows.family_name || 'Rotinas da Família',
      pinCode: settingsRows.pin_code_hash || '1234',
      defaultPenaltyPoints: settingsRows.default_penalty_points ?? 10,
      delayToleranceMinutes: settingsRows.delay_tolerance_minutes ?? 15,
      requirePinForHighValue: settingsRows.require_pin_for_high_value ?? true,
      highValueThreshold: settingsRows.high_value_threshold ?? 150,
      notificationsEnabled: settingsRows.notifications_enabled ?? true,
      currencyName: settingsRows.currency_name || 'pts',
      themeColor: settingsRows.theme_color || '#081534',
      menuLabels: settingsRows.menu_labels || {}
    } : {
      familyName: familyRow?.name || 'Rotinas da Família',
      pinCode: '1234',
      defaultPenaltyPoints: 10,
      delayToleranceMinutes: 15,
      requirePinForHighValue: true,
      highValueThreshold: 150,
      notificationsEnabled: true,
      currencyName: 'pts',
      themeColor: '#081534',
      menuLabels: {}
    };

    // Map Members (preserving readable PIN if cached locally)
    let localPinMap: Record<string, string> = {};
    try {
      const savedMembers = localStorage.getItem('familyflow_members');
      if (savedMembers) {
        const parsed = JSON.parse(savedMembers);
        if (Array.isArray(parsed)) {
          parsed.forEach((pm: any) => {
            if (pm.id && pm.pin && !/^[a-f0-9]{64}$/i.test(pm.pin)) {
              localPinMap[pm.id] = pm.pin;
            }
          });
        }
      }
    } catch {}

    const rawMembers: Member[] = (memberRows || []).map((m: any) => {
      let pin = localPinMap[m.id];
      if (!pin) {
        if (m.pin_hash && !/^[a-f0-9]{64}$/i.test(m.pin_hash)) {
          pin = m.pin_hash;
        } else {
          pin = m.pin_hash || (m.role === 'parent' ? '1234' : '1010');
        }
      }
      return {
        id: m.id,
        name: m.name,
        email: m.email || '',
        age: m.age ?? 10,
        role: m.role as 'parent' | 'child',
        avatar: m.avatar || '',
        pointsBalance: m.points_balance ?? 0,
        pointsEarnedTotal: m.points_earned_total ?? 0,
        pointsSpentTotal: m.points_spent_total ?? 0,
        level: m.level ?? 1,
        badge: m.badge || 'Novato',
        weeklyConsistency: m.weekly_consistency ?? 100,
        streakDays: m.streak_days ?? 0,
        pin
      };
    });

    // Deduplicate members by ID and unique Email
    const members: Member[] = deduplicateMembers(rawMembers);

    // Map Tasks
    const tasks: RoutineTask[] = (taskRows || []).map((t: any) => ({
      id: t.id,
      regCode: t.reg_code || '',
      taskCode: t.task_code || '',
      title: t.title,
      category: t.category,
      assigneeId: t.assignee_id,
      basePoints: t.base_points ?? 10,
      finalPoints: t.final_points ?? 10,
      status: t.status,
      delayMinutes: t.delay_minutes ?? 0,
      isDelayed: Boolean(t.is_delayed),
      withinTolerance: t.within_tolerance ?? true,
      deadline: t.deadline || '',
      daysOfWeek: Array.isArray(t.days_of_week) ? t.days_of_week : [],
      completedDates: Array.isArray(t.completed_dates) ? t.completed_dates : [],
      lastCompletedDate: t.last_completed_date || undefined,
      executedAt: t.executed_at || undefined,
      durationMinutes: t.duration_minutes ?? undefined,
      expectedDurationMinutes: t.expected_duration_minutes ?? undefined,
      acceptanceCriteria: t.acceptance_criteria || '',
      feedback: t.feedback || '',
      penaltyApplied: Boolean(t.penalty_applied),
      penaltyPoints: t.penalty_points ?? 0,
      photoRequested: Boolean(t.photoRequested),
      hasPhotoEvidence: Boolean(t.hasPhotoEvidence),
      photoEvidenceUrl: t.photoEvidenceUrl || undefined,
      date: t.date || ''
    }));

    // Map Rewards
    const rewards: RewardItem[] = (rewardRows || []).map((r: any) => ({
      id: r.id,
      title: r.title,
      cost: r.cost ?? 50,
      targetChildId: r.target_child_id || 'all',
      icon: r.icon || 'card_giftcard',
      category: r.category || 'Experiência',
      status: r.status,
      requestedBy: r.requested_by || undefined,
      requestedAt: r.requested_at || undefined,
      deliveredAt: r.delivered_at || undefined,
      deliveredBy: r.delivered_by || undefined,
      description: r.description || ''
    }));

    // Map Transactions
    const transactions: Transaction[] = (txRows || []).map((tx: any) => ({
      id: tx.id,
      date: tx.date,
      time: tx.time,
      memberId: tx.member_id,
      type: tx.type,
      amount: tx.amount,
      description: tx.description,
      category: tx.category || 'Rotina',
      balanceAfter: tx.balance_after ?? 0
    }));

    // Map Appointments
    const appointments: Appointment[] = (apptRows || []).map((a: any) => ({
      id: a.id,
      title: a.title,
      date: a.date,
      time: a.time,
      participants: Array.isArray(a.participants) ? a.participants : [],
      status: a.status,
      notes: a.notes || '',
      createdBy: a.created_by || 'pai'
    }));

    // Map Notifications
    const notifications: AppNotification[] = (notifRows || []).map((n: any) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      isRead: Boolean(n.is_read),
      createdAt: n.created_at || new Date().toISOString(),
      targetUserId: n.target_user_id || 'all'
    }));

    return {
      familyId,
      members,
      tasks,
      rewards,
      transactions,
      settings,
      appointments,
      notifications
    };
  } catch (err) {
    console.error('Erro ao carregar dados do Supabase:', err);
    return null;
  }
}

/**
 * ONE-TIME MIGRATION:
 * Reads data from localStorage, hashes all PINs cryptographically,
 * and writes to Supabase.
 */
export async function migrateLocalStorageToSupabase(
  familyId: string = getStoredFamilyId(),
  localData: {
    members: Member[];
    tasks: RoutineTask[];
    rewards: RewardItem[];
    transactions: Transaction[];
    settings: FamilySettings;
    appointments: Appointment[];
    notifications: AppNotification[];
  }
): Promise<{ success: boolean; message: string }> {
  if (!supabase) {
    return {
      success: false,
      message: 'Supabase não configurado. Verifique VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.',
    };
  }

  try {
    // 1. Ensure family row exists
    await ensureFamilyExists(familyId, localData.settings.familyName);

    // 2. Hash parental settings PIN
    const hashedSettingsPin = await hashPin(localData.settings.pinCode || '1234');

    // 3. Upsert Settings
    await supabase.from('family_settings').upsert({
      family_id: familyId,
      family_name: localData.settings.familyName,
      pin_code_hash: hashedSettingsPin,
      default_penalty_points: localData.settings.defaultPenaltyPoints,
      delay_tolerance_minutes: localData.settings.delayToleranceMinutes,
      require_pin_for_high_value: localData.settings.requirePinForHighValue,
      high_value_threshold: localData.settings.highValueThreshold,
      notifications_enabled: localData.settings.notificationsEnabled,
      currency_name: localData.settings.currencyName,
      theme_color: localData.settings.themeColor,
      menu_labels: localData.settings.menuLabels || {},
      updated_at: new Date().toISOString()
    }, { onConflict: 'family_id' });

    // 4. Upsert Members with Hashed PINs
    const memberRows = await Promise.all(
      localData.members.map(async (m) => {
        const pinHash = await hashPin(m.pin || (m.role === 'parent' ? '1234' : '1010'));
        return {
          id: m.id,
          family_id: familyId,
          name: m.name,
          email: m.email || '',
          age: m.age,
          role: m.role,
          avatar: m.avatar,
          points_balance: m.pointsBalance,
          points_earned_total: m.pointsEarnedTotal,
          points_spent_total: m.pointsSpentTotal,
          level: m.level,
          badge: m.badge,
          weekly_consistency: m.weeklyConsistency,
          streak_days: m.streakDays,
          pin_hash: pinHash,
          updated_at: new Date().toISOString()
        };
      })
    );

    if (memberRows.length > 0) {
      await supabase.from('members').upsert(memberRows, { onConflict: 'family_id,id' });
    }

    // 5. Upsert Tasks
    const taskRows = localData.tasks.map((t) => ({
      id: t.id,
      family_id: familyId,
      reg_code: t.regCode || '',
      task_code: t.taskCode || '',
      title: t.title,
      category: t.category,
      assignee_id: t.assigneeId,
      base_points: t.basePoints,
      final_points: t.finalPoints,
      status: t.status,
      delay_minutes: t.delayMinutes || 0,
      is_delayed: Boolean(t.isDelayed),
      within_tolerance: t.withinTolerance ?? true,
      deadline: t.deadline || '',
      days_of_week: t.daysOfWeek || [],
      completed_dates: t.completedDates || [],
      last_completed_date: t.lastCompletedDate || null,
      executed_at: t.executedAt || null,
      duration_minutes: t.durationMinutes || null,
      expected_duration_minutes: t.expectedDurationMinutes || null,
      acceptance_criteria: t.acceptanceCriteria || '',
      feedback: t.feedback || '',
      penalty_applied: Boolean(t.penaltyApplied),
      penalty_points: t.penaltyPoints || 0,
      photo_requested: Boolean(t.photoRequested),
      has_photo_evidence: Boolean(t.hasPhotoEvidence),
      photo_evidence_url: t.photoEvidenceUrl || null,
      date: t.date || '',
      updated_at: new Date().toISOString()
    }));

    if (taskRows.length > 0) {
      await supabase.from('routine_tasks').upsert(taskRows, { onConflict: 'family_id,id' });
    }

    // 6. Upsert Rewards
    const rewardRows = localData.rewards.map((r) => ({
      id: r.id,
      family_id: familyId,
      title: r.title,
      cost: r.cost,
      target_child_id: r.targetChildId,
      icon: r.icon,
      category: r.category,
      status: r.status,
      requested_by: r.requestedBy || null,
      requested_at: r.requestedAt || null,
      delivered_at: r.deliveredAt || null,
      delivered_by: r.deliveredBy || null,
      description: r.description || '',
      updated_at: new Date().toISOString()
    }));

    if (rewardRows.length > 0) {
      await supabase.from('reward_items').upsert(rewardRows, { onConflict: 'family_id,id' });
    }

    // 7. Upsert Transactions
    const txRows = localData.transactions.map((tx) => ({
      id: tx.id,
      family_id: familyId,
      date: tx.date,
      time: tx.time,
      member_id: tx.memberId,
      type: tx.type,
      amount: tx.amount,
      description: tx.description,
      category: tx.category || 'Rotina',
      balance_after: tx.balanceAfter
    }));

    if (txRows.length > 0) {
      await supabase.from('transactions').upsert(txRows, { onConflict: 'family_id,id' });
    }

    // 8. Upsert Appointments
    const apptRows = localData.appointments.map((a) => ({
      id: a.id,
      family_id: familyId,
      title: a.title,
      date: a.date,
      time: a.time,
      participants: a.participants || [],
      status: a.status,
      notes: a.notes || '',
      created_by: a.createdBy || 'pai',
      updated_at: new Date().toISOString()
    }));

    if (apptRows.length > 0) {
      await supabase.from('appointments').upsert(apptRows, { onConflict: 'family_id,id' });
    }

    // 9. Upsert Notifications
    const notifRows = localData.notifications.map((n) => ({
      id: n.id,
      family_id: familyId,
      title: n.title,
      message: n.message,
      is_read: Boolean(n.isRead),
      target_user_id: n.targetUserId || 'all'
    }));

    if (notifRows.length > 0) {
      await supabase.from('notifications').upsert(notifRows, { onConflict: 'family_id,id' });
    }

    // Mark as migrated in localStorage
    localStorage.setItem('familyflow_migrated_to_supabase', 'true');

    return {
      success: true,
      message: 'Todos os dados locais foram migrados com sucesso para o banco de dados Supabase com senhas protegidas por hash!',
    };
  } catch (err: any) {
    console.error('Falha na migração para o Supabase:', err);
    return {
      success: false,
      message: `Erro na migração: ${err?.message || 'Falha de conexão com o banco'}`,
    };
  }
}

// -------------------------------------------------------------
// Realtime / Mutation helpers to keep Supabase in sync
// -------------------------------------------------------------

export async function syncMemberToSupabase(member: Member, familyId: string = getStoredFamilyId()): Promise<void> {
  if (!supabase) return;
  try {
    const pinHash = await hashPin(member.pin || (member.role === 'parent' ? '1234' : '1010'));
    await supabase.from('members').upsert({
      id: member.id,
      family_id: familyId,
      name: member.name,
      email: member.email,
      age: member.age,
      role: member.role,
      avatar: member.avatar,
      points_balance: member.pointsBalance,
      points_earned_total: member.pointsEarnedTotal,
      points_spent_total: member.pointsSpentTotal,
      level: member.level,
      badge: member.badge,
      weekly_consistency: member.weeklyConsistency,
      streak_days: member.streakDays,
      pin_hash: pinHash,
      updated_at: new Date().toISOString()
    }, { onConflict: 'family_id,id' });
  } catch (err) {
    console.warn('Erro ao sincronizar membro com Supabase:', err);
  }
}

export async function deleteMemberFromSupabase(memberId: string, familyId: string = getStoredFamilyId()): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('members').delete().match({ family_id: familyId, id: memberId });
  } catch (err) {
    console.warn('Erro ao excluir membro no Supabase:', err);
  }
}

export async function syncTaskToSupabase(task: RoutineTask, familyId: string = getStoredFamilyId()): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('routine_tasks').upsert({
      id: task.id,
      family_id: familyId,
      reg_code: task.regCode || '',
      task_code: task.taskCode || '',
      title: task.title,
      category: task.category,
      assignee_id: task.assigneeId,
      base_points: task.basePoints,
      final_points: task.finalPoints,
      status: task.status,
      delay_minutes: task.delayMinutes || 0,
      is_delayed: Boolean(task.isDelayed),
      within_tolerance: task.withinTolerance ?? true,
      deadline: task.deadline || '',
      days_of_week: task.daysOfWeek || [],
      completed_dates: task.completedDates || [],
      last_completed_date: task.lastCompletedDate || null,
      executed_at: task.executedAt || null,
      duration_minutes: task.durationMinutes || null,
      expected_duration_minutes: task.expectedDurationMinutes || null,
      acceptance_criteria: task.acceptanceCriteria || '',
      feedback: task.feedback || '',
      penalty_applied: Boolean(task.penaltyApplied),
      penalty_points: task.penaltyPoints || 0,
      photo_requested: Boolean(task.photoRequested),
      has_photo_evidence: Boolean(task.hasPhotoEvidence),
      photo_evidence_url: task.photoEvidenceUrl || null,
      date: task.date || '',
      updated_at: new Date().toISOString()
    }, { onConflict: 'family_id,id' });
  } catch (err) {
    console.warn('Erro ao sincronizar tarefa com Supabase:', err);
  }
}

export async function deleteTaskFromSupabase(taskId: string, familyId: string = getStoredFamilyId()): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('routine_tasks').delete().match({ family_id: familyId, id: taskId });
  } catch (err) {
    console.warn('Erro ao excluir tarefa no Supabase:', err);
  }
}

export async function syncRewardToSupabase(reward: RewardItem, familyId: string = getStoredFamilyId()): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('reward_items').upsert({
      id: reward.id,
      family_id: familyId,
      title: reward.title,
      cost: reward.cost,
      target_child_id: reward.targetChildId,
      icon: reward.icon,
      category: reward.category,
      status: reward.status,
      requested_by: reward.requestedBy || null,
      requested_at: reward.requestedAt || null,
      delivered_at: reward.deliveredAt || null,
      delivered_by: reward.deliveredBy || null,
      description: reward.description || '',
      updated_at: new Date().toISOString()
    }, { onConflict: 'family_id,id' });
  } catch (err) {
    console.warn('Erro ao sincronizar prêmio com Supabase:', err);
  }
}

export async function deleteRewardFromSupabase(rewardId: string, familyId: string = getStoredFamilyId()): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('reward_items').delete().match({ family_id: familyId, id: rewardId });
  } catch (err) {
    console.warn('Erro ao excluir prêmio no Supabase:', err);
  }
}

export async function syncTransactionToSupabase(tx: Transaction, familyId: string = getStoredFamilyId()): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('transactions').upsert({
      id: tx.id,
      family_id: familyId,
      date: tx.date,
      time: tx.time,
      member_id: tx.memberId,
      type: tx.type,
      amount: tx.amount,
      description: tx.description,
      category: tx.category || 'Rotina',
      balance_after: tx.balanceAfter
    }, { onConflict: 'family_id,id' });
  } catch (err) {
    console.warn('Erro ao sincronizar transação com Supabase:', err);
  }
}

export async function syncAppointmentToSupabase(appt: Appointment, familyId: string = getStoredFamilyId()): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('appointments').upsert({
      id: appt.id,
      family_id: familyId,
      title: appt.title,
      date: appt.date,
      time: appt.time,
      participants: appt.participants || [],
      status: appt.status,
      notes: appt.notes || '',
      created_by: appt.createdBy || 'pai',
      updated_at: new Date().toISOString()
    }, { onConflict: 'family_id,id' });
  } catch (err) {
    console.warn('Erro ao sincronizar compromisso com Supabase:', err);
  }
}

export async function deleteAppointmentFromSupabase(apptId: string, familyId: string = getStoredFamilyId()): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('appointments').delete().match({ family_id: familyId, id: apptId });
  } catch (err) {
    console.warn('Erro ao excluir compromisso no Supabase:', err);
  }
}

export async function syncSettingsToSupabase(settings: FamilySettings, familyId: string = getStoredFamilyId()): Promise<void> {
  if (!supabase) return;
  try {
    const pinHash = await hashPin(settings.pinCode || '1234');
    await supabase.from('family_settings').upsert({
      family_id: familyId,
      family_name: settings.familyName,
      pin_code_hash: pinHash,
      default_penalty_points: settings.defaultPenaltyPoints,
      delay_tolerance_minutes: settings.delayToleranceMinutes,
      require_pin_for_high_value: settings.requirePinForHighValue,
      high_value_threshold: settings.highValueThreshold,
      notifications_enabled: settings.notificationsEnabled,
      currency_name: settings.currencyName,
      theme_color: settings.themeColor,
      menu_labels: settings.menuLabels || {},
      updated_at: new Date().toISOString()
    }, { onConflict: 'family_id' });
  } catch (err) {
    console.warn('Erro ao sincronizar configurações com Supabase:', err);
  }
}

export async function clearAllTestDataFromSupabase(familyId: string = getStoredFamilyId()): Promise<void> {
  if (!supabase) return;
  try {
    await Promise.all([
      supabase.from('routine_tasks').delete().eq('family_id', familyId),
      supabase.from('reward_items').delete().eq('family_id', familyId),
      supabase.from('transactions').delete().eq('family_id', familyId),
      supabase.from('appointments').delete().eq('family_id', familyId),
      supabase.from('notifications').delete().eq('family_id', familyId),
    ]);
  } catch (err) {
    console.warn('Erro ao limpar dados de teste no Supabase:', err);
  }
}

export async function wipeEntireFamilyFromSupabase(familyId: string = getStoredFamilyId()): Promise<void> {
  if (!supabase) return;
  try {
    await clearAllTestDataFromSupabase(familyId);
    await supabase.from('members').delete().eq('family_id', familyId);
    await supabase.from('family_settings').delete().eq('family_id', familyId);
    await supabase.from('families').delete().eq('id', familyId);
  } catch (err) {
    console.warn('Erro ao zerar família no Supabase:', err);
  }
}
