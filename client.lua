-- =====================================================================
-- G-CyberRPcore - Native REDengine Lua Client Controller
-- Built for CyberMP (Cyberpunk 2077 Roleplay Framework)
-- Directly hooks into REDengine native systems via Cyber Engine Tweaks LuaVM
-- =====================================================================

print("[G-CyberRPcore-Lua] Native REDengine Subsystem Initializing...")

-- REDengine Stat Pool & Stat Type Constants (Official CyberMP Spec)
local HEALTH_STAT_POOL_TYPE = 17
local HEALTH_STAT_TYPE = 787
local ADDITIVE_MODIFIER_TYPE = 0
local SPAWN_HEALTH = 300.0

-- Default Spawn: Megabuilding H10 (Watson, Little China)
local DEFAULT_SPAWN = { -1392.637, 1271.536, 123.082, 1.0 }

-- Coordinate Presets for Quick Teleport
local DISTRICT_PRESETS = {
    corpo_plaza      = { -210.0, -580.0, 42.0 },
    megabuilding_h10 = { -1392.637, 1271.536, 123.082 },
    afterlife        = { -1280.0, 1150.0, 22.0 },
    pacifica_pier    = { -2200.0, -1850.0, 15.0 },
    santo_domingo    = { 450.0, -1200.0, 30.0 },
    badlands_camp    = { 1800.0, -900.0, 45.0 },
    arasaka_roof     = { -150.0, -600.0, 210.0 }
}

-- =====================================================================
-- 1. Native Health Initialization (Prevents Flatline on Spawn)
-- =====================================================================

local function setHealth(value)
    local success, err = pcall(function()
        local player = Game.GetPlayer()
        if not player then return end
        local playerGameId = player:GetEntityID()
        local statPoolsSystem = Game.GetStatPoolsSystem()
        if statPoolsSystem then
            statPoolsSystem:RequestSettingStatPoolValueIgnoreChangeMode(
                playerGameId,
                HEALTH_STAT_POOL_TYPE,
                value,
                nil,
                false
            )
        end
    end)
    if not success then
        print("[G-CyberRPcore-Lua] setHealth warning: " .. tostring(err))
    end
end

local function setMaxHealth(value)
    local success, err = pcall(function()
        local player = Game.GetPlayer()
        if not player then return end
        local playerGameId = player:GetEntityID()
        local statsSystem = Game.GetStatsSystem()
        if statsSystem then
            statsSystem:RemoveAllModifiers(playerGameId, HEALTH_STAT_TYPE, true)
            local modifier = NewObject('gameConstantStatModifierData_Deprecated')
            if modifier then
                modifier.statType = HEALTH_STAT_TYPE
                modifier.modifierType = ADDITIVE_MODIFIER_TYPE
                modifier.value = value
                statsSystem:AddModifier(playerGameId, modifier)
            end
        end
        local statPoolsSystem = Game.GetStatPoolsSystem()
        if statPoolsSystem then
            statPoolsSystem:RequestSettingStatPoolValueIgnoreChangeMode(
                playerGameId,
                HEALTH_STAT_POOL_TYPE,
                value,
                nil,
                true
            )
        end
    end)
    if not success then
        print("[G-CyberRPcore-Lua] setMaxHealth warning: " .. tostring(err))
    end
end

-- =====================================================================
-- 2. Native Player Spawn Routine
-- =====================================================================

local function spawnPlayerNative(x, y, z, yaw)
    print(string.format("[G-CyberRPcore-Lua] Spawning player puppet at (%.2f, %.2f, %.2f, yaw: %.2f)...", x, y, z, yaw or 1.0))
    setMaxHealth(SPAWN_HEALTH)
    setHealth(SPAWN_HEALTH)
    
    if mp and mp.client and mp.client.spawnPlayer then
        mp.client.spawnPlayer(x, y, z, yaw or 1.0)
    end
end

-- =====================================================================
-- 3. Engine Lifecycle Hooks (onInit & onGameLoaded)
-- =====================================================================

if mp and mp.registerGameState then
    -- Stage: onInit
    mp.registerGameState("onInit", function()
        print("[G-CyberRPcore-Lua] onInit: Engine native classes bound and verified.")
    end)

    -- Stage: onGameLoaded (World Ready)
    mp.registerGameState("onGameLoaded", function()
        print("[G-CyberRPcore-Lua] onGameLoaded: World loaded! Executing native spawn at Megabuilding H10...")
        spawnPlayerNative(table.unpack(DEFAULT_SPAWN))
    end)
end

-- =====================================================================
-- 4. Native F8 Console Commands (Native Lua Engine Registry)
-- =====================================================================

if mp and mp.commands and mp.commands.add then
    -- Command: spawn
    mp.commands.add("spawn", function()
        print("[G-CyberRPcore-Lua] Executing manual spawn command...")
        spawnPlayerNative(table.unpack(DEFAULT_SPAWN))
    end)

    -- Command: admin / hub / adminmenu
    mp.commands.add("admin", function()
        print("[G-CyberRPcore-Lua] Admin command invoked from F8 console.")
        if mp.events and mp.events.emitServer then
            mp.events.emitServer("g-cyber:admin:toggleAdminMenu")
        end
    end)

    mp.commands.add("hub", function()
        print("[G-CyberRPcore-Lua] Hub command invoked from F8 console.")
        if mp.events and mp.events.emitServer then
            mp.events.emitServer("g-cyber:admin:toggleAdminMenu")
        end
    end)

    mp.commands.add("adminmenu", function()
        if mp.events and mp.events.emitServer then
            mp.events.emitServer("g-cyber:admin:toggleAdminMenu")
        end
    end)

    -- Command: ui / closeui (Input Focus)
    mp.commands.add("ui", function()
        if mp.cef and mp.cef.setFocus then
            mp.cef.setFocus(true, true)
            print("[G-CyberRPcore-Lua] CEF Input Focus: ACTIVE")
        end
    end)

    mp.commands.add("closeui", function()
        if mp.cef and mp.cef.setFocus then
            mp.cef.setFocus(false, false)
            print("[G-CyberRPcore-Lua] CEF Input Focus: RELEASED")
        end
    end)

    -- Command: tp [district / x y z]
    mp.commands.add("tp", function(p1, p2)
        local args = (type(p1) == "table") and p1 or ((type(p2) == "table") and p2 or {})
        if #args >= 3 then
            local x = tonumber(args[1])
            local y = tonumber(args[2])
            local z = tonumber(args[3])
            if x and y and z then
                spawnPlayerNative(x, y, z, 1.0)
            end
        elseif #args == 1 then
            local key = tostring(args[1]):lower()
            if DISTRICT_PRESETS[key] then
                local c = DISTRICT_PRESETS[key]
                spawnPlayerNative(c[1], c[2], c[3], 1.0)
            end
        end
    end)

    -- Command: loading
    mp.commands.add("loading", function()
        if mp.cef and mp.cef.setUrl then
            mp.cef.setUrl("./ui/index.html")
            mp.cef.setFocus(true, true)
        end
    end)
end

print("[G-CyberRPcore-Lua] Native REDengine Subsystem Ready.")
