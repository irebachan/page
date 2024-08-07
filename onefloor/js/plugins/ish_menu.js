

/*:ja
 * @target MZ
 * @plugindesc メニュー画面の微調整
 * @author わし
 *
 * @help
 *
 * メニューの情報を地味に変更しているよ
 * 
 * 
 */

(() => {
    'use strict';


    const script = 'ish_menu';
    const parameters = PluginManager.parameters(script);

    //----ステータス



    const Window_StatusBase_placeBasicGauges = Window_StatusBase.prototype.placeBasicGauges;
    Window_StatusBase.prototype.placeBasicGauges = function(actor, x, y) { //変更箇所
    /*
        Window_StatusBase_placeBasicGauges.apply(this, arguments);

        //this.placeGauge(actor, "hp", x, y);
        //this.placeGauge(actor, "mp", x, y + this.gaugeLineHeight());
        if ($dataSystem.optDisplayTp) {
            this.placeGauge(actor, "tp", x, y + this.gaugeLineHeight() * 1 );
        }
    */
    };

    const Window_StatusBase_drawActorLevel = Window_StatusBase.prototype.drawActorLevel;
    Window_StatusBase.prototype.drawActorLevel = function(actor, x, y) {
        //Window_StatusBase_drawActorLevel.apply(this, arguments); //レベルも消したいんだよ〜
        /*
        this.changeTextColor(ColorManager.systemColor());
        this.drawText(TextManager.levelA, x, y, 48);
        this.resetTextColor();
        this.drawText(actor.level, x + 84, y, 36, "right");
        */
    };

    const Window_StatusBase_drawActorSimpleStatus = Window_StatusBase.prototype.drawActorSimpleStatus;
    Window_StatusBase.prototype.drawActorSimpleStatus = function(actor, x, y) {
        //Window_StatusBase_drawActorSimpleStatus.apply(this, arguments);

        const lineHeight = this.lineHeight();
        const x2 = x + 180;
        const y2 = y + 36;
        this.drawActorName(actor, x, y);
        this.drawActorNickname(actor, x, y2);
        //this.drawActorLevel(actor, x, y + lineHeight * 1); //変更箇所
        this.drawActorIcons(actor, x, y + lineHeight * 2);
        this.drawActorClass(actor, x, y2);
        //this.placeBasicGauges(actor, x, y + lineHeight);
    };



    //------メインメニュー　コマンド

    const Window_MenuCommand_makeCommandList = Window_MenuCommand.prototype.makeCommandList;
    Window_MenuCommand.prototype.makeCommandList = function() {
        //Window_MenuCommand_makeCommandList.apply(this, arguments); //競合対策のはずが　なぜか項目が二重に出るよ！

        //this.addMainCommands();
        //this.addFormationCommand();
        this.addOriginalCommands();
        //this.addOptionsCommand();
        //this.addSaveCommand(); //変更箇所
        //this.addGameEndCommand();
    };
    
    const  Window_MenuCommand_addMainCommands =  Window_MenuCommand.prototype.addMainCommands;
    Window_MenuCommand.prototype.addMainCommands = function() {
        Window_MenuCommand_addMainCommands.apply(this, arguments);

        /* //変更箇所
        const enabled = this.areMainCommandsEnabled();
        if (this.needsCommand("item")) {
            this.addCommand(TextManager.item, "item", enabled);
        }
        
        if (this.needsCommand("skill")) {
            this.addCommand(TextManager.skill, "skill", enabled);
        }
        if (this.needsCommand("equip")) {
            this.addCommand(TextManager.equip, "equip", enabled);
        }
        if (this.needsCommand("status")) {
            this.addCommand(TextManager.status, "status", enabled);
        }
        */
    };

    const Window_MenuCommand_needsCommand = Window_MenuCommand.prototype.needsCommand;
    Window_MenuCommand.prototype.needsCommand = function(name) {
        Window_MenuCommand_needsCommand.apply(this, arguments);

        // const table = ["item", "skill", "equip", "status", "formation", "save"];
        const table = []; //変更箇所
         const index = table.indexOf(name);
         if (index >= 0) {
             return $dataSystem.menuCommands[index];
         }
         return true;
     };


     //----アイテムメニュー

     const Window_ItemCategory_maxCols = Window_ItemCategory.prototype.maxCols;
     Window_ItemCategory.prototype.maxCols = function() {
        Window_ItemCategory_maxCols.apply(this, arguments);

        return 2;　//変更箇所
    };
    
    const Window_ItemCategory_makeCommandList = Window_ItemCategory.prototype.makeCommandList;
    Window_ItemCategory.prototype.makeCommandList = function() {
        //Window_ItemCategory_makeCommandList.apply(this, arguments);

        if (this.needsCommand("item")) {
            this.addCommand(TextManager.item, "item");
        }
        /*
        if (this.needsCommand("weapon")) {
            this.addCommand(TextManager.weapon, "weapon");
        }
        if (this.needsCommand("armor")) {
            this.addCommand(TextManager.armor, "armor");
        }
        */
        if (this.needsCommand("keyItem")) {
            this.addCommand(TextManager.keyItem, "keyItem");
        }
    };
    
    const Window_ItemCategory_needsCommand = Window_ItemCategory.prototype.needsCommand;
    Window_ItemCategory.prototype.needsCommand = function(name) {
        //Window_ItemCategory_needsCommand.apply(this, arguments);

        //const table = ["item", "weapon", "armor", "keyItem"];
        const table = ["item", "keyItem"];
        const index = table.indexOf(name);
        if (index >= 0) {
            return $dataSystem.itemCategories[index];
        }
        return true;
    };


})();