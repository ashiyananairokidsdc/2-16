
import { PatientRecord } from "./types.ts";

const GAS_URL = "https://script.google.com/macros/s/AKfycbz8aDUiz59mlyy556MmUdTB3leFsa14YcgD3m_MU4fB0OmihcXsBF5x8GbHGasyQ09y/exec";

export const syncToGoogleSheet = async (patient: PatientRecord) => {
  try {
    const payload = {
      timestamp: new Date().toISOString(),
      patientId: patient.patientId,
      name: patient.name,
      birthDate: patient.birthDate,
      lastVisit: patient.lastVisit,
      currentStatus: patient.plan.find(s => s.status === '実施中')?.label || '完了/待機中',
      progress: `${patient.plan.filter(s => s.status === '完了').length}/${patient.plan.length}`
    };

    await fetch(GAS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return { success: true };
  } catch (error) {
    console.error("Sync Error:", error);
    throw error;
  }
};
