

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
 

    //ここから

    PluginManagerEx.registerCommand(document.currentScript, "in_home", args => {
        let evId = Number(args.evId);
        room_name = String(args.room_name);

        let che = ev_at_home(evId,room_name);
        if (che) {$gameSwitches._data[door_switch] = true
        } else {$gameSwitches._data[door_switch] = false};
    });

    PluginManagerEx.registerCommand(document.currentScript, "at_home", args => {
        room_name = String(args.room_name);

        let che = ev_in_home(room_name);
        if (che) {$gameSwitches._data[door_switch] = true
        } else {$gameSwitches._data[door_switch] = false};
    });


   //設定しやすさの関係でプラグインコマンド使うけど、別に条件分岐をする必要がある

    Game_Map.prototype.door_open = function() { //
        if ($gameSwitches.value(door_switch)) {
            $gameSwitches._data[door_switch] = false;
            return true;
        };
    }; // $gameMap.door_open()

    

    //クラス定義
    function home_room() {
        this.initialize.apply(this, arguments);
    }
     
    home_room.prototype.initialize = function() {
        this.data = $dataUniques.room_list;
    };


    //メソッド
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
    


    home_room.prototype.permission = function() { //進入条件
        const lm = this.data[this.roomNum];
        if (lm['per'] == '人がいる') { //進入可能条件　中に人がいる時：true　いない時:false
            this.per = true;
        } else {
            this.per =false;
        };
        return this;
    };


   home_room.prototype.check_player_in_room = function() {  //主人公が部屋の中（指定座標内）にいるか
        this.player_in = false;
        if ($gamePlayer._realX >= this.x_min && $gamePlayer._realX <= this.x_max) {
            if ( $gamePlayer._realY >= this.y_min && $gamePlayer._realY <= this.y_max) {
                this.player_in = true;
            };
        };
        return this;
    };

    home_room.prototype.check_ev_in_home = function() { //イベントの位置を確かめる
        this.event_in = false;
        let y = 0;
        for (let cntY = this.y_min, lenY = this.y_max ; cntY <= lenY ; cntY++) {
            y = cntY;
            for (let cntX = this.x_min, lenX = this.x_max ; cntX <= lenX ; cntX++) {
                if ($gameMap.eventIdXy(cntX,y) > 0) { //イベント発見
                    let ev = $gameMap.eventIdXy(cntX,y);//ID取得
                    let key_d = [$gameMap.mapId(), ev, "D"]; //マップID　暫定　イベントのセルフスイッチD
                    let key_c = [$gameMap.mapId(), ev, "C"];

                    if($gameSelfSwitches.value(key_d) || $gameSelfSwitches.value(key_c) ){ // D:trueなら
                     this.event_in = true;
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

    let ev_in_home = (name) => {
        let iy = new home_room().room_num(name).set_room_con().permission().check_player_in_room().check_ev_in_home();
        if (iy.player_in) { //プレイヤーが内部にいる
            return true;
        } else if (iy.per && iy.event_in) { //外部、条件：人がいる　部屋：人がいる
            return true;
        } else if (!iy.per && !iy.event_in) { //外部、条件：人がいない　部屋：人がいない
            return true;
        } else {return false};
    };






})();