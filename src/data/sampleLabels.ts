// Contoh label ubat preskripsi realistik untuk ujian tanpa botol ubat fizikal
export interface SampleMedication {
  id: string;
  name: string;
  category: string;
  description: string;
  labelSvgDataUrl: string;
}

// Menjana label preskripsi farmasi SVG dalam Bahasa Melayu sebagai Data URL
function createRxLabelSvg(
  rxNumber: string,
  patientName: string,
  doctorName: string,
  medName: string,
  directions: string,
  warnings: string,
  date: string,
  refills: string,
  pillColor: string
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 360" width="600" height="360" style="background:#ffffff; font-family: Arial, sans-serif;">
    <!-- Header Farmasi Malaysia -->
    <rect x="0" y="0" width="600" height="60" fill="#004d40"/>
    <text x="24" y="38" fill="#ffffff" font-size="20" font-weight="bold">FARMASI KLINIK KESIHATAN MALAYSIA</text>
    <text x="440" y="38" fill="#a7f3d0" font-size="13">TEL: 03-8888 1234</text>

    <!-- Kotak Utama -->
    <rect x="15" y="70" width="570" height="275" rx="8" fill="#fcfbf7" stroke="#d1d5db" stroke-width="2"/>

    <!-- No. Pendaftaran & Tarikh -->
    <text x="35" y="100" fill="#374151" font-size="15" font-weight="bold">NO. PRESKRIPSI: ${rxNumber}</text>
    <text x="270" y="100" fill="#4b5563" font-size="14">TARIKH: ${date}</text>
    <text x="430" y="100" fill="#15803d" font-size="14" font-weight="bold">${refills}</text>

    <!-- Nama Pesakit & Doktor -->
    <text x="35" y="130" fill="#111827" font-size="17" font-weight="bold">PESAKIT: ${patientName}</text>
    <text x="340" y="130" fill="#374151" font-size="15">DOKTOR: Dr. ${doctorName}</text>

    <line x1="35" y1="145" x2="565" y2="145" stroke="#9ca3af" stroke-dasharray="4"/>

    <!-- Nama Ubat Jelas -->
    <rect x="35" y="155" width="530" height="42" fill="#eff6ff" rx="4" stroke="#bfdbfe"/>
    <circle cx="58" cy="176" r="10" fill="${pillColor}"/>
    <text x="80" y="182" fill="#1e3a8a" font-size="19" font-weight="bold">${medName}</text>

    <!-- Arahan Pengambilan -->
    <text x="35" y="222" fill="#111827" font-size="16" font-weight="bold">ARAHAN PENGAMBILAN:</text>
    <text x="35" y="248" fill="#1f2937" font-size="15" font-weight="600">${directions}</text>

    <!-- Kotak Amaran Kuning -->
    <rect x="35" y="265" width="530" height="36" fill="#fef3c7" rx="4" stroke="#fcd34d"/>
    <text x="45" y="288" fill="#92400e" font-size="13" font-weight="bold">PERINGATAN: ${warnings}</text>

    <!-- Kod Bar -->
    <g transform="translate(35, 310)">
      <rect x="0" y="0" width="3" height="24" fill="#111"/>
      <rect x="6" y="0" width="5" height="24" fill="#111"/>
      <rect x="15" y="0" width="2" height="24" fill="#111"/>
      <rect x="20" y="0" width="6" height="24" fill="#111"/>
      <rect x="30" y="0" width="4" height="24" fill="#111"/>
      <rect x="38" y="0" width="2" height="24" fill="#111"/>
      <rect x="44" y="0" width="7" height="24" fill="#111"/>
      <rect x="55" y="0" width="3" height="24" fill="#111"/>
      <rect x="62" y="0" width="5" height="24" fill="#111"/>
      <rect x="71" y="0" width="4" height="24" fill="#111"/>
      <rect x="80" y="0" width="3" height="24" fill="#111"/>
      <rect x="87" y="0" width="6" height="24" fill="#111"/>
      <rect x="98" y="0" width="2" height="24" fill="#111"/>
      <rect x="105" y="0" width="5" height="24" fill="#111"/>
      <text x="125" y="16" fill="#6b7280" font-size="12">UBAT TERKAWAL | JAUHKAN DARIPADA KANAK-KANAK</text>
    </g>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const SAMPLE_MEDICATIONS: SampleMedication[] = [
  {
    id: 'lisinopril',
    name: 'Lisinopril 10 mg',
    category: 'Tekanan Darah Tinggi',
    description: 'Ubat harian untuk mengawal tekanan darah dan melindungi jantung',
    labelSvgDataUrl: createRxLabelSvg(
      'RX-6839210-MY',
      'PUAN FATIMAH BINTI ISMAIL',
      'Ahmad Razali',
      'LISINOPRIL 10 MG TABLET (Generik Zestril)',
      'AMBIL 1 BIJI MELALUI MULUT SEKALI SEHARI PADA WAKTU PAGI DENGAN AIR',
      'BOLEH MENYEBABKAN PENING. BANGUN PERLAHAN-LAHAN.',
      '14/08/2026',
      'BAKI 3 KALI ULANGAN',
      '#ef4444'
    ),
  },
  {
    id: 'metformin',
    name: 'Metformin HCl 500 mg',
    category: 'Gula Darah / Kencing Manis',
    description: 'Ubat kencing manis untuk diambil bersama hidangan makanan',
    labelSvgDataUrl: createRxLabelSvg(
      'RX-7948123-MY',
      'ENCIK TAN AH SENG',
      'Siti Nurhaliza',
      'METFORMIN HCL 500 MG TABLET (Glucophage)',
      'AMBIL 1 BIJI DUA KALI SEHARI BERSAMA SARAPAN & MAKAN MALAM',
      'WAJIB MAKAN BERSAMA MAKANAN UNTUK ELAK SAKIT PERUT.',
      '28/07/2026',
      'BAKI 2 KALI ULANGAN',
      '#3b82f6'
    ),
  },
  {
    id: 'amoxicillin',
    name: 'Amoxicillin 500 mg',
    category: 'Antibiotik (Jangkitan)',
    description: 'Ubat rawatan antibiotik lengkap selama 10 hari',
    labelSvgDataUrl: createRxLabelSvg(
      'RX-5512904-MY',
      'PUAN MARY ANAK ROBERT',
      'Subramaniam',
      'AMOXICILLIN 500 MG KAPSUL (Amoxil)',
      'AMBIL 1 KAPSUL SETIAP 8 JAM SEHINGGA HABIS SEMUA 30 BIJI',
      'HABISKAN SEMUA UBAT WALAUPUN SUDAH RASA SIHAT.',
      '01/09/2026',
      'TIADA ULANGAN (HABISKAN SEMUA)',
      '#eab308'
    ),
  },
];
