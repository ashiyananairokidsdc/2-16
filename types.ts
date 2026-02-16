
export enum PStepStatus {
  PENDING = '未着手',
  IN_PROGRESS = '実施中',
  COMPLETED = '完了',
}

export interface User {
  name: string;
  passwordHash: string; // 簡易的なパスワード管理
}

export interface PatientFile {
  id: string;
  url: string;
  name: string;
  type: 'image' | 'pdf' | 'other';
  date: string;
  aiAnalysis?: string;
}

export interface TreatmentStep {
  id: string;
  label: string;
  status: PStepStatus;
  notes: string;
  files: PatientFile[];
  completedDate?: string;
}

export interface PatientRecord {
  id: string;
  patientId: string; // 医院での管理ID
  name: string;
  birthDate: string;
  plan: TreatmentStep[];
  createdAt: string;
  lastVisit: string;
}

export const DEFAULT_P_FLOW: string[] = [
  '歯周精密検査 (1回目)',
  'スケーリング・TBI',
  '再評価 (1回目)',
  'SRP (ルートプレーニング)',
  '再評価 (2回目)',
  '歯周外科手術 (必要時)',
  '再評価 (最終)',
  'メンテナンス (SPT)',
];
