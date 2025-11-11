export interface UserPromptSettingRequest {
    personalPrompt: string;
}

export interface UserPromptSettingResponse {
    status: string;
    data: void;
}

export interface SettingsResponse {
    status: string;
    data: {
        sharingPrompt: 'Y' | 'N';
        personalPrompt: string;
    };
}