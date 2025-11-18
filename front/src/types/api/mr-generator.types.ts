export interface MRGeneratorSettingsResponse {
  gitlabApiAccessToken: string;
  webhookSecretToken: string;
  mrTemplate: string;
}

export interface MRGeneratorSettingsRequest {
  gitlabApiAccessToken: string;
  webhookSecretToken: string;
  mrTemplate: string;
}