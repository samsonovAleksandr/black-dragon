#!/usr/bin/env python3
"""Собирает арт из art/*.js в один файл js/art.js (между маркерами /*ART-BEGIN*/ и /*ART-END*/).
   Запуск: python3 art/inject.py   (после правок engine.js, heroes.js, monsters*.js, decor.js, anim.js)
   js/art.js генерируется — руками его не правят."""
import os
d=os.path.dirname(os.path.abspath(__file__));p=os.path.join(d,'..','js','art.js')
code='/*ART-BEGIN*/\n'+''.join(open(os.path.join(d,f),encoding='utf-8').read().rstrip()+'\n' for f in ['engine.js','heroes.js','monsters1.js','monsters2.js','monsters3.js','monsters4.js','decor.js','anim.js'])+'/*ART-END*/'
open(p,'w',encoding='utf-8').write("'use strict';\n"+code+'\n')
print('inject ok, bytes',len(code))
