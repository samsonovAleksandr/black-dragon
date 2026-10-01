#!/usr/bin/env python3
"""Вставляет арт из art/*.js в index.html между маркерами /*ART-BEGIN*/ и /*ART-END*/.
   Запуск: python3 art/inject.py   (после правок engine.js, heroes.js, monsters*.js)"""
import os,re
d=os.path.dirname(os.path.abspath(__file__));p=os.path.join(d,'..','index.html')
code='/*ART-BEGIN*/\n'+''.join(open(os.path.join(d,f),encoding='utf-8').read().rstrip()+'\n' for f in ['engine.js','heroes.js','monsters1.js','monsters2.js','monsters3.js','decor.js','anim.js'])+'/*ART-END*/'
s=open(p,encoding='utf-8').read()
if '/*ART-BEGIN*/' in s:
    s=re.sub(r'/\*ART-BEGIN\*/.*?/\*ART-END\*/',lambda m:code,s,flags=re.S)
else:
    a="const SPR={},ICON={},ICONA={};"
    assert s.count(a)==1
    s=s.replace(a,code+"\n"+a)
    b="for(const id in ICA){"
    assert s.count(b)==1
    s=s.replace(b,"for(const k in ART){try{SPR[k]=ART[k]();}catch(e){console.error('art',k,e);}}\n"+b)
    c="if(name!=='q'&&!name.startsWith('i_')){try{c=polish(c);}catch(e){}}"
    assert s.count(c)==1
    s=s.replace(c,"if(name!=='q'&&!name.startsWith('i_')&&!ART[name]){try{c=polish(c);}catch(e){}}")
open(p,'w',encoding='utf-8').write(s)
print('inject ok, bytes',len(s))
