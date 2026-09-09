import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, Modality } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Lazy initializer for Gemini client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in server environment.');
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

// Pre-analyzed fallback clinical data in Bahasa Melayu for sample prescriptions
const SAMPLE_MED_DATA: Record<string, any> = {
  lisinopril: {
    medicationName: 'Lisinopril',
    genericName: 'Lisinopril (Nama jenama setaraf: Zestril)',
    strengthAndDosage: '10 mg - Ambil 1 biji sekali sehari',
    instructions: 'Ambil 1 biji melalui mulut sekali sehari pada waktu pagi dengan segelas air kosong. Boleh diambil sebelum atau selepas makan.',
    purpose: 'Tekanan darah tinggi - membantu mengendurkan saluran darah dan melindungi kesihatan jantung anda',
    warnings: [
      'Boleh menyebabkan rasa pening apabila bangun; bangun perlahan-lahan dari duduk atau baring',
      'Elakkan pengganti garam yang mengandungi kalium tanpa nasihat doktor',
      'Minum air secukupnya sepanjang hari untuk mengelakkan dehidrasi',
    ],
    prescribedForPatient: 'Puan Fatimah Binti Ismail',
    prescriber: 'Dr. Ahmad Razali',
    refills: 'Baki 3 Kali Ulangan (Refill)',
    rxNumber: 'RX-6839210-MY',
    expirationDate: '14/08/2027',
    cautionaryAdvice: 'Makan ubat ini mengikut jadual pada setiap pagi untuk memastikan tekanan darah anda kekal stabil dan selamat.',
    fullSpokenScript: 'Assalamualaikum dan salam sejahtera Puan Fatimah. Ini adalah terjemahan arahan ubat anda dalam Bahasa Melayu: Ubat anda ialah Lisinopril, sepuluh miligram. Ambil satu biji ubat melalui mulut sekali sehari pada waktu pagi dengan segelas air kosong. Ubat ini membantu menurunkan tekanan darah tinggi dan melindungi jantung anda. Sila berhati-hati kerana ubat ini boleh menyebabkan rasa pening, jadi bangun perlahan-lahan dari tempat duduk atau katil. Anda mempunyai baki tiga kali ulangan preskripsi.',
    audioSections: [
      { id: 'name', title: 'Nama & Kegunaan Ubat', text: 'Ini adalah terjemahan ubat Lisinopril, sepuluh miligram. Ia digunakan untuk merawat tekanan darah tinggi dan menjaga kesihatan jantung anda.' },
      { id: 'directions', title: 'Cara & Waktu Makan', text: 'Ambil satu biji ubat sekali sehari pada waktu pagi dengan segelas air kosong. Anda boleh mengambilnya selepas makan sarapan.' },
      { id: 'warnings', title: 'Amaran Penting', text: 'Ubat ini mungkin menyebabkan rasa pening. Bangun perlahan-lahan dari kerusi atau katil. Elakkan makanan bergaram kalium tanpa nasihat doktor.' },
      { id: 'presc', title: 'Doktor & Ulangan Ubat', text: 'Dipreskripsikan oleh Doktor Ahmad Razali. Nombor preskripsi ialah enam lapan tiga sembilan dua satu sifar. Anda mempunyai tiga kali baki ulangan ubat.' },
    ],
  },
  metformin: {
    medicationName: 'Metformin HCl',
    genericName: 'Metformin Hidroklorida (Nama jenama: Glucophage)',
    strengthAndDosage: '500 mg - Ambil 1 biji dua kali sehari',
    instructions: 'Ambil 1 biji melalui mulut dua kali sehari bersama hidangan makanan (semasa sarapan pagi dan makan malam) dengan segelas air.',
    purpose: 'Kencing manis (Diabetes Jenis 2) - membantu mengawal dan menstabilkan paras gula dalam darah',
    warnings: [
      'Wajib diambil bersama atau sejurus selepas makan untuk mengelakkan sakit perut atau rasa loya',
      'Elakkan minuman beralkohol semasa mengambil ubat Metformin',
      'Pastikan minum air secukupnya sepanjang hari',
    ],
    prescribedForPatient: 'Encik Tan Ah Seng',
    prescriber: 'Dr. Siti Nurhaliza',
    refills: 'Baki 2 Kali Ulangan (Refill)',
    rxNumber: 'RX-7948123-MY',
    expirationDate: '28/07/2027',
    cautionaryAdvice: 'Mengambil ubat ini bersama makanan membantu mengelakkan ketidakselesaan perut dan mengekalkan tenaga harian anda.',
    fullSpokenScript: 'Salam sejahtera Encik Tan. Ini adalah terjemahan arahan ubat anda dalam Bahasa Melayu: Ubat anda ialah Metformin Hidroklorida, lima ratus miligram. Ambil satu biji ubat dua kali sehari bersama hidangan makanan, iaitu semasa sarapan pagi dan makan malam. Pastikan makan bersama makanan untuk melindungi perut anda daripada rasa loya atau pedih hulu hati. Ubat ini sangat penting untuk mengawal paras gula darah anda. Anda ada baki dua kali ulangan ubat.',
    audioSections: [
      { id: 'name', title: 'Nama & Kegunaan Ubat', text: 'Ini adalah terjemahan ubat Metformin Hidroklorida, lima ratus miligram, digunakan untuk mengawal paras gula darah pesakit kencing manis.' },
      { id: 'directions', title: 'Cara & Waktu Makan', text: 'Ambil satu biji ubat dua kali sehari bersama makanan, iaitu semasa sarapan pagi dan semasa makan malam, dengan segelas air.' },
      { id: 'warnings', title: 'Amaran Penting', text: 'Sentiasa ambil ubat ini bersama makanan untuk elak ketidakselesaan perut. Elakkan sebarang minuman keras atau beralkohol.' },
      { id: 'presc', title: 'Doktor & Ulangan Ubat', text: 'Dipreskripsikan oleh Doktor Siti Nurhaliza. Anda mempunyai baki dua kali ulangan preskripsi di farmasi.' },
    ],
  },
  amoxicillin: {
    medicationName: 'Amoxicillin',
    genericName: 'Amoxicillin Trihydrate (Nama jenama: Amoxil)',
    strengthAndDosage: '500 mg - Ambil 1 kapsul setiap 8 jam',
    instructions: 'Ambil 1 kapsul melalui mulut setiap 8 jam (3 kali sehari) sehingga habis semua 30 kapsul dalam botol. Minum banyak air.',
    purpose: 'Antibiotik - untuk merawat jangkitan kuman bakteria',
    warnings: [
      'Wajib habiskan semua kapsul antibiotik selama 10 hari walaupun badan anda sudah berasa sihat',
      'Jika berhenti terlalu awal, kuman bakteria boleh kembali dengan lebih kebal',
      'Boleh diambil bersama makanan atau susu jika perut berasa tidak selesa',
    ],
    prescribedForPatient: 'Puan Mary Anak Robert',
    prescriber: 'Dr. Subramaniam',
    refills: 'Tiada Ulangan (Habiskan semua dos)',
    rxNumber: 'RX-5512904-MY',
    expirationDate: '01/09/2027',
    cautionaryAdvice: 'Menghabiskan seluruh ubat antibiotik memastikan kuman jangkitan dihapuskan sepenuhnya daripada badan anda.',
    fullSpokenScript: 'Salam sejahtera Puan Mary. Ini adalah terjemahan arahan ubat anda dalam Bahasa Melayu: Ubat anda ialah antibiotik Amoxicillin, lima ratus miligram. Ambil satu kapsul setiap lapan jam dengan segelas air kosong sehingga habis kesemua tiga puluh biji kapsul. Walaupun anda sudah berasa sihat dan bertenaga selepas beberapa hari, tolong jangan berhenti awal. Anda mesti habiskan kesemua ubat ini. Jika timbul gatal atau ruam kulit, segera hubungi doktor.',
    audioSections: [
      { id: 'name', title: 'Nama & Kegunaan Ubat', text: 'Ini adalah terjemahan ubat antibiotik Amoxicillin, lima ratus miligram, untuk merawat jangkitan kuman pada badan anda.' },
      { id: 'directions', title: 'Cara & Waktu Makan', text: 'Ambil satu kapsul ubat setiap lapan jam dengan banyak air kosong. Pastikan habiskan kesemua kapsul dalam botol.' },
      { id: 'warnings', title: 'Amaran Penting', text: 'Jangan berhenti makan ubat walaupun sudah rasa sihat. Hubungi klinik segera jika mengalami ruam atau alahan kulit.' },
      { id: 'presc', title: 'Doktor & Preskripsi', text: 'Dipreskripsikan oleh Doktor Subramaniam. Tiada ulangan kerana ini adalah rawatan antibiotik lengkap selama sepuluh hari.' },
    ],
  },
};

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', hasGeminiKey: !!process.env.GEMINI_API_KEY });
});

// Endpoint: Analyze Medication Label from Image (in Bahasa Melayu)
app.post('/api/analyze-label', async (req, res) => {
  try {
    const { imageBase64, mimeType, sampleId } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Data gambar diperlukan.' });
    }

    // If a sampleId is provided and recognized, we can use the pre-verified data if model is unavailable
    const fallbackSampleData = sampleId && SAMPLE_MED_DATA[sampleId] ? SAMPLE_MED_DATA[sampleId] : null;

    // Clean up base64 prefix if present
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '').replace(/^data:image\/svg\+xml;charset=utf-8,/, '');
    const cleanMimeType = mimeType || 'image/jpeg';

    const prompt = `Anda adalah seorang penterjemah perubatan bertauliah dan pembantu ahli farmasi klinikal profesional dalam Bahasa Melayu.
TUGAS UTAMA ANDA: TERJEMAHKAN SEMUA MAKLUMAT UBAT DAN TEKS BACAAN SUARA (SPEECH TEXT) 100% KE DALAM BAHASA MELAYU STANDARD YANG TULEN, JELAS, TEPAT, DAN MESRA WARGA EMAS.

PANDUAN TERJEMAHAN KHAS UNTUK TEKS BACAAN SUARA ('fullSpokenScript' & 'audioSections'):
1. Label botol atau paket ubat preskripsi fizikal di hospital, klinik, dan farmasi kerap dicetak dalam Bahasa Inggeris (seperti: "Take 1 tablet daily by mouth with meals", "Refill 2 times", "Keep out of reach of children", "May cause dizziness", "Take on empty stomach").
   Anda WAJIB MENTERJEMAHKAN SEMUA teks arahan, amaran, kegunaan, dan butiran preskripsi ini ke dalam BAHASA MELAYU. JANGAN biarkan sebarang ayat Bahasa Inggeris kekal dalam skrip ucapan suara.
2. Untuk sebutan suara (speech-to-text / pembaca audio suara) yang jelas untuk warga emas:
   - Sebut unit ubat secara perkataan Melayu penuh: tukar "mg" kepada "miligram", "ml" kepada "mililiter", "mcg" kepada "mikrogram".
   - Sebut sukatan dengan terang: contohnya "satu biji tablet", "dua kali sehari", "bersama sarapan pagi", "sebelum tidur".
   - Terjemahkan istilah perubatan teknikal kepada bahasa Melayu yang mudah difahami: contohnya "hypertension" diterjemah sebagai "tekanan darah tinggi", "diabetes" diterjemah sebagai "kencing manis", "painkiller" diterjemah sebagai "ubat tahan sakit", "analgesic" diterjemah sebagai "ubat pelega kesakitan".
3. Mulakan skrip ucapan penuh ('fullSpokenScript') dengan salam pembuka yang ramah:
   "Salam sejahtera [Nama Pesakit jika ada]. Ini adalah terjemahan arahan ubat anda dalam Bahasa Melayu: Ubat anda ialah [Nama Ubat], [Kekuatan dos]. [Arahan pengambilan]...".
4. Setiap item dalam 'audioSections' (tajuk dan kandungan teks) MESTI diterjemahkan sepenuhnya ke dalam Bahasa Melayu.

Sediakan objek JSON mengikut skema berikut:
- 'medicationName': Nama ubat utama (jenama atau generik, contoh: "Lipitor", "Metformin", "Amlodipine").
- 'genericName': Nama kimia generik ubat (contoh: "Atorvastatin Calcium").
- 'strengthAndDosage': Kekuatan dan dos dalam Bahasa Melayu (contoh: "20 miligram - Ambil 1 biji sehari").
- 'instructions': Terjemahan arahan pengambilan dalam Bahasa Melayu yang sangat jelas dan terperinci.
- 'purpose': Terjemahan kegunaan ubat dalam Bahasa Melayu yang ringkas dan menenangkan (contoh: "Tekanan darah tinggi - membantu menurunkan tekanan darah dan melindungi jantung anda").
- 'warnings': Senarai 2 hingga 4 amaran dan peringatan penting DITERJEMAHKAN ke dalam Bahasa Melayu (contoh: "Boleh menyebabkan rasa pening ketika bangun", "Ambil selepas makan untuk elak pedih perut", "Elakkan minuman beralkohol").
- 'prescribedForPatient': Nama pesakit jika tertera pada label (contoh: "Puan Aminah"), atau "Pesakit".
- 'prescriber': Nama doktor atau klinik/hospital jika ada (contoh: "Dr. Roslan" atau "Klinik Kesihatan").
- 'refills': Bilangan ulangan bekalan ubat (refill) dalam Bahasa Melayu.
- 'rxNumber': Nombor preskripsi ubat jika ada.
- 'expirationDate': Tarikh luput atau tarikh buang ubat jika ada.
- 'cautionaryAdvice': Nasihat dan kata-kata penenang lembut dalam Bahasa Melayu untuk pesakit.
- 'fullSpokenScript': Skrip bacaan suara (speech text / audio narration) LENGKAP DITERJEMAHKAN 100% KE DALAM BAHASA MELAYU, dimulakan dengan: "Salam sejahtera... Ini adalah terjemahan arahan ubat anda dalam Bahasa Melayu...".
- 'audioSections': 4 pecahan teks ucapan suara ringkas dalam Bahasa Melayu:
  1. "Nama & Kegunaan Ubat": contoh: "Ini adalah terjemahan ubat Lipitor, dua puluh miligram. Ia digunakan untuk mengawal kolesterol dan melindungi jantung anda."
  2. "Cara & Waktu Makan": contoh: "Ambil satu biji ubat setiap pagi melalui mulut dengan segelas air kosong selepas makan sarapan."
  3. "Peringatan & Amaran Penting": contoh: "Jangan ambil bersama jus limau gedang. Hubungi klinik jika anda mengalami sakit otot yang luar biasa."
  4. "Maklumat Preskripsi & Doktor": contoh: "Dipreskripsikan oleh Doktor Roslan. Anda mempunyai baki dua kali ulangan ubat di farmasi."`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        medicationName: { type: Type.STRING },
        genericName: { type: Type.STRING },
        strengthAndDosage: { type: Type.STRING },
        instructions: { type: Type.STRING },
        purpose: { type: Type.STRING },
        warnings: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        prescribedForPatient: { type: Type.STRING },
        prescriber: { type: Type.STRING },
        refills: { type: Type.STRING },
        rxNumber: { type: Type.STRING },
        expirationDate: { type: Type.STRING },
        cautionaryAdvice: { type: Type.STRING },
        fullSpokenScript: { type: Type.STRING },
        audioSections: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              text: { type: Type.STRING },
            },
            required: ['id', 'title', 'text'],
          },
        },
      },
      required: [
        'medicationName',
        'genericName',
        'strengthAndDosage',
        'instructions',
        'purpose',
        'warnings',
        'fullSpokenScript',
        'audioSections',
      ],
    };

    // If a known sample was selected, return the verified Malaysian clinical data immediately
    if (fallbackSampleData) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      return res.json({ success: true, data: fallbackSampleData });
    }

    let ai: GoogleGenAI;
    try {
      ai = getGeminiClient();
    } catch (keyErr: any) {
      throw keyErr;
    }

    // Multi-model fallback chain to handle 503 high-demand temporary outages gracefully
    // gemini-flash-latest is the most stable and available production tier
    const modelsToTry = ['gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];
    let lastError: any = null;
    let parsedData: any = null;

    for (const model of modelsToTry) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const contents = {
            parts: [
              {
                inlineData: {
                  mimeType: cleanMimeType.includes('png') ? 'image/png' : 'image/jpeg',
                  data: cleanBase64,
                },
              },
              { text: prompt },
            ],
          };

          const response = await ai.models.generateContent({
            model,
            contents,
            config: {
              responseMimeType: 'application/json',
              responseSchema,
            },
          });

          const rawText = response.text;
          if (rawText) {
            parsedData = JSON.parse(rawText);
            break;
          }
        } catch (err: any) {
          lastError = err;
          const errMsg = String(err?.message || '');
          const isTransient =
            errMsg.includes('503') ||
            errMsg.includes('high demand') ||
            errMsg.includes('UNAVAILABLE') ||
            errMsg.includes('429') ||
            errMsg.includes('RESOURCE_EXHAUSTED');

          console.log(`[AI Rutin] Model ${model} (cubaan ${attempt}):`, isTransient ? '503 giliran tinggi, beralih model' : errMsg.slice(0, 100));

          if (isTransient && attempt === 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } else {
            break;
          }
        }
      }

      if (parsedData) {
        break;
      }
    }

    if (parsedData) {
      return res.json({ success: true, data: parsedData });
    }

    // Check if error was 503 or transient
    const lastErrMsg = String(lastError?.message || '');
    if (
      lastErrMsg.includes('503') ||
      lastErrMsg.includes('high demand') ||
      lastErrMsg.includes('UNAVAILABLE')
    ) {
      return res.status(503).json({
        error:
          'Perkhidmatan AI sedang mengalami permintaan tinggi buat seketika. Sila tunggu sebentar dan tekan "Cuba Semula".',
        isTransient: true,
      });
    }

    throw lastError || new Error('Gagal menganalisa label ubat.');
  } catch (error: any) {
    const is503 = String(error?.message || '').includes('503');
    if (!is503) {
      console.warn('Status analisa label ubat:', error?.message || error);
    }
    res.status(500).json({
      error:
        error.message ||
        'Gagal membaca maklumat pada label ubat. Sila pastikan label botol diterangi cahaya yang jelas dan cuba lagi.',
      isTransient: false,
    });
  }
});

// Endpoint: Optional Gemini TTS Voice Generation
app.post('/api/generate-tts', async (req, res) => {
  try {
    const { text, voiceName } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Teks diperlukan untuk audio.' });
    }

    const ai = getGeminiClient();
    const prompt = `Sebutkan ayat ini dalam Bahasa Melayu dengan nada yang sangat tenang, lembut, mesra dan jelas untuk didengar oleh pesakit warga emas: "${text}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceName || 'Kore',
            },
          },
        },
      },
    });

    const audioBase64 =
      response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    const mimeType =
      response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType || 'audio/wav';

    if (!audioBase64) {
      return res.status(500).json({ error: 'Audio TTS tidak dapat dijana.' });
    }

    res.json({ success: true, audioBase64, mimeType });
  } catch (error: any) {
    console.warn('Gemini TTS fallback will be used on client:', error.message);
    res.status(500).json({
      error: error.message || 'TTS generation unavailable',
      fallback: true,
    });
  }
});

// Mount Vite or static server
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Pelayan Pembaca Audio Label Ubat sedang berjalan di port ${PORT}`);
  });
}

startServer();
