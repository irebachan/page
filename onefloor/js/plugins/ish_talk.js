
/*:ja
 * @target MZ
 * @plugindesc 会話ぶんき　とにかく分岐
 * @author わし
 *
 * 
 * @param talking_point
 * @type variable
 * @text 変数　接点
 * @desc 会話イベントを見た回数を管理する変数 (デフォルト・24)
 * @default 24
 * 
 * @param talking_head
 * @type string
 * @text 文字列　プロパティの接頭語
 * @desc 各キャラの会話イベントを変数のプロパティで管理するに当たって、プロパティの接頭語 (デフォルト・com_)
 * @default com_
 * 
 * @param party_comment_read
 * @type switch
 * @text 会話終了スイッチ
 * @desc　パーティ会話を読んだ場合はシングル会話を出さない（時間帯に適合しても）　判断するためのスイッチ (デフォルト・10)
 * @default 10
 * 
 * 
 * 
 * @command plus
 * @text 接点を+する
 * @desc 接点を+する
 * 
 * @arg person
 * @text evId
 * @desc evId
 * @default 0
 * @type number
 * 
 * @arg point
 * @text +ポイント
 * @desc +ポイント
 * @default 1
 * @type number
 * 
 * @arg new_only
 * @text 初回のみ
 * @desc 初回のみ
 * @default true
 * @type boolean
 * 
 * 
 * 
 * @command minus
 * @text 接点を-する
 * @desc 接点を-する
 * 
 * @arg person
 * @text evId
 * @desc evId
 * @default 0
 * @type number
 * 
 * @arg point
 * @text -ポイント
 * @desc -ポイント
 * @default 1
 * @type number
 * 
 * @arg new_only
 * @text 初回のみ
 * @desc 初回のみ
 * @default true
 * @type boolean
 * 
 * 
 * @command test
 * @text テスト
 * @desc テスト
 * 
 * @help
 *
 * とにかく会話分岐したいんだよ
 *
 */


//接点計算用　オブジェクト
function Game_Talk() {
    this.initialize.apply(this, arguments);
}

/*
function Con_Talken() {
    this.initialize.apply(this, arguments);
}*/




(() => {
    'use strict';
    const script = 'ish_talk';
    const parameters = PluginManager.parameters(script);
    const parameters_other = PluginManager.parameters('ish_time_event');

    let gameHour = Number(parameters_other['value_game_hour'] || 1);  // プラグインパラメーターで指定した変数に　ゲーム内時間が入っているよ。
    let gameMinute = Number(parameters_other['value_game_minute'] || 1); //時間導入プラグインの設定に合わせてね。

    let talking_point = Number(parameters['talking_point'] || 1);
    let talking_head = String(parameters['talking_head'] || 'com_'); //　変数のプロパティを設定するときに……使うんです……   

    let party_switch = Number(parameters['party_comment_read'] || 10); //パーティ会話を読んだときは　このスイッチをONにする  $gameSwitches.value(party_switch)
   



    PluginManagerEx.registerCommand(document.currentScript, "test", args => {
        $gameSystem.ish_talk().genki();
    });


    PluginManagerEx.registerCommand(document.currentScript, "plus", args => {   
        plusminus( args.person, args.point,true,args.new_only);   
    });

    PluginManagerEx.registerCommand(document.currentScript, "minus", args => { 
        plusminus( args.person, args.point,false,args.new_only);      
    });


   // Game_System
    // プラグインのデータを保存するために
    // Game_Systemにオブジェクトを追加しておく
    // ---------- Game_System ここから ----------
    var _Game_System_initialize = Game_System.prototype.initialize;
    Game_System.prototype.initialize = function(){
	_Game_System_initialize.call(this);
    this._ish_talk = new Game_Talk();
    //this._ish_con = new Con_Talken();
    };
 
    Game_System.prototype.ish_talk = function(){
	return this._ish_talk;
    };
/*
    Game_System.prototype.ish_con = function(){
    return this._ish_con;
    };*/
    // ---------- Game_System ここまで ----------
 



    //時間チェック用クラス
    function check_time() {
        this.initialize.apply(this, arguments);
     }

    check_time.prototype.initialize = function() { //初期値
        this.nh = $gameVariables.value(gameHour);
        this.nm = $gameVariables.value(gameMinute);
    };
    
    check_time.prototype.time = function(sh,sm,eh,em) {

        this.start_time = new Date(2020, 1, 1, sh, sm, 0);
        this.end_time   = new Date(2020, 1, 1, eh, em, 0);
        this.now_time   = new Date(2020, 1, 1, this.nh, this.nm, 0);

        this._checkTime = false;
        if (start_time <= now_time && now_time < end_time) this._checkTime = true;
        return this;
    };

/*
    let checkTime = (sh = 0,sm = 0,eh = 24,em = 0) => {
        let a = new check_time().time(sh,sm,eh,em);
        if (a._checkTime) return true;}
*/
/*
  //条件クラス として使いたかった……
  Con_Talken.prototype            = Object.create(Con_Talken.prototype);
  Con_Talken.prototype.costructor = Con_Talken;

  Con_Talken.prototype.initialize = function() { //初期値
}; */

//$gameMap.checkTime() //ゲームマップに吸着させてみた……

Game_Map.prototype.checkTime = function(sh = 0,sm = 0,eh = 24,em = 0) {
    let nh = $gameVariables.value(gameHour); 
    let nm = $gameVariables.value(gameMinute); 

    let start_time = new Date(2020, 1, 1, sh, sm, 0);
    let end_time   = new Date(2020, 1, 1, eh, em, 0);
    let now_time   = new Date(2020, 1, 1, nh, nm, 0);

    if (start_time > now_time) return false;
    if (now_time >= end_time) return false

    let check = end_time - start_time;
    if (!check) {
        console.log(`！エラー：時間指定が間違ってるかも！　start:[${sh}:${sm}] end:[${eh}:${em}]`);
        return false
    };
    //if (start_time <= now_time && now_time < end_time) return true;
    return true;
}


    Game_Map.prototype.eventSelf = function(evId = 0,self = 'A'){ //イベントXのセルフスイッチYがtrueか
        if (evId == 0) evId = $gameSystem.ish_talk().evId;
        if ($gameSelfSwitches.value([$gameMap.mapId(), evId, self])) return true;
    };

    Game_Map.prototype.eventAt = function(evId = 0,x = 0,y = 0, dir = 0){ //イベントXが特定の座標にいるのか
        if (evId == 0) evId = $gameSystem.ish_talk().evId;

        if ($gameMap._events[evId]._x == x && $gameMap._events[evId]._y) {
            if (dir > 0 ){
                if (dir == $gameMap._events[evId]._direction) return true;
            } else {return true;}
        }
    };

    Game_Map.prototype.eventName = function(evId = 0,str = '') { //イベントXの通り名がYなのか
        if (evId == 0) evId = $gameSystem.ish_talk().evId;

        let data = $dataUniques.map_event;
        let name = $gameVariables.value(data[evId]['name_hensu'])
        if (name == str ) return true;
    };

    Game_Map.prototype.eventPoint = function(evId = 0,tx = 'x == 0') { //指定したイベントの接点を　文字列で指定した式で評価する
        if (evId == 0) evId = $gameSystem.ish_talk().evId;

        let point = $gameVariables.value(talking_point)[talking_head + Number(evId)];
        let str = `if (${tx}) {return true;}`;//式（文字列）

        let fun = new Function('x',str);//新しい関数だよ
        if (fun(point)) return true;
    };


    Game_Map.prototype.eventRoom = function(evId = 0,roomId = 1) {//指定したイベントが指定した部屋にいるのか
        if (evId == 0) evId = $gameSystem.ish_talk().evId;

        const rm = $dataUniques.room_list[roomId];
        if (!rm) return false;
        let {x_min,x_max,y_min,y_max} = {x_min:rm['x_min'], x_max:rm['x_max'], y_min:rm['y_min'] , y_max:rm['y_max']};

        if ($gameMap._events[evId] && $gameMap._events[evId]._pageIndex >= 0) {

            let mapX = $gameMap._events[evId]._x;
            let mapY = $gameMap._events[evId]._y;
            if (x_min <= mapX && mapX <= x_max  &&  y_min <= mapY && mapY <= y_max) return true;
        };
    };

    Game_Map.prototype.eventTalked = function(evId = 0,key = '')  {//指定したイベントが特定の話をしたあと
        if (evId == 0) evId = $gameSystem.ish_talk().evId;
        if ($gameSystem.ish_talk()._talked[evId] && $gameSystem.ish_talk()._talked[evId].includes(key)) return true;
    };
    
    Game_Map.prototype.haveItem = function(name = 0, lot = 1) { //指定したアイテムを x個数以上　所持しているか
        let list = $dataItems.filter(Boolean) ; //nullを除く処理
        let find = {}
        if (isNaN(name)) { 
            //引数が文字列＝アイテム名なら
            find = list.find(item => item.name == name);
        } else { 
            //引数が数字＝アイテムIDなら
            find = list.find(item => item.id == name);
        };
        if (!find) return false;
        if (find.id in $gameParty._items && $gameParty._items[find.id] >= lot ) return true;
    };




    //接点計算用?クラス
    Game_Talk.prototype            = Object.create(Game_Talk.prototype);
    Game_Talk.prototype.costructor = Game_Talk;


    Game_Talk.prototype.initialize = function() { //初期値
        this._talk = '';
        this._talked = {};
        this._roulette = [];
        this._slot = 0;
        this.evId = 0;
        this.new = false;
    };

// $gameSystem.ish_talk().genki(); //テスト
Game_Talk.prototype.genki = function(){console.log(`ゲンキ出してこ！`)};


    Game_Talk.prototype.prepareTalk = function() {

        this._talk = null;
        this._roulette = [];
        this._slot = 0;
        this.evId = 0;
        this.new = false;
    };

    
    Game_Talk.prototype.istalked = function(evId,talk_id) {
        if(!this._talked[evId]) this._talked[evId] = [];

        if (this._talked[evId].includes(talk_id)) {
            return true;
        } else {
            return false;
        };
    };


    Game_Talk.prototype.talkRoulette = function() {
        this._talk = this._roulette[Math.floor(Math.random() * this._roulette.length)]
        //console.log(this._talk)
    };


    Game_Talk.prototype.c_solo = function(){ //話題；個人
        let copy = $dataTalk.filter(Boolean) ; //nullを除く処理

        let t = copy.find(item => {
            if (item['evId'] == this.evId) {
                let idd = item['data'].map(add => { //dataにプロパティを増やす　（変数自体は使わないのでリターンはいらない）
                    add.member = [this.evId] //メンバー（接点加算を考えて配列化）
                    if ("add_able" in item) add.add_able = item.add_able; //親オブジェに[add_able]があれば子にも生成する
                });
                return item
            }
        });
        if (t) {
            return t['data'];
        } else {
            return [];
        }
    };


    Game_Talk.prototype.c_party = function(){ //話題：複数人
        let copy = $dataTalk_party.filter(Boolean) ; //nullを除く処理
            
            const block = copy.filter( (item) => {
                let ary = [];
                if (item["evId"].indexOf(',')) {
                    ary = item['evId'].split(','). map( str => parseInt(str, 10) ); // jsonのevId が "1,2" みたいな指定になってるのを　整数の配列にする

                } else {ary = Number(item['evId'])};

                if (ary == this.evId || ary.includes(this.evId)) {
                    return item;
                };
            });


            let list = block.map(item => {

                let list_s = item['data'].map(add => { //mapの中にmapをいれる暴挙　親プロパティの情報を子プロパティに生成
                    if (item['evId'].indexOf(',')) {
                        add.member = item['evId'].split(','). map( str => parseInt(str, 10) );
                    } else {add.member = Number(item['evId'])};

                    add.add_able = item['add_able'];
                    add.slot     = item['slot'];
                    return add
                });
                return item['data']; //二次元配列
            }).reduce((pre,current) => {pre.push(...current);return pre},[]);//一次元配列に変換
            
            if (list) {
                return list;
            } else {
                return []};
    };


 
    Game_Talk.prototype.conditions = function(value){ //くっそ無理やり条件式を動かしています
        //let s_con =performance.now();
    
        let ary = ['checkTime','eventSelf','eventAt','eventName','eventPoint','eventRoom','eventTalked','haveItem']
        let plan;
        let v = value;

        let go = ary.filter((item) => {            
            if (v.indexOf(item) !== -1) {
                let RegularExp = new RegExp( item, "g" );
                plan = v.replace( RegularExp , '$gameMap.' + item ); 
                v = plan;
            };
            return
        });
        if (!plan) plan = value; 
        
    
        let str = `if (${plan}) return true; `;  

        // 改行コードを<br>に変換
        str.replace(/\r?\n/g, "<br>");

        // タブ文字を半角スペース（&nbsp;）４つに変換
        str.replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;");
        //console.log(str)

        //let e_con =performance.now();
        //console.log(`条件生成 ${e_con - s_con}`)

        return str
    };

    Game_Talk.prototype.setTalk = function(evId, talk_id, once) {
        if(!this._talked[evId]) this._talked[evId] = [];
        
        if(!this._talk && !this.istalked(evId,talk_id)){ 
            return true;

        }else if(!once){
            this._roulette.push(talk_id);//会話データなかった？　ルーレットにプッシュする？
        }
        return false;
    };





// $gameSystem.ish_talk().talkCheck()

    Game_Talk.prototype.talkCheck = function(evId = 0,test = false) {
    let total_s = performance.now()

        this.prepareTalk();//初期化
        this.evId = evId;
        let data = {};

        let solo = this.c_solo();
        let party = this.c_party();
        data = party.concat(solo); //contact()はチェーンできるよ

        if (test) { //会話数カウントなど
            let data_solo;
            let data_party;

            if (solo.length) {
                data_solo = solo.length;
            } else {data_solo = 0};

            if (party.length) {
                data_party = party.length;
            } else {data_party = 0};

            console.log(`${test}　会話データ数：${data.length}　（内約　ソロ：${data_solo}  複数：${data_party}）`);
            
            //会話全解禁？
            let ta = data.map((item) => {
                if(!$gameSystem.ish_talk()._talked[this.evId]) $gameSystem.ish_talk()._talked[this.evId] = [];
                //if ($gameSystem.ish_talk()._talked[this.evId].length <= 20) {
                    //セーブデータが嵩むんだよ　どうにかならんか？
                    //$gameSystem.ish_talk()._talked[this.evId].push(item['id']);
                //}
            }); 
            return this;
        }

        let result = data.find( (item) => {

           let str = this.conditions(item.condition); //死ぬほど無理やり動かしてる　条件式を制御する関数
            let con = new Function(str); 

            if (con && con()) { //条件が合致する
                if ( this.setTalk(evId, item['id'], item['once']) ) { //新しい会話があるか？
                    this.new = true;
                    console.log(`！新しい話題！`)
                    this._talk = item['id'];
                    return item;
                };
            };
        });
        

         // 初話題がすべて終わっている場合は既存の内容からランダム
        if(!this._talk) {
            this.talkRoulette();
            //逆探知的な？？？
            result = data.find( (item) => {
                if (item['id'] == this._talk) return item;
            })

        } else { //初話題が実行された時　メンバー各人の_takledを確認して　接点加算
            let ef = result['member'].map((item) => {

                if(!this.istalked(item,this._talk)) { //初見です〜
                    this._talked[item].push(this._talk);//キーワードを保存

                    if ("add_able" in result && !result['add_able']) { 
                        //接点加算を行わない
                    } else {
                        let call = this.point_add(item);
                        console.log(`！！接点加算[${item}]　[現在値：${$gameVariables.value(talking_point)[talking_head + this.evId]}] ！`)
                    };

                };                
            });
        };

        if (this._talk) {
            $gameSwitches._data[party_switch] = true;
            if ("slot" in result && result["slot"]) {
                this._slot = result['slot']; //会話にスロットが設定されているか？
            } else {this.slot = 0};

                let log = `【${result['member']}】 ${this._talk}  [slot:${this._slot}] [起動：${this.evId}]`;
                log += `　[←現在値：${$gameVariables.value(talking_point)[talking_head + this.evId]}]`;
                log += `　[条件：${result['condition']}]`
                console.log(log);
            
        } else {$gameSwitches._data[party_switch] = false;}
    let total_e = performance.now()
    console.log(`ゲームトーク ${total_e - total_s}`)
        
    };



    Game_Talk.prototype.point_add = function(evId,point = 1,plusminus = true){ 
        let prop = talking_head + evId;
        if ($gameVariables.value(talking_point)[prop] == null) { //接点管理変数のプロパティの中身が未宣言なら　０を入れておく
            $gameVariables.value(talking_point)[prop] = 0;
        };
        if (plusminus) {
            $gameVariables.value(talking_point)[prop] += point;
        } else { 
            if ($gameVariables.value(talking_point)[prop] - point >= 0) {
                $gameVariables.value(talking_point)[prop] -= point;
            } else {$gameVariables.value(talking_point)[prop] = 0};
         }
 
        return this; 
    };

    let plusminus = (evId = 0,point = 1,plusminus = true, newOnly = true) => {
        //接点計算を初回のみ行う　＆　会話が初回じゃない　→　接点計算を行わない
        if (evId == 0) evId = $gameSystem.ish_talk().evId;
        if (newOnly && !$gameSystem.ish_talk().new) return false; 

        let a = new Game_Talk().point_add(evId,point,plusminus);
    };




//$gameSystem.ish_talk().dataSort()

    Game_Talk.prototype.dataSort = function() {
        let charaD = $dataUniques.map_event;
        let l_index = [];
        let chara_list = charaD.filter((item,index) => {
            if (item.ev_type == 'main' || item.ev_type == 'sub') {
                l_index.push(index)
                return;
                }
        });

        let list = l_index.concat([50,51,52,53,56]);
   
        let name;
        let type;

        let data = list.map((item) => {
            if (charaD[item]) {
                name = charaD[item].name;
                type = charaD[item].ev_type;
            } else {
                name = "未定"
                type = "mob";
            };

            let moji = `【${item}】[${type}]　${name}　：`;
            let a = new Game_Talk().talkCheck(item,moji);
        });
  }
    
 
})();