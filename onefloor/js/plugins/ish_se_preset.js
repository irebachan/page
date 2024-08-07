
/*:ja
 * @target MZ
 * @plugindesc 効果音のプリセット
 * @author わし
 *
 * @help
 *
 * 「シャキーン！」とか「キラリン♪」みたいな音を出したい時用のプリセットJS内にを改め作っておきます。
 * プラグインコマンドで呼び出します。
 * 
 * 
 * @command se
 * @text 効果音プリセット
 * @desc 指定した効果音を鳴らします
 * 
 * 
 * @arg type
 * @text 音の雰囲気
 * @desc 音の雰囲気
 * @default ピョイッ
 * @type select
 * 
 * @option ピョイッ（吹き出しなど）
 * @value ピョイッ
 * 
 * @option ビョイーン（ジャンプなど）
 * @value ビョイーン
 * 
 * @option キラリン
 * @value キラリン
 * 
 * @option お金（ガチャガチャ・チャリーン！　みたいなの）
 * @value お金
 * 
 * @option アイテム入手
 * @value アイテム入手
 *
 * @option どっ（面白いこと言ったつもりの時）
 * @value どっ
 * 
 * @option ガーン（ギャグ的なショックを受ける）
 * @value ガーン
 * 
 * @option イライラ（痺れ）
 * @value イライラ
 * 
 * @option ちゃっかり（チーン♪）
 * @value ちゃっかり
 * 
 * @option どんより（どよよ……）
 * @value どんより
 * 
 * @option グサッ（殴られたような衝撃）
 * @value グサッ
 * 
 * @option ごにょごにょ（呪詛？）
 * @value ごにょごにょ
 * 
 */

(() => {
    'use strict';

    //let parameters = PluginManager.parameters('ish_common_move');//
    const script = 'ish_se_preset';
    let se_type = '';
    let se_play = 0;

    PluginManager.registerCommand(script, "se", args => {
        se_type = String(args.type);
        se_play = Game_Map.prototype.se_sorting(se_type);
        Game_Map.prototype.play_se(se_play);
    });




    Game_Map.prototype.play_se = function(id) { //ユニーク変数からSEデータを持ってきて再生
        let data = $dataUniques.se_preset
        AudioManager.playSe({"name":data[id]['name'],"volume":data[id]['volume'],"pitch":data[id]['pitch'],"pan":data[id]['pan']});

    }; // $gameMap.

    Game_Map.prototype.se_sorting = function(type) { //文字列で指定したSEをIDに仕分け
        let se_id = 0; //ループで検索しても良いけど……いちいちループ走らせるのかぁと思ってつい　スイッチ構文である。

        switch (type) {
            case 'ピョイッ':
                se_id = 1;
                break;

            case 'ビョイーン':
                se_id = 2;
                break;

            case 'キラリン':
                se_id = 3;
                break;

            case 'お金':
                se_id = 4;
                break;

            case 'アイテム入手':
                se_id = 5;
                break;

            case 'どっ':
                se_id = 6;
                break;

            case 'ガーン':
                se_id = 7;
                break;

            case 'イライラ':
                se_id = 8;
                break;

            case 'ちゃっかり':
                se_id = 9;
                break;

            case 'どんより':
                se_id = 10;
                break;

            case 'グサッ':
                se_id = 11;
                break;
            
            case 'ごにょごにょ':
                se_id = 12;
                break;
       
            
            default:
                console.log(`[se type:${type}]は設定されてないよ`);
                break;
        };
        
        if (se_id > 0) {
            return se_id;
        };
    }; // $gameMap.move_common('');  引数（タイプ）　タイプ：キラリン　とかそういうの








    






})();