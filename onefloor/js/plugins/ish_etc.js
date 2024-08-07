

/*:ja
 * @target MZ
 * @plugindesc フェードとか　細々……
 * @author わし
 *
 * @help
 *
 * セルフスイッチ を切り替えたり　フェードしたり　をプラグインコマンドでやりたい。
 * 
 * @param f_in
 * @type switch
 * @text スイッチ　強制フェードイン起動（並列）
 * @desc スイッチ　強制フェードイン起動（並列）
 * @default 12
 * 
 * @param f_out
 * @type switch
 * @text スイッチ　強制フェードアウト起動（並列）
 * @desc スイッチ　強制フェードアウト起動（並列）
 * @default 13
 * 
 * 
 * @command fade_In
 * @text フェードイン
 * @desc フェードインとウェイトを設定した並列イベントを起動します
 * 
 * @command fade_Out
 * @text フェードアウト
 * @desc フェードアウトとウェイトを設定した並列イベントを起動します
 * 
 *
 * @command name_set
 * @text 初期名前反映
 * @desc イベントリストを参照して名前用変数に初期名前を代入します
 * 
 * @command name_change
 * @text 名前変更
 * @desc イベントリストを参照して名前用変数に変更後の名前を代入
 * 
 * @arg id
 * @text イベントid
 * @desc  
 * @default 1
 * @type Number
 * 
 * @arg name
 * @text 変更後の名前
 * @desc  
 * @default 
 * @type String
 * 
 */

(() => {
    'use strict';


    const script = 'ish_etc';
    const parameters = PluginManager.parameters(script);
    const parameters_other = PluginManager.parameters('ish_time_event');
    const parameters_move = PluginManager.parameters('ish_common_move');


    let c_fadeIn  = Number(parameters['f_in'] || 1); //強制フェードを設定したコモンを起動するためのスイッチをONにする
    let c_fadeOut = Number(parameters['f_out'] || 1);

    let mobList = Number(parameters['random_mob_list'] || 1);
    let mobId= Number(parameters['random_mob_orginalId'] || 1);

   

    let talking_point = Number(parameters_other['talking_point'] || 1); //別のJSで決めたやつ　接点
    let talking_head = String(parameters_other['talking_head'] || 'com_'); //　別のJSから　プロパティの頭  

    const save = Number(parameters_move['move_save'] || 1);


    //ここから

    PluginManager.registerCommand(script, "fade_In", args => {
        $gameSwitches.setValue(c_fadeIn,true) //フェードイン用のスイッチをtrue 
    });

    PluginManager.registerCommand(script, "fade_Out", args => {
        $gameSwitches.setValue(c_fadeOut,true) //フェーアウト用のスイッチをtrue 
    });

    PluginManagerEx.registerCommand(document.currentScript, "name_change", args => { //通り名変更
        let data = $dataUniques.map_event;
        $gameVariables._data[data[Number(args.id)]['name_hensu']] = String(args.name);
    });


    PluginManager.registerCommand(script, "name_set", args => { //初期　名前と表示を初期化する
        let self ='';
        let data = $dataUniques.map_event;
        let prop_name = '';
        $gameVariables._data[talking_point] = {}; 
        $gameVariables._data[save] = {}; 

        for (let cnt = 1,len = data.length; cnt < len; cnt++) {
            
            //console.log(data[cnt]['start_display'])
            if ( data[cnt]['start_display'] == 'D' || data[cnt]['start_display'] == 'C') { //初期 Dもしくは　Cがonの設定なら
                self =  data[cnt]['start_display'];
                //$gameSelfSwitches._data[[$gameMap.mapId(), data[cnt]['Id'], self]] = true;
                $gameSelfSwitches.setValue([$gameMap.mapId(), data[cnt]['Id'], self], true)
            }//　セルフスイッチ をONにする

            if (data[cnt]['ev_type'] == 'main' || data[cnt]['ev_type'] == 'sub') { //メインかサブのキャラなら

                if (data[cnt]['start_name'] != null) { //プロパティ：初期名前がnullじゃなかったら
                    $gameVariables._data[data[cnt]['name_hensu']] = data[cnt]['start_name'];
                    // プロパティ・名前変数で設定した変数に初期名前を代入
                };

                prop_name = talking_head + data[cnt]['Id']; //プロパティ名作成
                if ($gameVariables.value(talking_point)[prop_name] == null) { //接点管理変数のプロパティの中身が未宣言なら　０を入れておく
                    $gameVariables.value(talking_point)[prop_name] = 0;
                    }
                }
            };
            //console.log($gameVariables.value(talking_point))
    });








    /*
好感度分岐　プラグインの方で式を入力できないか？
イベントID：３
式；　x >= 10
みたいにさあ　メヌの接点が１０以上　みたいな。

    */


    let point_con = (evId = 1,tx = 'x == 0') => { //指定したイベントの接点を　文字列で指定した式で評価する
        let point = $gameVariables.value(talking_point)[talking_head + Number(evId)];
        let str = `if (${tx}) {return true;
        } else {return false} `;//式（文字列）

        let fun = new Function('x',str);//新しい関数だよ
        console.log(`${str} x = ${point}`)

        if (fun(point)) {
            return true;
        } else {
            return false;
        };
    };


     







})();