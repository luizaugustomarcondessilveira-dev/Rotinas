import React, { useState } from 'react';
import { Member, RoutineTask, RewardItem } from '../types';
import { ASSETS } from '../data/initialData';

interface DashboardViewProps {
  tasks: RoutineTask[];
  members: Member[];
  rewards: RewardItem[];
  selectedChildId: string;
  setSelectedChildId: (id: string) => void;
  onApproveTask: (taskId: string, feedback?: string, finalPoints?: number) => void;
  onRejectTask: (taskId: string, feedback?: string) => void;
  onBatchApproveOnTime: () => void;
  onDeliverReward: (rewardId: string) => void;
  onViewPhoto: (task: RoutineTask) => void;
  showToast: (title: string, desc: string, icon?: string) => void;
  pinCode: string;
  currencyName: string;
  menuLabels?: Record<string, string>;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  tasks,
  members,
  rewards,
  selectedChildId,
  setSelectedChildId,
  onApproveTask,
  onRejectTask,
  onBatchApproveOnTime,
  onDeliverReward,
  onViewPhoto,
  showToast,
  pinCode,
  currencyName,
  menuLabels
}) => {
  const [activeQueueTab, setActiveQueueTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [penalties, setPenalties] = useState<{ [taskId: string]: boolean }>({
    'card-reg-1083': true,
  });
  const [feedbackTexts, setFeedbackTexts] = useState<{ [taskId: string]: string }>({
    'card-reg-1082': 'Muito bem organizado hoje! Lençóis bem lisos.',
    'card-reg-1083': 'Excelente resolução dos exercícios, mas atente-se ao horário limite!',
    'card-reg-1084': 'Rotina diária noturna habitual sem pendências',
    'card-reg-1085': 'Estojo abastecido, livros da sexta-feira guardados.'
  });

  // Tablet PIN Pad state
  const [pinBuffer, setPinBuffer] = useState<string>('');
  const [pinValidated, setPinValidated] = useState<boolean>(false);

  const lucas = members.find((m) => m.id === 'lucas');
  const beatriz = members.find((m) => m.id === 'beatriz');

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    const matchesChild = selectedChildId === 'all' || t.assigneeId === selectedChildId;
    const matchesTab = t.status === activeQueueTab;
    return matchesChild && matchesTab;
  });

  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const onTimePendingCount = pendingTasks.filter((t) => !t.isDelayed).length;
  const delayedPendingCount = pendingTasks.filter((t) => t.isDelayed).length;

  const pendingRewards = rewards.filter((r) => r.status === 'pending_delivery');

  // PIN pad handlers
  const handlePinInput = (digit: string) => {
    if (pinBuffer.length < 4) {
      const nextPin = pinBuffer + digit;
      setPinBuffer(nextPin);
      if (nextPin.length === 4) {
        if (nextPin === pinCode) {
          setPinValidated(true);
          showToast('Código PIN Validado!', 'Autorização de segurança confirmada para esta sessão.', 'lock_open');
          setTimeout(() => setPinBuffer(''), 1000);
        } else {
          showToast('PIN Incorreto', 'O código digitado não confere. Tente novamente.', 'error');
          setTimeout(() => setPinBuffer(''), 600);
        }
      }
    }
  };

  const handleClearPin = () => {
    setPinBuffer('');
  };

  const handleBackspacePin = () => {
    setPinBuffer((prev) => prev.slice(0, -1));
  };

  const togglePenalty = (taskId: string, basePts: number) => {
    setPenalties((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const getPointsForTask = (task: RoutineTask) => {
    if (task.isDelayed && penalties[task.id]) {
      return Math.max(0, task.basePoints - 10);
    }
    return task.basePoints;
  };

  return (
    <div className="flex flex-col w-full pb-12 gap-6">
      {/* Top Ambient Banner */}
      <div className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-[#081534] via-[#1e2a4a] to-[#001b0f] text-white p-6 sm:p-8 shadow-md">
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-[#fea619]/15 blur-3xl pointer-events-none"></div>
        <div className="absolute right-1/3 -bottom-20 w-64 h-64 rounded-full bg-[#6ffbbe]/10 blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fea619]/20 px-3 py-1 text-[11px] font-bold text-[#ffddb8] tracking-wider uppercase backdrop-blur-xs">
                <span className="h-2 w-2 rounded-full bg-[#fea619] animate-pulse"></span>
                MÓDULO 3 & 4 • AUDITORIA & CARTEIRAS
              </span>
              <span className="text-[#8691b7] text-xs font-medium">• Modo Administrativo Ativo</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
              {menuLabels?.['dashboard-aprovacoes'] || 'Central de Auditoria & Dashboard dos Pais'}
            </h1>
            <p className="text-sm sm:text-base text-[#bac5ee] leading-relaxed">
              Supervisione o cumprimento das rotinas diárias, audite tarefas pendentes e gerencie o saldo de recompensas da família com precisão.
            </p>
          </div>

          {/* Action Cluster */}
          <div className="flex flex-wrap items-center gap-3 self-start lg:self-center">
            {/* Date Selector */}
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-2 rounded-lg text-white text-xs font-semibold hover:bg-white/15 transition-all cursor-pointer border border-white/10">
              <span className="material-symbols-outlined text-[18px] text-[#ffddb8]">calendar_today</span>
              <span>
                Hoje, {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
              </span>
              <span className="material-symbols-outlined text-[16px] opacity-70">expand_more</span>
            </div>

            {/* Filter Child Dropdown */}
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-2 rounded-lg text-white text-xs font-semibold hover:bg-white/15 transition-all border border-white/10">
              <span className="material-symbols-outlined text-[18px] text-[#4edea3]">family_restroom</span>
              <select
                id="filter-child-select"
                value={selectedChildId}
                onChange={(e) => setSelectedChildId(e.target.value)}
                className="bg-transparent border-0 text-white font-semibold text-xs focus:ring-0 cursor-pointer outline-none"
              >
                <option className="text-[#191c1e] bg-white" value="all">Todos os Filhos</option>
                {members.filter(m => m.role === 'child').map(child => (
                  <option key={child.id} className="text-[#191c1e] bg-white" value={child.id}>
                    {child.name} ({child.age} anos)
                  </option>
                ))}
              </select>
            </div>

            {/* Batch Approve Button */}
            {onTimePendingCount > 0 && (
              <button
                id="btn-batch-approve"
                onClick={onBatchApproveOnTime}
                className="flex items-center gap-1.5 bg-[#fea619] hover:bg-[#ffddb8] text-[#2a1700] font-bold text-xs sm:text-sm px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">task_alt</span>
                <span>Aprovar Todos no Prazo ({onTimePendingCount})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Metric & Wallet Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Tarefas Pendentes */}
        <div className="flex flex-col justify-between bg-white rounded-xl p-5 shadow-xs border border-[#e0e3e5]/60 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-[#fea619]"></div>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#45464e]">
                Auditoria Pendente
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-[#081534] tracking-tight">
                  {pendingTasks.length}
                </span>
                <span className="text-xs text-[#45464e]">tarefas</span>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-[#fea619]/15 text-[#855300]">
              <span className="material-symbols-outlined text-[24px]">pending_actions</span>
            </div>
          </div>
          <div className="mt-4 pt-2 flex items-center justify-between bg-[#f2f4f6] px-3 py-1.5 rounded-lg text-xs">
            <span className="flex items-center gap-1.5 font-medium text-[#00a673]">
              <span className="h-2 w-2 rounded-full bg-[#00a673]"></span>
              {onTimePendingCount} no prazo ideal
            </span>
            <span className="flex items-center gap-1 font-medium text-[#855300]">
              <span className="h-2 w-2 rounded-full bg-[#fea619]"></span>
              {delayedPendingCount} com atraso
            </span>
          </div>
        </div>

        {/* Dynamic Child Cards */}
        {members.filter(m => m.role === 'child').map((child, index) => {
          const colors = [
            { ring: 'ring-[#dae2ff]', badge: 'bg-[#dae2ff] text-[#0d1a39]', bar: 'bg-[#fea619]' },
            { ring: 'ring-[#ffddb8]', badge: 'bg-[#6ffbbe]/40 text-[#005236]', bar: 'bg-[#00a673]' },
            { ring: 'ring-[#e0e3e5]', badge: 'bg-[#e0e3e5] text-[#191c1e]', bar: 'bg-[#081534]' },
          ];
          const color = colors[index % colors.length];

          return (
            <div key={child.id} className="flex flex-col justify-between bg-white rounded-xl p-5 shadow-xs border border-[#e0e3e5]/60">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      className={`w-11 h-11 rounded-full object-cover shadow-xs ring-2 ${color.ring}`}
                      alt={`${child.name} avatar`}
                      src={child.avatar}
                    />
                    <span className="absolute -bottom-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#00a673] text-white text-[10px] font-bold">
                      {child.age}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#191c1e]">{child.name} ({child.age}a)</div>
                    <div className="flex items-center gap-1 text-xs text-[#00a673] font-semibold">
                      <span className="material-symbols-outlined text-[14px]">trending_up</span>
                      {child.weeklyConsistency}% na semana
                    </div>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${color.badge}`}>
                  {child.badge}
                </span>
              </div>
              <div className="mt-4 space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-[#45464e] font-medium">Saldo Disponível:</span>
                  <div className="flex items-center gap-1 text-lg font-extrabold text-[#855300]">
                    <span className="material-symbols-outlined text-[18px] text-[#fea619]">toll</span>
                    {child.pointsBalance} {currencyName}
                  </div>
                </div>
                <div className="w-full bg-[#eceef0] rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`${color.bar} h-full rounded-full transition-all duration-500`}
                    style={{ width: `${Math.min(100, Math.round((child.pointsBalance / 1000) * 100))}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[11px] text-[#45464e] pt-0.5">
                  <span>Acumulados: {child.pointsEarnedTotal} {currencyName}</span>
                  <span>Gastos: {child.pointsSpentTotal} {currencyName}</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Card 4: Resgates na Loja */}
        <div className="flex flex-col justify-between bg-white rounded-xl p-5 shadow-xs border border-[#e0e3e5]/60 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#45464e]">
                Loja de Recompensas
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-[#081534] tracking-tight">
                  {pendingRewards.length}
                </span>
                <span className="text-xs text-[#45464e]">aguardando liberação</span>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-[#dae2ff] text-[#081534]">
              <span className="material-symbols-outlined text-[24px]">redeem</span>
            </div>
          </div>
          <div className="mt-4 pt-1 space-y-1.5">
            {pendingRewards.length > 0 ? (
              pendingRewards.slice(0, 2).map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-xs font-semibold text-[#191c1e] truncate">
                  <span className="material-symbols-outlined text-[16px] text-[#fea619]">
                    {item.icon || 'star'}
                  </span>
                  <span className="truncate">
                    {item.title} ({members.find(m => m.id === item.requestedBy)?.name || item.requestedBy || 'Todos'})
                  </span>
                </div>
              ))
            ) : (
              <div className="text-xs text-[#00a673] font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                Nenhum resgate pendente
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Workspace Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Fila de Auditoria de Atividades Pendentes (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Section Header with Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-4 rounded-xl shadow-xs border border-[#e0e3e5]/60 gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#1e2a4a] text-white rounded-lg">
                <span className="material-symbols-outlined text-[20px]">fact_check</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-[#191c1e]">Fila de Aprovação de Rotinas</h2>
                <p className="text-xs text-[#45464e]">Valide evidências, confirme cumprimento de regras e libere pontos.</p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center bg-[#f2f4f6] p-1 rounded-lg self-start sm:self-auto">
              <button
                onClick={() => setActiveQueueTab('pending')}
                className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeQueueTab === 'pending'
                    ? 'bg-white shadow-xs text-[#081534]'
                    : 'text-[#45464e] hover:text-[#191c1e]'
                }`}
              >
                Pendentes
                <span className="px-1.5 py-0.2 rounded-full bg-[#fea619] text-[#2a1700] text-[10px] font-extrabold">
                  {pendingTasks.length}
                </span>
              </button>
              <button
                onClick={() => setActiveQueueTab('approved')}
                className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeQueueTab === 'approved'
                    ? 'bg-white shadow-xs text-[#081534]'
                    : 'text-[#45464e] hover:text-[#191c1e]'
                }`}
              >
                Aprovadas Hoje
                <span className="px-1.5 py-0.2 rounded-full bg-[#e6e8ea] text-[#191c1e] text-[10px]">
                  {tasks.filter((t) => t.status === 'approved').length}
                </span>
              </button>
              <button
                onClick={() => setActiveQueueTab('rejected')}
                className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeQueueTab === 'rejected'
                    ? 'bg-white shadow-xs text-[#081534]'
                    : 'text-[#45464e] hover:text-[#191c1e]'
                }`}
              >
                Rejeitadas
                <span className="px-1.5 py-0.2 rounded-full bg-[#e6e8ea] text-[#191c1e] text-[10px]">
                  {tasks.filter((t) => t.status === 'rejected').length}
                </span>
              </button>
            </div>
          </div>

          {/* Task Cards List */}
          {filteredTasks.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-[#e0e3e5]/60 space-y-2">
              <span className="material-symbols-outlined text-4xl text-[#8691b7]">task_alt</span>
              <div className="text-sm font-bold text-[#191c1e]">Nenhuma tarefa nesta visualização</div>
              <p className="text-xs text-[#45464e]">Todas as rotinas pendentes deste filtro foram processadas!</p>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const child = members.find((m) => m.id === task.assigneeId);
              const isLate = task.isDelayed;
              const hasPenalty = isLate && penalties[task.id];
              const calculatedPoints = getPointsForTask(task);

              return (
                <div
                  key={task.id}
                  id={task.id}
                  className="flex flex-col bg-white rounded-xl p-5 shadow-xs border border-[#e0e3e5]/60 hover:shadow-md transition-all gap-4"
                >
                  {/* Item Header */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <img
                        className="w-10 h-10 rounded-full object-cover ring-1 ring-[#e0e3e5]"
                        alt={child?.name || 'Executante'}
                        src={child?.avatar || ASSETS.lucas}
                      />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm sm:text-base text-[#191c1e]">
                            {task.title}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-[#e6e8ea] text-[#45464e] text-[11px] font-mono">
                            {task.regCode}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-[#dae2ff] text-[#0d1a39] text-[11px] font-bold">
                            {task.taskCode}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 text-[11px] font-semibold">
                            {task.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-[#45464e]">
                          <span>
                            Executante: <strong className="text-[#191c1e]">{child?.name}</strong>
                          </span>
                          <span>•</span>
                          {isLate ? (
                            <span className="flex items-center gap-1 text-[#855300] font-semibold">
                              <span className="material-symbols-outlined text-[15px]">schedule</span>
                              Atrasado em {task.delayMinutes} minutos
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[#00a673] font-semibold">
                              <span className="material-symbols-outlined text-[15px]">check_circle</span>
                              Dentro do prazo
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Reward Tag */}
                    <div className="flex items-center gap-1.5">
                      {isLate && hasPenalty && (
                        <span className="text-xs line-through text-[#45464e] font-semibold">
                          {task.basePoints} {currencyName}
                        </span>
                      )}
                      <div className="flex items-center gap-1 px-3 py-1 bg-[#6ffbbe]/25 text-[#003220] rounded-full font-extrabold text-sm border border-[#6ffbbe]/40">
                        <span className="material-symbols-outlined text-[16px] text-[#00a673]">
                          add_circle
                        </span>
                        <span>+{calculatedPoints} {currencyName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Rules & Execution Timing Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#f2f4f6] p-3.5 rounded-lg text-xs">
                    <div className="md:col-span-2 space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#45464e] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">rule</span>
                        Critérios de Aceite Definidos:
                      </span>
                      <p className="text-[#191c1e] italic text-xs leading-relaxed">
                        "{task.acceptanceCriteria}"
                      </p>
                    </div>
                    <div className="space-y-1 border-t md:border-t-0 md:border-l border-[#e0e3e5] md:pl-3 pt-2 md:pt-0">
                      <div className="flex justify-between">
                        <span className="text-[#45464e]">Horário limite:</span>
                        <span className="font-semibold text-[#191c1e]">{task.deadline}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#45464e]">Realizado às:</span>
                        <span className={`font-semibold ${isLate ? 'text-[#855300]' : 'text-[#00a673]'}`}>
                          {task.executedAt}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#45464e]">Duração:</span>
                        <span className="font-semibold text-[#191c1e]">
                          {task.durationMinutes} min (prev. {task.expectedDurationMinutes} min)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Late Penalty Toggle if applicable */}
                  {isLate && (
                    <div className="flex items-center justify-between bg-[#fea619]/10 px-3.5 py-2 rounded-lg border border-[#fea619]/30">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={hasPenalty}
                          onChange={() => togglePenalty(task.id, task.basePoints)}
                          className="w-4 h-4 rounded text-[#fea619] focus:ring-0 cursor-pointer accent-[#855300]"
                        />
                        <span className="text-xs font-bold text-[#191c1e]">
                          Aplicar penalidade padrão de atraso (-10 {currencyName})
                        </span>
                      </label>
                      <span className="text-[10px] font-bold text-[#653e00] bg-[#ffddb8] px-2 py-0.5 rounded">
                        Tolerância excedida
                      </span>
                    </div>
                  )}

                  {/* Feedback Input & Actions */}
                  {task.status === 'pending' ? (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 border-t border-[#e0e3e5]/50">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={feedbackTexts[task.id] || ''}
                          onChange={(e) =>
                            setFeedbackTexts({
                              ...feedbackTexts,
                              [task.id]: e.target.value
                            })
                          }
                          placeholder="Adicionar feedback educativo aos pais..."
                          className="w-full h-9 px-3 text-xs rounded-lg bg-[#f2f4f6] text-[#191c1e] placeholder-[#76777f] focus:outline-none focus:ring-2 focus:ring-[#1e2a4a]/20 border border-transparent focus:border-[#1e2a4a]/30"
                        />
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {/* Evidence photo button */}
                        <button
                          onClick={() => onViewPhoto(task)}
                          className="px-3 py-1.5 rounded-lg bg-[#e6e8ea] hover:bg-[#d8dadc] text-[#191c1e] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Visualizar evidência da tarefa"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {task.hasPhotoEvidence ? 'photo_library' : 'photo_camera'}
                          </span>
                          <span className="hidden sm:inline">
                            {task.hasPhotoEvidence ? 'Ver Foto' : 'Pedir Foto'}
                          </span>
                        </button>

                        {/* Reject button */}
                        <button
                          onClick={() => onRejectTask(task.id, feedbackTexts[task.id])}
                          className="px-3 py-1.5 rounded-lg bg-[#ffdad6] hover:bg-[#ffdad6]/80 text-[#93000a] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                          <span>Rejeitar</span>
                        </button>

                        {/* Approve button */}
                        <button
                          onClick={() =>
                            onApproveTask(task.id, feedbackTexts[task.id], calculatedPoints)
                          }
                          className="px-4 py-1.5 rounded-lg bg-[#081534] hover:bg-[#1e2a4a] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-transform active:scale-95 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">done_all</span>
                          <span>Aprovar (+{calculatedPoints} {currencyName})</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-xs text-[#45464e] pt-1 border-t border-[#e0e3e5]/50">
                      <span className="italic">
                        {task.feedback || (task.status === 'approved' ? 'Aprovado' : 'Rejeitado')}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                          task.status === 'approved'
                            ? 'bg-[#6ffbbe]/30 text-[#005236]'
                            : 'bg-[#ffdad6] text-[#93000a]'
                        }`}
                      >
                        {task.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* RIGHT COLUMN: Delivery Desk & Tablet Security PIN (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Module 5: Central de Entrega de Resgates */}
          <div className="bg-white rounded-xl p-5 shadow-xs border border-[#e0e3e5]/60 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#fea619] text-[22px]">
                  storefront
                </span>
                <h3 className="text-base font-bold text-[#191c1e]">Resgates da Loja</h3>
              </div>
              <span className="text-[10px] font-bold text-[#855300] bg-[#fea619]/20 px-2 py-0.5 rounded-full">
                Módulo 5
              </span>
            </div>
            <p className="text-xs text-[#45464e]">
              Itens solicitados pelos filhos que aguardam autorização ou entrega física dos pais.
            </p>

            <div className="space-y-3 mt-1">
              {rewards.slice(0, 3).map((reward) => {
                const child = members.find((m) => m.id === reward.targetChildId);
                const isPending = reward.status === 'pending_delivery';

                return (
                  <div
                    key={reward.id}
                    className={`p-3.5 rounded-xl bg-[#f2f4f6] flex flex-col gap-2 border-l-4 transition-all ${
                      isPending ? 'border-[#fea619]' : 'border-[#00a673] opacity-80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-[#191c1e]">{reward.title}</div>
                        <span className="text-[11px] text-[#45464e]">
                          {child?.name || 'Todos'} • Custo: {reward.cost} {currencyName}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isPending
                            ? 'bg-[#ffddb8] text-[#2a1700]'
                            : 'bg-[#6ffbbe]/40 text-[#005236]'
                        }`}
                      >
                        {isPending ? 'Pendente' : 'Entregue'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-[#76777f]">
                        {reward.requestedAt || 'Hoje'}
                      </span>
                      {isPending && (
                        <button
                          onClick={() => onDeliverReward(reward.id)}
                          className="px-2.5 py-1 rounded-lg bg-[#fea619] hover:bg-[#ffddb8] text-[#2a1700] text-xs font-bold flex items-center gap-1 shadow-xs transition-transform active:scale-95 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[15px]">check</span>
                          Marcar Entregue
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Parent Security PIN Pad (Shared Tablet Defense) */}
          <div className="bg-white rounded-xl p-5 shadow-xs border border-[#e0e3e5]/60 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-[#081534] text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px]">lock</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#191c1e]">PIN de Validação Rápida</h4>
                  <span className="text-[10px] text-[#45464e]">Uso em tablets compartilhados</span>
                </div>
              </div>
              <span
                className={`material-symbols-outlined text-[20px] ${
                  pinValidated ? 'text-[#00a673]' : 'text-[#76777f]'
                }`}
                title={pinValidated ? 'Sessão segura ativa' : 'PIN não validado'}
              >
                shield
              </span>
            </div>

            <p className="text-xs text-[#45464e]">
              Digite seu PIN de 4 dígitos para confirmar liberações de alto valor e evitar aprovações acidentais pelas crianças.
            </p>

            {/* PIN Dots Display */}
            <div className="flex justify-center items-center gap-3 py-2">
              {[1, 2, 3, 4].map((index) => {
                const filled = pinBuffer.length >= index;
                return (
                  <div
                    key={index}
                    className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                      filled
                        ? 'bg-[#fea619] scale-110 shadow-xs'
                        : 'bg-[#e0e3e5]'
                    }`}
                  />
                );
              })}
            </div>

            {/* Virtual Keypad (Accessible touch targets 44px+) */}
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handlePinInput(digit)}
                  className="h-10 rounded-lg bg-[#f2f4f6] hover:bg-[#e6e8ea] text-sm font-bold text-[#191c1e] flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                >
                  {digit}
                </button>
              ))}
              <button
                onClick={handleClearPin}
                className="h-10 rounded-lg bg-[#e6e8ea] hover:bg-[#d8dadc] text-xs font-semibold text-[#45464e] flex items-center justify-center transition-colors cursor-pointer"
              >
                Limpar
              </button>
              <button
                onClick={() => handlePinInput('0')}
                className="h-10 rounded-lg bg-[#f2f4f6] hover:bg-[#e6e8ea] text-sm font-bold text-[#191c1e] flex items-center justify-center transition-colors cursor-pointer active:scale-95"
              >
                0
              </button>
              <button
                onClick={handleBackspacePin}
                className="h-10 rounded-lg bg-[#e6e8ea] hover:bg-[#d8dadc] text-[#191c1e] flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">backspace</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#76777f] pt-1">
              <span>{pinValidated ? 'PIN validado com sucesso' : 'PIN de Proteção Ativo'}</span>
              <button
                onClick={() => {
                  showToast('Modo PIN', 'Você pode alterar o código nas Configurações.');
                }}
                className="text-[#081534] hover:underline font-semibold cursor-pointer"
              >
                Alterar Código
              </button>
            </div>
          </div>

          {/* Weekly Consistency Ring Widget */}
          <div className="bg-white rounded-xl p-5 shadow-xs border border-[#e0e3e5]/60 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#191c1e]">Ritmo da Família</span>
              <span className="text-xs text-[#00a673] font-bold">+14% vs semana passada</span>
            </div>

            {/* Inline SVG Ring Metric */}
            <div className="flex items-center gap-4 pt-1">
              <div className="relative w-20 h-20 shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-[#e0e3e5]"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.5"
                  />
                  <path
                    className="text-[#00a673]"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeDasharray="94, 100"
                    strokeLinecap="round"
                    strokeWidth="3.5"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-sm font-extrabold text-[#081534]">94%</span>
                  <span className="text-[8px] text-[#45464e] font-bold uppercase">Sucesso</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-bold text-[#191c1e]">32 rotinas concluídas</div>
                <div className="text-[11px] text-[#45464e] leading-snug">
                  Apenas 2 atrasos tolerados e nenhuma rejeição grave nos últimos 7 dias.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
