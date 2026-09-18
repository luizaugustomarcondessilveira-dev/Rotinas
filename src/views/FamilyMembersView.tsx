import React, { useState } from 'react';
import { Member, RoutineTask } from '../types';
import { ConfirmDialog, ConfirmDialogProps } from '../components/ConfirmDialog';

interface FamilyMembersViewProps {
  members: Member[];
  tasks: RoutineTask[];
  menuLabels?: Record<string, string>;
  currentUserId?: string | null;
  onUpdateMember?: (memberId: string, updates: Partial<Member>) => void;
  onAddMember?: (member: Omit<Member, 'id' | 'pointsBalance' | 'pointsEarnedTotal' | 'pointsSpentTotal' | 'level' | 'badge' | 'weeklyConsistency' | 'streakDays'>) => void;
  onDeleteMember?: (memberId: string) => void;
  showToast?: (title: string, desc: string, icon?: string) => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
];

const PRESET_BADGES = [
  'Novato 🚀',
  'Campeão 🏆',
  'Estrela do Dia ⭐',
  'Mestre dos Estudos 🎓',
  'Organizador Pro 🧹',
  'Super Pontual ⏰',
  'Líder Familiar 👑',
  'Guardião das Rotinas 🛡️'
];

export const FamilyMembersView: React.FC<FamilyMembersViewProps> = ({
  members,
  tasks,
  menuLabels,
  currentUserId,
  onUpdateMember,
  onAddMember,
  onDeleteMember,
  showToast
}) => {
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogProps | null>(null);
  const [name, setName] = useState('');
  const [age, setAge] = useState(10);
  const [role, setRole] = useState<'parent' | 'child'>('child');
  const [pointsBalance, setPointsBalance] = useState(0);
  const [badge, setBadge] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');
  const [pin, setPin] = useState('1234');
  const [showEditPin, setShowEditPin] = useState(false);

  // Revealed PINs map (only accessible by Administrator)
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});

  // Add Member Modal State
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAge, setNewAge] = useState(10);
  const [newRole, setNewRole] = useState<'parent' | 'child'>('child');
  const [newAvatar, setNewAvatar] = useState(PRESET_AVATARS[0]);
  const [newPin, setNewPin] = useState('1010');
  const [showNewPin, setShowNewPin] = useState(false);

  const currentUser = members.find((m) => m.id === currentUserId);
  const isAdmin = currentUser?.role === 'parent';

  const toggleRevealPin = (memberId: string) => {
    if (!isAdmin) return;
    setRevealedPins((prev) => ({
      ...prev,
      [memberId]: !prev[memberId],
    }));
  };

  const getDisplayPin = (member: Member): string => {
    if (!member.pin) return member.role === 'parent' ? '1234' : '1010';
    if (/^[a-f0-9]{64}$/i.test(member.pin)) {
      if (member.id === 'heitor') return '1010';
      if (member.id === 'mirella') return '2020';
      return member.role === 'parent' ? '1234' : '1010';
    }
    return member.pin;
  };

  const handleOpenEdit = (member: Member) => {
    setEditingMember(member);
    setName(member.name);
    setAge(member.age);
    setRole(member.role);
    setPointsBalance(member.pointsBalance);
    setBadge(member.badge || 'Novato');
    setEmail(member.email || '');
    setAvatar(member.avatar || '');
    setPin(getDisplayPin(member));
    setShowEditPin(false);
  };

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isNew: boolean = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          if (isNew) setNewAvatar(reader.result);
          else setAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !onUpdateMember) return;

    onUpdateMember(editingMember.id, {
      name: name.trim() || editingMember.name,
      age: Number(age),
      role,
      pointsBalance: Number(pointsBalance),
      badge: badge.trim() || editingMember.badge,
      email: email.trim(),
      avatar: avatar.trim() || editingMember.avatar,
      pin: pin.trim() || editingMember.pin || '1234'
    });

    setEditingMember(null);
    if (showToast) {
      showToast('Membro Atualizado!', `Os dados e senha de ${name} foram alterados com sucesso.`, 'manage_accounts');
    }
  };

  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !onAddMember) return;

    onAddMember({
      name: newName.trim(),
      email: newEmail.trim() || `${newName.toLowerCase().replace(/\s+/g, '')}@familia.com`,
      age: Number(newAge),
      role: newRole,
      avatar: newAvatar || PRESET_AVATARS[0],
      pin: newPin.trim() || (newRole === 'parent' ? '1234' : '1010')
    });

    setIsAddingMember(false);
    setNewName('');
    setNewEmail('');
    setNewAge(10);
    setNewRole('child');
    setNewPin('1010');

    if (showToast) {
      showToast('Novo Membro Cadastrado!', `${newName} agora faz parte do sistema familiar.`, 'person_add');
    }
  };

  const handleRequestDeleteMember = () => {
    if (!editingMember || !onDeleteMember) return;

    // Check if user is currently logged in as this member
    if (currentUserId && editingMember.id === currentUserId) {
      setConfirmDialog({
        isOpen: true,
        isAlert: true,
        title: 'Não é Possível Remover Este Membro',
        message: `Você está conectado atualmente com o perfil de "${editingMember.name}".\n\nPor razões de segurança, não é possível excluir a conta que está em uso no momento. Se deseja remover este membro, troque para outro perfil de Pai/Mãe antes de realizar a exclusão.`,
        confirmLabel: 'Entendi',
        variant: 'warning',
        icon: 'person_cancel',
        onConfirm: () => setConfirmDialog(null),
        onCancel: () => setConfirmDialog(null),
      });
      return;
    }

    // Check if member is the only administrator (Pai/Mãe)
    const totalParents = members.filter((m) => m.role === 'parent');
    if (editingMember.role === 'parent' && totalParents.length <= 1) {
      setConfirmDialog({
        isOpen: true,
        isAlert: true,
        title: 'Único Administrador da Família',
        message: `"${editingMember.name}" é o único membro com perfil de Pai/Mãe (Administrador) cadastrado na família.\n\nPara não deixar o sistema sem administração e aprovações, você deve cadastrar ou definir outro adulto como Pai/Mãe antes de remover este perfil.`,
        confirmLabel: 'Entendi',
        variant: 'warning',
        icon: 'admin_panel_settings',
        onConfirm: () => setConfirmDialog(null),
        onCancel: () => setConfirmDialog(null),
      });
      return;
    }

    // Allowed to proceed with confirmation dialog
    setConfirmDialog({
      isOpen: true,
      isAlert: false,
      title: `Remover ${editingMember.name}?`,
      message: `Tem certeza que deseja remover ${editingMember.name} da família? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Remover Membro',
      cancelLabel: 'Cancelar',
      variant: 'danger',
      icon: 'delete',
      onConfirm: () => {
        try {
          const memberIdToDelete = editingMember.id;
          const memberNameToDelete = editingMember.name;

          // Call state updater
          onDeleteMember(memberIdToDelete);

          // Sync localStorage safely with try/catch
          try {
            const rawMembers = localStorage.getItem('familyflow_members');
            if (rawMembers) {
              const parsed: Member[] = JSON.parse(rawMembers);
              const updated = parsed.filter((m) => m.id !== memberIdToDelete);
              localStorage.setItem('familyflow_members', JSON.stringify(updated));
            }
          } catch (storageErr) {
            console.error('Erro ao atualizar localStorage para membros:', storageErr);
          }

          // Close both modals
          setConfirmDialog(null);
          setEditingMember(null);

          if (showToast) {
            showToast('Membro Removido com Sucesso!', `${memberNameToDelete} foi removido da família.`, 'delete');
          }
        } catch (err) {
          console.error('Erro ao excluir membro:', err);
          if (showToast) {
            showToast('Erro ao Remover', 'Não foi possível concluir a exclusão do membro.', 'error');
          }
        }
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  return (
    <div className="flex flex-col w-full pb-12 gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-6 rounded-2xl shadow-xs border border-[#e0e3e5]/60 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--theme-color,#081534)] text-[24px]">groups</span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--theme-color,#081534)]">
              {menuLabels?.['membros-da-familia'] || 'Membros da Família'}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#45464e] mt-1">
            Perfis individuais, níveis de maturidade, conquistas pedagógicas e métricas de consistência.
          </p>
        </div>

        {onAddMember && (
          <button
            onClick={() => setIsAddingMember(true)}
            className="flex items-center gap-1.5 text-white px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold shadow-xs transition-all active:scale-95 cursor-pointer self-start sm:self-auto hover:opacity-90"
            style={{ backgroundColor: 'var(--theme-color, #081534)' }}
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Adicionar Membro</span>
          </button>
        )}
      </div>

      {/* Members Grid or Empty State */}
      {members.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-[#e0e3e5]/60 flex flex-col items-center justify-center space-y-3 shadow-xs">
          <div className="w-14 h-14 rounded-full bg-[#f2f4f6] text-[var(--theme-color,#081534)] flex items-center justify-center">
            <span className="material-symbols-outlined text-[32px]">person_off</span>
          </div>
          <h3 className="text-base font-bold text-[#191c1e]">Nenhum membro cadastrado</h3>
          <p className="text-xs text-[#45464e] max-w-sm">
            Cadastre os pais e os filhos para começar a acompanhar rotinas, pontuações e recompensas.
          </p>
          <button
            onClick={() => setIsAddingMember(true)}
            className="mt-2 flex items-center gap-2 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs hover:opacity-90 transition-all cursor-pointer"
            style={{ backgroundColor: 'var(--theme-color, #081534)' }}
          >
            <span className="material-symbols-outlined text-[16px]">person_add</span>
            <span>Cadastrar Primeiro Membro</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {members.map((member) => {
            const isChild = member.role === 'child';
            const memberTasks = tasks.filter((t) => t.assigneeId === member.id);
            const approvedCount = memberTasks.filter((t) => t.status === 'approved').length;

            return (
              <div
                key={member.id}
                className="bg-white rounded-2xl p-6 shadow-xs border border-[#e0e3e5]/60 flex flex-col justify-between gap-6 hover:shadow-md transition-all relative group"
              >
                <div className="space-y-4">
                  {/* Profile Top */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img
                          className="w-16 h-16 rounded-full object-cover shadow-sm ring-2 ring-[#dae2ff]"
                          alt={member.name}
                          src={member.avatar}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = PRESET_AVATARS[0];
                          }}
                        />
                        {isChild && (
                          <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#00a673] text-white text-[11px] font-bold">
                            {member.age}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base sm:text-lg font-bold text-[#191c1e]">{member.name}</h2>
                          <span className="px-2 py-0.5 rounded-full bg-[#dae2ff] text-[#0d1a39] text-[10px] font-extrabold">
                            {member.badge}
                          </span>
                        </div>
                        <p className="text-xs text-[#45464e]">
                          {isChild ? `${member.age} anos • Filho(a)` : 'Responsável / Supervisor'}
                        </p>
                        {member.email && (
                          <p className="text-[11px] text-[#76777f]">{member.email}</p>
                        )}
                        {isChild && (
                          <div className="flex items-center gap-1 text-xs text-[#00a673] font-bold mt-1">
                            <span className="material-symbols-outlined text-[15px]">local_fire_department</span>
                            <span>{member.streakDays} dias de ofensiva</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {isChild && (
                      <div className="text-right shrink-0">
                        <span className="text-[11px] text-[#76777f] font-semibold block">Saldo Atual</span>
                        <div className="flex items-center justify-end gap-1 text-xl font-extrabold text-[#855300]">
                          <span className="material-symbols-outlined text-[20px] text-[#fea619]">toll</span>
                          {member.pointsBalance}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Badges / Trophy Cabinet */}
                  {isChild ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#76777f] block">
                          Conquistas & Selos
                        </span>
                        <span className="text-[10px] font-semibold text-[#00a673]">
                          Selo Atual: {member.badge}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-2.5 bg-[#f2f4f6] rounded-xl text-center flex flex-col items-center">
                          <span className="text-xl">⭐</span>
                          <span className="text-[10px] font-bold text-[#191c1e] mt-1">
                            Semana 90%+
                          </span>
                          <span className="text-[9px] text-[#00a673] font-semibold">Ativo</span>
                        </div>
                        <div className="p-2.5 bg-[#f2f4f6] rounded-xl text-center flex flex-col items-center">
                          <span className="text-xl">🏆</span>
                          <span className="text-[10px] font-bold text-[#191c1e] mt-1">
                            Pontualidade
                          </span>
                          <span className="text-[9px] text-[#76777f]">Mestre</span>
                        </div>
                        <div className="p-2.5 bg-[#f2f4f6] rounded-xl text-center flex flex-col items-center">
                          <span className="text-xl">📚</span>
                          <span className="text-[10px] font-bold text-[#191c1e] mt-1">
                            Foco em Estudos
                          </span>
                          <span className="text-[9px] text-[#76777f]">Nível 3</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-[#f2f4f6] rounded-xl text-xs text-[#45464e] leading-relaxed">
                      Autorização completa de auditoria, aprovação de rotinas, controle do cofre de pontos e emissão de penalidades toleradas.
                    </div>
                  )}
                </div>

                {/* Bottom Actions & Metrics */}
                <div className="pt-3 border-t border-[#e0e3e5]/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    {isChild ? (
                      <span className="text-[#45464e]">
                        Aprovadas hoje: <strong>{approvedCount}</strong>
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#76777f] font-semibold">Administrador</span>
                    )}

                    {/* PIN status badge with admin-only reveal */}
                    <div
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#f2f4f6] text-[11px] font-mono font-bold text-[#081534] border border-[#e0e3e5]"
                      title={
                        isAdmin
                          ? (revealedPins[member.id]
                              ? 'Clique no olho para ocultar a senha'
                              : 'Clique no olho para visualizar a senha deste membro (Exclusivo Administrador)')
                          : 'Senha protegida (apenas o Administrador consegue visualizar)'
                      }
                    >
                      <span className="material-symbols-outlined text-[13px] text-[#76777f]">
                        {isAdmin && revealedPins[member.id] ? 'lock_open' : 'lock'}
                      </span>
                      <span className="select-none">
                        PIN: {isAdmin && revealedPins[member.id] ? getDisplayPin(member) : '••••'}
                      </span>
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRevealPin(member.id);
                          }}
                          className="p-0.5 rounded hover:bg-[#e0e3e5] text-[#76777f] hover:text-[#081534] transition-colors cursor-pointer flex items-center justify-center"
                          title={revealedPins[member.id] ? 'Ocultar Senha' : 'Ver Senha (Apenas Administrador)'}
                          aria-label={revealedPins[member.id] ? 'Ocultar Senha' : 'Ver Senha'}
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            {revealedPins[member.id] ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      ) : (
                        <span className="text-[9px] text-[#76777f] font-sans font-normal ml-0.5">
                          (Protegido)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Edit Info Button */}
                  <button
                    onClick={() => handleOpenEdit(member)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-[#e0e3e5] bg-[#f2f4f6] hover:bg-[#e6e8ea] text-[#191c1e] transition-colors cursor-pointer ml-auto"
                  >
                    <span className="material-symbols-outlined text-[16px]" style={{ color: 'var(--theme-color, #081534)' }}>
                      edit
                    </span>
                    <span>Mudar Informações</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-[#e0e3e5] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#e0e3e5] pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--theme-color,#081534)] text-[22px]">manage_accounts</span>
                <h3 className="text-base font-bold text-[#191c1e]">
                  Editar Informações: {editingMember.name}
                </h3>
              </div>
              <button
                onClick={() => setEditingMember(null)}
                className="text-[#76777f] hover:text-[#191c1e] p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="space-y-4 text-xs">
              {/* Avatar Preview & Selection */}
              <div>
                <label className="block text-[#45464e] font-semibold mb-2">Foto / Avatar do Membro:</label>
                <div className="flex items-center gap-4">
                  <img
                    src={avatar || PRESET_AVATARS[0]}
                    alt="Preview"
                    className="w-16 h-16 rounded-full object-cover border-2 border-[var(--theme-color,#081534)] shadow-xs"
                  />
                  <div className="flex-1 space-y-2">
                    <input
                      type="url"
                      placeholder="Link da imagem (URL)..."
                      value={avatar}
                      onChange={(e) => setAvatar(e.target.value)}
                      className="w-full p-2 rounded-lg border border-[#e0e3e5] text-xs font-semibold outline-none"
                    />
                    <label className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#f2f4f6] text-[#191c1e] hover:bg-[#e6e8ea] rounded-lg text-xs font-bold cursor-pointer border border-[#e0e3e5]">
                      <span className="material-symbols-outlined text-[16px]">upload</span>
                      <span>Carregar do dispositivo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleAvatarFileUpload(e, false)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Preset Avatars */}
                <div className="mt-3">
                  <span className="text-[11px] text-[#76777f] font-semibold block mb-1.5">Ou escolha um avatar rápido:</span>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {PRESET_AVATARS.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`Avatar ${idx}`}
                        onClick={() => setAvatar(url)}
                        className={`w-10 h-10 rounded-full object-cover cursor-pointer transition-transform hover:scale-110 border-2 ${
                          avatar === url ? 'border-[var(--theme-color,#081534)] ring-2 ring-[#dae2ff]' : 'border-transparent'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Name and Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#45464e] font-semibold mb-1">Nome Completo:</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-[#e0e3e5] text-sm font-semibold text-[#191c1e] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#45464e] font-semibold mb-1">E-mail (Acesso):</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@familia.com"
                    className="w-full p-2.5 rounded-lg border border-[#e0e3e5] text-sm font-semibold text-[#191c1e] outline-none"
                  />
                </div>
              </div>

              {/* Role and Age */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#45464e] font-semibold mb-1">Função / Perfil:</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'parent' | 'child')}
                    className="w-full p-2.5 rounded-lg border border-[#e0e3e5] font-semibold text-[#191c1e] bg-white outline-none"
                  >
                    <option value="parent">Pai / Mãe (Administrador)</option>
                    <option value="child">Filho(a)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#45464e] font-semibold mb-1">Idade:</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-[#e0e3e5] text-sm font-semibold text-[#191c1e] outline-none"
                  />
                </div>
              </div>

              {/* Points and Badge */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#45464e] font-semibold mb-1">Pontuação Atual (Saldo):</label>
                  <input
                    type="number"
                    min="0"
                    value={pointsBalance}
                    onChange={(e) => setPointsBalance(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-[#e0e3e5] text-sm font-bold text-[#855300] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#45464e] font-semibold mb-1">Selo de Conquista / Título:</label>
                  <input
                    type="text"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    placeholder="Ex: Campeão 🏆"
                    className="w-full p-2.5 rounded-lg border border-[#e0e3e5] text-sm font-semibold text-[#191c1e] outline-none"
                  />
                </div>
              </div>

              {/* Badges quick select */}
              <div>
                <span className="text-[11px] text-[#76777f] font-semibold block mb-1">Sugestões de Selos:</span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_BADGES.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBadge(b)}
                      className={`px-2 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors ${
                        badge === b ? 'bg-[#dae2ff] text-[#0d1a39] font-bold' : 'bg-[#f2f4f6] text-[#45464e] hover:bg-[#e6e8ea]'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              {/* PIN / Senha de acesso */}
              <div className="p-3 bg-[#f8f9fa] rounded-xl border border-[#e0e3e5] space-y-1.5">
                <label className="block text-[#191c1e] font-bold text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#081534]">lock</span>
                    <span>Senha / PIN de Acesso da Conta (4 a 6 dígitos):</span>
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    isAdmin ? 'bg-[#dae2ff] text-[#0d1a39]' : 'bg-[#e0e3e5] text-[#45464e]'
                  }`}>
                    {isAdmin ? 'Acesso Administrador' : 'Protegido'}
                  </span>
                </label>
                {isAdmin ? (
                  <div className="relative flex items-center">
                    <input
                      type={showEditPin ? 'text' : 'password'}
                      required
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="Ex: 1234 ou 1010"
                      maxLength={8}
                      className="w-full p-2.5 pr-10 rounded-lg border border-[#e0e3e5] text-xs font-mono font-bold text-[#081534] bg-white outline-none focus:border-[#081534]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPin(!showEditPin)}
                      className="absolute right-2.5 p-1 text-[#76777f] hover:text-[#081534] transition-colors cursor-pointer"
                      title={showEditPin ? 'Ocultar senha' : 'Ver senha'}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {showEditPin ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg border border-[#e0e3e5] bg-[#f2f4f6] text-xs font-mono text-[#76777f] flex items-center justify-between">
                    <span>••••••••</span>
                    <span className="text-[10px] font-sans font-normal text-[#76777f]">Somente o Administrador pode visualizar e alterar</span>
                  </div>
                )}
                <span className="text-[10px] text-[#76777f] block">
                  {isAdmin
                    ? 'Como Administrador, você tem permissão para visualizar e redefinir a senha deste membro.'
                    : 'Apenas os pais (Administrador) podem redefinir a senha deste membro.'}
                </span>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-[#e0e3e5]">
                {onDeleteMember && (
                  <button
                    type="button"
                    onClick={handleRequestDeleteMember}
                    className="px-3 py-2 rounded-lg bg-[#ffdad6] text-[#93000a] font-bold hover:bg-[#ffdad6]/80 cursor-pointer flex items-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    <span>Remover</span>
                  </button>
                )}

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setEditingMember(null)}
                    className="px-4 py-2 rounded-lg bg-[#e0e3e5] text-[#191c1e] font-bold cursor-pointer hover:bg-[#d8dadc] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg text-white font-bold cursor-pointer shadow-xs hover:opacity-90 active:scale-95 transition-all"
                    style={{ backgroundColor: 'var(--theme-color, #081534)' }}
                  >
                    Salvar Informações
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {isAddingMember && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-[#e0e3e5] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#e0e3e5] pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--theme-color,#081534)] text-[22px]">person_add</span>
                <h3 className="text-base font-bold text-[#191c1e]">Cadastrar Novo Membro da Família</h3>
              </div>
              <button
                onClick={() => setIsAddingMember(false)}
                className="text-[#76777f] hover:text-[#191c1e] p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#45464e] font-semibold mb-2">Foto / Avatar:</label>
                <div className="flex items-center gap-4">
                  <img
                    src={newAvatar}
                    alt="Preview"
                    className="w-14 h-14 rounded-full object-cover border-2 border-[var(--theme-color,#081534)] shadow-xs"
                  />
                  <div className="flex-1 space-y-2">
                    <input
                      type="url"
                      placeholder="Link da imagem (URL)..."
                      value={newAvatar}
                      onChange={(e) => setNewAvatar(e.target.value)}
                      className="w-full p-2 rounded-lg border border-[#e0e3e5] text-xs font-semibold outline-none"
                    />
                    <label className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#f2f4f6] text-[#191c1e] hover:bg-[#e6e8ea] rounded-lg text-xs font-bold cursor-pointer border border-[#e0e3e5]">
                      <span className="material-symbols-outlined text-[16px]">upload</span>
                      <span>Carregar foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleAvatarFileUpload(e, true)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="mt-3">
                  <span className="text-[11px] text-[#76777f] font-semibold block mb-1.5">Ou escolha um avatar:</span>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {PRESET_AVATARS.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`Avatar ${idx}`}
                        onClick={() => setNewAvatar(url)}
                        className={`w-9 h-9 rounded-full object-cover cursor-pointer transition-transform hover:scale-110 border-2 ${
                          newAvatar === url ? 'border-[var(--theme-color,#081534)] ring-2 ring-[#dae2ff]' : 'border-transparent'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#45464e] font-semibold mb-1">Nome Completo:</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ex: Heitor, Mirella..."
                    className="w-full p-2.5 rounded-lg border border-[#e0e3e5] text-sm font-semibold text-[#191c1e] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#45464e] font-semibold mb-1">E-mail (Opcional):</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="ex: heitor@familia.com"
                    className="w-full p-2.5 rounded-lg border border-[#e0e3e5] text-sm font-semibold text-[#191c1e] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#45464e] font-semibold mb-1">Função / Perfil:</label>
                  <select
                    value={newRole}
                    onChange={(e) => {
                      const r = e.target.value as 'parent' | 'child';
                      setNewRole(r);
                      if (r === 'parent' && newPin === '1010') setNewPin('1234');
                      if (r === 'child' && newPin === '1234') setNewPin('1010');
                    }}
                    className="w-full p-2.5 rounded-lg border border-[#e0e3e5] font-semibold text-[#191c1e] bg-white outline-none"
                  >
                    <option value="child">Filho(a) (Conta Individual)</option>
                    <option value="parent">Pai / Mãe (Administrador Geral)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#45464e] font-semibold mb-1">Idade:</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={newAge}
                    onChange={(e) => setNewAge(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-[#e0e3e5] text-sm font-semibold text-[#191c1e] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#45464e] font-semibold mb-1 flex items-center justify-between">
                  <span>Senha / PIN de Acesso (4 a 6 dígitos):</span>
                  <span className="text-[10px] text-[#76777f]">Padrão: {newRole === 'parent' ? '1234' : '1010'}</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showNewPin ? 'text' : 'password'}
                    required
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="Ex: 1234 ou 1010"
                    maxLength={8}
                    className="w-full p-2.5 pr-10 rounded-lg border border-[#e0e3e5] text-sm font-mono font-bold text-[#081534] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPin(!showNewPin)}
                    className="absolute right-2.5 p-1 text-[#76777f] hover:text-[#081534] transition-colors cursor-pointer"
                    title={showNewPin ? 'Ocultar senha' : 'Ver senha'}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showNewPin ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e0e3e5]">
                <button
                  type="button"
                  onClick={() => setIsAddingMember(false)}
                  className="px-4 py-2 rounded-lg bg-[#e0e3e5] text-[#191c1e] font-bold cursor-pointer hover:bg-[#d8dadc] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-white font-bold cursor-pointer shadow-xs hover:opacity-90 active:scale-95 transition-all"
                  style={{ backgroundColor: 'var(--theme-color, #081534)' }}
                >
                  Cadastrar Membro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDialog && <ConfirmDialog {...confirmDialog} />}
    </div>
  );
};
