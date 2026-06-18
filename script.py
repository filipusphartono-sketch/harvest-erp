import sys

file_path = r'd:\harvest-erp\src\pages\Dashboard.vue'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace bg-purple-500/10 with nothing for flat design
content = content.replace("'text-purple-400 bg-purple-500/10'", "'text-purple-400 font-semibold'")
content = content.replace("'text-slate-300 hover:bg-slate-800/50 hover:text-white'", "'text-slate-400 hover:text-purple-400'")
content = content.replace("'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'", "'text-slate-400 hover:text-purple-400'")
content = content.replace("hover:bg-slate-800/50 hover:text-white", "hover:text-purple-400")
content = content.replace("rounded-lg ", "")

# Make the accordions aware of their children being active
content = content.replace(":class=\"openMenus.produksi ? 'text-white' : ''\"", ":class=\"openMenus.produksi || currentTab.startsWith('produksi_') ? 'text-purple-400 font-semibold' : 'text-slate-400'\"")
content = content.replace(":class=\"openMenus.gudang ? 'text-white' : ''\"", ":class=\"openMenus.gudang || currentTab.startsWith('gudang_') ? 'text-purple-400 font-semibold' : 'text-slate-400'\"")
content = content.replace(":class=\"openMenus.salary ? 'text-white' : ''\"", ":class=\"openMenus.salary || currentTab.startsWith('salary_') ? 'text-purple-400 font-semibold' : 'text-slate-400'\"")
content = content.replace(":class=\"openMenus.pengaturan ? 'text-white' : ''\"", ":class=\"openMenus.pengaturan || currentTab.startsWith('pengaturan_') || currentTab == 'users' || currentTab == 'customer' || currentTab == 'suppliyer' ? 'text-purple-400 font-semibold' : 'text-slate-400'\"")

# Stop propagation on toggleMenu
content = content.replace("@click=\"toggleMenu(", "@click.stop=\"toggleMenu(")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
