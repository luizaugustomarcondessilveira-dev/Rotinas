import React, { useState } from 'react';
import { RewardItem, Member } from '../types';

interface StoreViewProps {
  rewards: RewardItem[];
  members: Member[];
  onDeliverReward: (rewardId: string) => void;
  onRedeemReward: (rewardId: string, memberId: string) => void;
  onAddNewReward: (reward: Omit<RewardItem, 'id' | 'status'>) => void;
  currencyName: string;
  showToast: (title: string, desc: string, icon?: string) => void;
  menuLabels?: Record<string, string>;
}

export const StoreView: React.FC<StoreViewProps> = ({
  rewards,
  members,
  onDeliverReward,
  onRedeemReward,
  onAddNewReward,
  currencyName,
  showToast,
  menuLabels
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [cost, setCost] = useState<number>(100);
  const [category, setCategory] = useState<RewardItem['category']>('Lazer');
  const [targetChild, setTargetChild] = useState<string>('all');
  const [description, setDescription] = useState<string>('');
  const [icon, setIcon] = useState<string>('stars');

  const categories = ['all', 'Experiência', 'Lazer', 'Item Físico', 'Guloseima'];

  const filteredRewards = rewards.filter((r) => {
    return selectedCategory === 'all' || r.category === selectedCategory;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    onAddNewReward({
      title,
      cost,
      category,
      targetChildId: targetChild,
      description,
      icon
    });
    setIsAddModalOpen(false);
    setTitle('');
    setDescription('');
    showToast('Recompensa Cadastrada!', `"${title}" adicionado à vitrine da loja.`, 'redeem');
  };

  return (
    <div className="flex flex-col w-full pb-12 gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-6 rounded-2xl shadow-xs border border-[#e0e3e5]/60 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#081534] text-[24px]">redeem</span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#081534]">
              {menuLabels?.['loja-de-incentivos'] || 'Loja de Recompensas & Prêmios da Família'}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#45464e] mt-1">
            Recompensas personalizadas que estimulam a autonomia, lazer em família e responsabilidade financeira.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 bg-[#081534] hover:bg-[#1e2a4a] text-white px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold shadow-xs transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Nova Recompensa</span>
        </button>
      </div>

      {/* Categories Filter */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-4 rounded-xl shadow-xs border border-[#e0e3e5]/60">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedCategory === cat
                ? 'bg-[#081534] text-white'
                : 'bg-[#f2f4f6] text-[#45464e] hover:bg-[#e6e8ea]'
            }`}
          >
            {cat === 'all' ? 'Todos os Prêmios' : cat}
          </button>
        ))}
      </div>

      {/* Rewards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRewards.map((reward) => {
          const isPending = reward.status === 'pending_delivery';
          const isDelivered = reward.status === 'delivered';
          const child = members.find((m) => m.id === reward.targetChildId);

          return (
            <div
              key={reward.id}
              className={`bg-white rounded-2xl p-5 shadow-xs border transition-all flex flex-col justify-between gap-4 ${
                isPending
                  ? 'border-[#fea619] ring-2 ring-[#fea619]/20'
                  : isDelivered
                  ? 'border-[#e0e3e5] opacity-80'
                  : 'border-[#e0e3e5]/70 hover:shadow-md'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="p-3 rounded-xl bg-[#ffddb8]/30 text-[#855300]">
                    <span className="material-symbols-outlined text-[28px]">
                      {reward.icon || 'redeem'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-[#ffddb8]/40 text-[#855300] rounded-full font-extrabold text-sm">
                    <span className="material-symbols-outlined text-[16px] text-[#fea619]">toll</span>
                    <span>{reward.cost} {currencyName}</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-full bg-[#f2f4f6] text-[#45464e] text-[10px] font-bold">
                      {reward.category}
                    </span>
                    {child && (
                      <span className="text-[10px] font-semibold text-[#855300] bg-[#fea619]/10 px-2 py-0.5 rounded">
                        Para: {child.name}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-[#191c1e]">{reward.title}</h3>
                  <p className="text-xs text-[#45464e] mt-1 leading-relaxed">
                    {reward.description || 'Disponível para troca na carteira dos filhos.'}
                  </p>
                </div>
              </div>

              {/* Action area */}
              <div className="pt-3 border-t border-[#e0e3e5]/60 flex items-center justify-between">
                {isPending ? (
                  <div className="w-full flex items-center justify-between">
                    <span className="text-xs text-[#855300] font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">pending</span>
                      Aguardando entrega
                    </span>
                    <button
                      onClick={() => onDeliverReward(reward.id)}
                      className="px-3 py-1.5 rounded-lg bg-[#fea619] hover:bg-[#ffddb8] text-[#2a1700] text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px]">check</span>
                      Marcar Entregue
                    </button>
                  </div>
                ) : isDelivered ? (
                  <div className="w-full text-xs text-[#00a673] font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">task_alt</span>
                    {reward.deliveredAt || 'Entregue'}
                  </div>
                ) : (
                  <div className="w-full flex items-center justify-between">
                    <span className="text-xs text-[#00a673] font-bold">Disponível</span>
                    <button
                      onClick={() => {
                        const firstChild = members.find(m => m.role === 'child')?.id || '';
                        const targetId = reward.targetChildId !== 'all' ? reward.targetChildId : firstChild;
                        if(targetId) onRedeemReward(reward.id, targetId);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#081534] hover:bg-[#1e2a4a] text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-transform active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[15px]">shopping_cart</span>
                      Simular Resgate
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Reward Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#081534] text-[24px]">add_box</span>
                <h3 className="text-base font-bold text-[#081534]">Cadastrar Nova Recompensa</h3>
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
                <label className="block text-[#45464e] font-semibold mb-1">Título do Prêmio:</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Noite da pizza com amigos"
                  className="w-full p-2.5 rounded-lg border border-[#e0e3e5] text-xs text-[#191c1e] outline-none focus:border-[#1e2a4a]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#45464e] font-semibold mb-1">Custo em {currencyName}:</label>
                  <input
                    type="number"
                    min="10"
                    step="10"
                    value={cost}
                    onChange={(e) => setCost(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-[#e0e3e5] text-sm font-bold text-[#081534] outline-none focus:border-[#1e2a4a]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#45464e] font-semibold mb-1">Categoria:</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as RewardItem['category'])}
                    className="w-full p-2.5 rounded-lg border border-[#e0e3e5] text-xs font-semibold text-[#191c1e] outline-none"
                  >
                    <option value="Lazer">Lazer</option>
                    <option value="Experiência">Experiência</option>
                    <option value="Item Físico">Item Físico</option>
                    <option value="Guloseima">Guloseima</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#45464e] font-semibold mb-1">Disponível para:</label>
                <select
                  value={targetChild}
                  onChange={(e) => setTargetChild(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-[#e0e3e5] text-xs font-semibold text-[#191c1e] outline-none"
                >
                  <option value="all">Todos os Filhos</option>
                  {members.filter(m => m.role === 'child').map(child => (
                    <option key={child.id} value={child.id}>{child.name} ({child.age}a)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#45464e] font-semibold mb-1">Descrição / Regras de Uso:</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Pode ser agendado para o próximo sábado à noite."
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
                  Salvar Recompensa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
