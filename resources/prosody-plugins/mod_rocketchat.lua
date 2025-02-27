local http = require "net.http";
local json = require "util.json";

local rocket_chat_url = "http://10.1.6.53:3006/api/v1";

local rocket_chat_token = nil;
local rocket_chat_user_id = nil;

local function fetch_token_from_ws()
    local websocket_url = event.origin.full_jid;

    local token = websocket_url:match("token=([^&]+)");

    if token then
        module:log("info", "Token from WebSocket: %s", token);
        return token;
    end
end

local function login_to_rocketchat()
    local token = fetch_token_from_ws();

    local headers = {
        ["Content-Type"] = "application/json"
    };

    local body = {
        serviceName = "keycloak",
        accessToken = token,
        expiresIn = 36000
    };

    local request_body = json.encode(body);
    local response_body, status_code = http.request(rocket_chat_url + "/login", {
        method = "POST",
        headers = headers,
        body = request_body
    });

    if status_code == 200 then
        local response_data = json.decode(response_body);
        if response_data.status == "success" then
            rocket_chat_token = response_data.data.authToken;
            rocket_chat_user_id = response_data.data.userId;
            module:log("info", "Login RocketChat successfully!");
        else
            module:log("error", "Error login RocketChat: %s", response_body);
        end
    else
        module:log("error", "Error login RocketChat: %s", response_body);
    end
end

local function send_to_rocketchat(message, room_id)
    if not rocket_chat_token or not rocket_chat_user_id then
        module:log("error", "You do not login Rocket Chat!");
        return;
    end

    local headers = {
        ["Content-Type"] = "application/json",
        ["X-Auth-Token"] = rocket_chat_token,
        ["X-User-Id"] = rocket_chat_user_id
    };

    local body = {
        channel = "#" .. room_id,
        text = message
    };

    local request_body = json.encode(body);
    local response_body, status_code = http.request(rocket_chat_url + "/chat.postMessage", {
        method = "POST",
        headers = headers,
        body = request_body
    });

    if status_code ~= 200 then
        module:log("error", "Gửi tin nhắn thất bại: %s", response_body);
    else
        module:log("info", "Đã gửi tin nhắn thành công!");
    end
end

local function handle_message(event)
    local stanza = event.stanza;
    local body = stanza:get_child("body");

    if body then
        local message = body:get_text();
        local room_id = event.room.jid;

        send_to_rocketchat(message, room_id);
    end
end

login_to_rocketchat();

module:hook("message/bare", handle_message);
