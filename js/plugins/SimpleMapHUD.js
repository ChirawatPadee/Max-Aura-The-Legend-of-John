/*:
 * @target MZ
 * @plugindesc (Perfect Fit) HUD ขนาดเล็ก ด้านล่างตรงกลาง จัดตัวอักษรและรูปหน้าให้พอดีกรอบ
 * @author Jules
 *
 * @help
 * ============================================================================
 * Jules_SimpleMapHUD (Perfect Fit Version)
 * ============================================================================
 * * เวอร์ชั่นนี้เน้นการจัดองค์ประกอบให้ "พอดีคำ" (Fit)
 * - รูปหน้าจะถูกย่อส่วน (Scale) ไม่ใช่การตัด (Crop)
 * - ตัวอักษรจะถูกบีบ (Squish) ถ้าชื่อยาวเกินไป
 * - ตำแหน่งบรรทัดจะปรับให้อยู่กึ่งกลางอัตโนมัติ
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
 * @desc ความกว้างของ HUD
 * @default 300
 *
 * @param height
 * @text Height
 * @type number
 * @desc ความสูงของ HUD (แนะนำ 110-120)
 * @default 110
 *
 * @param opacity
 * @text Background Opacity
 * @type number
 * @min 0
 * @max 255
 * @desc ความทึบแสงของพื้นหลัง (0-255)
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
    const HUD_WIDTH = Number(Parameters["width"]) || 300;
    const HUD_HEIGHT = Number(Parameters["height"]) || 110;
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
            this._mp = -1;
            this._tp = -1;
            this.refresh();
        }

        // ตั้งค่า Padding ของหน้าต่างให้เล็กลงเพื่อให้มีพื้นที่วาดมากขึ้น
        updatePadding() {
            this.padding = 10;
        }

        // กำหนดฟอนต์มาตรฐานให้เล็กลงเพื่อให้พอดีกรอบ
        resetFontSettings() {
            super.resetFontSettings();
            this.contents.fontSize = 18;
        }

        update() {
            super.update();
            this.updateVisibility();
            if (this.visible) {
                this.updateContents();
            }
        }

        updateVisibility() {
            // ซ่อนเมื่อต่อสู้ หรือ มีข้อความ
            if ($gameParty.inBattle() || $gameMessage.isBusy()) {
                this.visible = false;
                return;
            }
            // ซ่อนตามสวิตช์
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
                this._mp !== leader.mp || 
                this._tp !== leader.tp) {
                this.refresh();
            }
        }

        refresh() {
            this.contents.clear();
            this.resetFontSettings();
            
            const leader = $gameParty.leader();
            if (!leader) return;

            // Cache values
            this._actor = leader;
            this._hp = leader.hp;
            this._mp = leader.mp;
            this._tp = leader.tp;

            const hasTP = $dataSystem.optDisplayTp;
            
            // --- Layout Calculation ---
            // คำนวณความสูงที่ใช้จริง
            const faceSize = this.innerHeight; // ให้รูปหน้าสูงเท่าพื้นที่ภายใน
            const paddingX = 8;
            const textX = faceSize + paddingX;
            const textWidth = this.innerWidth - textX;
            
            // คำนวณตำแหน่งบรรทัด (Vertical Align Center)
            const lineHeight = 22; // ความสูงต่อบรรทัด
            const lines = hasTP ? 4 : 3; // จำนวนบรรทัดที่จะวาด (ชื่อ+HP+MP+TP)
            const totalTextHeight = lines * lineHeight;
            let startY = (this.innerHeight - totalTextHeight) / 2; // หาจุดเริ่มวาดให้กึ่งกลาง

            // 1. Draw Scaled Face (วาดรูปหน้าแบบย่อส่วน)
            this.drawScaledFace(leader, 0, 0, faceSize, faceSize);

            // 2. Draw Name & Level
            const nameY = startY;
            this.changeTextColor(ColorManager.hpColor(leader));
            // ใช้ maxWidth (Argument สุดท้าย) เพื่อบีบชื่อถ้ามันยาวเกินไป
            this.drawText(leader.name(), textX, nameY, textWidth - 45, "left");

            this.changeTextColor(ColorManager.systemColor());
            this.drawText("Lv", textX + textWidth - 40, nameY, 20, "right");
            this.changeTextColor(ColorManager.normalColor());
            this.drawText(leader.level, textX + textWidth - 20, nameY, 20, "right");

            // 3. Draw Gauges
            const hpY = startY + lineHeight;
            this.drawFitGauge(textX, hpY, textWidth, leader.hpRate(), ColorManager.hpGaugeColor1(), ColorManager.hpGaugeColor2(), TextManager.hpA, leader.hp, leader.mhp);
            
            const mpY = hpY + lineHeight;
            this.drawFitGauge(textX, mpY, textWidth, leader.mpRate(), ColorManager.mpGaugeColor1(), ColorManager.mpGaugeColor2(), TextManager.mpA, leader.mp, leader.mmp);
            
            if (hasTP) {
                const tpY = mpY + lineHeight;
                this.drawFitGauge(textX, tpY, textWidth, leader.tpRate(), ColorManager.tpGaugeColor1(), ColorManager.tpGaugeColor2(), TextManager.tpA, leader.tp, leader.maxTp());
            }
        }

        // ฟังก์ชั่นวาดรูปหน้าแบบย่อส่วน (Custom Scale)
        drawScaledFace(actor, x, y, width, height) {
            const bitmap = ImageManager.loadFace(actor.faceName());
            if (bitmap.isReady()) {
                const pw = ImageManager.faceWidth;
                const ph = ImageManager.faceHeight;
                const sw = pw;
                const sh = ph;
                const sx = (actor.faceIndex() % 4) * pw;
                const sy = Math.floor(actor.faceIndex() / 4) * ph;
                // วาดโดยใช้ blt แบบระบุปลายทาง (dw, dh) เพื่อย่อภาพ
                this.contents.blt(bitmap, sx, sy, sw, sh, x, y, width, height);
            } else {
                // ถ้าภาพยังไม่โหลด ให้รอและวาดใหม่
                bitmap.addLoadListener(this.refresh.bind(this));
            }
        }

        // ฟังก์ชั่นวาดเกจแบบพอดีตัวอักษร
        drawFitGauge(x, y, width, rate, color1, color2, label, current, max) {
            const barHeight = 8; // ความสูงหลอดเลือด
            const labelWidth = 25; // ความกว้างคำว่า HP
            // จัดตำแหน่งเกจให้อยู่ด้านล่างของบรรทัด (Bottom Align)
            const barY = y + 14; 

            // วาดพื้นหลังเกจ
            this.contents.fillRect(x, barY, width, barHeight, ColorManager.gaugeBackColor());
            
            // วาดสีเกจ (Gradient)
            const fillW = Math.floor(width * rate);
            this.contents.gradientFillRect(x, barY, fillW, barHeight, color1, color2);

            // วาด Label (HP/MP)
            this.contents.fontSize = 16; // ฟอนต์เล็กสำหรับ Label
            this.changeTextColor(ColorManager.systemColor());
            this.drawText(label, x, y - 4, labelWidth, "left");

            // วาดตัวเลข (Current/Max)
            const valueText = current + "/" + max;
            this.changeTextColor(ColorManager.normalColor());
            this.contents.fontSize = 16; // ฟอนต์เล็กสำหรับตัวเลข
            // ให้วาดตัวเลขชิดขวา และทับบนหลอดหรืออยู่เหนือหลอดเล็กน้อย
            this.drawText(valueText, x + width - 80, y - 4, 80, "right");
            
            // Reset Font Size
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
        // คำนวณ X ให้กึ่งกลาง: (หน้าจอ - ความกว้างหน้าต่าง) / 2
        const x = (Graphics.boxWidth - w) / 2;
        // คำนวณ Y ให้ติดขอบล่าง: หน้าจอ - ความสูงหน้าต่าง - Padding
        const y = Graphics.boxHeight - h - PADDING_BOTTOM;

        const rect = new Rectangle(x, y, w, h);
        this._hudWindow = new Window_MapHUD(rect);
        this.addWindow(this._hudWindow);
    };

})();