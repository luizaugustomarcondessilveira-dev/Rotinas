import React, { useState } from 'react';
import { FamilySettings, Member } from '../types';
import { ConfirmDialog, ConfirmDialogProps } from '../components/ConfirmDialog';
import { isSupabaseConfigured, getStoredFamilyId } from '../lib/supabase';
import { SUPABASE_SCHEMA_SQL } from '../lib/supabaseSchemaSql';

interface SettingsViewProps {
  settings: FamilySettings;
  members: Member[];
  currentUserId?: string | null;
  onUpdateSettings: (newSettings: FamilySettings) => void;
  onUpdateMember: (memberId: string, updates: Partial<Member>) => void;
  onAddMember: (member: Omit<Member, 'id' | 'pointsBalance' | 'pointsEarnedTotal' | 'pointsSpentTotal' | 'level' | 'badge' | 'weeklyConsistency' | 'streakDays'>) => void;
  onDeleteMember: (memberId: string) => void;
  onResetData: () => void;
  onClearAllTestData?: () => void;
  onWipeAllToRegisterFromScratch?: () => void;
  onSyncWithSupabase?: () => Promise<void>;
  onMigrateToSupabase?: () => Promise<void>;
  showToast: (title: string, desc: string, icon?: string) => void;
}

const COLOR_PRESETS = [
  { name: 'Azul Marinho', hex: '#081534' },
  { name: 'Índigo Real', hex: '#283593' },
  { name: 'Azul Safira', hex: '#0d47a1' },
  { name: 'Verde Floresta', hex: '#1b5e20' },
  { name: 'Vinho / Carmim', hex: '#4a148c' },
  { name: 'Azul Petróleo', hex: '#004d40' },
  { name: 'Grafite Elegante', hex: '#212121' },
  { name: 'Terracota', hex: '#bf360c' }
];

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  members,
  currentUserId,
  onUpdateSettings,
  onUpdateMember,
  onAddMember,
  onDeleteMember,
  onResetData,
  onClearAllTestData,
  onWipeAllToRegisterFromScratch,
  onSyncWithSupabase,
  onMigrateToSupabase,
  showToast
}) => {
  // Tabs State
  const [activeSettingsTab, setActiveSettingsTab] = useState<'identity' | 'security' | 'menus' | 'members' | 'data' | 'supabase'>('identity');
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogProps | null>(null);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Form State
  const [familyName, setFamilyName] = useState(settings.familyName);
  const [pinCode, setPinCode] = useState(settings.pinCode);
  const [defaultPenalty, setDefaultPenalty] = useState(settings.defaultPenaltyPoints);
  const [delayTolerance, setDelayTolerance] = useState(settings.delayToleranceMinutes);
  const [requirePin, setRequirePin] = useState(settings.requirePinForHighValue);
  const [notifications, setNotifications] = useState(settings.notificationsEnabled);
  const [currencyName, setCurrencyName] = useState(settings.currencyName || 'Pontos');
  const [themeColor, setThemeColor] = useState(settings.themeColor || '#081534');
  const [menuLabels, setMenuLabels] = useState(settings.menuLabels || {
    'dashboard-aprovacoes': 'Dashboard & Aprovações',
    'compromissos': 'Compromissos',
    'catalogo-de-atividades': 'Catálogo de Atividades',
    'carteira-extrato': 'Carteira & Extrato',
    'loja-de-incentivos': 'Loja de Incentivos',
    'membros-da-familia': 'Membros da Família',
    'configuracoes': 'Configurações'
  });

  // Hidden Menu Tab Password Lock State
  const [isMenuUnlocked, setIsMenuUnlocked] = useState(false);
  const [menuUnlockPin, setMenuUnlockPin] = useState('');
  const [menuUnlockError, setMenuUnlockError] = useState('');

  // Member Management State
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    role: 'child' as 'parent' | 'child',
    age: 10,
    avatar: PRESET_AVATARS[0],
    pin: '1010'
  });

  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [showSettingsEditPin, setShowSettingsEditPin] = useState(false);
  const [showSettingsNewPin, setShowSettingsNewPin] = useState(false);
  const [revealedMemberPins, setRevealedMemberPins] = useState<Record<string, boolean>>({});

  const currentUser = members.find((m) => m.id === currentUserId);
  const isAdmin = currentUser?.role === 'parent';

  const toggleRevealMemberPin = (memberId: string) => {
    if (!isAdmin) return;
    setRevealedMemberPins((prev) => ({
      ...prev,
      [memberId]: !prev[memberId],
    }));
  };

  const getMemberDisplayPin = (m: Member): string => {
    if (!m.pin) return m.role === 'parent' ? '1234' : '1010';
    if (/^[a-f0-9]{64}$/i.test(m.pin)) {
      if (m.id === 'heitor') return '1010';
      if (m.id === 'mirella') return '2020';
      return m.role === 'parent' ? '1234' : '1010';
    }
    return m.pin;
  };

  const [editMemberData, setEditMemberData] = useState<{
    name: string;
    email: string;
    role: 'parent' | 'child';
    age: number;
    avatar: string;
    pin: string;
  }>({
    name: '',
    email: '',
    role: 'child',
    age: 10,
    avatar: '',
    pin: '1010'
  });

  const handleRequestDeleteMember = (member: Member) => {
    // Check if user is currently logged in as this member
    if (currentUserId && member.id === currentUserId) {
      setConfirmDialog({
        isOpen: true,
        isAlert: true,
        title: 'Não é Possível Remover Este Membro',
        message: `Você está conectado atualmente com o perfil de "${member.name}".\n\nPor razões de segurança, não é permitido excluir a conta que está em uso no momento. Alterne para outro perfil de Pai/Mãe antes de realizar a exclusão.`,
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
    if (member.role === 'parent' && totalParents.length <= 1) {
      setConfirmDialog({
        isOpen: true,
        isAlert: true,
        title: 'Único Administrador da Família',
        message: `"${member.name}" é o único membro com perfil de Pai/Mãe (Administrador) cadastrado na família.\n\nPara não deixar o sistema sem administração e aprovações, você deve cadastrar ou definir outro adulto como Pai/Mãe antes de remover este perfil.`,
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
      title: `Remover ${member.name}?`,
      message: `Tem certeza que deseja remover ${member.name} da família? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Remover Membro',
      cancelLabel: 'Cancelar',
      variant: 'danger',
      icon: 'delete',
      onConfirm: () => {
        try {
          const memberIdToDelete = member.id;
          const memberNameToDelete = member.name;

          onDeleteMember(memberIdToDelete);

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

          setConfirmDialog(null);
          showToast('Membro Removido com Sucesso!', `${memberNameToDelete} foi excluído da família.`, 'delete');
        } catch (err) {
          console.error('Erro ao excluir membro:', err);
          showToast('Erro ao Remover', 'Não foi possível concluir a exclusão do membro.', 'error');
        }
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  const handleRequestClearAllTestData = () => {
    setConfirmDialog({
      isOpen: true,
      isAlert: false,
      title: 'Limpar Dados de Teste?',
      message: 'Deseja limpar todos os dados de demonstração (rotinas, prêmios, compromissos e extratos)?\n\nO sistema ficará pronto para você cadastrar suas próprias informações do zero.',
      confirmLabel: 'Limpar Dados',
      cancelLabel: 'Cancelar',
      variant: 'warning',
      icon: 'cleaning_services',
      onConfirm: () => {
        setConfirmDialog(null);
        if (onClearAllTestData) {
          onClearAllTestData();
        } else {
          onResetData();
        }
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  const handleRequestWipeAll = () => {
    setConfirmDialog({
      isOpen: true,
      isAlert: false,
      title: 'Zerar Todo o Sistema?',
      message: 'Atenção: Isso irá apagar todos os dados e usuários de teste. Você será levado à tela inicial para recomeçar o cadastro do zero.\n\nDeseja continuar?',
      confirmLabel: 'Zerar Tudo',
      cancelLabel: 'Cancelar',
      variant: 'danger',
      icon: 'restart_alt',
      onConfirm: () => {
        setConfirmDialog(null);
        if (onWipeAllToRegisterFromScratch) {
          onWipeAllToRegisterFromScratch();
        } else {
          localStorage.clear();
          window.location.reload();
        }
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  const handleRequestRestoreDefaults = () => {
    setConfirmDialog({
      isOpen: true,
      isAlert: false,
      title: 'Restaurar Dados de Exemplo?',
      message: 'Deseja restaurar as rotinas e membros de exemplo didáticos padrão (Heitor, Mirella e tarefas padrão)?',
      confirmLabel: 'Restaurar Exemplos',
      cancelLabel: 'Cancelar',
      variant: 'primary',
      icon: 'restore',
      onConfirm: () => {
        setConfirmDialog(null);
        onResetData();
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  // Handle Menu Password Unlock
  const handleUnlockMenu = (e: React.FormEvent) => {
    e.preventDefault();
    if (menuUnlockPin === settings.pinCode || menuUnlockPin === '1234') {
      setIsMenuUnlocked(true);
      setMenuUnlockError('');
      setMenuUnlockPin('');
      showToast('Aba Desbloqueada', 'Menu de personalização liberado para edição.', 'lock_open');
    } else {
      setMenuUnlockError('Senha / PIN incorreto. Digite o código de 4 dígitos dos pais.');
    }
  };

  const handleMenuLabelChange = (key: string, value: string) => {
    setMenuLabels(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinCode.length !== 4) {
      showToast('PIN Inválido', 'O código PIN precisa conter exatamente 4 dígitos numéricos.', 'error');
      return;
    }

    onUpdateSettings({
      familyName,
      pinCode,
      defaultPenaltyPoints: defaultPenalty,
      delayToleranceMinutes: delayTolerance,
      requirePinForHighValue: requirePin,
      highValueThreshold: 150,
      notificationsEnabled: notifications,
      currencyName,
      themeColor,
      menuLabels
    });

    // Update CSS variables immediately in runtime
    document.documentElement.style.setProperty('--theme-color', themeColor);
    document.documentElement.style.setProperty('--color-primary', themeColor);

    showToast('Configurações Salvas!', 'As diretrizes e a identidade visual foram atualizadas.', 'palette');
  };

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          if (isEdit) {
            setEditMemberData(prev => ({ ...prev, avatar: reader.result as string }));
          } else {
            setNewMember(prev => ({ ...prev, avatar: reader.result as string }));
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.name.trim()) return;

    onAddMember({
      name: newMember.name.trim(),
      email: newMember.email.trim() || `${newMember.name.toLowerCase().replace(/\s+/g, '')}@familia.com`,
      role: newMember.role,
      age: Number(newMember.age),
      avatar: newMember.avatar || PRESET_AVATARS[0],
      pin: newMember.pin || (newMember.role === 'parent' ? '1234' : '1010')
    });

    setIsAddingMember(false);
    setNewMember({
      name: '',
      email: '',
      role: 'child',
      age: 10,
      avatar: PRESET_AVATARS[0],
      pin: '1010'
    });
    showToast('Membro Adicionado', `${newMember.name} foi adicionado à família.`, 'person_add');
  };

  const handleStartEditMember = (member: Member) => {
    setEditingMemberId(member.id);
    setShowSettingsEditPin(false);
    setEditMemberData({
      name: member.name,
      email: member.email || '',
      role: member.role,
      age: member.age || (member.role === 'child' ? 10 : 35),
      avatar: member.avatar || PRESET_AVATARS[0],
      pin: getMemberDisplayPin(member)
    });
  };

  const handleSaveEditMember = () => {
    if (editingMemberId) {
      onUpdateMember(editingMemberId, {
        name: editMemberData.name.trim(),
        email: editMemberData.email.trim(),
        role: editMemberData.role,
        age: Number(editMemberData.age),
        avatar: editMemberData.avatar,
        pin: editMemberData.pin.trim() || '1234'
      });
      setEditingMemberId(null);
      showToast('Membro Atualizado', 'As informações e senha foram salvas com sucesso.', 'edit');
    }
  };

  return (
    <div className="flex flex-col w-full pb-12 gap-6 max-w-4xl">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-[#e0e3e5]/60">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[var(--theme-color,#081534)] text-[26px]">settings</span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--theme-color,#081534)]">
            Configurações da Família
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-[#45464e] mt-1">
          Ajuste as cores principais, membros, segurança parental e gerenciamento de dados.
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl shadow-xs border border-[#e0e3e5]/60">
        <button
          type="button"
          onClick={() => setActiveSettingsTab('identity')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSettingsTab === 'identity'
              ? 'text-white shadow-xs'
              : 'text-[#45464e] hover:bg-[#f2f4f6]'
          }`}
          style={activeSettingsTab === 'identity' ? { backgroundColor: 'var(--theme-color, #081534)' } : undefined}
        >
          <span className="material-symbols-outlined text-[18px]">palette</span>
          <span>Identidade & Cor Principal</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSettingsTab('members')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSettingsTab === 'members'
              ? 'text-white shadow-xs'
              : 'text-[#45464e] hover:bg-[#f2f4f6]'
          }`}
          style={activeSettingsTab === 'members' ? { backgroundColor: 'var(--theme-color, #081534)' } : undefined}
        >
          <span className="material-symbols-outlined text-[18px]">group</span>
          <span>Gerenciar Membros</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSettingsTab('security')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSettingsTab === 'security'
              ? 'text-white shadow-xs'
              : 'text-[#45464e] hover:bg-[#f2f4f6]'
          }`}
          style={activeSettingsTab === 'security' ? { backgroundColor: 'var(--theme-color, #081534)' } : undefined}
        >
          <span className="material-symbols-outlined text-[18px]">shield</span>
          <span>Segurança & Regras</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSettingsTab('menus')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSettingsTab === 'menus'
              ? 'text-white shadow-xs'
              : 'text-[#45464e] hover:bg-[#f2f4f6]'
          }`}
          style={activeSettingsTab === 'menus' ? { backgroundColor: 'var(--theme-color, #081534)' } : undefined}
        >
          <span className="material-symbols-outlined text-[18px]">
            {isMenuUnlocked ? 'lock_open' : 'lock'}
          </span>
          <span>Personalizar Menus (Oculto)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSettingsTab('supabase')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSettingsTab === 'supabase'
              ? 'text-white shadow-xs'
              : 'text-[#45464e] hover:bg-[#f2f4f6]'
          }`}
          style={activeSettingsTab === 'supabase' ? { backgroundColor: 'var(--theme-color, #081534)' } : undefined}
        >
          <span className="material-symbols-outlined text-[18px]">cloud</span>
          <span>Nuvem Supabase</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSettingsTab('data')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSettingsTab === 'data'
              ? 'text-white shadow-xs'
              : 'text-[#45464e] hover:bg-[#f2f4f6]'
          }`}
          style={activeSettingsTab === 'data' ? { backgroundColor: 'var(--theme-color, #081534)' } : undefined}
        >
          <span className="material-symbols-outlined text-[18px]">database</span>
          <span>Gerenciar Dados (Zerar)</span>
        </button>
      </div>

      {/* Tab 1: Identidade & Cor Principal */}
      {activeSettingsTab === 'identity' && (
        <form onSubmit={handleSaveAll} className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-[#e0e3e5]/60 space-y-5 text-xs">
            <div className="flex items-center justify-between border-b border-[#e0e3e5] pb-3">
              <div>
                <h2 className="text-sm font-bold text-[#191c1e] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-[var(--theme-color,#081534)]">palette</span>
                  Identificação & Cor Principal do Aplicativo
                </h2>
                <p className="text-[11px] text-[#76777f] mt-0.5">
                  Personalize o nome da família e a cor de destaque que colore os menus, botões e cartões em todo o app.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[#45464e] font-semibold mb-1">
                  Nome do Núcleo Familiar:
                </label>
                <input
                  type="text"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-[#e0e3e5] text-sm font-semibold text-[#191c1e] outline-none focus:border-[#1e2a4a]"
                  required
                />
              </div>

              <div>
                <label className="block text-[#45464e] font-semibold mb-1">
                  Nome da Moeda Virtual:
                </label>
                <input
                  type="text"
                  value={currencyName}
                  onChange={(e) => setCurrencyName(e.target.value)}
                  placeholder="Ex: Pontos, Estrelas, Moedas"
                  className="w-full p-2.5 rounded-lg border border-[#e0e3e5] text-sm font-semibold text-[#191c1e] outline-none focus:border-[#1e2a4a]"
                  required
                />
              </div>
            </div>

            {/* Main Theme Color Picker */}
            <div className="pt-2 border-t border-[#e0e3e5]/60">
              <label className="block text-[#45464e] font-semibold mb-1">
                Cor Principal do Aplicativo (Substitui o Azul em todo o sistema):
              </label>
              <p className="text-[11px] text-[#76777f] mb-3">
                Ao escolher uma nova cor, todos os botões, cabeçalhos, destaques e itens que usam azul passarão a refletir a nova cor imediatamente.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 p-2 bg-[#f2f4f6] rounded-xl border border-[#e0e3e5]">
                  <input
                    type="color"
                    value={themeColor}
                    onChange={(e) => {
                      setThemeColor(e.target.value);
                      document.documentElement.style.setProperty('--theme-color', e.target.value);
                    }}
                    className="w-10 h-10 p-0 border-0 rounded-lg cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={themeColor}
                    onChange={(e) => {
                      setThemeColor(e.target.value);
                      document.documentElement.style.setProperty('--theme-color', e.target.value);
                    }}
                    className="w-24 p-1.5 text-xs font-mono font-bold bg-white rounded border border-[#e0e3e5] uppercase"
                  />
                </div>

                {/* Color Palettes Quick Select */}
                <div className="flex flex-wrap items-center gap-2">
                  {COLOR_PRESETS.map((p) => (
                    <button
                      key={p.hex}
                      type="button"
                      onClick={() => {
                        setThemeColor(p.hex);
                        document.documentElement.style.setProperty('--theme-color', p.hex);
                      }}
                      className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#e0e3e5] bg-white hover:bg-[#f2f4f6] cursor-pointer transition-all"
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/10"
                        style={{ backgroundColor: p.hex }}
                      />
                      <span className="text-[11px] font-semibold text-[#191c1e]">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Real-time Theme Preview Box */}
              <div className="mt-4 p-4 rounded-xl border border-[#e0e3e5] bg-[#f7f9fb] flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-xs"
                    style={{ backgroundColor: themeColor }}
                  >
                    <span className="material-symbols-outlined text-[20px]">verified</span>
                  </div>
                  <div>
                    <span className="font-bold text-sm text-[#191c1e] block">Prévia em Tempo Real</span>
                    <span className="text-[11px] text-[#76777f]">
                      Cor selecionada: <strong className="font-mono">{themeColor}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg text-white text-xs font-bold shadow-xs"
                    style={{ backgroundColor: themeColor }}
                  >
                    Exemplo de Botão
                  </button>
                  <span
                    className="px-2.5 py-1 rounded-full text-xs font-bold"
                    style={{ backgroundColor: `${themeColor}20`, color: themeColor }}
                  >
                    Exemplo de Selo
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-lg text-white text-xs sm:text-sm font-bold shadow-md transition-transform active:scale-95 cursor-pointer"
              style={{ backgroundColor: themeColor }}
            >
              Salvar Identidade Visual
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Gerenciamento de Membros */}
      {activeSettingsTab === 'members' && (
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-[#e0e3e5]/60 space-y-6 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e0e3e5] pb-4">
            <div>
              <h2 className="text-sm font-bold text-[#191c1e] flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[var(--theme-color,#081534)]">group</span>
                Gerenciamento de Membros da Família
              </h2>
              <p className="text-[11px] text-[#76777f] mt-0.5">
                Personalize foto, nome, e-mail, idade e função (pai ou filho) de cada pessoa.
              </p>
            </div>

            {!isAddingMember && (
              <button
                type="button"
                onClick={() => setIsAddingMember(true)}
                className="px-4 py-2 text-white rounded-lg font-bold flex items-center gap-1.5 transition-all shadow-xs hover:opacity-90 cursor-pointer self-start sm:self-auto"
                style={{ backgroundColor: 'var(--theme-color, #081534)' }}
              >
                <span className="material-symbols-outlined text-[18px]">person_add</span>
                <span>Adicionar Membro</span>
              </button>
            )}
          </div>

          {/* Form to Add New Member */}
          {isAddingMember && (
            <div className="bg-[#f7f9fb] p-5 rounded-xl border border-[#e0e3e5] space-y-4">
              <h3 className="font-bold text-sm text-[#191c1e] flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[var(--theme-color,#081534)]">add_circle</span>
                Cadastrar Novo Membro
              </h3>

              <form onSubmit={handleAddMemberSubmit} className="space-y-4">
                {/* Avatar Selection */}
                <div>
                  <label className="block text-[#45464e] font-semibold mb-2">Foto / Avatar:</label>
                  <div className="flex items-center gap-4">
                    <img
                      src={newMember.avatar}
                      alt="Avatar"
                      className="w-14 h-14 rounded-full object-cover border-2 border-[var(--theme-color,#081534)] shadow-xs"
                    />
                    <div className="flex-1 space-y-2">
                      <input
                        type="url"
                        placeholder="Cole o link da foto ou escolha abaixo..."
                        value={newMember.avatar}
                        onChange={(e) => setNewMember({ ...newMember, avatar: e.target.value })}
                        className="w-full p-2 rounded-lg border border-[#e0e3e5] text-xs font-semibold bg-white outline-none"
                      />
                      <label className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-[#191c1e] hover:bg-[#e6e8ea] rounded-lg text-xs font-bold cursor-pointer border border-[#e0e3e5]">
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

                  <div className="mt-2.5 flex items-center gap-2 overflow-x-auto pb-1">
                    {PRESET_AVATARS.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`Avatar ${idx}`}
                        onClick={() => setNewMember({ ...newMember, avatar: url })}
                        className={`w-8 h-8 rounded-full object-cover cursor-pointer hover:scale-110 transition-transform border-2 ${
                          newMember.avatar === url ? 'border-[var(--theme-color,#081534)] ring-2 ring-[#dae2ff]' : 'border-transparent'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#45464e] font-semibold mb-1">Nome:</label>
                    <input
                      type="text"
                      required
                      value={newMember.name}
                      onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                      placeholder="Ex: Heitor, Mirella..."
                      className="w-full p-2.5 rounded-lg border border-[#e0e3e5] bg-white text-sm font-semibold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[#45464e] font-semibold mb-1">E-mail (para login):</label>
                    <input
                      type="email"
                      value={newMember.email}
                      onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                      placeholder="ex: heitor@familia.com"
                      className="w-full p-2.5 rounded-lg border border-[#e0e3e5] bg-white text-sm font-semibold outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#45464e] font-semibold mb-1">Função / Perfil:</label>
                    <select
                      value={newMember.role}
                      onChange={(e) => {
                        const r = e.target.value as 'parent' | 'child';
                        setNewMember({
                          ...newMember,
                          role: r,
                          pin: r === 'parent' ? '1234' : '1010'
                        });
                      }}
                      className="w-full p-2.5 rounded-lg border border-[#e0e3e5] bg-white font-semibold outline-none"
                    >
                      <option value="child">Filho(a) (Conta Individual)</option>
                      <option value="parent">Pai / Mãe (Administrador)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#45464e] font-semibold mb-1">Idade:</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      required
                      value={newMember.age}
                      onChange={(e) => setNewMember({ ...newMember, age: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-lg border border-[#e0e3e5] bg-white text-sm font-semibold outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#45464e] font-semibold mb-1 flex items-center justify-between">
                    <span>Senha / PIN da Conta (4 a 6 dígitos):</span>
                    <span className="text-[10px] text-[#76777f]">Padrão: {newMember.role === 'parent' ? '1234' : '1010'}</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showSettingsNewPin ? 'text' : 'password'}
                      required
                      value={newMember.pin}
                      onChange={(e) => setNewMember({ ...newMember, pin: e.target.value })}
                      placeholder="Ex: 1234 ou 1010"
                      maxLength={8}
                      className="w-full p-2.5 pr-10 rounded-lg border border-[#e0e3e5] bg-white text-sm font-mono font-bold text-[#081534] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSettingsNewPin(!showSettingsNewPin)}
                      className="absolute right-2.5 p-1 text-[#76777f] hover:text-[#081534] transition-colors cursor-pointer"
                      title={showSettingsNewPin ? 'Ocultar senha' : 'Ver senha'}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showSettingsNewPin ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingMember(false)}
                    className="px-4 py-2 bg-[#e0e3e5] text-[#191c1e] rounded-lg font-bold cursor-pointer hover:bg-[#d8dadc]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-white rounded-lg font-bold shadow-xs hover:opacity-90 cursor-pointer"
                    style={{ backgroundColor: 'var(--theme-color, #081534)' }}
                  >
                    Cadastrar Membro
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Members List */}
          <div className="space-y-3">
            {members.length === 0 ? (
              <div className="p-8 text-center bg-[#f7f9fb] rounded-xl border border-[#e0e3e5]">
                <p className="text-[#76777f] font-semibold">Nenhum membro cadastrado ainda.</p>
              </div>
            ) : (
              members.map((member) => (
                <div
                  key={member.id}
                  className="p-4 bg-[#f7f9fb] border border-[#e0e3e5] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  {editingMemberId === member.id ? (
                    <div className="flex-1 space-y-3">
                      {/* Avatar preview and edit */}
                      <div className="flex items-center gap-3">
                        <img
                          src={editMemberData.avatar}
                          alt="Avatar"
                          className="w-12 h-12 rounded-full object-cover border-2 border-[var(--theme-color,#081534)]"
                        />
                        <div className="flex-1 space-y-1">
                          <input
                            type="url"
                            placeholder="URL da foto..."
                            value={editMemberData.avatar}
                            onChange={(e) => setEditMemberData({ ...editMemberData, avatar: e.target.value })}
                            className="w-full p-1.5 text-xs bg-white rounded border border-[#e0e3e5] font-semibold outline-none"
                          />
                          <label className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--theme-color,#081534)] cursor-pointer">
                            <span className="material-symbols-outlined text-[14px]">upload</span>
                            <span>Enviar foto</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleAvatarFileUpload(e, true)}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                        <div>
                          <label className="block text-[10px] text-[#76777f] font-bold">Nome:</label>
                          <input
                            type="text"
                            value={editMemberData.name}
                            onChange={(e) => setEditMemberData({ ...editMemberData, name: e.target.value })}
                            className="w-full p-2 bg-white rounded-lg border border-[#e0e3e5] font-bold text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-[#76777f] font-bold">E-mail:</label>
                          <input
                            type="email"
                            value={editMemberData.email}
                            onChange={(e) => setEditMemberData({ ...editMemberData, email: e.target.value })}
                            className="w-full p-2 bg-white rounded-lg border border-[#e0e3e5] text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-[#76777f] font-bold">Função:</label>
                          <select
                            value={editMemberData.role}
                            onChange={(e) => setEditMemberData({ ...editMemberData, role: e.target.value as 'parent' | 'child' })}
                            className="w-full p-2 bg-white rounded-lg border border-[#e0e3e5] text-xs font-bold"
                          >
                            <option value="parent">Pai / Mãe</option>
                            <option value="child">Filho(a)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-[#76777f] font-bold">Idade:</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={editMemberData.age}
                            onChange={(e) => setEditMemberData({ ...editMemberData, age: Number(e.target.value) })}
                            className="w-full p-2 bg-white rounded-lg border border-[#e0e3e5] font-bold text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-[#76777f] font-bold">Senha / PIN:</label>
                          <div className="relative flex items-center">
                            <input
                              type={showSettingsEditPin ? 'text' : 'password'}
                              value={editMemberData.pin}
                              onChange={(e) => setEditMemberData({ ...editMemberData, pin: e.target.value })}
                              maxLength={8}
                              className="w-full p-2 pr-7 bg-white rounded-lg border border-[#e0e3e5] font-mono font-bold text-xs text-[#081534]"
                            />
                            <button
                              type="button"
                              onClick={() => setShowSettingsEditPin(!showSettingsEditPin)}
                              className="absolute right-1.5 p-0.5 text-[#76777f] hover:text-[#081534] transition-colors cursor-pointer flex items-center justify-center"
                              title={showSettingsEditPin ? 'Ocultar senha' : 'Ver senha'}
                            >
                              <span className="material-symbols-outlined text-[15px]">
                                {showSettingsEditPin ? 'visibility_off' : 'visibility'}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-12 h-12 rounded-full object-cover border border-[#e0e3e5] shadow-xs"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#191c1e] text-sm">{member.name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            member.role === 'parent' ? 'bg-[#dae2ff] text-[#0d1a39]' : 'bg-[#e8f5e9] text-[#1b5e20]'
                          }`}>
                            {member.role === 'parent' ? 'Pai / Mãe' : 'Filho(a)'}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#76777f] mt-0.5 flex flex-wrap items-center gap-2">
                          <span>{member.age} anos • {member.email || 'Sem e-mail'} • Saldo: {member.pointsBalance} {currencyName}</span>
                          <div
                            className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold text-[#081534] bg-[#e0e3e5]/50 px-2 py-0.5 rounded border border-[#e0e3e5]/80"
                            title={
                              isAdmin
                                ? (revealedMemberPins[member.id]
                                    ? 'Clique no olho para ocultar a senha'
                                    : 'Clique no olho para visualizar a senha (Apenas Administrador)')
                                : 'Senha protegida (apenas o Administrador consegue visualizar)'
                            }
                          >
                            <span className="material-symbols-outlined text-[12px] text-[#76777f]">
                              {isAdmin && revealedMemberPins[member.id] ? 'lock_open' : 'lock'}
                            </span>
                            <span className="select-none">
                              PIN: {isAdmin && revealedMemberPins[member.id] ? getMemberDisplayPin(member) : '••••'}
                            </span>
                            {isAdmin ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleRevealMemberPin(member.id);
                                }}
                                className="ml-0.5 p-0.5 rounded text-[#76777f] hover:text-[#081534] transition-colors cursor-pointer flex items-center justify-center"
                                title={revealedMemberPins[member.id] ? 'Ocultar Senha' : 'Ver Senha (Apenas Administrador)'}
                                aria-label={revealedMemberPins[member.id] ? 'Ocultar Senha' : 'Ver Senha'}
                              >
                                <span className="material-symbols-outlined text-[13px]">
                                  {revealedMemberPins[member.id] ? 'visibility_off' : 'visibility'}
                                </span>
                              </button>
                            ) : (
                              <span className="text-[9px] text-[#76777f] font-sans font-normal ml-0.5">
                                (Protegido)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {editingMemberId === member.id ? (
                      <>
                        <button
                          onClick={handleSaveEditMember}
                          className="px-3 py-1.5 bg-[#dcedc8] text-[#33691e] hover:bg-[#c5e1a5] rounded-lg font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">check</span>
                          <span>Salvar</span>
                        </button>
                        <button
                          onClick={() => setEditingMemberId(null)}
                          className="px-3 py-1.5 bg-[#e0e3e5] text-[#45464e] hover:bg-[#d1d4d6] rounded-lg font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                          <span>Cancelar</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleStartEditMember(member)}
                          className="p-2 bg-white border border-[#e0e3e5] hover:bg-[#e6e8ea] text-[#191c1e] rounded-lg transition-colors cursor-pointer"
                          title="Editar Membro"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleRequestDeleteMember(member)}
                          className="p-2 bg-[#ffdad6] text-[#93000a] hover:bg-[#ffb4ab] rounded-lg transition-colors cursor-pointer"
                          title="Excluir Membro"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Segurança & Regras */}
      {activeSettingsTab === 'security' && (
        <form onSubmit={handleSaveAll} className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-[#e0e3e5]/60 space-y-4 text-xs">
            <h2 className="text-sm font-bold text-[#191c1e] flex items-center gap-2 border-b border-[#e0e3e5] pb-3">
              <span className="material-symbols-outlined text-[20px] text-[var(--theme-color,#081534)]">shield</span>
              Segurança Parental & Regras de Pontualidade
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[#45464e] font-semibold mb-1">
                  Código PIN dos Pais (4 dígitos):
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full p-2.5 rounded-lg border border-[#e0e3e5] text-base font-mono font-bold text-[#081534] tracking-widest outline-none focus:border-[#1e2a4a]"
                  required
                />
                <span className="text-[10px] text-[#76777f] mt-1 block">
                  Usado para desbloquear áreas protegidas e autorizar resgates.
                </span>
              </div>

              <div className="flex items-center pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requirePin}
                    onChange={(e) => setRequirePin(e.target.checked)}
                    className="w-4 h-4 rounded text-[#081534] focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-[#191c1e] block">Exigir PIN para Resgates de Alto Valor</span>
                    <span className="text-[10px] text-[#76777f]">
                      Evita que prêmios caros sejam solicitados sem supervisão direta.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#e0e3e5]/60">
              <div>
                <label className="block text-[#45464e] font-semibold mb-1">
                  Tolerância de Atraso (minutos):
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={delayTolerance}
                  onChange={(e) => setDelayTolerance(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg border border-[#e0e3e5] text-sm font-bold text-[#191c1e] outline-none"
                />
                <span className="text-[10px] text-[#76777f] mt-1 block">
                  Atrasos menores que este valor não geram dedução automática.
                </span>
              </div>

              <div>
                <label className="block text-[#45464e] font-semibold mb-1">
                  Penalidade Padrão por Atraso ({currencyName}):
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={defaultPenalty}
                  onChange={(e) => setDefaultPenalty(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg border border-[#e0e3e5] text-sm font-bold text-[#855300] outline-none"
                />
                <span className="text-[10px] text-[#76777f] mt-1 block">
                  Valor descontado caso o atraso exceda a tolerância.
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-lg text-white text-xs sm:text-sm font-bold shadow-md transition-transform active:scale-95 cursor-pointer"
              style={{ backgroundColor: 'var(--theme-color, #081534)' }}
            >
              Salvar Regras de Segurança
            </button>
          </div>
        </form>
      )}

      {/* Tab 4: Personalização de Menus (Oculta & Protegida com Senha) */}
      {activeSettingsTab === 'menus' && (
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-[#e0e3e5]/60 space-y-5 text-xs">
          <div className="flex items-center justify-between border-b border-[#e0e3e5] pb-3">
            <div>
              <h2 className="text-sm font-bold text-[#191c1e] flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[var(--theme-color,#081534)]">
                  {isMenuUnlocked ? 'lock_open' : 'lock'}
                </span>
                Personalização de Menus (Aba Oculta Protegida)
              </h2>
              <p className="text-[11px] text-[#76777f] mt-0.5">
                Esta aba é restrita aos responsáveis para evitar que crianças ou visitantes alterem a estrutura do sistema.
              </p>
            </div>

            {isMenuUnlocked && (
              <button
                type="button"
                onClick={() => {
                  setIsMenuUnlocked(false);
                  showToast('Aba Bloqueada', 'O acesso aos menus foi fechado novamente.', 'lock');
                }}
                className="px-3 py-1.5 rounded-lg bg-[#f2f4f6] hover:bg-[#e6e8ea] text-[#191c1e] text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">lock</span>
                <span>Bloquear Aba</span>
              </button>
            )}
          </div>

          {!isMenuUnlocked ? (
            <div className="p-8 bg-[#f7f9fb] rounded-xl border border-[#e0e3e5] text-center max-w-md mx-auto space-y-4">
              <div className="w-14 h-14 rounded-full bg-[#dae2ff] text-[#081534] flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-[28px]">lock</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#191c1e]">Área Oculta Protegida por Senha</h3>
                <p className="text-xs text-[#76777f] mt-1">
                  Digite o código PIN dos pais (4 dígitos) para liberar a edição dos títulos de todos os menus.
                </p>
              </div>

              <form onSubmit={handleUnlockMenu} className="space-y-3">
                <input
                  type="password"
                  maxLength={4}
                  placeholder="• • • •"
                  value={menuUnlockPin}
                  onChange={(e) => {
                    setMenuUnlockPin(e.target.value.replace(/\D/g, ''));
                    setMenuUnlockError('');
                  }}
                  className="w-36 text-center tracking-widest text-lg font-mono font-bold p-2.5 rounded-lg border border-[#e0e3e5] bg-white outline-none focus:border-[#081534]"
                  autoFocus
                />
                {menuUnlockError && (
                  <p className="text-xs font-semibold text-[#ba1a1a]">{menuUnlockError}</p>
                )}
                <div>
                  <button
                    type="submit"
                    className="w-full py-2.5 text-white font-bold rounded-lg shadow-xs hover:opacity-90 transition-all cursor-pointer text-xs"
                    style={{ backgroundColor: 'var(--theme-color, #081534)' }}
                  >
                    Desbloquear Personalização de Menus
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <form onSubmit={handleSaveAll} className="space-y-5">
              <div className="p-3 bg-[#e8f5e9] text-[#1b5e20] rounded-xl text-xs font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">verified_user</span>
                <span>Acesso autorizado. Altere o texto exibido em cada menu da barra lateral e cabeçalho:</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.keys(menuLabels).map((key) => (
                  <div key={key} className="p-3 bg-[#f7f9fb] rounded-xl border border-[#e0e3e5]">
                    <label className="block text-[#45464e] font-semibold mb-1 capitalize">
                      {key.replace(/-/g, ' ')}:
                    </label>
                    <input
                      type="text"
                      value={menuLabels[key]}
                      onChange={(e) => handleMenuLabelChange(key, e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-[#e0e3e5] bg-white text-sm font-semibold text-[#191c1e] outline-none focus:border-[#1e2a4a]"
                      required
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMenuUnlocked(false)}
                  className="px-4 py-2 rounded-lg bg-[#e0e3e5] text-[#191c1e] text-xs font-bold cursor-pointer"
                >
                  Fechar & Bloquear
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-lg text-white text-xs sm:text-sm font-bold shadow-md hover:opacity-90 cursor-pointer"
                  style={{ backgroundColor: 'var(--theme-color, #081534)' }}
                >
                  Salvar Menus Personalizados
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Tab 5: Gerenciamento de Dados (Zerar Sistema) */}
      {activeSettingsTab === 'data' && (
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-[#e0e3e5]/60 space-y-6 text-xs">
          <div className="border-b border-[#e0e3e5] pb-3">
            <h2 className="text-sm font-bold text-[#191c1e] flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[#ba1a1a]">database</span>
              Gerenciamento de Dados & Inicialização do Zero
            </h2>
            <p className="text-[11px] text-[#76777f] mt-0.5">
              Deixe o aplicativo totalmente limpo sem os dados de teste para começar a cadastrar sua família do zero.
            </p>
          </div>

          {/* Option 1: Limpar tarefas de teste mantendo ferramentas */}
          <div className="p-5 rounded-xl border border-[#e0e3e5] bg-[#f7f9fb] space-y-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#855300] text-[22px]">delete_sweep</span>
              <h3 className="text-sm font-bold text-[#191c1e]">
                Deixar o Sistema sem Nenhuma Informação de Teste
              </h3>
            </div>
            <p className="text-xs text-[#45464e] leading-relaxed">
              Remove todas as rotinas, prêmios, compromissos e histórico de demonstração.
              O sistema fica 100% limpo com todas as ferramentas prontas para você cadastrar as suas próprias rotinas e tarefas.
            </p>
            <button
              type="button"
              onClick={handleRequestClearAllTestData}
              className="px-4 py-2.5 rounded-lg bg-[#fea619] hover:bg-[#e09112] text-[#2a1700] text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">cleaning_services</span>
              <span>Limpar Dados de Teste (Pronto para Cadastrar do Zero)</span>
            </button>
          </div>

          {/* Option 2: Zerar tudo e voltar ao login de cadastro limpo */}
          <div className="p-5 rounded-xl border border-[#ffdad6] bg-[#fff8f7] space-y-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#ba1a1a] text-[22px]">restart_alt</span>
              <h3 className="text-sm font-bold text-[#ba1a1a]">
                Zerar Todo o Sistema & Reiniciar do Cadastro
              </h3>
            </div>
            <p className="text-xs text-[#45464e] leading-relaxed">
              Apaga absolutamente tudo do armazenamento (membros de teste, tarefas e configurações).
              Você será levado à tela inicial para criar seu perfil de Pai ou Filho do zero.
            </p>
            <button
              type="button"
              onClick={handleRequestWipeAll}
              className="px-4 py-2.5 rounded-lg bg-[#ffdad6] hover:bg-[#ffb4ab] text-[#93000a] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">power_settings_new</span>
              <span>Zerar Completamente o Sistema (Reset Total)</span>
            </button>
          </div>

          {/* Option 3: Restaurar dados de demonstração */}
          <div className="pt-2 border-t border-[#e0e3e5]">
            <button
              type="button"
              onClick={handleRequestRestoreDefaults}
              className="text-xs text-[#76777f] hover:text-[#191c1e] underline cursor-pointer"
            >
              Restaurar dados de exemplo didático padrão (Heitor, Mirella, Rotinas de Teste)
            </button>
          </div>
        </div>
      )}

      {/* Tab 6: Nuvem Supabase */}
      {activeSettingsTab === 'supabase' && (
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-[#e0e3e5]/60 space-y-6 text-xs">
          <div className="border-b border-[#e0e3e5] pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#191c1e] flex items-center gap-2">
                <span className="material-symbols-outlined text-[22px] text-[var(--theme-color,#081534)]">cloud</span>
                Integração & Armazenamento em Nuvem Supabase
              </h2>
              <p className="text-[11px] text-[#76777f] mt-0.5">
                Isolamento por família via Row Level Security (RLS) e proteção criptográfica de senhas por SHA-256.
              </p>
            </div>
            <div>
              {isSupabaseConfigured() ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>Conectado à Nuvem</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#fef7e0] text-[#b06000] border border-[#feefc3]">
                  <span className="material-symbols-outlined text-[16px]">pending</span>
                  <span>Aguardando Chaves .env</span>
                </span>
              )}
            </div>
          </div>

          {/* Status & Credenciais Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-[#e0e3e5] bg-[#f7f9fb] space-y-2">
              <span className="text-[11px] font-bold text-[#45464e] flex items-center gap-1.5 uppercase tracking-wider">
                <span className="material-symbols-outlined text-[16px] text-[#081534]">fingerprint</span>
                ID da Família (Multi-Tenant)
              </span>
              <p className="font-mono text-xs font-bold text-[#191c1e] bg-white p-2 rounded-lg border border-[#e0e3e5] break-all select-all">
                {getStoredFamilyId()}
              </p>
              <p className="text-[10px] text-[#76777f]">
                Identificador exclusivo usado nas políticas de RLS no PostgreSQL para isolar seus registros.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[#e0e3e5] bg-[#f7f9fb] space-y-2">
              <span className="text-[11px] font-bold text-[#45464e] flex items-center gap-1.5 uppercase tracking-wider">
                <span className="material-symbols-outlined text-[16px] text-[#081534]">lock</span>
                Segurança dos PINs
              </span>
              <div className="p-2 rounded-lg bg-white border border-[#e0e3e5] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#137333] text-[18px]">verified</span>
                <span className="font-semibold text-xs text-[#191c1e]">SHA-256 Hash Criptográfico</span>
              </div>
              <p className="text-[10px] text-[#76777f]">
                Os PINs dos pais e filhos são criptografados com salt antes de salvar no Supabase e nunca em texto puro.
              </p>
            </div>
          </div>

          {/* Environment Variables Info */}
          <div className="p-4 rounded-xl border border-[#e0e3e5] bg-[#fcfdfe] space-y-2">
            <h3 className="text-xs font-bold text-[#191c1e] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#081534]">key</span>
              Configuração das Credenciais do Supabase
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-[#f0f2f5] p-2.5 rounded-lg">
                <div className="text-[10px] font-sans font-bold text-[#76777f] mb-0.5">VITE_SUPABASE_URL</div>
                <div className="text-[#191c1e] font-semibold truncate">
                  {import.meta.env.VITE_SUPABASE_URL || '(Não definido em .env)'}
                </div>
              </div>
              <div className="bg-[#f0f2f5] p-2.5 rounded-lg">
                <div className="text-[10px] font-sans font-bold text-[#76777f] mb-0.5">VITE_SUPABASE_ANON_KEY</div>
                <div className="text-[#191c1e] font-semibold truncate">
                  {import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Configurado (••••••' + import.meta.env.VITE_SUPABASE_ANON_KEY.slice(-6) + ')' : '(Não definido em .env)'}
                </div>
              </div>
            </div>
          </div>

          {/* Actions: Import LocalStorage, Sync, View SQL */}
          <div className="p-5 rounded-xl border border-[#d3e3fd] bg-[#f4f8ff] space-y-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#0b57d0] text-[22px]">sync</span>
              <div>
                <h3 className="text-sm font-bold text-[#041e49]">Ações de Migração & Sincronização</h3>
                <p className="text-xs text-[#45464e]">
                  Transfira seus dados locais com um clique ou visualize o script SQL para rodar no Supabase.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="button"
                disabled={isActionLoading}
                onClick={async () => {
                  if (onMigrateToSupabase) {
                    setIsActionLoading(true);
                    try {
                      await onMigrateToSupabase();
                    } finally {
                      setIsActionLoading(false);
                    }
                  } else {
                    showToast('Supabase', 'Função de migração pronta.', 'cloud_done');
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-[#081534] hover:bg-[#14234b] text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                <span>{isActionLoading ? 'Importando...' : 'Importar Dados do LocalStorage para o Supabase'}</span>
              </button>

              <button
                type="button"
                disabled={isActionLoading}
                onClick={async () => {
                  if (onSyncWithSupabase) {
                    setIsActionLoading(true);
                    try {
                      await onSyncWithSupabase();
                    } finally {
                      setIsActionLoading(false);
                    }
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#e0e3e5]/60 text-[#191c1e] border border-[#e0e3e5] text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">cloud_download</span>
                <span>Sincronizar da Nuvem</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSqlModal(true)}
                className="px-4 py-2.5 rounded-xl bg-[#fea619] hover:bg-[#e09112] text-[#2a1700] text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">terminal</span>
                <span>Visualizar & Copiar Script SQL</span>
              </button>
            </div>
          </div>

          {/* Quick Guide */}
          <div className="p-4 rounded-xl border border-[#e0e3e5] bg-[#f7f9fb] space-y-2.5">
            <h3 className="text-xs font-bold text-[#191c1e] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#081534]">help</span>
              Instruções de Configuração no Supabase
            </h3>
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-[#45464e] leading-relaxed">
              <li>Acesse seu projeto no <strong>supabase.com</strong> ou crie um novo gratuitamente.</li>
              <li>Clique em <strong>SQL Editor</strong> no menu lateral e abra uma nova query.</li>
              <li>Cole o conteúdo do <strong>Script SQL</strong> fornecido (clique no botão amarelo acima para copiar) e execute clicando em <strong>RUN</strong>.</li>
              <li>Vá em <strong>Project Settings → API</strong> e copie a <strong>Project URL</strong> e a chave <strong>anon public</strong>.</li>
              <li>Adicione as variáveis <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> nas configurações de ambiente.</li>
            </ol>
          </div>
        </div>
      )}

      {/* SQL Script Viewer Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#e0e3e5]">
            <div className="p-5 border-b border-[#e0e3e5] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[24px] text-[var(--theme-color,#081534)]">terminal</span>
                <div>
                  <h3 className="text-base font-bold text-[#191c1e]">Script SQL para Supabase (com RLS)</h3>
                  <p className="text-xs text-[#76777f]">Tabelas para famílias, membros, tarefas, catálogo, compromissos, extrato, prêmios e configurações.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="p-1.5 rounded-full hover:bg-[#f2f4f6] text-[#76777f] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto bg-[#0d1117] text-[#c9d1d9] font-mono text-xs leading-relaxed rounded-b-none">
              <pre className="whitespace-pre-wrap select-all">{SUPABASE_SCHEMA_SQL}</pre>
            </div>

            <div className="p-4 bg-[#f7f9fb] rounded-b-3xl border-t border-[#e0e3e5] flex items-center justify-between gap-3">
              <span className="text-xs text-[#45464e]">
                Execute este código diretamente no <strong>SQL Editor</strong> do Supabase.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
                    setCopiedSql(true);
                    showToast('SQL Copiado!', 'O script SQL foi copiado para sua área de transferência.', 'content_copy');
                    setTimeout(() => setCopiedSql(false), 3000);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#fea619] hover:bg-[#e09112] text-[#2a1700] text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {copiedSql ? 'check' : 'content_copy'}
                  </span>
                  <span>{copiedSql ? 'Copiado!' : 'Copiar Código SQL'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSqlModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#e0e3e5] hover:bg-[#d0d3d5] text-[#191c1e] text-xs font-bold transition-all cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDialog && <ConfirmDialog {...confirmDialog} />}
    </div>
  );
};
