import React, { useState } from 'react';
import { Member, RoutineCategory, RoutineTask, DAYS_OF_WEEK } from '../types';

interface NewActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  onAddActivity: (newTask: Omit<RoutineTask, 'id' | 'regCode' | 'taskCode' | 'status' | 'executedAt' | 'isDelayed' | 'withinTolerance' | 'delayMinutes' | 'penaltyApplied' | 'penaltyPoints' | 'finalPoints' | 'photoRequested'>) => void;
}

export const NewActivityModal: React.FC<NewActivityModalProps> = ({
  isOpen,
  onClose,
  members,
  onAddActivity
}) => {
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState(() => members.find(m => m.role === 'child')?.id || '');
  const [category, setCategory] = useState<RoutineCategory>('Organização');
  const [basePoints, setBasePoints] = useState(40);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [expectedDuration, setExpectedDuration] = useState(15);
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');
  const [hasPhotoEvidence, setHasPhotoEvidence] = useState(false);

  if (!isOpen) return null;

  const toggleDay = (dayId: number) => {
    if (daysOfWeek.includes(dayId)) {
      if (daysOfWeek.length > 1) {
        setDaysOfWeek(daysOfWeek.filter((d) => d !== dayId));
      }
    } else {
      setDaysOfWeek([...daysOfWeek, dayId].sort((a, b) => a - b));
    }
  };

  const handleSetPreset = (preset: 'all' | 'weekdays' | 'weekend') => {
    if (preset === 'all') setDaysOfWeek([0, 1, 2, 3, 4, 5, 6]);
    if (preset === 'weekdays') setDaysOfWeek([1, 2, 3, 4, 5]);
    if (preset === 'weekend') setDaysOfWeek([0, 6]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !acceptanceCriteria) return;

    onAddActivity({
      title,
      assigneeId,
      category,
      basePoints,
      daysOfWeek,
      completedDates: [],
      expectedDurationMinutes: expectedDuration,
      durationMinutes: expectedDuration,
      acceptanceCriteria,
      feedback: 'Aguardando execução pela criança',
      hasPhotoEvidence,
      date: 'Rotina Diária Recorrente'
    });

    onClose();
    setTitle('');
    setAcceptanceCriteria('');
    setDaysOfWeek([0, 1, 2, 3, 4, 5, 6]);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#e0e3e5] pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#081534] text-[24px]">add_task</span>
            <h3 className="text-base font-bold text-[#081534]">Criar Nova Rotina / Atividade</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#76777f] hover:text-[#191c1e] p-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[#45464e] font-semibold mb-1">Título da Atividade:</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Recolher a louça do almoço e secar os copos"
              className="w-full p-2.5 rounded-lg border border-[#e0e3e5] text-xs font-semibold text-[#191c1e] outline-none focus:border-[#1e2a4a]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#45464e] font-semibold mb-1">Atribuído a:</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-[#e0e3e5] text-xs font-semibold text-[#191c1e] outline-none"
              >
                {members
                  .filter((m) => m.role === 'child')
                  .map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.name} ({child.age} anos)
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-[#45464e] font-semibold mb-1">Categoria:</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as RoutineCategory)}
                className="w-full p-2.5 rounded-lg border border-[#e0e3e5] text-xs font-semibold text-[#191c1e] outline-none"
              >
                <option value="Organização">Organização</option>
                <option value="Estudos">Estudos</option>
                <option value="Higiene">Higiene</option>
                <option value="Convivência">Convivência</option>
                <option value="Saúde">Saúde</option>
              </select>
            </div>
          </div>

          {/* Dias da Semana */}
          <div className="bg-[#f8f9fa] p-3 rounded-xl border border-[#e0e3e5]/70 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[#081534] font-bold">
                📅 Dias da Semana que precisa ser realizada:
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleSetPreset('all')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                    daysOfWeek.length === 7 ? 'bg-[#081534] text-white' : 'bg-white border border-[#e0e3e5] text-[#45464e]'
                  }`}
                >
                  Todos os dias
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPreset('weekdays')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                    daysOfWeek.length === 5 && !daysOfWeek.includes(0) && !daysOfWeek.includes(6)
                      ? 'bg-[#081534] text-white'
                      : 'bg-white border border-[#e0e3e5] text-[#45464e]'
                  }`}
                >
                  Seg-Sex
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPreset('weekend')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                    daysOfWeek.length === 2 && daysOfWeek.includes(0) && daysOfWeek.includes(6)
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
                const isSelected = daysOfWeek.includes(day.id);
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => toggleDay(day.id)}
                    className={`py-2 rounded-lg text-center font-bold text-xs transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-[#081534] text-white border-[#081534] shadow-xs'
                        : 'bg-white text-[#76777f] border-[#e0e3e5] hover:bg-[#f2f4f6]'
                    }`}
                    title={day.label}
                  >
                    <div>{day.short}</div>
                    <div className="text-[9px] font-normal opacity-80">
                      {isSelected ? '✓' : '-'}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-[#76777f]">
              A criança poderá marcar que realizou a atividade diariamente nos dias selecionados e ela se renova a cada novo dia.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#45464e] font-semibold mb-1">Recompensa (pts):</label>
              <input
                type="number"
                min="5"
                step="5"
                value={basePoints}
                onChange={(e) => setBasePoints(Number(e.target.value))}
                className="w-full p-2.5 rounded-lg border border-[#e0e3e5] text-sm font-bold text-[#855300] outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[#45464e] font-semibold mb-1">Duração Prevista (minutos):</label>
              <input
                type="number"
                min="5"
                max="120"
                value={expectedDuration}
                onChange={(e) => setExpectedDuration(Number(e.target.value))}
                className="w-full p-2.5 rounded-lg border border-[#e0e3e5] text-xs font-semibold text-[#191c1e] outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[#45464e] font-semibold mb-1">
              Critérios de Aceite Definidos (Regras Claras):
            </label>
            <textarea
              rows={3}
              value={acceptanceCriteria}
              onChange={(e) => setAcceptanceCriteria(e.target.value)}
              placeholder="Ex: Pia vazia e limpa, pano de prato estendido e lixo orgânico na lixeira externa."
              className="w-full p-2.5 rounded-lg border border-[#e0e3e5] text-xs text-[#191c1e] outline-none focus:border-[#1e2a4a]"
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="check-evidence"
              checked={hasPhotoEvidence}
              onChange={(e) => setHasPhotoEvidence(e.target.checked)}
              className="w-4 h-4 rounded text-[#081534] cursor-pointer"
            />
            <label htmlFor="check-evidence" className="text-[#45464e] font-semibold cursor-pointer">
              Exigir foto de evidência comprobatória antes de liberar
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#e0e3e5]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#e6e8ea] text-[#45464e] font-bold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-[#081534] hover:bg-[#1e2a4a] text-white font-bold cursor-pointer shadow-xs active:scale-95"
            >
              Cadastrar Rotina
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
