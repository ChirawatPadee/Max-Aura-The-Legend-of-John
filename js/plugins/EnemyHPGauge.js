/*:
 * @target MZ
 * @plugindesc แสดงหลอด HP สีแดงเหนือหัวศัตรูในฉากต่อสู้
 * @author RPG Maker Fan
 *
 * @help EnemyHPGauge.js
 * * วิธีใช้:
 * ติดตั้ง Plugin แล้วหลอดเลือดจะขึ้นอัตโนมัติเหนือหัวศัตรูทุกตัว
 * * หากต้องการปรับขนาด ให้แก้ตัวเลขในบรรทัดที่มีคำว่า gaugeW (ความกว้าง) 
 * หรือ gaugeH (ความสูง) ในโค้ด
 */

(() => {
    // 1. เก็บฟังก์ชันเดิมของระบบไว้ (เพื่อไม่ให้ระบบเก่าพัง)
    const _Sprite_Enemy_initMembers = Sprite_Enemy.prototype.initMembers;
    const _Sprite_Enemy_update = Sprite_Enemy.prototype.update;

    // 2. แทรกคำสั่งตอนเริ่มสร้างตัวศัตรู
    Sprite_Enemy.prototype.initMembers = function() {
        _Sprite_Enemy_initMembers.call(this); // เรียกฟังก์ชันเดิมก่อน
        this.createHpGauge();                 // สั่งสร้างหลอดเลือดของเรา
    };

    // ฟังก์ชันสร้างหลอดเลือด (เตรียม Sprite ว่างๆ ไว้)
    Sprite_Enemy.prototype.createHpGauge = function() {
        this._hpGauge = new Sprite();
        this._hpGauge.anchor.x = 0.5; // จุดอ้างอิงกึ่งกลางแนวนอน
        this.addChild(this._hpGauge); // ใส่หลอดเลือดเข้าไปเป็นลูกของตัวศัตรู
    };

    // 3. แทรกคำสั่งตอนอัปเดต (ทำงานตลอดเวลาในฉากสู้)
    Sprite_Enemy.prototype.update = function() {
        _Sprite_Enemy_update.call(this);
        if (this._enemy) {
            this.updateHpGaugeState();    // เช็คว่าควรโชว์ไหม และวาดสี
            this.updateHpGaugePosition(); // เช็คตำแหน่ง (เผื่อตัวศัตรูขยับ)
        }
    };

    // ฟังก์ชันวาดหลอดเลือด
    Sprite_Enemy.prototype.updateHpGaugeState = function() {
        // ถ้าศัตรูตาย หรือซ่อนตัวอยู่ -> ให้ซ่อนหลอดเลือด
        if (this._enemy.isDead() || this._enemy.isHidden()) {
            this._hpGauge.visible = false;
            return;
        }
        this._hpGauge.visible = true;

        // กำหนดขนาดหลอดเลือด (แก้ตัวเลขตรงนี้ได้)
        const gaugeW = 80;  // ความกว้าง
        const gaugeH = 8;   // ความสูง

        // ถ้ายังไม่มี Bitmap หรือขนาดเปลี่ยน ให้สร้างใหม่
        if (!this._hpGauge.bitmap || this._hpGauge.bitmap.width !== gaugeW) {
            this._hpGauge.bitmap = new Bitmap(gaugeW, gaugeH);
        }

        const bitmap = this._hpGauge.bitmap;
        // คำนวณ % เลือด (0.0 ถึง 1.0)
        let hpRate = this._enemy.hp / this._enemy.mhp;
        if (hpRate < 0) hpRate = 0;

        // ล้างภาพเก่าทิ้งก่อนวาดใหม่
        bitmap.clear();

        // 1. วาดพื้นหลังสีดำ (ขอบ)
        bitmap.fillRect(0, 0, gaugeW, gaugeH, "#000000");

        // 2. วาดพื้นหลังหลอด (สีเทาเข้ม)
        bitmap.fillRect(1, 1, gaugeW - 2, gaugeH - 2, "#202020");

        // 3. วาดเนื้อหลอดเลือด (สีแดง)
        const fillW = Math.floor((gaugeW - 2) * hpRate);
        bitmap.fillRect(1, 1, fillW, gaugeH - 2, "#ff0000");
    };

    // ฟังก์ชันจัดตำแหน่งหลอดเลือด
    Sprite_Enemy.prototype.updateHpGaugePosition = function() {
        // เช็คว่าตัวศัตรูโหลดรูปเสร็จหรือยัง
        if (this.bitmap) {
            // ให้หลอดเลือดอยู่เหนือหัว (ความสูงของรูป + ขยับขึ้นอีก 10 pixel)
            this._hpGauge.y = -this.bitmap.height - 10;
        } else {
            // ถ้ารูปยังไม่มา ให้วางไว้ที่เดิมไปก่อน
            this._hpGauge.y = -50;
        }
    };

})();