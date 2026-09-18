import React, { useState } from 'react';
import { RoutineTask, Member, DAYS_OF_WEEK } from '../types';
import { ConfirmDialog, ConfirmDialogProps } from '../components/ConfirmDialog';

interface CatalogViewProps {
  tasks: RoutineTask[];
  members: Member[];
  onOpenNewActivity: () => void;
  onUpdateTask?: (task: RoutineTask) => void;
  onDeleteTask?: (taskId: string) => void;
  showToast: (title: string, desc: string, icon?: string) => void;
  currencyName: string;
  menuLabels?: Record<string, string>;
}

export const CatalogView: React.FC<CatalogViewProps> = ({
  tasks,
  members,
  onOpenNewActivity,
  onUpdateTask,
  onDeleteTask,
  showToast,
  currencyName,
  menuLabels
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedChild, setSelectedChild] = useState<string>('all');
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogProps | null>(null);

  // Edit Task Modal State
  const [editingTask, setEditingTask] = useState<RoutineTask | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<RoutineTask['category']>('Organização');
  const [editAssigneeId, setEditAssigneeId] = useState('');
  const [editBasePoints, setEditBasePoints] = useState(50);
  const [editDaysOfWeek, setEditDaysOfWeek] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [editExpectedDuration, setEditExpectedDuration] = useState(15);
  const [editAcceptanceCriteria, setEditAcceptanceCriteria] = useState('');
  const [editHasPhotoEvidence, setEditHasPhotoEvidence] = useState(false);

  const categories = ['all', 'Organização', 'Estudos', 'Higiene', 'Convivência'];

  const filtered = tasks.filter((t) => {
    const matchCat = selectedCategory === 'all' || t.category === selectedCategory;
    const matchChild = selectedChild === 'all' || t.assigneeId === selectedChild;
    return matchCat && matchChild;
  });

  const handleOpenEditModal = (task: RoutineTask) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditCategory(task.category);
    setEditAssigneeId(task.assigneeId);
    setEditBasePoints(task.basePoints);
    setEditDaysOfWeek(task.daysOfWeek && task.daysOfWeek.length > 0 ? task.daysOfWeek : [0, 1, 2, 3, 4, 5, 6]);
    setEditExpectedDuration(task.expectedDurationMinutes || 15);
    setEditAcceptanceCriteria(task.acceptanceCriteria || '');
    setEditHasPhotoEvidence(Boolean(task.hasPhotoEvidence));
  };

  const toggleEditDay = (dayId: number) => {
    if (editDaysOfWeek.includes(dayId)) {
      if (editDaysOfWeek.length > 1) {
        setEditDaysOfWeek(editDaysOfWeek.filter((d) => d !== dayId));
      }
    } else {
      setEditDaysOfWeek([...editDaysOfWeek, dayId].sort((a, b) => a - b));
    }
  };

  const handleSetEditPreset = (preset: 'all' | 'weekdays' | 'weekend') => {
    if (preset === 'all') setEditDaysOfWeek([0, 1, 2, 3, 4, 5, 6]);
    if (preset === 'weekdays') setEditDaysOfWeek([1, 2, 3, 4, 5]);
    if (preset === 'weekend') setEditDaysOfWeek([0, 6]);
  };

  const handleSaveEditedTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !onUpdateTask) return;

    const updated: RoutineTask = {
      ...editingTask,
      title: editTitle.trim() || editingTask.title,
      category: editCategory,
      assigneeId: editAssigneeId || editingTask.assigneeId,
      basePoints: Number(editBasePoints),
      finalPoints: Number(editBasePoints),
      daysOfWeek: editDaysOfWeek,
      expectedDurationMinutes: Number(editExpectedDuration),
      acceptanceCriteria: editAcceptanceCriteria.trim(),
      hasPhotoEvidence: editHasPhotoEvidence
    };

    onUpdateTask(updated);
    setEditingTask(null);
  };

  const handleRequestDeleteTask = () => {
    if (!editingTask || !onDeleteTask) return;
    setConfirmDialog({
      isOpen: true,
      isAlert: false,
      title: `Excluir "${editingTask.title}"?`,
      message: `Tem certeza que deseja excluir esta rotina do catálogo? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir Atividade',
      cancelLabel: 'Cancelar',
      variant: 'danger',
      icon: 'delete',
      onConfirm: () => {
        try {
          const taskTitle = editingTask.title;
          onDeleteTask(editingTask.id);
          try {
            const raw = localStorage.getItem('familyflow_tasks');
            if (raw) {
              const list: RoutineTask[] = JSON.parse(raw);
              localStorage.setItem('familyflow_tasks', JSON.stringify(list.filter(t => t.id !== editingTask.id)));
            }
          } catch (e) {
            console.error('Erro ao atualizar localStorage para tarefas:', e);
          }
          setConfirmDialog(null);
          setEditingTask(null);
          showToast('Atividade Removida!', `A rotina "${taskTitle}" foi excluída com sucesso.`, 'delete');
        } catch (err) {
          console.error('Erro ao excluir tarefa:', err);
          showToast('Erro', 'Não foi possível excluir a rotina.', 'error');
        }
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  return (
    <div className="flex flex-col w-full pb-12 gap-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-6 rounded-2xl shadow-xs border border-[#e0e3e5]/60 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--theme-color,#081534)] text-[24px]">checklist</span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--theme-color,#081534)]">
              {menuLabels?.['catalogo-de-atividades'] || 'Catálogo de Atividades & Rotinas'}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#45464e] mt-1">
            Configure as tarefas educativas, horários limites, critérios de aceite e pontuações por filho.
          </p>
        </div>

        <button
          onClick={onOpenNewActivity}
          className="flex items-center gap-1.5 text-white px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold shadow-xs transition-all active:scale-95 cursor-pointer self-start sm:self-auto hover:opacity-90"
          style={{ backgroundColor: 'var(--theme-color, #081534)' }}
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Nova Atividade</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl shadow-xs border border-[#e0e3e5]/60">
        {/* Categories */}
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'text-white'
                  : 'bg-[#f2f4f6] text-[#45464e] hover:bg-[#e6e8ea]'
              }`}
              style={selectedCategory === cat ? { backgroundColor: 'var(--theme-color, #081534)' } : undefined}
            >
              {cat === 'all' ? 'Todas as Categorias' : cat}
            </button>
          ))}
        </div>

        {/* Child Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#45464e] font-semibold">Filho:</span>
          <select
            value={selectedChild}
            onChange={(e) => setSelectedChild(e.target.value)}
            className="text-xs font-bold bg-[#f2f4f6] text-[#191c1e] px-3 py-1.5 rounded-lg border border-[#e0e3e5] cursor-pointer outline-none"
          >
            <option value="all">Todos os Filhos</option>
            {members.filter(m => m.role === 'child').map(child => (
              <option key={child.id} value={child.id}>{child.name} ({child.age}a)</option>
            ))}
          </select>
        </div>
      </div>

      {/* Activities Grid or Empty State */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-[#e0e3e5]/60 flex flex-col items-center justify-center space-y-3 shadow-xs">
          <div className="w-14 h-14 rounded-full bg-[#f2f4f6] text-[var(--theme-color,#081534)] flex items-center justify-center">
            <span className="material-symbols-outlined text-[32px]">checklist_rtl</span>
          </div>
          <h3 className="text-base font-bold text-[#191c1e]">Nenhuma atividade encontrada</h3>
          <p className="text-xs text-[#45464e] max-w-sm">
            {tasks.length === 0
              ? 'O catálogo está vazio. Comece cadastrando as primeiras rotinas da família!'
              : 'Nenhuma atividade coincide com os filtros selecionados.'}
          </p>
          <button
            onClick={onOpenNewActivity}
            className="mt-2 flex items-center gap-2 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs hover:opacity-90 transition-all cursor-pointer"
            style={{ backgroundColor: 'var(--theme-color, #081534)' }}
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Cadastrar Nova Atividade</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filtered.map((task) => {
            const child = members.find((m) => m.id === task.assigneeId);
            return (
              <div
                key={task.id}
                className="bg-white rounded-xl p-5 shadow-xs border border-[#e0e3e5]/60 flex flex-col justify-between hover:shadow-md transition-all gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#dae2ff] text-[#0d1a39] text-[11px] font-bold">
                        {task.taskCode}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 text-[10px] font-semibold">
                        {task.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-sm font-extrabold text-[#855300] bg-[#ffddb8]/40 px-2.5 py-0.5 rounded-full">
                      <span className="material-symbols-outlined text-[15px] text-[#fea619]">toll</span>
                      +{task.basePoints} {currencyName}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-[#191c1e] leading-snug">{task.title}</h3>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-[#45464e]">
                      {child?.avatar ? (
                        <img
                          className="w-5 h-5 rounded-full object-cover"
                          alt={child?.name}
                          src={child.avatar}
                        />
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-[#e0e3e5] flex items-center justify-center text-[10px] font-bold">
                          {child?.name?.[0] || '?'}
                        </span>
                      )}
                      <span>Atribuído a: <strong className="text-[#191c1e]">{child?.name || 'Não atribuído'}</strong></span>
                    </div>
                  </div>

                  <div className="bg-[#f2f4f6] p-3 rounded-lg text-xs space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#76777f]">
                      Critérios de Aceite:
                    </div>
                    <p className="text-[#191c1e] italic text-xs leading-relaxed">
                      "{task.acceptanceCriteria || 'Seguir as orientações dos pais.'}"
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#e0e3e5]/50 text-xs text-[#45464e] flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="material-symbols-outlined text-[15px] text-[#76777f]">event_repeat</span>
                    <span className="text-[11px] font-semibold text-[#081534] bg-[#eef2f6] px-2 py-0.5 rounded-full">
                      {(!task.daysOfWeek || task.daysOfWeek.length === 7)
                        ? 'Todos os dias'
                        : task.daysOfWeek.map((d) => DAYS_OF_WEEK.find((dw) => dw.id === d)?.short).join(', ')}
                    </span>
                    <span className="text-[11px] text-[#76777f]">({task.expectedDurationMinutes || 15} min)</span>
                  </div>

                  <button
                    onClick={() => handleOpenEditModal(task)}
                    className="text-xs font-semibold hover:underline cursor-pointer flex items-center gap-1"
                    style={{ color: 'var(--theme-color, #081534)' }}
                  >
                    <span className="material-symbols-outlined text-[15px]">edit</span>
                    <span>Editar Regra</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-[#e0e3e5] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#e0e3e5] pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--theme-color,#081534)] text-[22px]">tune</span>
                <h3 className="text-base font-bold text-[#191c1e]">
                  Editar Regra: {editingTask.taskCode}
                </h3>
              </div>
              <button
                onClick={() => setEditingTask(null)}
                className="text-[#76777f] hover:text-[#191c1e] p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEditedTask} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#45464e] font-semibold mb-1">Título da Atividade:</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-[#e0e3e5] text-sm font-semibold text-[#191c1e] outline-none focus:border-[#1e2a4a]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#45464e] font-semibold mb-1">Categoria:</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as RoutineTask['category'])}
                    className="w-full p-2.5 rounded-lg border border-[#e0e3e5] font-semibold text-[#191c1e] bg-white outline-none"
                  >
                    <option value="Organização">Organização</option>
                    <option value="Estudos">Estudos</option>
                    <option value="Higiene">Higiene</option>
                    <option value="Convivência">Convivência</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#45464e] font-semibold mb-1">Atribuído a:</label>
                  <select
                    value={editAssigneeId}
                    onChange={(e) => setEditAssigneeId(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-[#e0e3e5] font-semibold text-[#191c1e] bg-white outline-none"
                  >
                    {members.filter(m => m.role === 'child').map(child => (
                      <option key={child.id} value={child.id}>{child.name} ({child.age}a)</option>
                    ))}
                    {members.filter(m => m.role === 'child').length === 0 && (
                      <option value="">Nenhum filho cadastrado</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Dias da Semana na Edição */}
              <div className="bg-[#f8f9fa] p-3 rounded-xl border border-[#e0e3e5]/70 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[#081534] font-bold">
                    📅 Dias da Semana que precisa ser realizada:
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleSetEditPreset('all')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                        editDaysOfWeek.length === 7 ? 'bg-[#081534] text-white' : 'bg-white border border-[#e0e3e5] text-[#45464e]'
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetEditPreset('weekdays')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                        editDaysOfWeek.length === 5 && !editDaysOfWeek.includes(0) && !editDaysOfWeek.includes(6)
                          ? 'bg-[#081534] text-white'
                          : 'bg-white border border-[#e0e3e5] text-[#45464e]'
                      }`}
                    >
                      Seg-Sex
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetEditPreset('weekend')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                        editDaysOfWeek.length === 2 && editDaysOfWeek.includes(0) && editDaysOfWeek.includes(6)
                          ? 'bg-[#081534] text-white'
                          : 'bg-white border border-[#e0e3e5] text-[#45464e]'
                      }`}
                    >
                      Sáb-Dom
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1.5 pt-1">
                  {DAYS_OF_WEEK.map((day) => {
                    const isSelected = editDaysOfWeek.includes(day.id);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => toggleEditDay(day.id)}
                        className={`py-1.5 rounded-lg text-center font-bold text-xs transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-[#081534] text-white border-[#081534] shadow-xs'
                            : 'bg-white text-[#76777f] border-[#e0e3e5] hover:bg-[#f2f4f6]'
                        }`}
                        title={day.label}
                      >
                        <div>{day.short}</div>
                        <div className="text-[9px] font-normal opacity-80">{isSelected ? '✓' : '-'}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#45464e] font-semibold mb-1">Pontos Base:</label>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    required
                    value={editBasePoints}
                    onChange={(e) => setEditBasePoints(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-[#e0e3e5] text-sm font-bold text-[#855300] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#45464e] font-semibold mb-1">Duração Estimada (minutos):</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editExpectedDuration}
                    onChange={(e) => setEditExpectedDuration(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-[#e0e3e5] text-xs font-semibold text-[#191c1e] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#45464e] font-semibold mb-1">Critérios de Aceite & Instruções:</label>
                <textarea
                  rows={3}
                  value={editAcceptanceCriteria}
                  onChange={(e) => setEditAcceptanceCriteria(e.target.value)}
                  placeholder="Ex: Cama esticada, sapatos guardados, armário fechado..."
                  className="w-full p-2.5 rounded-lg border border-[#e0e3e5] text-xs text-[#191c1e] outline-none focus:border-[#1e2a4a]"
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-[#f2f4f6] rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  id="editPhotoReq"
                  checked={editHasPhotoEvidence}
                  onChange={(e) => setEditHasPhotoEvidence(e.target.checked)}
                  className="w-4 h-4 rounded text-[#081534] cursor-pointer"
                />
                <label htmlFor="editPhotoReq" className="text-xs text-[#191c1e] font-medium cursor-pointer">
                  Exigir foto comprobatória ao concluir a rotina
                </label>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#e0e3e5]">
                {onDeleteTask && (
                  <button
                    type="button"
                    onClick={handleRequestDeleteTask}
                    className="px-3 py-2 rounded-lg bg-[#ffdad6] text-[#93000a] font-bold hover:bg-[#ffdad6]/80 cursor-pointer flex items-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    <span>Excluir Atividade</span>
                  </button>
                )}

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setEditingTask(null)}
                    className="px-4 py-2 rounded-lg bg-[#e0e3e5] text-[#191c1e] font-bold cursor-pointer hover:bg-[#d8dadc] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg text-white font-bold cursor-pointer shadow-xs hover:opacity-90 active:scale-95 transition-all"
                    style={{ backgroundColor: 'var(--theme-color, #081534)' }}
                  >
                    Salvar Regra
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDialog && <ConfirmDialog {...confirmDialog} />}
    </div>
  );
};
