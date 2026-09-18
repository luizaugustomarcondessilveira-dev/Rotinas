import React, { useState, useEffect } from 'react';
import { Appointment, Member, RoutineTask, DAYS_OF_WEEK } from '../types';

interface AppointmentsViewProps {
  appointments: Appointment[];
  tasks?: RoutineTask[];
  members: Member[];
  onAddAppointment: (appt: Omit<Appointment, 'id' | 'status'>) => void;
  onToggleStatus: (apptId: string) => void;
  onDeleteAppointment?: (apptId: string) => void;
  showToast: (title: string, desc: string, icon?: string) => void;
  isKidMode?: boolean;
  menuLabels?: Record<string, string>;
}

export const AppointmentsView: React.FC<AppointmentsViewProps> = ({
  appointments,
  tasks = [],
  members,
  onAddAppointment,
  onToggleStatus,
  onDeleteAppointment,
  showToast,
  isKidMode = false,
  menuLabels
}) => {
  const [selectedChildId, setSelectedChildId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'separated' | 'calendar' | 'list'>('separated');
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number>(() => new Date().getDay());

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);

  const children = members.filter((m) => m.role === 'child');

  // Helper to count appointments for a child
  const getApptCountForChild = (childId: string) => {
    return appointments.filter((a) => a.participants && a.participants.includes(childId)).length;
  };

  // Only children who actually have scheduled appointments
  const childrenWithAppointments = children.filter((child) => getApptCountForChild(child.id) > 0);

  // Auto fallback to 'all' if selected child has no appointments scheduled
  useEffect(() => {
    if (selectedChildId !== 'all' && !childrenWithAppointments.some((c) => c.id === selectedChildId)) {
      setSelectedChildId('all');
    }
  }, [childrenWithAppointments, selectedChildId]);

  // Filtered Appointments based on child filter
  const filteredAppointments = appointments.filter((appt) => {
    if (selectedChildId === 'all') return true;
    return appt.participants && appt.participants.includes(selectedChildId);
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date || !time) return;

    // Convert input YYYY-MM-DD to DD/MM/YYYY
    const [year, month, day] = date.split('-');
    const formattedDate = `${day}/${month}/${year}`;

    onAddAppointment({
      title,
      date: formattedDate,
      time,
      notes,
      participants: participants.length > 0 ? participants : (children.length > 0 ? [children[0].id] : []),
      createdBy: 'user'
    });

    setIsAddModalOpen(false);
    setTitle('');
    setDate('');
    setTime('');
    setNotes('');
    setParticipants([]);
    showToast('Compromisso Adicionado!', `"${title}" foi agendado com sucesso.`, 'event');
  };

  const toggleParticipant = (memberId: string) => {
    if (participants.includes(memberId)) {
      setParticipants((prev) => prev.filter((p) => p !== memberId));
    } else {
      setParticipants((prev) => [...prev, memberId]);
    }
  };

  // Helper to count recurring tasks for a child
  const getTasksForChild = (childId: string) => {
    return tasks.filter((t) => t.assigneeId === childId);
  };

  // Helper to get recurring tasks for a specific day of the week
  const getTasksForDay = (dayId: number, childId?: string) => {
    return tasks.filter((t) => {
      if (childId && childId !== 'all') {
        return t.assigneeId === childId && (!t.daysOfWeek || t.daysOfWeek.length === 0 || t.daysOfWeek.includes(dayId));
      }
      // If showing all, only include tasks belonging to children that have scheduled appointments
      const childHasAppts = childrenWithAppointments.some((c) => c.id === t.assigneeId);
      if (!childHasAppts) return false;

      const matchDay = !t.daysOfWeek || t.daysOfWeek.length === 0 || t.daysOfWeek.includes(dayId);
      return matchDay;
    });
  };

  // Helper to get appointments for a specific day of week
  const getAppointmentsForDay = (dayId: number, childId?: string) => {
    return appointments.filter((appt) => {
      const matchChild = !childId || childId === 'all' || (appt.participants && appt.participants.includes(childId));
      if (!matchChild) return false;

      // Attempt parsing date (DD/MM/YYYY or YYYY-MM-DD)
      try {
        let d: Date | null = null;
        if (appt.date.includes('/')) {
          const parts = appt.date.split('/');
          if (parts.length === 3) {
            d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
          }
        } else if (appt.date.includes('-')) {
          d = new Date(appt.date);
        }
        if (d && !isNaN(d.getTime())) {
          return d.getDay() === dayId;
        }
      } catch {
        return false;
      }
      return false;
    });
  };

  const displayedChildren = selectedChildId === 'all'
    ? childrenWithAppointments
    : childrenWithAppointments.filter((c) => c.id === selectedChildId);

  const todayDayOfWeek = new Date().getDay();

  return (
    <div className="flex flex-col w-full pb-12 gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-6 rounded-2xl shadow-xs border border-[#e0e3e5]/60 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#081534] text-[26px]">calendar_month</span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#081534]">
              {isKidMode ? 'Nossos Compromissos' : (menuLabels?.['compromissos'] || 'Gestão de Compromissos')}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#45464e] mt-1">
            {isKidMode
              ? 'Acompanhe as atividades, aulas e consultas agendadas para você e sua família.'
              : 'Visualize os filhos com compromissos agendados e acompanhe a integração com o calendário semanal.'}
          </p>
        </div>

        {!isKidMode && (
          <button
            onClick={() => {
              // Pre-select current filtered child if any
              if (selectedChildId !== 'all') {
                setParticipants([selectedChildId]);
              } else if (children.length > 0) {
                setParticipants([children[0].id]);
              }
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-[#081534] hover:bg-[#1e2a4a] text-white px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold shadow-xs transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Novo Compromisso</span>
          </button>
        )}
      </div>

      {/* Control Bar: Filter by Child & View Mode */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-[#e0e3e5]/70 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Child Filter - ONLY SHOW CHILDREN WITH SCHEDULED APPOINTMENTS */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#081534]">
              <span className="material-symbols-outlined text-[16px] text-[#fea619]">face</span>
              <span>Filtrar por Filho com Compromisso:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedChildId('all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  selectedChildId === 'all'
                    ? 'bg-[#081534] text-white border-[#081534] shadow-xs'
                    : 'bg-white text-[#45464e] border-[#e0e3e5] hover:bg-[#f2f4f6]'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">groups</span>
                <span>Todos com Compromisso</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  selectedChildId === 'all' ? 'bg-white/20 text-white' : 'bg-[#e0e3e5] text-[#191c1e]'
                }`}>
                  {childrenWithAppointments.length}
                </span>
              </button>

              {childrenWithAppointments.map((child) => {
                const isSelected = selectedChildId === child.id;
                const count = getApptCountForChild(child.id);
                return (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => setSelectedChildId(child.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-[#081534] text-white border-[#081534] shadow-xs ring-2 ring-[#081534]/20'
                        : 'bg-white text-[#45464e] border-[#e0e3e5] hover:bg-[#f2f4f6]'
                    }`}
                  >
                    <img
                      src={child.avatar}
                      alt={child.name}
                      className="w-5 h-5 rounded-full object-cover border border-white"
                    />
                    <span>{child.name}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-[#e0e3e5] text-[#191c1e]'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}

              {childrenWithAppointments.length === 0 && (
                <span className="text-xs text-[#76777f] italic bg-[#f8f9fa] px-3 py-1.5 rounded-xl border border-dashed border-[#e0e3e5]">
                  Nenhum filho possui compromisso agendado no momento.
                </span>
              )}
            </div>
          </div>

          {/* View Mode Switcher */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#081534]">
              <span className="material-symbols-outlined text-[16px] text-[#00388f]">visibility</span>
              <span>Modo de Visualização:</span>
            </div>
            <div className="flex bg-[#f2f4f6] p-1 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setViewMode('separated')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'separated'
                    ? 'bg-white text-[#081534] shadow-xs'
                    : 'text-[#76777f] hover:text-[#191c1e]'
                }`}
                title="Visualizar compromissos separados por filho"
              >
                <span className="material-symbols-outlined text-[16px]">view_column</span>
                <span>Separados por Filho</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'calendar'
                    ? 'bg-white text-[#081534] shadow-xs'
                    : 'text-[#76777f] hover:text-[#191c1e]'
                }`}
                title="Calendário integrado com rotinas semanais"
              >
                <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                <span>Calendário Integrado</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white text-[#081534] shadow-xs'
                    : 'text-[#76777f] hover:text-[#191c1e]'
                }`}
                title="Lista corrida de compromissos"
              >
                <span className="material-symbols-outlined text-[16px]">format_list_bulleted</span>
                <span>Lista Geral</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODE 1: SEPARADOS POR FILHO (Requested by user) */}
      {viewMode === 'separated' && (
        <div className="space-y-6">
          {displayedChildren.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border border-[#e0e3e5] shadow-xs flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-full bg-[#dae2ff]/50 flex items-center justify-center text-[#00388f]">
                <span className="material-symbols-outlined text-[32px]">event_busy</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#081534]">
                Nenhum filho com compromisso agendado
              </h3>
              <p className="text-xs sm:text-sm text-[#45464e] max-w-md">
                Nesta aba, os filhos só são exibidos na lista se houver compromissos agendados para eles. Cadastre um novo compromisso para visualizá-los aqui.
              </p>
              {!isKidMode && (
                <button
                  type="button"
                  onClick={() => {
                    if (children.length > 0) setParticipants([children[0].id]);
                    setIsAddModalOpen(true);
                  }}
                  className="mt-2 flex items-center gap-1.5 bg-[#081534] hover:bg-[#1e2a4a] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  <span>Agendar Compromisso</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {displayedChildren.map((child) => {
                const childAppts = appointments.filter(
                  (a) => a.participants && a.participants.includes(child.id)
                );
                const childTasks = getTasksForChild(child.id);
                const todayTasks = childTasks.filter(
                  (t) => !t.daysOfWeek || t.daysOfWeek.length === 0 || t.daysOfWeek.includes(todayDayOfWeek)
                );

                return (
                  <div
                    key={child.id}
                    className="bg-white rounded-2xl shadow-xs border border-[#e0e3e5] overflow-hidden flex flex-col justify-between"
                  >
                    {/* Child Section Header */}
                    <div className="bg-gradient-to-r from-[#dae2ff]/40 to-[#eef2f6] p-4 sm:p-5 border-b border-[#e0e3e5] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={child.avatar}
                          alt={child.name}
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-[#081534] shadow-xs"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-base font-extrabold text-[#081534]">{child.name}</h2>
                            <span className="text-[11px] font-bold text-[#76777f]">({child.age} anos)</span>
                          </div>
                          <p className="text-xs text-[#45464e] mt-0.5">
                            Saldo: <strong className="text-[#855300]">{child.pointsBalance} pts</strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs font-extrabold bg-[#081534] text-white px-2.5 py-0.5 rounded-full shadow-2xs">
                          {childAppts.length} compromisso{childAppts.length !== 1 ? 's' : ''}
                        </span>
                        <span className="text-[11px] font-bold text-[#00a673] bg-[#00a673]/10 px-2 py-0.5 rounded-full">
                          {todayTasks.length} rotinas hoje
                        </span>
                      </div>
                    </div>

                    {/* Body: Appointments & Routine Tasks for this Child */}
                    <div className="p-4 sm:p-5 space-y-5 flex-1">
                      {/* Subsection: Appointments */}
                      <div>
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="text-xs font-bold text-[#081534] uppercase tracking-wider flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[15px] text-[#fea619]">event</span>
                            Compromissos Agendados ({childAppts.length})
                          </span>
                        </div>

                        {childAppts.length === 0 ? (
                          <div className="bg-[#f8f9fa] rounded-xl p-3.5 text-center text-xs text-[#76777f] border border-dashed border-[#e0e3e5]">
                            Nenhum compromisso exclusivo agendado para {child.name}.
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {childAppts.map((appt) => {
                              const isCompleted = appt.status === 'completed';
                              return (
                                <div
                                  key={appt.id}
                                  className={`p-3.5 rounded-xl border transition-all text-xs flex flex-col justify-between gap-2.5 ${
                                    isCompleted
                                      ? 'bg-[#f7fdfa] border-[#00a673]/40 opacity-85'
                                      : 'bg-white border-[#e0e3e5] hover:border-[#081534]/40 shadow-xs'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#081534] bg-[#f2f4f6] px-2 py-0.5 rounded-md inline-flex mb-1">
                                        <span className="material-symbols-outlined text-[13px] text-[#fea619]">
                                          calendar_today
                                        </span>
                                        <span>{appt.date} às {appt.time}</span>
                                      </div>
                                      <h4 className={`font-bold text-sm ${isCompleted ? 'text-[#76777f] line-through' : 'text-[#191c1e]'}`}>
                                        {appt.title}
                                      </h4>
                                      {appt.notes && (
                                        <p className="text-[11px] text-[#76777f] italic mt-0.5">"{appt.notes}"</p>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => onToggleStatus(appt.id)}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 whitespace-nowrap ${
                                          isCompleted
                                            ? 'bg-[#00a673]/15 text-[#00a673] hover:bg-[#00a673]/25'
                                            : 'bg-[#081534] text-white hover:bg-[#1a2542]'
                                        }`}
                                      >
                                        <span className="material-symbols-outlined text-[13px]">
                                          {isCompleted ? 'check_circle' : 'radio_button_unchecked'}
                                        </span>
                                        <span>{isCompleted ? 'Realizado' : 'Concluir'}</span>
                                      </button>
                                      {onDeleteAppointment && !isKidMode && (
                                        <button
                                          type="button"
                                          onClick={() => onDeleteAppointment(appt.id)}
                                          className="p-1 rounded-lg text-[#76777f] hover:text-[#ba1a1a] hover:bg-[#ba1a1a]/10 cursor-pointer transition-colors"
                                          title="Excluir compromisso"
                                        >
                                          <span className="material-symbols-outlined text-[16px]">delete</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                    {/* Subsection: Recurring Routines for this Child */}
                    <div className="pt-3 border-t border-[#e0e3e5]">
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-xs font-bold text-[#081534] uppercase tracking-wider flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[15px] text-[#00388f]">repeat</span>
                          Rotinas Semanais Atribuídas ({childTasks.length})
                        </span>
                      </div>

                      {childTasks.length === 0 ? (
                        <div className="bg-[#f8f9fa] rounded-xl p-3.5 text-center text-xs text-[#76777f] border border-dashed border-[#e0e3e5]">
                          Nenhuma rotina atribuída a {child.name}.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {childTasks.map((task) => {
                            const isScheduledToday = !task.daysOfWeek || task.daysOfWeek.length === 0 || task.daysOfWeek.includes(todayDayOfWeek);
                            return (
                              <div
                                key={task.id}
                                className="p-3 bg-[#f8f9fa] hover:bg-[#f2f4f6] rounded-xl border border-[#e0e3e5]/70 flex items-center justify-between gap-2 text-xs transition-colors"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-[#191c1e]">{task.title}</span>
                                    {isScheduledToday && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#00a673]/15 text-[#00a673]">
                                        Hoje
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 text-[10px] text-[#76777f] flex-wrap">
                                    <span className="bg-white px-1.5 py-0.5 rounded border border-[#e0e3e5]">
                                      {(!task.daysOfWeek || task.daysOfWeek.length === 7)
                                        ? 'Todos os dias'
                                        : task.daysOfWeek.map((d) => DAYS_OF_WEEK.find((dw) => dw.id === d)?.short).join(', ')}
                                    </span>
                                    <span>• {task.category}</span>
                                    <span>• ~{task.expectedDurationMinutes || 15} min</span>
                                  </div>
                                </div>

                                <div className="font-extrabold text-[#855300] bg-[#ffddb8]/40 px-2 py-0.5 rounded-full text-xs shrink-0">
                                  +{task.basePoints} pts
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

          {/* Family / General Appointments if any without child */}
          {selectedChildId === 'all' && (
            (() => {
              const generalAppts = appointments.filter(
                (a) => !a.participants || a.participants.every((pId) => !children.some((c) => c.id === pId))
              );
              if (generalAppts.length === 0) return null;

              return (
                <div className="bg-white rounded-2xl p-5 shadow-xs border border-[#e0e3e5] space-y-3">
                  <h3 className="text-sm font-extrabold text-[#081534] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#76777f]">diversity_3</span>
                    <span>Compromissos Gerais da Família ({generalAppts.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {generalAppts.map((appt) => (
                      <div
                        key={appt.id}
                        className="p-3.5 rounded-xl border border-[#e0e3e5] bg-[#f8f9fa] flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="text-[11px] font-bold text-[#76777f]">{appt.date} às {appt.time}</div>
                          <div className="font-bold text-[#191c1e]">{appt.title}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onToggleStatus(appt.id)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#081534] text-white cursor-pointer"
                        >
                          {appt.status === 'completed' ? 'Reabrir' : 'Concluir'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* MODE 2: CALENDÁRIO INTEGRADO (Requested: integrar com o calendário e dias da semana) */}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-2xl shadow-xs border border-[#e0e3e5] p-5 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e0e3e5] pb-4">
            <div>
              <h2 className="text-base font-extrabold text-[#081534] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#fea619] text-[22px]">calendar_today</span>
                <span>Calendário Semanal Integrado: Compromissos & Rotinas</span>
              </h2>
              <p className="text-xs text-[#76777f] mt-0.5">
                Visualize os dias da semana em que as tarefas precisam ser realizadas juntamente com os compromissos agendados.
              </p>
            </div>
            {selectedChildId !== 'all' && (
              <span className="text-xs font-bold bg-[#dae2ff] text-[#0d1a39] px-3 py-1 rounded-full self-start sm:self-auto">
                Filtrado por: {members.find((m) => m.id === selectedChildId)?.name}
              </span>
            )}
          </div>

          {/* 7 Days of the Week Selector Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {DAYS_OF_WEEK.map((day) => {
              const isSelected = selectedDayOfWeek === day.id;
              const isToday = todayDayOfWeek === day.id;
              const dayAppts = getAppointmentsForDay(day.id, selectedChildId);
              const dayTasks = getTasksForDay(day.id, selectedChildId);

              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => setSelectedDayOfWeek(day.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 relative ${
                    isSelected
                      ? 'bg-[#081534] text-white border-[#081534] shadow-md ring-2 ring-[#081534]/20'
                      : 'bg-[#f8f9fa] text-[#191c1e] border-[#e0e3e5] hover:bg-[#f2f4f6]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs">{day.label}</span>
                    {isToday && (
                      <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                        isSelected ? 'bg-[#6ffbbe] text-[#003220]' : 'bg-[#00a673] text-white'
                      }`}>
                        HOJE
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 pt-1">
                    <div className={`text-[10px] font-semibold flex items-center gap-1 ${
                      isSelected ? 'text-white/80' : 'text-[#76777f]'
                    }`}>
                      <span className="material-symbols-outlined text-[12px] text-[#fea619]">event</span>
                      <span>{dayAppts.length} compromisso{dayAppts.length !== 1 ? 's' : ''}</span>
                    </div>

                    <div className={`text-[10px] font-semibold flex items-center gap-1 ${
                      isSelected ? 'text-white/80' : 'text-[#00a673]'
                    }`}>
                      <span className="material-symbols-outlined text-[12px]">repeat</span>
                      <span>{dayTasks.length} rotina{dayTasks.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Day Details Panel */}
          {(() => {
            const currentSelectedDay = DAYS_OF_WEEK.find((d) => d.id === selectedDayOfWeek) || DAYS_OF_WEEK[0];
            const dayAppts = getAppointmentsForDay(selectedDayOfWeek, selectedChildId);
            const dayTasks = getTasksForDay(selectedDayOfWeek, selectedChildId);

            return (
              <div className="bg-[#f8f9fa] rounded-2xl p-5 border border-[#e0e3e5] space-y-5">
                <div className="flex items-center justify-between border-b border-[#e0e3e5] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-[#081534]">schedule</span>
                    <h3 className="text-sm sm:text-base font-extrabold text-[#081534]">
                      Agenda de {currentSelectedDay.label}
                    </h3>
                  </div>
                  <span className="text-xs text-[#76777f] font-semibold">
                    {dayAppts.length} compromissos e {dayTasks.length} atividades programadas
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Column 1: Appointments on this day */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#081534] uppercase tracking-wider">
                      <span className="material-symbols-outlined text-[16px] text-[#fea619]">event</span>
                      <span>Compromissos Agendados ({dayAppts.length})</span>
                    </div>

                    {dayAppts.length === 0 ? (
                      <div className="bg-white rounded-xl p-4 text-center text-xs text-[#76777f] border border-dashed border-[#e0e3e5]">
                        Nenhum compromisso agendado para este dia.
                      </div>
                    ) : (
                      dayAppts.map((appt) => (
                        <div
                          key={appt.id}
                          className="bg-white p-3.5 rounded-xl border border-[#e0e3e5] shadow-2xs space-y-2 text-xs"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="font-bold text-[#191c1e] text-sm">{appt.title}</span>
                              <div className="text-[#76777f] text-[11px] mt-0.5">
                                🕒 {appt.time} • Data: {appt.date}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => onToggleStatus(appt.id)}
                                className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${
                                  appt.status === 'completed'
                                    ? 'bg-[#00a673]/15 text-[#00a673]'
                                    : 'bg-[#081534] text-white'
                                }`}
                              >
                                {appt.status === 'completed' ? 'Realizado ✓' : 'Concluir'}
                              </button>
                              {onDeleteAppointment && !isKidMode && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteAppointment(appt.id)}
                                  className="p-1 rounded text-[#76777f] hover:text-[#ba1a1a] hover:bg-[#ba1a1a]/10 cursor-pointer transition-colors"
                                  title="Excluir compromisso"
                                >
                                  <span className="material-symbols-outlined text-[15px]">delete</span>
                                </button>
                              )}
                            </div>
                          </div>
                          {appt.notes && <p className="text-[#76777f] italic text-[11px]">"{appt.notes}"</p>}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Column 2: Recurring Tasks on this day */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#081534] uppercase tracking-wider">
                      <span className="material-symbols-outlined text-[16px] text-[#00a673]">task_alt</span>
                      <span>Rotinas que precisam ser realizadas ({dayTasks.length})</span>
                    </div>

                    {dayTasks.length === 0 ? (
                      <div className="bg-white rounded-xl p-4 text-center text-xs text-[#76777f] border border-dashed border-[#e0e3e5]">
                        Nenhuma rotina configurada para este dia da semana.
                      </div>
                    ) : (
                      dayTasks.map((task) => {
                        const assignee = members.find((m) => m.id === task.assigneeId);
                        return (
                          <div
                            key={task.id}
                            className="bg-white p-3.5 rounded-xl border border-[#e0e3e5] shadow-2xs flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-[#191c1e]">{task.title}</span>
                                <span className="text-[10px] font-semibold text-[#00388f] bg-[#dae2ff]/50 px-1.5 py-0.2 rounded">
                                  {task.category}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-[#76777f]">
                                {assignee && (
                                  <span className="flex items-center gap-1 font-semibold text-[#191c1e]">
                                    <img src={assignee.avatar} alt={assignee.name} className="w-3.5 h-3.5 rounded-full" />
                                    {assignee.name}
                                  </span>
                                )}
                                <span>• Duração: ~{task.expectedDurationMinutes || 15} min</span>
                              </div>
                            </div>

                            <div className="font-extrabold text-[#855300] bg-[#ffddb8]/40 px-2.5 py-1 rounded-full text-xs shrink-0">
                              +{task.basePoints} pts
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* MODE 3: LISTA GERAL */}
      {viewMode === 'list' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {filteredAppointments.map((appt) => {
            const isCompleted = appt.status === 'completed';
            return (
              <div
                key={appt.id}
                className={`bg-white rounded-xl p-5 shadow-xs border flex flex-col justify-between gap-4 transition-all ${
                  isCompleted ? 'border-[#00a673]/50 opacity-80 bg-[#f7fdfa]' : 'border-[#e0e3e5]/60 hover:shadow-md'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 text-[#081534] font-bold text-sm bg-[#f2f4f6] px-3 py-1 rounded-full">
                      <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                      {appt.date} às {appt.time}
                    </div>

                    {isCompleted ? (
                      <span className="px-2 py-0.5 rounded bg-[#00a673]/10 text-[#00a673] text-[10px] font-bold uppercase tracking-wider">
                        Concluído
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-[#fea619]/10 text-[#855300] text-[10px] font-bold uppercase tracking-wider">
                        Pendente
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className={`text-base font-bold ${isCompleted ? 'text-[#45464e] line-through' : 'text-[#191c1e]'}`}>
                      {appt.title}
                    </h3>
                    {appt.notes && (
                      <p className="text-xs text-[#76777f] mt-1 italic">"{appt.notes}"</p>
                    )}
                  </div>

                  {/* Participants */}
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-[10px] text-[#45464e] font-semibold uppercase tracking-wider">
                      Envolvidos:
                    </span>
                    <div className="flex -space-x-2 overflow-hidden">
                      {appt.participants.map((pId) => {
                        const member = members.find((m) => m.id === pId);
                        return member ? (
                          <img
                            key={pId}
                            className="inline-block h-6 w-6 rounded-full ring-2 ring-white object-cover"
                            src={member.avatar}
                            alt={member.name}
                            title={member.name}
                          />
                        ) : null;
                      })}
                    </div>
                  </div>
                </div>

                {!isKidMode && (
                  <div className="pt-3 border-t border-[#e0e3e5]/50 flex items-center justify-end gap-2">
                    {onDeleteAppointment && (
                      <button
                        type="button"
                        onClick={() => onDeleteAppointment(appt.id)}
                        className="px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 text-[#ba1a1a] hover:bg-[#ba1a1a]/10 border border-[#ba1a1a]/30 cursor-pointer active:scale-95 transition-all"
                        title="Excluir este compromisso"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                        <span>Excluir</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onToggleStatus(appt.id)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all ${
                        isCompleted
                          ? 'bg-[#e6e8ea] text-[#45464e] hover:bg-[#d8dadc]'
                          : 'bg-[#00a673] text-white hover:bg-[#008f63]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {isCompleted ? 'undo' : 'check_circle'}
                      </span>
                      {isCompleted ? 'Reabrir Compromisso' : 'Marcar Realizado'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {filteredAppointments.length === 0 && (
            <div className="col-span-full p-8 text-center text-[#76777f] bg-white rounded-xl border border-[#e0e3e5]/60">
              Nenhum compromisso agendado para o filtro selecionado.
            </div>
          )}
        </div>
      )}

      {/* Add Modal */}
      {isAddModalOpen && !isKidMode && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#081534] text-[24px]">event_available</span>
                <h3 className="text-base font-bold text-[#081534]">Agendar Compromisso</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#76777f] hover:text-[#191c1e] p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#45464e] font-semibold mb-1">Título:</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Treino de Natação, Pediatra, Aula de Robótica..."
                  className="w-full p-2.5 rounded-lg border border-[#e0e3e5] text-xs font-semibold text-[#191c1e] outline-none focus:border-[#1e2a4a]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#45464e] font-semibold mb-1">Data:</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-[#e0e3e5] text-xs font-semibold text-[#191c1e] outline-none focus:border-[#1e2a4a]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#45464e] font-semibold mb-1">Hora:</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-[#e0e3e5] text-xs font-semibold text-[#191c1e] outline-none focus:border-[#1e2a4a]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#45464e] font-semibold mb-1">Filho / Envolvidos:</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {members.map((member) => (
                    <button
                      type="button"
                      key={member.id}
                      onClick={() => toggleParticipant(member.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors cursor-pointer border ${
                        participants.includes(member.id)
                          ? 'bg-[#081534] text-white border-[#081534]'
                          : 'bg-white text-[#45464e] border-[#e0e3e5] hover:bg-[#f2f4f6]'
                      }`}
                    >
                      <img src={member.avatar} alt={member.name} className="w-4 h-4 rounded-full object-cover" />
                      {member.name} {member.role === 'child' ? '⭐' : ''}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[#45464e] font-semibold mb-1">Observações (opcional):</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Lembretes adicionais..."
                  className="w-full p-2.5 rounded-lg border border-[#e0e3e5] text-xs text-[#191c1e] outline-none focus:border-[#1e2a4a]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#e6e8ea] text-[#45464e] font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#081534] text-white font-bold cursor-pointer shadow-xs active:scale-95"
                >
                  Agendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
