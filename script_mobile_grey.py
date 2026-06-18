import sys

file_path = r'd:\harvest-erp\src\pages\Dashboard.vue'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace active state text-purple-400 with text-slate-400 for flat list items
content = content.replace("? 'text-purple-400 font-semibold' : 'text-slate-400 hover:text-purple-400'", "? 'text-slate-400 font-semibold hover:text-purple-400' : 'text-slate-400 hover:text-purple-400'")

# For accordions, same thing
content = content.replace("? 'text-purple-400 font-semibold' : 'text-slate-400'", "? 'text-slate-400 font-semibold hover:text-purple-400' : 'text-slate-400 hover:text-purple-400'")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
