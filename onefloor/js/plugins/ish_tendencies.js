

/*:ja
 * @target MZ
 * @plugindesc 性向　傾向
 * @author わし
 * 
 * 
 * 
 *  
 *
 * @help
 *
 * 性向ポイントを管理する。
 * TPを利用するつもりですが……。
 * 上げ下げする際にステートを付与したい。
 * 
 *
 * 
 * 
 * 
 * @command plus
 * @text 性向を+する　真面目方向
 * @desc 性向を+する　真面目方向
 * 
 * @arg point
 * @text +ポイント
 * @desc +ポイント
 * @default 1
 * @type number
 * 
 * 
 * 
 * @command minus
 * @text 性向を-する　お調子者方向
 * @desc 性向を-する　お調子者方向
 * 
 * @arg point
 * @text -ポイント
 * @desc -ポイント
 * @default 1
 * @type number
 * 
 *
 */
(() => {
    'use strict';

    //let parameters = PluginManager.parameters('ish_common_move');//
 
    const script = 'ish_tendencies';
    const parameters = PluginManager.parameters(script);



    //ここから

    PluginManagerEx.registerCommand(document.currentScript, "plus", args => {
        let num = Number(args.point);

    });

    PluginManagerEx.registerCommand(document.currentScript, "minus", args => {
        let num = Number(args.point);

    });



/*
   //設定しやすさの関係でプラグインコマンド使うけど、別に条件分岐をする必要がある

    Game_Map.prototype.door_open = function() { //
        if ($gameSwitches.value(door_switch)) {
            $gameSwitches._data[door_switch] = false;
            return true;
        };
    }; // $gameMap.door_open()
*/
    

    //クラス定義
    function tendencies() {
        this.initialize.apply(this, arguments);
    }
     
    tendencies.prototype.initialize = function() {
        this.data_states = [ //オブジェクトの配列　ステート定義
            {name:''},
            {}
        ]
    };
/*
数の定義をどうしよう？
性向の分類に使うステートを複数用意して、100(tpの最大値)を用意したステートの数で割って　どれに（？）　該当するか計算する　みたいなのは？
現在の性向によって分岐したり　そういう利用をしたいんだよ。
やや真面目、真面目　みたいな分け方をした時　どうやって使う？真面目として扱うのか？（あんまり煩雑にしたくない、分岐自体は　真面目、普通、お調子者　にまとめたい。）
そもそも何でステートとかTPとか使おうとしたかというと、そういうプラグインが利用できると思ってたからだ。


*/

    //メソッド
 
    tendencies.prototype.state = function() { //ステート変化？
        //ステートの配列
        let now = $gameActors._data[1]._states;

    };
 
   let math_tp = (plus_minus = true,point = 1) => {
       let p = point;
        if (!plus_minus) {p *= -1}; // -なら　−１をかけておく
        $gameActors.actor(1).gainTp(p) //主人公のTPを変化
   };




})();