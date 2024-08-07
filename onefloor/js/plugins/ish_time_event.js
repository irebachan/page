
/*:ja
 * @target MZ
 * @plugindesc 時間帯イベントの基盤など
 * @author わし
 *
 * 
 * @param call_ev_Id
 * @type variable
 * @text 変数　キャラID収納
 * @desc スクリプト 「関数名（this._eventId）」でこの番号の変数に呼び出し元evIDをいれる関数を作っておくので (デフォルト・5)
 * @default 5
 * 
 * @param value_game_hour
 * @type variable
 * @text 変数　現在の[時]
 * @desc 「時間導入プラグイン」で　ゲーム内時間・時　が代入される変数　内部では[gameHour]に入ることになる
 * @default 10
 * 
 * @param value_game_minute
 * @type variable
 * @text 変数　現在の[分]
 * @desc 「時間導入プラグイン」で　ゲーム内時間・分　が代入される変数　内部では[gameMinute]に入ることになる
 * @default 11
 * 
 * 
 * @param talking_point
 * @type variable
 * @text 変数　接点
 * @desc 会話イベントを見た回数を管理する変数 (デフォルト・24)
 * @default 24
 * 
 * @param this_comment
 * @type variable
 * @text 変数　今回のキーワード
 * @desc 今回のキーワードを記録する変数 (デフォルト・25)
 * @default 25
 * 
 * @param last_comment
 * @type variable
 * @text 変数　前回のキーワード
 * @desc 前回のキーワードが記録されている変数 (デフォルト・26)
 * @default 26
 * 
 * @param value_KeyStock
 * @type variable
 * @text 変数　キーワードストック
 * @desc キーワードを配列でストックする変数 (デフォルト・27)
 * @default 27
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
 * @help
 *
 * ユニークデータから　マップオブジェを探して　並列イベントをよぶよ
 *
 */

(() => {
    'use strict';

    let parameters = PluginManager.parameters('ish_time_event');

    let ev_id_container = Number(parameters['call_ev_Id'] || 5); //call_ev_Idが空だったら　５を入れて欲しいな〜という気持ち

    let gameHour = Number(parameters['value_game_hour'] || 1);  // プラグインパラメーターで指定した変数に　ゲーム内時間が入っているよ。
    let gameMinute = Number(parameters['value_game_minute'] || 1); //時間導入プラグインの設定に合わせてね。

    let this_comment = Number(parameters['this_comment'] || 1); //プラグインパラメータで変数を指定した。
    let last_comment = Number(parameters['last_comment'] || 1); //今後は  $gameVariables.value(last_comment) とかでこの内容が呼び出される。
    
    let talking_point = Number(parameters['talking_point'] || 1);
    let talking_head = String(parameters['talking_head'] || 'com_'); //　変数のプロパティを設定するときに……使うんです……   
    let value_KeyStock = Number(parameters['value_KeyStock'] || 1); //キーワードを配列でストックする
    
    let party_switch = Number(parameters['party_comment_read'] || 10); //パーティ会話を読んだときは　このスイッチをONにする  $gameSwitches.value(party_switch)
   


    Game_Map.prototype.array_blank = function(value_number,size,nakami) {  //指定されたゲーム内変数に　指定したサイズの配列　全部同じ中身　を設定する。
        $gameVariables._data[value_number] = Array(size);
        $gameVariables.value(value_number).fill(nakami);
    } //  $gameMap.array_blank(,,)  変数、配列のサイズ、中身


    Game_Map.prototype.event_id = function(ev) {  //
        // let evvvv = $gameMap._events[ev]._eventId;   //この工程　正直いらないよね〜〜〜 わかり切っとるもの
        // return evvvv;
        $gameVariables._data[ev_id_container] = ev; 
    }; // $gameMap.event_id()　　　$gameMap.event_id(this._eventId)　引数evのイベントIDを返す　それだけです


    Game_Map.prototype.cheack_time = function(start_h,start_m,end_h,end_m) {
        let now_time = new Date(2020, 1, 1,$gameVariables.value(gameHour), $gameVariables.value(gameMinute), 0); //現在のゲーム内時間

        let start_time  = new Date(2020, 1, 1, start_h, start_m, 0);
        let end_time    = new Date(2020, 1, 1, end_h,   end_m , 0);

        if (start_time <= now_time && now_time < end_time)　{ //時間がハマる
            return true
        } else {
            return false 
        };

    }; // $gameMap.cheack_time(,,,)  //　引数は　(start[時],start[分],end[時],end[分])　これに現在時間がハマるならtrueを返す




    Game_Map.prototype.math_tp_sotck_reset = function() {
        let key_stock = $gameVariables.value(value_KeyStock);

        if (key_stock == false) { //　無　ならば[]を入れる
            key_stock = [];       
        } else if ( key_stock.length >= 15 ) {  //15以上　なら先頭を１個削除する
            key_stock.shift();
        };
        $gameVariables._data[value_KeyStock] = key_stock; 
    
        return key_stock
    }; // $gameMap.//一定の条件でキーストックをリセットする。　キーストックが１５以上（仮）　のときとか。
 

    Game_Map.prototype.math_taking_point = function(ary,keywold) {
        let  prop_name = 0;
        //console.log(`接点計算を行うべき人数：${ary.length}　構成：[${ary}]`);
        let key = `[<${ary}> ${keywold}]` ; //キーワード生成
    
        let key_stock = Game_Map.prototype.math_tp_sotck_reset();
    
       for (let cnt = 0; cnt < ary.length ; cnt++) {
            prop_name = talking_head + ary[cnt]; //プロパティ名生成
            $gameVariables.value(this_comment)[prop_name] = key //今回のコメント　に　キーワードを焼き込み
    
            let this_c = $gameVariables.value(this_comment)[prop_name];
            let last_c = $gameVariables.value(last_comment)[prop_name];
    
            if ($gameVariables.value(talking_point)[prop_name] == null) { //接点管理変数のプロパティの中身が未宣言なら　０を入れておく
                $gameVariables.value(talking_point)[prop_name] = 0;
            }
    
            if ( this_c !== last_c ) { //前回のコメントと　今回のコメントが違うなら続行
    
                if (key_stock.includes(key) == false ) {  //キーストックを確認する 含まれていなければ続行
                    $gameVariables._data[value_KeyStock] = key_stock;
                    $gameVariables.value(talking_point)[prop_name]++ ;  //接点１加算
                    console.log( `接点加算：evID[${ary[cnt]}]：接点：${$gameVariables.value(talking_point)[prop_name]}  前:${last_c}` );
                    console.log( `今:${this_c}`);   

                    //let se = Game_Map.prototype.se_sorting('キラリン'); //音なる？
                    //Game_Map.prototype.play_se(se);
                } ;
                
            }
            //console.log( `evID[${ary[cnt]}]：接点：${$gameVariables.value(talking_point)[prop_name]}  今:${this_c}　　前:${last_c}` );
            //コンソール は接点の増加の有無に関わらず人数分出す
            $gameVariables.value(last_comment)[prop_name] = this_c; 
                //前回のコメントに　今回のキーワードを代入する
    
       };
    
       if (key_stock.includes(key) == false ) {  //人数分処理を繰り返した後、キーストックを操作する
            key_stock = Game_Map.prototype.math_tp_sotck_reset(); //必要あればキーストックを弄る
            key_stock.push(key); //キーストックに追加
            $gameVariables._data[value_KeyStock] = key_stock;
    
            //console.log(`------キーストック変更　[${key_stock}]`); 
        };
    
       $gameSwitches._data[party_switch] = true; //この関数呼び出された時点でなんか会話を見てるワケで　ここでスイッチONにすればよくね？
        
    } ;   // $gameMap.math_taking_point(,)       接点を加算したり、会話終了スイッチを操作する
    
        



    Game_Map.prototype.chat_solo = function(start_h, start_m, end_h, end_m, keywold) {
        if ($gameSwitches.value(party_switch)) {  //会話終了スイッチがONなら実行しません
            return false;
        };

        let ev_id  = $gameVariables.value(ev_id_container); //プラグインで指定した変数に呼び出し元のev_IDを入れてあるはず　（事前に別の関数で）
        let search_time = Game_Map.prototype.cheack_time(start_h,start_m,end_h,end_m);

        if (search_time == true ) {
            let ary = [ev_id]; //シングル会話ではidが配列ではないが、呼び出し元では配列である必要があるので　そうしています。
    
            if (keywold) { 
                let key_time = `${start_h}:${start_m}〜${end_h}:${end_m} ${keywold}`;// キーワードを加工して時間の表記をつける
                Game_Map.prototype.math_taking_point(ary,key_time); //接点計算　

            } else { //もしキーワードがfalseなら　trueを返すけど接点計算は行わない
                console.log(`${start_h}:${start_m}〜${end_h}:${end_m} モブまたはオブジェクトの発言`);
                $gameSwitches._data[party_switch] = true; //既読　ということにはなる
            };
            return true;
        };
    }; // $gameMap.chat_solo(,,,,'')  //引数(start_h, start_m, end_h, end_m, keywold)


    Game_Map.prototype.chat_party = function(start_h, start_m, end_h, end_m, member, keywold) {
        if ($gameSwitches.value(party_switch)) {  //会話終了スイッチがONなら実行しません
            return false;
        };

        let ev_id  = $gameVariables.value(ev_id_container); //プラグインで指定した変数に呼び出し元のev_IDを入れてあるはず　（事前に別の関数で）
        let search_time = Game_Map.prototype.cheack_time(start_h,start_m,end_h,end_m);

        if (search_time == true) { //時間チェックがOKなら　メンバー検索に移行
            if (member.includes(ev_id)) { //メンバーの配列の中にイベントIDが含まれる
                
                if (keywold) {
                    let key_time = `${start_h}:${start_m}〜${end_h}:${end_m} ${keywold}`;// キーワードを加工して時間の表記をつける
                    Game_Map.prototype.math_taking_point(member,key_time); //接点計算
                    //$gameSwitches._data[party_switch] = true;
                } else { //もしキーワードがfalseなら　trueを返すけど接点計算は行わない
                    console.log(`${start_h}:${start_m}〜${end_h}:${end_m} モブまたはオブジェクトの発言`);
                    $gameSwitches._data[party_switch] = true; //既読　ということにはなる
                };
                
                return true
            } else {
                // console.log(`時間チェックは通りましたが、適切なイベントではありませんでした。`)
                return false
            }
        } else {
            // 時間チェックが通らなかった
            return false
        } ;

    }; // $gameMap.chat_party(,,,,[],'') 引数(start_h, start_m, end_h, end_m, member, keywold) 　多いね〜 メンバーは配列で出します






    Game_Map.prototype.chat_branch = function(map) { //会話分技コモン内で使う関数　引数・呼び出しもとマップ
        let ev_id  = $gameVariables.value(ev_id_container);  //この関数より先に　キャラIDを取得しておく。
        $gameSwitches._data[party_switch] = false; //会話終了スイッチ　初期化　　　　会話もさあ　やっぱり変数にキーワード登録しない？？？　照合してさ……？
    


    };// $gameMap.chat_branch()  $gameMap.chat_branch(this._mapId) 引数はマップID




    Game_Map.prototype.k = function() {

    }; // $gameMap.



})();