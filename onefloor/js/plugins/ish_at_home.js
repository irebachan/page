

/*:ja
 * @target MZ
 * @plugindesc 在宅
 * @author わし
 * 
 * 
 * 
 * @param door_switch
 * @text スイッチ　ドアの開閉許可
 * @desc スイッチ　ドアの開閉許可
 * @type switch
 * @default 9
 *  
 *
 * @help
 *
 * ドアイベントで　x_min,x_max,y_min,y_max　の間にイベントがあるか？　あったとしてメタにモブとか入ってないか？　
 * みたいなので分岐する。
 * 家に入れるタイミングをどうにかするための処理。
 * 
 *
 * 
 * 
 * @command at_home
 * @text 指定した部屋に進入できるか？
 * @desc ユニーク変数で指定した　x_min,x_max,y_min,y_max　の間にイベントがあるか？
 * 
 * @arg room_name
 * @text 部屋の名前
 * @desc 部屋の名前
 * @default 
 * @type select
 * 
 * @option 医院
 * @value 医院
 * 
 * @option メヌの店
 * @value メヌの店
 * 
 * @option 田子須の店
 * @value 田子須の店
 * 
 * @option 仲土狩家
 * @value 仲土狩家
 * 
 * @option 五人組
 * @value 五人組
 * 
 * @option はゆみ 
 * @value はゆみ 
 * 
 * @option 西トイレ
 * @value 西トイレ
 * 
 * @option 東トイレ
 * @value 東トイレ
 * 
 * 
 * 
 * @command in_home
 * @text 指定したキャラが指定した部屋にいるか？
 * @desc ユニーク変数で指定した　x_min,x_max,y_min,y_max　の間にイベントがあるか？
 * 
 * @arg evId
 * @text イベントID
 * @desc イベントID
 * @default 1
 * @type number
 * 
 * 
 * @arg room_name
 * @text 部屋の名前
 * @desc 部屋の名前
 * @default 
 * @type select
 * 
 * @option 医院
 * @value 医院
 * 
 * @option メヌの店
 * @value メヌの店
 * 
 * @option 田子須の店
 * @value 田子須の店
 * 
 * @option 仲土狩家
 * @value 仲土狩家
 * 
 * @option 五人組
 * @value 五人組
 * 
 * @option はゆみ 
 * @value はゆみ 
 * 
 * @option 西トイレ
 * @value 西トイレ
 * 
 * @option 東トイレ
 * @value 東トイレ
 *
 */

(() => {
    'use strict';

    //let parameters = PluginManager.parameters('ish_common_move');//
 
    const script = 'ish_at_home';
    const parameters = PluginManager.parameters(script);


    
//このスイッチがtrueならドアを開けられる
    const door_switch = Number(parameters['door_switch'] || 10);
   
    let room_name = '';
    let xx_min = 0;
    let xx_max = 0;
    let yy_min = 0;
    let yy_max = 0;
    let per = true;
    
  



    //ここから


    PluginManagerEx.registerCommand(document.currentScript, "in_home", args => {
        let evId = Number(args.evId);
        room_name = String(args.room_name);

        let che = ev_at_home(evId,room_name);
        if (che) {$gameSwitches._data[door_switch] = true
        } else {$gameSwitches._data[door_switch] = false};
   
    });



    PluginManager.registerCommand(script, "at_home", args => {
        room_name = String(args.room_name);
        let num = Game_Map.prototype.room_num(room_name) ;//振り分け
        const room = $dataUniques.room_list;
        //console.log(`${room_name}:${num}`)


        xx_min = Number(room[num]['x_min']);
        xx_max = Number(room[num]['x_max']);
        yy_min = Number(room[num]['y_min']);
        yy_max = Number(room[num]['y_max']);
        //進入方向は保留（縦か横かでイベントの動作が変わる）　とりあえずコモンイベント内で分岐しておく

        if (room[num]['per'] == '人がいる') { //進入可能条件　中に人がいる時：true　いない時:false
            per = true;
        } else {
            per =false;
        };

        $gameSwitches._data[door_switch] = false;//初期化？

        //console.log(`x幅：${xx_min}~${xx_max} Y幅：${yy_min}~${yy_max}`);
        //プレイヤーが部屋の中にいるならtrueが返る
        let in_home = Game_Map.prototype.player_in_home(xx_min,xx_max,yy_min,yy_max);
        if (in_home) {//プレイヤーが部屋の中にいるならtrue
            $gameSwitches._data[door_switch] = true;

        } else { //プレイヤーが部屋の外にいるなら　内部にイベントがあるか確かめる
            let at = Game_Map.prototype.at_home(xx_min,xx_max,yy_min,yy_max);
            //console.log(at)

            if (per) { //人がいる時進入可能
                if (at) { //人がいる
                    $gameSwitches._data[door_switch] = true;
                    //console.log(`人がいるそうです　${xx_min},${xx_max},${yy_min},${yy_max}`)
                };
            } else if (at == false) { //人がいない時進入可能 
                //console.log(`人がいないそうです　${xx_min},${xx_max},${yy_min},${yy_max}`)
                $gameSwitches._data[door_switch] = true; //人がいない
            }
        };
    });


    //設定しやすさの関係でプラグインコマンド使うけど、別に条件分岐をする必要がある

    Game_Map.prototype.door_open = function() { //
        if ($gameSwitches.value(door_switch)) {
            $gameSwitches._data[door_switch] = false;
            return true;
        };
    }; // $gameMap.door_open()

    

    function home_room() {
        this.initialize.apply(this, arguments);
    }
     
    home_room.prototype.initialize = function() {
        this.data = $dataUniques.room_list;
        this.possible = false;
    };

    home_room.prototype.room_num = function(name) { //部屋名を部屋番号に変換
        let num = 0;
        switch (name) {
            case '医院':
            num = 1;
            break;

            case 'メヌの店':
            num = 2;
            break;

            case '田子須の店':
            num = 3;
            break;

            case '仲土狩家':
            num = 4;
            break;

            case '五人組':
            num = 5;
            break;

            case 'はゆみ':
            num = 6;
            break;

            case '西トイレ':
            num = 7;
            break;

            case '東トイレ':
            num = 8;
            break;
        } //
        this.roomNum = num;
        return this;
    };

    home_room.prototype.set_room_con = function() { //部屋の座標をプロパティに代入
        const lm = this.data[this.roomNum];
        this.x_min = lm['x_min'];
        this.x_max = lm['x_max'];
        this.y_min = lm['y_min'];
        this.y_max = lm['y_max'];
        return this;
    }

    home_room.prototype.check_ev_room = function(evId) { //指定したイベントが指定した部屋にいるのか
        if (!evId) {
            this.atHome = false;
            return this;
        };

        if ($gameMap._events[evId]._pageIndex >= 0) { //ページインデックスが０以上　表示されてるってこと？（表示されてない時−１だから）
            let x = $gameMap._events[evId]._x;
            let y = $gameMap._events[evId]._y;
            if ( this.x_min <= x && x <= this.x_max && this.y_min <= y && y <= this.y_max) {
                this.atHome = true;
            };
        } else {
            this.atHome = false;
        };
        return this;
    };
    



   //主人公が部屋の中（指定座標内）にいる場合は無条件？で外に出られる
   home_room.prototype.player_in_home = function() {
        if ($gamePlayer._realX >= this.x_min && $gamePlayer._realX <= this.x_max) {
            if ( $gamePlayer._realY >= this.y_min && $gamePlayer._realY <= this.y_max) {
                this.possible = true;
            };
        };
        return this;
    };

    home_room.prototype.at_home = function() { //イベントの位置を確かめる
        let y = 0;
        for (let cntY = this.y_min, lenY = this.y_max ; cntY <= lenY ; cntY++) {
            y = cntY;
            for (let cntX = this.x_min, lenX = this.x_max ; cntX <= lenX ; cntX++) {
                if ($gameMap.eventIdXy(cntX,y) > 0) { //イベント発見
                    let ev = $gameMap.eventIdXy(cntX,y);//ID取得
                    let key_d = [$gameMap.mapId(), ev, "D"]; //マップID　暫定　イベントのセルフスイッチD
                    let key_c = [$gameMap.mapId(), ev, "C"];

                    if($gameSelfSwitches.value(key_d) || $gameSelfSwitches.value(key_c) ){ // D:trueなら
                     this.possible = true;
                    };
                };
            };
        };
    return this;
    }; // $gameMap.



    let ev_at_home = (evId,name) => {
        let ey = new home_room().room_num(name).set_room_con().check_ev_room(evId);
        if (ey.atHome) {
            return true;
        } else {return false};
    }






    Game_Map.prototype.room_num = function(name) { //部屋名を部屋番号に変換
        let num = 0;
        switch (name) {
            case '医院':
            num = 1;
            break;

            case 'メヌの店':
            num = 2;
            break;

            case '田子須の店':
            num = 3;
            break;

            case '仲土狩家':
            num = 4;
            break;

            case '五人組':
            num = 5;
            break;

            case 'はゆみ':
            num = 6;
            break;

            case '西トイレ':
            num = 7;
            break;

            case '東トイレ':
            num = 8;
            break;
        } //
        return num;

    };
 
    //主人公が部屋の中（指定座標内）にいる場合は無条件？で外に出られる
    Game_Map.prototype.player_in_home = function(x_min,x_max,y_min,y_max) {
        if ($gamePlayer._realX >= x_min && $gamePlayer._realX <= x_max) {
            if ( $gamePlayer._realY >= y_min && $gamePlayer._realY <= y_max) {
                return true;
            };
        };
    };


    Game_Map.prototype.at_home = function(x_min,x_max,y_min,y_max) { //イベントの位置を確かめる
        let in_ev = false;
        for (let cnt_y = 0, len_y = y_max - y_min; cnt_y <= len_y ; cnt_y++) {
            let thistime = cnt_y + y_min;

            for (let cnt_x = 0,len_x = x_max - x_min; cnt_x <= len_x ;cnt_x++) {
                //console.log(`${cnt_x + x_min},${thistime}の調査`);
                if ($gameMap.eventIdXy(cnt_x + x_min,thistime) > 0) { //イベント発見

                    let ev = $gameMap.eventIdXy(cnt_x + x_min,thistime);//ID取得
                    let key_d = [$gameMap.mapId(), ev, "D"]; //マップID　暫定　イベントのセルフスイッチD
                    let key_c = [$gameMap.mapId(), ev, "C"];

                    if($gameSelfSwitches.value(key_d) || $gameSelfSwitches.value(key_c) ){ // D:trueなら
                        in_ev = true;
                    
                    };
                };
            };
        };
        return in_ev;
    }; // $gameMap.

 





    






})();