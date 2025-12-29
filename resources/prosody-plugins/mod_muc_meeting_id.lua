local jid = require 'util.jid';
local json = require 'cjson.safe';
local queue = require "util.queue";
local uuid_gen = require "util.uuid".generate;
local main_util = module:require "util";
local is_admin = main_util.is_admin;
local ends_with = main_util.ends_with;
local get_room_from_jid = main_util.get_room_from_jid;
local is_healthcheck_room = main_util.is_healthcheck_room;
local internal_room_jid_match_rewrite = main_util.internal_room_jid_match_rewrite;
local presence_check_status = main_util.presence_check_status;
local extract_subdomain = main_util.extract_subdomain;
local util = module:require 'util';
local is_transcriber = util.is_transcriber;

local QUEUE_MAX_SIZE = 500;
local timer = require "util.timer";

-- Bật log để xem thông tin origin/context_user khi join (cấu hình: cmeet_owner_log_context = true).
local log_context_enabled = module:get_option_boolean('cmeet_owner_log_context', false);

module:depends("jitsi_permissions");

-- Lấy định danh owner ổn định từ token (ưu tiên email_owner, sau đó email trong context.user),
-- fallback về bare_jid/prefix nếu không có. Có log origin nếu bật cmeet_owner_log_context.
local function get_owner_key(event)
    local origin = event.origin;
    local occupant = event.occupant;
    local context_user = origin and origin.jitsi_meet_context_user;
    local granted_user_email = origin and origin.granted_jitsi_meet_context_user_email;
    local token_user_email_owner = context_user and (context_user.email_owner or context_user.owner_email);
    local token_user_email = context_user and (context_user.email or context_user.mail);

    if log_context_enabled and origin then
        module:log('info', '[OWNER_DEBUG][get_owner_key] email_owner=%s email=%s id=%s name=%s affiliation=%s moderator=%s granted_email=%s granted_user_id=%s granted_group=%s',
            tostring(token_user_email_owner),
            tostring(token_user_email),
            tostring(context_user and context_user.id),
            tostring(context_user and context_user.name),
            tostring(context_user and context_user.affiliation),
            tostring(context_user and context_user.moderator),
            tostring(granted_user_email),
            tostring(origin.granted_jitsi_meet_context_user_id),
            tostring(origin.granted_jitsi_meet_context_group));
    end

    local owner_email = token_user_email_owner or token_user_email or granted_user_email;

    if owner_email then
        return tostring(owner_email);
    end

    -- Fallback: dùng prefix của bare_jid (giữ hành vi cũ)
    local jid_prefix = string.match(occupant.bare_jid, "^(.-)%-");

    return jid_prefix or occupant.bare_jid;
end

-- Common module for all logic that can be loaded under the conference muc component.
--
-- This module:
-- a) Generates a unique meetingId, attaches it to the room and adds it to all disco info form data
--    (when room is queried or in the initial room owner config).
-- b) Updates user region (obtain it from the incoming http headers) in the occupant's presence on pre-join.
-- c) Avoids any participant joining the room in the interval between creating the room and jicofo entering the room.
-- d) Removes any nick that maybe set to messages being sent to the room.
-- e) Fires event for received endpoint messages (optimization to decode them once).

-- Hook to assign meetingId for new rooms
module:hook("muc-room-created", function(event)
    local room = event.room;

    local stanza = event.stanza;
    if stanza == nil then
	module:log("warn", "stanze is nil");
    else
	module:log("info", "stanzae is not nil");
    end

    if is_healthcheck_room(room.jid) then
        return;
    end

    room._data.meetingId = uuid_gen();

    module:log("debug", "Created meetingId:%s for %s",
        room._data.meetingId, room.jid);
        for key,value in pairs(room) do
            if type(value) == "table" then
                module:log("info", "Key: %s -> Table (nested)", key)
                for k, v in pairs(value) do
                    module:log("info", "  Sub-key: %s -> Value: %s", k, tostring(v))
                end
            else
                module:log("info", "Key: %s -> Value: %s", key, tostring(value))
            end
        end
        for key,value in pairs(stanza) do
            if type(value) == "table" then
                module:log("info", "Key: %s -> Table (nested)", key)
                for k, v in pairs(value) do
                    module:log("info", "  Sub-key: %s -> Value: %s", k, tostring(v))
                end
            else
                module:log("info", "Key: %s -> Value: %s", key, tostring(value))
            end
        end
        for key, value in pairs(event) do
            if type(value) == "table" then
                module:log("info", "Key: %s -> Table (nested)", key)
                for k, v in pairs(value) do
                    module:log("info", "  Sub-key: %s -> Value: %s", k, tostring(v))
                end
            else
                module:log("info", "Key: %s -> Value: %s", key, tostring(value))
            end
        end
    end);
-- Hook set owner tạm thời cho người đầu tiên (chỉ khi chưa có logic JWT/affiliation).
-- Lưu ý: room._data.owner sẽ có thể được cập nhật lại ở hook "muc-occupant-joined"
-- khi chúng ta xác thực rằng occupant có affiliation = owner (được cấp từ server/JWT).
    module:hook("muc-occupant-pre-join", function (event)
        local room, occupant = event.room, event.occupant;
        module:log('debug', 'tqd - pre-join');
        if is_healthcheck_room(room.jid) or is_admin(occupant.bare_jid) then
            return;
        end
        module:log('debug', 'tqd - %s', occupant.bare_jid);
        if not room._data.owner then
            local new_owner = get_owner_key(event);
            room._data.owner = new_owner;
            module:log('info', '[ROOM_OWNER_SET] PRE-JOIN: Set initial room owner = %s (from occupant: %s, room: %s)',
                new_owner, occupant.bare_jid, room.jid);
        else
            module:log('debug', '[ROOM_OWNER_SET] PRE-JOIN: Room owner already exists = %s (occupant: %s, room: %s)', 
                room._data.owner, occupant.bare_jid, room.jid);
        end
    end, 1); -- Priority 1 để chạy trước hook priority 8

-- Tắt hoàn toàn cơ chế override/reassign owner.
local allow_owner_reassign = false;

-- Hook để đồng bộ hoá chủ phòng dựa trên affiliation thực tế (owner/admin) sau khi join.
-- 1) Nếu occupant hiện tại có affiliation = owner/admin:
--    - Nếu room._data.owner chưa có: set theo occupant này.
--    - Nếu room._data.owner đã có và allow_owner_reassign = true: ghi đè bằng occupant này.
-- 2) Đồng thời retry set affiliation = owner để chống race với các module khác
--    (mod_token_affiliation, jitsi_permissions, ...).
    module:hook("muc-occupant-joined", function(event)
        local room, occupant = event.room, event.occupant;
        if is_healthcheck_room(room.jid) or is_admin(occupant.bare_jid) then
            return;
        end

    local owner_key = get_owner_key(event);

    -- 1) Kiểm tra affiliation hiện tại của occupant
    local current_aff = room:get_affiliation(occupant.bare_jid);

    -- Nếu occupant đã có affiliation owner(do JWT hoặc backend cấp)
        if current_aff == "owner"  then
        module:log('info', '[ROOM_OWNER_CHECK] Occupant %s has affiliation = %s (room: %s)', 
            occupant.bare_jid, current_aff, room.jid);
        module:log('allow_owner_reassign: ', allow_owner_reassign);
        -- 1.a) Chính sách cập nhật room._data.owner để client nhận qua disco info
        if not room._data.owner then
            room._data.owner = owner_key;
            module:log('info', '[ROOM_OWNER_SET] JOINED (first owner): Set room owner = %s (occupant: %s, affiliation: %s, room: %s)', 
                owner_key, occupant.bare_jid, current_aff, room.jid);
        end

        -- 1.b) Đánh dấu token_affiliation_checked để tránh race với mod_token_affiliation
            if event.origin then
                event.origin.token_affiliation_checked = true;
            end

        -- 1.c) Retry set affiliation=owner để bảo đảm quyền được áp dụng, tránh xung đột thứ tự hook
            local i = 0;
        local function ensure_owner_affiliation()
            local aff = room:get_affiliation(occupant.bare_jid);
            if aff ~= 'owner' then
                module:log('info', 'Ensuring owner affiliation (retry %d) for %s', i, occupant.bare_jid);
                room:set_affiliation(true, occupant.bare_jid, 'owner');
                end

            if aff == 'owner' or i > 8 then
                    return;
                end

                i = i + 1;
            timer.add_task(0.2 * i, ensure_owner_affiliation);
        end

        ensure_owner_affiliation();
        return;
    end

    -- 2) Nếu occupant CHƯA có affiliation owner/admin
    --    2.a) Nếu trùng với room._data.owner tạm thời → retry promote lên owner như cũ.
    --    2.b) Nếu KHÔNG trùng nhưng cho phép reassign → retry theo dõi affiliation;
    --         khi affiliation chuyển thành owner/admin thì cập nhật room._data.owner (reassign) và dừng retry.
    if room._data.owner and owner_key == room._data.owner then
        if event.origin then
            event.origin.token_affiliation_checked = true;
        end

        local i = 0;
        local function promote_owner()
            local aff = room:get_affiliation(occupant.bare_jid);
            if aff ~= 'owner' then
                module:log('info', 'Promoting pre-join owner (retry %d) for %s', i, occupant.bare_jid);
                room:set_affiliation(true, occupant.bare_jid, 'owner');
            end
            if aff == 'owner' or i > 8 then
                return;
            end
            i = i + 1;
            timer.add_task(0.2 * i, promote_owner);
        end
        promote_owner();
        end
    end, 5);

-- Returns the meeting config Id form data.
function getMeetingIdConfig(room)
    return {
        name = "muc#roominfo_meetingId";
        type = "text-single";
        label = "The meeting unique id.";
        value = room._data.meetingId or "";
    };
end

function getMeetingRoomOwner(room)
    local room_owner = room._data.owner or "Unknown";
    module:log("debug", "tqd room owner: %s", room_owner);
    return {
	name = "muc#roominfo_roomOwner";
	type = "text-single";
	lable = "The room owner id.";
	value = room_owner;
    };
end
-- add meeting Id to the disco info requests to the room
module:hook("muc-disco#info", function(event)
    table.insert(event.form, getMeetingIdConfig(event.room));
    table.insert(event.form, getMeetingRoomOwner(event.room))
end);

-- add the meeting Id in the default config we return to jicofo
module:hook("muc-config-form", function(event)
    table.insert(event.form, getMeetingIdConfig(event.room));
    table.insert(event.form, getMeetingRoomOwner(event.room));
end, 91-3);

-- disabled few options for room config, to not mess with visitor logic
module:hook("muc-config-submitted/muc#roomconfig_moderatedroom", function()
    return true;
end, 99);
module:hook("muc-config-submitted/muc#roomconfig_presencebroadcast", function()
    return true;
end, 99);
module:hook("muc-config-submitted/muc#roominfo_meetingId", function(event)
    -- we allow jicofo to overwrite the meetingId
    if is_admin(event.actor) then
        event.room._data.meetingId = event.value;
        return;
    end

    return true;
end, 99);
module:hook('muc-broadcast-presence', function (event)
    local actor, occupant, room, x = event.actor, event.occupant, event.room, event.x;
    if presence_check_status(x, '307') then
        -- make sure we update and affiliation for kicked users
        room:set_affiliation(actor, occupant.bare_jid, 'none');
    end
end);

local function process_region(session, stanza)
    if not session.user_region then
        return;
    end

    local region = stanza:get_child_text('jitsi_participant_region');
    if region then
        return;
    end

    stanza:tag('jitsi_participant_region'):text(session.user_region):up();
end

--- Avoids any participant joining the room in the interval between creating the room
--- and jicofo entering the room
module:hook('muc-occupant-pre-join', function (event)
    local occupant, room, stanza = event.occupant, event.room, event.stanza;

    local is_health_room = is_healthcheck_room(room.jid);
    -- check for region
    if not is_admin(occupant.bare_jid) and not is_health_room then
        process_region(event.origin, stanza);
    end

    -- we skip processing only if jicofo_lock is set to false
    if room._data.jicofo_lock == false or is_health_room then
        return;
    end

    if ends_with(occupant.nick, '/focus') then
        module:fire_event('jicofo-unlock-room', { room = room; });
    else
        room._data.jicofo_lock = true;
        if not room.pre_join_queue then
            room.pre_join_queue = queue.new(QUEUE_MAX_SIZE);
        end

        if not room.pre_join_queue:push(event) then
            module:log('error', 'Error enqueuing occupant event for: %s', occupant.nick);
            return true;
        end
        module:log('debug', 'Occupant pushed to prejoin queue %s', occupant.nick);

        -- stop processing
        return true;
    end
end, 8); -- just after the rate limit

function handle_jicofo_unlock(event)
    local room = event.room;

    room._data.jicofo_lock = false;
    if not room.pre_join_queue then
        return;
    end

    -- and now let's handle all pre_join_queue events
    for _, ev in room.pre_join_queue:items() do
        -- if the connection was closed while waiting in the queue, ignore
        if ev.origin.conn then
            module:log('debug', 'Occupant processed from queue %s', ev.occupant.nick);
            room:handle_normal_presence(ev.origin, ev.stanza);
        end
    end
    room.pre_join_queue = nil;
end

module:hook('jicofo-unlock-room', handle_jicofo_unlock);

-- make sure we remove nick if someone is sending it with a message to protect
-- forgery of display name
module:hook("muc-occupant-groupchat", function(event)
    event.stanza:remove_children('nick', 'http://jabber.org/protocol/nick');
end, 45); -- prosody check is prio 50, we want to run after it

local function filterTranscriptionResult(event)
    local stanza = event.stanza;

    if stanza.attr.type ~= 'groupchat' then
        return nil;
    end

    -- we are interested in all messages without a body
    local body = stanza:get_child('body')
    if body then
        return;
    end

    local room = get_room_from_jid(stanza.attr.to);
    if not room then
        module:log('warn', 'No room found found for %s', stanza.attr.to);
        return;
    end

    local occupant_jid = stanza.attr.from;
    local occupant = room:get_occupant_by_real_jid(occupant_jid);
    if not occupant then
        module:log("error", "Occupant sending msg %s was not found in room %s", occupant_jid, room.jid)
        return;
    end

    local json_message = stanza:get_child_text('json-message', 'http://jitsi.org/jitmeet')
        or stanza:get_child_text('json-message');
    if not json_message then
        return;
    end

    local msg_obj, error = json.decode(json_message);

    if error then
        module:log('error', 'Error decoding data error:%s Sender: %s to:%s', error, stanza.attr.from, stanza.attr.to);
        return true;
    end

    if msg_obj.type == 'transcription-result' then
        if not is_transcriber(stanza.attr.from) then
            module:log('warn', 'Filtering transcription-result message from non-transcriber: %s', stanza.attr.from);
            -- Do not fire the event, and do not forward the message
            return true
        end
        if msg_obj.is_interim then
            -- Do not fire the event, but forward the message
            return
        end
    end

    if msg_obj.transcript ~= nil then
        local transcription = msg_obj;

        -- in case of the string matching optimization above failed
        if transcription.is_interim then
            return;
        end

        -- TODO what if we have multiple alternative transcriptions not just 1
        local text_message = transcription.transcript[1].text;
        --do not send empty messages
        if text_message == '' then
            return;
        end

        local user_id = transcription.participant.id;
        local who = room:get_occupant_by_nick(jid.bare(room.jid)..'/'..user_id);

        transcription.jid = who and who.jid;
        transcription.session_id = room._data.meetingId;

        local tenant, conference_name, id = extract_subdomain(jid.node(room.jid));
        if tenant then
            transcription.fqn = tenant..'/'..conference_name;
        else
            transcription.fqn = conference_name;
        end
        transcription.customer_id = id;

        return module:fire_event('jitsi-transcript-received', {
            room = room, occupant = occupant, transcription = transcription, stanza = stanza });
    end

    return module:fire_event('jitsi-endpoint-message-received', {
        room = room, occupant = occupant, message = msg_obj,
        origin = event.origin,
        stanza = stanza, raw_message = json_message });
end

module:hook('message/bare', filterTranscriptionResult);
module:hook('jitsi-visitor-groupchat-pre-route', filterTranscriptionResult);
