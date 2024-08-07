

/*:ja
 * @target MZ
 * @plugindesc jason オブジェクト宣言
 * @author わし
 *
 * @help
 *
 * jsonファイルを読み込む
 * 
 */

(() => {
    'use strict';


    const script = 'ish_ob';
    const parameters = PluginManager.parameters(script);
  


//これは意味あります……　アイテムデータテーブル.jsonを　オブジェクトとして登録するにあたり　プラグインを分ける必要があって？
    let $dataTable       = null;
    DataManager._databaseFiles.push(
        { name: '$dataTable', src: 'item_table.json'}
    );

    let $dataTalk       = null;
    DataManager._databaseFiles.push(
        { name: '$dataTalk', src: 'talk_data.json'}
    );

    let $dataTalk_party       = null;
    DataManager._databaseFiles.push(
        { name: '$dataTalk_party', src: 'talk_data_party.json'}
    );





})();