

/*:ja
 * @target MZ
 * @plugindesc 行間変えたり　デバッグ用に接点いじったり
 * @author わし
 *
 * @help
 *
 * 行間変えたり　デバッグ用に接点いじったり
 * 
 * 
 * @command line
 * @text 文字の高さ
 * @desc 行間を設定する
 * 
 * @arg height
 * @text 文字の高さ
 * @desc ツクール のデフォは３６やで
 * @default 36
 * @type number
 * 
 * 
 * @command debug_point
 * @text 接点を操作
 * @desc 接点を操作するコマンドを出しますわよ
 * 
 * @arg value
 * @text 使用する変数
 * @desc どの変数に代入する？ 
 * @default 14
 * @type variable
 * 
 * @arg math_type
 * @text 計算する値
 * @desc 
 * @default 足し算
 * @type select
 * @option 足し算
 * @value 足し算
 * @option 引き算
 * @value 引き算
 * 
 * @arg math_value
 * @text 計算する値が入った変数
 * @desc  
 * @default 0
 * @type variable
 * 
 * 
 */

(() => {
    'use strict';


    const script = 'ish_results';
    const parameters = PluginManager.parameters(script);

    const parameters_other = PluginManager.parameters('ish_time_event');


    let talking_point = Number(parameters_other['talking_point'] || 1); //別のJSで決めたやつ　接点
    let talking_head = String(parameters_other['talking_head'] || 'com_'); //　別のJSから　プロパティの頭  


    let the_num = 0;
 
    //ここから

    PluginManager.registerCommand(script, "line", args => {
        the_num =  Number(args.height);
        set_lineHeight(the_num);
    }); ///文字の高さを変える



    PluginManager.registerCommand(script, "debug_point", args => { //接点のデバッグ用
        let num = Number(args.value);
        let math_value = Number(args.math_value)
        let math_type = String(args.math_type)

        let prop = talking_head + $gameVariables.value(num);//プロパティ名
  
        let point = 0;
        if (prop in $gameVariables.value(talking_point)) { //変数にプロパティ[prop]が存在するか？
            point = $gameVariables.value(talking_point)[prop];

            if (math_value) { //計算用変数を指定している場合
                if (math_type == '足し算') {
                    point += $gameVariables.value(math_value)
                } else { //引き算
                    point -= $gameVariables.value(math_value)
                    if (point < 0) { //0を下回ったら０を代入
                        point = 0;
                    }
                }
                $gameVariables.value(talking_point)[prop] = point;
            }


            $gameMessage.add(`[${$dataUniques.map_event[$gameVariables.value(num)]['name']}] 接点(${prop}): ${point}`);
     
        } else {
            $gameMessage.add(`そのプロパティは存在しないみたい……`);
            $gameVariables._data[num] = false; 
        }
    });




let set_lineHeight = (num) => { //行間変える関数
    const _Window_base_LineHeight = Window_Base.prototype.lineHeight;
    Window_Base.prototype.lineHeight = function() {
    _Window_base_LineHeight.apply(this, arguments);
    return num; //編集　行間　デフォ36
    };
};


const _Scene_Message_messageWindowRect = Scene_Message.prototype.messageWindowRect; //テキストボックス行を変える
    Scene_Message.prototype.messageWindowRect = function() {
    _Scene_Message_messageWindowRect.apply(this, arguments);
    const ww = Graphics.boxWidth;
    const wh = this.calcWindowHeight(2, false) + 8; //変更箇所　def:4,8
    const wx = (Graphics.boxWidth - ww) / 2;
    const wy = 0;
    return new Rectangle(wx, wy, ww, wh);
};




})();