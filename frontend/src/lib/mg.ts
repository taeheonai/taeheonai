// frontend/src/lib/api/mg.ts
import axios from 'axios';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://taeheonai-production-2130.up.railway.app/api';
const api = axios.create({ baseURL: API_BASE_URL });

export type MGIndexDTO = {
  issuepool_id: number;
  category_id: number;
  gri_index: string;
  frequency: number;
  grade: 'A' | 'B' | 'C';
  gri_id?: number;
};

export async function fetchMGIndexes(issuepoolIds: number[]): Promise<MGIndexDTO[]> {
  const { data } = await api.post('/v1/mg/indexes', { issuepool_ids: issuepoolIds });
  return data.items;
}

export async function requestMGPolish(sessionKey: string, threadId: string, items: MGIndexDTO[]) {
  const { data } = await api.post('/v1/mg/polish', items, {
    headers: { 'X-Session-Key': sessionKey, 'X-Thread-Id': threadId },
  });
  return data; // job_id 또는 결과
}
