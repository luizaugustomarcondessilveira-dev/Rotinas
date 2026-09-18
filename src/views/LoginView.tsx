import React, { useState } from 'react';
import { Member } from '../types';

interface LoginViewProps {
  members: Member[];
  onLogin: (memberId: string) => void;
  onRegister: (member: Omit<Member, 'id' | 'pointsBalance' | 'pointsEarnedTotal' | 'pointsSpentTotal' | 'level' | 'badge' | 'weeklyConsistency' | 'streakDays'>) => void;
  onRestoreDefaults?: () => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
];

export const LoginView: React.FC<LoginViewProps> = ({
  members,
  onLogin,
  onRegister,
  onRestoreDefaults
}) => {
  const [isRegistering, setIsRegistering] = useState(members.length === 0);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState('');

  // Search/manual login state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');

  // Registration state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [regPin, setRegPin] = useState('1234');
  const [role, setRole] = useState<'parent' | 'child'>('parent');
  const [age, setAge] = useState(35);
  const [avatar, setAvatar] = useState(PRESET_AVATARS[0]);
  const [regError, setRegError] = useState('');

  const handleSelectMember = (member: Member) => {
    setSelectedMember(member);
    setEnteredPin('');
    setPinError('');
    setShowPin(false);
  };

  const handleVerifyPinAndLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedMember) return;

    const cleanInput = enteredPin.trim();
    const correctPin = selectedMember.pin || (selectedMember.role === 'parent' ? '1234' : '1010');

    if (cleanInput === correctPin) {
      onLogin(selectedMember.id);
    } else {
      setPinError(`Senha incorreta para ${selectedMember.name}. Tente novamente.`);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim().toLowerCase();
    const found = members.find(
      (m) => (m.email && m.email.toLowerCase() === q) || (m.name && m.name.toLowerCase() === q)
    );

    if (found) {
      handleSelectMember(found);
      setSearchError('');
    } else {
      setSearchError('Usuário não encontrado. Selecione abaixo ou crie um novo perfil.');
    }
  };

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRoleChange = (newRole: 'parent' | 'child') => {
    setRole(newRole);
    if (newRole === 'parent') {
      if (age < 18) setAge(35);
      if (regPin === '1010') setRegPin('1234');
    } else {
      if (age >= 18) setAge(10);
      if (regPin === '1234') setRegPin('1010');
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail && members.some(m => m.email && m.email.toLowerCase() === cleanEmail)) {
      setRegError('Este e-mail já está cadastrado.');
      return;
    }

    if (!regPin.trim()) {
      setRegError('Por favor, defina uma senha ou PIN para esta conta.');
      return;
    }

    onRegister({
      name: name.trim(),
      email: cleanEmail || `${name.trim().toLowerCase().replace(/\s+/g, '')}@familia.com`,
      role,
      age: Number(age),
      avatar: avatar || PRESET_AVATARS[0],
      pin: regPin.trim()
    });
  };

  return (
    <div className="min-h-screen bg-[#f7f9fb] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center">
          <div
            className="w-20 h-20 rounded-3xl text-[#fea619] flex items-center justify-center shadow-lg"
            style={{ backgroundColor: 'var(--theme-color, #081534)' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12" viewBox="0 0 512 512" fill="none">
              <path d="M256 128C220.654 128 192 156.654 192 192C192 227.346 220.654 256 256 256C291.346 256 320 227.346 320 192C320 156.654 291.346 128 256 128ZM256 288C194.24 288 128 318.914 128 384V416H384V384C384 318.914 317.76 288 256 288Z" fill="currentColor"/>
            </svg>
          </div>
        </div>
        <h2
          className="mt-5 text-2xl sm:text-3xl font-extrabold"
          style={{ color: 'var(--theme-color, #081534)' }}
        >
          Rotinas da Família
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-[#45464e]">
          {isRegistering
            ? 'Cadastre um novo perfil de Pai Administrador ou Filho'
            : selectedMember
            ? `Autenticação segura para ${selectedMember.name}`
            : 'Cada perfil possui sua própria senha e permissões preservadas'}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-5 shadow-sm sm:rounded-3xl sm:px-8 border border-[#e0e3e5]/60">
          
          {/* STATE 1: PIN PROMPT FOR SELECTED MEMBER */}
          {selectedMember && !isRegistering && (
            <div className="space-y-6">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-2">
                  <img
                    src={selectedMember.avatar}
                    alt={selectedMember.name}
                    className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md ring-4 ring-[#fea619]/40"
                  />
                  <span className="absolute bottom-0 right-0 text-xl">
                    {selectedMember.role === 'parent' ? '🛡️' : '🚀'}
                  </span>
                </div>

                <h3 className="text-lg font-black text-[#191c1e]">
                  {selectedMember.name}
                </h3>

                <span className={`mt-1 inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold ${
                  selectedMember.role === 'parent'
                    ? 'bg-[#dae2ff] text-[#0d1a39]'
                    : 'bg-[#ffddb8] text-[#4d2c00]'
                }`}>
                  <span className="material-symbols-outlined text-[14px]">
                    {selectedMember.role === 'parent' ? 'admin_panel_settings' : 'face'}
                  </span>
                  {selectedMember.role === 'parent' ? 'Pai Administrador' : 'Conta do Filho(a)'}
                </span>

                <p className="text-[11px] text-[#76777f] mt-2 max-w-xs">
                  {selectedMember.role === 'parent'
                    ? 'Acesso total a auditorias, aprovações, relatórios e configurações da família.'
                    : 'Acesso individualizado: você verá somente suas próprias rotinas, estrelas e compromissos.'}
                </p>
              </div>

              {/* PIN / Password Form */}
              <form onSubmit={handleVerifyPinAndLogin} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="account-pin" className="block text-xs font-bold text-[#191c1e]">
                      Digite a Senha da Conta:
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="text-[11px] text-[#76777f] hover:text-[#191c1e] flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {showPin ? 'visibility_off' : 'visibility'}
                      </span>
                      <span>{showPin ? 'Ocultar' : 'Mostrar'}</span>
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      id="account-pin"
                      type={showPin ? 'text' : 'password'}
                      autoFocus
                      required
                      value={enteredPin}
                      onChange={(e) => {
                        setEnteredPin(e.target.value);
                        setPinError('');
                      }}
                      placeholder="Senha / PIN de acesso"
                      className="appearance-none block w-full px-4 py-3.5 border border-[#e0e3e5] rounded-2xl shadow-xs text-center font-mono text-lg font-bold tracking-widest placeholder:tracking-normal placeholder:font-sans placeholder:text-xs placeholder:text-[#76777f] focus:outline-none focus:border-[#081534] transition-all"
                    />
                  </div>

                  {/* Friendly credential badge for testing */}
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-[#76777f] font-medium">
                      🔒 Senha de teste: <strong className="font-mono text-[#081534]">{selectedMember.pin || '1234'}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setEnteredPin(selectedMember.pin || '1234')}
                      className="text-[#00388f] hover:underline font-bold cursor-pointer"
                    >
                      Preencher
                    </button>
                  </div>

                  {pinError && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-[#ffdad6]/60 border border-[#ba1a1a]/30 flex items-center gap-2 text-xs font-semibold text-[#ba1a1a]">
                      <span className="material-symbols-outlined text-[18px]">error</span>
                      <span>{pinError}</span>
                    </div>
                  )}
                </div>

                {/* Quick numeric buttons for touch convenience */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => {
                        setEnteredPin(prev => prev + digit);
                        setPinError('');
                      }}
                      className="py-2.5 rounded-xl bg-[#f2f4f6] hover:bg-[#e6e8ea] active:scale-95 text-sm font-bold text-[#191c1e] transition-all cursor-pointer"
                    >
                      {digit}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setEnteredPin('')}
                    className="py-2.5 rounded-xl bg-[#f2f4f6] hover:bg-[#e6e8ea] active:scale-95 text-xs font-bold text-[#76777f] transition-all cursor-pointer"
                  >
                    Limpar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEnteredPin(prev => prev + '0');
                      setPinError('');
                    }}
                    className="py-2.5 rounded-xl bg-[#f2f4f6] hover:bg-[#e6e8ea] active:scale-95 text-sm font-bold text-[#191c1e] transition-all cursor-pointer"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={() => setEnteredPin(prev => prev.slice(0, -1))}
                    className="py-2.5 rounded-xl bg-[#f2f4f6] hover:bg-[#e6e8ea] active:scale-95 text-xs font-bold text-[#ba1a1a] transition-all cursor-pointer flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-[18px]">backspace</span>
                  </button>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl shadow-md text-sm font-bold text-white transition-all hover:opacity-95 active:scale-95 cursor-pointer"
                    style={{ backgroundColor: 'var(--theme-color, #081534)' }}
                  >
                    <span className="material-symbols-outlined text-[18px]">lock_open</span>
                    <span>Entrar na Conta</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMember(null);
                      setEnteredPin('');
                      setPinError('');
                    }}
                    className="w-full py-2.5 rounded-xl text-xs font-bold text-[#45464e] hover:bg-[#f2f4f6] transition-colors cursor-pointer"
                  >
                    Trocar de Perfil
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STATE 2: MEMBER SELECTION (CARDS & SEARCH) */}
          {!selectedMember && !isRegistering && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#76777f]">
                    Selecione seu Perfil:
                  </span>
                  <span className="text-[11px] text-[#76777f]">Requer senha</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {members.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleSelectMember(m)}
                      className="p-3.5 border border-[#e0e3e5] rounded-2xl bg-[#f7f9fb] hover:bg-white hover:border-[var(--theme-color,#081534)] hover:shadow-md text-left transition-all cursor-pointer flex items-center gap-3 group active:scale-98"
                    >
                      <div className="relative shrink-0">
                        <img
                          src={m.avatar}
                          alt={m.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-xs group-hover:scale-105 transition-transform"
                        />
                        <span className="absolute -bottom-1 -right-1 text-xs">
                          {m.role === 'parent' ? '🛡️' : '⭐'}
                        </span>
                      </div>
                      <div className="truncate flex-1">
                        <div className="text-sm font-extrabold text-[#191c1e] group-hover:text-[#081534] truncate">
                          {m.name}
                        </div>
                        <div className="text-[11px] font-semibold text-[#76777f]">
                          {m.role === 'parent' ? 'Pai Administrador' : 'Filho(a)'}
                        </div>
                        <div className="text-[10px] text-[#00388f] font-mono mt-0.5">
                          PIN: ••••
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-[#76777f] group-hover:text-[#081534] text-[18px]">
                        lock
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Search by email/name as alternate */}
              <div className="pt-2 border-t border-[#e0e3e5]/60">
                <form onSubmit={handleSearchSubmit} className="space-y-3">
                  <label htmlFor="search-user" className="block text-xs font-bold text-[#45464e]">
                    Ou acerte digitando e-mail / nome:
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="search-user"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setSearchError('');
                      }}
                      placeholder="Ex: pai@familia.com ou Heitor"
                      className="flex-1 px-3.5 py-2.5 border border-[#e0e3e5] rounded-xl text-xs font-medium placeholder-[#76777f] focus:outline-none focus:border-[#081534]"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 rounded-xl bg-[#081534] text-white text-xs font-bold hover:opacity-90 cursor-pointer"
                    >
                      Avançar
                    </button>
                  </div>
                  {searchError && (
                    <p className="text-xs text-[#ba1a1a] font-semibold">{searchError}</p>
                  )}
                </form>
              </div>

              {/* Registration Link */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(true);
                    setRegError('');
                  }}
                  className="text-xs font-bold hover:underline cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
                  style={{ color: 'var(--theme-color, #081534)' }}
                >
                  <span className="material-symbols-outlined text-[16px]">person_add</span>
                  <span>Cadastrar Novo Perfil com Senha</span>
                </button>
              </div>
            </div>
          )}

          {/* STATE 3: REGISTRATION WITH PASSWORD/PIN */}
          {isRegistering && (
            <form className="space-y-4 text-xs" onSubmit={handleRegisterSubmit}>
              <div className="border-b border-[#e0e3e5] pb-3 mb-2">
                <h3 className="font-extrabold text-sm text-[#191c1e]">
                  Cadastro de Novo Membro
                </h3>
                <p className="text-[11px] text-[#76777f] mt-0.5">
                  Cada conta tem sua própria senha e permissões de acesso.
                </p>
              </div>

              {/* Profile Type: Parent vs Child */}
              <div>
                <label className="block text-xs font-bold text-[#191c1e] mb-1.5">
                  Tipo de Conta:
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleRoleChange('parent')}
                    className={`p-3 rounded-2xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      role === 'parent'
                        ? 'border-2 shadow-xs bg-[#dae2ff]/30'
                        : 'border-[#e0e3e5] bg-[#f7f9fb] text-[#45464e]'
                    }`}
                    style={role === 'parent' ? { borderColor: 'var(--theme-color, #081534)' } : undefined}
                  >
                    <span className="material-symbols-outlined text-[24px]">supervisor_account</span>
                    <span className="font-extrabold text-xs">Pai / Mãe</span>
                    <span className="text-[10px] text-[#76777f]">Administrador Geral</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleChange('child')}
                    className={`p-3 rounded-2xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      role === 'child'
                        ? 'border-2 shadow-xs bg-[#ffddb8]/30'
                        : 'border-[#e0e3e5] bg-[#f7f9fb] text-[#45464e]'
                    }`}
                    style={role === 'child' ? { borderColor: 'var(--theme-color, #081534)' } : undefined}
                  >
                    <span className="material-symbols-outlined text-[24px]">face</span>
                    <span className="font-extrabold text-xs">Filho(a)</span>
                    <span className="text-[10px] text-[#76777f]">Isolado & Seguro</span>
                  </button>
                </div>
              </div>

              {/* Avatar Selector */}
              <div>
                <label className="block text-xs font-bold text-[#191c1e] mb-1">
                  Foto ou Avatar:
                </label>
                <div className="flex items-center gap-3">
                  <img
                    src={avatar}
                    alt="Preview"
                    className="w-12 h-12 rounded-full object-cover border-2 border-[var(--theme-color,#081534)] shrink-0 shadow-xs"
                  />
                  <div className="flex-1 space-y-1">
                    <label className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#f2f4f6] text-[#191c1e] hover:bg-[#e6e8ea] rounded-lg text-[11px] font-bold cursor-pointer border border-[#e0e3e5]">
                      <span className="material-symbols-outlined text-[14px]">upload</span>
                      <span>Carregar imagem</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarFileUpload}
                        className="hidden"
                      />
                    </label>
                    <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
                      {PRESET_AVATARS.map((url, idx) => (
                        <img
                          key={idx}
                          src={url}
                          alt={`Avatar ${idx}`}
                          onClick={() => setAvatar(url)}
                          className={`w-7 h-7 rounded-full object-cover cursor-pointer hover:scale-110 transition-transform border-2 ${
                            avatar === url ? 'border-[var(--theme-color,#081534)] ring-1 ring-[#dae2ff]' : 'border-transparent'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-[#191c1e]">Nome</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setRegError('');
                  }}
                  placeholder={role === 'parent' ? 'Ex: Carlos Silva' : 'Ex: Heitor'}
                  className="mt-1 appearance-none block w-full px-3.5 py-2.5 border border-[#e0e3e5] rounded-xl shadow-xs placeholder-[#76777f] focus:outline-none text-xs font-medium"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-[#191c1e]">E-mail</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setRegError('');
                  }}
                  placeholder="ex: nome@familia.com"
                  className="mt-1 appearance-none block w-full px-3.5 py-2.5 border border-[#e0e3e5] rounded-xl shadow-xs placeholder-[#76777f] focus:outline-none text-xs font-medium"
                />
              </div>

              {/* Password / PIN */}
              <div>
                <label className="block text-xs font-bold text-[#191c1e]">
                  Senha / PIN de Acesso da Conta (4 a 6 dígitos)
                </label>
                <input
                  type="password"
                  required
                  value={regPin}
                  onChange={(e) => {
                    setRegPin(e.target.value);
                    setRegError('');
                  }}
                  placeholder="Ex: 1234 ou 1010"
                  className="mt-1 appearance-none block w-full px-3.5 py-2.5 border border-[#e0e3e5] rounded-xl shadow-xs font-mono font-bold text-xs tracking-wider focus:outline-none"
                />
                <span className="text-[10px] text-[#76777f] mt-1 block">
                  Esta senha será solicitada sempre que este usuário for entrar.
                </span>
              </div>

              {/* Age */}
              <div>
                <label className="block text-xs font-bold text-[#191c1e]">Idade</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  required
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="mt-1 appearance-none block w-full px-3.5 py-2.5 border border-[#e0e3e5] rounded-xl shadow-xs font-medium text-xs"
                />
              </div>

              {regError && (
                <p className="text-xs text-[#ba1a1a] font-semibold">{regError}</p>
              )}

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  className="w-full flex justify-center py-3 px-4 rounded-xl shadow-sm text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95 cursor-pointer"
                  style={{ backgroundColor: 'var(--theme-color, #081534)' }}
                >
                  Concluir Cadastro e Acessar
                </button>

                {members.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegistering(false);
                      setRegError('');
                    }}
                    className="w-full py-2 text-xs font-bold text-[#76777f] hover:text-[#191c1e] cursor-pointer"
                  >
                    Voltar para Seleção de Perfis
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Restore Defaults button */}
          {onRestoreDefaults && !selectedMember && (
            <div className="mt-6 pt-4 border-t border-[#e0e3e5] text-center">
              <button
                type="button"
                onClick={onRestoreDefaults}
                className="text-[11px] text-[#76777f] hover:text-[#191c1e] underline cursor-pointer"
              >
                Restaurar dados padrão de demonstração (Heitor: 1010, Mirella: 2020, Pais: 1234)
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
