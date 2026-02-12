local http = require "net.http";
local json = require "util.json";
local jid = require "util.jid";
local timer = require "util.timer";
local new_id = require "util.id".medium;
local NICK_NS = 'http://jabber.org/protocol/nick';
local mod_host = module.host;
local config = module:get_option("muc_participation_logger", {});
local api_url = config.api_url;
-- local api_token = config.api_token;
local timeout = config.timeout or 5;
local flush_on_leave = config.flush_on_leave ~= false;

module:log("info", "muc_participation_logger loading on %s", mod_host);

if not api_url then
    module:log("error", "muc_participation_logger: missing api_url");
    return;
end

-- Lưu thời điểm join theo occupant
-- key = room_jid .. "/" .. occupant_jid
local join_times = {};

local function get_email(event)
    local occupant = event and event.occupant;
    local origin = event and event.origin or (occupant and occupant.session);

    -- token_verification thường đặt context tại session (origin)
    local ctx = origin and origin.jitsi_meet_context_user;
    if ctx and ctx.email then
        return ctx.email, ctx;
    end

    return nil, ctx;
end

local function post_payload(payload)
    local body = json.encode(payload);
    module:log("info", "body=%s", tostring(body));
    local headers = {
        ["Content-Type"] = "application/json";
        ["Content-Length"] = tostring(#body);
    };
    -- if api_token then
    --     headers["Authorization"] = api_token;
    -- end
    http.request(api_url, {
        method = "POST",
        headers = headers,
        body = body,
        timeout = timeout,
    }, function(body, code)
        if code ~= 200 and code ~= 201 and code ~= 202 then
            module:log("warn", "muc_participation_logger: post failed code=%s body=%s", tostring(code), tostring(body));
        end
        -- module:log("info", "muc_participation_logger: post success code=%s body=%s", tostring(code), tostring(body));
    end);
end

-- Khi join: lưu timestamp
module:hook("muc-occupant-joined", function(event)
    local room = event.room;
    local occupant = event.occupant;
    local occupant_by_nick = room:get_occupant_by_nick(occupant.nick);
    local name = occupant_by_nick:get_presence():get_child_text('nick', NICK_NS);
    local email, ctx = get_email(event);
    -- module:log("info", "CTX room=%s nick=%s ctx=%s", room.jid, tostring(occupant and occupant.nick), ctx and json.encode(ctx) or "nil");
    -- module:log("info", "JOIN room=%s nick=%s email=%s", room.jid, tostring(occupant.nick), tostring(email));
    if name == "CMEET Assistant" then
        module:log("info","participant is Bot Assistant, skipping");
        return;
    end
    if name == "CMEET-BOT-RECORDING" then
        module:log("info","participant is Bot STT Recording, skipping");
        return;
    end
    if name == nil then
        module:log("info","participant is Bot Recording, skipping");
        return;
    end
    local key = room.jid .. "/" .. occupant.nick;
    module:log("info","nick == %s", key)
    if split(occupant.nick, "/")[2] == "focus" then
        module:log("info","participant is focus, skipping");
        return;
    end
    join_times[key] = {
        meetingId = split(room.jid, "@")[1],
        email = email and email,
        isAnonymousUser = email == nil,
        participantId = split(occupant.nick, "/")[2],
        participantName = tostring(name and  name ),
        join_ts = os.time(),
        session_id = new_id(); -- để phân biệt lượt tham gia
    };
    post_payload({
        meetingId = split(room.jid, "@")[1],
        email = email and email,
        isAnonymousUser = email == nil,
        participantId = split(occupant.nick, "/")[2],
        participantName = tostring(name  and  name),
        joinTime = os.time()
    });
end);

-- Khi rời: tính duration và gửi
module:hook("muc-occupant-left", function(event)
    local room = event.room;
    local occupant = event.occupant;
    local key = room.jid .. "/" .. occupant.nick;
    local entry = join_times[key];
    if not entry then
        module:log("info", "LEAVE room=%s nick=%s entry_not_found", room.jid, tostring(occupant and occupant.nick));
        return;
    end
    -- module:log("info", "LEAVE room=%s nick=%s email=%s", room.jid, tostring(occupant.nick), tostring(entry.email));
    join_times[key] = nil;
    if not flush_on_leave then return; end

    local leave_ts = os.time();
    local duration = leave_ts - entry.join_ts;
    post_payload({
        meetingId = split(room.jid, "@")[1],
        email = entry.email and entry.email,
        isAnonymousUser = entry.email == nil,
        participantId = entry.participantId,
        participantName = entry.participantName,
        joinTime = entry.join_ts,
        leaveTime = leave_ts
    });
end);
-- Hàm split: tách chuỗi
function split(str, sep)
    local result = {}
    sep = sep or "%s"  -- mặc định tách theo space
    for part in string.gmatch(str, "([^" .. sep .. "]+)") do
        table.insert(result, part)
    end
    return result
end
-- Tùy chọn: định kỳ flush những session còn treo (network drop)
local function flush_stale()
    local now = os.time();
    local stale_after = 6 * 3600; -- 6h
    for key, entry in pairs(join_times) do
        if now - entry.join_ts > stale_after then
            post_payload({
                meetingId = entry.meetingId,
                email = entry.email and entry.email,
                isAnonymousUser = entry.isAnonymousUser,
                participantId = entry.participantId,
                participantName = entry.participantName,
                joinTime = entry.join_ts,
                leaveTime = now,
            });
            join_times[key] = nil;
        end
    end
    return 300; -- chạy lại sau 5 phút
end

timer.add_task(300, flush_stale);