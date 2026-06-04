
-- Set this parameter in Prosody config if you dont want cascading updates for
-- affiliation. Cascading updates are needed when the authentication is enabled
-- in Jicofo.
local DISABLE_CASCADING_SET = module:get_option_boolean(
    "disable_cascading_set", false
)
-- mod_token_affiliation.lua
--
-- Grants owner affiliation (and thus moderator role) to MUC occupants whose
-- JWT contains moderator/affiliation claims, and member affiliation to all
-- other authenticated occupants.
--
-- JWT claims inspected (context.user.*):
--   affiliation == "owner" | "moderator" | "teacher"  →  owner
--   moderator   == true | "true"                       →  owner
--   Authenticated user with none of the above          →  member
--
-- The affiliation is written to the room's affiliation list inside
-- muc-occupant-pre-join (before the join completes), so the very first
-- presence broadcast already carries the correct affiliation and role.
-- No filtering or second hook required.
--
-- Originally imported from:
--   https://github.com/jitsi-contrib/prosody-plugins/tree/main/token_affiliation

local LOGLEVEL = module:get_option_string("token_affiliation_log_level", "debug")

local util = module:require 'util';
local is_admin = util.is_admin;
local is_healthcheck_room = util.is_healthcheck_room
local timer = require "util.timer"
module:log(LOGLEVEL, "loaded")

module:hook("muc-occupant-joined", function (event)
    local room, occupant, session = event.room, event.occupant, event.origin

    if is_healthcheck_room(room.jid) or is_admin(occupant.bare_jid) then
        module:log(LOGLEVEL, "skip affiliation, %s", occupant.jid)
        return
    end

    if not session.auth_token then
        module:log(LOGLEVEL, "skip affiliation, no token")
        return
    end

    if session.token_affiliation_checked then
        module:log(LOGLEVEL, "skip affiliation, already checked")
        return
    end

    local affiliation = "member"
    local context_user = session.jitsi_meet_context_user

    if context_user then
        if context_user["affiliation"] == "owner" then
            affiliation = "owner"
        elseif context_user["affiliation"] == "moderator" then
            affiliation = "owner"
        elseif context_user["affiliation"] == "teacher" then
            affiliation = "owner"
        elseif context_user["moderator"] == "true" then
            affiliation = "owner"
        elseif context_user["moderator"] == true then
            affiliation = "owner"
        end
    end

    local i = 0
    local function setAffiliation()
        room:set_affiliation(true, occupant.bare_jid, affiliation)

        if DISABLE_CASCADING_SET then return end
        if i > 8 then return end

        i = i + 1
        timer.add_task(0.2 * i, setAffiliation)
    end
    setAffiliation()
    session.token_affiliation_checked = true

    module:log(LOGLEVEL, "affiliation: %s", affiliation)
end)
