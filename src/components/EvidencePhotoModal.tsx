import React from 'react';
import { RoutineTask, Member } from '../types';

interface EvidencePhotoModalProps {
  task: RoutineTask | null;
  member?: Member;
  onClose: () => void;
  onApprove: (taskId: string) => void;
  onRequestPhoto: (taskId: string) => void;
}

export const EvidencePhotoModal: React.FC<EvidencePhotoModalProps> = ({
  task,
  member,
  onClose,
  onApprove,
  onRequestPhoto
}) => {
  if (!task) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#e0e3e5] pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#081534] text-[24px]">
              photo_library
            </span>
            <div>
              <h3 className="text-sm font-bold text-[#081534]">{task.title}</h3>
              <span className="text-[11px] text-[#45464e]">
                Evidência enviada por <strong>{member?.name || 'Filho'}</strong> às {task.executedAt}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#76777f] hover:text-[#191c1e] p-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Photo view */}
        <div className="relative rounded-xl overflow-hidden bg-black/5 aspect-video border border-[#e0e3e5] flex items-center justify-center">
          {task.photoEvidenceUrl ? (
            <img
              src={task.photoEvidenceUrl}
              alt="Evidência da tarefa"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center p-8 space-y-2 text-[#76777f]">
              <span className="material-symbols-outlined text-4xl">no_photography</span>
              <p className="text-xs">Nenhuma foto anexada no envio desta atividade.</p>
            </div>
          )}
        </div>

        {/* Criteria reference */}
        <div className="bg-[#f2f4f6] p-3.5 rounded-xl text-xs space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#45464e] flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">checklist</span>
            Critérios para validação:
          </div>
          <p className="text-[#191c1e] italic leading-relaxed">
            "{task.acceptanceCriteria}"
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-[#e0e3e5]">
          <button
            onClick={() => {
              onRequestPhoto(task.id);
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-[#e6e8ea] hover:bg-[#d8dadc] text-[#191c1e] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add_a_photo</span>
            <span>Solicitar Nova Foto</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-bold text-[#45464e] hover:bg-[#eceef0] cursor-pointer"
            >
              Fechar
            </button>
            <button
              onClick={() => {
                onApprove(task.id);
                onClose();
              }}
              className="px-4 py-2 rounded-lg bg-[#081534] hover:bg-[#1e2a4a] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">done_all</span>
              <span>Aprovar (+{task.basePoints} pts)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
