import React, { useState, useEffect } from 'react';
import { Member, AppNotification } from '../types';
import { ASSETS } from '../data/initialData';
import { usePWAInstall } from './usePWAInstall';

interface HeaderProps {
  familyName: string;
  currentMember: Member;
  pendingCount: number;
  notifications: AppNotification[];
  members: Member[];
  onOpenNewActivity: () => void;
  onToggleMobileMenu: () => void;
  onToggleKidMode: () => void;
  isKidMode: boolean;
  onOpenNotifications: () => void;
  onMarkNotificationRead: (id: string) => void;
  onClearNotifications: () => void;
  onUpdateFamilyName: (name: string) => void;
  onSwitchUser: (memberId: string) => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  familyName,
  currentMember,
  pendingCount,
  notifications,
  members,
  onOpenNewActivity,
  onToggleMobileMenu,
  onToggleKidMode,
  isKidMode,
  onMarkNotificationRead,
  onClearNotifications,
  onUpdateFamilyName,
  onSwitchUser,
  onLogout
}) => {
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showFamilyDropdown, setShowFamilyDropdown] = useState(false);
  const [isEditingFamily, setIsEditingFamily] = useState(false);
  const [tempFamilyName, setTempFamilyName] = useState(familyName);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const { isInstallable, isInstalled, install, isIOS } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const handleFamilySave = (e: React.FormEvent) => {
    e.preventDefault();
    if(tempFamilyName.trim()) {
      onUpdateFamilyName(tempFamilyName.trim());
      setIsEditingFamily(false);
    }
  };

  const parentMembers = members.filter(m => m.role === 'parent');

  if (isKidMode) return null; // Kid mode handles its own top bar

  return (
    <header
      id="main-header"
      className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-[#f7f9fb]/90 backdrop-blur-xl border-b border-[#e0e3e5]/60 z-40 flex items-center justify-between px-4 sm:px-8"
    >
      {/* Left side: Hamburger (mobile) & Family Selector & Date */}
      <div className="flex items-center gap-3">
        <button
          id="btn-mobile-menu"
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-lg text-[#45464e] hover:bg-[#eceef0]"
          aria-label="Abrir Menu"
        >
          <span className="material-symbols-outlined text-[24px]">menu</span>
        </button>

        <div className="relative">
          <div 
            onClick={() => setShowFamilyDropdown(!showFamilyDropdown)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f2f4f6] hover:bg-[#eceef0] transition-colors cursor-pointer border border-[#e0e3e5]/50"
          >
            <span className="material-symbols-outlined text-[#45464e] text-[20px]">home</span>
            <span className="text-sm font-semibold text-[#191c1e]">{familyName}</span>
            <span className="material-symbols-outlined text-[#45464e] text-[18px]">arrow_drop_down</span>
          </div>

          {showFamilyDropdown && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-[#e0e3e5]/60 p-4 z-50">
              {isEditingFamily ? (
                <form onSubmit={handleFamilySave} className="space-y-2">
                  <input
                    type="text"
                    value={tempFamilyName}
                    onChange={(e) => setTempFamilyName(e.target.value)}
                    className="w-full text-xs font-bold border border-[#e0e3e5] rounded-lg p-2 outline-none focus:border-[#081534]"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 text-white text-xs font-bold py-1.5 rounded-lg"
                      style={{ backgroundColor: 'var(--theme-color, #081534)' }}
                    >
                      Salvar
                    </button>
                    <button type="button" onClick={() => setIsEditingFamily(false)} className="flex-1 bg-[#f2f4f6] text-[#45464e] text-xs font-bold py-1.5 rounded-lg">Cancelar</button>
                  </div>
                </form>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => setIsEditingFamily(true)}
                    className="w-full text-left px-2 py-1.5 text-xs font-bold hover:bg-[#f2f4f6] rounded-lg flex items-center gap-2 cursor-pointer"
                    style={{ color: 'var(--theme-color, #081534)' }}
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span> Editar Nome da Família
                  </button>
                  <button onClick={() => { onUpdateFamilyName('Minha Família'); setShowFamilyDropdown(false); }} className="w-full text-left px-2 py-1.5 text-xs font-bold text-[#ba1a1a] hover:bg-[#ffdad6]/30 rounded-lg flex items-center gap-2 cursor-pointer">
                    <span className="material-symbols-outlined text-[16px]">delete</span> Apagar Família
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="hidden md:block text-xs text-[#76777f] font-medium capitalize ml-2">
          {today}
        </div>
      </div>

      {/* Right side: Actions cluster */}
      <div className="flex items-center gap-2 sm:gap-4">
        
        {/* PWA Install Button */}
        {isInstallable && !isInstalled && (
          <button
            onClick={install}
            className="hidden sm:flex items-center gap-1.5 bg-[#fea619] hover:bg-[#ffddb8] text-[#2a1700] px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            Instalar App
          </button>
        )}
        {isIOS && !isInstalled && (
          <button
            onClick={() => setShowIOSGuide(true)}
            className="hidden sm:flex items-center gap-1.5 bg-[#fea619] hover:bg-[#ffddb8] text-[#2a1700] px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">install_mobile</span>
            Instalar (iOS)
          </button>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="relative p-2 rounded-lg text-[#45464e] hover:bg-[#eceef0] hover:text-[#191c1e] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#fea619] text-[10px] font-bold text-[#2a1700] ring-2 ring-white">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-[#e0e3e5]/60 overflow-hidden z-50 flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#e0e3e5]/60 bg-[#f7f9fb]">
                <span className="text-sm font-bold" style={{ color: 'var(--theme-color, #081534)' }}>Notificações</span>
                <button 
                  onClick={onClearNotifications}
                  className="text-[11px] font-semibold text-[#76777f] hover:text-[#191c1e]"
                >
                  Limpar
                </button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#76777f]">Nenhuma notificação.</div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id} 
                      className={`p-4 border-b border-[#e0e3e5]/30 flex items-start gap-3 transition-colors ${!n.isRead ? 'bg-[#dae2ff]/10 cursor-pointer hover:bg-[#dae2ff]/20' : 'opacity-70'}`}
                      onClick={() => !n.isRead && onMarkNotificationRead(n.id)}
                    >
                      <span
                        className="material-symbols-outlined text-[18px] mt-0.5"
                        style={{ color: 'var(--theme-color, #081534)' }}
                      >
                        {n.isRead ? 'notifications_paused' : 'notifications_active'}
                      </span>
                      <div>
                        <div className={`text-xs ${!n.isRead ? 'font-bold text-[#191c1e]' : 'font-medium text-[#45464e]'}`}>{n.title}</div>
                        <div className="text-[11px] text-[#76777f] mt-1">{n.message}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* New Activity CTA */}
        <button
          onClick={onOpenNewActivity}
          className="hidden sm:flex items-center gap-1.5 text-white px-3.5 py-1.5 rounded-lg shadow-xs transition-all text-sm font-semibold cursor-pointer active:scale-95 hover:opacity-90"
          style={{ backgroundColor: 'var(--theme-color, #081534)' }}
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Nova Atividade</span>
        </button>

        <div className="h-6 w-px bg-[#e0e3e5] hidden sm:block"></div>

        {/* Profile / Kid Mode Switch */}
        <div className="relative">
          <button 
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="flex items-center gap-2 outline-none cursor-pointer hover:bg-[#eceef0] p-1.5 rounded-lg transition-colors"
          >
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-[#191c1e]">{currentMember.name}</div>
              <div className="text-[10px] text-[#76777f] font-semibold">{currentMember.badge}</div>
            </div>
            <img
              className="w-9 h-9 rounded-full object-cover ring-2 ring-[#dae2ff]"
              src={currentMember.avatar || ASSETS.dad}
              alt={currentMember.name}
            />
          </button>

          {showProfileDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-[#e0e3e5]/60 overflow-hidden z-50 py-2">
              <div className="px-4 py-2 border-b border-[#e0e3e5]/60 mb-2">
                <div className="text-[10px] uppercase font-bold text-[#76777f]">Acessar como:</div>
              </div>
              
              {parentMembers.map(parent => (
                <button
                  key={parent.id}
                  onClick={() => {
                    onSwitchUser(parent.id);
                    setShowProfileDropdown(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-xs flex items-center gap-3 hover:bg-[#f2f4f6] ${currentMember.id === parent.id ? 'font-bold bg-[#f2f4f6]' : 'font-medium text-[#45464e]'}`}
                  style={currentMember.id === parent.id ? { color: 'var(--theme-color, #081534)' } : undefined}
                >
                  <img src={parent.avatar} className="w-6 h-6 rounded-full" />
                  {parent.name}
                </button>
              ))}

              <div className="border-t border-[#e0e3e5]/60 my-2"></div>
              
              <button 
                onClick={() => {
                  onToggleKidMode();
                  setShowProfileDropdown(false);
                }}
                className="w-full text-left px-4 py-2 text-xs font-bold text-[#855300] hover:bg-[#ffddb8]/30 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">child_care</span>
                Ativar Modo Filho
              </button>

              <button 
                onClick={onLogout}
                className="w-full text-left px-4 py-2 text-xs font-bold text-[#ba1a1a] hover:bg-[#ffdad6]/30 flex items-center gap-2 mt-1"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                Sair / Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* iOS Install Guide */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl text-center">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--theme-color, #081534)' }}>Instalar no iPhone / iPad</h3>
            <p className="mt-3 text-sm text-[#45464e]">
              1. Toque no botão de <strong>Compartilhar</strong> na barra do Safari.<br /><br />
              2. Role a tela e toque em <strong>"Adicionar à Tela de Início"</strong>.
            </p>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-lg py-2.5 text-sm font-bold text-white shadow-xs"
              style={{ backgroundColor: 'var(--theme-color, #081534)' }}
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
