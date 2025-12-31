local http = require "net.http";
local json = require "util.json";
local jid = require "util.jid";
local timer = require "util.timer";
local new_id = require "util.id".medium;

local mod_host = module.host;
local config = module:get_option("muc_participation_logger", {});
local api_url = config.api_url;
local api_token = config.api_token;
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
    local headers = {
        ["Content-Type"] = "application/json";
        ["Content-Length"] = tostring(#body);
    };
    if api_token then
        headers["Authorization"] = api_token;
    end
    http.request(api_url, {
        method = "POST",
        headers = headers,
        body = body,
        timeout = timeout,
    }, function(body, code)
        if code ~= 200 and code ~= 201 and code ~= 202 then
            module:log("warn", "muc_participation_logger: post failed code=%s body=%s", tostring(code), tostring(body));
        end
        module:log("info", "muc_participation_logger: post success code=%s body=%s", tostring(code), tostring(body));
    end);
end

-- Khi join: lưu timestamp
module:hook("muc-occupant-joined", function(event)
    local room = event.room;
    local occupant = event.occupant;
    local email, ctx = get_email(event);
    module:log("info", "CTX room=%s nick=%s ctx=%s", room.jid, tostring(occupant and occupant.nick), ctx and json.encode(ctx) or "nil");
    if not email then
        module:log("info", "JOIN room=%s nick=%s email=nil (skip)", room.jid, tostring(occupant and occupant.nick));
        return;
    end
    module:log("info", "JOIN room=%s nick=%s email=%s", room.jid, tostring(occupant.nick), tostring(email));

    local key = room.jid .. "/" .. occupant.nick;
    join_times[key] = {
        email = email,
        room = room.jid,
        join_ts = os.time(),
        session_id = new_id(); -- để phân biệt lượt tham gia
    };
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
    module:log("info", "LEAVE room=%s nick=%s email=%s", room.jid, tostring(occupant.nick), tostring(entry.email));
    join_times[key] = nil;
    if not flush_on_leave then return; end

    local leave_ts = os.time();
    local duration = leave_ts - entry.join_ts;
    post_payload({
        room = entry.room,
        email = entry.email,
        joinTs = entry.join_ts,
        leaveTs = leave_ts,
        duration = duration,
        sessionId = entry.session_id
    });
end);

-- Tùy chọn: định kỳ flush những session còn treo (network drop)
local function flush_stale()
    local now = os.time();
    local stale_after = 6 * 3600; -- 6h
    for key, entry in pairs(join_times) do
        if now - entry.join_ts > stale_after then
            post_payload({
                room = entry.room,
                email = entry.email,
                joinTs = entry.join_ts,
                leaveTs = now,
                duration = now - entry.join_ts,
                sessionId = entry.session_id,
                stale = true
            });
            join_times[key] = nil;
        end
    end
    return 300; -- chạy lại sau 5 phút
end

timer.add_task(300, flush_stale);