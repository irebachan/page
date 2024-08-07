

/*:ja
 * @target MZ
 * @plugindesc モブをリスポンさせる
 * @author わし
 *
 * @help
 *
 * モブをリスポンさせる件についていろいろ考えていますわよ
 * 
 * @command mob_delete
 * @text モブ消去
 * @desc リスポンしたモブを消去します
 * 
 * @arg value
 * @text 消去する変数スロット
 * @desc どの変数に格納したイベントを消去する？ 
 * @default 21
 * @type variable
 * 
 * @command mob_delete_place
 * @text モブ消去（位置指定）
 * @desc 指定位置にイベントがあった場合、そいつを消去します。
 * 
 * @arg x
 * @text X
 * @desc  
 * @default 0
 * @type Number
 * 
 * @arg y
 * @text Y
 * @desc  
 * @default 0
 * @type Number
 * 
 * 
 * 
 * @command mob_respawn
 * @text モブ：リスポーーん
 * @desc
 * 
 * @arg value
 * @text 使用する変数
 * @desc どの変数に代入する？ 
 * @default 21
 * @type variable
 * 
 * @arg min
 * @text 稼働率　最小％
 * @desc  
 * @default 0
 * @type Number
 * 
 * @arg max
 * @text 稼働率　最大％
 * @desc  
 * @default 50
 * @type Number
 * 
 * @arg place
 * @text どのスポットに発生するか
 * @desc 具体的な座標はJS内に設定
 * @default 廊下全域
 * @type select
 * 
 * @option 廊下全域
 * @value 廊下全域
 * @option 医院
 * @value 医院
 * @option メヌの店
 * @value メヌの店
 * @option 田子須の店
 * @value 田子須の店
 *
 * 
 * 
 */

(() => {
    'use strict';


    const script = 'ish_mob';
    const parameters = PluginManager.parameters(script);
    const parameters_other = PluginManager.parameters('ish_time_event');

    let mobList = Number(parameters['random_mob_list'] || 1);
   

    let value = 0;
    let min = 0;
    let max = 0;
    let place = '';

    //ここから



    PluginManagerEx.registerCommand(document.currentScript, "mob_delete", args => {
        mobDelete(Number(args.value))
    });

    PluginManagerEx.registerCommand(document.currentScript, "mob_delete_place", args => {
        mobDelete_place(Number(args.x),Number(args.y));
    });



    PluginManagerEx.registerCommand(document.currentScript, "mob_respawn", function(args) {
        //this:ゲームインタプリター　とやらを呼ぶには、アローではなく function で記述する……　
        mobDelete(Number(args.value))

        let x = tetetest(Number(args.min),Number(args.max),String(args.place));//できたよ！！！！
        let randaom = mobRandom('mob_a',x.respawn_customers); //ランダム生成　途中で足りなくなったらどうすんの？？？

        //console.log(`[${String(args.place)}]　席数：${x.data.length}　生成数：${x.respawn_customers}　稼働率：${x.rate}%`)

        const template = false;
        let mapX = 0;
        let mapY = 0;
        let move = "";
        let id   = 0;
        let ev   = 0;
       
        for (let cnt = 0,len = x.respawn_customers; cnt < len ;cnt++) {
            //生成するイベントのIDをランダムで決める処理
            mapX = x.seats_lottery[cnt][0]
            mapY = x.seats_lottery[cnt][1]
            if (x.seats_lottery[cnt].length > 2) {move = x.seats_lottery[cnt][2];
            } else {move = ""};

            id   = randaom[cnt];
            $gameMap.spawnEvent(this.getEventIdForEventReSpawn(id, template), mapX, mapY, template);

            ev = mobSet(Number(args.value)); //生成したイベントのIDを変数にプッシュする処理 ついでにIDも取得する　セルフDもONにする
            //console.log(`ev[${ev}]の動作は [${x.seats_lottery[cnt][2]}]です。`)
            ev_move(ev,move); //移動ルートの指定……
        } 
    });







    let mobSet = (value = mobList) => { //イベントID保存
        let x = $gameMap._events.length - 1 //イベントのサイズの　一番最後が今生成したイベントのIDのはず
        // $gameMap._events　と$dataMap.events　ってどう使い分けるんだろう

        if (!Array.isArray($gameVariables.value(value))) { //配列ではない（宣言前
            $gameVariables._data[value] = [];       
        }; 
        $gameVariables.value(value).push(x)
        $gameSelfSwitches._data[[$gameMap.mapId(), x, 'D']] = true; //セルフDをONにする
        return x;
    };


    let mobDelete = (value = mobList) => { //リスポンしたイベントを消去 
        //ゲームがリロード？されると　イベントが消える。ここでそのまま消去を実行するとエラーが起きる。（存在しないイベントは消せないから）
        //もうわからん　デバッグツールの自動リロードのせい？　本番環境では発生しないのか？
       
        //console.log($gameMap._events);
        let copy = $gameMap._events.filter(Boolean) 
        //console.log(copy)
       //copy.filter(Boolean) //頭はnullだから　エラーになってる？ ０もそうだけど、撤去してnull になったところだな……
        
        let exist_ev = copy.map(item => item._eventId) //存在するイベントのIDを抜き出した配列
        
      
        let delete_ev = [];
        let check = 0;
        for (let cnt = 0,len = $gameVariables.value(value).length; cnt<len ;cnt++) {
            check = $gameVariables.value(value)[cnt];
            if (exist_ev.indexOf(check)) {delete_ev.push(check)}
        };
  
        let ary = delete_ev.length;
        if (ary > 0) {
            let num = 0;
            for (let cnt = 0; cnt < ary; cnt++ ) {
                num = delete_ev[cnt];   
                $gameMap.eraseEvent(num);
            };
        };
        $gameVariables._data[value] = [];
        //console.log(`[${value}]は[${$gameVariables.value(value)}]`)
    };

    let mobDelete_place = (x,y) => { //指定した座標に別のイベントがあったら　消去する。
        if ($gameMap.eventIdXy(x,y) > 0) { //消去すると面倒なことになる？　セルフDをOFFにするとか？
            let id = $gameMap.eventIdXy(x,y);
            console.log(`消えてくれ：[${id}] ${x},${y}`)
            if ($gameSelfSwitches.value([$gameMap.mapId(), id, 'D'])) {
                delete $gameSelfSwitches._data[[$gameMap.mapId(), id, 'D']];
                //console.log(`[${x},${y}] 邪魔なイベントを消したよ`)
            }
        }

    };


    let mobRandom = (type = 'mob_a',size = 20) => { //ランダムリストを生成する

        let data = $dataUniques.map_event.filter(function(item) {
            return !item['ev_type'].indexOf(type); 
            //タイプ:mob_a のデータだけ抜き出して配列作って欲しいんだけど…… !をつけて indexOf　の逆！　みたいな〜（力技！）
        })

        let list = data.map(item => item.Id)

        for (let i = list.length -1 ; i > 0; i--) {
            let r = Math.floor(Math.random() * (i + 1));
            let tmp = list[i];
            list[i] = list[r];
            list[r] = tmp;
        }; 

        let list_resize = mobRandom_resize(list,size);

        return list_resize;
    }

    let mobRandom_resize = (list,size) => {  //ランダムリストを延長する
        let a1 = list;
        let a2 = list.slice(0,list.length); 

        while (a1.length < size) { //　リストのサイズが　指定したサイズより小さいなら　ループ開始
            Array.prototype.push.apply(a1,a2) //破壊的な結合 多分a1に　同じ内容のa2が結合されるはず……
        };

        return a1;
    }





class restaurant {
    constructor(data = [[0,0]],rate_minute = 0,rate_max = 100){//引数の設定
        this.data   = data;
        this.minute = rate_minute;
        this.max    = rate_max;
    }
}

restaurant.prototype.rate_random = function() { //稼働率
    //稼働率は80%~100%など、幅のある仕様にしたい。最小値から最大値までの中でランダムな数字を返す
    let top = this.minute;
    let bottom = this.max;

    let hikizan = 0
    if (top <= bottom) { hikizan = bottom - top;
    } else { hikizan = top - bottom };

    let random = Math.round( Math.random () * hikizan ) + top; //top ~ bottom の乱数を作リたくてさ……  
    this.rate = random; //プロパティ作成
    return this; 
}

restaurant.prototype.rate_exp = function(){ //稼働率演出のためのイベント生成数
    //稼働率を求めたいというよりは、設定した稼働率を演出するために、いくつイベントを生成したらいいのか？を求めたい。
    let num = this.data.length / 100 * this.rate; //母数を１００で割ってパーセントの値で掛ける
    let result = Math.round(num); //四捨五入
    this.customers = result; //プロパティ作成
    return this; 
}

restaurant.prototype.seats_available = function(){ //席が使用可能なのか？
    //メインキャラが席に付いていることもある。メインキャラも含めた稼働率の演出をするため、
    //席が空いているかどうかをチェックし、空いてない席の分　this.customers（生成するイベントの数） をマイナスする。（０以下になったら０にする）
    let unusable = 0; //使用不可能な席の数
    let copy = this.data.slice(0,this.data.length); //静的データ：座席表のコピー
    let seats = this.data.slice(0,this.data.length); //静的データ：座席表のコピー２

    for (let cnt = 0,len = copy.length; cnt<len ; cnt++) {
        if ($gameMap.eventIdXy(copy[cnt][0],copy[cnt][1]) > 0) { //座席表で指定した座標にイベントがあったら
            seats.splice(cnt, 1); //座席表のコピーから　cnt番目のデータを削除
            unusable++;
        };
    };

    this.respawn_customers = this.customers - unusable;//生成する客の数
    if (this.respawn_customers < 0) {this.respawn_customers = 0};

    this.available_seats = seats; //プロパティ作成　多分空いてる席の座標　[ [31,21][38,21] ]　みたいな配列が入っている
    return this;
}

restaurant.prototype.seats_lottery = function(){ //座席の抽選
//this.available_seats　の内容をランダムに並び替えて、this.respawn_customersの数だけ別の配列にコピーする？
    let copy = this.available_seats.slice(0,this.available_seats.length); //座席表のコピー

    for (let i = copy.length -1 ; i > 0; i--) {
        let r = Math.floor(Math.random() * (i + 1));
        let tmp = copy[i];
        copy[i] = copy[r];
        copy[r] = tmp;
    }; //よくわからんけど　コピーの内容がランダムに並び変わった？

    let lottery = [];
    for(let cnt = 0,len = this.respawn_customers; cnt<len ;cnt++) {
        lottery.push(copy[cnt]);
    }; //this.respawn_customersの数だけ別の配列にコピーする？
    this.seats_lottery = lottery;
    return this;
}




let tetetest = function(min = 0,max = 50,place = '廊下') {

    let data = [];

    switch (place) {
        case '田子須の店':
            data = [ //席座標
                [37,21,"down"],[38,21,"down"],[37,23,"up"],[38,23,"up"],[37,24,"down"],[38,24,"down"],[37,26,"up"],[38,26,"up"],//テーブル席
                [33,24,"up"],[34,24,"up"],[35,24,"up"],//カウンター席
                [33,25],[34,25],[35,25],[34,26],[35,26],[36,21],[36,21],[36,22],[36,23],[37,20],[38,20],[39,20]  //動作を指定しない場合は　すり抜けOKなやつが出現する
                ];
            break;
        
        case '医院':
            data = [
                [21,25,"up"],[22,25,"up"],[16,24,"right"],[16,25,"right"],
                [17,25],[19,25],[23,25]
                ]
            break;

        case 'メヌの店':
            data = [
                [28,22],[29,22],[28,23],[29,23],[28,24],[29,24],[29,21],[29,25]
                ]
            break;

        case '廊下全域':
            data = data_rouka();
            
            break;

    };
    

    let test = new restaurant(data,min,max).rate_random().rate_exp().seats_available().seats_lottery()
    return test;
}

    let data_rouka = () => {
        let road_l = [];
        let road_s = [];
        let x_line = [11,12,46,47]
        let y_line = [14,55]
        let xx = 0;
        let yyy = 0;

        for (let cnt = 0,len = x_line.length ; cnt < len ;cnt++) {
            xx = x_line[cnt];
            for(let yy = y_line[0]; yy <= y_line[1] ; yy++) {
                road_s = [xx,yy]
                road_l.push(road_s);
            };
        };

        x_line = [11,47];
        y_line = [14,30,31,47]

        for (let cnt = 0,len = y_line.length ; cnt < len ;cnt++) {
            yyy = y_line[cnt];
            for (let xxx = x_line[0]; xxx <= x_line[1] ; xxx++ ) {
                road_s = [xxx,yyy];
                road_l.push(road_s);
            };
        };

        //重複を削除できてんのか？
        const array = Array.from(new Set(road_l))
        //console.log(array);
        return array;
    };







let ev_move = (evId,type) => {
   let  ev = $gameMap._events[evId];

    let move_up = {"skippable":false,"repeat":true,"list":[  //無理やりリピートさせればあるいは……
    {'code':32},//歩行アニメを止める
    {"code":19},//上を向く
    //{'code':34},//向き固定OFF
    {'code':33},//足踏みON
    {"code":45,"parameters":["this.setPriorityType(1);"]}, //プライオリティ変更
    {"code":15, "parameters":[180]}, //ウェイト
    {'code':0} ]
    };  
    
    let move_down = {"skippable":false,"repeat":true,"list":[ 
    {'code':32},//歩行アニメを止める
    {"code":16},//下を向く
    //{'code':34},//向き固定OFF
    {'code':33},//足踏みON
    {"code":45,"parameters":["this.setPriorityType(1);"]}, //プライオリティ変更
    {"code":15, "parameters":[180]}, //ウェイト
    {'code':0} ]
    };  

    let move_left = {"skippable":false,"repeat":true,"list":[ 
    {'code':32},//歩行アニメを止める
    {"code":17},//左を向く
    //{'code':34},//向き固定OFF
    {'code':33},//足踏みON
    {"code":45,"parameters":["this.setPriorityType(1);"]}, //プライオリティ変更
    {"code":15, "parameters":[180]}, //ウェイト
    {'code':0} ]
    };  

    let move_right = {"skippable":false,"repeat":true,"list":[ 
    {'code':32},//歩行アニメを止める
    {"code":18},//右を向く
    //{'code':34},//向き固定OFF
    {'code':33},//足踏みON
    {"code":45,"parameters":["this.setPriorityType(1);"]}, //プライオリティ変更
    {"code":15, "parameters":[180]}, //ウェイト
    {'code':0} ]
    };  

   switch (type) {
       case "up":
        ev.forceMoveRoute(move_up);
        break;

        case "down":
        ev.forceMoveRoute(move_down);
        break;

        case "left":
        ev.forceMoveRoute(move_left);
        break;

        case "right":
        ev.forceMoveRoute(move_right);
        break;
   };

    

};



/*

＞リスポン後
\v[mob_list]に生成したイベントのidをプッシュ

\v[seats][count][2]　の記述が up or down　なら
生成したイベントに移動ルート「上を向く or　下を向く,　歩行OFF,　プライオリティ１」を設定する。

\v[count]++

*/





})();