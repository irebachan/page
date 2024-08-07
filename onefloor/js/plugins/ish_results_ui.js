/*:ja
 * @target MZ
 * @plugindesc UIって何だよ
 * @author わし
 * @base PluginCommonBase
 *
 * @help
 *
 * モーショングラフィックをやりテーンだよ……　
 * 
 * 
 * @param num_talk
 * @type variable
 * @text 変数　話かけた回数
 * @desc 
 * @default 21
 * 
 * @param num_search
 * @type variable
 * @text 変数　調べた回数
 * @desc 
 * @default 22
 * 
 * 
 * 
 * @command set_basePicture
 * @text 表示：ベース画像
 * @desc 
 * 
 * @arg title
 * @text 題字
 * @desc 「接点一覧」とか　そういう文字列
 * @default 接点一覧
 * @type string
 * 
 * 
 * @command remove_basePicture
 * @text 消去：ベース画像
 * @desc 
 * 
 * 
 * 
 * @command set_pic_text
 * @text 表示：ゲージ、アイコン、キャラ名前
 * @desc 
 * 
 * @command remove_pic_text
 * @text 消去：ゲージ、アイコン、キャラ名前
 * @desc 
 * 
 * 
 * @command set_result
 * @text 表示：クリア情報
 * @desc 
 * 
 * @command remove_result
 * @text 消去：クリア情報
 * @desc 
 * 
 * 
 * 
 * 
 * @command set_after_Picture
 * @text 表示：接点一覧表示後の装飾用画像
 * @desc 
 * 
 * @command remove_after_Picture
 * @text 消去：接点一覧表示後の装飾用画像
 * @desc 
 * 
 * @command delete_all_uiPic
 * @text 完全消去；UIピクチャを全て消す
 * @desc 
 * 
 * @command plus_talk
 * @text 加算：話しかけた回数
 * @desc 
 * 
 * @command plus_search
 * @text 加算：調べた回数
 * @desc 
 * 
 * 
 * @command line
 * @text 文字の高さ
 * @desc 行間を設定する
 * 
 * @arg height
 * @text 文字の高さ
 * @desc ツクール のデフォは３６やで
 * @default 36
 * @type number
 * 
 * 
 */

(() => {
    'use strict';
    const script = 'ish_results_ui';
    const parameters = PluginManager.parameters(script);
    const parameters_other = PluginManager.parameters('ish_time_event');


    let talking_point = Number(parameters_other['talking_point'] || 1); //別のJSで決めたやつ　接点
    let talking_head = String(parameters_other['talking_head'] || 'com_'); //　別のJSから　プロパティの頭  

    let num_talk = Number(parameters['num_talk'] || 1);  // プラグインパラメーターで指定した変数に　話かけた回数
    let num_search = Number(parameters['num_search'] || 1); //
    


    PluginManagerEx.registerCommand(document.currentScript, "set_basePicture", args => {

        pic_display_base(true,String(args.title))
    });

    PluginManagerEx.registerCommand(document.currentScript, "remove_basePicture", args => {
        pic_display_base(false)
    });


    PluginManagerEx.registerCommand(document.currentScript, "set_after_Picture", args => {
        pic_display_chara(true)
    });

    PluginManagerEx.registerCommand(document.currentScript, "remove_after_Picture", args => {
        pic_display_chara(false)
    });

    PluginManagerEx.registerCommand(document.currentScript, "delete_all_uiPic", args => {
        delete_all_uiPic();
    });


    PluginManagerEx.registerCommand(document.currentScript, "set_pic_text", args => {
        pic_display_loop(true);
    });

    PluginManagerEx.registerCommand(document.currentScript, "remove_pic_text", args => {
        pic_display_loop(false);
    });

    PluginManagerEx.registerCommand(document.currentScript, "set_result", args => {
        pic_display_result(true);
    });

    PluginManagerEx.registerCommand(document.currentScript, "remove_result", args => {
        pic_display_result(false);
    });

    PluginManagerEx.registerCommand(document.currentScript, "plus_talk", args => {
        num_count('話しかけた回数');
    });

    PluginManagerEx.registerCommand(document.currentScript, "plus_search", args => {
        num_count('調べた回数');
    });

    PluginManagerEx.registerCommand(document.currentScript, "line", args => {
        let the_num =  Number(args.height);
        set_lineHeight(the_num);
    }); ///文字の高さを変える





    let set_lineHeight = (num) => { //行間変える関数
        const _Window_base_LineHeight = Window_Base.prototype.lineHeight;
        Window_Base.prototype.lineHeight = function() {
        _Window_base_LineHeight.apply(this, arguments);
        return num; //編集　行間　デフォ36
        };
    };


    //テキストピクチャ　をパクって来ました……

    let textPictureText = "";

    const _Game_Picture_show = Game_Picture.prototype.show;
    Game_Picture.prototype.show = function() {
        _Game_Picture_show.apply(this, arguments);
        if (this._name === "" && textPictureText) {
            this.mzkp_text = textPictureText;
            this.mzkp_textChanged = true;
            textPictureText = "";
        }
    };

    const _Sprite_Picture_destroy = Sprite_Picture.prototype.destroy;
    Sprite_Picture.prototype.destroy = function() {
        destroyTextPictureBitmap(this.bitmap);
        _Sprite_Picture_destroy.apply(this, arguments);
    };

    const _Sprite_Picture_updateBitmap = Sprite_Picture.prototype.updateBitmap;
    Sprite_Picture.prototype.updateBitmap = function() {
        _Sprite_Picture_updateBitmap.apply(this, arguments);
        if (this.visible && this._pictureName === "") {
            const picture = this.picture();
            const text = picture ? picture.mzkp_text || "" : "";
            const textChanged = picture && picture.mzkp_textChanged;
            if (this.mzkp_text !== text || textChanged) {
                this.mzkp_text = text;
                destroyTextPictureBitmap(this.bitmap);
                this.bitmap = createTextPictureBitmap(text);
                picture.mzkp_textChanged = false;
            }
        } else {
            this.mzkp_text = "";
        }
    };

    function createTextPictureBitmap(text) {
        const tempWindow = new Window_Base(new Rectangle());
        const size = tempWindow.textSizeEx(text);
        tempWindow.padding = 0;
        tempWindow.move(0, 0, size.width, size.height);
        tempWindow.createContents();
        tempWindow.drawTextEx(text, 0, 0, 0);
        const bitmap = tempWindow.contents;
        tempWindow.contents = null;
        tempWindow.destroy();
        bitmap.mzkp_isTextPicture = true;
        return bitmap;
    }

    function destroyTextPictureBitmap(bitmap) {
        if (bitmap && bitmap.mzkp_isTextPicture) {
            bitmap.destroy();
        }
    }






/*
    //画像を任意の角度に静止させるため　メソッドの書き換え
    Game_Picture.prototype.updateRotation = function() {
        if (this._rotationSpeed !== 0) {
            this._angle += this._rotationSpeed / 2;
        }
    };
*/
    const _Game_Picture_updateRotation = Game_Picture.prototype.updateRotation;
    Game_Picture.prototype.updateRotation = function() {
        _Game_Picture_updateRotation.apply(this, arguments);
        this._angle = this._rotationSpeed;
    }


let num_count = (type) => { //話し掛けた回数などインクリメントする
    if (type == '話しかけた回数') {
        if (!$gameVariables.value(num_talk)) {$gameVariables._data[num_talk] = 0}; //未宣言？なら0代入
        $gameVariables._data[num_talk]++;
        
    } else {
        if (!$gameVariables.value(num_search)) {$gameVariables._data[num_search] = 0}; //未宣言？なら0代入
        $gameVariables._data[num_search]++; 
        //console.log(`変数[${num_search}]:[${$gameVariables.value(num_search)}]`)
    };
};
    

class ui_type { //クラス
    constructor(name) {
        this.name = name;
        this.data = $dataUniques.result_ui;//静的データ
    }
    
    //static　data = $dataUniques.result_ui;//静的データ
}

ui_type.prototype.dataset = function() { //表から各種データをプロパティにいれる　意味があるかは知らん
   
    for (let cnt = 1,len = this.data.length ;cnt<len ;cnt++) {
        if (this.data[cnt]['name'] == this.name) {
            let num = this.data[cnt]['Id']

            this.type   = num;
            this.name   = this.data[cnt]['name'];
            this.Id     = this.data[cnt]['pic_id_min'];
            this.origin = this.data[cnt]['origin'];
            this.x      = this.data[cnt]['x'];
            this.y      = this.data[cnt]['y'];
            this.collum = this.data[cnt]['collum'];
            this.offset_x = this.data[cnt]['offset_x'];
            this.offset_y = this.data[cnt]['offset_y'];

            delete this.data;           
            return this
        }
    }
}

ui_type.prototype.pic_offset_x = function(collum) {　//横にオフセット
    this.x = Number(this.x) + Number(this.offset_x) * collum;
    return this;
};

ui_type.prototype.pic_offset_y = function() { //縦をオフセット
    this.y = Number(this.y) + Number(this.offset_y)
    return this
}

ui_type.prototype.pic_offset_Id_base = function(n,big) { //ピクチャIDをオフセットしたいんだけど……？
    if (n > 0) { //二行目以降は……？ [big]は配列の配列状態の変数
        for (let cnt = 0,len = n ; cnt < len ;cnt++) {
            this.Id = Number(this.Id)+ big[cnt].length;
            //console.log(`picId:[${this.Id}]`)
        };
    };
    return this
}

ui_type.prototype.pic_offset_Id_text = function(n) {
    if (n > 0) {
        this.Id = Number(this.Id) + n;
    }
    return this;
};

ui_type.prototype.pic_offset_Id = function() {
    this.Id++
    return this;
};


ui_type.prototype.pic_pre = function(file, shift_x = 0, shift_y = 0, width = 100, height = 100) { 
    //規程位置よりシフトした場所で　透明度０で表示する
    //$gameScreen.showPicture(番号,"画像の名前",原点,x座標,y座標,幅の拡大率,高さの拡大率,不透明度,合成方法)
    let mapX = Number(this.x) + Number(shift_x);
    let mapY = Number(this.y) + Number(shift_y); //console.log(`規程位置：${this.x},${this.y}　シフト位置：${mapX},${mapY}`)

    if (this.origin == "0") {
        $gameScreen.showPicture(this.Id,file, 0, mapX, mapY, width, height,0,0);
    }else {
        $gameScreen.showPicture(this.Id,file, 1, mapX, mapY, width, height,0,0);
    }
    return this;
};

ui_type.prototype.pic_disp = function(wait = 1,easing = 0, width = 100, height = 100) { //規程位置に１００％表示　ウェイトとイージング設定
   
    if (this.origin == "0") { //なんか原点が混同されるので……
        $gameScreen.movePicture(this.Id,0,this.x,this.y,width,height,255,0,wait,easing)
    }else {
        $gameScreen.movePicture(this.Id,1,this.x,this.y,width,height,255,0,wait,easing)
    }

    return this;
}

ui_type.prototype.pic_rotate = function(angle) { //角度を指定して　画像を回転する
    $gameScreen.rotatePicture(this.Id, angle)
    return this;
}


ui_type.prototype.pic_remove= function(wait = 1,easing = 0, shift_x = 0, shift_y = 0, width = 100, height = 100) { //消去する前に透明度０にする
    let mapX = Number(this.x) + Number(shift_x);
    let mapY = Number(this.y) + Number(shift_y); //console.log(`規程位置：${this.x},${this.y}　シフト位置：${mapX},${mapY}`)

    if (this.origin == "0") { //なんか原点が混同されるので……
        $gameScreen.movePicture(this.Id,0,mapX, mapY, width,height,0,0,wait,easing)
    }else {
        $gameScreen.movePicture(this.Id,1,mapX, mapY, width,height,0,0,wait,easing)
    }

    return this;
}





class evList { //有効なイベントリスト……
}

evList.prototype.available = function() {
    let data = $dataUniques.map_event;
    let prop = '';
    let w = [];
    let obj = {};

    for (let cnt = 1,len = data.length; cnt < len ;cnt++) {

        if (data[cnt]['ev_type'] == 'main' || data[cnt]['ev_type'] == 'sub') {//メインキャラかサブの場合
            prop = talking_head + data[cnt]['Id']; //プロパティ名を生成 プロパティは最初に作っておこう

            if ($gameVariables.value(talking_point)[prop] > 0) { //オブジェクトに接点も追加したら？
                obj = data[cnt];
                obj['point'] = $gameVariables.value(talking_point)[prop] //プロパティ[point]を追加
                //console.log(obj);
                w.push(obj); //オブジェクトを配列に追加
            }
        }
    }
    this.list = w;
    return this;
}

evList.prototype.collum = function(collum) { //配列の中に配列が入ってる状態がリターンされる
    let copy = this.list.slice(0,this.list.length)
    let str = [];

    let warizan = copy.length / collum;
    warizan = Math.ceil(warizan);//切り上げ

    for (let cnt = 0; cnt < warizan ; cnt++) {
        for (let num = 0; num < collum ; num++) {

            if (!str[num]) { //配列がなかったら　宣言する
                str[num] = [];
            }
            str[num].push(copy[0]);
            copy.shift();

            if (!copy.length) {
                break;
            };
        };
    };
    this.sort = str;
    return this;
};

evList.prototype.setValue = function(type,n,value) { //ゲーム内変数[value]に this.sortの[n-1]行目（１始まりのため）を記述
    let ttt = this.sort[n-1]
    let w = '';
    let ss = '';

    if (ttt) {
        for (let cnt = 0,len = ttt.length; cnt < len ; cnt++) {
            if (type == 'name_hensu') { //何を代入するか　通り名か？ その他か？　イベント表のプロパティを参照
                ss = $gameVariables.value(ttt[cnt]['name_hensu']);
            } else {
                ss = ttt[cnt][type];
                //console.log(`${type}:${ss}`)
            }
                w += ss + '\n'; //改行 配列ではなくただの文字列変数である。
        }
        $gameVariables._data[value] = w; //ここでゲーム内変数に代入
    }
    return this;
};

evList.prototype.setValue_text = function(type) { //this.sortを記述できるデータに変形
    let ttt = [];
    let w = '';
    let ss = '';
    this.text =　[];

    for (let num = 0,leng = this.sort.length; num<leng ; num++) {
        w = '';
        ttt = this.sort[num];
        if (ttt) {
            for (let cnt = 0,len = ttt.length; cnt < len ; cnt++) {
                if (type == 'name_hensu') { //何を代入するか　通り名か？ その他か？　イベント表のプロパティを参照
                    ss = $gameVariables.value(ttt[cnt]['name_hensu']);
                } else {
                    ss = ttt[cnt][type];
                    //console.log(`${type}:${ss}`)
                }
                    w += ss + '\n'; //改行 配列ではなくただの文字列変数である。
            }
            this.text[num] = w;
        }
    }
    return this;
};

evList.prototype.mostChara = function(){ //一番接点の高いキャラの名前など？を返す
    let obj = this.list.slice(0,this.list.length);//配列の中にオブジェクトがある。その各オブジェクトの[point]を比較したい。

    if (obj !== [] && obj !== false) {
        let point_list = obj.map(item => item.point); //多分　接点だけの配列が作られた？？？
        
        point_list.sort(function(a,b){ //降順にソートする
            return b-a;
        });
        const member = obj.find(item => item.point === point_list[0]) //一致した最初のデータを返す　らしい……
        this.most = member;
    }
    return this
};


let pic_display_base = (onoff = true,title) => { //ベースピクチャ表示
    if (!title) {title = '題字'};

    let text   = new ui_type('リザルト（題字）').dataset();
    let banner = new ui_type('リザルト（バナー）').dataset();
    let back = new ui_type('背景画像').dataset();

    if (onoff) {
        textPictureText =　`\\{\\{${title}`; //題字  接点一覧
        text.pic_pre('',0,-200).pic_disp(15,2);
        banner.pic_pre('banner',0,-200).pic_disp(15,2);
        back.pic_pre('window_back',0,0,30,30).pic_disp(5,2);
    } else {
        text.pic_remove(10,2,0,-200)
        banner.pic_remove(10,2,0,-200)
        back.pic_remove(10,2)
    };
};

let pic_display_chara = (onoff = true) => { //一番接点が高かった人
    let qqq = new evList().available().mostChara();
    if (qqq.most) {
        let file = qqq.most['chara_pic'];
        let charaName = new ui_type('キャラ名：最大接点').dataset()
        let chara = new ui_type('画像：最大接点').dataset()

        if (onoff) { 
            textPictureText = '\\{\\{\\{\\{\\{\\{' + $gameVariables.value(qqq.most['name_hensu']) + '\n';
            textPictureText += `\\}\\}\\}\\}\\}\\}${qqq.most['name_rubi']} /${qqq.most['note'] || '人生万事塞翁が馬'}`; //バックスラッシュはエスケープする必要あり（2回入力する）

            charaName.pic_pre('').pic_disp(20,2).pic_rotate(-15);//事前に動的テキストPにデータを渡しておく
            chara.pic_pre(file,0,300).pic_disp(20,2);//最大接点のキャラ……
        } else {
            charaName.pic_remove(10,2)
            chara.pic_remove(10,2,0,300)
        };
    }
}


let pic_display_result = (onoff = true) => {
    let t_talk = new ui_type('t_人と話した回数').dataset();
    let n_talk = new ui_type('n_人と話した回数').dataset();
    let d_talk = new ui_type('d_人と話した回数').dataset();

    let t_search = new ui_type('t_調べた回数').dataset();
    let n_search = new ui_type('n_調べた回数').dataset();
    let d_search = new ui_type('d_調べた回数').dataset();

    let {t_point, n_point, p_point} = 
    {t_point: new ui_type('t_最も接点が高い').dataset(), n_point: new ui_type('n_最も接点が高い').dataset(), p_point: new ui_type('p_最も接点が高い').dataset()};

    let talk = $gameVariables.value(num_talk);
    let search = $gameVariables.value(num_search);

    let name = '自分！';
    let file = 'actor2_6';

    let qqq = new evList().available().mostChara();
    if (qqq.most) {
        //file = qqq.most['chara_pic'];
        name = $gameVariables.value(qqq.most['name_hensu'])
    };

    if (onoff) { //値で分岐したいが、セリフはどこで設定しよう。
        textPictureText = `人に話しかけた回数`;
            t_talk.pic_pre('').pic_disp(20,2);
        textPictureText = `：${talk}回`;
            n_talk.pic_pre('').pic_disp(20,2);
        textPictureText = `\\c[8]パラリラパラリラ〜`;
            d_talk.pic_pre('').pic_disp(20,2);

        textPictureText = `オブジェクトを調べた回数`;
            t_search.pic_pre('').pic_disp(20,2);
        textPictureText = `：${search}回`;
            n_search.pic_pre('').pic_disp(20,2);
        textPictureText = `\\c[8]タラリラ〜`;
            d_search.pic_pre('').pic_disp(20,2);

        textPictureText = `一番接点が高いキャラクター`;
            t_point.pic_pre('').pic_disp(20,2);
        textPictureText = `\\{${name}`; //エスケープ　文字拡大
            n_point.pic_pre('').pic_disp(20,2);//キャラの名前
            //p_point.pic_pre(file,0,300).pic_disp(15,2);　//キャラ画像 暫定未定だぞ

    } else {
        t_talk.pic_remove(10,2);
        n_talk.pic_remove(10,2);
        d_talk.pic_remove(10,2);
        t_search.pic_remove(10,2);
        n_search.pic_remove(10,2);
        d_search.pic_remove(10,2);
        t_point.pic_remove(10,2);
        n_point.pic_remove(10,2);
        //p_point.pic_remove(10,2,0,300);
    }


};



let set_type_text = (type) => {
    let ttt = new ui_type('キャラ名').dataset()//行の分割数を取得するため
    let qqq = new evList().available().collum(ttt.collum).setValue_text(type);//使用可能なデータを　行に分割して　指定した[タイプ]の情報を変換して戻す
    return qqq.text;
}

let pic_display_loop = (onoff = true) => {
    let qqq = set_evData_pic();
    let small = 0;
    let gauge_width = 0;
    let icon_pic = '';

    let gauge = {};
    let gauge_base = {};
    let chara_icon = {};
    let text_name = {};
    let text_point = {};

    let slot_name  = set_type_text('name_hensu');
    let slot_point = set_type_text('point');


    for (let cnt = 0,len = qqq.length; cnt<len ;cnt++) {
        gauge      = new ui_type('ゲージ').dataset().pic_offset_x(cnt).pic_offset_Id_base(cnt,qqq);
        gauge_base = new ui_type('ゲージ・ベース').dataset().pic_offset_x(cnt).pic_offset_Id_base(cnt,qqq);
        chara_icon = new ui_type('キャラアイコン').dataset().pic_offset_x(cnt).pic_offset_Id_base(cnt,qqq);
        text_name = new ui_type('キャラ名').dataset().pic_offset_x(cnt).pic_offset_Id_text(cnt);
        text_point = new ui_type('接点').dataset().pic_offset_x(cnt).pic_offset_Id_text(cnt);

        if (onoff) {
            textPictureText = slot_name[cnt]
            text_name.pic_pre('').pic_disp(20,2);

            textPictureText = slot_point[cnt]
            text_point.pic_pre('').pic_disp(20,2);
        } else {
            text_name.pic_remove(10,2);
            text_point.pic_remove(10,2);
        }


        small = qqq[cnt];
        for (let cnt_s = 0,len_s = small.length; cnt_s<len_s ;cnt_s++) {
            if (cnt_s > 0) {
                gauge.pic_offset_y().pic_offset_Id();
                gauge_base.pic_offset_y().pic_offset_Id();
                chara_icon.pic_offset_y().pic_offset_Id();
            };

            gauge_width = percent(small[cnt_s]['point'],20); //ゲージ幅：分母は仮です
            if (onoff) { //表示するのか　消去するのか
                icon_pic = small[cnt_s]['icon_pic'];

                gauge.pic_pre('gauge',0,0,0).pic_disp(20,2,gauge_width) //幅０で表示して　幅を指定の変数の値に変更する……
                gauge_base.pic_pre('gauge_blank').pic_disp(5,2)
                chara_icon.pic_pre(icon_pic).pic_disp(5,2)
    
                //ゲージが１００％だったら一瞬発光する演出とか？
                
            } else { //リムーブ（「ピクチャの移動」で透明度を０にする）
                gauge.pic_remove(10,2,0,0,gauge_base);
                gauge_base.pic_remove(10,2);
                chara_icon.pic_remove(10,2);
            };
            
         };
    };
};


function delete_all_uiPic() {
    let top = $dataUniques.result_ui[$dataUniques.result_ui.length - 1]['value_min'];
    let bottom = $dataUniques.result_ui[$dataUniques.result_ui.length - 1]['value_max'];

    for (let cnt = top, len = bottom; cnt <= len; cnt++) {
            $gameScreen.erasePicture(cnt);
        };
    //console.log(`[${top}]から[${bottom}]の画像を削除したよ（多分）`)
}

let set_evData_pic = () => { //有効なイベントデータをピックアップする
    let ttt = new ui_type('キャラ名').dataset()
    let qqq = new evList().available().collum(ttt.collum)
    return qqq.sort;
};


let percent = (child,parent) => { //分子分母を引数にして　パーセンテージを返す 
    let per = child / parent;
    
    let n = 2 ; // 小数点第n位まで残す
    let result = Math.floor( per * Math.pow( 10, n ) ) / Math.pow( 10, n );
    result *= 100; //100を掛ける　50%、　みたいに整数にして画像の拡大縮小などに使いたいから

    if (result < 0) {
        result = 0;
    } else if (result > 100) {
        result = 100;
    };
    return result;
};


})();