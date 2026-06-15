declare global {
    interface Window {
        config?: {
            cmeetEnv?: {
                appName?: string;
                apiUrl?: string;
                debugMode?: boolean | string;
                welcomePageMessage?: string;
                language?: string;
                iosLink?: string;
                androidLink?: string;
                logoLink?: string;
                rocketChatApiUrl?: string;
                rocketChatToken?: string;
                rocketChatUserId?: string;
                rocketChatWsUrl?: string;
                cmeetUrl?: string;
                cmeetWsUrl?: string;
                gstStreamUrl?: string;
                xmppDomain?: string;
                domain?: string;
                gstStreamWs?: string;
            }
        }
    }
}

const getWelcomePageMessage = (): string[] | null => {
    const customMessage = window.config?.cmeetEnv?.welcomePageMessage;
    if (customMessage) {
        return customMessage.split('|');
    }
    return null;
};

const getDebugMode = (): boolean | null => {
    const val = window.config?.cmeetEnv?.debugMode;
    if (val === undefined || val === null || val === '') return null;
    return val === true || val === 'true';
};

export interface Environment {
    APP_NAME: string | null;
    API_URL: string | null;
    DEBUG_MODE: boolean | null;
    WELCOME_PAGE_MESSAGE: string[] | null;
    LANGUAGE: string | null;
    IOS_LINK: string | null;
    ANDROID_LINK: string | null;
    LOGO_LINK: string | null;
    ROCKET_CHAT_API_URL: string | null;
    ROCKET_CHAT_TOKEN: string | null;
    ROCKET_CHAT_USER_ID: string | null;
    ROCKET_CHAT_WS_URL: string | null;
    CMEET_URL: string | null;
    CMEET_WS_URL: string | null;
    GST_STREAM_URL: string | null;
    XMPP_DOMAIN: string | null;
    DOMAIN: string | null;
    GST_STREAM_WS: string | null;
}

export const env: Environment = {
    APP_NAME: window.config?.cmeetEnv?.appName || null,
    API_URL: window.config?.cmeetEnv?.apiUrl || null,
    DEBUG_MODE: getDebugMode(),
    WELCOME_PAGE_MESSAGE: getWelcomePageMessage(),
    LANGUAGE: window.config?.cmeetEnv?.language || null,
    IOS_LINK: window.config?.cmeetEnv?.iosLink || null,
    ANDROID_LINK: window.config?.cmeetEnv?.androidLink || null,
    LOGO_LINK: window.config?.cmeetEnv?.logoLink || null,
    ROCKET_CHAT_API_URL: window.config?.cmeetEnv?.rocketChatApiUrl || null,
    ROCKET_CHAT_TOKEN: window.config?.cmeetEnv?.rocketChatToken || null,
    ROCKET_CHAT_USER_ID: window.config?.cmeetEnv?.rocketChatUserId || null,
    ROCKET_CHAT_WS_URL: window.config?.cmeetEnv?.rocketChatWsUrl || null,
    CMEET_URL: window.config?.cmeetEnv?.cmeetUrl || null,
    CMEET_WS_URL: window.config?.cmeetEnv?.cmeetWsUrl || null,
    GST_STREAM_URL: window.config?.cmeetEnv?.gstStreamUrl || null,
    XMPP_DOMAIN: window.config?.cmeetEnv?.xmppDomain || null,
    DOMAIN: window.config?.cmeetEnv?.domain || null,
    GST_STREAM_WS: window.config?.cmeetEnv?.gstStreamWs || null
};