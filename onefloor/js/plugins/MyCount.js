
/*:ja
 * @target MZ
 * @plugindesc テスト
 * @author わし
 * 
 * 
 * 
 *  
 *
 * @help
 *
 * プラグインで設定したやつをセーブに含めるには？
 * 
 *
 * 
 * 
 * 
 * @command add
 * @text カウント加算
 * @desc 
 * 
 * @command show
 * @text カウントを文章表示
 * @desc 
 * 
 */


// 自作オブジェクトのコンストラクタ
// 即時関数の外に出しておかないとデータをロードした時に
// prototypeがundefinedになるので注意
function Game_MyCount(){
    this.initialize.apply(this, arguments);
}
 
(function(){
    'use strict';
    
    // 定数の定義
    const PLUGIN_NAME = "MyCount";
    
    // ---------- プラグインコマンドの定義 ここから ----------

    PluginManagerEx.registerCommand(document.currentScript, "add", args => {
        $gameSystem.MyCount().add(1);

    });

    PluginManagerEx.registerCommand(document.currentScript, "show", args => {
        $gameSystem.MyCount().show();
    });

    // ---------- プラグインコマンドの定義 ここまで ----------
 
    // Game_System
    // プラグインのデータを保存するために
    // Game_Systemにオブジェクトを追加しておく
    // ---------- Game_System ここから ----------
    var _Game_System_initialize = Game_System.prototype.initialize;
    Game_System.prototype.initialize = function(){
	_Game_System_initialize.call(this);
	this._MyCount = new Game_MyCount();
    };
 
    Game_System.prototype.MyCount = function(){
	return this._MyCount;
    };
    // ---------- Game_System ここまで ----------
 
 
    // 自作クラス(オブジェクト)
    // ---------- Game_MyCount ここから ----------
    Game_MyCount.prototype            = Object.create(Game_MyCount.prototype);
    Game_MyCount.prototype.costructor = Game_MyCount;
    
    Game_MyCount.prototype.initialize = function(){
	this._count = 0;
    };
 
    Game_MyCount.prototype.add = function(val){
	val = Number(val || 1);
 
	if(!Number.isNaN(val)){
	    this._count += val;
	}
    };
 
    Game_MyCount.prototype.show = function(){
	$gameMessage.add('現在のカウントは' + this._count + "です。");
    };
    
    // ---------- Game_MyCount ここまで ----------    
 
})();