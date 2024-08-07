//=============================================================================
// SoR_GabWindow_Left.js
// MIT License (C) 2020 蒼竜 @soryu_rpmaker
// http://opensource.org/licenses/mit-license.php
// ----------------------------------------------------------------------------
// Latest version v1.05 (2020/09/09)
//=============================================================================

/*:ja
* @plugindesc ＜おしゃべりポップアップ Type-L＞
* @author 蒼竜　@soryu_rpmaker
* @help 1～2行の簡易的なチャットウィンドウを表示します。
* スクリプトコマンドからの入力に反応して、マップ画面および戦闘画面で随時表示されます。
*
*　機能の広範化により、製作者ごとに無駄な処理が氾濫することを抑制するため、
* UIデザインの方向性ごとにスクリプトファイルを分けています。
* 好みのスタイルのものを1つだけ選んで導入してください。
* (このスクリプトは、"Type-L"のものです。)
*
*
* [プラグインコマンド] 
* PushGab - 顔グラフィックと、表示したいメッセージを設定します。FaceID text1|text2
* ForceGabClear - PushGabで挿入した、現在溜まっているキューを全て強制削除します。
*
* -----------------------------------------------------------
* バージョン情報
* -----------------------------------------------------------
* v1.05 (2020/09/09)    MZ固有エラー対応による、顔グラフィック非表示テキストがエラーになる問題の修正
* v1.04 (2020/08/29)    キュー挿入直後にシーン遷移した際に起きるMZ固有エラーを修正
* v1.03 (2020/08/20)    MZバージョン初版
*
* @target MZ
* @url http://dragonflare.dip.jp/dcave/
* @param WindowStyle
* @desc ウィンドウ形式 (default: 0)
* @type select
* @option 標準スキンによるウィンドウ
* @value 0
* @option 暗くする
* @value 1
* @option 独自画像を利用
* @value 2
* @default 0
*
* @param WindowSkinImage 
* @desc WindowStyleで設定したウィンドウ形式が 2.「独自画像を利用」 のときに参照する画像 (default: gab_bg)
* @type file
* @dir img/system
* @default gab_bg
* @param GabWindowYpadd_originalSkin
* @desc WindowStyleで設定したウィンドウ形式が 2.「独自画像を利用」 のときの縦の間隔の補正値(default: 0)
* @default 0
* @type number
*
* @param GabSoundSE
* @desc Gab挿入ごとに鳴らす効果音を設定します (default: 無し) 
* @type file
* @dir audio/se
*
* @param GabWindowY
* @desc 描画位置Y座標(default: 560)
* @default 560
* @type number
* @param GabWindowWidthPadd
* @desc ウィンドウ横幅に対する余白(default: 108)
* @default 108
* @type number
* @param GabWindowHeight
* @desc ウィンドウ縦幅(default: 64)
* @default 64
* @type number
* 
* @param GabWindow_baseDuration
* @desc 現在のGabの表示時間(次のGabの挿入を待つ時間)(default: 160)
* @default 160
* @type number
* @param GabWindow_keepDuration
* @desc GabWindow_baseDuration後のGabを消去するまでの待機時間(default: 400)
* @default 400
* @type number
* @param Multiple_GabSpaces
* @desc Gab同士の縦の間隔(default: 62)
* @default 62
* @type number
*
* @param GabWindowHeightPadd_ForBattle
* @desc 戦闘画面におけるGabWindowのy方向位置補正(default: -196)
* @default -196
* @type number
*
* @param FaceXPosition
* @desc 顔画像表示位置、画像中心のx座標(default: 41)
* @default 41
* @type number
* @param FaceYPosition
* @desc 顔画像表示位置、画像中心のy座標(default: 23)
* @default 23
* @type number
*
* @param scaleX_Face_default
* @desc x方向の顔画像の表示倍率(default: 0.5)
* @default 0.5
* @type number
* @param scaleY_Face_default
* @desc y方向の顔画像の表示倍率(default: 0.5)
* @default 0.5
* @type number
* @param ActorFaceRect_U
* @desc 顔画像グラフィックの表示領域(Y方向上端)(default: 0)
* @default 0
* @type number
* @param ActorFaceRect_L
* @desc Faceグラフィックの表示領域(Y方向下端)(default: 144)
* @default 144
* @type number
*
* @param MessageXPosition
* @desc メッセージ表示位置x補正、FaceXPositionを参考に調整のこと(default: 80)
* @default 80
* @type number
* @param GabStringFont
* @desc Gabフォントサイズ(default: 16)
* @default 16
* @type number
*
* @command PushGab
* @text 呼び出し[おしゃべりポップアップ]
* @desc メッセージの描画キューを登録します。
* @arg arg0
* @type number
* @text 顔グラフィックを表示するアクターID
* @desc データベースの並び順に対応し、0で非表示にします
* @arg arg1
* @text メッセージ文字列
* @desc 1回のポップアップで描画する文字列。 | で区切ると2行に分けることができます
*
* @command ForceGabClear
* @text 全消去[おしゃべりポップアップ]
* @desc ウィンドウに描画中の内容、および登録中のキューを直ちに全て消去します
*/									  
/*:
* @plugindesc <GabWindow Type-Left>
* @author @soryu_rpmaker
* @help Create a simple gab window to show a few line of text.
* The game accepts script commands via script command
* to show Gab Window on Map and Battle scenes.
*
*　In order to avoid outburst of unnecessary functions for respective developers
* by implementing various features for attractive UI,
* script files are separated by the design.
* Thus, install just ONLY ONE script for your preference. 
* (This file is for "Type-Left".)		   
*
* [Plugin commands]
* PushGab - Make a queue to show a message with specified actor's face.				
* ForceGabClear - Force clear the all queues inserted by PushGab commands.
*
* -----------------------------------------------------------
* Version info.
* -----------------------------------------------------------
* v1.05 (Sep.  9th, 2020)    Bug fix for the gab with no face graphics due to the update for a unique problem in MZ environment.
* v1.04 (Aug. 29th, 2020)    Bug fix for only MZ environment in the scene transition just after queue insertion
* v1.03 (Aug. 20th, 2020)    First edition ported for MZ
*
* @param WindowStyle
* @desc Style of Gab Window (default: 0)
* @type select
* @option Default window with the skin
* @value 0
* @option Dark
* @value 1
* @option Use original UI images
* @value 2
* @default 0
*
* @param WindowSkinImage 
* @desc The image used for your original Gab window in case of "Use original UI images". (default: gab_bg)
* @type file
* @dir img/system
* @default gab_bg
* @param GabWindowYpadd_originalSkin
* @desc Additional vertical padding for each gab window in case of "Use original UI images".(default: 0)
* @default 0
* @type number
*
* @param GabSoundSE
* @desc SE for inserting every Gab Window (default: none) 
* @type file
* @dir audio/se
*
* @param GabWindowY
* @desc Y-cooridnate(upper left corner) of Gab Window (default: 560)
* @default 560
* @type number
* @param GabWindowWidthPadd
* @desc Padding after texts inner Gab window (default: 108)
* @default 108
* @type number
* @param GabWindowHeight
* @desc Height of a window for each Gab (default: 64)
* @default 64
* @type number
* 
* @param GabWindow_baseDuration
* @desc Interval of processing new Gab window (default: 160)
* @default 160
* @type number
* @param GabWindow_keepDuration
* @desc After time GabWindow_baseDuration elapsed, the duration to keep Gab Window (default: 400)
* @default 400
* @type number
* @param Multiple_GabSpaces
* @desc Vertical space for each Gab (default: 62)
* @default 62
* @type number
*
* @param GabWindowHeightPadd_ForBattle
* @desc Additional vertical padding for Gab Window in battle scene (default: -196)
* @default -196
* @type number
*
* @param FaceXPosition
* @desc X-coordinate (center of the sprite) of Face graphic (default: 41)
* @default 41
* @type number
* @param FaceYPosition
* @desc Y-coordinate (center of the sprite) of Face graphic (default: 23)
* @default 23
* @type number
*
* @param scaleX_Face_default
* @desc Horizontal scale of face sprite(default: 0.5)
* @default 0.5
* @type number
* @param scaleY_Face_default
* @desc Vertical scale of face sprite(default: 0.5)
* @default 0.5
* @type number
* @param ActorFaceRect_U
* @desc The range of displaying face sprites (upper)(default: 0)
* @default 0
* @type number
* @param ActorFaceRect_L
* @desc The range of displaying face sprites (lower)(default: 144)
* @default 144
* @type number
*
* @param MessageXPosition
* @desc Padding for Gab text in a window (default: 80)
* @default 80
* @type number
* @param GabStringFont
* @desc Font size for Gab text(default: 16)
* @default 16
* @type number
*
*
* @command PushGab
* @text Message queue[SoR_GabWindow]
* @desc Register a queue with a messange and face graphic
* @arg arg0
* @type number
* @text Actor ID for Face 
* @desc ID corresponds to that in database, 0 to disable 
* @arg arg1
* @text Message
* @desc A message in one window. Split by | to align the message with 2 lines.
*
* @command ForceGabClear
* @text Queue All Clear [SoR_GabWindow]
* @desc Delete all contents on the window including queues which are to be displayed 
*
* @target MZ
* @url http://dragonflare.dip.jp/dcave/index_e.php
*/


var Imported = Imported || {};
if(Imported.SoR_GabWindows) throw new Error("[SoR_GabWindows] Do NOT import more than 2 types of <SoR_GabWindow> series.");
Imported.SoR_GabWindows = true;

var SoR = SoR || {};

(function() {
const pluginName = "SoR_GabWindow_MZ_Left";

SoR.GabParam = PluginManager.parameters(pluginName);

SoR.WindowLayoutSide = Number(SoR.GabParam['WindowLayoutSide'] || 0);

SoR.WindowStyle =　Number(SoR.GabParam['WindowStyle'] || 0);
SoR.WindowSkinImage =　String(SoR.GabParam['WindowSkinImage'] || 'gab_bg');

SoR.GabSoundSE = String(SoR.GabParam['GabSoundSE'] || '');
SoR.GabWindowY = Number(SoR.GabParam['GabWindowY'] || 560);
SoR.GabWindowWidthPadd = Number(SoR.GabParam['GabWindowWidthPadd'] || 108);
SoR.GabWindowHeight = Number(SoR.GabParam['GabWindowHeight'] || 64);
SoR.GabWindow_baseDuration = Number(SoR.GabParam['GabWindow_baseDuration'] || 160);
SoR.GabWindow_keepDuration = Number(SoR.GabParam['GabWindow_keepDuration'] || 400);
SoR.Multiple_GabSpaces = Number(SoR.GabParam['Multiple_GabSpaces'] || 62);
SoR.GabWindowYpadd_originalSkin = Number(SoR.GabParam['GabWindowYpadd_originalSkin'] || 0);

SoR.GabWindowHeightPadd_ForBattle = Number(SoR.GabParam['GabWindowHeightPadd_ForBattle'] || -196);
SoR.FaceXPosition = Number(SoR.GabParam['FaceXPosition'] || 41);
SoR.FaceYPosition = Number(SoR.GabParam['FaceYPosition'] || 23);
SoR.scaleX_Face_default = Number(SoR.GabParam['scaleX_Face_default'] || 0.5);
SoR.scaleY_Face_default = Number(SoR.GabParam['scaleY_Face_default'] || 0.5);
SoR.ActorFaceRect_U = Number(SoR.GabParam['ActorFaceRect_U'] || 0);
SoR.ActorFaceRect_L = Number(SoR.GabParam['ActorFaceRect_L'] || 144);
SoR.MessageXPosition = Number(SoR.GabParam['MessageXPosition'] || 80);
SoR.GabStringFont = Number(SoR.GabParam['GabStringFont'] || 16);


PluginManagerEx.registerCommand(document.currentScript, "PushGab", args => { 
//PluginManager.registerCommand(pluginName, "PushGab", args => { //変更箇所
	const argc = args.length;
	if(!Number.isFinite(Number(args.arg0))) return;
    const id = args.arg0;	

	if(!args.arg1) return;
	
	let str_arr = ['', ''];
	const strs = args.arg1.split('|');
	str_arr[0] = strs[0];
	if(strs.length == 2)str_arr[1] = strs[1];							   

    const obj = new SoR_GabWindow(str_arr[0],str_arr[1],id);
	$gameTemp.SoR_GabPush(obj);
});
	
PluginManager.registerCommand(pluginName, "ForceGabClear", args => {
	$gameTemp.clearGabCommand();
});
	
 

////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////

const SoR_GabW_GT_initialize = Game_Temp.prototype.initialize;
Game_Temp.prototype.initialize = function() {
	SoR_GabW_GT_initialize.call(this);
    this.gab_ready_queue = [];
   // this.gab_log_queue = [];
	this.gab_duration = 0;
	this.isForceClear = false;
	this.ForceTransferClear = false;
};

//force clear gab
Game_Temp.prototype.clearGabCommand = function() {
	this.gab_ready_queue.length = 0;
	this.gab_duration = 0;
	this.isForceClear = true;
}
Game_Temp.prototype.IsForceClearGab = function() {
	return this.isForceClear;
}



Game_Temp.prototype.SoR_GabPush = function(obj) {
	this.gab_ready_queue.push(obj);
}

Game_Temp.prototype.SoR_GabPullHead = function() {
	let obj = null;
	if(this.SoR_GabQueueCount() > 0){
		obj = this.gab_ready_queue[0];
	}
	
	return obj;
}
Game_Temp.prototype.SoR_GabPop = function() {
	this.gab_ready_queue.shift();
}



Game_Temp.prototype.SoR_GabQueueCount = function(){
	return this.gab_ready_queue.length;
}

////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////
const SoR_GabW_SB_initialize = Scene_Base.prototype.initialize;
Scene_Base.prototype.initialize = function() {
    SoR_GabW_SB_initialize.call(this);
		
	this.gab_duration = 0;
	this.gab_shown = [];

};

const SoR_GabW_SM_push = SceneManager.push;
SceneManager.push = function(next_scene) {
    if (this._scene instanceof Scene_Map) {
		for(let i=0; i<this._scene.gab_shown.length; i++){
			const obj = this._scene.gab_shown[i];
			obj.TempCloseGab();
			this._scene.SoR_GabField.removeChild(obj);
			if(SoR.WindowStyle == 2) this._scene.SoR_GabField.removeChild(obj.bg_img);
			if(obj.face)this._scene.SoR_GabField.removeChild(obj.face);
		}
		this._scene.gab_shown.length = 0;
    }
	
    SoR_GabW_SM_push.call(this, next_scene);
};

const SoR_GabW_GP_reserveTransfer = Game_Player.prototype.reserveTransfer;
Game_Player.prototype.reserveTransfer = function(mapId, x, y, d, fadeType) {
    SoR_GabW_GP_reserveTransfer.call(this, mapId, x, y, d, fadeType);
	$gameTemp.ForceTransferClear = true;
};

///////////////////////////////////////////////////////////////

Scene_Base.prototype.SoR_createGabWindow = function(scene) {
	this._scene = scene;
	this.SoR_GabField = new Sprite();
    this.addChild(this.SoR_GabField);
};

//
//update 
//
Scene_Base.prototype.GabWindowManager = function() {
	//reset for transition
	if($gameTemp.ForceTransferClear || $gameTemp.IsForceClearGab()){
		for(let i=0; i<this.gab_shown.length; i++){
			const obj = this.gab_shown[i];
			this.SoR_GabField.removeChild(obj);
			if(SoR.WindowStyle == 2) this.SoR_GabField.removeChild(obj.bg_img);
			if(obj.face)this.SoR_GabField.removeChild(obj.face);
		}
		this.gab_shown.length = 0;
		if($gameTemp.ForceTransferClear) $gameTemp.ForceTransferClear = false;
		if($gameTemp.IsForceClearGab()) $gameTemp.isForceClear = false;
		return;
	}	

	//create
	if($gameTemp.SoR_GabQueueCount()>0 && this.gab_duration == 0){
		const obj = $gameTemp.SoR_GabPullHead();
		if(obj!=null) this.SoR_GabSetup(obj, this._scene);
	}
	if(this.gab_duration>0) this.gab_duration--;
	
	//main update
	for(let i=0; i<this.gab_shown.length; i++){
		const obj = this.gab_shown[i];
		if(i==this.gab_shown.length-1){
			if(this.gab_duration==0){
				if($gameTemp.SoR_GabPullHead() == obj)	$gameTemp.SoR_GabPop();
				obj.keepDuration--;
			}
		}
		else obj.keepDuration--;
		
		this.gab_shown[i].shiftY(this.gab_shown.length-i-1);
	}

    //expire
	for(let i=0; i<this.gab_shown.length; i++){
		const obj = this.gab_shown[i];
		if(obj.keepDuration==0){
			this.SoR_GabField.removeChild(obj);
			if(SoR.WindowStyle == 2) this.SoR_GabField.removeChild(obj.bg_img);
			if(obj.face)this.SoR_GabField.removeChild(obj.face);
			this.gab_shown.splice(i, 1);
			i--;
		}
	}
	
}

Scene_Base.prototype.SoR_GabSetup = function(obj, scene){
		this.gab_shown.push(obj);
		this.gab_duration = obj.drawDuration;
		
		obj.setupGab(scene);
		if(SoR.WindowStyle == 2) this.SoR_GabField.addChild(obj.bg_img);
		this.SoR_GabField.addChild(obj);

		if(obj.faceID!=0 && ( obj.face.bitmap._baseTexture == null || obj.face.transform == null) ) obj.face = obj.GetFaceSprite(obj.faceID);
		if(obj.face)this.SoR_GabField.addChild(obj.face);
		if(obj.gab_se)AudioManager.playSe(obj.gab_se);
}

////////////////////////////////////////////////////////////
// For Scene_Map
////////////////////////////////////////////////////////////
const SoR_GabW_SM_createAllWindows = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    SoR_GabW_SM_createAllWindows.call(this);
    this.SoR_createGabWindow('Scene_Map');
};

const SoR_GabW_SM_update = Scene_Map.prototype.update;
Scene_Map.prototype.update = function() {
	SoR_GabW_SM_update.call(this);
	this.GabWindowManager();
}

////////////////////////////////////////////////////////////
// For Scene_Battle
////////////////////////////////////////////////////////////

const SoR_GabW_SB_createAllWindows = Scene_Battle.prototype.createAllWindows;
Scene_Battle.prototype.createAllWindows = function() {
    SoR_GabW_SB_createAllWindows.call(this);
    this.SoR_createGabWindow('Scene_Battle');
};

const SoR_GabW_SB_update = Scene_Battle.prototype.update;
Scene_Battle.prototype.update = function() {
	SoR_GabW_SB_update.call(this);
	this.GabWindowManager();
}




////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////
function SoR_GabWindow() {
    this.initialize.apply(this, arguments);
}

SoR_GabWindow.prototype = Object.create(Window_Base.prototype);
SoR_GabWindow.prototype.constructor = SoR_GabWindow;

SoR_GabWindow.prototype.initialize = function(text1, text2, ID){
	Window_Base.prototype.initialize.call(this,new Rectangle( 0, 0, 800, SoR.GabWindowHeight+16));
	this.faceID = ID;
    this._text1 = text1;
    this._text2 = text2;
	this.contents.fontSize = SoR.GabStringFont;
	this.drawLength = this.CalcLength();
	this.drawDuration = this.CalcDuration();
	this.keepDuration = SoR.GabWindow_keepDuration;
	this.enter_effect = 512;
	this.x = -this.enter_effect;
	this.Basey = SoR.GabWindowY; 
	this.y = this.Basey;
	this.diffY = 0;
	this.bg_img = null;
	this.gab_se = null;
	
	if(SoR.GabSoundSE!='') {
		this.gab_se = {
			name : SoR.GabSoundSE,
			pitch : 100,
			volume : 100
		}
	}
	
	if(ID>=1) this.face = this.GetFaceSprite(ID);
	else this.face = null;
	
	this.width = this.drawLength + SoR.GabWindowWidthPadd;
	this.height = SoR.GabWindowHeight;	
    this.openness = 0;
	
	if(SoR.WindowStyle == 0) this.setBackgroundType(0);	
	else this.setBackgroundType(2);	//no default window
	
	if(SoR.WindowStyle == 2){
		this.bg_img = new Sprite(ImageManager.loadSystem(SoR.WindowSkinImage));
	}
}

Object.defineProperty(SoR_GabWindow.prototype, "innerWidth", {
    get: function() {
        return Math.max(0, this._width);
    },
    configurable: true
});
Object.defineProperty(SoR_GabWindow.prototype, "innerHeight", {
    get: function() {
        return Math.max(0, this._height);
    },
    configurable: true
});

SoR_GabWindow.prototype.destroy = function(options) {}

SoR_GabWindow.prototype.setupGab = function(scene){
	
	this.scene_ypadd = 0;
	if(scene == 'Scene_Battle') this.scene_ypadd = SoR.GabWindowHeightPadd_ForBattle;
	
	this.x = -this.enter_effect;
	
	this.y = this.Basey + this.scene_ypadd;
	this.contents.clear();
	if(SoR.WindowStyle != 0) this.DrawBackground(255);
	this.DrawMessages();	 
	this.openness = 255;
	if(this.face) this.face.visible = true; 
}

SoR_GabWindow.prototype.TempCloseGab = function(){
	this.openness = 0;
	if(this.face) this.face.visible = false;
}


SoR_GabWindow.prototype.DrawMessages = function(){
	this.contents.fontSize = SoR.GabStringFont;
	let numl = 0;
	if(this._text2 == '') numl=1;

    let xpos = SoR.MessageXPosition;
	if(!this.face) xpos = 12;

	this.drawText(this._text1, xpos, numl*10 -8, this.width, 'left');
    if(numl==0) this.drawText(this._text2, xpos, 10, this.width, 'left');
	
}

SoR_GabWindow.prototype.shiftY = function(tmp_y){
	if(this.y != this.Basey + this.scene_ypadd - tmp_y*SoR.Multiple_GabSpaces){
		this.diffY = (this.Basey + this.scene_ypadd - tmp_y*SoR.Multiple_GabSpaces) - this.y;
	}
	else this.diffY = 0;
	this.changeOpacity(tmp_y);
}

SoR_GabWindow.prototype.changeOpacity = function(opaLev){
	const Eraser = this.keepDuration<=45 ? (45-this.keepDuration)*5 : 0;
	
	if(SoR.WindowStyle == 0) this.opacity = 255 - opaLev*55 - Eraser;
	if(this.opacity < 0) this.opacity = 0;
	this.contents.paintOpacity = 255 - opaLev*55 - Eraser;
	if(this.contents.paintOpacity < 0) this.contents.paintOpacity = 0;
	if(this.face)this.face.opacity = this.contents.paintOpacity;

	this.contents.clear();
	if(SoR.WindowStyle != 0) this.DrawBackground(this.contents.paintOpacity);	
	this.DrawMessages(); 
	
	const op = this.contents.paintOpacity/512.0;
	const rgba = 'rgba(0, 0, 0, ' + op.toFixed(2) + ')' ;
	this.contents.outlineColor =  rgba;
}


SoR_GabWindow.prototype.update = function(){
	Window_Base.prototype.update.call(this);
	
	if(this.enter_effect>0) this.enter_effect = Math.floor(this.enter_effect/1.25);
	else this.enter_effect = 0;
		
	this.x = -this.enter_effect;
	this.y += Math.floor(this.diffY/2.25);
	if(this.face)this.face.x = SoR.FaceXPosition-this.enter_effect;
	if(this.face)this.face.y = this.y+SoR.FaceYPosition + Math.floor(this.diffY/2.25);
}


SoR_GabWindow.prototype.DrawBackground = function(opa) {	
	if(SoR.WindowStyle == 1){
		const color1 = ColorManager.dimColor1();
		const color2 = ColorManager.dimColor2(); 
		this.contents.fillRect(0, 0, this.width / 2, this.height, color1);
		this.contents.gradientFillRect(this.width / 2, 0, this.width / 2, this.height, color1, color2);
	}
	else{
		this.bg_img.x = this.x;
		this.bg_img.y = this.y+SoR.GabWindowYpadd_originalSkin;
		this.bg_img.opacity = opa;
	}
}

SoR_GabWindow.prototype.CalcLength = function(){
	const x1 = this.textWidth(this._text1);
	const x2 = this._text2 == '' ? x1 : this.textWidth(this._text2);
	return x1 > x2 ? x1 : x2;
}
SoR_GabWindow.prototype.CalcDuration = function(){
	const x1 = this.textWidth(this._text1);
	const x2 = this.textWidth(this._text2);
	const base = this.textWidth('００００００００００００００００００００');
	const time = (x1+x2)/base;
	
	return time > 1.0 ? Math.floor(SoR.GabWindow_baseDuration*time) : SoR.GabWindow_baseDuration; 
}

SoR_GabWindow.prototype.GetFaceSprite = function(id){
	const fname = $dataActors[id].faceName;
	const fidx  = $dataActors[id].faceIndex;
	const img = ImageManager.loadFace(fname);
	let Face_spr = new Sprite(img);	

    const pw = ImageManager.faceWidth;
    const ph = ImageManager.faceHeight;
	
	const upp = SoR.ActorFaceRect_U;
	const low = SoR.ActorFaceRect_L;
	if(SoR.ActorFaceRect_U <= -1) upp = 0;	
	if(SoR.ActorFaceRect_L <= -1 || SoR.ActorFaceRect_L > Window_Base._faceHeight) low = ph;
    
	const drawarea = Math.abs(upp-low);
	Face_spr.setFrame((fidx%4) * pw, Math.floor(fidx/4)*ph+upp, pw, drawarea);
	Face_spr.scale.x = SoR.scaleX_Face_default;
	Face_spr.scale.y = SoR.scaleY_Face_default;
	Face_spr.anchor.x = 0.5;
	Face_spr.anchor.y = 0.5;
	Face_spr.x = this.x+SoR.FaceXPosition;
	Face_spr.y = this.y+SoR.FaceYPosition;
	
	return Face_spr;
}

}());