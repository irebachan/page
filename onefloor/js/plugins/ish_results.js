

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










})();