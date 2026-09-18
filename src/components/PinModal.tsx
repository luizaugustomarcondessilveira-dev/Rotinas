import React, { useState } from 'react';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  correctPin: string;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export const PinModal: React.FC<PinModalProps> = ({
  isOpen,
  onClose,
  correctPin,
  onSuccess,
  title = 'Autenticação Parental',
  description = 'Digite seu código PIN de 4 dígitos para continuar.'
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(false);

      if (nextPin.length === 4) {
        if (nextPin === correctPin) {
          onSuccess();
          setPin('');
          onClose();
        } else {
          setError(true);
          setTimeout(() => {
            setPin('');
          }, 600);
        }
      }
    }
  };

  const handleClear = () => {
    setPin('');
    setError(false);
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xs w-full p-6 shadow-2xl space-y-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#081534] text-white flex items-center justify-center mx-auto shadow-sm">
          <span className="material-symbols-outlined text-[24px]">lock</span>
        </div>

        <div>
          <h3 className="text-base font-bold text-[#081534]">{title}</h3>
          <p className="text-xs text-[#45464e] mt-1">{description}</p>
        </div>

        {/* PIN Dots */}
        <div className="flex justify-center items-center gap-3 py-2">
          {[1, 2, 3, 4].map((index) => {
            const isFilled = pin.length >= index;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  error
                    ? 'bg-[#ba1a1a] animate-shake'
                    : isFilled
                    ? 'bg-[#fea619] scale-110 shadow-xs'
                    : 'bg-[#e0e3e5]'
                }`}
              />
            );
          })}
        </div>

        {error && (
          <div className="text-[11px] font-bold text-[#ba1a1a]">
            Código incorreto. Tente novamente.
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              onClick={() => handleDigit(d)}
              className="h-12 rounded-xl bg-[#f2f4f6] hover:bg-[#e6e8ea] text-base font-bold text-[#081534] flex items-center justify-center cursor-pointer active:scale-95 transition-all"
            >
              {d}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="h-12 rounded-xl bg-[#e6e8ea] hover:bg-[#d8dadc] text-xs font-bold text-[#45464e] flex items-center justify-center cursor-pointer"
          >
            Limpar
          </button>
          <button
            onClick={() => handleDigit('0')}
            className="h-12 rounded-xl bg-[#f2f4f6] hover:bg-[#e6e8ea] text-base font-bold text-[#081534] flex items-center justify-center cursor-pointer active:scale-95 transition-all"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="h-12 rounded-xl bg-[#e6e8ea] hover:bg-[#d8dadc] text-[#081534] flex items-center justify-center cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">backspace</span>
          </button>
        </div>

        <div className="pt-2">
          <button
            onClick={onClose}
            className="text-xs text-[#76777f] hover:text-[#191c1e] font-semibold cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
