
/*:ja
 * @target MZ
 * @plugindesc スクリプト内に移動ルートを記述
 * @author わし
 *
 * 
 * @param move_save
 * @type variable
 * @text 変数　移動タイプを保存しておく
 * @desc 
 * @default 28
 * 
 * @param org_dir
 * @type variable
 * @text 変数　元向いていた方向
 * @desc 
 * @default 29
 * 
 * @param road_move
 * @type switch
 * @text スイッチ　動作再開の必要があるなら
 * @desc 
 * @default 30
 * 
 * 
 * @command road_moveType
 * @text 動作再開
 * @desc 
 * 
 * @command turn_to_p
 * @text 動作：停止してプレイヤーの方を向く
 * @desc 
 * 
 * @command turn
 * @text 動作：元の向きに戻る
 * @desc 
 * 
 * 
 * @command move
 * @text 動作指定
 * @desc 指定したイベントに指定した動作を実行させます
 * 
 * @arg ev_id
 * @text イベントID
 * @desc 実行するイベントIDです
 * @default 0
 * @type number
 * 
 * @arg type
 * @text 動作タイプ
 * @desc 動作タイプ
 * @default 停止
 * @type select
 * @option 停止
 * @value 停止
 * @option 停止してプレイヤーの方を向く
 * @value 停止してプレイヤーの方を向く
 * @option ジャンプ
 * @value ジャンプ
 * @option 回転
 * @value 回転
 * @option ブルブル 
 * @value ブルブル
 * @option 横揺れ
 * @value 横揺れ
 * @option 千鳥足（フラフラ歩く）
 * @value 千鳥足
 * @option フラフラ（寝起きなど）
 * @value フラフラ
 * @option 体操
 * @value 体操
 * @option ランダム
 * @value ランダム
 * @option 掃除
 * @value 掃除
 * @option ご機嫌ターン
 * @value ご機嫌ターン
 * @option 自販機前でカサカサ
 * @value 自販機前でカサカサ
 * @option あたふたジャンプ
 * @value あたふたジャンプ
 * @option 押し合い・向かって左
 * @value 押し合い・左
 * @option 押し合い・向かって右
 * @value 押し合い・右
 * @option 飛びかかり・向かって左
 * @value 飛びかかり・左
 * @option 飛びかかり・向かって右
 * @value 飛びかかり・右
 * @option サイキック
 * @value サイキック
 * @option 左向いてハッスルジャンプ
 * @value 左向いてハッスルジャンプ
 * @option 興奮ジャンプ
 * @value 興奮ジャンプ
 * 
 * @option 左ににじりよる(-x方向にオフセット)
 * @value 左ににじりよる
 * @option 右ににじりよる(x方向にオフセット)
 * @value 右ににじりよる
 * @option 上にオフセット
 * @value 上にオフセット
 * @option 下にオフセット
 * @value 下にオフセット
 * 
 * @option 上下反転
 * @value 上下反転
 *
 * @option ドア・開く（効果音内蔵）
 * @value ドア・開く
 * @option ドア・閉じる（効果音内蔵）
 * @value ドア・閉じる
 * @option すり抜け前進（ドアなどを進ませる時）
 * @value すり抜け前進
 * 
 * @help
 *
 * スクリプト 内に移動ルートを直接記述しています
 * 関数(イベントID,ムーブタイプ）
 * 注意としては　動作完了までウェイト　っていうのができんことです
 * 
 *
 */

(() => {
    'use strict';

    //let parameters = PluginManager.parameters('ish_common_move');//
    const script = "ish_common_move";
    const parameters = PluginManager.parameters(script);
    const parameters_other = PluginManager.parameters('ish_time_event');

    let moving = '';
    let evv = 0;
    let prop_dir = 'orignar_dir';//プロパティ名

    const save = Number(parameters['move_save'] || 1);
    const org_dir = Number(parameters['org_dir'] || 1);
    const s_road = Number(parameters['road_save'] || 1); //　動作ロードスイッチ　（オフなら実行しないってことだぜ）

    const v_evId = Number(parameters_other['call_ev_Id'] || 5);
    const head = 'ev_'; //プロパティの接頭語

   

//動作再開
PluginManagerEx.registerCommand(document.currentScript, "road_moveType", args => {
    road_move();
});

//プレイヤーの方を向く
PluginManagerEx.registerCommand(document.currentScript, "turn_to_p", args => {
    turn_to_player();
});

//元の向きに戻る
PluginManagerEx.registerCommand(document.currentScript, "turn", args => {
    pre_road_turn();
});


PluginManagerEx.registerCommand(document.currentScript, "move", args => {
        evv = String(args.ev_id)
        moving = String(args.type);
        //console.log(`[${evv}]:${moving}`); 指定間違えなければ　動きました。@value　がキモでした。はよ教えてくれや〜
        Game_Map.prototype.move_common(evv,moving);
});




    function Game_Move() {
        this.initialize(...arguments);
    }
    
    Game_Move.prototype.initialize = function() {
        this._move= '';
        this._testMode = false;
    };



let save_move = (ev,type) => {
    $gameVariables.value(save)[head + ev] = type; //力技で　別のプラグインから初期化しとる
    //console.log(`[${ev}]:${type}　(動作保存)`)
};// 移動ルートプラグインの方にこれをぶちこむ必要があるよな？
 

let pre_road_turn = () => { //この段階では方向だけを変えたいのですが？？？
    let ev = $gameVariables.value(v_evId);
    if ($gameSwitches.value(s_road)) { //中断しました！という意味のスイッチがONの場合実行
        let dir = $gameVariables.value(org_dir);
        if (dir) {
            only_turn(dir,ev)
        }; //プロパティ使ったら　ゲームロードのたびリセットされて？　奇妙なことになった……素直に変数を使うぜ
    };
    $gameVariables._data[org_dir] = 0; 
};

let road_move = () => {
    let ev = $gameVariables.value(v_evId);
    let type = $gameVariables.value(save)[head + ev]
    if (!type) {type = '停止'}; //指定してなかったら　停止　ということにならんか？

    if ($gameSwitches.value(s_road)) { //中断しました！という意味のスイッチがONの場合　再開する。 
        //console.log(`動作再開　[${ev}]:${type}`)
        Game_Map.prototype.move_common(ev,type,true)
    };
    $gameSwitches._data[s_road] = false; 
};



let only_turn = (dir,evId) => {
    let data_ev = $gameMap._events[evId];

    let code = 0;
    switch (dir) {
        case 2:
            code = 16;
            break;
        case 8:
            code = 19;
            break;
        case 4:
            code = 17;
            break;
        case 6:
            code = 18;
            break;
    };
    //console.log(`[${dir}]を向いてくださいね`)

    let turn = {"skippable":false,"repeat":false,"list":[ //
        {'code':36},//向き固定OFF
        {"code":code},//方向転換
        {'code':0} ]
        };  

    data_ev.forceMoveRoute(turn); 
};



let turn_to_player = () => { //停止して主人公の方を見る
    let ev = $gameVariables.value(v_evId);
    let dir = $gameMap._events[ev]['_direction']; //画像の方向　これ？
    $gameVariables._data[org_dir] = dir;

    console.log(`[${ev}]動作中断中`)
    $gameSwitches._data[s_road] = true; //中断しました！という意味のスイッチ
    Game_Map.prototype.move_common(ev,'停止してプレイヤーの方を向く',true)
}; //ノールックプラグインを入れると……　振り向いたあとどうやって元の向きに戻すか？が問題になるのです……。




    Game_Map.prototype.move_common = function(evId,type,road = false) { 
        let ev = 0;

        if (evId == -1) { //-1　なら移動対象：プレイヤー
            ev = $gamePlayer;

        } else if (evId == 0) {
            let g = $gameVariables.value(v_evId);
            ev = $gameMap._events[g];
        
        } else {
            ev = $gameMap._events[evId]
        }
        
        if (evId > 0 && !road) {save_move(evId,type)}; //動作保存

        set_move(ev,type);//動作
    };

    let set_move =(ev,type) => {
        switch (type) {
            case 'stop':
            case '停止':
                ev.forceMoveRoute(move_stop); //引数で直接タイプ指定とかは無理そうかも
                break;

            case '停止してプレイヤーの方を向く':
                ev.forceMoveRoute(move_turn_to_player);
                break;

            case '左ににじりよる':
                ev.forceMoveRoute(move_lean_left);
                break;

            case '右ににじりよる':
                ev.forceMoveRoute(move_lean_right);
                break;

            case '上にオフセット':
                    ev.forceMoveRoute(move_offset_up);
                break;

            case '下にオフセット':
                    ev.forceMoveRoute(move_offset_down);
            break;

            case '上下反転':
                    ev.forceMoveRoute(move_flip);
            break;

            case 'random':
            case 'ランダム':
                ev.forceMoveRoute(move_random);
                break;

            case 'exite':
            case '興奮ジャンプ':
                ev.forceMoveRoute(move_exite);
                break;

            case 'good_turn':
            case 'ご機嫌ターン':
                ev.forceMoveRoute(move_good_turn);
                break;

            case 'gym':
            case '体操':
                ev.forceMoveRoute(move_gym);
                break;

            case 'ブルブル':
                ev.forceMoveRoute(move_tremble);
                break;

            case '横揺れ':
                ev.forceMoveRoute(move_roll);
                break;

            case '千鳥足':
                ev.forceMoveRoute(move_walk_drunkenly);
                break;

            case 'フラフラ':
                ev.forceMoveRoute(move_idleness);
                break;

            case 'wander':
            case '自販機前でカサカサ':
                ev.forceMoveRoute(move_wander);
                break;

            case 'hustle_left':
            case '左向いてハッスルジャンプ':
                ev.forceMoveRoute(move_hustle_left);
                break;

            case 'atafuta':
            case 'あたふたジャンプ':
                ev.forceMoveRoute(move_atafuta);
                break;
            
            case 'jump':
            case 'ジャンプ':
                ev.forceMoveRoute(move_jump);
                break;

            case 'normal_turn':
            case '回転':
                ev.forceMoveRoute(move_normal_turn);
                break;

            case 'kenak_L':
            case '押し合い・左':
                ev.forceMoveRoute(move_quarrel_left);
                break;

            case 'kenka_R':
            case '押し合い・右':
                ev.forceMoveRoute(move_quarrel_right);
                break;

            case '飛びかかり・左':
                ev.forceMoveRoute(move_combat_left);
                break;

            case '飛びかかり・右':
                ev.forceMoveRoute(move_combat_right);
                break;

            case 'cleaning':
            case '掃除':
                ev.forceMoveRoute(move_cleaning);
                break;

            case 'サイキック':
                ev.forceMoveRoute(move_psychic);
                break;

            case 'ドア・開く':
                ev.forceMoveRoute(move_door_open);
                break;
            
            case 'ドア・閉じる':
                ev.forceMoveRoute(move_door_close);
                break;
            
            case 'すり抜け前進':
                ev.forceMoveRoute(move_slip_through);
                break;
            
            default:
                console.log(`[move type:${type}]は設定されてないよ`);
                break;

        };
    }; // $gameMap.move_common(,'');  引数（イベントID、ムーブタイプ）




    let move_stop = {"skippable":false,"repeat":false,"list":[ //歩行アニメを止める
        {'code':32},
        {'code':36},//向き固定OFF
        {'code':33},//足踏みON
        {"code":45,"parameters":["this.setOffsets(0,0);"]},　//スクリプト　座標オフセットクリア
        {"code":45,"parameters":["this.setAngle(0);"]},　//スクリプト　画像の回転リセット
        {"code":45,"parameters":["this.resetUpSideDown();"]},　//スクリプト 　反転終了
        {'code':0} ]
        };   

let move_turn_to_player = {"skippable":false,"repeat":false,"list":[ //停止してプレイヤーの方を向く
        {'code':36},//向き固定OFF
        {'code':32},//歩行アニメOFF
        {"code":25},//主人公の方を向く
        {'code':0} ]
        };  

        
    let move_flip = {"skippable":false,"repeat":false,"list":[ //上下反転
        {'code':34},//足踏みoff
        {"code":45,"parameters":["this.setUpSideDown();"]},　//スクリプト    
        {'code':0} ]
    }; 

    let move_offset_up = {"skippable":false,"repeat":false,"list":[ //上にオフセット
        {"code":45,"parameters":["this.setOffsets(0,-20);"]},　//スクリプト　座標オフセット 
        {'code':0} ]
    }; 

    let move_offset_down = {"skippable":false,"repeat":false,"list":[ //下にオフセット
        {"code":45,"parameters":["this.setOffsets(0,20);"]},　//スクリプト　座標オフセット 
        {'code':0} ]
    }; 
        
            


    let move_down_2steps = {"skippable":true,"repeat":false,"list":[ ///イベントスクリプト で動作を書きたいテスト　　→できたよ！！！！
        {"code":44,"parameters":[{"name":"Jump1","volume":50,"pitch":100,"pan":0}]},
        {"code":45,"parameters":["this.balloon(1, false);"]},　//スクリプト 
        {'code':1},{'code':1},//下に二歩移動
        {'code':0} ]
        };


    let move_roll = {"skippable":true,"repeat":true,"list":[ //横揺れ
        {"code":44,"parameters":[{"name":"Cursor1","volume":10,"pitch":70,"pan":0}]},//効果音
        {"code":45,"parameters":["this.setOffsets(0,0);"]},　//スクリプト　画像のオフセット 
        {'code':15,"parameters":[20]}, //20F　ウェイト

        {"code":45,"parameters":["this.setOffsets(3,0);"]},　//スクリプト　画像のオフセット 
        {'code':15,"parameters":[2]}, //ウェイト
        
        {"code":45,"parameters":["this.setOffsets(4,0);"]},　//スクリプト　画像のオフセット 
        {'code':15,"parameters":[2]}, //ウェイト

        {"code":45,"parameters":["this.setOffsets(5,0);"]},　//スクリプト　画像のオフセット 
        {'code':15,"parameters":[2]}, //ウェイト
        
        {"code":45,"parameters":["this.setOffsets(3,0);"]},　//スクリプト　画像のオフセット 
        {'code':15,"parameters":[2]}, //ウェイト

        {"code":45,"parameters":["this.setOffsets(1,0);"]},　//スクリプト　画像のオフセット 
        {'code':15,"parameters":[2]}, //ウェイト    
        {'code':0} ]
    };


    let move_tremble = {"skippable":true,"repeat":true,"list":[ //ガタガタ震える
        {'code':34},//足踏みoff
        {"code":44,"parameters":[{"name":"VSQSE_0677_koto_3","volume":15,"pitch":60,"pan":0}]},//効果音
        
        {"code":45,"parameters":["this.moveOffsets(1,0);"]},　//スクリプト　画像のオフセットのオフセット
        {'code':15,"parameters":[1]}, //ウェイト
        {"code":45,"parameters":["this.moveOffsets(1,0);"]},　//スクリプト　画像のオフセットのオフセット
        {'code':15,"parameters":[1]}, //ウェイト

        {"code":45,"parameters":["this.moveOffsets(-1,0);"]},　//スクリプト　画像のオフセットのオフセット
        {'code':15,"parameters":[1]}, //ウェイト
        {"code":45,"parameters":["this.moveOffsets(-1,0);"]},　//スクリプト　画像のオフセットのオフセット
        {'code':15,"parameters":[1]}, //ウェイト

        {'code':0} ]
    };

    let move_walk_drunkenly = {"skippable":true,"repeat":true,"list":[ //フラフラ歩く　千鳥足
        {"code":44,"parameters":[{"name":"Cursor1","volume":10,"pitch":70,"pan":0}]},//効果音
        {'code':9},//ランダムに移動

        {"code":45,"parameters":["this.setAngle(4);"]},　//スクリプト　画像の回転
        {'code':15,"parameters":[3]}, //ウェイト

        {"code":45,"parameters":["this.setAngle(2);"]},　//スクリプト　画像の回転
        {'code':15,"parameters":[2]}, //ウェイト

        {"code":45,"parameters":["this.setAngle(0);"]},　//スクリプト　画像の回転
        {'code':15,"parameters":[1]}, //ウェイト

        {"code":45,"parameters":["this.setAngle(-4);"]},　//スクリプト　画像の回転
        {'code':15,"parameters":[2]}, //ウェイト

        {"code":45,"parameters":["this.setAngle(-2);"]},　//スクリプト　画像の回転
        {'code':15,"parameters":[3]}, //ウェイト

        {'code':0} ]
    };

    let move_idleness = {"skippable":true,"repeat":true,"list":[ //寝起きなどで頭がフラフラしている
        {"code":45,"parameters":["this.setOffsets(0,0);"]},　//スクリプト　座標オフセットクリア

        {"code":45,"parameters":["this.setAngle(0);"]},　//スクリプト　画像の回転
        {'code':15,"parameters":[40]}, //ウェイト

        {"code":45,"parameters":["this.setAngle(5);"]},　//スクリプト　画像の回転
        {'code':15,"parameters":[3]}, //ウェイト

        {"code":45,"parameters":["this.setAngle(3);"]},　//スクリプト　画像の回転
        {'code':15,"parameters":[2]}, //ウェイト

        {"code":45,"parameters":["this.setAngle(0);"]},　//スクリプト　画像の回転
        {'code':15,"parameters":[40]}, //ウェイト

        {"code":45,"parameters":["this.setAngle(-5);"]},　//スクリプト　画像の回転
        {'code':15,"parameters":[2]}, //ウェイト

        {"code":45,"parameters":["this.setAngle(-3);"]},　//スクリプト　画像の回転
        {'code':15,"parameters":[3]}, //ウェイト

        {'code':0} ]
    };



    let move_psychic = {"skippable":true,"repeat":true,"list":[ //超能力者っぽい円運動
        {"code":44,"parameters":[{"name":"Raise2","volume":45,"pitch":80,"pan":0}]},//効果音
        {'code':34},//足踏みoff
        
        {"code":45,"parameters":["this.setOffsets(-1,-5);"]},　//スクリプト　画像のオフセット 
        {'code':15,"parameters":[2]}, //ウェイト
        {"code":45,"parameters":["this.setOffsets(1,-5);"]},　//スクリプト　画像のオフセット 
        {'code':15,"parameters":[2]}, //ウェイト

        {"code":45,"parameters":["this.moveOffsets(1,1);"]},　//スクリプト　画像のオフセットのオフセット
        {'code':15,"parameters":[2]}, //ウェイト
        {"code":45,"parameters":["this.moveOffsets(1,1);"]},
        {'code':15,"parameters":[2]}, 

        {"code":45,"parameters":["this.setOffsets(5,-1);"]},　//スクリプト　画像のオフセット 
        {'code':15,"parameters":[2]}, //ウェイト
        {"code":45,"parameters":["this.setOffsets(5,1);"]},　//スクリプト　画像のオフセット 
        {'code':15,"parameters":[2]}, //ウェイト

        {"code":45,"parameters":["this.moveOffsets(-1,1);"]},　//スクリプト　画像のオフセットのオフセット
        {'code':15,"parameters":[2]}, //ウェイト
        {"code":45,"parameters":["this.moveOffsets(-1,1);"]},
        {'code':15,"parameters":[2]}, 

        {"code":45,"parameters":["this.setOffsets(1,5);"]},　//スクリプト　画像のオフセット 
        {'code':15,"parameters":[2]}, //ウェイト
        {"code":45,"parameters":["this.setOffsets(-1,5);"]},　//スクリプト　画像のオフセット 
        {'code':15,"parameters":[2]}, //ウェイト

        {"code":45,"parameters":["this.moveOffsets(-1,-1);"]},　//スクリプト　画像のオフセットのオフセット
        {'code':15,"parameters":[2]}, //ウェイト
        {"code":45,"parameters":["this.moveOffsets(-1,-1);"]},
        {'code':15,"parameters":[2]}, 

        {"code":45,"parameters":["this.setOffsets(-5,1);"]},　//スクリプト　画像のオフセット 
        {'code':15,"parameters":[2]}, //ウェイト
        {"code":45,"parameters":["this.setOffsets(-5,-1);"]},　//スクリプト　画像のオフセット 
        {'code':15,"parameters":[2]}, //ウェイト

        {"code":45,"parameters":["this.moveOffsets(1,-1);"]},　//スクリプト　画像のオフセットのオフセット
        {'code':15,"parameters":[2]}, //ウェイト
        {"code":45,"parameters":["this.moveOffsets(1,-1);"]},
        {'code':15,"parameters":[2]}, 

        {'code':0} ]
    };

    let move_lean_left = {"skippable":false,"repeat":false,"list":[ //左ににじりよる
        {"code":45,"parameters":["this.moveOffsets(-2,0);"]},　//スクリプト　画像のオフセットのオフセット
        {'code':15,"parameters":[2]}, //ウェイト
        {"code":45,"parameters":["this.moveOffsets(-2,0);"]},
        {'code':15,"parameters":[2]}, 
        {"code":45,"parameters":["this.moveOffsets(-2,0);"]},
        {'code':15,"parameters":[2]}, 

        {'code':0} ]
    };

    let move_lean_right = {"skippable":false,"repeat":false,"list":[ //右ににじりよる
        {"code":45,"parameters":["this.moveOffsets(2,0);"]},　//スクリプト　画像のオフセットのオフセット
        {'code':15,"parameters":[2]}, //ウェイト
        {"code":45,"parameters":["this.moveOffsets(2,0);"]},
        {'code':15,"parameters":[2]}, 
        {"code":45,"parameters":["this.moveOffsets(2,0);"]},
        {'code':15,"parameters":[2]}, 

        {'code':0} ]
    };


    let move_exite = {"skippable":true,"repeat":true,"list":[  //興奮　4回効果音を変えながらランダムな方向をむいてジャンプ
        {'code':24},{'code':14,"parameters":[0,0]}, //ランダムに方向転換、ジャンプ
        {"code":44,"parameters":[{"name":"Jump2","volume":45,"pitch":100,"pan":0}]},//効果音
        {'code':15,"parameters":[20]}, //20F　ウェイト

        {'code':24},{'code':14,"parameters":[0,0]}, //ランダムに方向転換、ジャンプ
        {"code":44,"parameters":[{"name":"Miss","volume":45,"pitch":120,"pan":0}]},//効果音
        {'code':15,"parameters":[20]}, //20F　ウェイト

        {'code':24},{'code':14,"parameters":[0,0]}, //ランダムに方向転換、ジャンプ
        {"code":44,"parameters":[{"name":"Blow6","volume":45,"pitch":80,"pan":0}]},//効果音
        {'code':15,"parameters":[20]}, //20F　ウェイト

        {'code':24},{'code':14,"parameters":[0,0]}, //ランダムに方向転換、ジャンプ
        {"code":44,"parameters":[{"name":"Thunder3","volume":45,"pitch":100,"pan":0}]},//効果音
        {'code':15,"parameters":[20]}, //20F　ウェイト
        {'code':0} ]
        };

    let move_good_turn = {"skippable":true,"repeat":true,"list":[ //ご機嫌ターン　シャキーン系の音と共にターン
        {'code':15,"parameters":[30]}, //ウェイト
        {"code":44,"parameters":[{"name":"Flash2","volume":45,"pitch":100,"pan":0}]},//効果音
        {'code':14,"parameters":[0,0]}, //ジャンプ

        {'code':20},{'code':15,"parameters":[2]}, //右回転、ウェイト 
        {'code':20},{'code':15,"parameters":[2]}, //右回転、ウェイト 
        {'code':20},{'code':15,"parameters":[2]}, //右回転、ウェイト 
        {'code':20},{'code':15,"parameters":[2]}, //右回転、ウェイト 

        {"code":44,"parameters":[{"name":"Jump2","volume":45,"pitch":100,"pan":0}]},//効果音
        {'code':14,"parameters":[0,0]}, //ジャンプ
        {'code':0} ]
     };

    let move_gym = {"skippable":true,"repeat":true,"list":[ //体操
        {"code":44,"parameters":[{"name":"Knock","volume":30,"pitch":140,"pan":0}]},//効果音
        {'code':20},{'code':15,"parameters":[5]}, //右回転、ウェイト

        {"code":44,"parameters":[{"name":"Knock","volume":30,"pitch":140,"pan":0}]},//効果音
        {'code':20},{'code':15,"parameters":[5]}, //右回転、ウェイト

        {"code":44,"parameters":[{"name":"Knock","volume":30,"pitch":140,"pan":0}]},//効果音
        {'code':20},{'code':15,"parameters":[5]}, //右回転、ウェイト

        {"code":44,"parameters":[{"name":"Knock","volume":30,"pitch":140,"pan":0}]},//効果音
        {'code':20},{'code':15,"parameters":[5]}, //右回転、ウェイト

        {"code":44,"parameters":[{"name":"Jump1","volume":45,"pitch":100,"pan":0}]},//効果音
        {'code':14,"parameters":[0,0]}, //ジャンプ
        {'code':15,"parameters":[15]}, //ウェイト

        {"code":44,"parameters":[{"name":"Jump1","volume":45,"pitch":100,"pan":0}]},//効果音
        {'code':14,"parameters":[0,0]}, //ジャンプ
        {'code':15,"parameters":[15]}, //ウェイト
        {'code':0} ]
    };

    let move_wander = {"skippable":true,"repeat":true,"list":[  //自販機の前でウロウロ悩む
        {"code":44,"parameters":[{"name":"Sword3","volume":45,"pitch":150,"pan":0}]},//効果音
        {'code':3},{'code':19}, //右に移動、上を向く
        {'code':15,"parameters":[60]}, //ウェイト

        {"code":44,"parameters":[{"name":"Sword3","volume":45,"pitch":150,"pan":0}]},//効果音
        {'code':2},{'code':19}, //左に移動、上を向く
        {'code':15,"parameters":[60]}, //ウェイト
        {'code':0} ]
     };

    let move_hustle_left = {"skippable":false,"repeat":true,"list":[  //左を向いて斜め上下にハッスルジャンプ
        {'code':35}, //向き固定
        {'code':14,"parameters":[-1,-1]}, //ジャンプ
        {"code":44,"parameters":[{"name":"Jump2","volume":45,"pitch":100,"pan":0}]},//効果音
        {'code':15,"parameters":[10]}, //ウェイト

        {'code':14,"parameters":[1,1]}, //ジャンプ
        {"code":44,"parameters":[{"name":"Jump1","volume":45,"pitch":130,"pan":0}]},//効果音
        {'code':15,"parameters":[10]}, //ウェイト

        {'code':14,"parameters":[-1,1]}, //ジャンプ
        {"code":44,"parameters":[{"name":"Jump2","volume":45,"pitch":100,"pan":0}]},//効果音
        {'code':15,"parameters":[10]}, //ウェイト

        {'code':14,"parameters":[1,-1]}, //ジャンプ
        {"code":44,"parameters":[{"name":"Miss","volume":45,"pitch":120,"pan":0}]},//効果音
        {'code':36}, //向き固定解除
        {'code':15,"parameters":[10]}, //ウェイト
        {'code':0} ]
    };

    let move_atafuta = {"skippable":true,"repeat":true,"list":[ //あたふた
        {'code':14,"parameters":[0,0]}, //ジャンプ
        {'code':15,"parameters":[60]}, //ウェイト
        {'code':18},{'code':15,"parameters":[5]}, //右を向く、ウェイト
        {'code':17},{'code':15,"parameters":[5]}, //左を向く、ウェイト
        {'code':16},//下を向く
        {'code':0} ]
    };
    
let move_jump = {"skippable":true,"repeat":true,"list":[ //普通のジャンプ
    {"code":45,"parameters":["this.setOffsets(0,0);"]},　//スクリプト　座標オフセットクリア
    {'code':14,"parameters":[0,0]}, //ジャンプ
    {"code":44,"parameters":[{"name":"Jump1","volume":45,"pitch":110,"pan":0}]},//効果音
    {'code':15,"parameters":[30]}, //ウェイト
    {'code':0} ]
    }; 
       
let move_normal_turn = {"skippable":true,"repeat":true,"list":[ //普通の回転
    {'code':21},//左に回転
    {"code":44,"parameters":[{"name":"Cursor1","volume":10,"pitch":70,"pan":0}]},//効果音
    {'code':15,"parameters":[20]}, //ウェイト

    {'code':21},//左に回転
    {"code":44,"parameters":[{"name":"Cursor1","volume":10,"pitch":80,"pan":0}]},//効果音
    {'code':15,"parameters":[20]}, //ウェイト

    {'code':21},//左に回転
    {"code":44,"parameters":[{"name":"Cursor1","volume":10,"pitch":70,"pan":0}]},//効果音
    {'code':15,"parameters":[20]}, //ウェイト

    {'code':21},//左に回転
    {"code":44,"parameters":[{"name":"Cursor1","volume":10,"pitch":80,"pan":0}]},//効果音
    {'code':15,"parameters":[20]}, //ウェイト
    {'code':0} ]
 };   
    
let move_quarrel_left = {"skippable":false,"repeat":true,"list":[ //押し合い・向かって左　あんまやり合ってる感ないけど……
    {'code':35},//向き固定
    {"code":44,"parameters":[{"name":"Blow4","volume":45,"pitch":130,"pan":0}]},//効果音
    {'code':3},//右に移動
    {'code':15,"parameters":[30]}, //ウェイト

    {'code':2},//左に移動
    {'code':36},//向き固定OFF
    {'code':15,"parameters":[30]}, //ウェイト
    {'code':0} ]
};   
    
 let move_quarrel_right = {"skippable":false,"repeat":true,"list":[ //押し合い・向かって右　あんまやり合ってる感ないけど……
    {'code':35},//向き固定
    {'code':3},//右に移動
    {'code':15,"parameters":[30]}, //ウェイト
    
    {"code":44,"parameters":[{"name":"Blow3","volume":45,"pitch":90,"pan":0}]},//効果音
    {'code':2},//左に移動
    {'code':36},//向き固定OFF
    {'code':15,"parameters":[30]}, //ウェイト
    {'code':0} ]
}; 

let move_combat_left = {"skippable":false,"repeat":true,"list":[ //飛びかかり・向かって左
    {'code':18},{'code':35},//右を向く、向き固定
    {'code':2},//左に移動
    {'code':15,"parameters":[10]}, //ウェイト
    {'code':14,"parameters":[1,0]}, //右にジャンプ
    {"code":44,"parameters":[{"name":"Blow5","volume":45,"pitch":90,"pan":0}]},//効果音

    {'code':0} ]
}; 

let move_combat_right = {"skippable":false,"repeat":true,"list":[ //飛びかかり・向かって右
    {'code':14,"parameters":[-1,0]}, //左にジャンプ
    {"code":44,"parameters":[{"name":"Blow3","volume":45,"pitch":90,"pan":0}]},//効果音
    {'code':35},//向き固定
    {'code':3},//右に移動
    {'code':15,"parameters":[10]}, //ウェイト
    {'code':0} ]
}; 
     


let move_cleaning = {"skippable":true,"repeat":true,"list":[ //ランダムに動いて床をはく　なぜか通行出来んところに打っ込むんだけど　なぜよ？
    {'code':9},//ランダムに移動
    {'code':20},//右に回転
    {'code':15,"parameters":[5]}, //ウェイト
    {'code':21},//左に回転
    {"code":44,"parameters":[{"name":"Absorb1","volume":45,"pitch":140,"pan":0}]},//効果音
    {'code':15,"parameters":[60]}, //ウェイト
    {'code':0} ]
 };   

        
let move_random = {"skippable":true,"repeat":true,"list":[ //ランダム移動　時折ジャンプ
    {"code":44,"parameters":[{"name":"Cursor1","volume":10,"pitch":70,"pan":0}]},//効果音
    {'code':9},//ランダムに移動
    {"code":44,"parameters":[{"name":"Cursor1","volume":10,"pitch":80,"pan":0}]},//効果音
    {'code':15,"parameters":[10]}, //ウェイト

    {"code":44,"parameters":[{"name":"Cursor1","volume":10,"pitch":70,"pan":0}]},//効果音
    {'code':9},//ランダムに移動
    {"code":44,"parameters":[{"name":"Cursor1","volume":10,"pitch":80,"pan":0}]},//効果音

    {'code':22},//180度回転
    {'code':14,"parameters":[0,0]}, //ジャンプ
    {"code":44,"parameters":[{"name":"Jump2","volume":45,"pitch":90,"pan":0}]},//効果音
    {'code':15,"parameters":[30]}, //ウェイト
    {'code':0} ]
};   


let move_door_open = {"skippable":false,"repeat":false,"list":[ //ドアが開く
    {"code":30, "parameters":[10]}, //移動頻度
    {"code":30, "parameters":[10]},//移動速度
    {"code":44,"parameters":[{"name":"Door3","volume":45,"pitch":100,"pan":0}]},//効果音
    {'code':36},//向き固定解除
    {'code':17},{'code':15,"parameters":[1]}, ////左を向く,ウェイト
    {'code':18},{'code':15,"parameters":[1]},//右を向く
    {'code':19},{'code':15,"parameters":[1]},//上を向く
    {'code':35},//向き固定

    //{"code":45,"parameters":["this.setPriorityType(1);"]},　//スクリプト プライオリティ変更
    {'code':0} ]
};   


let move_door_close = {"skippable":false,"repeat":false,"list":[ //ドアが閉じる
    {"code":30, "parameters":[10]}, //移動頻度
    {"code":30, "parameters":[10]},//移動速度
    {'code':36},//向き固定解除
    {'code':18},{'code':15,"parameters":[1]}, ////右を向く,ウェイト
    {'code':17},{'code':15,"parameters":[1]},//左を向く
    {'code':16},{'code':15,"parameters":[1]},//下を向く
    {"code":44,"parameters":[{"name":"Door3","volume":45,"pitch":100,"pan":0}]},//効果音
    {'code':35},//向き固定
    
    //{"code":45,"parameters":["this.setPriorityType(1);"]},　//スクリプト プライオリティ変更
    {'code':0} ]
};   

let move_slip_through = {"skippable":false,"repeat":false,"list":[ //すり抜け前進
    {"code":44,"parameters":[{"name":"Move1","volume":45,"pitch":100,"pan":0}]},//効果音
    {"code":30, "parameters":[50]},//移動速度
    {'code':37},//すり抜けON
    {'code':12},//一歩前進
    {'code':38},//すり抜けOFF
    {'code':12},//一歩前進
    {"code":30, "parameters":[5.5]},//移動速度
    {'code':0} ]
};  


})();