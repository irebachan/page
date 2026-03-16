import argparse
import json
import shutil
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional


# ===== 設定値（デフォルトのウィンドウ位置・背景・顔グラ） =====

# RMMZ のメッセージウィンドウ位置: 0=上,1=中,2=下
DEFAULT_POSITION = 2

# RMMZ のメッセージ背景: 0=ウィンドウ,1=暗くする,2=透明
DEFAULT_BACKGROUND = 0


# 名前 → 表情ラベル → (faceName, faceIndex) のマップ
# 例: NAME_FACE_CONFIG = {
#   "ミヤケ": {
#       "default": ("Male4_Face-Set", 0),
#       "smile": ("Male4_Face-Set", 1),
#   }
# }
NAME_FACE_CONFIG: dict[str, dict[str, tuple[str, int]]] = {}

# ===== 中間表現 (IR) クラス =====


@dataclass
class Line:
    name: str
    text: str
    expression: Optional[str] = None
    position: Optional[int] = None
    background: Optional[int] = None


@dataclass
class Blank:
    """空行。ブロック単位の区切りとして使う（イベントコマンド自体は出さない）。"""


@dataclass
class Comment:
    text: str


@dataclass
class Label:
    name: str


@dataclass
class Goto:
    target: str


@dataclass
class Choice:
    text: str
    target: str


@dataclass
class ChoiceBlock:
    description: str
    choices: List[Choice]


@dataclass
class Bgm:
    name: str
    volume: Optional[int] = None


@dataclass
class Se:
    name: str
    volume: Optional[int] = None


@dataclass
class WindowOneShot:
    position: Optional[int] = None
    background: Optional[int] = None


IRNode = Line | Blank | Comment | Label | Goto | ChoiceBlock | Bgm | Se | WindowOneShot

# メッセージ単位: "line" or "block"
MESSAGE_UNIT: str = "line"


# ===== ノベル風テキスト → IR パーサ =====


def parse_novel_script(text: str) -> List[IRNode]:
    """ノベルプレーヤー風の記法から IR を構築する."""
    lines = text.splitlines()
    nodes: List[IRNode] = []
    current_name: str = ""
    current_expr: Optional[str] = None
    current_position: int = DEFAULT_POSITION
    current_background: int = DEFAULT_BACKGROUND
    i = 0

    def is_control_prefix(s: str) -> bool:
        return s.startswith("@") or s.startswith("#") or s.startswith("-") or s.startswith("//")

    while i < len(lines):
        raw = lines[i]
        stripped = raw.strip()

        # 空行: ブロック区切りとして保持（連続空行は1つにまとめる）
        if stripped == "":
            if not nodes or not isinstance(nodes[-1], Blank):
                nodes.append(Blank())
            i += 1
            continue

        # コメント行（//）→ 注釈 IR として保持
        if stripped.startswith("//"):
            comment_text = stripped[2:].lstrip()
            nodes.append(Comment(text=comment_text))
            i += 1
            continue

        # ラベル / goto / bgm / se / window
        if stripped.startswith("@"):
            parts = stripped.split(maxsplit=1)
            cmd = parts[0][1:]
            rest = parts[1].strip() if len(parts) > 1 else ""

            if cmd == "goto" and rest:
                target = rest.split()[0]
                nodes.append(Goto(target=target))
            elif cmd == "bgm" and rest:
                # @bgm name[, volume]
                name_part, *vol_part = rest.split(",")
                bgm_name = name_part.strip()
                volume: Optional[int] = None
                if vol_part:
                    try:
                        volume = int(vol_part[0].strip())
                    except ValueError:
                        volume = None
                nodes.append(Bgm(name=bgm_name, volume=volume))
            elif cmd == "se" and rest:
                # @se name[, volume]
                name_part, *vol_part = rest.split(",")
                se_name = name_part.strip()
                volume2: Optional[int] = None
                if vol_part:
                    try:
                        volume2 = int(vol_part[0].strip())
                    except ValueError:
                        volume2 = None
                nodes.append(Se(name=se_name, volume=volume2))
            elif cmd in ("window", "w1"):
                # ウィンドウ設定
                # @window pos[, bg]  : 以降ずっと
                # @window reset      : デフォルトへ
                # @w1 pos[, bg]      : 次の1メッセージだけ（WindowOneShot ノードとして扱う）
                token = rest.lower()
                is_one_shot = cmd == "w1"

                if token == "reset" and not is_one_shot:
                    current_position = DEFAULT_POSITION
                    current_background = DEFAULT_BACKGROUND
                else:
                    pos_str = None
                    bg_str = None
                    if "," in token:
                        first, second = token.split(",", 1)
                        pos_str = first.strip() or None
                        bg_str = second.strip() or None
                    else:
                        pos_str = token or None

                    def to_pos(s: str) -> Optional[int]:
                        if s in ("top", "up", "upper"):
                            return 0
                        if s in ("middle", "center", "centre"):
                            return 1
                        if s in ("bottom", "down", "lower"):
                            return 2
                        return None

                    def to_bg(s: str) -> Optional[int]:
                        if s in ("normal", "window"):
                            return 0
                        if s in ("dark", "dim"):
                            return 1
                        if s in ("transparent", "none"):
                            return 2
                        return None

                    if pos_str:
                        p = to_pos(pos_str)
                        if p is not None:
                            if is_one_shot:
                                # 次のメッセージにだけ適用する指示を IR として追加
                                nodes.append(WindowOneShot(position=p, background=None))
                            else:
                                current_position = p
                    if bg_str:
                        b = to_bg(bg_str)
                        if b is not None:
                            if is_one_shot:
                                nodes.append(WindowOneShot(position=None, background=b))
                            else:
                                current_background = b
            else:
                # それ以外はラベル名として扱う (@start など)
                nodes.append(Label(name=cmd))
            i += 1
            continue

        # 名前指定 (#名前 または #名前@表情)
        if stripped.startswith("#"):
            content = stripped[1:].strip()
            if "@" in content:
                name_part, expr = content.split("@", 1)
                current_name = name_part.strip()
                current_expr = expr.strip() or None
            else:
                current_name = content
                current_expr = None
            i += 1
            continue

        # 選択肢ブロック
        if stripped.startswith("-"):
            # 前行がコントロール系でなければ説明文として扱う
            description = ""
            if i > 0:
                prev = lines[i - 1].rstrip("\n")
                prev_stripped = prev.strip()
                if prev_stripped and not is_control_prefix(prev_stripped):
                    description = prev_stripped

            choices: List[Choice] = []
            while i < len(lines):
                s = lines[i].strip()
                if not s.startswith("-"):
                    break
                body = s[1:].strip()
                if "=>" in body:
                    left, right = body.split("=>", 1)
                    choice_text = left.strip()
                    target = right.strip()
                else:
                    choice_text = body
                    target = ""
                choices.append(Choice(text=choice_text, target=target))
                i += 1

            if choices:
                nodes.append(ChoiceBlock(description=description, choices=choices))
            continue

        # 通常行（セリフ・地の文）
        nodes.append(
            Line(
                name=current_name,
                text=stripped,
                expression=current_expr,
                position=current_position,
                background=current_background,
            )
        )
        i += 1

    return nodes


# ===== IR → RMMZ イベントコマンド list 変換 =====


def append_message(commands: List[dict], line: Line) -> None:
    """メッセージ 1 本を code 101 + 401 群として追加する."""
    name = line.name
    expr = line.expression or "default"

    # 名前＋表情ラベルに応じて顔グラを決定（未設定なら空）
    face_name = ""
    face_index = 0
    if name and name in NAME_FACE_CONFIG:
        face_map = NAME_FACE_CONFIG.get(name, {})
        if expr in face_map:
            face_name, face_index = face_map[expr]
        elif "default" in face_map:
            face_name, face_index = face_map["default"]
    # 行ごとの上書きがあればそれを優先し、なければ現在のデフォルト値
    background = line.background if line.background is not None else DEFAULT_BACKGROUND
    position = line.position if line.position is not None else DEFAULT_POSITION

    # メッセージ本文を行単位に分割
    body = line.text or ""
    lines = body.split("\n") if body else [""]

    # code 101: 名前欄にだけ名前を渡し、本文は後続の 401 に入れる
    # MV/MZ の Show Text: [faceName, faceIndex, background, position, text]
    commands.append(
        {
            "code": 101,
            "indent": 0,
            "parameters": [face_name, face_index, background, position, name or ""],
        }
    )

    for line in lines:
        commands.append({"code": 401, "indent": 0, "parameters": [line]})


def ir_to_rmmz_commands(nodes: List[IRNode]) -> List[dict]:
    """IR から RMMZ のイベントコマンド list を生成する."""
    commands: List[dict] = []

    # メッセージ単位の調整（line: そのまま, block: 連続行をまとめる）
    if MESSAGE_UNIT == "block":
        merged: List[IRNode] = []
        buffer_line: Optional[Line] = None

        def flush_buffer() -> None:
            nonlocal buffer_line
            if buffer_line is not None:
                merged.append(buffer_line)
                buffer_line = None

        for node in nodes:
            if isinstance(node, Line):
                if buffer_line is None:
                    buffer_line = Line(
                        name=node.name,
                        text=node.text,
                        expression=node.expression,
                        position=node.position,
                        background=node.background,
                    )
                else:
                    # 同じ話者・同じウィンドウ条件のときだけ同じ塊にまとめる
                    if (
                        buffer_line.name == node.name
                        and buffer_line.expression == node.expression
                        and buffer_line.position == node.position
                        and buffer_line.background == node.background
                    ):
                        buffer_line.text += "\n" + node.text
                    else:
                        flush_buffer()
                        buffer_line = Line(
                            name=node.name,
                            text=node.text,
                            expression=node.expression,
                            position=node.position,
                            background=node.background,
                        )
            elif isinstance(node, Blank):
                # 空行は「ブロック区切り」として扱う（出力はしない）
                flush_buffer()
            else:
                flush_buffer()
                merged.append(node)

        flush_buffer()
        nodes_to_use: List[IRNode] = merged
    else:
        nodes_to_use = nodes

    pending_pos: Optional[int] = None
    pending_bg: Optional[int] = None

    for node in nodes_to_use:
        if isinstance(node, WindowOneShot):
            # 次のメッセージ(Line) 1つにだけ適用する設定
            if node.position is not None:
                pending_pos = node.position
            if node.background is not None:
                pending_bg = node.background
            continue

        if isinstance(node, Line):
            if pending_pos is not None:
                node.position = pending_pos
            if pending_bg is not None:
                node.background = pending_bg
            pending_pos = None
            pending_bg = None
            append_message(commands, node)

        elif isinstance(node, Comment):
            # 単純に 1 行ごとに code 108 として出力
            commands.append({"code": 108, "indent": 0, "parameters": [node.text]})

        elif isinstance(node, Label):
            commands.append({"code": 118, "indent": 0, "parameters": [node.name]})

        elif isinstance(node, Goto):
            commands.append({"code": 119, "indent": 0, "parameters": [node.target]})

        elif isinstance(node, ChoiceBlock):
            choice_texts = [c.text for c in node.choices]
            # code 102: [choices, defaultType, cancelType, position, background]
            commands.append(
                {
                    "code": 102,
                    "indent": 0,
                    "parameters": [choice_texts, 0, 0, 2, 0],
                }
            )
            for idx, c in enumerate(node.choices):
                # code 402: [index, text]
                commands.append(
                    {"code": 402, "indent": 0, "parameters": [idx, c.text]}
                )
                if c.target:
                    # 各選択肢の先頭でラベルジャンプ
                    commands.append(
                        {"code": 119, "indent": 1, "parameters": [c.target]}
                    )
            # 選択肢終了
            commands.append({"code": 404, "indent": 0, "parameters": []})

        elif isinstance(node, Bgm):
            # BGM の演奏 (code 241)
            # MZ 形式: [{ name, volume, pitch, pan }]
            vol = node.volume if node.volume is not None else 90
            commands.append(
                {
                    "code": 241,
                    "indent": 0,
                    "parameters": [
                        {
                            "name": node.name,
                            "volume": vol,
                            "pitch": 100,
                            "pan": 0,
                        }
                    ],
                }
            )

        elif isinstance(node, Se):
            # SE の演奏 (code 250): [{name, volume, pitch, pan}]
            vol2 = node.volume if node.volume is not None else 90
            commands.append(
                {
                    "code": 250,
                    "indent": 0,
                    "parameters": [
                        {
                            "name": node.name,
                            "volume": vol2,
                            "pitch": 100,
                            "pan": 0,
                        }
                    ],
                }
            )

    # 終端 (code 0) を保証
    if not commands or commands[-1].get("code") != 0:
        commands.append({"code": 0, "indent": 0, "parameters": []})

    return commands


# ===== JSON 読み書き =====


def load_json(path: Path) -> object:
    with path.open("r", encoding="utf-8-sig") as f:
        return json.load(f)


def save_json(path: Path, data: object) -> None:
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def backup_file(path: Path) -> None:
    bak = path.with_suffix(path.suffix + ".bak")
    if not bak.exists():
        shutil.copy2(path, bak)


def inject_into_map(
    project_root: Path,
    map_id: int,
    event_id: int,
    page_index: int,
    commands: List[dict],
    do_backup: bool = True,
) -> None:
    data_dir = project_root / "data"
    map_path = data_dir / f"Map{map_id:03d}.json"
    if not map_path.exists():
        raise FileNotFoundError(f"Map file not found: {map_path}")

    data = load_json(map_path)
    events = data.get("events")
    if not isinstance(events, list):
        raise ValueError("Unexpected Map JSON structure: 'events' is not a list")

    if event_id >= len(events) or events[event_id] is None:
        raise KeyError(f"Event ID {event_id} not found in {map_path.name}")

    event = events[event_id]
    pages = event.get("pages")
    if not isinstance(pages, list):
        raise ValueError("Unexpected event structure: 'pages' is not a list")

    if page_index < 0 or page_index >= len(pages):
        raise IndexError(
            f"Page index {page_index} out of range for event {event_id} "
            f"(pages length={len(pages)})"
        )

    page = pages[page_index]
    page["list"] = commands

    if do_backup:
        backup_file(map_path)
    save_json(map_path, data)


def inject_into_common_event(
    project_root: Path,
    common_event_id: int,
    commands: List[dict],
    do_backup: bool = True,
) -> None:
    data_dir = project_root / "data"
    ce_path = data_dir / "CommonEvents.json"
    if not ce_path.exists():
        raise FileNotFoundError(f"CommonEvents.json not found under {data_dir}")

    data = load_json(ce_path)
    if not isinstance(data, list):
        raise ValueError("Unexpected CommonEvents JSON structure (not a list)")

    target = None
    for ce in data:
        if isinstance(ce, dict) and ce.get("id") == common_event_id:
            target = ce
            break

    if target is None:
        raise KeyError(f"CommonEvent id {common_event_id} not found")

    target["list"] = commands

    if do_backup:
        backup_file(ce_path)
    save_json(ce_path, data)


# ===== CLI =====


def read_script_from_args(args: argparse.Namespace) -> str:
    if args.text_file:
        path = Path(args.text_file)
        with path.open("r", encoding="utf-8") as f:
            return f.read()
    # 標準入力から読む（パイプ or 直接ペースト）
    return sys.stdin.read()


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "ノベル風テキストから RPGツクールMZ のイベント会話(list)を生成し、"
            "MapXXX.json / CommonEvents.json に注入するツール"
        )
    )
    parser.add_argument(
        "--project",
        type=str,
        required=True,
        help="RMMZ プロジェクトのルートフォルダ（例: /path/to/game）",
    )
    parser.add_argument(
        "--text-file",
        type=str,
        help="入力テキストファイル（省略時は標準入力から読み込み）",
    )
    parser.add_argument(
        "--no-backup",
        action="store_true",
        help="*.bak バックアップを作らない",
    )

    subparsers = parser.add_subparsers(dest="target", required=True)

    # map 用
    p_map = subparsers.add_parser("map", help="MapXXX.json のイベントページに注入")
    p_map.add_argument("--map-id", type=int, required=True, help="マップID (数値)")
    p_map.add_argument("--event-id", type=int, required=True, help="イベントID (数値)")
    p_map.add_argument(
        "--page-index",
        type=int,
        required=True,
        help="ページ番号 (0 始まり index)",
    )

    # common event 用
    p_ce = subparsers.add_parser(
        "common", help="CommonEvents.json のコモンイベントに注入"
    )
    p_ce.add_argument(
        "--common-event-id", type=int, required=True, help="コモンイベント ID (数値)"
    )

    return parser


def main(argv: Optional[List[str]] = None) -> int:
    parser = build_arg_parser()
    args = parser.parse_args(argv)

    project_root = Path(args.project).resolve()
    script_text = read_script_from_args(args)

    nodes = parse_novel_script(script_text)
    commands = ir_to_rmmz_commands(nodes)
    do_backup = not args.no_backup

    try:
        if args.target == "map":
            inject_into_map(
                project_root=project_root,
                map_id=args.map_id,
                event_id=args.event_id,
                page_index=args.page_index,
                commands=commands,
                do_backup=do_backup,
            )
        elif args.target == "common":
            inject_into_common_event(
                project_root=project_root,
                common_event_id=args.common_event_id,
                commands=commands,
                do_backup=do_backup,
            )
        else:
            parser.error(f"unknown target: {args.target}")
    except Exception as e:  # noqa: BLE001
        print(f"Error: {e}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

