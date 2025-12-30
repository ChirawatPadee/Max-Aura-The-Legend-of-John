/*:
 * @target MZ
 * @plugindesc Automatically scales Enemy Stats and Rewards based on the Player's Party Level.
 * @author Jules
 *
 * @help
 * ============================================================================
 * Jules_EnemyScaling
 * ============================================================================
 *
 * This plugin dynamically adjusts enemy parameters (HP, ATK, DEF, etc.) and
 * rewards (EXP, Gold) based on the current level of the player's party.
 *
 * This allows you to use "Level 1" stats in the database as a base, and
 * have them naturally grow stronger as the game progresses.
 *
 * ============================================================================
 * How the Formula Works
 * ============================================================================
 *
 * The formula used is:
 * New Stat = Base Stat * (1 + ((PartyLevel - 1) * (Percent / 100)))
 *
 * Example:
 * - You set "ATK Scaling %" to 10.
 * - The Party Level is 5.
 * - The Enemy's Database ATK is 20.
 *
 * Math:
 * Multiplier = 1 + ((5 - 1) * 0.10)  => 1 + 0.4 => 1.4
 * New ATK = 20 * 1.4 = 28.
 *
 * ============================================================================
 * Notetags
 * ============================================================================
 *
 * <NoScale>
 * Place this in an Enemy's Note box in the Database. This enemy will NOT
 * be affected by this plugin. Useful for bosses or gimmick enemies.
 *
 * ============================================================================
 * Parameters
 * ============================================================================
 *
 * @param General Settings
 *
 * @param scalingMode
 * @text Scaling Mode
 * @parent General Settings
 * @type select
 * @option Average Party Level
 * @value average
 * @option Highest Actor Level
 * @value highest
 * @desc Which level should enemies scale to?
 * @default average
 *
 * @param enabledSwitch
 * @text Active Switch ID
 * @parent General Settings
 * @type switch
 * @desc If set, scaling only happens when this Switch is ON. 0 = Always Active.
 * @default 0
 *
 * @param Stat Scaling Percentages
 * @desc Percentage increase per level (e.g., 10 means +10% stats per level).
 *
 * @param scaleHP
 * @text Max HP %
 * @parent Stat Scaling Percentages
 * @type number
 * @decimals 1
 * @default 10.0
 *
 * @param scaleMP
 * @text Max MP %
 * @parent Stat Scaling Percentages
 * @type number
 * @decimals 1
 * @default 5.0
 *
 * @param scaleATK
 * @text Attack %
 * @parent Stat Scaling Percentages
 * @type number
 * @decimals 1
 * @default 5.0
 *
 * @param scaleDEF
 * @text Defense %
 * @parent Stat Scaling Percentages
 * @type number
 * @decimals 1
 * @default 5.0
 *
 * @param scaleMAT
 * @text M. Attack %
 * @parent Stat Scaling Percentages
 * @type number
 * @decimals 1
 * @default 5.0
 *
 * @param scaleMDF
 * @text M. Defense %
 * @parent Stat Scaling Percentages
 * @type number
 * @decimals 1
 * @default 5.0
 *
 * @param scaleAGI
 * @text Agility %
 * @parent Stat Scaling Percentages
 * @type number
 * @decimals 1
 * @default 3.0
 *
 * @param scaleLUK
 * @text Luck %
 * @parent Stat Scaling Percentages
 * @type number
 * @decimals 1
 * @default 1.0
 *
 * @param Reward Scaling
 *
 * @param scaleEXP
 * @text EXP Reward %
 * @parent Reward Scaling
 * @type number
 * @decimals 1
 * @default 10.0
 *
 * @param scaleGold
 * @text Gold Reward %
 * @parent Reward Scaling
 * @type number
 * @decimals 1
 * @default 10.0
 *
 */

(() => {
    "use strict";

    const PLUGIN_NAME = "Jules_EnemyScaling";
    const Parameters = PluginManager.parameters(PLUGIN_NAME);

    // --- Configuration Parsing ---
    const MODE = Parameters["scalingMode"] || "average";
    const SWITCH_ID = Number(Parameters["enabledSwitch"]) || 0;

    const RATES = [
        Number(Parameters["scaleHP"]) || 0,  // 0: MHP
        Number(Parameters["scaleMP"]) || 0,  // 1: MMP
        Number(Parameters["scaleATK"]) || 0, // 2: ATK
        Number(Parameters["scaleDEF"]) || 0, // 3: DEF
        Number(Parameters["scaleMAT"]) || 0, // 4: MAT
        Number(Parameters["scaleMDF"]) || 0, // 5: MDF
        Number(Parameters["scaleAGI"]) || 0, // 6: AGI
        Number(Parameters["scaleLUK"]) || 0  // 7: LUK
    ];

    const RATE_EXP = Number(Parameters["scaleEXP"]) || 0;
    const RATE_GOLD = Number(Parameters["scaleGold"]) || 0;

    // --- Helper Functions ---

    /**
     * Calculates the reference level based on the current party.
     */
    const getPartyReferenceLevel = () => {
        const members = $gameParty.battleMembers();
        if (members.length === 0) return 1;

        if (MODE === "highest") {
            // Find the highest level among active battle members
            return Math.max(...members.map(actor => actor.level));
        } else {
            // Calculate average level
            const total = members.reduce((sum, actor) => sum + actor.level, 0);
            return Math.floor(total / members.length);
        }
    };

    /**
     * Checks if scaling is allowed globally and for this specific enemy.
     */
    const isScalingAllowed = (enemyData) => {
        // Check Global Switch
        if (SWITCH_ID > 0 && !$gameSwitches.value(SWITCH_ID)) {
            return false;
        }
        // Check Notetag <NoScale>
        if (enemyData.meta && enemyData.meta.NoScale) {
            return false;
        }
        return true;
    };

    /**
     * Generic scaling calculator.
     * @param {number} baseValue - The database value.
     * @param {number} level - The party level.
     * @param {number} percent - The scaling percentage (e.g. 10.0).
     */
    const calculateScaledValue = (baseValue, level, percent) => {
        if (level <= 1 || percent === 0) return baseValue;
        
        // Formula: Base * (1 + (Level-1) * (Percent/100))
        const multiplier = 1 + ((level - 1) * (percent / 100));
        return Math.floor(baseValue * multiplier);
    };

    // --- Game_Enemy Overrides ---

    // 1. Hook into setup to calculate and store the level snapshot
    // We do this to ensure stats don't fluctuate if a party member dies/levels up mid-battle.
    const _Game_Enemy_setup = Game_Enemy.prototype.setup;
    Game_Enemy.prototype.setup = function(enemyId, x, y) {
        _Game_Enemy_setup.call(this, enemyId, x, y);
        this._scalingLevelReference = getPartyReferenceLevel();
    };

    // 2. Alias paramBase to scale basic stats (HP, ATK, etc.)
    const _Game_Enemy_paramBase = Game_Enemy.prototype.paramBase;
    Game_Enemy.prototype.paramBase = function(paramId) {
        const base = _Game_Enemy_paramBase.call(this, paramId);

        if (!isScalingAllowed(this.enemy())) {
            return base;
        }

        const level = this._scalingLevelReference || 1;
        const rate = RATES[paramId];

        return calculateScaledValue(base, level, rate);
    };

    // 3. Alias exp to scale Experience rewards
    const _Game_Enemy_exp = Game_Enemy.prototype.exp;
    Game_Enemy.prototype.exp = function() {
        const base = _Game_Enemy_exp.call(this);

        if (!isScalingAllowed(this.enemy())) {
            return base;
        }

        const level = this._scalingLevelReference || 1;
        return calculateScaledValue(base, level, RATE_EXP);
    };

    // 4. Alias gold to scale Gold rewards
    const _Game_Enemy_gold = Game_Enemy.prototype.gold;
    Game_Enemy.prototype.gold = function() {
        const base = _Game_Enemy_gold.call(this);

        if (!isScalingAllowed(this.enemy())) {
            return base;
        }

        const level = this._scalingLevelReference || 1;
        return calculateScaledValue(base, level, RATE_GOLD);
    };

})();