/*:
 * @target MZ
 * @plugindesc (Micro Version) HUD ขนาดจิ๋วที่สุด เหลือแค่ ชื่อ, Lv, และ HP
 * @author Jules
 *
 * @help
 * ============================================================================
 * Jules_SimpleMapHUD (Micro Version)
 * ============================================================================
 *
 * เวอร์ชั่นนี้ตัดทุกอย่างที่ไม่จำเป็นออก เพื่อให้เล็กที่สุดเท่าที่จะทำได้
 * - ไม่มีรูปหน้า
 * - ไม่มี MP / TP
 * - แสดงแค่: ชื่อตัวละคร, เลเวล, และหลอดเลือด (HP)
 * - ขนาดเล็กจิ๋ว วางอยู่ด้านล่างตรงกลาง
 *
 * ============================================================================
 * Parameters
 * ============================================================================
 *
 * @param visibleSwitch
 * @text Visible Switch ID
 * @type switch
 * @desc สวิตช์สำหรับเปิด/ปิด HUD (0 = แสดงตลอดเวลา)
 * @default 0
 *
 * @param width
 * @text Width
 * @type number
 * @desc ความกว้าง (แนะนำ 200-220)
 * @default 220
 *
 * @param height
 * @text Height
 * @type number
 * @desc ความสูง (แนะนำ 60-70)
 * @default 64
 *
 * @param opacity
 * @text Background Opacity
 * @type number
 * @min 0
 * @max 255
 * @desc ความทึบแสง (0-255)
 * @default 255
 *
 * @param paddingBottom
 * @text Bottom Padding
 * @type number
 * @desc ระยะห่างจากขอบล่างของหน้าจอ
 * @default 10
 *
 */

(() => {
    "use strict";

    const PLUGIN_NAME = "Jules_SimpleMapHUD";
    const Parameters = PluginManager.parameters(PLUGIN_NAME);

    const VISIBLE_SWITCH = Number(Parameters["visibleSwitch"]) || 0;
    const HUD_WIDTH = Number(Parameters["width"]) || 220;
    const HUD_HEIGHT = Number(Parameters["height"]) || 64;
    const HUD_OPACITY = Number(Parameters["opacity"]) !== undefined ? Number(Parameters["opacity"]) : 255;
    const PADDING_BOTTOM = Number(Parameters["paddingBottom"]) || 10;

    //-----------------------------------------------------------------------------
    // Window_MapHUD
    //-----------------------------------------------------------------------------

    class Window_MapHUD extends Window_Base {
        constructor(rect) {
            super(rect);
            this.opacity = HUD_OPACITY;
            this._actor = null;
            this._hp = -1;
            this._level = -1;
            this.refresh();
        }

        // --- Crash Proofing ---
        startAnimation() { return; }
        isStateAffected(stateId) { return false; }

        // ปรับขอบหน้าต่างให้บางที่สุด (Standard is 12)
        updatePadding() {
            this.padding = 6;
        }

        // ใช้ฟอนต์ขนาดเล็กจิ๋ว
        resetFontSettings() {
            super.resetFontSettings();
            this.contents.fontSize = 16;
        }

        update() {
            super.update();
            this.updateVisibility();
            if (this.visible) {
                this.updateContents();
            }
        }

        updateVisibility() {
            if ($gameParty.inBattle() || $gameMessage.isBusy()) {
                this.visible = false;
                return;
            }
            if (VISIBLE_SWITCH > 0 && !$gameSwitches.value(VISIBLE_SWITCH)) {
                this.visible = false;
                return;
            }
            this.visible = true;
        }

        updateContents() {
            const leader = $gameParty.leader();
            if (!leader) return;

            if (this._actor !== leader || 
                this._hp !== leader.hp ||
                this._level !== leader.level) {
                this.refresh();
            }
        }

        refresh() {
            this.contents.clear();
            this.resetFontSettings();
            
            const leader = $gameParty.leader();
            if (!leader) return;

            this._actor = leader;
            this._hp = leader.hp;
            this._level = leader.level;

            const w = this.innerWidth;
            const h = this.innerHeight;
            
            // --- Layout: Micro Style ---
            
            // Row 1: Name (Left) & Level (Right)
            const row1Y = 0;
            
            // Draw Name
            this.changeTextColor(ColorManager.hpColor(leader));
            this.drawText(leader.name(), 0, row1Y, w - 50, "left");

            // Draw Level
            this.changeTextColor(ColorManager.systemColor());
            this.drawText("Lv", w - 45, row1Y, 20, "right");
            this.changeTextColor(ColorManager.normalColor());
            this.drawText(leader.level, w - 25, row1Y, 25, "right");

            // Row 2: HP Bar (Full Width)
            // วางชิดขอบล่าง
            const barHeight = 10;
            const barY = h - barHeight - 2; 

            this.drawMicroGauge(0, barY, w, barHeight, leader.hpRate(), ColorManager.hpGaugeColor1(), ColorManager.hpGaugeColor2(), leader.hp, leader.mhp);
        }

        drawMicroGauge(x, y, width, height, rate, color1, color2, current, max) {
            // Background
            this.contents.fillRect(x, y, width, height, ColorManager.gaugeBackColor());
            
            // Gradient Fill
            const fillW = Math.floor(width * rate);
            this.contents.gradientFillRect(x, y, fillW, height, color1, color2);

            // Numbers inside the bar (Tiny text)
            this.contents.fontSize = 12; // ฟอนต์ตัวเลขเล็กมาก
            const text = current; // โชว์แค่เลข HP ปัจจุบันพอก็ได้เพื่อประหยัดที่ หรือจะ current/max ก็ได้
            
            // วาดตัวเลขซ้อนบนหลอดเลือด (Outline ช่วยให้อ่านง่าย)
            this.changeTextColor(ColorManager.normalColor());
            this.drawText(text, x, y - 10, width, "center"); // จัดกึ่งกลางหลอด
            
            this.resetFontSettings();
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
        const w = HUD_WIDTH;
        const h = HUD_HEIGHT;
        const x = (Graphics.boxWidth - w) / 2;
        const y = Graphics.boxHeight - h - PADDING_BOTTOM;

        const rect = new Rectangle(x, y, w, h);
        this._hudWindow = new Window_MapHUD(rect);
        this.addWindow(this._hudWindow);
    };

})();