const getWelcomePageMessage = (): string[] => {
    const customMessage = (window as any).config?.cmeetEnv?.welcomePageMessage;
    if (customMessage) {
        return customMessage.split('|');
    }
    return [];
};

const getDebugMode = (): boolean => {
    const val = (window as any).config?.cmeetEnv?.debugMode;
    if (val === undefined || val === null || val === '') return false;
    return val === true || val === 'true';
};

export interface Environment {
    APP_NAME: string;
    API_URL: string;
    DEBUG_MODE: boolean;
    WELCOME_PAGE_MESSAGE: string[];
    LANGUAGE: string;
    IOS_LINK: string;
    ANDROID_LINK: string;
    LOGO_LINK: string;
    ROCKET_CHAT_API_URL: string;
    ROCKET_CHAT_TOKEN: string;
    ROCKET_CHAT_USER_ID: string;
    ROCKET_CHAT_WS_URL: string;
    CMEET_URL: string;
    CMEET_WS_URL: string;
    GST_STREAM_URL: string;
    XMPP_DOMAIN: string;
    DOMAIN: string;
    GST_STREAM_WS: string;
}

export const env: Environment = {
    APP_NAME: (window as any).config?.cmeetEnv?.appName || "",
    API_URL: (window as any).config?.cmeetEnv?.apiUrl || "",
    DEBUG_MODE: getDebugMode(),
    WELCOME_PAGE_MESSAGE: getWelcomePageMessage(),
    LANGUAGE: (window as any).config?.cmeetEnv?.language || "",
    IOS_LINK: (window as any).config?.cmeetEnv?.iosLink || "",
    ANDROID_LINK: (window as any).config?.cmeetEnv?.androidLink || "",
    LOGO_LINK: (window as any).config?.cmeetEnv?.logoLink || "",
    ROCKET_CHAT_API_URL: (window as any).config?.cmeetEnv?.rocketChatApiUrl || "",
    ROCKET_CHAT_TOKEN: (window as any).config?.cmeetEnv?.rocketChatToken || "",
    ROCKET_CHAT_USER_ID: (window as any).config?.cmeetEnv?.rocketChatUserId || "",
    ROCKET_CHAT_WS_URL: (window as any).config?.cmeetEnv?.rocketChatWsUrl || "",
    CMEET_URL: (window as any).config?.cmeetEnv?.cmeetUrl || "",
    CMEET_WS_URL: (window as any).config?.cmeetEnv?.cmeetWsUrl || "",
    GST_STREAM_URL: (window as any).config?.cmeetEnv?.gstStreamUrl || "",
    XMPP_DOMAIN: (window as any).config?.cmeetEnv?.xmppDomain || "",
    DOMAIN: (window as any).config?.cmeetEnv?.domain || "",
    GST_STREAM_WS: (window as any).config?.cmeetEnv?.gstStreamWs || ""
};