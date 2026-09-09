export interface AudioSection {
  id: string;
  title: string;
  text: string;
}

export interface MedicationData {
  medicationName: string;
  genericName: string;
  strengthAndDosage: string;
  instructions: string;
  purpose: string;
  warnings: string[];
  prescribedForPatient?: string;
  prescriber?: string;
  refills?: string;
  rxNumber?: string;
  expirationDate?: string;
  cautionaryAdvice?: string;
  fullSpokenScript: string;
  audioSections: AudioSection[];
}

export interface ProcessedMedication {
  id: string;
  timestamp: number;
  imageUri: string;
  data: MedicationData;
  source: 'camera' | 'upload' | 'sample';
}

export type TextSize = 'normal' | 'large' | 'extralarge';
export type SpeechSpeed = 'slow' | 'normal' | 'fast';
