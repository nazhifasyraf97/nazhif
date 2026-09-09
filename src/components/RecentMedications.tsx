import React from 'react';
import { Volume2, Trash2, Clock, Pill } from 'lucide-react';
import { ProcessedMedication, TextSize } from '../types';

interface RecentMedicationsProps {
  medications: ProcessedMedication[];
  onSelect: (med: ProcessedMedication) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  textSize: TextSize;
  highContrast: boolean;
}

export const RecentMedications: React.FC<RecentMedicationsProps> = ({
  medications,
  onSelect,
  onDelete,
  onClearAll,
  textSize,
  highContrast,
}) => {
  if (medications.length === 0) return null;

  const handleQuickListen = (e: React.MouseEvent, med: ProcessedMedication) => {
    e.stopPropagation();
    onSelect(med);
  };

  return (
    <div
      id="recent-medications-section"
      className={`rounded-3xl border-2 p-5 sm:p-6 transition-all ${
        highContrast
          ? 'bg-black border-yellow-400 text-white'
          : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <Clock className="w-5 h-5 text-teal-600" />
          <h3
            className={`font-bold ${
              textSize === 'extralarge'
                ? 'text-xl'
                : textSize === 'large'
                ? 'text-lg'
                : 'text-base'
            }`}
          >
            Senarai Ubat Yang Baru Diimbas ({medications.length})
          </h3>
        </div>
        <button
          onClick={onClearAll}
          className="text-xs text-slate-500 hover:text-red-600 font-semibold transition-colors"
          title="Padam semua sejarah imbasan"
        >
          Padam Sejarah
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {medications.map((med) => (
          <div
            key={med.id}
            id={`recent-med-card-${med.id}`}
            onClick={() => onSelect(med)}
            className={`p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md flex flex-col justify-between ${
              highContrast
                ? 'bg-slate-900 border-gray-700 hover:border-yellow-400'
                : 'bg-slate-50 border-slate-200 hover:border-teal-500 hover:bg-teal-50/40'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-md">
                  <Pill className="w-3.5 h-3.5" />
                  {med.data.strengthAndDosage || 'Preskripsi'}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(med.id);
                  }}
                  className="text-slate-400 hover:text-red-500 p-1"
                  title="Buang daripada senarai"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <h4 className="font-extrabold text-base text-slate-900 line-clamp-1 dark:text-white">
                {med.data.medicationName}
              </h4>
              <p className="text-xs text-slate-600 line-clamp-2 mt-1">
                {med.data.instructions}
              </p>
            </div>

            <button
              onClick={(e) => handleQuickListen(e, med)}
              className={`mt-3 w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 ${
                highContrast
                  ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                  : 'bg-teal-600 text-white hover:bg-teal-700'
              }`}
            >
              <Volume2 className="w-4 h-4" />
              <span>Tekan untuk Dengar</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
