﻿//=============================================================================
// Chronus.js
// ----------------------------------------------------------------------------
// (C) 2015 Triacontane
// This software is released under the MIT License.
// http://opensource.org/licenses/mit-license.php
// ----------------------------------------------------------------------------
// Version
// 2.0.1 2020/08/26 ベースプラグインの説明を追加
// 2.0.0 2020/08/26 MZで動作するよう修正
// 1.0.0 2015/11/27 初版
// ----------------------------------------------------------------------------
// [Blog]   : https://triacontane.blogspot.jp/
// [Twitter]: https://twitter.com/triacontane/
// [GitHub] : https://github.com/triacontane/
//=============================================================================

/*:
 * @plugindesc ゲーム内時間の導入プラグイン
 * @target MZ
 * @url https://github.com/triacontane/RPGMakerMV/tree/mz_master/Chronus.js
 * @base PluginCommonBase
 * @author トリアコンタン
 *
 * @param 月ごとの日数配列
 * @desc 各月の日数の配列です。カンマ区切りで指定してください。個数は自由です。
 * @default 31,28,31,30,31,30,31,31,30,31,30,31
 *
 * @param 月名配列
 * @desc 月の名称配列です。カンマ区切りで指定してください。個数は自由です。
 * @default Jan.,Feb.,Mar.,Apr.,May.,Jun.,Jul.,Aug.,Sep.,Oct.,Nov.,Dec.
 *
 * @param 曜日配列
 * @desc 曜日の名称配列です。カンマ区切りで指定してください。個数は自由です。
 * @default (日),(月),(火),(水),(木),(金),(土)
 *
 * @param 自然時間加算
 * @type number
 * @desc 1秒（自然時間加算間隔で指定した間隔）ごとに加算されるゲーム時間（分単位）の値です。イベント処理中は無効です。
 * @default 5
 *
 * @param 自然時間加算間隔
 * @type number
 * @desc ゲーム時間の自然加算が行われる間隔(フレーム数)です。1F=1/60秒
 * @default 60
 *
 * @param 場所移動時間加算
 * @type number
 * @desc 1回の場所移動で加算されるゲーム時間（分単位）の値です。
 * @default 30
 *
 * @param 戦闘時間加算(固定)
 * @type number
 * @desc 1回の戦闘で加算されるゲーム時間（分単位）の値です。
 * @default 30
 *
 * @param 戦闘時間加算(ターン)
 * @type number
 * @desc 1回の戦闘で消費したターン数ごとに加算されるゲーム時間（分単位）の値です。
 * @default 5
 *
 * @param 年のゲーム変数
 * @type variable
 * @desc 指定した番号のゲーム変数に「年」の値が自動設定されます。
 * @default 0
 *
 * @param 月のゲーム変数
 * @type variable
 * @desc 指定した番号のゲーム変数に「月」の値が自動設定されます。
 * @default 0
 *
 * @param 日のゲーム変数
 * @type variable
 * @desc 指定した番号のゲーム変数に「日」の値が自動設定されます。
 * @default 0
 *
 * @param 曜日IDのゲーム変数
 * @type variable
 * @desc 指定した番号のゲーム変数に「曜日」のIDが自動設定されます。
 * @default 0
 *
 * @param 曜日名のゲーム変数
 * @type variable
 * @desc 指定した番号のゲーム変数に「曜日」の名称が自動設定されます。
 * ゲーム変数に文字列が入るので注意してください。
 * @default 0
 *
 * @param 時のゲーム変数
 * @type variable
 * @desc 指定した番号のゲーム変数に「時」の値が自動設定されます。
 * @default 0
 *
 * @param 分のゲーム変数
 * @type variable
 * @desc 指定した番号のゲーム変数に「分」の値が自動設定されます。
 * @default 0
 *
 * @param 累計時間のゲーム変数
 * @type variable
 * @desc 指定した番号のゲーム変数に「累計時間」（分単位）の値が自動設定されます。
 * @default 0
 *
 * @param 累計日数のゲーム変数
 * @type variable
 * @desc 指定した番号のゲーム変数に「累計日数」の値が自動設定されます。
 * @default 0
 *
 * @param 時間帯IDのゲーム変数
 * @type variable
 * @desc 指定した番号のゲーム変数に「時間帯」のIDが自動設定されます。
 * 0:深夜 1:早朝 2:朝 3:昼 4:夕方 5:夜
 * @default 0
 *
 * @param 天候IDのゲーム変数
 * @type variable
 * @desc 指定した番号のゲーム変数に「天候」のIDが自動設定されます。
 * 0:なし 1:雨 2:嵐 3:雪
 * @default 0
 *
 * @param フォーマット時間の変数
 * @type variable
 * @desc 「フォーマット時間の計算式」に基づいて計算した結果が自動設定されます。
 * @default 0
 *
 * @param フォーマット時間の計算式
 * @desc 日時フォーマットを使った計算式の内容です。
 * YYYY:年 MON:月名 MM:月 DD:日 など(詳細はヘルプ参照)
 * @default HH24 * 60 + MI
 *
 * @param 日時フォーマット1
 * @desc マップ上の日付ウィンドウ1行目に表示される文字列です。
 * YYYY:年 MON:月名 MM:月 DD:日 など(詳細はヘルプ参照)
 * @default YYYY年 MM月 DD日 DY
 *
 * @param 日時フォーマット2
 * @desc マップ上の日付ウィンドウ2行目に表示される文字列です。
 * YYYY:年 MON:月名 MM:月 DD:日 など(詳細はヘルプ参照)
 * @default AMHH時 MI分
 *
 * @param 日時フォーマット行間
 * @type number
 * @desc カレンダー表示の行間です。
 * @default 0
 *
 * @param カレンダー表示X座標
 * @type number
 * @desc カレンダーの表示 X 座標です。
 * @default 0
 *
 * @param カレンダー表示Y座標
 * @type number
 * @desc カレンダーの表示 Y 座標です。
 * @default 0
 *
 * @param カレンダーフォントサイズ
 * @type number
 * @desc カレンダーのフォントサイズです。0を指定するとデフォルトとなります。
 * @default 0
 *
 * @param カレンダー不透明度
 * @type number
 * @desc カレンダーの背景の不透明度(0-255)です。
 * @default 192
 *
 * @param カレンダー枠の非表示
 * @type boolean
 * @desc カレンダーのウィンドウ枠を非表示にします。
 * @default false
 *
 * @param カレンダーの非表示
 * @type boolean
 * @desc カレンダーを非表示します。プラグインコマンドから表示できます。
 * @default false
 *
 * @param カレンダー余白
 * @type number
 * @desc カレンダーの余白(8-)です。
 * @default 8
 *
 * @param 文字盤画像ファイル
 * @desc アナログ時計を表示する場合の文字盤画像ファイル名（拡張子は不要）です。
 * 画像は「img/pictures/」以下に保存してください。
 * @default
 * @require 1
 * @dir img/pictures/
 * @type file
 *
 * @param 長針画像ファイル
 * @desc アナログ時計を表示する場合の長針画像ファイル名（拡張子は不要）です。
 * 画像は「img/pictures/」以下に保存してください。
 * @default
 * @require 1
 * @dir img/pictures/
 * @type file
 *
 * @param 短針画像ファイル
 * @desc アナログ時計を表示する場合の長針画像ファイル名（拡張子は不要）です。
 * 画像は「img/pictures/」以下に保存してください。
 * @default
 * @require 1
 * @dir img/pictures/
 * @type file
 *
 * @param 時計X座標
 * @type number
 * @desc アナログ時計の表示X座標です。画像の中心座標を指定してください。
 * @default 84
 *
 * @param 時計Y座標
 * @type number
 * @desc アナログ時計の表示Y座標です。画像の中心座標を指定してください。
 * @default 156
 *
 * @param イベント中時間経過
 * @desc イベント実行中も時間経過するようになります。(ON/OFF)
 * @default false
 * @type boolean
 *
 * @command ADD_TIME
 * @text 時間加算
 * @desc 指定した値（分単位）だけ時間が経過します。
 *
 * @arg time
 * @text 時間
 * @desc 加算する時間です。制御文字\v[n]を使う場合はテキストタブから入力してください。他の項目も同様
 * @default 0
 * @type number
 *
 * @command SET_TIME
 * @text 時間設定
 * @desc 指定した時間に変更します。
 *
 * @arg hour
 * @text 時間
 * @desc 設定する時間です。
 * @default 0
 * @type number
 * @min 0
 * @max 23
 *
 * @arg minute
 * @text 分
 * @desc 設定する分です。
 * @default 0
 * @type number
 * @min 0
 * @max 59
 *
 * @command ADD_DAY
 * @text 日付加算
 * @desc 指定した値（日単位）だけ日数が経過します。
 *
 * @arg day
 * @text 日数
 * @desc 加算する時間です。
 * @default 0
 * @type number
 *
 * @command SET_DAY
 * @text 日付設定
 * @desc 指定した日付に変更します。
 * @default 0
 * @type number
 *
 * @arg year
 * @text 年
 * @desc 設定する年です。
 * @default 1
 * @type number
 *
 * @arg month
 * @text 月
 * @desc 設定する月です。
 * @default 1
 * @type number
 *
 * @arg day
 * @text 日
 * @desc 設定する日です。
 * @default 1
 * @type number
 *
 * @command STOP
 * @text 時間停止
 * @desc 時間の進行を停止します。
 *
 * @command START
 * @text 時間開始
 * @desc 時間の進行を開始します。
 *
 * @command SHOW
 * @text カレンダー表示
 * @desc カレンダーを表示します。
 *
 * @command HIDE
 * @text カレンダー非表示
 * @desc カレンダーを非表示にします。
 *
 * @command DISABLE_TINT
 * @text 色調変化禁止
 * @desc 時間帯による色調の変更を禁止します。
 *
 * @command ENABLE_TINT
 * @text 色調変化許可
 * @desc 時間帯による色調の変更を許可します。
 *
 * @command DISABLE_WEATHER
 * @text 天候変化禁止
 * @desc 時間経過による天候の変化を禁止します。
 *
 * @command ENABLE_WEATHER
 * @text 天候変化許可
 * @desc 時間経過による天候の変化を許可します。
 *
 * @command SET_SNOW_LAND
 * @text 降雪地設定
 * @desc 悪天候時に雪が降るようになります。
 *
 * @command RESET_SNOW_LAND
 * @text 降雪地解除
 * @desc 悪天候時に雨もしくは嵐が降るようになります。
 *
 * @command RESET_SNOW_LAND
 * @text 降雪地解除
 * @desc 悪天候時に雨もしくは嵐が降るようになります。
 *
 * @command SET_SPEED
 * @text 速度設定
 * @desc 実時間1秒あたりの時間の経過速度を設定します。
 *
 * @arg speed
 * @text 速度
 * @desc 時間の経過速度です。
 * @default 1
 * @type number
 *
 * @command SHOW_CLOCK
 * @text アナログ時計表示
 * @desc アナログ時計を表示します。
 *
 * @command HIDE_CLOCK
 * @text アナログ時計非表示
 * @desc アナログ時計を非表示にします。
 *
 * @command SET_TIME_REAL
 * @text 実時間表示
 * @desc 時間の取得方法を実時間に変更します。
 *
 * @command SET_TIME_VIRTUAL
 * @text 仮想時間表示
 * @desc 時間の取得方法をゲーム内時間に変更します。
 *
 * @command SET_RAINY_PERCENT
 * @text 降水確率設定
 * @desc 降水確率(0-100)を設定します。
 *
 * @arg percent
 * @text 確率
 * @desc 降水確率です。
 * @default 0
 * @type number
 * @max 100
 *
 * @command INIT_TOTAL_TIME
 * @text 累計時間初期化
 * @desc 累計時間、累計日数を初期化します。
 *
 * @command SET_CLOCK_IMAGE
 * @text 時計画像ファイル変更
 * @desc アナログ時計のファイルを変更します。実際に画像が変更されるのはマップを移動した後になります。
 *
 * @arg baseFileName
 * @text 文字盤画像のファイル名
 * @desc 文字盤画像のファイル名です。ピクチャから選択します。指定しなかった場合、変更されません。
 * @default
 * @type file
 * @dir img/pictures
 *
 * @arg hourFileName
 * @text 短針画像のファイル名
 * @desc 短針画像のファイル名です。ピクチャから選択します。指定しなかった場合、変更されません。
 * @default
 * @type file
 * @dir img/pictures
 *
 * @arg minuteFileName
 * @text 長針画像のファイル名
 * @desc 長針画像のファイル名です。ピクチャから選択します。指定しなかった場合、変更されません。
 * @default
 * @type file
 * @dir img/pictures
 *
 * @command SET_SWITCH_TIMER
 * @text スイッチタイマー設定
 * @desc 指定した時間経過後にスイッチをONにできます。
 *
 * @arg name
 * @text タイマー名称
 * @desc タイマーの識別子です。解除するときに必要になるので、解除したい場合は設定してください。
 * @default
 *
 * @arg timeout
 * @text 時間
 * @desc 時間切れまでの時間(分)です。
 * @default 1
 * @type number
 * @min 1
 *
 * @arg switchId
 * @text スイッチ番号
 * @desc ONにするスイッチ番号です。
 * @default 1
 * @type switch
 *
 * @arg loop
 * @text ループ有無
 * @desc タイマーをループさせるかどうかです。
 * @default false
 * @type boolean
 *
 * @command SET_SELF_SWITCH_TIMER
 * @text セルフスイッチタイマー設定
 * @desc 指定した時間経過後にスイッチをONにできます。
 *
 * @arg name
 * @text タイマー名称
 * @desc タイマーの識別子です。解除するときに必要になるので、解除したい場合は設定してください。
 * @default
 *
 * @arg timeout
 * @text 時間
 * @desc 時間切れまでの時間(分)です。
 * @default 1
 * @type number
 * @min 1
 *
 * @arg selfSwitchId
 * @text セルフスイッチ番号
 * @desc ONにするセルフスイッチ番号です。
 * @default A
 * @type select
 * @option A
 * @option B
 * @option C
 * @option D
 *
 * @arg loop
 * @text ループ有無
 * @desc タイマーをループさせるかどうかです。
 * @default false
 * @type boolean
 *
 * @command SET_SWITCH_ALARM
 * @text スイッチアラーム設定
 * @desc 指定した時刻にスイッチをONにできます。
 *
 * @arg name
 * @text アラーム名称
 * @desc アラームの識別子です。解除するときに必要になるので、解除したい場合は設定してください。
 * @default
 *
 * @arg year
 * @text アラーム年
 * @desc アラームがONになる年です。0を指定すると現在年になります。
 * @default 0
 * @type number
 *
 * @arg month
 * @text アラーム月
 * @desc アラームがONになる月です。0を指定すると現在月になります。
 * @default 0
 * @type number
 *
 * @arg day
 * @text アラーム日
 * @desc アラームがONになる日です。0を指定すると現在日になります。
 * @default 0
 * @type number
 *
 * @arg hour
 * @text アラーム時間
 * @desc アラームがONになる時間です。
 * @default 0
 * @type number
 * @max 23
 *
 * @arg minute
 * @text アラーム分
 * @desc アラームがONになる分です。
 * @default 0
 * @type number
 * @max 59
 *
 * @arg switchId
 * @text スイッチ番号
 * @desc ONにするスイッチ番号です。
 * @default 1
 * @type switch
 *
 * @arg interval
 * @text インターバル
 * @desc アラームが有効になった後さらに指定した分だけ経過するとまたアラームが有効になります。
 * @default 0
 * @type number
 *
 * @command SET_SELF_SWITCH_ALARM
 * @text セルフスイッチアラーム設定
 * @desc 指定した時刻にセルフスイッチをONにできます。
 *
 * @arg name
 * @text アラーム名称
 * @desc アラームの識別子です。解除するときに必要になるので、解除したい場合は設定してください。
 * @default
 *
 * @arg year
 * @text アラーム年
 * @desc アラームがONになる年です。0を指定すると現在年になります。
 * @default 0
 * @type number
 *
 * @arg month
 * @text アラーム月
 * @desc アラームがONになる月です。0を指定すると現在月になります。
 * @default 0
 * @type number
 *
 * @arg day
 * @text アラーム日
 * @desc アラームがONになる日です。0を指定すると現在日になります。
 * @default 0
 * @type number
 *
 * @arg hour
 * @text アラーム時間
 * @desc アラームがONになる時間です。
 * @default 0
 * @type number
 * @max 23
 *
 * @arg minute
 * @text アラーム分
 * @desc アラームがONになる分です。
 * @default 0
 * @type number
 * @max 59
 *
 * @arg selfSwitchId
 * @text セルフスイッチ番号
 * @desc ONにするセルフスイッチ番号です。
 * @default A
 * @type select
 * @option A
 * @option B
 * @option C
 * @option D
 *
 * @arg interval
 * @text インターバル
 * @desc アラームが有効になった後さらに指定した分だけ経過するとまたアラームが有効になります。
 * @default 0
 * @type number
 *
 * @command CLEAR_TIMER
 * @text タイマー・アラーム解除
 * @desc タイマーおよびアラームを解除します。解除したタイマーは再開できません。
 *
 * @arg name
 * @text タイマー名称
 * @desc タイマーの識別子です。
 * @default
 *
 * @command STOP_TIMER
 * @text タイマー・アラーム停止
 * @desc タイマーおよびアラームを停止します。停止している間は条件を満たしてもスイッチはONになりません。
 *
 * @arg name
 * @text タイマー名称
 * @desc タイマーの識別子です。
 * @default
 *
 * @command START_TIMER
 * @text タイマー・アラーム再開
 * @desc タイマーおよびアラームを再開します。
 *
 * @arg name
 * @text タイマー名称
 * @desc タイマーの識別子です。
 * @default
 *
 * @help ゲーム内で時刻と天候の概念を表現できるプラグインです。
 * 自動、マップ移動、戦闘で時間が経過し、時間と共に天候と色調が変化します。
 * これらの時間は調節可能で、またイベント中は時間の進行が停止します。
 *
 * さらに、現実の時間をゲーム中に反映させる機能もあります。
 * 設定を有効にすると現実の時間がゲーム内とリンクします。
 *
 * 日付や曜日も記録し、曜日の数や名称を自由に設定できます。
 * 現在日付はフォーマットに従って、画面左上に表示されます。
 *
 * 日付フォーマットには以下を利用できます。
 * YYYY:年 MON:月名 MM:月 DD:日 HH24:時(24) HH:時(12)
 * AM:午前 or 午後 MI:分 DY:曜日 TZ 時間帯名称
 * DDALL:累計日数
 *
 * また、規格に沿った画像を用意すればアナログ時計も表示できます。
 * 表示位置は各画像の表示可否は調整できます。
 *
 * 画像の規格は以下の通りです。
 * ・文字盤 : 任意のサイズの正方形画像
 * ・長針　 : 文字盤と同じサイズの画像で、上（0）を指している針の画像
 * ・短針　 : 文字盤と同じサイズの画像で、上（0）を指している針の画像
 *
 * ツクマテにて規格に合った時計画像をリクエストしました。
 * 使用する場合は、以下のURLより利用規約を別途確認の上、ご使用ください。
 * http://tm.lucky-duet.com/viewtopic.php?f=47&t=555&p=1615#p1615
 *
 * ・タイマー操作系コマンド
 * コマンド実行から指定した時間[分]が経過後にスイッチやセルフスイッチを
 * ONにできるプラグインコマンドです。
 * 実時間連動機能と併せて使用することもできます。
 * スイッチの場合はIDを、セルフスイッチの場合は種類(A,B,C,D)を指定します。
 *
 * メモ欄詳細
 *  タイトルセットおよびマップのメモ欄に以下を入力すると、
 *  一時的に天候と色調変化を自動で無効化できます。
 *  屋内マップやイベントシーンなどで一時的に無効化したい場合に利用できます。
 *  設定はマップのメモ欄が優先されます。
 *
 * <C_Tint:OFF>    # 色調の変更を一時的に無効化します。
 * <C_色調:OFF>    # 同上
 * <C_Weather:OFF> # 天候を一時的に無効化します。
 * <C_天候:OFF>    # 同上
 * <C_Snow:ON>     # 天候を雪に設定します。
 * <C_雪:ON>       # 同上
 *
 * イベント実行中にも時間経過するかどうかをイベントごとに設定できます。
 * この設定はパラメータの設定よりも優先されます。
 * イベントのメモ欄に以下を入力してください。
 * <C_時間経過:ON> # イベント実行中に時間経過します。(ON/OFF)
 * <C_NoStop:ON>   # 同上
 *
 * 高度な設定
 * ソースコード中の「ユーザ書き換え領域」を参照すると以下を変更できます。
 *  時間帯の情報(朝が何時から何時まで等)
 *  時間帯ごとの色調(ただし、悪天候の場合は補正が掛かります)
 *
 * このプラグインの利用にはベースプラグイン『PluginCommonBase.js』が必要です。
 * 『PluginCommonBase.js』は、RPGツクールMZのインストールフォルダ配下の
 * 以下のフォルダに格納されています。
 * dlc/BasicResources/plugins/official
 *
 * 利用規約：
 *  作者に無断で改変、再配布が可能で、利用形態（商用、18禁利用等）
 *  についても制限はありません。
 *  このプラグインはもうあなたのものです。
 */

/**
 * ゲーム内時間を扱うゲームオブジェクトです。
 * @constructor
 */
function Game_Chronus() {
    this.initialize.apply(this, arguments);
}

/**
 * ゲーム内タイマーを扱うゲームオブジェクトです。
 * @constructor
 */
function Game_ChronusTimer() {
    this.initialize.apply(this, arguments);
}

/**
 * 時計画像を扱うスプライトです。
 * @constructor
 */
function Sprite_Chronicle_Clock() {
    this.initialize.apply(this, arguments);
}

/**
 * ゲーム内時間を描画するウィンドウです。
 * @constructor
 */
function Window_Chronus() {
    this.initialize.apply(this, arguments);
}

(function() {
    'use strict';
    //=============================================================================
    // ユーザ書き換え領域 - 開始 -
    //=============================================================================
    var settings = {
        /* timeZone:時間帯 */
        timeZone: [
            /* name:時間帯名称 start:開始時刻 end:終了時刻 timeId:時間帯ID */
            {name: '深夜', start: 0, end: 4, timeId: 0},
            {name: '早朝', start: 5, end: 6, timeId: 1},
            {name: '朝', start: 7, end: 11, timeId: 2},
            {name: '昼', start: 12, end: 16, timeId: 3},
            {name: '夕方', start: 17, end: 18, timeId: 4},
            {name: '夜', start: 19, end: 21, timeId: 5},
            {name: '深夜', start: 22, end: 24, timeId: 0}
        ],
        /* timeTone:時間帯ごとの色調 */
        timeTone: [
            /* timeId:時間帯ID value:色調[赤(-255...255),緑(-255...255),青(-255...255),グレー(0...255)] */
            {timeId: 0, value: [-68, -68, -34, 10]},
            {timeId: 1, value: [-17, -17, 0, 0]},
            {timeId: 2, value: [5, 5, 5, 0]},
            {timeId: 3, value: [17, 17, 17, 0]},
            {timeId: 4, value: [34, -17, -17, 0]},
            {timeId: 5, value: [-34, -34, -17, 6]}
        ]
    };
    //=============================================================================
    // ユーザ書き換え領域 - 終了 -
    //=============================================================================
    var pluginName    = 'Chronus';
    var metaTagPrefix = 'C_';

    var getParamString = function(paramNames) {
        var value = getParamOther(paramNames);
        return value === null ? '' : value;
    };

    var getParamNumber = function(paramNames, min, max) {
        var value = getParamOther(paramNames);
        if (arguments.length < 2) min = -Infinity;
        if (arguments.length < 3) max = Infinity;
        return (parseInt(value, 10) || 0).clamp(min, max);
    };

    var getParamOther = function(paramNames) {
        if (!Array.isArray(paramNames)) paramNames = [paramNames];
        for (var i = 0; i < paramNames.length; i++) {
            var name = PluginManager.parameters(pluginName)[paramNames[i]];
            if (name) return name;
        }
        return null;
    };

    var getParamBoolean = function(paramNames) {
        var value = (getParamOther(paramNames) || '').toUpperCase();
        return value === 'ON' || value === 'TRUE';
    };

    var isParamExist = function(paramNames) {
        return getParamOther(paramNames) !== null;
    };

    var getParamArrayString = function(paramNames) {
        var values = getParamString(paramNames).split(',');
        for (var i = 0; i < values.length; i++) values[i] = values[i].trim();
        return values;
    };

    var getParamArrayNumber = function(paramNames, min, max) {
        var values = getParamArrayString(paramNames);
        if (arguments.length < 2) min = -Infinity;
        if (arguments.length < 3) max = Infinity;
        for (var i = 0; i < values.length; i++) values[i] = (parseInt(values[i], 10) || 0).clamp(min, max);
        return values;
    };

    var getArgBoolean = function(arg) {
        return (arg || '').toUpperCase() === 'ON' || (arg || '').toUpperCase() === 'TRUE';
    };

    var getMetaValue = function(object, name) {
        var metaTagName = metaTagPrefix + (name ? name : '');
        return object.meta.hasOwnProperty(metaTagName) ? object.meta[metaTagName] : undefined;
    };

    var getMetaValues = function(object, names) {
        if (!Array.isArray(names)) return getMetaValue(object, names);
        for (var i = 0, n = names.length; i < n; i++) {
            var value = getMetaValue(object, names[i]);
            if (value !== undefined) return value;
        }
        return undefined;
    };

    var _DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents      = function(contents) {
        _DataManager_extractSaveContents.apply(this, arguments);
        $gameSystem.onLoad();
    };

    //=============================================================================
    // パラメータの取得と整形
    //=============================================================================
    var paramAutoAddInterval     = getParamNumber('自然時間加算間隔', 1) || 60;
    var paramCalendarFontSize    = getParamNumber('カレンダーフォントサイズ', 0);
    var paramCalendarOpacity     = getParamNumber('カレンダー不透明度', 0);
    var paramCalendarPadding     = getParamNumber('カレンダー余白', 8);
    var paramClockBaseFile       = getParamString('文字盤画像ファイル');
    var paramMinutesHandFile     = getParamString('長針画像ファイル');
    var paramHourHandFile        = getParamString('短針画像ファイル');
    var paramCalendarFrameHidden = getParamBoolean('カレンダー枠の非表示');
    var paramCalendarLineSpacing = getParamNumber('日時フォーマット行間', 0);
    var paramCalendarHidden      = getParamBoolean('カレンダーの非表示');

    const script = document.currentScript;
    PluginManagerEx.registerCommand(script, 'ADD_TIME', args => {
        $gameSystem.chronus().addTime(args.time);
    });

    PluginManagerEx.registerCommand(script, 'ADD_DAY', args => {
        $gameSystem.chronus().addDay(args.day);
    });

    PluginManagerEx.registerCommand(script, 'SET_TIME', args => {
        $gameSystem.chronus().setTime(args.hour, args.minute);
    });

    PluginManagerEx.registerCommand(script, 'SET_DAY', args => {
        $gameSystem.chronus().setDay(args.year, args.month, args.day);
    });

    PluginManagerEx.registerCommand(script, 'STOP', args => {
        $gameSystem.chronus().stop();
    });

    PluginManagerEx.registerCommand(script, 'START', args => {
        $gameSystem.chronus().start();
    });

    PluginManagerEx.registerCommand(script, 'SHOW', args => {
        $gameSystem.chronus().showCalendar();
    });

    PluginManagerEx.registerCommand(script, 'HIDE', args => {
        $gameSystem.chronus().hideCalendar();
    });

    PluginManagerEx.registerCommand(script, 'DISABLE_TINT', args => {
        $gameSystem.chronus().disableTint();
    });

    PluginManagerEx.registerCommand(script, 'ENABLE_TINT', args => {
        $gameSystem.chronus().enableTint();
    });

    PluginManagerEx.registerCommand(script, 'DISABLE_WEATHER', args => {
        $gameSystem.chronus().disableWeather();
    });

    PluginManagerEx.registerCommand(script, 'ENABLE_WEATHER', args => {
        $gameSystem.chronus().enableWeather();
    });

    PluginManagerEx.registerCommand(script, 'SET_SNOW_LAND', args => {
        $gameSystem.chronus().setSnowLand();
    });

    PluginManagerEx.registerCommand(script, 'RESET_SNOW_LAND', args => {
        $gameSystem.chronus().resetSnowLand();
    });

    PluginManagerEx.registerCommand(script, 'SET_SPEED', args => {
        $gameSystem.chronus().setTimeAutoAdd(args.speed);
    });

    PluginManagerEx.registerCommand(script, 'SHOW_CLOCK', args => {
        $gameSystem.chronus().showClock();
    });

    PluginManagerEx.registerCommand(script, 'HIDE_CLOCK', args => {
        $gameSystem.chronus().hideClock();
    });

    PluginManagerEx.registerCommand(script, 'SET_TIME_REAL', args => {
        $gameSystem.chronus().setTimeReal();
    });

    PluginManagerEx.registerCommand(script, 'SET_TIME_VIRTUAL', args => {
        $gameSystem.chronus().setTimeVirtual();
    });

    PluginManagerEx.registerCommand(script, 'SET_RAINY_PERCENT', args => {
        $gameSystem.chronus().setRainyPercent(args.percent);
    });

    PluginManagerEx.registerCommand(script, 'SET_SWITCH_TIMER', function(args) {
        this.setSwitchTimer(args);
    });

    PluginManagerEx.registerCommand(script, 'SET_SELF_SWITCH_TIMER', function(args) {
        this.setSwitchTimer(args);
    });

    PluginManagerEx.registerCommand(script, 'SET_SWITCH_ALARM', function(args) {
        this.setSwitchAlarm(args);
    });

    PluginManagerEx.registerCommand(script, 'SET_SELF_SWITCH_ALARM', function(args) {
        this.setSwitchAlarm(args);
    });

    PluginManagerEx.registerCommand(script, 'STOP_TIMER', args => {
        $gameSystem.chronus().stopTimer(args.name);
    });

    PluginManagerEx.registerCommand(script, 'START_TIMER', args => {
        $gameSystem.chronus().startTimer(args.name);
    });

    PluginManagerEx.registerCommand(script, 'CLEAR_TIMER', args => {
        $gameSystem.chronus().clearTimer(args.name);
    });

    PluginManagerEx.registerCommand(script, 'INIT_TOTAL_TIME', args => {
        $gameSystem.chronus().initTotalTime();
    });

    PluginManagerEx.registerCommand(script, 'SET_CLOCK_IMAGE', args => {
        if (args.baseFileName) {
            $gameSystem.chronus().setClockBaseFile(args.baseFileName);
        }
        if (args.hourFileName) {
            $gameSystem.chronus().setHourHandFile(args.hourFileName);
        }
        if (args.minuteFileName) {
            $gameSystem.chronus().setMinuteHandFile(args.minuteFileName);
        }
    });

    Game_Interpreter.prototype.setSwitchTimer = function(args) {
        var switchKey = this.getSwitchKey(args.switchId, args.selfSwitchId);
        $gameSystem.chronus().makeTimer(args.name || null, args.timeout, switchKey, args.loop);
    };

    Game_Interpreter.prototype.setSwitchAlarm = function(args) {
        var switchKey = this.getSwitchKey(args.switchId, args.selfSwitchId);
        $gameSystem.chronus().makeAlarm(args.name || null, this.createAlarmTime(args), switchKey, args.interval);
    };

    Game_Interpreter.prototype.createAlarmTime = function(args) {
        var chronus = $gameSystem.chronus();
        var year = args.year || chronus.getYear();
        var month = args.year || chronus.getMonth();
        var day = args.day || chronus.getDay();
        return args.minute + args.hour * 100 + day * 10000 + month * 1000000 * year + 100000000;
    };

    Game_Interpreter.prototype.getSwitchKey = function(switchId, selfSwitchId) {
        return selfSwitchId ? [$gameMap.mapId(), this.eventId(), selfSwitchId.toUpperCase()] : switchId;
    };

    var _Game_Interpreter_command236      = Game_Interpreter.prototype.command236;
    Game_Interpreter.prototype.command236 = function(params) {
        var result = _Game_Interpreter_command236.call(this);
        if (!$gameParty.inBattle()) {
            var chronus = $gameSystem.chronus();
            chronus.setWeatherType(Game_Chronus.weatherTypes.indexOf(params[0]));
            chronus.setWeatherPower(params[1]);
            chronus.refreshTint(true);
            chronus.forceSetBatWeatherLevel(params[0], params[1]);
        }
        return result;
    };

    var _Game_Interpreter_command282 = Game_Interpreter.prototype.command282;
    Game_Interpreter.prototype.command282 = function() {
        var result =  _Game_Interpreter_command282.apply(this, arguments);
        if (!$gameParty.inBattle()) {
            var chronus = $gameSystem.chronus();
            chronus.refreshTint(true);
            chronus.refreshWeather(true);
        }
        return result;
    };

    //=============================================================================
    // Game_System
    //  ゲーム内時間を扱うクラス「Game_Chronus」を追加定義します。
    //=============================================================================
    var _Game_System_initialize      = Game_System.prototype.initialize;
    Game_System.prototype.initialize = function() {
        _Game_System_initialize.call(this);
        this._chronus = new Game_Chronus();
    };

    Game_System.prototype.chronus = function() {
        return this._chronus;
    };

    Game_System.prototype.onBattleEnd = function() {
        this.chronus().onBattleEnd();
    };

    var _Game_System_onLoad      = Game_System.prototype.onLoad;
    Game_System.prototype.onLoad = function() {
        if (_Game_System_onLoad) _Game_System_onLoad.apply(this, arguments);
        if (!this.chronus()) this._chronus = new Game_Chronus();
        this._chronus.onLoad();
    };

    //=============================================================================
    // Game_Map
    //  マップ及びタイルセットから、色調変化無効フラグを取得します。
    //=============================================================================
    Game_Map.prototype.isDisableTint = function() {
        return !this.isChronicleMetaInfo(['Tint', '色調'], true);
    };

    Game_Map.prototype.isDisableWeather = function() {
        return !this.isChronicleMetaInfo(['Weather', '天候'], true);
    };

    Game_Map.prototype.isSnowLand = function() {
        return this.isChronicleMetaInfo(['Snow', '雪'], false);
    };

    Game_Map.prototype.isChronicleMetaInfo = function(tagNames, defaultValue) {
        if (DataManager.isBattleTest() || DataManager.isEventTest()) return false;
        var metaValue1 = getMetaValues($dataMap, tagNames);
        if (metaValue1 !== undefined) {
            return getArgBoolean(metaValue1);
        }
        var tileset = $gamePlayer.isTransferring() ? $dataTilesets[$dataMap.tilesetId] : this.tileset();
        var metaValue2 = getMetaValues(tileset, tagNames);
        if (metaValue2 !== undefined) {
            return getArgBoolean(metaValue2);
        }
        return defaultValue;
    };

    Game_Map.prototype.isTimeStopEventRunning = function() {
        if (this.isEventRunning()) {
            if (!this._isTimeStopEventRunning) this._isTimeStopEventRunning = this.getTimeStopEventRunning();
        } else {
            this._isTimeStopEventRunning = false;
        }
        return this._isTimeStopEventRunning;
    };

    Game_Map.prototype.getTimeStopEventRunning = function() {
        var event = this.event(this._interpreter.eventId());
        if (!event) return false;
        var stop = getMetaValues(event.event(), ['時間経過', 'NoStop']);
        if (stop) {
            return !getArgBoolean(stop);
        } else {
            return !getParamBoolean('イベント中時間経過');
        }
    };

    //=============================================================================
    // Game_Player
    //  場所移動時の時間経過を追加定義します。
    //=============================================================================
    var _Game_Player_performTransfer      = Game_Player.prototype.performTransfer;
    Game_Player.prototype.performTransfer = function() {
        var realTransfer = this._newMapId !== $gameMap.mapId() && $gameMap.mapId() > 0;
        $gameSystem.chronus().transfer(realTransfer);
        _Game_Player_performTransfer.call(this);
    };

    //=============================================================================
    // Scene_Map
    //  Game_Chronusの更新を追加定義します。
    //=============================================================================
    var _Scene_Map_onMapLoaded      = Scene_Map.prototype.onMapLoaded;
    Scene_Map.prototype.onMapLoaded = function() {
        $gameSystem.chronus().onMapLoaded();
        _Scene_Map_onMapLoaded.apply(this, arguments);
    };

    var _Scene_Map_updateMain      = Scene_Map.prototype.updateMain;
    Scene_Map.prototype.updateMain = function() {
        _Scene_Map_updateMain.apply(this, arguments);
        $gameSystem.chronus().update();
    };

    var _Scene_Map_createAllWindows      = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function() {
        _Scene_Map_createAllWindows.apply(this, arguments);
        this.createChronusWindow();
    };

    Scene_Map.prototype.createChronusWindow = function() {
        this._chronusWindow = new Window_Chronus();
        this.addWindow(this._chronusWindow);
    };

    //=============================================================================
    // BattleManager
    //  戦闘終了時のゲーム内時間経過処理を追加定義します。
    //=============================================================================
    var _BattleManager_endBattle = BattleManager.endBattle;
    BattleManager.endBattle      = function(result) {
        $gameSystem.onBattleEnd();
        _BattleManager_endBattle.call(this, result);
    };

    //=============================================================================
    // Window_Chronus
    //  ゲーム内時間情報を描画するウィンドウです。
    //=============================================================================
    Window_Chronus.prototype             = Object.create(Window_Base.prototype);
    Window_Chronus.prototype.constructor = Window_Chronus;

    var _Window_Chronus_initialize      = Window_Chronus.prototype.initialize;
    Window_Chronus.prototype.initialize = function() {
        _Window_Chronus_initialize.call(this, new Rectangle(0, 0, this.getDefaultWidth(), this.getDefaultHeight()));
        this.createContents();
        this.x = getParamNumber('カレンダー表示X座標');
        this.y = getParamNumber('カレンダー表示Y座標');
        if (paramCalendarFrameHidden) {
            this.opacity = 0;
        }
        this.refresh();
    };

    Window_Chronus.prototype.getDefaultWidth = function() {
        var bitmap      = new Bitmap();
        bitmap.fontSize = this.standardFontSize();
        var width1      = bitmap.measureTextWidth(this.getDateFormat(1));
        var width2      = bitmap.measureTextWidth(this.getDateFormat(2));
        return Math.max(width1, width2) + this.standardPadding() * 2;
    };

    Window_Chronus.prototype.getDefaultHeight = function() {
        return this.standardFontSize() * (this.getDateFormat(2) ? 2 : 1) + this.standardPadding() * 2 + paramCalendarLineSpacing;
    };

    Window_Chronus.prototype.standardPadding = function() {
        return paramCalendarPadding || $gameSystem.windowPadding();
    };

    Window_Chronus.prototype.standardBackOpacity = function() {
        return paramCalendarOpacity;
    };

    Window_Chronus.prototype.lineHeight = function() {
        return this.standardFontSize();
    };

    Window_Chronus.prototype.standardFontSize = function() {
        return paramCalendarFontSize || $gameSystem.mainFontSize();
    };

    var _Window_Chronus_resetFontSettings = Window_Chronus.prototype.resetFontSettings;
    Window_Chronus.prototype.resetFontSettings = function() {
        _Window_Chronus_resetFontSettings.apply(this, arguments);
        this.contents.fontSize = this.standardFontSize();
    };

    var _Window_Chronus_updatePadding = Window_Chronus.prototype.updatePadding;
    Window_Chronus.prototype.updatePadding = function() {
        _Window_Chronus_updatePadding.apply(this, arguments);
        this.padding = this.standardPadding();
    };

    Window_Chronus.prototype.refresh = function() {
        this.contents.clear();
        var width  = this.contents.width;
        var height = this.lineHeight();
        this.contents.drawText(this.getDateFormat(1), 0, 0, width, height, 'left');
        this.contents.drawText(this.getDateFormat(2), 0, height + paramCalendarLineSpacing, width, height, 'left');
        this.update();
    };

    Window_Chronus.prototype.update = function() {
        if (this.chronus().isShowingCalendar()) {
            this.show();
            if (this.chronus().isNeedRefresh()) this.refresh();
        } else {
            this.hide();
        }
    };

    Window_Chronus.prototype.chronus = function() {
        return $gameSystem.chronus();
    };

    Window_Chronus.prototype.getDateFormat = function(lineNumber) {
        return this.chronus().getDateFormat(lineNumber);
    };

    //=============================================================================
    // Sprite_Chronicle_Clock
    //  アナログ時計表示スプライトクラスです。
    //=============================================================================
    Sprite_Chronicle_Clock.prototype             = Object.create(Sprite.prototype);
    Sprite_Chronicle_Clock.prototype.constructor = Sprite_Chronicle_Clock;

    var _Sprite_Chronicle_Clock_initialize      = Sprite_Chronicle_Clock.prototype.initialize;
    Sprite_Chronicle_Clock.prototype.initialize = function() {
        _Sprite_Chronicle_Clock_initialize.apply(this, arguments);
        this.x        = getParamNumber('時計X座標');
        this.y        = getParamNumber('時計Y座標');
        this.anchor.x = 0.5;
        this.anchor.y = 0.5;
        this.bitmap   = ImageManager.loadPicture(this.chronus().getClockBaseFile());
        this.createHourHandSprite();
        this.createMinuteHandSprite();
    };

    Sprite_Chronicle_Clock.prototype.createHourHandSprite = function() {
        var handName        = this.chronus().getHourHandFile();
        var handSprite      = new Sprite();
        handSprite.anchor.x = 0.5;
        handSprite.anchor.y = 0.5;
        handSprite.bitmap   = handName ? ImageManager.loadPicture(handName) : ImageManager.loadEmptyBitmap();
        handSprite.visible  = !!handName;
        this.hourHandSprite = handSprite;
        this.addChild(this.hourHandSprite);
    };

    Sprite_Chronicle_Clock.prototype.createMinuteHandSprite = function() {
        var handName          = this.chronus().getMinuteHandFile();
        var handSprite        = new Sprite();
        handSprite.anchor.x   = 0.5;
        handSprite.anchor.y   = 0.5;
        handSprite.bitmap     = handName ? ImageManager.loadPicture(handName) : ImageManager.loadEmptyBitmap();
        handSprite.visible    = !!handName;
        this.minuteHandSprite = handSprite;
        this.addChild(this.minuteHandSprite);
    };

    Sprite_Chronicle_Clock.prototype.update = function() {
        this.visible = this.chronus().isShowingClock();
        if (this.visible) {
            this.updateHourHand();
            this.updateMinuteHand();
        }
    };

    Sprite_Chronicle_Clock.prototype.updateHourHand = function() {
        if (!this.hourHandSprite.visible) return;
        this.hourHandSprite.rotation = this.chronus().getRotationHourHand();
    };

    Sprite_Chronicle_Clock.prototype.updateMinuteHand = function() {
        if (!this.minuteHandSprite.visible) return;
        this.minuteHandSprite.rotation = this.chronus().getRotationMinuteHand();
    };

    Sprite_Chronicle_Clock.prototype.chronus = function() {
        return $gameSystem.chronus();
    };

    //=============================================================================
    // Spriteset_Map
    //  アナログ時計の画像を追加定義します。
    //=============================================================================
    var _Spriteset_Base_createUpperLayer      = Spriteset_Base.prototype.createUpperLayer;
    Spriteset_Base.prototype.createUpperLayer = function() {
        _Spriteset_Base_createUpperLayer.apply(this, arguments);
        if (this instanceof Spriteset_Map) this.createClockSprite();
    };

    Spriteset_Map.prototype.createClockSprite = function() {
        if (isParamExist('文字盤画像ファイル')) {
            this._clockSprite = new Sprite_Chronicle_Clock();
            this.addChild(this._clockSprite);
        }
    };

    //=============================================================================
    // Game_Chronus
    //  時の流れを扱うクラスです。このクラスはGame_Systemクラスで生成されます。
    //  セーブデータの保存対象のためグローバル領域に定義します。
    //=============================================================================
    Game_Chronus.weatherTypes         = ['none', 'rain', 'storm', 'snow'];
    Game_Chronus.prototype.initialize = function() {
        this._stop            = false;        // 停止フラグ（全ての加算に対して有効。ただし手動による加算は例外）
        this._disableTint     = false;        // 色調変更禁止フラグ
        this._calendarVisible = !paramCalendarHidden; // カレンダー表示フラグ
        this._disableWeather  = false;        // 天候制御禁止フラグ
        this._weatherType     = 0;            // 天候タイプ(0:なし 1:雨 2:嵐 :3雪)
        this._weatherPower    = 0;            // 天候の強さ
        this._weatherSnowLand = false;        // 降雪地帯フラグ
        this._clockVisible    = true;         // アナログ時計表示フラグ
        this._realTime        = false;        // 実時間フラグ
        this._badWeaterLevel  = 0;            // 悪天候の度合い
        this._frameCount      = 0;
        this._demandRefresh   = false;
        this._prevHour        = -1;
        this._nowDate         = null;
        this._clearTone       = false;
        this._timeAutoAdd     = getParamNumber('自然時間加算', 0, 99);
        this._timeTransferAdd = getParamNumber('場所移動時間加算', 0);
        this._timeBattleAdd   = getParamNumber('戦闘時間加算(固定)', 0);
        this._timeTurnAdd     = getParamNumber('戦闘時間加算(ターン)', 0);
        this._weekNames       = getParamArrayString('曜日配列');
        this._monthNames      = getParamArrayString('月名配列');
        this._daysOfMonth     = getParamArrayNumber('月ごとの日数配列');
        this._clockBaseFile   = null;
        this._minuteHandFile  = null;
        this._hourHandFile    = null;
        this._timeMeter       = 0;
        this._dayMeter        = 0;
        this._initDate        = Date.now();
        this.initTotalTime();
        this.onLoad();
    };

    Game_Chronus.prototype.initTotalTime = function() {
        this._criterionTime = this._timeMeter;
        this._criterionDay  = this._dayMeter;
        this._initDate      = Date.now();
    };

    Game_Chronus.prototype.onLoad = function() {
        this._nowDate = new Date();
        if (!this._frameCount) this._frameCount = 0;
        if (!this._timers) this._timers = [];
        if (!this._namedTimers) this._namedTimers = {};
    };

    Game_Chronus.prototype.onMapLoaded = function() {
        this.updateWeatherType();
        this.updateWeatherPower();
        this.refreshWeather(true);
    };

    Game_Chronus.prototype.update = function() {
        this.updateTimer();
        this.updateEffect();
        if (this.isTimeStop()) return;
        this._frameCount++;
        if (this._frameCount >= paramAutoAddInterval) {
            if (this.isRealTime()) {
                this.updateRealTime();
            }
            this.addTime();
        }
    };

    Game_Chronus.prototype.updateRealTime = function() {
        this._nowDate.setTime(Date.now());
    };

    Game_Chronus.prototype.updateTimer = function() {
        for (var timerName in this._namedTimers) {
            if (this._namedTimers.hasOwnProperty(timerName)) {
                var valid = this._namedTimers[timerName].update();
                if (!valid) this.clearTimer(timerName);
            }
        }
        this._timers = this._timers.filter(function(timer) {
            return timer.update();
        });
    };

    Game_Chronus.prototype.isRealTime = function() {
        return this._realTime;
    };

    Game_Chronus.prototype.isTimeStop = function() {
        return this.isStop() || $gameMap.isTimeStopEventRunning();
    };

    Game_Chronus.prototype.updateEffect = function() {
        var hour = this.getHour();
        if (this._prevHour !== hour) {
            this.updateWeather();
            this.refreshTint(false);
            this._prevHour = this.getHour();
        }
    };

    Game_Chronus.prototype.refreshTint = function(swift) {
        if (this.isEnableTint()) {
            this.setTint(this.getTimeZone(), swift);
            this._clearTone = false;
        } else if (!this._clearTone) {
            $gameScreen.clearTone();
            this._clearTone = true;
        }
    };

    Game_Chronus.prototype.setTint = function(timeId, swift) {
        var tone = [0, 0, 0, 0];
        settings.timeTone.forEach(function(toneInfo) {
            if (toneInfo.timeId === timeId) {
                tone = toneInfo.value.clone();
                if (tone.length < 4) throw new Error('色調の値が不正です。:' + tone);
            }
        }.bind(this));
        if (this.getWeatherTypeId() !== 0) {
            tone[0] = tone[0] > 0 ? tone[0] / 7 : tone[0] - 14;
            tone[1] = tone[1] > 0 ? tone[1] / 7 : tone[1] - 14;
            tone[2] = tone[2] > 0 ? tone[2] / 7 : tone[1] - 14;
            tone[3] = tone[3] === 0 ? 68 : tone[3] + 14;
        }
        $gameScreen.startTint(tone, swift ? 0 : this.getEffectDuration());
    };

    Game_Chronus.prototype.setWeatherType = function(value) {
        this._weatherType = value.clamp(0, Game_Chronus.weatherTypes.length - 1);
    };

    Game_Chronus.prototype.setWeatherPower = function(value) {
        this._weatherPower = value.clamp(0, 10);
    };

    Game_Chronus.prototype.setTimeAutoAdd = function(value) {
        this._timeAutoAdd = value.clamp(0, 99);
    };

    Game_Chronus.prototype.updateWeather = function() {
        if (!this._disableWeather) {
            this.updateBatWeatherLevel();
        } else {
            this._weatherType  = 0;
            this._weatherPower = 0;
        }
        this.refreshWeather(false);
    };

    Game_Chronus.prototype.updateBatWeatherLevel = function() {
        var frequency = this.getChangeWeatherFrequency();
        var max       = this.getBadWeatherLevelMax();
        var newLevel  = (this._badWeaterLevel || 0).clamp(frequency, max - frequency);
        if (Math.randomInt(10) <= 1) frequency *= 5;
        this._badWeaterLevel = (newLevel + (Math.randomInt(frequency * 2) - frequency)).clamp(0, max);
        this.updateWeatherType();
        this.updateWeatherPower();
    };

    Game_Chronus.prototype.forceSetBatWeatherLevel = function(type, power) {
        var newLevel = 0;
        switch (type) {
            case Game_Chronus.weatherTypes[1]:
                newLevel = this.getBadWeatherLevelRainy() + power;
                break;
            case Game_Chronus.weatherTypes[2]:
                newLevel = this.getBadWeatherLevelHeavyRainy() + power;
                break;
            case Game_Chronus.weatherTypes[3]:
                newLevel = this.getBadWeatherLevelRainy() + power * 2;
                break;
        }
        this._badWeaterLevel = newLevel;
    };

    Game_Chronus.prototype.updateWeatherType = function() {
        var type        = 0;
        var border      = this.getBadWeatherLevelRainy();
        var heavyBorder = this.getBadWeatherLevelHeavyRainy();
        if (this._badWeaterLevel >= border) {
            type = (this.isSnowLand() ? 3 : this._badWeaterLevel >= heavyBorder ? 2 : 1);
        }
        this.setWeatherType(type);
    };

    Game_Chronus.prototype.updateWeatherPower = function() {
        var power  = 0;
        var border = this.getBadWeatherLevelRainy();
        if (this._badWeaterLevel >= border) {
            power = Math.floor((this._badWeaterLevel - border) / 2);
        }
        this.setWeatherPower(power);
    };

    Game_Chronus.prototype.getBadWeatherLevelMax = function() {
        return this._badWeaterLevelMax || 40;
    };

    Game_Chronus.prototype.getBadWeatherLevelRainy = function() {
        return this.getBadWeatherLevelMax() - 20;
    };

    Game_Chronus.prototype.getBadWeatherLevelHeavyRainy = function() {
        return this.getBadWeatherLevelMax() - 10;
    };

    Game_Chronus.prototype.getChangeWeatherFrequency = function() {
        return 4;
    };

    Game_Chronus.prototype.refreshWeather = function(swift) {
        if (this.isEnableWeather()) {
            this.setScreenWeather(swift);
        } else {
            $gameScreen.changeWeather(0, 0, 0);
        }
    };

    Game_Chronus.prototype.setScreenWeather = function(swift) {
        $gameScreen.changeWeather(this.getWeatherType(), this._weatherPower, swift ? 0 : this.getEffectDuration());
    };

    Game_Chronus.prototype.getEffectDuration = function() {
        if (this.isRealTime()) {
            return 600;
        }
        return this._timeAutoAdd === 0 ? 1 : Math.floor(60 * 5 / (this.getRealAddSpeed() / 10));
    };

    Game_Chronus.prototype.getRealAddSpeed = function() {
        return this._timeAutoAdd * 60 / paramAutoAddInterval;
    };

    Game_Chronus.prototype.disableTint = function() {
        this._disableTint = true;
        this.refreshTint(true);
    };

    Game_Chronus.prototype.enableTint = function() {
        this._disableTint = false;
        this.refreshTint(true);
    };

    Game_Chronus.prototype.isEnableTint = function() {
        return !this._disableTint && !$gameMap.isDisableTint();
    };

    Game_Chronus.prototype.disableWeather = function() {
        this._disableWeather = true;
        this.refreshWeather(true);
    };

    Game_Chronus.prototype.enableWeather = function() {
        this._disableWeather = false;
        this.refreshWeather(true);
    };

    Game_Chronus.prototype.isEnableWeather = function() {
        return !this._disableWeather && !$gameMap.isDisableWeather();
    };

    Game_Chronus.prototype.setSnowLand = function() {
        this._weatherSnowLand = true;
        this.updateWeatherType();
        this.refreshWeather(true);
    };

    Game_Chronus.prototype.resetSnowLand = function() {
        this._weatherSnowLand = false;
        this.updateWeatherType();
        this.refreshWeather(true);
    };

    Game_Chronus.prototype.setRainyPercent = function(value) {
        this._badWeaterLevelMax = (value > 0 ? 2000 / value : Infinity);
        this.updateWeather();
    };

    Game_Chronus.prototype.setTimeReal = function() {
        this._realTime = true;
        this.updateRealTime();
        this.setGameVariable();
    };

    Game_Chronus.prototype.setTimeVirtual = function() {
        this._realTime = false;
        this.setGameVariable();
    };

    Game_Chronus.prototype.onBattleEnd = function() {
        if (this.isStop()) return;
        this.addTime(this._timeBattleAdd + this._timeTurnAdd * $gameTroop.turnCount());
    };

    Game_Chronus.prototype.transfer = function(realTransfer) {
        if (this.isStop()) return;
        if (realTransfer) {
            this.addTime(this._timeTransferAdd);
        }
        this.demandRefresh(true);
    };

    Game_Chronus.prototype.stop = function() {
        this._stop = true;
    };

    Game_Chronus.prototype.start = function() {
        this._stop = false;
    };

    Game_Chronus.prototype.isStop = function() {
        return this._stop;
    };

    Game_Chronus.prototype.showCalendar = function() {
        this._calendarVisible = true;
    };

    Game_Chronus.prototype.hideCalendar = function() {
        this._calendarVisible = false;
    };

    Game_Chronus.prototype.isShowingCalendar = function() {
        return this._calendarVisible;
    };

    Game_Chronus.prototype.isSnowLand = function() {
        return this._weatherSnowLand || $gameMap.isSnowLand();
    };

    Game_Chronus.prototype.showClock = function() {
        this._clockVisible = true;
    };

    Game_Chronus.prototype.hideClock = function() {
        this._clockVisible = false;
    };

    Game_Chronus.prototype.isShowingClock = function() {
        return this._clockVisible;
    };

    Game_Chronus.prototype.addTime = function(value) {
        if (arguments.length === 0) value = this._timeAutoAdd;
        this._timeMeter += value;
        while (this._timeMeter >= 60 * 24) {
            this.addDay();
            this._timeMeter -= 60 * 24;
        }
        this.demandRefresh(false);
    };

    Game_Chronus.prototype.setTime = function(hour, minute) {
        var time = hour * 60 + minute;
        if (this._timeMeter >= time) this.addDay();
        this._timeMeter = time;
        this.demandRefresh(true);
    };

    Game_Chronus.prototype.addDay = function(value) {
        if (arguments.length === 0) value = 1;
        this._dayMeter += value;
        this.demandRefresh(false);
    };

    Game_Chronus.prototype.setDay = function(year, month, day) {
        this._dayMeter = this.calcNewDay(year, month, day);
        this.demandRefresh(true);
    };

    Game_Chronus.prototype.calcNewDay = function(year, month, day) {
        var newDay = (year - 1) * this.getDaysOfYear();
        for (var i = 1; i < month; i++) {
            newDay += this.getDaysOfMonth(i);
        }
        newDay += day - 1;
        return newDay;
    };

    Game_Chronus.prototype.demandRefresh = function(effectRefreshFlg) {
        this._demandRefresh = true;
        this._frameCount    = 0;
        this.setGameVariable();
        if (effectRefreshFlg) {
            this.refreshTint(true);
            this.updateWeather();
        }
    };

    Game_Chronus.prototype.isNeedRefresh = function() {
        var needRefresh     = this._demandRefresh;
        this._demandRefresh = false;
        return needRefresh;
    };

    Game_Chronus.prototype.getDaysOfWeek = function() {
        return this._weekNames.length;
    };

    Game_Chronus.prototype.getDaysOfMonth = function(month) {
        return this._daysOfMonth[month - 1];
    };

    Game_Chronus.prototype.getDaysOfYear = function() {
        var result = 0;
        this._daysOfMonth.forEach(function(days) {
            result += days;
        });
        return result;
    };

    Game_Chronus.prototype.setGameVariable = function() {
        this.setGameVariableSub('年のゲーム変数', this.getYear.bind(this));
        this.setGameVariableSub('月のゲーム変数', this.getMonth.bind(this));
        this.setGameVariableSub('日のゲーム変数', this.getDay.bind(this));
        this.setGameVariableSub('曜日IDのゲーム変数', this.getWeekIndex.bind(this));
        this.setGameVariableSub('曜日名のゲーム変数', this.getWeekName.bind(this));
        this.setGameVariableSub('時のゲーム変数', this.getHour.bind(this));
        this.setGameVariableSub('分のゲーム変数', this.getMinute.bind(this));
        this.setGameVariableSub('時間帯IDのゲーム変数', this.getTimeZone.bind(this));
        this.setGameVariableSub('天候IDのゲーム変数', this.getWeatherTypeId.bind(this));
        this.setGameVariableSub('累計時間のゲーム変数', this.getTotalTime.bind(this));
        this.setGameVariableSub('累計日数のゲーム変数', this.getTotalDay.bind(this));
        this.setGameVariableSub('フォーマット時間の変数', this.getFormatTimeFormula.bind(this));
    };

    Game_Chronus.prototype.setGameVariableSub = function(paramName, callBack) {
        var index = getParamNumber(paramName, 0);
        if (index !== 0) {
            $gameVariables.setValue(index, callBack());
        }
    };

    Game_Chronus.prototype.getMonthOfYear = function() {
        return this._daysOfMonth.length;
    };

    Game_Chronus.prototype.getWeekName = function() {
        return this._weekNames[this.getWeekIndex()];
    };

    Game_Chronus.prototype.getWeekIndex = function() {
        return this.isRealTime() ? this._nowDate.getDay() : this._dayMeter % this.getDaysOfWeek();
    };

    Game_Chronus.prototype.getYear = function() {
        return this.isRealTime() ? this._nowDate.getFullYear() : Math.floor(this._dayMeter / this.getDaysOfYear()) + 1;
    };

    Game_Chronus.prototype.getMonth = function() {
        if (this.isRealTime()) return this._nowDate.getMonth() + 1;
        var days = this._dayMeter % this.getDaysOfYear();
        for (var i = 0; i < this._daysOfMonth.length; i++) {
            days -= this._daysOfMonth[i];
            if (days < 0) return i + 1;
        }
        return null;
    };

    Game_Chronus.prototype.getDay = function() {
        if (this.isRealTime()) return this._nowDate.getDate();
        var days = this._dayMeter % this.getDaysOfYear();
        for (var i = 0; i < this._daysOfMonth.length; i++) {
            if (days < this._daysOfMonth[i]) return days + 1;
            days -= this._daysOfMonth[i];
        }
        return null;
    };

    Game_Chronus.prototype.getHour = function() {
        return this.isRealTime() ? this._nowDate.getHours() : Math.floor(this._timeMeter / 60);
    };

    Game_Chronus.prototype.getMinute = function() {
        return this.isRealTime() ? this._nowDate.getMinutes() : this._timeMeter % 60;
    };

    Game_Chronus.prototype.getFormatTimeFormula = function() {
        this._disablePadding = true;
        var formula          = this.convertDateFormatText(getParamString('フォーマット時間の計算式'));
        this._disablePadding = false;
        return eval(formula);
    };

    Game_Chronus.prototype.getDateFormat = function(index) {
        return this.convertDateFormatText(getParamString('日時フォーマット' + String(index)));
    };

    Game_Chronus.prototype.convertDateFormatText = function(format) {
        format = format.replace(/(YYYY)/gi, function() {
            return this.getValuePadding(this.getYear(), arguments[1].length);
        }.bind(this));
        format = format.replace(/MON/gi, function() {
            return this._monthNames[this.getMonth() - 1];
        }.bind(this));
        format = format.replace(/MM/gi, function() {
            return this.getValuePadding(this.getMonth(), String(this.getMonthOfYear()).length);
        }.bind(this));
        format = format.replace(/DDALL/gi, function() {
            return this.getValuePadding(this.getTotalDay());
        }.bind(this));
        format = format.replace(/DD/gi, function() {
            return this.getValuePadding(this.getDay(),
                String(this.getDaysOfMonth(this.getMonth())).length);
        }.bind(this));
        format = format.replace(/HH24/gi, function() {
            return this.getValuePadding(this.getHour(), 2);
        }.bind(this));
        format = format.replace(/HH/gi, function() {
            return this.getValuePadding(this.getHour() % 12, 2);
        }.bind(this));
        format = format.replace(/AM/gi, function() {
            return Math.floor(this.getHour() / 12) === 0 ?
                $gameSystem.isJapanese() ? '午前' : 'Morning  ' :
                $gameSystem.isJapanese() ? '午後' : 'Afternoon';
        }.bind(this));
        format = format.replace(/MI/gi, function() {
            return this.getValuePadding(this.getMinute(), 2);
        }.bind(this));
        format = format.replace(/DY/gi, function() {
            return this.getWeekName();
        }.bind(this));
        format = format.replace(/TZ/gi, function() {
            return this.getTimeZoneName();
        }.bind(this));
        return format;
    };

    Game_Chronus.prototype.getTimeZone = function() {
        var timeId = 0;
        settings.timeZone.forEach(function(zoneInfo) {
            if (this.isHourInRange(zoneInfo.start, zoneInfo.end)) timeId = zoneInfo.timeId;
        }.bind(this));
        return timeId;
    };

    Game_Chronus.prototype.getTimeZoneName = function() {
        var timeId = this.getTimeZone();
        return settings.timeZone.filter(function(zoneInfo) {
            return zoneInfo.timeId === timeId;
        })[0].name;
    };

    Game_Chronus.prototype.getWeatherTypeId = function() {
        return this._weatherType;
    };

    Game_Chronus.prototype.getWeatherType = function() {
        return Game_Chronus.weatherTypes[this.getWeatherTypeId()];
    };

    Game_Chronus.prototype.getValuePadding = function(value, digit, padChar) {
        if (this._disablePadding) {
            return value;
        }
        if (arguments.length === 2) padChar = '0';
        var result = '';
        for (var i = 0; i < digit; i++) result += padChar;
        result += value;
        return result.substr(-digit);
    };

    Game_Chronus.prototype.isHourInRange = function(min, max) {
        var hour = this.getHour();
        return hour >= min && hour <= max;
    };

    Game_Chronus.prototype.getAnalogueHour = function() {
        return this.getHour() + (this.getAnalogueMinute() / 60);
    };

    Game_Chronus.prototype.getAnalogueMinute = function() {
        return this.getMinute() + (this.isRealTime() ? 0 : this._frameCount / paramAutoAddInterval * this._timeAutoAdd);
    };

    Game_Chronus.prototype.getRotationHourHand = function() {
        return (this.getAnalogueHour() % 12) * (360 / 12) * Math.PI / 180;
    };

    Game_Chronus.prototype.getRotationMinuteHand = function() {
        return this.getAnalogueMinute() * (360 / 60) * Math.PI / 180;
    };

    Game_Chronus.prototype.getTotalTime = function() {
        if (this.isRealTime()) {
            return (this._nowDate - this._initDate) / (1000 * 60);
        } else {
            var dayMeter  = this._dayMeter - (this._criterionDay || 0);
            var timeMeter = this._timeMeter - (this._criterionTime || 0);
            return dayMeter * 24 * 60 + timeMeter;
        }
    };

    Game_Chronus.prototype.getTotalDay = function() {
        return Math.floor(this.getTotalTime() / (24 * 60)) + 1;
    };

    Game_Chronus.prototype.makeAlarm = function(timerName, timeNumber, switchKey, interval) {
        var baseTime   = this.getTotalTime();
        var min        = timeNumber % 100;
        var hour       = Math.floor(timeNumber / 100) % 100;
        var timeMeter  = hour * 60 + min - (this._criterionTime || 0);
        var day        = Math.floor(timeNumber / 10000) % 100;
        var month      = Math.floor(timeNumber / 1000000) % 100;
        var year       = Math.floor(timeNumber / 100000000);
        var dayMeter   = this.calcNewDay(year, month, day) - (this._criterionDay || 0);
        var targetTime = dayMeter * 24 * 60 + timeMeter;
        this.makeTimer(timerName, (targetTime - baseTime) || 0, switchKey, true, interval);
    };

    Game_Chronus.prototype.makeTimer = function(timerName, timeout, switchKey, loop, interval) {
        var timer = new Game_ChronusTimer(timeout, switchKey, loop, interval);
        if (timerName) {
            this._namedTimers[timerName] = timer;
        } else {
            this._timers.push(timer);
        }
    };

    Game_Chronus.prototype.clearTimer = function(timerName) {
        delete this._namedTimers[timerName];
    };

    Game_Chronus.prototype.stopTimer = function(timerName) {
        var timer = this._namedTimers[timerName];
        if (timer) {
            timer.stop();
        }
    };

    Game_Chronus.prototype.startTimer = function(timerName) {
        var timer = this._namedTimers[timerName];
        if (timer) {
            timer.start();
        }
    };

    Game_Chronus.prototype.getClockBaseFile = function() {
        return this._clockBaseFile || paramClockBaseFile;
    };

    Game_Chronus.prototype.getMinuteHandFile = function() {
        return this._minuteHandFile || paramMinutesHandFile;
    };

    Game_Chronus.prototype.getHourHandFile = function() {
        return this._hourHandFile || paramHourHandFile;
    };

    Game_Chronus.prototype.setClockBaseFile = function(name) {
        this._clockBaseFile = name;
    };

    Game_Chronus.prototype.setMinuteHandFile = function(name) {
        this._minuteHandFile = name;
    };

    Game_Chronus.prototype.setHourHandFile = function(name) {
        this._hourHandFile = name;
    };

    //=============================================================================
    // Game_ChronusTimer
    //  ゲーム内時間のタイマーを扱うクラスです。このクラスはGame_Chronusクラスで生成されます。
    //  セーブデータの保存対象のためグローバル領域に定義します。
    //=============================================================================
    Game_ChronusTimer.prototype             = Object.create(Game_ChronusTimer.prototype);
    Game_ChronusTimer.prototype.constructor = Game_ChronusTimer;

    Game_ChronusTimer.prototype.initialize = function(timeout, switchKey, loop, interval) {
        this._timeout = timeout;
        this._interval = interval || timeout;
        this._loop    = loop;
        this._baseTime = this.getTotalTime();
        if (Array.isArray(switchKey)) {
            this.setCallBackSelfSwitch(switchKey);
        } else {
            this.setCallBackSwitch(switchKey);
        }
        this.start();
    };

    Game_ChronusTimer.prototype.start = function() {
        this._start = true;
    };

    Game_ChronusTimer.prototype.stop = function() {
        this._start = false;
    };

    Game_ChronusTimer.prototype.getTotalTime = function() {
        return $gameSystem.chronus().getTotalTime();
    };

    Game_ChronusTimer.prototype.setCallBackSwitch = function(switchId) {
        this._callBackSwitchId = switchId;
    };

    Game_ChronusTimer.prototype.setCallBackSelfSwitch = function(selfSwitchKey) {
        this._callBackSelfSwitchKey = selfSwitchKey;
    };

    Game_ChronusTimer.prototype.update = function() {
        if (!this._start || !this.isTimeout()) {
            return true;
        }
        this.onTimeout();
        if (this._loop) {
            this.resetBaseTime();
            return true;
        } else {
            return false;
        }
    };

    Game_ChronusTimer.prototype.resetBaseTime = function() {
        while(this.isTimeout()) {
            this._baseTime += this._timeout;
            this._timeout = this._interval;
        }
    };

    Game_ChronusTimer.prototype.isTimeout = function() {
        return this._baseTime + this._timeout <= this.getTotalTime();
    };

    Game_ChronusTimer.prototype.onTimeout = function() {
        if (this._callBackSwitchId) {
            $gameSwitches.setValue(this._callBackSwitchId, true);
        }
        if (this._callBackSelfSwitchKey) {
            $gameSelfSwitches.setValue(this._callBackSelfSwitchKey, true);
        }
    };
})();
