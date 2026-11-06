# usage: python bump.py 8  -- sets the ?v= of every module import, main.js and style.css to that number
import re, glob, sys
v = sys.argv[1]
for f in glob.glob('js/*.js') + ['index.html']:
    s = open(f, encoding='utf-8').read()
    n = re.sub(r"(\.(?:js|css))\?v=\d+", r"\g<1>?v=" + v, s)
    n = re.sub(r"from '\./(\w+)\.js'", r"from './\g<1>.js?v=" + v + "'", n)
    if n != s: open(f, 'w', encoding='utf-8').write(n)
