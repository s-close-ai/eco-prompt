export interface MRGeneratorSettingsData {
  gitlabApiAccessToken: string;
  webhookSecretToken: string;
  mrTemplate: string;
}

export interface MRGeneratorSettingsResponse {
  status: string;
  data: MRGeneratorSettingsData;
}