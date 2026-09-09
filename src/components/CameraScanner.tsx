import React, { useRef, useState, useEffect } from 'react';
import { Camera, SwitchCamera, Sparkles, AlertCircle } from 'lucide-react';
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
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean>(false);
  const [activeCameraLabel, setActiveCameraLabel] = useState<string>('Kamera Belakang');

  // Mengesan ID peranti kamera belakang secara terus jika disokong
  const findRearCameraDeviceId = async (): Promise<string | null> => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return null;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');

      if (videoInputs.length === 0) return null;

      // Cari label perkataan seperti back, rear, environment, belakang, atau sensor utama
      const explicitRear = videoInputs.find((d) =>
        /back|rear|environment|belakang|main|facing back|camera 0/i.test(d.label)
      );
      if (explicitRear && explicitRear.deviceId) {
        return explicitRear.deviceId;
      }

      // Jika ada 2 kamera dan satu adalah 'front/selfie', pilih yang bukan hadapan
      if (videoInputs.length >= 2) {
        const nonFront = videoInputs.find(
          (d) => d.label && !/front|user|selfie|depan|face/i.test(d.label)
        );
        if (nonFront && nonFront.deviceId) {
          return nonFront.deviceId;
        }
      }
    } catch {
      // Abaikan ralat enumerasi jika pelayar menyekat
    }
    return null;
  };

  // Memulakan aliran kamera dengan pengesanan langsung kamera belakang
  const startCamera = async (targetFacing: 'environment' | 'user') => {
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      let newStream: MediaStream | null = null;

      // 1. Jika sasaran adalah kamera belakang ('environment'), cuba kesan peranti fizikal belakang dahulu
      if (targetFacing === 'environment') {
        const rearDeviceId = await findRearCameraDeviceId();
        if (rearDeviceId) {
          try {
            newStream = await navigator.mediaDevices.getUserMedia({
              video: {
                deviceId: { exact: rearDeviceId },
                width: { ideal: 1920 },
                height: { ideal: 1080 },
              },
              audio: false,
            });
          } catch (devErr) {
            console.log('Percubaan deviceId khusus tidak berjaya, mencuba facingMode...');
          }
        }
      }

      // 2. Jika belum dapat, paksa perkakasan kamera belakang dengan { exact: 'environment' }
      if (!newStream && targetFacing === 'environment') {
        try {
          newStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { exact: 'environment' },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
            audio: false,
          });
        } catch (exactErr) {
          console.log('exact: environment tidak disokong pada peranti ini, menggunakan mod ideal');
        }
      }

      // 3. Sandaran kepada standard ideal facingMode
      if (!newStream) {
        try {
          newStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: targetFacing },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
            audio: false,
          });
        } catch (idealErr) {
          // 4. Sandaran terakhir: buka mana-mana video stream yang ada
          newStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      if (newStream) {
        setStream(newStream);
        setHasCameraPermission(true);

        const track = newStream.getVideoTracks()[0];
        if (track) {
          const trackLabel = (track.label || '').toLowerCase();
          const isFront = /front|user|selfie|depan/.test(trackLabel);
          const isRear = /back|rear|environment|belakang|main|facing back/.test(trackLabel);

          // Jika sasaran adalah belakang tetapi pelayar memberikan kamera depan kerana kebenaran belum ada sebelumnya,
          // kini kebenaran sudah diberikan, periksa semula peranti dan tukar terus ke kamera belakang!
          if (targetFacing === 'environment' && isFront) {
            const betterRearId = await findRearCameraDeviceId();
            if (betterRearId && betterRearId !== track.getSettings().deviceId) {
              try {
                const autoRearStream = await navigator.mediaDevices.getUserMedia({
                  video: {
                    deviceId: { exact: betterRearId },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                  },
                  audio: false,
                });
                track.stop();
                newStream = autoRearStream;
                setStream(autoRearStream);
                setActiveCameraLabel('Kamera Belakang (Dikesan)');
              } catch {
                // Kekalkan stream sedia ada jika pertukaran automatik disekat
              }
            }
          } else {
            setActiveCameraLabel(
              isRear
                ? 'Kamera Belakang (Aktif)'
                : isFront
                ? 'Kamera Hadapan'
                : targetFacing === 'environment'
                ? 'Kamera Belakang (Aktif)'
                : 'Kamera Hadapan'
            );
          }
        }

        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
          await videoRef.current.play();
        }
      }
    } catch (err: any) {
      console.log('Kamera live tidak aktif, mod tangkapan terus peranti diaktifkan.');
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

  // Tukar kamera depan / belakang secara manual jika diperlukan
  const toggleCamera = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    seniorAudio.announcePrompt(
      nextFacing === 'environment' ? 'Kamera belakang diaktifkan' : 'Kamera hadapan diaktifkan'
    );
  };

  // Tangkap gambar daripada paparan video jika aktif, atau terus buka kamera peranti
  const handleSnapClick = () => {
    if (hasCameraPermission && videoRef.current) {
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
    } else {
      // Buka kamera peranti belakang terus tanpa sekatan kebenaran
      nativeCameraInputRef.current?.click();
    }
  };

  // Tangkap gambar daripada kamera terus peranti
  const handleNativeCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        seniorAudio.announcePrompt('Gambar label ubat berjaya diambil. Sedang membaca maklumat.');
        onImageSelected(base64, 'camera');
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
        }`}
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

              {/* Status Pengesanan Kamera Belakang Peranti */}
              <div
                id="active-camera-indicator"
                className="absolute top-4 left-4 bg-black/75 backdrop-blur-sm text-white px-3 py-1.5 rounded-xl border border-white/20 text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-md pointer-events-none z-10"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{activeCameraLabel}</span>
              </div>

              {/* Butang Tukar Kamera */}
              <button
                id="flip-camera-button"
                onClick={toggleCamera}
                type="button"
                className="absolute top-4 right-4 bg-black/70 hover:bg-black text-white p-3 rounded-2xl backdrop-blur-sm border border-white/30 shadow-md transition-transform active:scale-95 z-10"
                title="Tukar Kamera (Depan / Belakang)"
                aria-label="Tukar Kamera"
              >
                <SwitchCamera className="w-6 h-6" />
              </button>

              {/* Butang Shutter Kamera Pada Lensa */}
              <div className="absolute bottom-5 inset-x-0 flex justify-center pointer-events-none z-10">
                <button
                  type="button"
                  id="camera-shutter-button"
                  onClick={handleSnapClick}
                  disabled={isLoading}
                  className="pointer-events-auto p-4 rounded-full bg-white/95 hover:bg-white text-teal-800 shadow-2xl border-4 border-teal-500 transition-all active:scale-90 hover:scale-105"
                  aria-label="Imbas Label Ubat"
                  title="Imbas Label Ubat"
                >
                  <Camera className="w-8 h-8 text-teal-700" />
                </button>
              </div>
            </>
          ) : (
            <div className="text-center p-8 max-w-md">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-teal-900/40 border border-teal-500/30 flex items-center justify-center text-teal-400">
                <Camera className="w-10 h-10" />
              </div>
              <p className="text-xl font-bold text-white mb-2">Sedia Mengimbas Label Ubat</p>
              <p className="text-sm text-slate-300 mb-6">
                Tekan butang di bawah untuk membuka kamera belakang peranti anda bagi mengimbas label ubat.
              </p>
              <button
                type="button"
                id="open-device-camera-button"
                onClick={() => nativeCameraInputRef.current?.click()}
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-base shadow-lg transition-all active:scale-95"
              >
                <Camera className="w-5 h-5" />
                Buka Kamera Sekarang
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
      </div>

      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleNativeCapture}
      />

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
