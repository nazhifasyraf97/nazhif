import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  Clock,
  Pill,
  ShieldCheck,
  FileText,
  Camera,
  HeartPulse,
  ChevronRight,
  Languages,
} from 'lucide-react';
import { ProcessedMedication, TextSize, SpeechSpeed, AudioSection } from '../types';
import { seniorAudio } from '../utils/audioPlayer';

interface MedicationAudioViewProps {
  medication: ProcessedMedication;
  onScanAnother: () => void;
  textSize: TextSize;
  highContrast: boolean;
}

export const MedicationAudioView: React.FC<MedicationAudioViewProps> = ({
  medication,
  onScanAnother,
  textSize,
  highContrast,
}) => {
  const { data } = medication;
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number>(-1);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [speechSpeed, setSpeechSpeed] = useState<SpeechSpeed>('normal');
  const [showFullImageModal, setShowFullImageModal] = useState<boolean>(false);

  // Pecahkan skrip mengikut ayat untuk sorotan teks
  const scriptSentences = seniorAudio.splitSentences(data.fullSpokenScript);

  useEffect(() => {
    seniorAudio.setOnStateChange((speaking) => {
      setIsPlaying(speaking);
      if (!speaking) {
        setActiveSectionId(null);
      }
    });

    // Mainkan suara secara automatik selepas seketika untuk kemudahan warga emas
    const timer = setTimeout(() => {
      handlePlayFullScript();
    }, 400);

    return () => {
      clearTimeout(timer);
      seniorAudio.stop();
    };
  }, [medication.id]);

  // Mainkan keseluruhan skrip narasi suara
  const handlePlayFullScript = () => {
    setActiveSectionId('full');
    seniorAudio.speakText(
      data.fullSpokenScript,
      (idx) => setCurrentSentenceIndex(idx),
      () => {
        setIsPlaying(false);
        setCurrentSentenceIndex(-1);
        setActiveSectionId(null);
      }
    );
  };

  // Mainkan bahagian tertentu
  const handlePlaySection = (section: AudioSection) => {
    setActiveSectionId(section.id);
    seniorAudio.speakText(
      section.text,
      (idx) => setCurrentSentenceIndex(idx),
      () => {
        setIsPlaying(false);
        setCurrentSentenceIndex(-1);
        setActiveSectionId(null);
      }
    );
  };

  const handlePauseResume = () => {
    if (isPlaying) {
      seniorAudio.pause();
      setIsPlaying(false);
    } else {
      seniorAudio.resume();
      setIsPlaying(true);
    }
  };

  const handleStop = () => {
    seniorAudio.stop();
    setIsPlaying(false);
    setCurrentSentenceIndex(-1);
    setActiveSectionId(null);
  };

  const handleSpeedChange = (speed: SpeechSpeed) => {
    setSpeechSpeed(speed);
    seniorAudio.setSpeed(speed);
    seniorAudio.announcePrompt(
      speed === 'slow'
        ? 'Suara perlahan ditetapkan'
        : speed === 'fast'
        ? 'Suara laju ditetapkan'
        : 'Suara biasa ditetapkan'
    );
  };

  // Kelas saiz tulisan dinamik
  const getBodyTextClass = () => {
    if (textSize === 'extralarge') return 'text-2xl leading-relaxed';
    if (textSize === 'large') return 'text-xl leading-relaxed';
    return 'text-lg leading-normal';
  };

  const getHeadingTextClass = () => {
    if (textSize === 'extralarge') return 'text-3xl font-extrabold';
    if (textSize === 'large') return 'text-2xl font-bold';
    return 'text-xl font-bold';
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12">
      {/* Bar Navigasi Atas */}
      <div className="flex items-center justify-between gap-4">
        <button
          id="back-to-scan-button"
          onClick={() => {
            seniorAudio.stop();
            onScanAnother();
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm sm:text-base transition-colors border ${
            highContrast
              ? 'bg-yellow-400 text-black border-yellow-300'
              : 'bg-white text-teal-800 hover:bg-teal-50 border-slate-300 shadow-xs'
          }`}
        >
          <Camera className="w-5 h-5" />
          <span>Imbas Ubat Lain</span>
        </button>

        <span className="text-xs sm:text-sm text-slate-500 font-medium">
          Diimbas pada jam {new Date(medication.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Pemain Audio Utama (Keutamaan Tertinggi untuk Warga Emas) */}
      <div
        id="hero-audio-player-card"
        className={`rounded-3xl border-3 p-6 sm:p-8 shadow-xl transition-all ${
          highContrast
            ? 'bg-black border-yellow-400 text-white'
            : 'bg-gradient-to-b from-teal-900 to-slate-900 text-white border-teal-600'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-white/20">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${
                isPlaying
                  ? 'bg-emerald-400 text-black animate-pulse'
                  : highContrast
                  ? 'bg-yellow-400 text-black'
                  : 'bg-teal-500 text-white'
              }`}
            >
              <Volume2 className="w-9 h-9" />
            </div>
            <div>
              <span className="inline-block text-xs font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-white/20 text-white mb-1">
                Bacaan Suara Ubat
              </span>
              <h2 className={getHeadingTextClass()}>
                {isPlaying ? 'Arahan Ubat Sedang Dibacakan' : 'Arahan Suara Sedia Didengar'}
              </h2>
            </div>
          </div>

          {/* Kawalan Kelajuan Suara untuk Keselesaan Pendengaran */}
          <div className="flex items-center gap-1 bg-white/10 p-1.5 rounded-2xl border border-white/20">
            <span className="text-xs font-semibold px-2 text-slate-200">Kelajuan:</span>
            {(['slow', 'normal', 'fast'] as SpeechSpeed[]).map((sp) => (
              <button
                key={sp}
                id={`speed-${sp}-btn`}
                onClick={() => handleSpeedChange(sp)}
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  speechSpeed === sp
                    ? 'bg-white text-slate-900 shadow-md'
                    : 'text-slate-200 hover:text-white hover:bg-white/10'
                }`}
              >
                {sp === 'slow' ? 'Perlahan' : sp === 'normal' ? 'Biasa' : 'Laju'}
              </button>
            ))}
          </div>
        </div>

        {/* Butang Tindakan Audio Utama (Besar & Jelas) */}
        <div className="py-6 flex flex-wrap items-center justify-center gap-4">
          {isPlaying ? (
            <>
              <button
                id="audio-pause-button"
                onClick={handlePauseResume}
                className="px-8 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-lg sm:text-xl flex items-center gap-3 shadow-lg transition-transform active:scale-95"
              >
                <Pause className="w-7 h-7 fill-current" />
                <span>Jeda Suara</span>
              </button>
              <button
                id="audio-stop-button"
                onClick={handleStop}
                className="px-6 py-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-base sm:text-lg flex items-center gap-2 shadow-lg transition-transform active:scale-95"
              >
                <VolumeX className="w-6 h-6" />
                <span>Henti</span>
              </button>
            </>
          ) : (
            <button
              id="audio-play-all-button"
              onClick={handlePlayFullScript}
              className={`px-10 py-5 rounded-2xl font-black text-xl sm:text-2xl flex items-center gap-4 shadow-xl transition-all transform hover:scale-105 active:scale-95 ${
                highContrast
                  ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-black'
              }`}
            >
              <Play className="w-8 h-8 fill-current" />
              <span>DENGAR SEMUA ARAHAN UBAT</span>
            </button>
          )}

          <button
            id="audio-replay-button"
            onClick={handlePlayFullScript}
            className="px-5 py-4 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-base flex items-center gap-2 border border-white/20 transition-all"
            title="Dengar semula dari awal"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Ulang Dari Mula</span>
          </button>
        </div>

        {/* Kotak Sorotan Teks Semasa Suara Dibacakan */}
        <div
          id="spoken-script-display"
          className="mt-2 p-5 rounded-2xl bg-black/40 border border-white/20"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Languages className="w-4 h-4 text-emerald-400" />
              <p className="text-xs uppercase font-bold tracking-wider text-slate-200">
                Teks Ucapan Suara (Diterjemahkan ke Bahasa Melayu):
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Terjemahan Bahasa Melayu
            </span>
          </div>

          <div className={getBodyTextClass()}>
            {scriptSentences.map((sentence, index) => {
              const isCurrent = activeSectionId === 'full' && currentSentenceIndex === index;
              return (
                <span
                  key={index}
                  className={`inline mr-1.5 transition-colors duration-200 rounded-sm px-1 ${
                    isCurrent
                      ? 'bg-yellow-300 text-black font-extrabold shadow-xs ring-2 ring-yellow-400'
                      : 'text-slate-100'
                  }`}
                >
                  {sentence}{' '}
                </span>
              );
            })}
          </div>

          <p className="mt-3 text-xs text-slate-300 italic">
            * Ikuti teks bertanda kuning di atas semasa audio dibacakan dalam Bahasa Melayu.
          </p>
        </div>

        {/* Butang Pantas Mendengar Bahagian Tertentu */}
        <div className="mt-6 pt-6 border-t border-white/20">
          <p className="text-sm font-bold text-slate-300 mb-3 text-center sm:text-left">
            Atau tekan untuk dengar bahagian tertentu:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.audioSections.map((sec) => (
              <button
                key={sec.id}
                id={`listen-section-${sec.id}-button`}
                onClick={() => handlePlaySection(sec)}
                className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                  activeSectionId === sec.id && isPlaying
                    ? 'bg-yellow-400 text-black border-yellow-300 font-bold'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5 shrink-0 opacity-80" />
                  <span className="font-semibold text-sm sm:text-base">{sec.title}</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-70" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Kad-kad Maklumat Terperinci Ubat */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Kolum Kiri: Maklumat Utama & Amaran (Lebar 2 Kolum) */}
        <div className="md:col-span-2 space-y-5">
          {/* Kad 1: Nama & Dos Ubat */}
          <div
            id="medication-name-card"
            className={`p-6 sm:p-7 rounded-3xl border-2 shadow-md transition-all ${
              highContrast
                ? 'bg-black border-yellow-400 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-2.5 py-1 rounded-md mb-2 inline-block">
                  Ubat Dikenal Pasti
                </span>
                <h3
                  className={`font-black tracking-tight ${
                    textSize === 'extralarge'
                      ? 'text-4xl'
                      : textSize === 'large'
                      ? 'text-3xl'
                      : 'text-2xl'
                  } ${highContrast ? 'text-yellow-300' : 'text-slate-900'}`}
                >
                  {data.medicationName}
                </h3>
                {data.genericName && (
                  <p className="text-base sm:text-lg text-slate-500 font-semibold mt-0.5">
                    Nama Generik: {data.genericName}
                  </p>
                )}
              </div>
              <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                <Pill className="w-8 h-8" />
              </div>
            </div>

            <div className="mt-5 p-4 rounded-2xl bg-teal-50/80 border border-teal-100 flex items-center gap-3">
              <span className="font-bold text-teal-900 text-base sm:text-lg">
                Kekuatan & Dos:
              </span>
              <span className="font-extrabold text-teal-800 text-lg sm:text-xl">
                {data.strengthAndDosage}
              </span>
            </div>
          </div>

          {/* Kad 2: Cara & Waktu Pengambilan */}
          <div
            id="instructions-card"
            className={`p-6 sm:p-7 rounded-3xl border-2 shadow-md ${
              highContrast
                ? 'bg-black border-yellow-400 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
                <h4 className={getHeadingTextClass()}>Cara & Waktu Makan</h4>
              </div>
              <button
                onClick={() =>
                  handlePlaySection({
                    id: 'directions',
                    title: 'Cara Pengambilan',
                    text: data.instructions,
                  })
                }
                className="text-xs sm:text-sm font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 bg-teal-50 px-3 py-1.5 rounded-lg"
              >
                <Volume2 className="w-4 h-4" />
                Dengar ini
              </button>
            </div>

            <div
              className={`p-4 rounded-2xl bg-slate-50 border border-slate-200 font-semibold ${getBodyTextClass()} ${
                highContrast ? 'bg-slate-950 text-white' : 'text-slate-800'
              }`}
            >
              {data.instructions}
            </div>

            {/* Kegunaan Ubat */}
            {data.purpose && (
              <div className="mt-4 flex items-start gap-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-100">
                <HeartPulse className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-emerald-900 uppercase">Kegunaan Rawatan:</span>
                  <p className="text-base sm:text-lg font-bold text-emerald-800">
                    {data.purpose}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Kad 3: Amaran & Peringatan Penting */}
          <div
            id="warnings-card"
            className={`p-6 sm:p-7 rounded-3xl border-2 shadow-md ${
              highContrast
                ? 'bg-black border-red-500 text-white'
                : 'bg-amber-50/60 border-amber-300 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h4
                  className={`${getHeadingTextClass()} ${
                    highContrast ? 'text-red-400' : 'text-amber-900'
                  }`}
                >
                  Peringatan & Amaran Penting
                </h4>
              </div>
              <button
                onClick={() =>
                  handlePlaySection({
                    id: 'warnings-audio',
                    title: 'Amaran Penting',
                    text: data.warnings.join('. '),
                  })
                }
                className="text-xs sm:text-sm font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1 bg-amber-200/70 px-3 py-1.5 rounded-lg"
              >
                <Volume2 className="w-4 h-4" />
                Dengar amaran
              </button>
            </div>

            <ul className="space-y-2.5">
              {data.warnings.map((warn, index) => (
                <li
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-xl border ${
                    highContrast
                      ? 'bg-slate-900 border-red-500 text-white'
                      : 'bg-white border-amber-200 text-slate-800'
                  } ${getBodyTextClass()}`}
                >
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  <span>{warn}</span>
                </li>
              ))}
            </ul>

            {data.cautionaryAdvice && (
              <div className="mt-4 p-3.5 rounded-xl bg-white border border-amber-200 text-slate-700 text-sm font-medium flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0" />
                <span>{data.cautionaryAdvice}</span>
              </div>
            )}
          </div>
        </div>

        {/* Kolum Kanan: Maklumat Preskripsi & Gambar Asal */}
        <div className="space-y-5">
          {/* Kad Maklumat Preskripsi & Farmasi */}
          <div
            id="prescription-info-card"
            className={`p-5 rounded-3xl border-2 shadow-sm ${
              highContrast
                ? 'bg-black border-yellow-400 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5 mb-4">
              <FileText className="w-5 h-5 text-teal-600" />
              <h4 className="font-bold text-base sm:text-lg">Maklumat Preskripsi</h4>
            </div>

            <div className="space-y-3 text-sm">
              {data.prescribedForPatient && (
                <div className="pb-2 border-b border-slate-100">
                  <span className="text-xs text-slate-500 font-semibold block">Nama Pesakit:</span>
                  <span className="font-bold text-base text-slate-800">{data.prescribedForPatient}</span>
                </div>
              )}

              {data.prescriber && (
                <div className="pb-2 border-b border-slate-100">
                  <span className="text-xs text-slate-500 font-semibold block">Doktor / Klinik:</span>
                  <span className="font-semibold text-slate-800">{data.prescriber}</span>
                </div>
              )}

              {data.refills && (
                <div className="pb-2 border-b border-slate-100">
                  <span className="text-xs text-slate-500 font-semibold block">Baki Ulangan:</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
                    {data.refills}
                  </span>
                </div>
              )}

              {data.rxNumber && (
                <div className="pb-2 border-b border-slate-100">
                  <span className="text-xs text-slate-500 font-semibold block">No. Preskripsi:</span>
                  <span className="font-mono text-slate-800">{data.rxNumber}</span>
                </div>
              )}

              {data.expirationDate && (
                <div>
                  <span className="text-xs text-slate-500 font-semibold block">Tarikh Luput / Buang:</span>
                  <span className="font-semibold text-slate-800">{data.expirationDate}</span>
                </div>
              )}
            </div>
          </div>

          {/* Kad Gambar Asal yang Diimbas */}
          <div
            id="scanned-image-thumbnail-card"
            className={`p-5 rounded-3xl border-2 shadow-sm ${
              highContrast
                ? 'bg-black border-yellow-400 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Gambar Label Asal
              </span>
              <span className="text-xs text-teal-600 font-semibold">Tekan untuk besarkan</span>
            </div>

            <button
              onClick={() => setShowFullImageModal(true)}
              className="w-full aspect-4/3 rounded-2xl overflow-hidden border border-slate-200 relative group cursor-zoom-in"
            >
              <img
                src={medication.imageUri}
                alt="Label ubat preskripsi"
                className="w-full h-full object-contain bg-slate-900"
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                Lihat Gambar Penuh
              </div>
            </button>
          </div>

          {/* Nasihat Hubungi Doktor/Farmasi */}
          <div className="p-4 rounded-2xl bg-slate-100 text-slate-600 text-xs text-center">
            <p>
              Sentiasa hubungi doktor atau ahli farmasi anda jika berasa kurang sihat atau ragu-ragu tentang cara pengambilan ubat.
            </p>
          </div>
        </div>
      </div>

      {/* Bar Tindakan Bawah */}
      <div className="pt-6 border-t flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          onClick={handlePlayFullScript}
          className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-md ${
            highContrast
              ? 'bg-yellow-400 text-black hover:bg-yellow-300'
              : 'bg-teal-600 hover:bg-teal-700 text-white'
          }`}
        >
          <Volume2 className="w-6 h-6" />
          <span>Dengar Sekali Lagi</span>
        </button>

        <button
          onClick={() => {
            seniorAudio.stop();
            onScanAnother();
          }}
          className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 border-2 border-slate-300 bg-white hover:bg-slate-100 text-slate-800"
        >
          <Camera className="w-6 h-6" />
          <span>Imbas Botol Ubat Lain</span>
        </button>
      </div>

      {/* Modal: Paparan Gambar Penuh */}
      {showFullImageModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowFullImageModal(false)}
        >
          <div
            className="max-w-3xl w-full bg-white rounded-3xl overflow-hidden p-4 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-lg text-slate-900">Gambar Asal Label Ubat</h3>
              <button
                onClick={() => setShowFullImageModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-sm text-slate-700"
              >
                Tutup
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto flex items-center justify-center bg-slate-100 rounded-2xl p-2">
              <img
                src={medication.imageUri}
                alt="Label ubat penuh"
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
