

/*:ja
 * @target MZ
 * @plugindesc セルフスイッチ とか
 * @author わし
 *
 * @help
 *
 * セルフスイッチ を切り替えたり　フェードしたり　をプラグインコマンドでやりたい。
 * 
 * 
 * 
 * @command door_open
 * @text ドア・オープン
 * @desc 指定したイベントのセルフスイッチをtrueにします　Aがoff:close AがON:open
 * 
 * @arg door_self
 * @text セルフスイッチ 
 * @desc セルフスイッチ
 * @default A
 * @type select
 * @option A
 * @option B
 * @option C
 * @option D
 * 
 * 
 * @arg door_ev
 * @text イベント
 * @desc セルフスイッチ を操作するイベント
 * @default ドア・玄関口
 * @type select
 * 
 * @option ドア・玄関口
 * @value ドア・玄関口
 * 
 * @option ドア・仲土狩
 * @value ドア・仲土狩
 * @option ドア・仲土狩（裏口）
 * @value ドア・仲土狩（裏口）
 * 
 * @option ドア・五人
 * @value ドア・五人
 * @option ドア・五人（裏口）
 * @value ドア・五人（裏口）
 * 
 * @option ドア・はゆみ
 * @value ドア・はゆみ
 * @option ドア・はゆみ（裏口）
 * @value ドア・はゆみ（裏口）
 * 
 * @option ドア・医院
 * @value ドア・医院
 * @option ドア・医院（裏口）
 * @value ドア・医院（裏口）
 * 
 * @option ドア・メヌ
 * @value ドア・メヌ
 * @option ドア・メヌ（裏口）
 * @value ドア・メヌ（裏口）
 * 
 * @option ドア・田子須
 * @value ドア・田子須
 * 
 * @option ドア・田子須（左）
 * @value ドア・田子須（左）
 * @option ドア・田子須（中）
 * @value ドア・田子須（中）
 * @option ドア・田子須（右）
 * @value ドア・田子須（右）
 *
 * 
 * @option ドア・西トイレ
 * @value ドア・西トイレ
 * @option ドア・東トイレ
 * @value ドア・東トイレ
 * 
 * 
 * @command door_close
 * @text ドア・クローズ
 * @desc 指定したイベントのセルフスイッチをfalseにします　Aがoff:close AがON:open
 * 
 * @arg door_self
 * @text セルフスイッチ 
 * @desc セルフスイッチ
 * @default A
 * @type select
 * @option A
 * @option B
 * @option C
 * @option D
 * 
 * 
 * @arg door_ev
 * @text イベント
 * @desc セルフスイッチ を操作するイベント
 * @default ドア・玄関口
 * @type select
 * 
 * @option ドア・玄関口
 * @value ドア・玄関口
 * 
 * @option ドア・仲土狩
 * @value ドア・仲土狩
 * @option ドア・仲土狩（裏口）
 * @value ドア・仲土狩（裏口）
 * 
 * @option ドア・五人
 * @value ドア・五人
 * @option ドア・五人（裏口）
 * @value ドア・五人（裏口）
 * 
 * @option ドア・はゆみ
 * @value ドア・はゆみ
 * @option ドア・はゆみ（裏口）
 * @value ドア・はゆみ（裏口）
 * 
 * @option ドア・医院
 * @value ドア・医院
 * @option ドア・医院（裏口）
 * @value ドア・医院（裏口）
 * 
 * @option ドア・メヌ
 * @value ドア・メヌ
 * @option ドア・メヌ（裏口）
 * @value ドア・メヌ（裏口）
 * 
 * @option ドア・田子須
 * @value ドア・田子須
 * 
 * @option ドア・田子須（左）
 * @value ドア・田子須（左）
 * @option ドア・田子須（中）
 * @value ドア・田子須（中）
 * @option ドア・田子須（右）
 * @value ドア・田子須（右）
 *
 * 
 * @option ドア・西トイレ
 * @value ドア・西トイレ
 * @option ドア・東トイレ
 * @value ドア・東トイレ
 * 
 * 
 * 
 *
 */

(() => {
    'use strict';


    const script = 'ish_self_switch';
    const parameters = PluginManager.parameters(script);

    let ev = 0;
    let evId = 0;
    let ss = '';





    PluginManager.registerCommand(script, "door_open", args => { //指定したドアのセルフスイッチ true
        ev = String(args.door_ev);
        evId = Game_Map.prototype.ev_num(ev);
        ss = String(args.door_self);

        //$gameSelfSwitches._data[[$gameMap.mapId(), evId, ss]] = true;
        $gameSelfSwitches.setValue([$gameMap.mapId(), evId, ss], true)
    
    });


    PluginManager.registerCommand(script, "door_close", args => { //指定したドアのセルフスイッチ false
        ev = String(args.door_ev);
        evId = Game_Map.prototype.ev_num(ev);
        ss = String(args.door_self);

        //delete $gameSelfSwitches._data[[$gameMap.mapId(), evId, ss]]; 
        $gameSelfSwitches.setValue([$gameMap.mapId(), evId, ss], false)

    });




Game_Map.prototype.ev_num = function(name) { //イベント名をイベントIdに変換
    let num = 0;
    let data = $dataUniques.map_event;
    //console.log(`<${name}>`)

    for (let cnt = 1,len = data.length ;cnt < len ;cnt++) {
        if (data[cnt]['name'] == name) {
            num = data[cnt]['Id'];
            break
        }
    }
    //console.log(num)
    return num;
};


})();