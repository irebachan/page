import json
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Any


@dataclass
class Msg:
  name: str
  text: str
  position: int
  background: int


@dataclass
class Choice:
  text: str
  target_label: Optional[str]


@dataclass
class ChoiceBlock:
  choices: List[Choice]


@dataclass
class Label:
  name: str


@dataclass
class Goto:
  target: str


@dataclass
class Comment:
  text: str


@dataclass
class Bgm:
  name: str
  volume: int


@dataclass
class Se:
  name: str
  volume: int


IRNode = Msg | ChoiceBlock | Label | Goto | Comment | Bgm | Se


def load_json(path: Path) -> Any:
  with path.open("r", encoding="utf-8-sig") as f:
    return json.load(f)


def extract_list_from_map(project_root: Path, map_id: int, event_id: int, page_index: int) -> List[dict]:
  data_dir = project_root / "data"
  map_path = data_dir / f"Map{map_id:03d}.json"
  data = load_json(map_path)
  events = data.get("events")
  if not isinstance(events, list):
    raise ValueError("Invalid Map JSON structure: events not list")
  if event_id >= len(events) or events[event_id] is None:
    raise KeyError(f"Event {event_id} not found")
  event = events[event_id]
  pages = event.get("pages")
  if not isinstance(pages, list):
    raise ValueError("Invalid event structure: pages not list")
  if page_index < 0 or page_index >= len(pages):
    raise IndexError("page index out of range")
  return pages[page_index].get("list") or []


def extract_list_from_common(project_root: Path, common_event_id: int) -> List[dict]:
  data_dir = project_root / "data"
  path = data_dir / "CommonEvents.json"
  data = load_json(path)
  if not isinstance(data, list):
    raise ValueError("Invalid CommonEvents JSON structure")
  target = None
  for ce in data:
    if isinstance(ce, dict) and ce.get("id") == common_event_id:
      target = ce
      break
  if target is None:
    raise KeyError(f"CommonEvent {common_event_id} not found")
  return target.get("list") or []


def parse_event_list_to_ir(cmds: List[dict]) -> List[IRNode]:
  ir: List[IRNode] = []
  i = 0
  while i < len(cmds):
    cmd = cmds[i]
    code = cmd.get("code")
    params = cmd.get("parameters") or []

    if code == 101:
      # name is parameters[4], face info ignored here
      name = params[4] if len(params) >= 5 else ""
      background = params[2] if len(params) >= 3 else 0
      position = params[3] if len(params) >= 4 else 2
      texts: List[str] = []
      j = i + 1
      while j < len(cmds) and cmds[j].get("code") == 401:
        p2 = cmds[j].get("parameters") or []
        if p2:
          texts.append(str(p2[0]))
        j += 1
      ir.append(Msg(name=name, text="\n".join(texts), position=position, background=background))
      i = j
      continue

    if code == 118 and params:
      ir.append(Label(name=str(params[0])))
      i += 1
      continue

    if code == 119 and params:
      ir.append(Goto(target=str(params[0])))
      i += 1
      continue

    if code == 108 and params:
      ir.append(Comment(text=str(params[0])))
      i += 1
      continue

    if code == 241 and params:
      # MZ style: [ { name, volume, pitch, pan } ]
      info = params[0] if params else {}
      name = str(info.get("name", ""))
      vol = int(info.get("volume", 90))
      ir.append(Bgm(name=name, volume=vol))
      i += 1
      continue

    if code == 250 and params:
      info = params[0] if params else {}
      name = str(info.get("name", ""))
      vol = int(info.get("volume", 90))
      ir.append(Se(name=name, volume=vol))
      i += 1
      continue

    if code == 102:
      # Show Choices
      choice_texts = params[0] if params else []
      choices: List[Choice] = []
      # Find following 402 blocks
      j = i + 1
      while j < len(cmds) and cmds[j].get("code") == 402:
        p2 = cmds[j].get("parameters") or []
        index = p2[0] if len(p2) >= 1 else 0
        text = p2[1] if len(p2) >= 2 else ""
        # Look ahead for 119 jump immediately after this 402
        target_label: Optional[str] = None
        k = j + 1
        if k < len(cmds) and cmds[k].get("code") == 119:
          pp = cmds[k].get("parameters") or []
          if pp:
            target_label = str(pp[0])
        # Prefer original text from 102 if available
        if isinstance(choice_texts, list) and 0 <= index < len(choice_texts):
          text = str(choice_texts[index])
        choices.append(Choice(text=str(text), target_label=target_label))
        j += 1
      ir.append(ChoiceBlock(choices=choices))
      # skip until after 404 if present
      while j < len(cmds) and cmds[j].get("code") not in (0, 404):
        j += 1
      if j < len(cmds) and cmds[j].get("code") == 404:
        j += 1
      i = j
      continue

    i += 1

  return ir


def ir_to_novel_text(ir: List[IRNode]) -> str:
  lines: List[str] = []
  last_name = None
  last_pos = None
  last_bg = None
  last_was_msg = False

  for node in ir:
    if isinstance(node, Msg):
      # BGM / SE /ラベル処理に合わせて position/background を見て必要なら window/w1 も戻すことも検討対象だが
      # ここではシンプルに名前とテキストのみを扱う
      # まず、前のメッセージブロックとの間にだけ空行を挿む
      if last_was_msg and lines and lines[-1] != "":
        lines.append("")
      # その上で、話者名の変化を反映
      if node.name != last_name:
        # 名前あり → #名前
        if node.name:
          lines.append(f"#{node.name}")
        else:
          # 名前なしになったタイミング、または最初のメッセージが名無しの場合も
          # 「#」だけ出して名無し状態であることを示す
          if last_name is not None or not lines:
            lines.append("#")
        last_name = node.name
      lines.extend(node.text.split("\n"))
      last_was_msg = True
    elif isinstance(node, Label):
      lines.append(f"@{node.name}")
      last_was_msg = False
    elif isinstance(node, Goto):
      lines.append(f"@goto {node.target}")
      last_was_msg = False
    elif isinstance(node, Comment):
      lines.append(f"// {node.text}")
      last_was_msg = False
    elif isinstance(node, Bgm):
      if node.volume == 90:
        lines.append(f"@bgm {node.name}")
      else:
        lines.append(f"@bgm {node.name}, {node.volume}")
      last_was_msg = False
    elif isinstance(node, Se):
      if node.volume == 90:
        lines.append(f"@se {node.name}")
      else:
        lines.append(f"@se {node.name}, {node.volume}")
      last_was_msg = False
    elif isinstance(node, ChoiceBlock):
      # 直前に説明文などを手で足す運用を想定し、そのまま choices だけ出す
      for c in node.choices:
        if c.target_label:
          lines.append(f"- {c.text} => {c.target_label}")
        else:
          lines.append(f"- {c.text}")
      last_was_msg = False

    # メッセージ間の見やすさ確保用に、必要なら空行を挟むのも検討対象

  return "\n".join(lines)

