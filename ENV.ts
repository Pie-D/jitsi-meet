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
    APP_NAME: "C-MEET",
    API_URL: "https://meet.cmcati.vn/",
    DEBUG_MODE: false,
    WELCOME_PAGE_MESSAGE: [
        "C-Meet phần mềm họp online xin chào !",
        "Hệ thống an toàn và bảo mật",
        "Trải nghiệm tốc độ và chính xác",
        "Mang đến tiện lợi và thân thiện",
    ],
    LANGUAGE: "vi",
    IOS_LINK: "https://apps.apple.com/us/app/c-meet/id6599835526",
    ANDROID_LINK: "https://play.google.com/store/apps/details?id=com.cmcati.cmeetglobal",
    LOGO_LINK: "https://sec.cmcati.vn/c-meet",
    ROCKET_CHAT_API_URL: "https://sec.cmcati.vn/rocket-chat/api/v1",
    ROCKET_CHAT_TOKEN: "NYP7Dyr5VWVNwl0GQ-WMuY27JY8j0DKbTLdqfYWqbyh",
    ROCKET_CHAT_USER_ID: "DAcDiHYEn7cLqyBoB",
    ROCKET_CHAT_WS_URL: "wss://sec.cmcati.vn/rocket-chat/websocket",
    CMEET_URL: "https://sec.cmcati.vn/cmeet-server-manager",
    CMEET_WS_URL: "https://sec.cmcati.vn/cmeet-server-socket",
    GST_STREAM_URL: "https://meet.cmcati.vn/api/gst-meet/whip-connect",
    XMPP_DOMAIN: "meet.jitsi",
    DOMAIN: "meet.cmcati.vn",
    GST_STREAM_WS: "https://meet.cmcati.vn/ws",
    // XMPP_DOMAIN: "xmpp.meet.jitsi",
};