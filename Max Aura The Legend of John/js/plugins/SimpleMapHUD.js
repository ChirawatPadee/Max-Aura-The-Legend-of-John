/*:
 * @target MZ
 * @plugindesc (Compact Version) Displays a smaller, solid Status HUD on the Map screen.
 * @author Jules
 *
 * @help
 * ============================================================================
 * Jules_SimpleMapHUD (Compact & Solid Version)
 * ============================================================================
 *
 * This plugin creates a compact visual interface on the map screen showing
 * the Party Leader's status.
 *
 * Changes in this version:
 * - Smaller overall size (compact face, smaller fonts, thinner bars).
 * - Default opacity set to 255 for a solid window frame background.
 *
 * ============================================================================
 * Parameters
 * ============================================================================
 *
 * @param visibleSwitch
 * @text Visible Switch ID
 * @type switch
 * @desc Turn this switch ON to SHOW the HUD. If 0, it is always visible.
 * @default 0
 *
 * @param x
 * @text X Position
 * @type number
 * @desc The X coordinate of the HUD window.
 * @default 20
 *
 * @param y
 * @text Y Position
 * @type number
 * @desc The Y coordinate of the HUD window.
 * @default 20
 *
 * @param width
 * @text Width
 * @type number
 * @desc The width of the HUD window. (Smaller default)
 * @default 280
 *
 * @param height
 * @text Height
 * @type number
 * @desc The height of the HUD window. (Smaller default)
 * @default 150
 *
 * @param opacity
 * @text Background Opacity
 * @type number
 * @min 0
 * @max 255
 * @desc 0 = Transparent, 255 = Opaque (Solid Frame).
 * @default 255
 *
 */

(() => {
    "use strict";

    const PLUGIN_NAME = "Jules_SimpleMapHUD";
    const Parameters = PluginManager.parameters(PLUGIN_NAME);

    const VISIBLE_SWITCH = Number(Parameters["visibleSwitch"]) || 0;
    const HUD_X = Number(Parameters["x"]) || 20;
    const HUD_Y = Number(Parameters["y"]) || 20;
    // Reduced default dimensions
    const HUD_WIDTH = Number(Parameters["width"]) || 280;
    const HUD_HEIGHT = Number(Parameters["height"]) || 150;
    // Default opacity changed to 255 for solid frame
    const HUD_OPACITY = Number(Parameters["opacity"]) !== undefined ? Number(Parameters["opacity"]) : 255;

    //-----------------------------------------------------------------------------
    // Window_MapHUD
    //-----------------------------------------------------------------------------

    class Window_MapHUD extends Window_Base {
        constructor(rect) {
            super(rect);
            this.opacity = HUD_OPACITY;
            this._actor = null;
            this._hp = -1;
            this._mp = -1;
            this._tp = -1;
            this.refresh();
        }

        // Override to use smaller font for this window only
        resetFontSettings() {
            super.resetFontSettings();
            this.contents.fontSize = 20; // Standard is usually 26-28
        }

        // Override line height for tighter spacing
        lineHeight() {
            return 24; // Standard is usually 36
        }

        update() {
            super.update();
            this.updateVisibility();
            if (this.visible) {
                this.updateContents();
            }
        }

        updateVisibility() {
            if (VISIBLE_SWITCH === 0) {
                this.visible = true;
            } else {
                this.visible = $gameSwitches.value(VISIBLE_SWITCH);
            }

            if ($gameMessage.isBusy()) {
                this.visible = false;
            }
        }

        updateContents() {
            const leader = $gameParty.leader();
            if (!leader) return;

            if (this._actor !== leader || 
                this._hp !== leader.hp || 
                this._mp !== leader.mp || 
                this._tp !== leader.tp) {
                
                this.refresh();
            }
        }

        refresh() {
            this.contents.clear();
            // Important: reset font settings every refresh to ensure small size
            this.resetFontSettings(); 
            
            const leader = $gameParty.leader();
            if (!leader) return;

            // Cache values
            this._actor = leader;
            this._hp = leader.hp;
            this._mp = leader.mp;
            this._tp = leader.tp;

            const padding = 8;
            const compactFaceSize = 84; // Much smaller than standard 144
            
            // 1. Draw Compact Face
            // We use the extended drawFace arguments to scale it down: source x,y,w,h -> dest x,y,w,h
            this.drawFace(leader.faceName(), leader.faceIndex(), 0, 0, 144, 144, 0, 0, compactFaceSize, compactFaceSize);

            const startX = compactFaceSize + padding;
            const barWidth = this.innerWidth - startX - padding;
            const lineHeight = this.lineHeight();
            
            // 2. Draw Name & Level (Tighter layout)
            this.changeTextColor(ColorManager.hpColor(leader));
            this.drawText(leader.name(), startX, 0, barWidth - 50, "left");

            this.changeTextColor(ColorManager.systemColor());
            // Use short level prefix eg "Lv"
            this.drawText(TextManager.levelA, startX + barWidth - 50, 0, 30, "right"); 
            this.changeTextColor(ColorManager.normalColor());
            this.drawText(leader.level, startX + barWidth - 20, 0, 20, "right");

            // 3. Draw Compact Gauges
            const gaugeYStart = lineHeight + 4; // Add a little gap below name
            
            this.drawCompactGauge(startX, gaugeYStart + (lineHeight * 0), barWidth, leader.hpRate(), ColorManager.hpGaugeColor1(), ColorManager.hpGaugeColor2(), TextManager.hpA, leader.hp, leader.mhp);
            
            this.drawCompactGauge(startX, gaugeYStart + (lineHeight * 1), barWidth, leader.mpRate(), ColorManager.mpGaugeColor1(), ColorManager.mpGaugeColor2(), TextManager.mpA, leader.mp, leader.mmp);
            
            if ($dataSystem.optDisplayTp) {
                this.drawCompactGauge(startX, gaugeYStart + (lineHeight * 2), barWidth, leader.tpRate(), ColorManager.tpGaugeColor1(), ColorManager.tpGaugeColor2(), TextManager.tpA, leader.tp, leader.maxTp());
            }
        }

        drawCompactGauge(x, y, width, rate, color1, color2, label, current, max) {
            const labelWidth = 25; // Smaller label space
            const valueWidth = 70; // Smaller value space
            const barHeight = 8;   // Thinner bar (standard was 12)
            const barY = y + this.lineHeight() - barHeight - 4;

            // Draw Background
            this.contents.fillRect(x, barY, width, barHeight, ColorManager.gaugeBackColor());

            // Draw Gradient
            const fillW = Math.floor(width * rate);
            this.contents.gradientFillRect(x, barY, fillW, barHeight, color1, color2);

            // Draw Label (using slightly smaller font if needed, but resetFontSettings handles it generally)
            this.changeTextColor(ColorManager.systemColor());
            this.drawText(label, x, y, labelWidth);

            // Draw Numbers
            this.changeTextColor(ColorManager.normalColor());
            const text = current + "/" + max;
            // Reduce font size slightly for the numbers to fit better
            this.contents.fontSize -= 2; 
            this.drawText(text, x + width - valueWidth, y, valueWidth, "right");
            this.resetFontSettings(); // Reset back for next element
        }
    }

    //-----------------------------------------------------------------------------
    // Scene_Map Integration
    //-----------------------------------------------------------------------------

    const _Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function() {
        _Scene_Map_createAllWindows.call(this);
        this.createHUD();
    };

    Scene_Map.prototype.createHUD = function() {
        // Use new compact dimensions defined in parameters
        const rect = new Rectangle(HUD_X, HUD_Y, HUD_WIDTH, HUD_HEIGHT);
        this._hudWindow = new Window_MapHUD(rect);
        this.addWindow(this._hudWindow);
    };

})();