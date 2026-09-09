import React, { useRef, useState, useEffect } from 'react';
import { Camera, SwitchCamera, Upload, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { SAMPLE_MEDICATIONS, SampleMedication } from '../data/sampleLabels';
import { TextSize } from '../types';
import { seniorAudio } from '../utils/audioPlayer';

interface CameraScannerProps {
  onImageSelected: (base64Image: string, source: 'camera' | 'upload' | 'sample', sampleId?: string) => void;
  isLoading: boolean;
  textSize: TextSize;
  highContrast: boolean;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({
  onImageSelected,
  isLoading,
  textSize,
  highContrast,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean>(false);
  const [dragOver, setDragOver] = useState<boolean>(false);

  // Memulakan aliran kamera
  const startCamera = async (facing: 'environment' | 'user') => {
    setCameraError(null);
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      setHasCameraPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError(
        'Kamera tidak dapat diakses. Anda boleh muat naik atau pilih fail gambar menggunakan butang di bawah.'
      );
      setHasCameraPermission(false);
    }
  };

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode]);

  // Tukar kamera depan / belakang
  const toggleCamera = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    seniorAudio.announcePrompt('Kamera ditukar');
  };

  // Tangkap gambar daripada paparan video
  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64 = canvas.toDataURL('image/jpeg', 0.9);
    seniorAudio.announcePrompt('Gambar label berjaya diambil. Sedang membaca maklumat ubat anda.');
    onImageSelected(base64, 'camera');
  };

  // Muat naik fail gambar
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        seniorAudio.announcePrompt('Gambar berjaya dimuat naik. Sedang membaca maklumat label.');
        onImageSelected(base64, 'upload');
      }
    };
    reader.readAsDataURL(file);
  };

  // Tarik & Lepas (Drag & Drop)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        seniorAudio.announcePrompt('Gambar berjaya dimuat naik. Sedang membaca maklumat label.');
        onImageSelected(base64, 'upload');
      }
    };
    reader.readAsDataURL(file);
  };

  // Pilih contoh ubat
  const handleSelectSample = (sample: SampleMedication) => {
    seniorAudio.announcePrompt(`Contoh ubat ${sample.name} dipilih. Sedang membaca maklumat.`);
    onImageSelected(sample.labelSvgDataUrl, 'sample', sample.id);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Kad Paparan Kamera / Viewfinder */}
      <div
        id="camera-viewfinder-card"
        className={`rounded-3xl border-2 overflow-hidden shadow-lg transition-all ${
          highContrast
            ? 'bg-black border-yellow-400 text-white'
            : 'bg-white border-slate-200 text-slate-800'
        } ${dragOver ? 'ring-4 ring-teal-400' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {/* Jalur Panduan Langkah 1 */}
        <div
          className={`px-5 py-4 text-center font-bold border-b ${
            highContrast
              ? 'bg-yellow-400 text-black border-yellow-500'
              : 'bg-teal-50 text-teal-900 border-teal-100'
          }`}
        >
          <p className={textSize === 'extralarge' ? 'text-2xl' : 'text-xl'}>
            Langkah 1: Halakan Kamera ke Label Ubat Anda
          </p>
          <p
            className={`text-sm mt-1 font-normal ${
              highContrast ? 'text-black' : 'text-teal-700'
            }`}
          >
            Pegang botol ubat dengan stabil di bawah pencahayaan yang terang
          </p>
        </div>

        {/* Bahagian Paparan Lensa Kamera */}
        <div className="relative aspect-4/3 sm:aspect-16/10 bg-slate-950 flex items-center justify-center overflow-hidden">
          {hasCameraPermission ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Bingkai Panduan Garisan Pemidang */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                <div
                  className={`w-full max-w-md h-48 sm:h-64 border-4 rounded-2xl relative transition-all ${
                    highContrast
                      ? 'border-yellow-400 bg-yellow-400/10'
                      : 'border-teal-400 bg-teal-500/10'
                  } shadow-2xl flex flex-col items-center justify-between p-4`}
                >
                  {/* Sudut Penjuru Atas */}
                  <div className="w-full flex justify-between">
                    <span className="w-6 h-6 border-t-4 border-l-4 border-white inline-block"></span>
                    <span className="w-6 h-6 border-t-4 border-r-4 border-white inline-block"></span>
                  </div>

                  <div className="text-center px-4 py-2 rounded-xl bg-black/60 backdrop-blur-xs text-white text-sm sm:text-base font-medium">
                    Letakkan label ubat di dalam bingkai ini
                  </div>

                  {/* Sudut Penjuru Bawah */}
                  <div className="w-full flex justify-between">
                    <span className="w-6 h-6 border-b-4 border-l-4 border-white inline-block"></span>
                    <span className="w-6 h-6 border-b-4 border-r-4 border-white inline-block"></span>
                  </div>
                </div>
              </div>

              {/* Butang Tukar Kamera */}
              <button
                id="flip-camera-button"
                onClick={toggleCamera}
                type="button"
                className="absolute top-4 right-4 bg-black/70 hover:bg-black text-white p-3 rounded-2xl backdrop-blur-sm border border-white/30 shadow-md transition-transform active:scale-95"
                title="Tukar Kamera (Depan / Belakang)"
                aria-label="Tukar Kamera"
              >
                <SwitchCamera className="w-6 h-6" />
              </button>
            </>
          ) : (
            <div className="text-center p-8 max-w-md">
              <Camera className="w-16 h-16 mx-auto mb-4 text-slate-500" />
              <p className="text-lg font-bold text-white mb-2">Kamera Tidak Aktif atau Disekat</p>
              <p className="text-sm text-slate-300 mb-6">
                {cameraError ||
                  'Sila berikan kebenaran kamera pada pelayar anda atau pilih gambar ubat daripada peranti anda.'}
              </p>
              <button
                onClick={() => startCamera(facingMode)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold transition-all"
              >
                <RefreshCw className="w-5 h-5" />
                Cuba Buka Kamera Semula
              </button>
            </div>
          )}

          {/* Paparan Sedang Memproses / Menganalisa */}
          {isLoading && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-white text-center z-20">
              <div className="w-16 h-16 border-4 border-teal-400 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-2xl font-bold mb-1">Sedang Membaca Label Ubat...</p>
              <p className="text-slate-300 max-w-sm">
                Sistem sedang membaca dos dan menyediakan bacaan suara yang jelas untuk anda.
              </p>
            </div>
          )}
        </div>

        {/* Bar Alat Kawalan Tangkapan Gambar */}
        <div
          className={`p-5 sm:p-6 border-t flex flex-col sm:flex-row items-center justify-center gap-4 ${
            highContrast ? 'bg-slate-950 border-yellow-400' : 'bg-slate-50 border-slate-200'
          }`}
        >
          {/* Butang Tangkap Gambar Utama (Besar & Jelas untuk Warga Emas) */}
          <button
            id="snap-label-button"
            onClick={takeSnapshot}
            disabled={!hasCameraPermission || isLoading}
            className={`w-full sm:w-auto min-w-[260px] py-4 sm:py-5 px-8 rounded-2xl font-bold flex items-center justify-center gap-3 text-lg sm:text-xl shadow-lg transition-all transform active:scale-98 ${
              !hasCameraPermission || isLoading
                ? 'opacity-50 cursor-not-allowed bg-gray-400 text-gray-200'
                : highContrast
                ? 'bg-yellow-400 text-black hover:bg-yellow-300 border-2 border-white'
                : 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-700/20'
            }`}
          >
            <Camera className="w-7 h-7" />
            <span>AMBIL GAMBAR SEKARANG</span>
          </button>

          {/* Butang Muat Naik Fail Gambar */}
          <button
            id="upload-photo-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className={`w-full sm:w-auto py-4 sm:py-5 px-6 rounded-2xl font-semibold flex items-center justify-center gap-2.5 text-base sm:text-lg border-2 transition-colors ${
              highContrast
                ? 'border-yellow-400 text-yellow-300 hover:bg-yellow-400/20'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Upload className="w-5 h-5" />
            <span>Muat Naik Gambar Fail</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Contoh Label Ubat Malaysia untuk Ujian Pantas */}
      <div
        id="sample-labels-container"
        className={`rounded-2xl p-5 border transition-all ${
          highContrast
            ? 'bg-slate-900 border-yellow-400 text-white'
            : 'bg-white border-slate-200 text-slate-800 shadow-xs'
        }`}
      >
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <h2 className="font-bold text-base sm:text-lg">
            Tiada botol ubat sekarang? Tekan contoh di bawah untuk cuba:
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SAMPLE_MEDICATIONS.map((sample) => (
            <button
              key={sample.id}
              id={`sample-med-${sample.id}-button`}
              onClick={() => handleSelectSample(sample)}
              disabled={isLoading}
              className={`p-3.5 rounded-xl border text-left transition-all hover:scale-[1.01] flex flex-col justify-between ${
                highContrast
                  ? 'bg-black border-gray-700 hover:border-yellow-400 hover:bg-yellow-400/10'
                  : 'bg-slate-50 border-slate-200 hover:border-teal-500 hover:bg-teal-50/50'
              }`}
            >
              <div>
                <span className="inline-block text-xs font-bold px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 mb-1">
                  {sample.category}
                </span>
                <p className="font-bold text-sm sm:text-base text-slate-900 line-clamp-1 dark:text-white">
                  {sample.name}
                </p>
                <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                  {sample.description}
                </p>
              </div>
              <span className="mt-2 text-xs font-bold text-teal-600 flex items-center gap-1">
                Tekan untuk dengar &rarr;
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Petua & Panduan untuk Warga Emas */}
      <div
        className={`p-4 rounded-xl text-sm flex items-start gap-3 ${
          highContrast
            ? 'bg-black text-gray-300 border border-gray-700'
            : 'bg-blue-50 text-blue-900 border border-blue-100'
        }`}
      >
        <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <p>
          <strong>Petua untuk hasil terbaik:</strong> Letakkan botol ubat anda di atas meja rata di bawah lampu yang terang.
          Pusingkan botol supaya nama ubat dan arahan pengambilan menghadap kamera dengan jelas.
        </p>
      </div>
    </div>
  );
};
