/*:ja
 * @target MZ
 * @plugindesc マップオブジェクトとかを調べるやつ
 * @author わし
 *
 *
 * @param obj_name
 * @text 変数　オブジェの名前
 * @desc 変数　オブジェの名前
 * @type variable
 * @default 10
 * 
 * @param obj_slot
 * @text 変数　オブジェの場所で分類
 * @desc 変数　オブジェの場所で分類
 * @type variable
 * @default 10
 * 
 * @param obj_item
 * @text 変数　取得物の名前
 * @desc 変数　
 * @type variable
 * @default 23
 * 
 * @param obj_ev_v
 * @text 変数　強制起動イベント
 * @desc 変数　
 * @type variable
 * @default 30
 * 
 * @param obj_ev_s
 * @text 変数　強制起動するか？
 * @desc 変数　
 * @type switch
 * @default 31
 * 
 * 
 * 
 * 
 * @help
 *
 * ユニークデータから　マップオブジェを探して　並列イベントをよぶよ
 *
 */

(() => {
    'use strict';

    let parameters = PluginManager.parameters('ish_map_obj');//

    let obj_name = Number(parameters['obj_name'] || 1);//オブジェクトの名前を入れる
    let obj_slot = Number(parameters['obj_slot'] || 1);//オブジェクトのスロットを入れる　（タコスの店　とかそういう文字列が入る）
    let obj_item = Number(parameters['obj_item'] || 1);

    let obj_ev_v = Number(parameters['obj_ev_v'] || 1); //強制起動するイベントのIDを格納する変数
    let obj_ev_s = Number(parameters['obj_ev_s'] || 1); //上に同じ　スイッチ
    



    PluginManagerEx.registerCommand(document.currentScript, "test", args => {
        Game_Map.prototype.zettai()
    });


    
    function map_obj() {
        this.initialize.apply(this, arguments);
    }
     
    map_obj.prototype.initialize = function() {
        this.data = $dataUniques.obj_info;
        this.realX = $gamePlayer._realX;
        this.realY = $gamePlayer._realY;
        this.dir   = $gamePlayer.direction() ;//主人公の向き
    };


/*    
    class map_obj {
        
        constructor() {
            this.data = $dataUniques.obj_info;
            this.realX = $gamePlayer._realX;
            this.realY = $gamePlayer._realY;
            this.dir   = $gamePlayer.direction() ;//主人公の向き
        };
    };

*/

    map_obj.prototype.search = function(value = 1) { //　value:1　で一歩前、２で二歩前（机を挟んで〜とか）
        let s_mapX = this.realX;
        let s_mapY = this.realY;
        let dir = this.dir;

        this.value = value;

        switch (dir) {
            case 4://左
                s_mapX -= value;
                break;
            case 6://右
                s_mapX += value;
                break;
            case 8:
                s_mapY -= value;
                break;
            case 2:
                s_mapY += value;
                break;
        };
        this.name_x = 'sX_' + value;
        this.name_y = 'sY_' + value;

        this[this.name_x] = s_mapX;
        this[this.name_y] = s_mapY;
        return this
    };

    map_obj.prototype.evCheck = function() { //指定位置にイベントがあるのか？（ある：true 　ない：false）

        if ($gameMap.eventIdXy(this[this.name_x],this[this.name_y]) > 0 ) {
            this.ev_check = true;
        } else {
            this.ev_check = false;
        };
        return this;
    };

    map_obj.prototype.objCheck = function() { //指定位置にオブジェクトがあるのか？　（ある：true 　ない：false）

        $gameVariables._data[obj_name] = '';
        let data = this.data;
        this.obj_id = 0;

        for (let cnt = 1,len = data.length; cnt < len; cnt++) {
            if (data[cnt]['mapX'] == this[this.name_x] && data[cnt]['mapY'] == this[this.name_y]) {
                this.obj_id = cnt;
                $gameVariables._data[obj_name] = data[cnt]['name']; //ゲーム内変数に代入
                $gameVariables._data[obj_slot] = data[cnt]['slot']; //コモンイベントの内容を分散するために必要
                this.item_table = data[cnt]['item'];//アイテムテーブル情報
                //console.log(`[${data[cnt]['name']}]`);
                break; //座標にオブジェクトが見つかったなら、オブジェクトの名前を返す
            };
        }; 
        return this;
    };

 

    map_obj.prototype.commentSlot = function() { //表のコメント１に文章があり、条件１が空欄の場合　メッセージを表示
        let con = this.data[this.obj_id]['condishion1'];
        console.log(`[${this.data[this.obj_id]['name']}]　第一条件：${con}`)

        let only_dir = false;

        if (con.indexOf('上') !== -1 && this.dir == 8
        || con.indexOf('下') !== -1 && this.dir == 2
        || con.indexOf('左') !== -1 && this.dir == 4
        || con.indexOf('右') !== -1 && this.dir == 6) {only_dir = true};


        if (this.obj_id && this.data[this.obj_id]['comment1'] && !con) {
            $gameVariables._data[obj_slot] += '_ok';
            $gameVariables._data[obj_name] = this.data[this.obj_id]['comment1']; //名前変数とやらにコメント内容を代入
            

        } else if(this.obj_id && this.data[this.obj_id]['comment1'] && only_dir) {
            console.log(`プレイヤーが[${this.dir}]方向を向いている　コメント呼び出し`)
            $gameVariables._data[obj_slot] += '_ok';
            $gameVariables._data[obj_name] = this.data[this.obj_id]['comment1']; //名前変数とやらにコメント内容を代入

        } else {
            console.log(`[${$gameVariables.value(obj_slot)}]コモンを起動します`)}
        return this;
    };

    map_obj.prototype.random_item = function() { 
        //jsonをクラス？　みたいに定義する記述は　呼び出すファイルとは別のファイルでやっとく必要あるみたい　よくわかんないね
     
        $gameVariables._data[obj_item] = 0; 
        let n = this.item_table;
        if (!n) {n = 1};
        console.log(`アイテムテーブル：${n}`)

        let random = Math.floor( Math.random() * 101 ); //0から100までの乱数　のはず……
        if (random <= $dataTable[n]['get']) { //[get]は発生確率　　？？？
            let slot = 0;
            let item = random = Math.floor( Math.random() * 101 );

            for (let cnt = 0,len = $dataTable[n]["perc"].length ; cnt<len ;cnt++) {
                slot += $dataTable[n]["perc"][cnt];
                if (item <= slot) {
                    //アイテム入手
                    let name = $dataTable[n]["item"][cnt];
                    item_or_money(name);
                    break
                };
            };
        } else {
            return this
        }
    }; // $gameMap.random_item()



    let item_or_money = (name) => {
        $gameVariables._data[obj_item] = name; 

        if (name.indexOf("円") !== -1) { //円を含む　ということはお金……
            let money = name.replace("円", "");
            $gameParty.gainGold(Number(money));
            //console.log(`${money}円入手したそうです`);
            
        } else { //アイテム　名前で指定してるから、idを検索する必要があるよん
            let copy = $dataItems.slice(1,$dataItems.length);
            const item = copy.find(i => i.name === name)
            const id = item['id']
            $gameParty.gainItem($dataItems[id], 1);
            //console.log(`[${id}]:[${item['name']}]を入手したそうです`)   
        }
    };



    Game_Map.prototype.zettai = () => {
        $gameVariables._data[obj_ev_v] = 0;

        let a = new map_obj().search(1).evCheck().objCheck()
        //console.log(a)
        if (!a.ev_check && a.obj_id) { //目の前にイベントがなく、オブジェクトがある

            let obj_keep = a.obj_id; //２マス先をチェックすると　オブジェなかったりする　それが返ってきてるっぽい？ので　その前にキープしておく
            a.search(2).evCheck().objCheck() 
            
            if (a.ev_check && obj_keep) {//目の前にオブジェクトがあるが、２マス先にイベントがある
                //console.log(a)]
                let evvv = $gameMap.eventIdXy(a[a.name_x],a[a.name_y]); //イベントID
                if ($gameSelfSwitches.value([$gameMap.mapId(), evvv, 'D']) || $gameSelfSwitches.value([$gameMap.mapId(), evvv, 'C'])) {

                    $gameVariables._data[obj_ev_v] = evvv;
                    $gameSwitches._data[obj_ev_s] = true; //スイッチON
                    console.log(`強制起動 [${$gameVariables.value(obj_ev_v)}]`);
                } else {
                    a.search(1).objCheck().commentSlot().random_item();
                    return true;
                }
            } else { //目の前にオブジェクトがあり、その向こうにイベントはないなら　コメント起動
                a.search(1).objCheck().commentSlot().random_item();
                return true;
            }
        } else {
            a.search(0).evCheck().objCheck() 
            if (a.obj_id) { //目の前にオブジェクトはなかったが、足下にあった
                a.commentSlot().random_item();
                return true;
            }
        };
    };
    // $gameMap.zettai()

    Game_Map.prototype.obj_ev = () => { //強制起動
        if ($gameSwitches.value(obj_ev_s)) {
            $gameSwitches._data[obj_ev_s] = false;
            return true;
        };
    }; //$gameMap.obj_ev()
   

    Game_Map.prototype.bunki = () => { //なんだこの馬鹿みたいな関数は……　条件分岐で　関数（）＝’医院’　ならこのコモン呼び出し　みたいな
        if ($gameVariables.value(obj_slot).indexOf('_ok')) {
            $gameVariables.value(obj_slot).replace("_ok", "");//リプレースされてませんよ
        };
        return $gameVariables.value(obj_slot);
    };
    // $gameMap.bunki()
  


   

    Game_Map.prototype.search_coordinate_door = function() { // ドア用　主人公の"２マス先"にイベントがなければtrue
    let s_mapX = $gamePlayer._realX; //サーチするX座標
    let s_mapY = $gamePlayer._realY; //サーチするY座標
    let dir = $gamePlayer.direction() ;//主人公の向き

    switch (dir) {
        case 4://左
            s_mapX　-= 2;
            break;
        case 6://右
            s_mapX += 2;
            break;
        case 8:
            s_mapY -= 2;
            break;
        case 2:
            s_mapY += 2;
            break;
    };
    
    if ( $gameMap.eventIdXy(s_mapX,s_mapY) == 0 ) { //イベントなし
        return true;
    } else {
        return false
    }
}; // $gameMap.search_coordinate_door()







    Game_Map.prototype.comment_obj = function(name) {  //引数はオブジェクト名　該当してたらtrueを返す
        if ($gameVariables.value(obj_name) == name) {
            //console.log(`[${name}]`);
            return true;
        } else {
            //console.log(`指定が間違っている？：${name}`);
            return false
        };
    }; // $gameMap.comment_obj('')　　　　引数は文字列　'タコス テレビ？'　とかそういうの



})();