import React, { useState } from 'react';
import { ActiveTab } from '../types';
import { ASSETS } from '../data/initialData';
import { ConfirmDialog } from './ConfirmDialog';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  pendingCount: number;
  isPinLocked: boolean;
  onOpenPinModal: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  menuLabels?: Record<string, string>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  pendingCount,
  isPinLocked,
  onOpenPinModal,
  isMobileOpen = false,
  onCloseMobile,
  menuLabels
}) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const menuItems: { id: ActiveTab; label: string; icon: string; badge?: number }[] = [
    { id: 'dashboard-aprovacoes', label: menuLabels?.['dashboard-aprovacoes'] || 'Dashboard & Aprovações', icon: 'space_dashboard', badge: pendingCount },
    { id: 'compromissos', label: menuLabels?.['compromissos'] || 'Compromissos', icon: 'event_note' },
    { id: 'catalogo-de-atividades', label: menuLabels?.['catalogo-de-atividades'] || 'Catálogo de Atividades', icon: 'checklist' },
    { id: 'carteira-extrato', label: menuLabels?.['carteira-extrato'] || 'Carteira & Extrato', icon: 'account_balance_wallet' },
    { id: 'loja-de-incentivos', label: menuLabels?.['loja-de-incentivos'] || 'Loja de Incentivos', icon: 'redeem' },
    { id: 'membros-da-familia', label: menuLabels?.['membros-da-familia'] || 'Membros da Família', icon: 'groups' },
    { id: 'configuracoes', label: menuLabels?.['configuracoes'] || 'Configurações', icon: 'settings' },
  ];

  const handleSelect = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      <aside
        id="main-sidebar"
        className={`fixed left-0 top-0 h-full w-64 bg-[#f2f4f6] shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between select-none transition-transform duration-300 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col">
          {/* Logo Header */}
          <div className="h-16 px-6 flex items-center gap-2 border-b border-[#e0e3e5]/60">
            <div
              className="w-8 h-8 rounded-xl text-[#fea619] flex items-center justify-center"
              style={{ backgroundColor: 'var(--theme-color, #081534)' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 512 512" fill="none">
                <path d="M256 128C220.654 128 192 156.654 192 192C192 227.346 220.654 256 256 256C291.346 256 320 227.346 320 192C320 156.654 291.346 128 256 128ZM256 288C194.24 288 128 318.914 128 384V416H384V384C384 318.914 317.76 288 256 288Z" fill="currentColor"/>
              </svg>
            </div>
            <span
              className="font-extrabold text-lg tracking-tight flex items-center gap-1.5"
              style={{ color: 'var(--theme-color, #081534)' }}
            >
              Rotinas
            </span>
          </div>

          {/* Navigation Links */}
          <div className="px-3 mt-3">
            <nav className="flex flex-col gap-1">
              {menuItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-${item.id}`}
                    onClick={() => handleSelect(item.id)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-all text-sm font-semibold cursor-pointer text-left ${
                      isActive
                        ? 'text-white shadow-xs font-bold'
                        : 'text-[#45464e] hover:bg-[#e6e8ea] hover:text-[#191c1e]'
                    }`}
                    style={isActive ? { backgroundColor: 'var(--theme-color, #081534)' } : undefined}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-[20px]">
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                          isActive
                            ? 'bg-[#fea619] text-[#2a1700]'
                            : 'bg-[#fea619]/20 text-[#855300]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom Status & Security PIN Quick Trigger */}
        <div className="p-3 flex flex-col gap-2 bg-white/70 mx-3 mb-4 rounded-xl border border-[#e0e3e5]/60">
          <button 
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center justify-center gap-2 w-full py-1.5 px-3 bg-[#ffdad6] hover:bg-[#ffb4ab] text-[#93000a] text-xs font-bold rounded-lg transition-colors cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            Sair do App
          </button>
          
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#00a673] animate-pulse"></span>
              <span className="text-[11px] font-medium text-[#45464e]">Sincronizado localmente</span>
            </div>
          </div>
          <div className="text-[10px] text-[#76777f] text-center">
            Rotinas da Família v3.0
          </div>
        </div>
      </aside>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Sair do Aplicativo?"
        message="Deseja realmente desconectar e voltar à tela inicial de seleção de perfil?"
        confirmLabel="Sair do App"
        cancelLabel="Cancelar"
        variant="danger"
        icon="logout"
        onConfirm={() => {
          localStorage.removeItem('familyflow_user');
          window.location.reload();
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </>
  );
};
