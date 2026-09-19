import React, { useState, useEffect, useRef } from 'react';
import { ActiveTab, Member, RoutineTask, RewardItem, Transaction, FamilySettings, Appointment, AppNotification } from './types';
import {
  INITIAL_MEMBERS,
  INITIAL_TASKS,
  INITIAL_REWARDS,
  INITIAL_TRANSACTIONS,
  INITIAL_SETTINGS,
  INITIAL_APPOINTMENTS,
  INITIAL_NOTIFICATIONS,
  ASSETS
} from './data/initialData';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './views/DashboardView';
import { CatalogView } from './views/CatalogView';
import { WalletView } from './views/WalletView';
import { StoreView } from './views/StoreView';
import { FamilyMembersView } from './views/FamilyMembersView';
import { SettingsView } from './views/SettingsView';
import { KidModeView } from './views/KidModeView';
import { LoginView } from './views/LoginView';
import { AppointmentsView } from './views/AppointmentsView';
import { NewActivityModal } from './components/NewActivityModal';
import { EvidencePhotoModal } from './components/EvidencePhotoModal';
import { PinModal } from './components/PinModal';
import { Toast, ToastData } from './components/Toast';
import {
  isSupabaseConfigured,
  getStoredFamilyId,
  ensureFamilyExists,
  loadFamilyDataFromSupabase,
  generateUUID,
  deduplicateMembers,
  migrateLocalStorageToSupabase,
  syncMemberToSupabase,
  deleteMemberFromSupabase,
  syncTaskToSupabase,
  deleteTaskFromSupabase,
  syncRewardToSupabase,
  deleteRewardFromSupabase,
  syncTransactionToSupabase,
  syncAppointmentToSupabase,
  deleteAppointmentFromSupabase,
  syncSettingsToSupabase,
  clearAllTestDataFromSupabase,
  wipeEntireFamilyFromSupabase
} from './lib/supabase';
import { hashPin } from './lib/crypto';

export default function App() {
  // Global loading state while fetching from cloud (Source of truth)
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Authentication State
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => localStorage.getItem('familyflow_user'));

  // Persistent state with localStorage fallback
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    return (localStorage.getItem('familyflow_tab') as ActiveTab) || 'dashboard-aprovacoes';
  });

  // State starts empty so cloud fetch is the sole source of truth (never auto-seed demo profiles)
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<RoutineTask[]>([]);
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<FamilySettings>(INITIAL_SETTINGS);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // UI state
  const [selectedChildId, setSelectedChildId] = useState<string>('all');
  const [isKidMode, setIsKidMode] = useState<boolean>(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [isNewActivityOpen, setIsNewActivityOpen] = useState<boolean>(false);
  const [photoModalTask, setPhotoModalTask] = useState<RoutineTask | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [isPinSessionVerified, setIsPinSessionVerified] = useState<boolean>(false);

  // Sync with localStorage
  useEffect(() => {
    if (currentUserId) localStorage.setItem('familyflow_user', currentUserId);
    else localStorage.removeItem('familyflow_user');
  }, [currentUserId]);

  useEffect(() => localStorage.setItem('familyflow_tab', activeTab), [activeTab]);
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('familyflow_members', JSON.stringify(members));
    }
  }, [members, isLoading]);
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('familyflow_tasks', JSON.stringify(tasks));
    }
  }, [tasks, isLoading]);
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('familyflow_rewards', JSON.stringify(rewards));
    }
  }, [rewards, isLoading]);
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('familyflow_transactions', JSON.stringify(transactions));
    }
  }, [transactions, isLoading]);
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('familyflow_settings', JSON.stringify(settings));
    }
  }, [settings, isLoading]);
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('familyflow_appointments', JSON.stringify(appointments));
    }
  }, [appointments, isLoading]);
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('familyflow_notifications', JSON.stringify(notifications));
    }
  }, [notifications, isLoading]);

  // Sync theme color dynamically across root CSS variables
  useEffect(() => {
    const color = settings.themeColor || '#081534';
    document.documentElement.style.setProperty('--theme-color', color);
    document.documentElement.style.setProperty('--color-primary', color);
  }, [settings.themeColor]);

  // Supabase Hydration (Source of Truth) — with hard safety timeout to guarantee preview never hangs
  useEffect(() => {
    let isMounted = true;

    // Hard fallback safety timer (maximum 3.5 seconds loading time)
    const fallbackTimer = setTimeout(() => {
      if (isMounted) {
        setIsLoading(false);
      }
    }, 3500);

    async function initData() {
      try {
        if (isSupabaseConfigured()) {
          const familyId = getStoredFamilyId();

          // 3-second timeout race to guarantee quick responsiveness
          const timeoutPromise = new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), 3000)
          );

          const fetchPromise = async () => {
            await ensureFamilyExists(familyId, 'Rotinas da Família');
            return await loadFamilyDataFromSupabase(familyId);
          };

          const cloudData = await Promise.race([fetchPromise(), timeoutPromise]);

          if (!isMounted) return;

          if (cloudData && cloudData.members && cloudData.members.length > 0) {
            const uniqueMembers = deduplicateMembers(cloudData.members || []);
            setMembers(uniqueMembers);
            setTasks(cloudData.tasks || []);
            setRewards(cloudData.rewards || []);
            setTransactions(cloudData.transactions || []);
            setSettings(cloudData.settings || INITIAL_SETTINGS);
            setAppointments(cloudData.appointments || []);
            setNotifications(cloudData.notifications || []);

            const savedUserId = localStorage.getItem('familyflow_user');
            if (savedUserId && uniqueMembers.some((m) => m.id === savedUserId)) {
              setCurrentUserId(savedUserId);
            } else {
              setCurrentUserId(null);
            }
          } else {
            // Check local fallback
            const savedMembers = localStorage.getItem('familyflow_members');
            if (savedMembers) {
              try {
                const parsed = deduplicateMembers(JSON.parse(savedMembers));
                setMembers(parsed);
                const savedUserId = localStorage.getItem('familyflow_user');
                if (savedUserId && parsed.some((m) => m.id === savedUserId)) {
                  setCurrentUserId(savedUserId);
                } else {
                  setCurrentUserId(null);
                }
              } catch {
                setMembers([]);
                setCurrentUserId(null);
              }
            } else {
              setMembers([]);
              setCurrentUserId(null);
            }

            const savedTasks = localStorage.getItem('familyflow_tasks');
            if (savedTasks) {
              try { setTasks(JSON.parse(savedTasks)); } catch {}
            }
            const savedRewards = localStorage.getItem('familyflow_rewards');
            if (savedRewards) {
              try { setRewards(JSON.parse(savedRewards)); } catch {}
            }
            const savedTransactions = localStorage.getItem('familyflow_transactions');
            if (savedTransactions) {
              try { setTransactions(JSON.parse(savedTransactions)); } catch {}
            }
            const savedSettings = localStorage.getItem('familyflow_settings');
            if (savedSettings) {
              try { setSettings(JSON.parse(savedSettings)); } catch {}
            }
            const savedAppointments = localStorage.getItem('familyflow_appointments');
            if (savedAppointments) {
              try { setAppointments(JSON.parse(savedAppointments)); } catch {}
            }
            const savedNotifications = localStorage.getItem('familyflow_notifications');
            if (savedNotifications) {
              try { setNotifications(JSON.parse(savedNotifications)); } catch {}
            }
          }
        } else {
          // Offline / Unconfigured fallback: load from localStorage
          const savedMembers = localStorage.getItem('familyflow_members');
          if (savedMembers) {
            try {
              const parsed = deduplicateMembers(JSON.parse(savedMembers));
              setMembers(parsed);
              const savedUserId = localStorage.getItem('familyflow_user');
              if (savedUserId && parsed.some((m) => m.id === savedUserId)) {
                setCurrentUserId(savedUserId);
              } else {
                setCurrentUserId(null);
              }
            } catch {
              setMembers([]);
              setCurrentUserId(null);
            }
          } else {
            setMembers([]);
            setCurrentUserId(null);
          }

          const savedTasks = localStorage.getItem('familyflow_tasks');
          if (savedTasks) {
            try { setTasks(JSON.parse(savedTasks)); } catch {}
          }
          const savedRewards = localStorage.getItem('familyflow_rewards');
          if (savedRewards) {
            try { setRewards(JSON.parse(savedRewards)); } catch {}
          }
          const savedTransactions = localStorage.getItem('familyflow_transactions');
          if (savedTransactions) {
            try { setTransactions(JSON.parse(savedTransactions)); } catch {}
          }
          const savedSettings = localStorage.getItem('familyflow_settings');
          if (savedSettings) {
            try { setSettings(JSON.parse(savedSettings)); } catch {}
          }
          const savedAppointments = localStorage.getItem('familyflow_appointments');
          if (savedAppointments) {
            try { setAppointments(JSON.parse(savedAppointments)); } catch {}
          }
          const savedNotifications = localStorage.getItem('familyflow_notifications');
          if (savedNotifications) {
            try { setNotifications(JSON.parse(savedNotifications)); } catch {}
          }
        }
      } catch (err) {
        console.error('Erro na inicialização dos dados da família:', err);
      } finally {
        if (isMounted) {
          clearTimeout(fallbackTimer);
          setIsLoading(false);
        }
      }
    }

    initData();

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
    };
  }, []);

  // Derived state
  const currentUser = members.find(m => m.id === currentUserId);
  const isParent = currentUser?.role === 'parent';

  const handleMigrateToSupabase = async () => {
    const familyId = getStoredFamilyId();
    const result = await migrateLocalStorageToSupabase(familyId, {
      members,
      tasks,
      rewards,
      transactions,
      settings,
      appointments,
      notifications
    });
    if (result.success) {
      showToast('Importação Concluída! 🚀', result.message, 'cloud_done');
    } else {
      showToast('Aviso de Migração', result.message, 'warning');
    }
  };

  const handleSyncWithSupabase = async () => {
    if (!isSupabaseConfigured()) {
      showToast('Supabase Não Configurado', 'Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.', 'warning');
      return;
    }
    const familyId = getStoredFamilyId();
    const cloudData = await loadFamilyDataFromSupabase(familyId);
    if (cloudData && cloudData.members && cloudData.members.length > 0) {
      setMembers(cloudData.members);
      setTasks(cloudData.tasks);
      setRewards(cloudData.rewards);
      setTransactions(cloudData.transactions);
      setSettings(cloudData.settings);
      setAppointments(cloudData.appointments);
      setNotifications(cloudData.notifications);
      showToast('Sincronizado!', 'Dados atualizados a partir do banco de dados Supabase.', 'cloud_download');
    } else {
      showToast('Nenhum dado encontrado', 'Execute a importação dos dados locais para o banco.', 'info');
    }
  };

  // Force Kid Mode if user is child
  useEffect(() => {
    if (currentUser && currentUser.role === 'child') {
      setIsKidMode(true);
    }
  }, [currentUser]);

  // Toast helper
  const showToast = (title: string, desc: string, icon: string = 'check_circle') => {
    const newToast: ToastData = { id: Date.now(), title, desc, icon };
    setToast(newToast);
    setTimeout(() => setToast((current) => (current?.id === newToast.id ? null : current)), 4000);
  };

  // Notifications
  const handleMarkNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };
  const handleClearNotifications = () => {
    setNotifications([]);
  };

  // Appointments
  const handleAddAppointment = (apptData: Omit<Appointment, 'id' | 'status'>) => {
    const newAppt: Appointment = {
      ...apptData,
      id: generateUUID(),
      status: 'pending',
      createdBy: currentUserId || 'system'
    };
    setAppointments(prev => [...prev, newAppt]);
    syncAppointmentToSupabase(newAppt);
  };

  const handleToggleAppointmentStatus = (apptId: string) => {
    setAppointments(prev => {
      const updated: Appointment[] = prev.map(a => 
        a.id === apptId ? { ...a, status: (a.status === 'completed' ? 'pending' : 'completed') as 'pending' | 'completed' } : a
      );
      const target = updated.find(a => a.id === apptId);
      if (target) syncAppointmentToSupabase(target);
      return updated;
    });
  };

  const handleDeleteAppointment = (apptId: string) => {
    setAppointments(prev => prev.filter(a => a.id !== apptId));
    deleteAppointmentFromSupabase(apptId);
    showToast('Compromisso Removido', 'O compromisso foi excluído da agenda.', 'delete');
  };

  // Task Actions
  const handleApproveTask = (taskId: string, feedback?: string, finalPoints?: number) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask) return;
    const pointsToAdd = finalPoints !== undefined ? finalPoints : targetTask.basePoints;
    const todayISO = new Date().toISOString().split('T')[0];
    const prevDates = targetTask.completedDates || [];
    const updatedDates = prevDates.includes(todayISO) ? prevDates : [...prevDates, todayISO];

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: 'approved',
              feedback: feedback || t.feedback,
              finalPoints: pointsToAdd,
              lastCompletedDate: todayISO,
              completedDates: updatedDates
            }
          : t
      )
    );
    
    setMembers((prev) => prev.map((m) => {
      if (m.id === targetTask.assigneeId) {
        return { ...m, pointsBalance: m.pointsBalance + pointsToAdd, pointsEarnedTotal: m.pointsEarnedTotal + pointsToAdd };
      }
      return m;
    }));

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const targetMember = members.find((m) => m.id === targetTask.assigneeId);
    
    const newTx: Transaction = {
      id: generateUUID(),
      date: new Date().toLocaleDateString('pt-BR'),
      time: timeStr,
      memberId: targetTask.assigneeId,
      type: 'credit',
      amount: pointsToAdd,
      description: targetTask.title,
      category: 'Rotina Aprovada',
      balanceAfter: (targetMember?.pointsBalance || 0) + pointsToAdd
    };
    setTransactions((prev) => [newTx, ...prev]);
    syncTransactionToSupabase(newTx);

    showToast('Atividade Aprovada!', `+${pointsToAdd} ${settings.currencyName} para ${targetMember?.name || 'Filho'}.`, 'verified');
  };

  const handleRejectTask = (taskId: string, feedback?: string) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: 'rejected', feedback: feedback || 'Rejeitado para revisão' } : t));
    if (targetTask) {
      syncTaskToSupabase({ ...targetTask, status: 'rejected', feedback: feedback || 'Rejeitado para revisão' });
    }
    showToast('Atividade Rejeitada', `Orientação enviada para o responsável pela tarefa.`, 'cancel');
  };

  const handleBatchApproveOnTime = () => {
    const onTimeTasks = tasks.filter((t) => t.status === 'pending' && !t.isDelayed);
    if (onTimeTasks.length === 0) {
      showToast('Nenhuma Pendência', 'Não há tarefas no prazo pendentes no momento.');
      return;
    }

    let totalPoints = 0;
    const updatedMembers = [...members];
    const newTransactions: Transaction[] = [];
    const timeStr = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;

    onTimeTasks.forEach((task) => {
      totalPoints += task.basePoints;
      const memIndex = updatedMembers.findIndex((m) => m.id === task.assigneeId);
      if (memIndex !== -1) {
        updatedMembers[memIndex].pointsBalance += task.basePoints;
        updatedMembers[memIndex].pointsEarnedTotal += task.basePoints;
        const tx: Transaction = {
          id: generateUUID(),
          date: new Date().toLocaleDateString('pt-BR'),
          time: timeStr,
          memberId: task.assigneeId,
          type: 'credit',
          amount: task.basePoints,
          description: task.title,
          category: 'Aprovação em Lote',
          balanceAfter: updatedMembers[memIndex].pointsBalance
        };
        newTransactions.push(tx);
        syncTransactionToSupabase(tx);
      }
      syncTaskToSupabase({ ...task, status: 'approved' });
    });

    setTasks((prev) => prev.map((t) => (t.status === 'pending' && !t.isDelayed ? { ...t, status: 'approved' } : t)));
    setMembers(updatedMembers);
    setTransactions((prev) => [...newTransactions, ...prev]);
    showToast('Lote Processado!', `${onTimeTasks.length} rotinas aprovadas (+${totalPoints} ${settings.currencyName}).`, 'done_all');
  };

  const handleDeliverReward = (rewardId: string) => {
    setRewards((prev) => prev.map((r) => {
      if (r.id === rewardId) {
        const updated = { ...r, status: 'delivered' as const, deliveredAt: 'Hoje pelo Pai Admin', deliveredBy: 'Pai Admin' };
        syncRewardToSupabase(updated);
        return updated;
      }
      return r;
    }));
    showToast('Recompensa Entregue!', 'O item foi marcado como entregue fisicamente com sucesso.', 'celebration');
  };

  const handleRedeemReward = (rewardId: string, memberId: string) => {
    const reward = rewards.find((r) => r.id === rewardId);
    const member = members.find((m) => m.id === memberId);
    if (!reward || !member) return;

    if (member.pointsBalance < reward.cost) {
      showToast('Saldo Insuficiente', `${member.name} precisa de mais ${reward.cost - member.pointsBalance} ${settings.currencyName}.`, 'error');
      return;
    }

    const newBalance = member.pointsBalance - reward.cost;
    const updatedMember = { ...member, pointsBalance: newBalance, pointsSpentTotal: member.pointsSpentTotal + reward.cost };
    const updatedReward = { ...reward, status: 'pending_delivery' as const, requestedBy: memberId, requestedAt: 'Hoje' };

    setMembers((prev) => prev.map((m) => m.id === memberId ? updatedMember : m));
    setRewards((prev) => prev.map((r) => r.id === rewardId ? updatedReward : r));

    syncMemberToSupabase(updatedMember);
    syncRewardToSupabase(updatedReward);

    const timeStr = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;
    const newTx: Transaction = {
      id: generateUUID(),
      date: new Date().toLocaleDateString('pt-BR'),
      time: timeStr,
      memberId: memberId,
      type: 'debit',
      amount: reward.cost,
      description: `Resgate: ${reward.title}`,
      category: 'Loja de Incentivo',
      balanceAfter: newBalance
    };
    setTransactions((prev) => [newTx, ...prev]);
    syncTransactionToSupabase(newTx);

    showToast('Resgate Solicitado!', `${reward.title} agora está na fila de entrega.`, 'shopping_bag');
  };

  const handleAddManualBonus = (memberId: string, amount: number, reason: string) => {
    const targetMember = members.find((m) => m.id === memberId);
    if (!targetMember) return;

    const updatedMember = { ...targetMember, pointsBalance: targetMember.pointsBalance + amount, pointsEarnedTotal: targetMember.pointsEarnedTotal + amount };
    setMembers((prev) => prev.map((m) => m.id === memberId ? updatedMember : m));
    syncMemberToSupabase(updatedMember);

    const timeStr = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;
    const newTx: Transaction = {
      id: generateUUID(),
      date: new Date().toLocaleDateString('pt-BR'),
      time: timeStr,
      memberId: memberId,
      type: 'credit',
      amount,
      description: `Bônus: ${reason}`,
      category: 'Bônus Educativo',
      balanceAfter: (targetMember?.pointsBalance || 0) + amount
    };
    setTransactions((prev) => [newTx, ...prev]);
    syncTransactionToSupabase(newTx);
  };

  const handleAddNewActivity = (newTaskData: any) => {
    const taskCount = tasks.length + 1;
    const newTask: RoutineTask = {
      ...newTaskData,
      id: generateUUID(),
      regCode: `#REG-${Math.floor(1000 + Math.random() * 9000)}`,
      taskCode: `TAR-${String(taskCount).padStart(3, '0')}`,
      status: 'pending',
      executedAt: '18:00',
      isDelayed: false,
      withinTolerance: true,
      delayMinutes: 0,
      penaltyApplied: false,
      penaltyPoints: 0,
      finalPoints: newTaskData.basePoints,
      photoRequested: false
    };
    setTasks((prev) => [newTask, ...prev]);
    syncTaskToSupabase(newTask);
    showToast('Rotina Criada!', `"${newTaskData.title}" adicionada com sucesso.`, 'add_task');
  };

  const handleAddNewReward = (rewardData: Omit<RewardItem, 'id' | 'status'>) => {
    const newReward: RewardItem = {
      ...rewardData,
      id: generateUUID(),
      status: 'available'
    };
    setRewards((prev) => [...prev, newReward]);
    syncRewardToSupabase(newReward);
  };

  const handleResetData = async () => {
    localStorage.clear();
    setMembers([]);
    setTasks([]);
    setRewards([]);
    setTransactions([]);
    setSettings(INITIAL_SETTINGS);
    setAppointments([]);
    setNotifications([]);
    setCurrentUserId(null);
    setActiveTab('dashboard-aprovacoes');
    await wipeEntireFamilyFromSupabase();
    showToast('Dados Zerados', 'A família foi reinicializada do zero. Cadastre o primeiro administrador.', 'restart_alt');
  };

  const handleClearAllTestData = async () => {
    setTasks([]);
    setRewards([]);
    setTransactions([]);
    setAppointments([]);
    setNotifications([]);
    localStorage.removeItem('familyflow_tasks');
    localStorage.removeItem('familyflow_rewards');
    localStorage.removeItem('familyflow_transactions');
    localStorage.removeItem('familyflow_appointments');
    localStorage.removeItem('familyflow_notifications');
    await clearAllTestDataFromSupabase();
    showToast('Sistema Limpo!', 'Todos os dados de atividades e prêmios foram removidos da nuvem.', 'cleaning_services');
  };

  const handleWipeAllToRegisterFromScratch = async () => {
    localStorage.clear();
    setTasks([]);
    setRewards([]);
    setTransactions([]);
    setAppointments([]);
    setNotifications([]);
    setMembers([]);
    setCurrentUserId(null);
    await wipeEntireFamilyFromSupabase();
    showToast('Sistema Zerado', 'Todos os dados foram excluídos da nuvem e do dispositivo.', 'restart_alt');
  };

  const handleUpdateTask = (updatedTask: RoutineTask) => {
    setTasks((prev) => prev.map((t) => t.id === updatedTask.id ? updatedTask : t));
    syncTaskToSupabase(updatedTask);
    showToast('Regra Atualizada!', `A regra da tarefa "${updatedTask.title}" foi salva com sucesso.`, 'tune');
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    deleteTaskFromSupabase(taskId);
    showToast('Atividade Removida', 'A rotina foi removida do catálogo.', 'delete');
  };

  const handleToggleKidMode = () => {
    if (!isKidMode) {
      setIsKidMode(true);
      showToast('Modo Filho Ativado', 'Ambiente adaptado com interface gamificada para as crianças.');
    } else {
      setIsPinModalOpen(true);
    }
  };

  const handleRegisterMember = async (newMemberData: Omit<Member, 'id' | 'pointsBalance' | 'pointsEarnedTotal' | 'pointsSpentTotal' | 'level' | 'badge' | 'weeklyConsistency' | 'streakDays'>) => {
    const cleanEmail = newMemberData.email?.trim().toLowerCase();
    if (cleanEmail && cleanEmail !== 'sem e-mail' && members.some(m => m.email && m.email.trim().toLowerCase() === cleanEmail)) {
      showToast('E-mail já existente', 'Já existe um membro cadastrado com este e-mail nesta família.', 'warning');
      return;
    }

    const rawPin = newMemberData.pin || (newMemberData.role === 'parent' ? '1234' : '1010');
    const newMember: Member = {
      ...newMemberData,
      id: generateUUID(),
      email: cleanEmail || `${newMemberData.name.trim().toLowerCase().replace(/\s+/g, '')}@familia.com`,
      pin: rawPin,
      pointsBalance: 0,
      pointsEarnedTotal: 0,
      pointsSpentTotal: 0,
      level: 1,
      badge: 'Novato',
      weeklyConsistency: 0,
      streakDays: 0
    };
    setMembers(prev => deduplicateMembers([...prev, newMember]));
    syncMemberToSupabase(newMember);
    setCurrentUserId(newMember.id);
  };

  const handleAddMember = async (newMemberData: Omit<Member, 'id' | 'pointsBalance' | 'pointsEarnedTotal' | 'pointsSpentTotal' | 'level' | 'badge' | 'weeklyConsistency' | 'streakDays'>) => {
    const cleanEmail = newMemberData.email?.trim().toLowerCase();
    if (cleanEmail && cleanEmail !== 'sem e-mail' && members.some(m => m.email && m.email.trim().toLowerCase() === cleanEmail)) {
      showToast('E-mail já cadastrado', 'Já existe um membro com este e-mail nesta família.', 'warning');
      return;
    }

    const rawPin = newMemberData.pin || (newMemberData.role === 'parent' ? '1234' : '1010');
    const newMember: Member = {
      ...newMemberData,
      id: generateUUID(),
      email: cleanEmail || `${newMemberData.name.trim().toLowerCase().replace(/\s+/g, '')}@familia.com`,
      pin: rawPin,
      pointsBalance: 0,
      pointsEarnedTotal: 0,
      pointsSpentTotal: 0,
      level: 1,
      badge: 'Novato',
      weeklyConsistency: 0,
      streakDays: 0
    };
    setMembers(prev => deduplicateMembers([...prev, newMember]));
    syncMemberToSupabase(newMember);
  };

  const handleUpdateMember = async (memberId: string, updates: Partial<Member>) => {
    const cleanEmail = updates.email?.trim().toLowerCase();
    if (cleanEmail && cleanEmail !== 'sem e-mail' && members.some(m => m.id !== memberId && m.email && m.email.trim().toLowerCase() === cleanEmail)) {
      showToast('E-mail já existente', 'Outro membro já possui este e-mail cadastrado.', 'warning');
      return;
    }

    setMembers(prev => {
      const updated = prev.map(m => m.id === memberId ? { ...m, ...updates } : m);
      const target = updated.find(m => m.id === memberId);
      if (target) syncMemberToSupabase(target);
      return updated;
    });
  };

  const handleDeleteMember = (memberId: string) => {
    setMembers(prev => prev.filter(m => m.id !== memberId));
    deleteMemberFromSupabase(memberId);
    if (currentUserId === memberId) {
      setCurrentUserId(null);
    }
  };

  const handleUpdateSettings = (newSettings: FamilySettings) => {
    setSettings(newSettings);
    syncSettingsToSupabase(newSettings);
  };

  // Loading Screen while fetching Supabase source of truth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f9fb] flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-lg border border-[#e0e3e5] flex flex-col items-center text-center space-y-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md animate-pulse"
            style={{ backgroundColor: 'var(--theme-color, #081534)' }}
          >
            <span className="material-symbols-outlined text-white text-3xl">family_restroom</span>
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-[#191c1e]">Carregando Rotinas da Família</h2>
            <p className="text-xs text-[#76777f]">Sincronizando dados com a nuvem Supabase...</p>
          </div>
          <div
            className="w-8 h-8 border-3 border-[#e0e3e5] rounded-full animate-spin"
            style={{ borderTopColor: 'var(--theme-color, #081534)' }}
          ></div>

          <button
            type="button"
            onClick={() => setIsLoading(false)}
            className="pt-2 text-xs font-bold text-[#45464e] hover:text-[#191c1e] hover:underline cursor-pointer"
          >
            Continuar sem aguardar
          </button>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginView
        members={members}
        onLogin={setCurrentUserId}
        onRegister={handleRegisterMember}
        onRestoreDefaults={handleResetData}
      />
    );
  }

  const pendingCount = tasks.filter((t) => t.status === 'pending').length;

  if (isKidMode) {
    return (
      <div className="min-h-screen bg-[#f7f9fb] text-[#191c1e] font-sans antialiased">
        <KidModeView
          members={members}
          tasks={tasks}
          rewards={rewards}
          appointments={appointments}
          onToggleAppointmentStatus={handleToggleAppointmentStatus}
          currentUserId={currentUser.id}
          onCompleteTaskByKid={(taskId) => {
            const todayISO = new Date().toISOString().split('T')[0];
            const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setTasks((prev) =>
              prev.map((t) => {
                if (t.id !== taskId) return t;
                const prevDates = t.completedDates || [];
                const updatedDates = prevDates.includes(todayISO) ? prevDates : [...prevDates, todayISO];
                return {
                  ...t,
                  status: 'pending',
                  executedAt: timeNow,
                  lastCompletedDate: todayISO,
                  completedDates: updatedDates,
                  isDelayed: false,
                  delayMinutes: 0,
                  withinTolerance: true,
                  penaltyApplied: false,
                  penaltyPoints: 0,
                  finalPoints: t.basePoints
                };
              })
            );
            showToast('Atividade Realizada! 🎉', 'Marcada como feita hoje e enviada para aprovação dos pais.', 'celebration');
          }}
          onRequestRewardByKid={(rewardId, kidId) => handleRedeemReward(rewardId, kidId)}
          onExitKidMode={() => setIsPinModalOpen(true)}
          onLogout={() => {
            setCurrentUserId(null);
            setIsKidMode(false);
          }}
          showToast={showToast}
          currencyName={settings.currencyName}
        />
        <PinModal
          isOpen={isPinModalOpen}
          onClose={() => setIsPinModalOpen(false)}
          correctPin={settings.pinCode}
          onSuccess={() => {
            if (currentUser.role === 'child') {
              const parentAdmin = members.find(m => m.role === 'parent');
              if (parentAdmin) {
                setCurrentUserId(parentAdmin.id);
              }
            }
            setIsKidMode(false);
            showToast('Painel Administrador Desbloqueado', 'Bem-vindo de volta, Administrador.', 'verified_user');
          }}
          title="Acesso de Administrador"
          description="Digite a senha / PIN de 4 dígitos dos pais (padrão: 1234) para acessar o painel completo."
        />
        <Toast toast={toast} onClose={() => setToast(null)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-[#191c1e] font-sans antialiased flex flex-col" style={{ '--theme-color': settings.themeColor } as React.CSSProperties}>
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={pendingCount}
        isPinLocked={!isPinSessionVerified}
        onOpenPinModal={() => setIsPinModalOpen(true)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        menuLabels={settings.menuLabels}
      />

      <div className="lg:pl-64 flex flex-col flex-1 min-h-screen">
        <Header
          familyName={settings.familyName}
          currentMember={currentUser}
          pendingCount={pendingCount}
          notifications={notifications}
          members={members}
          onOpenNewActivity={() => setIsNewActivityOpen(true)}
          onToggleMobileMenu={() => setIsMobileSidebarOpen(true)}
          onToggleKidMode={handleToggleKidMode}
          isKidMode={isKidMode}
          onOpenNotifications={() => setActiveTab('dashboard-aprovacoes')}
          onMarkNotificationRead={handleMarkNotificationRead}
          onClearNotifications={handleClearNotifications}
          onUpdateFamilyName={(name) => setSettings(prev => ({...prev, familyName: name}))}
          onSwitchUser={setCurrentUserId}
          onLogout={() => setCurrentUserId(null)}
        />

        <main className="w-full pt-20 px-4 sm:px-8 bg-[#f7f9fb] min-h-[calc(100vh-5rem)] flex-1">
          {activeTab === 'dashboard-aprovacoes' && (
            <DashboardView
              tasks={tasks}
              members={members}
              rewards={rewards}
              selectedChildId={selectedChildId}
              setSelectedChildId={setSelectedChildId}
              onApproveTask={handleApproveTask}
              onRejectTask={handleRejectTask}
              onBatchApproveOnTime={handleBatchApproveOnTime}
              onDeliverReward={handleDeliverReward}
              onViewPhoto={(task) => setPhotoModalTask(task)}
              showToast={showToast}
              pinCode={settings.pinCode}
              currencyName={settings.currencyName}
              menuLabels={settings.menuLabels}
            />
          )}

          {activeTab === 'catalogo-de-atividades' && (
            <CatalogView
              tasks={tasks}
              members={members}
              onOpenNewActivity={() => setIsNewActivityOpen(true)}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              showToast={showToast}
              currencyName={settings.currencyName}
              menuLabels={settings.menuLabels}
            />
          )}

          {activeTab === 'carteira-extrato' && (
            <WalletView members={members} transactions={transactions} onAddManualBonus={handleAddManualBonus} showToast={showToast} currencyName={settings.currencyName} menuLabels={settings.menuLabels} />
          )}

          {activeTab === 'loja-de-incentivos' && (
            <StoreView
              rewards={rewards}
              members={members}
              onDeliverReward={handleDeliverReward}
              onRedeemReward={handleRedeemReward}
              onAddNewReward={handleAddNewReward}
              currencyName={settings.currencyName}
              showToast={showToast}
              menuLabels={settings.menuLabels}
            />
          )}

          {activeTab === 'compromissos' && (
            <AppointmentsView
              appointments={appointments}
              tasks={tasks}
              members={members}
              onAddAppointment={handleAddAppointment}
              onToggleStatus={handleToggleAppointmentStatus}
              onDeleteAppointment={handleDeleteAppointment}
              showToast={showToast}
              isKidMode={false}
              menuLabels={settings.menuLabels}
            />
          )}

          {activeTab === 'membros-da-familia' && (
            <FamilyMembersView
              members={members}
              tasks={tasks}
              currentUserId={currentUserId}
              menuLabels={settings.menuLabels}
              onUpdateMember={handleUpdateMember}
              onAddMember={handleAddMember}
              onDeleteMember={handleDeleteMember}
              showToast={showToast}
            />
          )}

          {activeTab === 'configuracoes' && (
            <SettingsView 
              settings={settings} 
              members={members}
              currentUserId={currentUserId}
              onUpdateSettings={handleUpdateSettings} 
              onUpdateMember={handleUpdateMember}
              onAddMember={handleAddMember}
              onDeleteMember={handleDeleteMember}
              onResetData={handleResetData}
              onClearAllTestData={handleClearAllTestData}
              onWipeAllToRegisterFromScratch={handleWipeAllToRegisterFromScratch}
              onSyncWithSupabase={handleSyncWithSupabase}
              onMigrateToSupabase={handleMigrateToSupabase}
              showToast={showToast} 
            />
          )}
        </main>
      </div>

      <NewActivityModal isOpen={isNewActivityOpen} onClose={() => setIsNewActivityOpen(false)} members={members} onAddActivity={handleAddNewActivity} />

      <EvidencePhotoModal
        task={photoModalTask}
        member={members.find((m) => m.id === photoModalTask?.assigneeId)}
        onClose={() => setPhotoModalTask(null)}
        onApprove={(taskId) => { handleApproveTask(taskId); setPhotoModalTask(null); }}
        onRequestPhoto={() => showToast('Foto Solicitada', 'Notificação enviada ao filho para recadastrar evidência.', 'photo_camera')}
      />

      <PinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        correctPin={settings.pinCode}
        onSuccess={() => { setIsPinSessionVerified(true); showToast('PIN Confirmado', 'Sessão autenticada.', 'lock_open'); }}
        title="Autenticação Parental"
        description="Digite seu PIN de 4 dígitos."
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

