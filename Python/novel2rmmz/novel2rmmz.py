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


# 名前 → (faceName, faceIndex) の簡易マップ
# 例: NAME_FACE_CONFIG = {"ミヤケ": ("Male4_Face-Set", 0)}
NAME_FACE_CONFIG: dict[str, tuple[str, int]] = {}

# ===== 中間表現 (IR) クラス =====


@dataclass
class Line:
    name: str
    text: str


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


IRNode = Line | Comment | Label | Goto | ChoiceBlock


# ===== ノベル風テキスト → IR パーサ =====


def parse_novel_script(text: str) -> List[IRNode]:
    """ノベルプレーヤー風の記法から IR を構築する."""
    lines = text.splitlines()
    nodes: List[IRNode] = []
    current_name: str = ""
    i = 0

    def is_control_prefix(s: str) -> bool:
        return s.startswith("@") or s.startswith("#") or s.startswith("-") or s.startswith("//")

    while i < len(lines):
        raw = lines[i]
        stripped = raw.strip()

        # 空行は無視
        if stripped == "":
            i += 1
            continue

        # コメント行（//）→ 注釈 IR として保持
        if stripped.startswith("//"):
            comment_text = stripped[2:].lstrip()
            nodes.append(Comment(text=comment_text))
            i += 1
            continue

        # ラベル / goto
        if stripped.startswith("@"):
            parts = stripped.split()
            cmd = parts[0][1:]
            if cmd == "goto" and len(parts) >= 2:
                target = parts[1]
                nodes.append(Goto(target=target))
            else:
                # それ以外はラベル名として扱う (@start など)
                nodes.append(Label(name=cmd))
            i += 1
            continue

        # 名前指定
        if stripped.startswith("#"):
            current_name = stripped[1:].strip()
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
        nodes.append(Line(name=current_name, text=stripped))
        i += 1

    return nodes


# ===== IR → RMMZ イベントコマンド list 変換 =====


def append_message(commands: List[dict], name: str, text: str) -> None:
    """メッセージ 1 本を code 101 + 401 群として追加する."""
    # 名前に応じて顔グラを決定（未設定なら空）
    if name and name in NAME_FACE_CONFIG:
        face_name, face_index = NAME_FACE_CONFIG[name]
    else:
        face_name = ""
        face_index = 0
    background = DEFAULT_BACKGROUND
    position = DEFAULT_POSITION

    # メッセージ本文を行単位に分割
    lines = text.split("\n") if text else [""]

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

    for node in nodes:
        if isinstance(node, Line):
            append_message(commands, node.name, node.text)

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

