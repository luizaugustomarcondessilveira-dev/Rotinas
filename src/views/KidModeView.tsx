import React, { useState } from 'react';
import { Member, RoutineTask, RewardItem, Appointment, DAYS_OF_WEEK } from '../types';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface KidModeViewProps {
  members: Member[];
  tasks: RoutineTask[];
  rewards: RewardItem[];
  appointments?: Appointment[];
  currentUserId?: string;
  onCompleteTaskByKid: (taskId: string) => void;
  onRequestRewardByKid: (rewardId: string, kidId: string) => void;
  onToggleAppointmentStatus?: (apptId: string) => void;
  onExitKidMode: () => void;
  onLogout?: () => void;
  showToast: (title: string, desc: string, icon?: string) => void;
  currencyName: string;
}

export const KidModeView: React.FC<KidModeViewProps> = ({
  members,
  tasks,
  rewards,
  appointments = [],
  currentUserId,
  onCompleteTaskByKid,
  onRequestRewardByKid,
  onToggleAppointmentStatus,
  onExitKidMode,
  onLogout,
  showToast,
  currencyName
}) => {
  // Check if current user is logged in as a child
  const loggedInChild = members.find((m) => m.id === currentUserId && m.role === 'child');
  const isChildSession = !!loggedInChild;

  const [selectedKidId, setSelectedKidId] = useState<string>(() => {
    if (loggedInChild) return loggedInChild.id;
    return members.find((m) => m.role === 'child')?.id || members[0]?.id || '';
  });

  // Effective kid ID: if a child is logged in, strictly enforce their ID
  const effectiveKidId = isChildSession && loggedInChild ? loggedInChild.id : (selectedKidId || members[0]?.id);

  const [activeTab, setActiveTab] = useState<'tasks' | 'appointments' | 'store'>('tasks');
  const [taskFilter, setTaskFilter] = useState<'today' | 'all'>('today');
  const [apptViewMode, setApptViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number>(() => new Date().getDay());
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const todayISO = new Date().toISOString().split('T')[0];
  const todayDayOfWeek = new Date().getDay();

  const currentKid = members.find((m) => m.id === effectiveKidId) || members[0];
  const kidTasks = tasks.filter((t) => t.assigneeId === effectiveKidId);

  // Filter tasks for today vs all
  const displayedTasks = kidTasks.filter((t) => {
    if (taskFilter === 'all') return true;
    return !t.daysOfWeek || t.daysOfWeek.length === 0 || t.daysOfWeek.includes(todayDayOfWeek);
  });

  const todayCompletedCount = kidTasks.filter((t) => {
    const isScheduled = !t.daysOfWeek || t.daysOfWeek.length === 0 || t.daysOfWeek.includes(todayDayOfWeek);
    const isDone = t.lastCompletedDate === todayISO || (t.completedDates && t.completedDates.includes(todayISO));
    return isScheduled && isDone;
  }).length;

  const todayTotalCount = kidTasks.filter((t) => {
    return !t.daysOfWeek || t.daysOfWeek.length === 0 || t.daysOfWeek.includes(todayDayOfWeek);
  }).length;

  const availableRewards = rewards.filter(
    (r) => (r.targetChildId === 'all' || r.targetChildId === effectiveKidId) && r.status === 'available'
  );

  const kidAppointments = appointments.filter(
    (appt) => appt.participants && appt.participants.includes(effectiveKidId)
  );
  const pendingAppointmentsCount = kidAppointments.filter((a) => a.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#dae2ff]/30 via-[#f7f9fb] to-[#f7f9fb] p-4 sm:p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-6">
        {/* Kid Header Top Bar */}
        <div className="flex items-center justify-between bg-white p-4 sm:p-6 rounded-3xl shadow-sm border border-[#e0e3e5]/60">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                className="w-14 h-14 rounded-full object-cover ring-4 ring-[#fea619] shadow-md"
                alt={currentKid.name}
                src={currentKid.avatar}
              />
              <span className="absolute -bottom-1 -right-1 text-lg">🌟</span>
            </div>
            <div>
              <div className="text-lg sm:text-xl font-extrabold text-[#081534]">
                Oi, {currentKid.name}! 🚀
              </div>
              <p className="text-xs text-[#45464e]">
                Você está no seu painel de aventuras e conquistas diárias.
              </p>
            </div>
          </div>

          {/* Kid switcher & Exit */}
          <div className="flex items-center gap-2">
            {/* Sibling switcher ONLY visible when parent previewing kid mode, NEVER shown to a child */}
            {!isChildSession && (
              <div className="flex bg-[#f2f4f6] p-1 rounded-2xl">
                {members
                  .filter((m) => m.role === 'child')
                  .map((kid) => (
                    <button
                      key={kid.id}
                      onClick={() => setSelectedKidId(kid.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        effectiveKidId === kid.id
                          ? 'bg-[#081534] text-white shadow-xs'
                          : 'text-[#45464e] hover:text-[#191c1e]'
                      }`}
                    >
                      {kid.name}
                    </button>
                  ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center gap-1.5 bg-[#ffdad6] hover:bg-[#ffb4ab] text-[#93000a] px-3.5 py-2 rounded-2xl text-xs font-bold cursor-pointer transition-colors active:scale-95"
              title="Fazer Logout"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span className="hidden sm:inline">Sair</span>
            </button>

            <button
              onClick={onExitKidMode}
              className="flex items-center gap-1.5 bg-[#e6e8ea] hover:bg-[#d8dadc] text-[#081534] px-3.5 py-2 rounded-2xl text-xs font-bold cursor-pointer transition-colors"
              title="Voltar ao Painel dos Pais (Requer PIN Admin)"
            >
              <span className="material-symbols-outlined text-[16px]">lock</span>
              <span className="hidden sm:inline">Modo Pais</span>
            </button>
          </div>
        </div>

        {/* Hero Points Badge */}
        <div className="bg-gradient-to-r from-[#fea619] via-[#ffb95f] to-[#fea619] rounded-3xl p-6 sm:p-8 text-[#2a1700] shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-xs font-bold uppercase tracking-wider bg-white/40 px-3 py-1 rounded-full">
              Seu Saldo de Estrelas & Moedas
            </span>
            <div className="text-4xl sm:text-5xl font-black tracking-tight flex items-center justify-center sm:justify-start gap-2">
              <span>{currentKid.pointsBalance}</span>
              <span className="text-2xl font-bold">{currencyName}</span>
            </div>
            <p className="text-xs text-[#653e00] font-semibold">
              Você já acumulou {currentKid.pointsEarnedTotal} {currencyName} no total! Continue assim!
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-4 sm:px-5 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'tasks'
                  ? 'bg-[#081534] text-white shadow-md'
                  : 'bg-white/70 text-[#2a1700] hover:bg-white'
              }`}
            >
              <span>📋</span>
              <span>Minhas Tarefas</span>
            </button>
            <button
              onClick={() => setActiveTab('appointments')}
              className={`px-4 sm:px-5 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'appointments'
                  ? 'bg-[#081534] text-white shadow-md'
                  : 'bg-white/70 text-[#2a1700] hover:bg-white'
              }`}
            >
              <span>📅</span>
              <span>Meus Compromissos</span>
              {pendingAppointmentsCount > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                  activeTab === 'appointments' ? 'bg-[#fea619] text-[#2a1700]' : 'bg-[#081534] text-white'
                }`}>
                  {pendingAppointmentsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('store')}
              className={`px-4 sm:px-5 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'store'
                  ? 'bg-[#081534] text-white shadow-md'
                  : 'bg-white/70 text-[#2a1700] hover:bg-white'
              }`}
            >
              <span>🎁</span>
              <span>Loja de Prêmios</span>
            </button>
          </div>
        </div>

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-2 gap-3">
              <div>
                <h2 className="text-base font-extrabold text-[#081534] flex items-center gap-2">
                  <span>Minhas Atividades & Rotinas</span>
                  <span className="text-xs font-bold bg-[#dae2ff] text-[#0d1a39] px-2.5 py-0.5 rounded-full">
                    {displayedTasks.length} {taskFilter === 'today' ? 'de hoje' : 'no total'}
                  </span>
                </h2>
                <p className="text-xs text-[#45464e] mt-0.5">
                  Conclua suas atividades diariamente para ganhar {currencyName}. A cada novo dia você poderá marcar que realizou novamente!
                </p>
              </div>

              {/* Today vs All Filter Switcher */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <div className="flex bg-white p-1 rounded-xl border border-[#e0e3e5] shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setTaskFilter('today')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      taskFilter === 'today'
                        ? 'bg-[#081534] text-white shadow-xs'
                        : 'text-[#45464e] hover:text-[#191c1e]'
                    }`}
                  >
                    Hoje ({todayTotalCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskFilter('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      taskFilter === 'all'
                        ? 'bg-[#081534] text-white shadow-xs'
                        : 'text-[#45464e] hover:text-[#191c1e]'
                    }`}
                  >
                    Todas ({kidTasks.length})
                  </button>
                </div>
              </div>
            </div>

            {/* Daily Status Banner */}
            <div className="bg-white rounded-2xl p-4 border border-[#e0e3e5]/70 flex items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#6ffbbe]/30 text-[#00a673] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">event_repeat</span>
                </div>
                <div>
                  <div className="text-xs font-bold text-[#081534]">
                    Progresso de Hoje: {todayCompletedCount} de {todayTotalCount} rotinas concluídas
                  </div>
                  <div className="text-[11px] text-[#76777f]">
                    Marque as atividades conforme for concluindo ao longo do dia.
                  </div>
                </div>
              </div>

              <div className="hidden sm:block text-right">
                <span className="text-xs font-black text-[#00a673] bg-[#00a673]/10 px-3 py-1 rounded-full">
                  {todayTotalCount > 0 ? Math.round((todayCompletedCount / todayTotalCount) * 100) : 100}% Concluído Hoje
                </span>
              </div>
            </div>

            {displayedTasks.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center border border-[#e0e3e5]/70 shadow-xs">
                <span className="material-symbols-outlined text-[40px] text-[#00a673]">task_alt</span>
                <h3 className="text-base font-bold text-[#081534] mt-2">Nenhuma rotina para este filtro</h3>
                <p className="text-xs text-[#76777f] mt-1">
                  Você não tem rotinas programadas para este filtro no momento.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedTasks.map((task) => {
                  const isDoneToday = task.lastCompletedDate === todayISO || (task.completedDates && task.completedDates.includes(todayISO));
                  const isApproved = isDoneToday && task.status === 'approved';
                  const isPending = isDoneToday && task.status === 'pending';
                  const isScheduledToday = !task.daysOfWeek || task.daysOfWeek.length === 0 || task.daysOfWeek.includes(todayDayOfWeek);

                  return (
                    <div
                      key={task.id}
                      className={`bg-white rounded-2xl p-5 shadow-xs border transition-all flex flex-col justify-between gap-4 ${
                        isApproved
                          ? 'border-[#6ffbbe] bg-[#f7fdfa]'
                          : isPending
                          ? 'border-[#fef08a] bg-[#fffdf5]'
                          : 'border-[#e0e3e5]/80 hover:shadow-md'
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 text-[10px] font-bold">
                            {task.category}
                          </span>
                          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#ffddb8]/40 text-[#855300] font-extrabold text-xs">
                            +{task.basePoints} {currencyName}
                          </div>
                        </div>

                        <div>
                          <h3 className="text-sm sm:text-base font-extrabold text-[#191c1e]">
                            {task.title}
                          </h3>
                          <p className="text-xs text-[#45464e] italic mt-1 bg-[#f8f9fa] p-2 rounded-lg border border-[#e0e3e5]/50">
                            "{task.acceptanceCriteria}"
                          </p>
                        </div>

                        {/* Recurrence tags (No deadline!) */}
                        <div className="flex items-center gap-2 text-xs text-[#76777f] flex-wrap pt-1">
                          <div className="flex items-center gap-1 bg-[#f2f4f6] px-2.5 py-1 rounded-full text-[#081534] font-semibold text-[11px]">
                            <span className="material-symbols-outlined text-[14px]">event_repeat</span>
                            <span>
                              {(!task.daysOfWeek || task.daysOfWeek.length === 7)
                                ? 'Todo dia'
                                : task.daysOfWeek.map((d) => DAYS_OF_WEEK.find((dw) => dw.id === d)?.short).join(', ')}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 text-[11px] text-[#76777f]">
                            <span className="material-symbols-outlined text-[14px]">timer</span>
                            <span>~{task.expectedDurationMinutes || 15} min</span>
                          </div>

                          {!isScheduledToday && (
                            <span className="text-[10px] text-[#855300] bg-[#ffddb8]/30 px-2 py-0.5 rounded-md font-bold">
                              Programada para outros dias
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action / Status Area */}
                      <div className="pt-3 border-t border-[#e0e3e5]/50">
                        {isApproved ? (
                          <div className="w-full bg-[#f0fdf4] border border-[#6ffbbe] p-3 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-[#00a673] text-[22px]">verified</span>
                              <div>
                                <div className="text-xs font-bold text-[#00a673]">Realizado e Aprovado Hoje! 🎉</div>
                                <div className="text-[10px] text-[#45464e]">+{task.finalPoints || task.basePoints} {currencyName} creditados</div>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-[#00a673] bg-white px-2 py-1 rounded-md border border-[#6ffbbe]">
                              Renova amanhã 🔄
                            </span>
                          </div>
                        ) : isPending ? (
                          <div className="w-full bg-[#fffbeb] border border-[#fef08a] p-3 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-[#855300] text-[22px]">hourglass_top</span>
                              <div>
                                <div className="text-xs font-bold text-[#855300]">Marcado como Realizado Hoje! ⌛</div>
                                <div className="text-[10px] text-[#76777f]">Aguardando conferência dos pais</div>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-[#855300] bg-white px-2 py-1 rounded-md border border-[#fef08a]">
                              Em validação
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onCompleteTaskByKid(task.id)}
                            className="w-full py-3 bg-[#00a673] hover:bg-[#008f63] text-white font-extrabold text-sm rounded-xl shadow-md hover:shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                          >
                            <span className="material-symbols-outlined text-[20px]">check_circle</span>
                            <span>Marcar como Realizado</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Appointments Tab */}
        {activeTab === 'appointments' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-2 gap-3">
              <div>
                <h2 className="text-base font-extrabold text-[#081534] flex items-center gap-2">
                  <span>Meus Compromissos & Calendário</span>
                  <span className="text-xs font-bold bg-[#dae2ff] text-[#0d1a39] px-2.5 py-0.5 rounded-full">
                    {kidAppointments.length} no total
                  </span>
                </h2>
                <p className="text-xs text-[#45464e] mt-0.5">
                  Acompanhe suas aulas, consultas, treinos e atividades semanais integradas.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <div className="flex bg-white p-1 rounded-xl border border-[#e0e3e5] shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setApptViewMode('list')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      apptViewMode === 'list'
                        ? 'bg-[#081534] text-white shadow-xs'
                        : 'text-[#45464e] hover:text-[#191c1e]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">format_list_bulleted</span>
                    <span>Lista</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setApptViewMode('calendar')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      apptViewMode === 'calendar'
                        ? 'bg-[#081534] text-white shadow-xs'
                        : 'text-[#45464e] hover:text-[#191c1e]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">calendar_month</span>
                    <span>Semana Integrada</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Mode 1: Weekly Calendar for Kid */}
            {apptViewMode === 'calendar' && (
              <div className="bg-white rounded-2xl shadow-xs border border-[#e0e3e5] p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#e0e3e5] pb-3">
                  <h3 className="text-xs font-extrabold text-[#081534] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#fea619]">event_upcoming</span>
                    <span>Escolha um dia da semana para ver a agenda:</span>
                  </h3>
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {DAYS_OF_WEEK.map((day) => {
                    const isSelected = selectedDayOfWeek === day.id;
                    const isToday = todayDayOfWeek === day.id;
                    const tasksThisDay = kidTasks.filter(
                      (t) => !t.daysOfWeek || t.daysOfWeek.length === 0 || t.daysOfWeek.includes(day.id)
                    );

                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => setSelectedDayOfWeek(day.id)}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          isSelected
                            ? 'bg-[#081534] text-white border-[#081534] shadow-xs ring-2 ring-[#081534]/20'
                            : 'bg-[#f8f9fa] text-[#191c1e] border-[#e0e3e5] hover:bg-[#f2f4f6]'
                        }`}
                      >
                        <span className="font-extrabold text-xs">{day.short}</span>
                        {isToday && (
                          <span className={`text-[8px] font-black px-1 rounded ${
                            isSelected ? 'bg-[#6ffbbe] text-[#003220]' : 'bg-[#00a673] text-white'
                          }`}>
                            HOJE
                          </span>
                        )}
                        <span className={`text-[10px] font-bold ${isSelected ? 'text-white/80' : 'text-[#76777f]'}`}>
                          {tasksThisDay.length} rotinas
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Day Details for Kid */}
                {(() => {
                  const selectedDayObj = DAYS_OF_WEEK.find((d) => d.id === selectedDayOfWeek) || DAYS_OF_WEEK[0];
                  const dayTasks = kidTasks.filter(
                    (t) => !t.daysOfWeek || t.daysOfWeek.length === 0 || t.daysOfWeek.includes(selectedDayOfWeek)
                  );

                  return (
                    <div className="bg-[#f8f9fa] p-4 rounded-xl border border-[#e0e3e5] space-y-3">
                      <div className="text-xs font-extrabold text-[#081534] flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-[#00388f]">schedule</span>
                        <span>Rotinas para {selectedDayObj.label}:</span>
                      </div>

                      {dayTasks.length === 0 ? (
                        <div className="text-xs text-[#76777f] italic text-center py-2">
                          Nenhuma rotina programada para este dia.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {dayTasks.map((task) => (
                            <div
                              key={task.id}
                              className="bg-white p-3 rounded-lg border border-[#e0e3e5] flex items-center justify-between text-xs"
                            >
                              <div>
                                <div className="font-bold text-[#191c1e]">{task.title}</div>
                                <div className="text-[11px] text-[#76777f]">{task.category} • ~{task.expectedDurationMinutes || 15} min</div>
                              </div>
                              <span className="font-bold text-[#855300] bg-[#ffddb8]/40 px-2 py-0.5 rounded-full text-xs">
                                +{task.basePoints} pts
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Mode 2: Standard Appointments List */}
            {apptViewMode === 'list' && (
              <>
                {kidAppointments.length === 0 ? (
                  <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-[#e0e3e5]/70 shadow-xs flex flex-col items-center justify-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-[#dae2ff]/50 flex items-center justify-center text-[#00388f]">
                      <span className="material-symbols-outlined text-[32px]">event_available</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-[#081534]">
                      Nenhum compromisso agendado para você!
                    </h3>
                    <p className="text-xs sm:text-sm text-[#45464e] max-w-md">
                      Tudo livre no seu calendário por enquanto. Aproveite para realizar suas rotinas diárias e acumular pontos na Loja de Prêmios! 🚀
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('tasks')}
                      className="mt-2 px-5 py-2.5 rounded-xl bg-[#081534] hover:bg-[#1a2542] text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[16px]">task_alt</span>
                      Ver Minhas Tarefas
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {kidAppointments.map((appt) => {
                      const isCompleted = appt.status === 'completed';
                      const otherParticipants = (appt.participants || [])
                        .filter((pId) => pId !== selectedKidId)
                        .map((pId) => members.find((m) => m.id === pId))
                        .filter(Boolean) as Member[];

                      return (
                        <div
                          key={appt.id}
                          className={`bg-white rounded-2xl p-5 shadow-xs border transition-all flex flex-col justify-between gap-4 ${
                            isCompleted
                              ? 'border-[#00a673]/50 bg-[#f7fdfa]'
                              : 'border-[#e0e3e5]/70 hover:shadow-md'
                          }`}
                        >
                          <div className="space-y-3">
                            {/* Date & Status */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 text-[#081534] font-bold text-xs bg-[#f2f4f6] px-3 py-1.5 rounded-full">
                                <span className="material-symbols-outlined text-[16px] text-[#fea619]">calendar_month</span>
                                <span>{appt.date} às {appt.time}</span>
                              </div>

                              {isCompleted ? (
                                <span className="px-2.5 py-1 rounded-full bg-[#00a673]/15 text-[#00a673] text-[11px] font-bold flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                  Realizado
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full bg-[#fea619]/20 text-[#855300] text-[11px] font-bold flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px]">schedule</span>
                                  Agendado
                                </span>
                              )}
                            </div>

                            {/* Title & Notes */}
                            <div>
                              <h3 className={`text-base font-extrabold ${isCompleted ? 'text-[#45464e] line-through' : 'text-[#081534]'}`}>
                                {appt.title}
                              </h3>
                              {appt.notes && (
                                <div className="mt-2 bg-[#f8f9fa] border border-[#e0e3e5]/60 rounded-xl p-2.5 text-xs text-[#45464e] flex items-start gap-2">
                                  <span className="material-symbols-outlined text-[16px] text-[#76777f] shrink-0 mt-0.5">info</span>
                                  <span className="italic">"{appt.notes}"</span>
                                </div>
                              )}
                            </div>

                            {/* Companions */}
                            {otherParticipants.length > 0 && (
                              <div className="pt-2 border-t border-[#e0e3e5]/40">
                                <span className="text-[11px] text-[#76777f] font-semibold block mb-1.5">
                                  Quem vai acompanhar você:
                                </span>
                                <div className="flex flex-wrap items-center gap-2">
                                  {otherParticipants.map((companion) => (
                                    <div
                                      key={companion.id}
                                      className="flex items-center gap-1.5 bg-[#f2f4f6] px-2.5 py-1 rounded-full text-xs font-semibold text-[#191c1e]"
                                    >
                                      <img
                                        src={companion.avatar}
                                        alt={companion.name}
                                        className="w-5 h-5 rounded-full object-cover ring-1 ring-white"
                                      />
                                      <span>{companion.name}</span>
                                      <span className="text-[10px] text-[#76777f]">
                                        ({companion.role === 'parent' ? 'Responsável' : 'Irmão(ã)'})
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Action Button */}
                          <div className="pt-3 border-t border-[#e0e3e5]/60 flex items-center justify-between">
                            {onToggleAppointmentStatus ? (
                              <button
                                type="button"
                                onClick={() => {
                                  onToggleAppointmentStatus(appt.id);
                                  if (!isCompleted) {
                                    showToast('Compromisso Concluído!', `Você marcou "${appt.title}" como realizado!`, 'celebration');
                                  } else {
                                    showToast('Compromisso Reaberto', `"${appt.title}" voltou para a agenda.`, 'schedule');
                                  }
                                }}
                                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 shadow-xs ${
                                  isCompleted
                                    ? 'bg-[#e6e8ea] hover:bg-[#d8dadc] text-[#45464e]'
                                    : 'bg-[#00a673] hover:bg-[#008f63] text-white'
                                }`}
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  {isCompleted ? 'undo' : 'task_alt'}
                                </span>
                                <span>{isCompleted ? 'Desmarcar (Reabrir)' : 'Marcar como Realizado! 🎉'}</span>
                              </button>
                            ) : (
                              <div className="text-xs text-[#76777f]">
                                {isCompleted ? 'Compromisso finalizado' : 'Aguardando data e horário'}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Store Tab */}
        {activeTab === 'store' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-base font-extrabold text-[#081534]">
                Escolha o que você quer resgatar!
              </h2>
              <span className="text-xs text-[#855300] font-bold">
                Seu saldo: {currentKid.pointsBalance} {currencyName}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {availableRewards.map((reward) => {
                const canAfford = currentKid.pointsBalance >= reward.cost;

                return (
                  <div
                    key={reward.id}
                    className="bg-white rounded-2xl p-5 shadow-xs border border-[#e0e3e5]/70 flex flex-col justify-between gap-3 hover:shadow-md transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="p-3 bg-[#fea619]/20 text-[#855300] rounded-2xl text-2xl">
                          <span className="material-symbols-outlined text-[28px]">
                            {reward.icon}
                          </span>
                        </div>
                        <div className="font-extrabold text-sm text-[#855300] bg-[#ffddb8]/40 px-2.5 py-0.5 rounded-full">
                          {reward.cost} {currencyName}
                        </div>
                      </div>

                      <h3 className="text-sm font-bold text-[#191c1e] mt-3">
                        {reward.title}
                      </h3>
                      <p className="text-xs text-[#45464e] mt-1">
                        {reward.description}
                      </p>
                    </div>

                    <button
                      disabled={!canAfford}
                      onClick={() => onRequestRewardByKid(reward.id, effectiveKidId)}
                      className={`w-full py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        canAfford
                          ? 'bg-[#fea619] hover:bg-[#ffddb8] text-[#2a1700] shadow-sm active:scale-95'
                          : 'bg-[#f2f4f6] text-[#76777f] cursor-not-allowed'
                      }`}
                    >
                      {canAfford ? 'Quero Este Prêmio! 🎁' : `Faltam ${reward.cost - currentKid.pointsBalance} ${currencyName}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Sair do Aplicativo?"
        message="Deseja realmente sair da conta e voltar para a tela inicial de seleção de usuário?"
        confirmLabel="Sair do App"
        cancelLabel="Cancelar"
        variant="danger"
        icon="logout"
        onConfirm={() => {
          if (onLogout) {
            onLogout();
          } else {
            localStorage.removeItem('familyflow_user');
            window.location.reload();
          }
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
};
