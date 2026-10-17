import importlib.util, hashlib, re, sys
from collections import Counter
spec=importlib.util.spec_from_file_location("s","tools/scan-thread-commands.py"); s=importlib.util.module_from_spec(spec); spec.loader.exec_module(s)
seen={}
for label,data in s.iter_sources(False):
    h=hashlib.sha1(data).hexdigest()
    if h in seen: continue
    seen[h]=data
call=re.compile(r"(?<![A-Za-z0-9_.])#?([A-Za-z_][A-Za-z0-9_]*)\s*\(")
kw={"if","while","for","switch","case","method","function","return","else","elseif","until","class","print","select"}
progs=Counter(); sites=Counter()
for data in seen.values():
    names=Counter()
    for line in s.strip_comments(data.decode("latin-1")):
        for m in call.finditer(line):
            n=m.group(1).lower()
            if n in kw: continue
            names[n]+=1
    for n,c in names.items():
        progs[n]+=1; sites[n]+=c
print(len(seen),"unique programs")
for n,c in progs.most_common(60): print(f"{n:22s} {c:5d} programs  {sites[n]:6d} calls")

# coverage: share of programs whose every call is within the top-N commands
order=[n for n,_ in progs.most_common()]
sets=[]
for data in seen.values():
    ss=set()
    for line in s.strip_comments(data.decode("latin-1")):
        for m in call.finditer(line):
            n=m.group(1).lower()
            if n not in kw: ss.add(n)
    sets.append(ss)
nonempty=[x for x in sets if x]
print("nonempty programs",len(nonempty))
for N in (5,10,15,20,30,50):
    top=set(order[:N]); c=sum(1 for x in nonempty if x<=top)
    print(N, c, round(100*c/len(nonempty),1))
# programs using at least one of top-N
for N in (5,10,20):
    top=set(order[:N]); c=sum(1 for x in nonempty if x&top)
    print("any-of",N, round(100*c/len(nonempty),1))
