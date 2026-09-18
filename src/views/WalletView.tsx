import React, { useState } from 'react';
import { Member, Transaction } from '../types';

interface WalletViewProps {
  members: Member[];
  transactions: Transaction[];
  onAddManualBonus: (memberId: string, amount: number, reason: string) => void;
  showToast: (title: string, desc: string, icon?: string) => void;
  currencyName: string;
  menuLabels?: Record<string, string>;
}

export const WalletView: React.FC<WalletViewProps> = ({
  members,
  transactions,
  onAddManualBonus,
  showToast,
  currencyName,
  menuLabels
}) => {
  const [selectedChildId, setSelectedChildId] = useState<string>(
    members.find(m => m.role === 'child')?.id || ''
  );
  const [bonusAmount, setBonusAmount] = useState<number>(20);
  const [bonusReason, setBonusReason] = useState<string>('Bônus de colaboração voluntária');
  const [isBonusModalOpen, setIsBonusModalOpen] = useState<boolean>(false);

  const currentMember = members.find((m) => m.id === selectedChildId) || members[0];
  const memberTransactions = transactions.filter((t) => t.memberId === selectedChildId);

  const handleGiveBonus = (e: React.FormEvent) => {
    e.preventDefault();
    if (bonusAmount <= 0) return;
    onAddManualBonus(selectedChildId, bonusAmount, bonusReason);
    setIsBonusModalOpen(false);
    showToast('Bônus Creditado!', `+${bonusAmount} ${currencyName} adicionados para ${currentMember.name}.`, 'toll');
  };

  return (
    <div className="flex flex-col w-full pb-12 gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-6 rounded-2xl shadow-xs border border-[#e0e3e5]/60 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#081534] text-[24px]">
              account_balance_wallet
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#081534]">
              {menuLabels?.['carteira-extrato'] || 'Carteira Digital & Extrato de Pontos'}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#45464e] mt-1">
            Acompanhe o saldo em tempo real, fluxo de créditos por rotinas cumpridas e histórico de resgates.
          </p>
        </div>

        {/* Child switcher pills */}
        <div className="flex items-center bg-[#f2f4f6] p-1 rounded-xl self-start sm:self-auto border border-[#e0e3e5]/50">
          {members
            .filter((m) => m.role === 'child')
            .map((child) => (
              <button
                key={child.id}
                onClick={() => setSelectedChildId(child.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedChildId === child.id
                    ? 'bg-white text-[#081534] shadow-xs'
                    : 'text-[#45464e] hover:text-[#191c1e]'
                }`}
              >
                <img className="w-5 h-5 rounded-full object-cover" alt={child.name} src={child.avatar} />
                <span>{child.name}</span>
                <span className="text-[11px] font-extrabold text-[#855300]">
                  {child.pointsBalance} {currencyName}
                </span>
              </button>
            ))}
        </div>
      </div>

      {/* Main Wallet Hero Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Big Balance & Level Card (2 Cols) */}
        <div className="lg:col-span-2 bg-gradient-to-br from-[#081534] via-[#1e2a4a] to-[#003220] rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden flex flex-col justify-between min-h-[220px]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#fea619]/15 blur-3xl pointer-events-none"></div>

          <div className="flex items-start justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3.5">
              <img
                className="w-14 h-14 rounded-full object-cover ring-2 ring-[#dae2ff] shadow-md"
                alt={currentMember.name}
                src={currentMember.avatar}
              />
              <div>
                <div className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Carteira de {currentMember.name}</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#fea619] text-[#2a1700] text-xs font-extrabold">
                    {currentMember.badge}
                  </span>
                </div>
                <div className="text-xs text-[#bac5ee]">
                  {currentMember.age} anos • {currentMember.streakDays} dias de ofensiva sem atrasos graves
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsBonusModalOpen(true)}
              className="flex items-center gap-1.5 bg-[#fea619] hover:bg-[#ffddb8] text-[#2a1700] text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">volunteer_activism</span>
              <span>Conceder Bônus</span>
            </button>
          </div>

          <div className="mt-6 relative z-10">
            <div className="text-xs text-[#bac5ee] font-medium uppercase tracking-wider">
              Saldo Disponível para Resgate
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
                {currentMember.pointsBalance}
              </span>
              <span className="text-xl font-bold text-[#ffddb8]">{currencyName}</span>
            </div>

            {/* Progress to Level 5 */}
            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between text-xs text-[#bac5ee]">
                <span>Progresso para o Nível {currentMember.level + 1}</span>
                <span>{currentMember.pointsEarnedTotal} / 1.500 {currencyName}</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#00a673] h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round((currentMember.pointsEarnedTotal / 1500) * 100))}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Column (1 Col) */}
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-[#e0e3e5]/60 flex flex-col justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-[#191c1e]">Resumo Histórico</h3>
            <span className="text-xs text-[#45464e]">Dados acumulados desde o início</span>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-[#f2f4f6] rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00a673] text-[20px]">
                  arrow_circle_up
                </span>
                <span className="text-xs font-semibold text-[#191c1e]">Total Acumulado</span>
              </div>
              <span className="text-sm font-bold text-[#00a673]">
                +{currentMember.pointsEarnedTotal} {currencyName}
              </span>
            </div>

            <div className="p-3 bg-[#f2f4f6] rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#855300] text-[20px]">
                  shopping_bag
                </span>
                <span className="text-xs font-semibold text-[#191c1e]">Resgatado na Loja</span>
              </div>
              <span className="text-sm font-bold text-[#855300]">
                -{currentMember.pointsSpentTotal} {currencyName}
              </span>
            </div>

            <div className="p-3 bg-[#f2f4f6] rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#081534] text-[20px]">
                  speed
                </span>
                <span className="text-xs font-semibold text-[#191c1e]">Consistência</span>
              </div>
              <span className="text-sm font-bold text-[#081534]">
                {currentMember.weeklyConsistency}%
              </span>
            </div>
          </div>

          <div className="text-[11px] text-[#76777f] text-center">
            Próximo fechamento semanal: Domingo às 22:00
          </div>
        </div>
      </div>

      {/* Extrato / Ledger Table */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-[#e0e3e5]/60 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#081534] text-[20px]">receipt_long</span>
            <h2 className="text-base font-bold text-[#191c1e]">
              Extrato de Movimentações ({currentMember.name})
            </h2>
          </div>
          <span className="text-xs text-[#76777f]">Mostrando lançamentos recentes</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#e0e3e5] text-[#76777f] uppercase font-bold text-[10px]">
                <th className="py-2.5 px-3">Data / Hora</th>
                <th className="py-2.5 px-3">Descrição da Atividade</th>
                <th className="py-2.5 px-3">Categoria</th>
                <th className="py-2.5 px-3 text-right">Valor</th>
                <th className="py-2.5 px-3 text-right">Saldo Resultante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e3e5]/60">
              {memberTransactions.map((tx) => {
                const isCredit = tx.type === 'credit';
                return (
                  <tr key={tx.id} className="hover:bg-[#f7f9fb] transition-colors">
                    <td className="py-3 px-3 font-mono text-[#45464e]">
                      {tx.date} {tx.time}
                    </td>
                    <td className="py-3 px-3 font-semibold text-[#191c1e]">
                      {tx.description}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-[#e6e8ea] text-[#45464e] text-[10px] font-bold">
                        {tx.category}
                      </span>
                    </td>
                    <td className={`py-3 px-3 text-right font-extrabold ${isCredit ? 'text-[#00a673]' : 'text-[#855300]'}`}>
                      {isCredit ? `+${tx.amount}` : `-${tx.amount}`} {currencyName}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-[#081534]">
                      {tx.balanceAfter} {currencyName}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Bonus Modal */}
      {isBonusModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#fea619] text-[24px]">
                  volunteer_activism
                </span>
                <h3 className="text-base font-bold text-[#081534]">
                  Conceder Bônus Educativo
                </h3>
              </div>
              <button
                onClick={() => setIsBonusModalOpen(false)}
                className="text-[#76777f] hover:text-[#191c1e] p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleGiveBonus} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#45464e] font-semibold mb-1">
                  Filho Beneficiado:
                </label>
                <div className="font-bold text-sm text-[#081534] bg-[#f2f4f6] p-2.5 rounded-lg">
                  {currentMember.name} (Saldo atual: {currentMember.pointsBalance} {currencyName})
                </div>
              </div>

              <div>
                <label className="block text-[#45464e] font-semibold mb-1">
                  Quantidade de {currencyName} (+):
                </label>
                <input
                  type="number"
                  min="5"
                  max="500"
                  step="5"
                  value={bonusAmount}
                  onChange={(e) => setBonusAmount(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg border border-[#e0e3e5] text-sm font-bold text-[#081534] outline-none focus:border-[#1e2a4a]"
                  required
                />
              </div>

              <div>
                <label className="block text-[#45464e] font-semibold mb-1">
                  Motivo / Elogio Pedagógico:
                </label>
                <input
                  type="text"
                  value={bonusReason}
                  onChange={(e) => setBonusReason(e.target.value)}
                  placeholder="Ex: Ajudou a cuidar do irmão com gentileza"
                  className="w-full p-2.5 rounded-lg border border-[#e0e3e5] text-xs text-[#191c1e] outline-none focus:border-[#1e2a4a]"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBonusModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#e6e8ea] text-[#45464e] font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#081534] text-white font-bold cursor-pointer shadow-xs active:scale-95"
                >
                  Confirmar e Creditar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
