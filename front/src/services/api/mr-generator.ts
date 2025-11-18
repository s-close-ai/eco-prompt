import { apiClient } from '@/services/axios';
import type { MRGeneratorSettingsResponse, MRGeneratorSettingsData } from '@/types/api/mr-generator.types';

export const getMRGeneratorSettings = async () => {
  const response = await apiClient.get<MRGeneratorSettingsResponse>('/merge-requests');
  return response.data;
};

export const saveMRGeneratorSettings = async (request: MRGeneratorSettingsData) => {
  const response = await apiClient.put<MRGeneratorSettingsResponse>('/merge-requests', request);
  return response.data;
};