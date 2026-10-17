"""Reproduce the documented lexical counts; no private message text is emitted."""
import json, re, sys
from pathlib import Path
from collections import Counter
base=Path(sys.argv[1]) if len(sys.argv)>1 else Path.home()/"projects/rpgtoolkit-archive/data"
files=["nostalgia-messages.jsonl","general-relevant-messages.jsonl","forum-posts.jsonl"]
pats = {'lost work': '\\b(?:lost|lose|losing)\\b.{0,35}\\b(?:work|game|project|file|stuff|copy|save|data)\\b|\\b(?:work|game|project|file|stuff|copy|save|data)\\b.{0,35}\\b(?:lost|lose|losing)\\b|wiped (?:a )?hard drive|lost completely|gone forever|formatted', 'crash/freeze': '\\bcrash(?:es|ed|ing)?\\b|\\bfreez(?:e|es|ing|ed)\\b|not responding|won.t reopen|will not reopen|won.t open', 'corruption/missing': '\\bcorrupt(?:ed|ion)?\\b|file.{0,30}(?:missing|not recognized|error)|dll missing|bad file', 'save failure': '\\b(?:save|saved|saves|saving)\\b.{0,30}(?:fail|problem|error|wrong|work|lost|crash|freeze|can.t|cannot|doesn.t|not)|(?:fail|problem|error|wrong|lost|crash|freeze|can.t|cannot|doesn.t|not).{0,30}\\b(?:save|saved|saves|saving)\\b', 'board': '\\b(?:board editor|board linking|link boards?|board settings?|board information|place (?:an )?item on the board|on the board)\\b', 'tiles': '\\b(?:tile editor|tileset|tile set|make a tile|import.*(?:tile|graphic|sprite)|tile.*(?:problem|help|work)|sprite.*(?:problem|help|work))\\b', 'scripting': '\\b(?:rpgcode|rpg code|program editor|writing programs?|program.*(?:problem|help|work|error)|code.*(?:problem|help|crash|error)|debugger|command.*(?:problem|help))\\b', 'database': '\\b(?:character editor|edit character|enemy editor|edit enemy|item editor|edit item|equipment|npc.*(?:problem|help)|character.*(?:problem|help|work))\\b', 'animation': '\\b(?:animation editor|tile animator|animation.*(?:problem|help|work|need|should)|animate.*(?:problem|help)|frame.*(?:problem|help))\\b', 'main file': '\\b(?:main file|\\.gam|new game|start.*game|game.*(?:file|project).*(?:problem|help|work)|project.*(?:problem|help))\\b', 'packaging': '\\b(?:distribution|create setup|setup file|packag|playable for others|upload.*game|build (?:exe|menu)|create (?:pak|setup))\\b', 'scripting difficulty': '\\b(?:not good at|no clue|don.t know|can.t figure|confus(?:ed|ing)|flounder|hard to|difficult|trouble|struggl|unintuit|steep learning|programming problem|writing (?:code|program))\\b.{0,80}\\b(?:code|rpgcode|program|script|command|syntax|editor)\\b|\\b(?:code|rpgcode|program|script|command|syntax|editor)\\b.{0,80}\\b(?:not good at|no clue|don.t know|can.t figure|confus(?:ed|ing)|flounder|hard to|difficult|trouble|struggl|unintuit|steep learning|problem)\\b', 'loved': '\\b(?:loved|love|favorite|favourite|amazing|masterpiece|learned to program|learned programming|career began|started.*(?:game making|programming)|nostalgia|community support|powerful|flexib|custom)\\b.{0,70}\\b(?:toolkit|rpgtk|rpgcode|editor|game making|programming|community)\\b|\\b(?:toolkit|rpgtk|rpgcode|editor|game making|programming|community)\\b.{0,70}\\b(?:loved|love|favorite|favourite|amazing|masterpiece|learned to program|learned programming|career began|started|nostalgia|powerful|flexib|custom)\\b', 'feature requests': '\\b(?:suggest(?:ion)?|wish|would be nice|need(?:s)?|request|idea|feature|improvement|add)\\b', 'comparisons': '\\b(?:rpg maker|rpgmaker|sphere|adventure game studio|\\bags\\b|godot|gamemaker|game maker|wolf rpg|left it|leave it|switched|instead|recommend|regret choosing|stopped using|stay(?:ed)? with)\\b'}

# Include both spellings, as in the final evidence table's corrected search.
pats["corruption/missing"] = r"\bcorrupt(?:ed|ion)?\b|file.{0,30}(?:missing|not recogni[sz]ed|error)|dll missing|bad file"

q = re.compile('\\?|\\b(?:how|where|why|what|can|could|help|problem|trouble|confus|don.t know|not sure|cannot|can.t|doesn.t|won.t)\\b', re.I)

request = re.compile('\\b(?:suggest(?:ion)?|wish|would be nice|need(?:s)?|request|idea|feature|improvement|add)\\b', re.I)
editor = re.compile('\\b(?:editor|board|tile|tileset|animation|program|rpgcode|code|plugin|battle|background|save|undo|batch|spill|drag.?and.?drop|random(?:ized)?|newbie|user.?friendly|easy|export|setup|build)\\b', re.I)
rows=[]
for filename in files:
    with (base/filename).open(encoding="utf-8") as handle:
        for line in handle:
            if line.strip():
                row=json.loads(line)
                rows.append((filename,(row.get("subject") or "")+" "+(row.get("text") or "")))
for name,pattern in pats.items():
    regex=re.compile(pattern,re.I|re.S)
    def matches(text):
        if name=="feature requests": return bool(request.search(text) and editor.search(text))
        return bool(regex.search(text) and (name not in ("board","tiles","scripting","database","animation","main file","packaging") or q.search(text)))
    counts=Counter(filename for filename,text in rows if matches(text))
    print(name, " / ".join(str(counts[f]) for f in files), "=",sum(counts.values()))
