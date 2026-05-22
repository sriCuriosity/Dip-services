import os
import re

lang_file = r"c:\Users\Smile\Downloads\dip---doorstep-service-provider (18)\src\contexts\LanguageContext.tsx"
ta_txt = r"c:\Users\Smile\Downloads\dip---doorstep-service-provider (18)\ta_translations.txt"

with open(lang_file, 'r', encoding='utf-8') as f:
    content = f.read()

with open(ta_txt, 'r', encoding='utf-8') as f:
    ta_content = f.read()

# Extract key-value pairs from ta_content
ta_new_pairs = {}
for m in re.finditer(r"['\"](.*?)['\"]\s*:\s*['\"](.*?)['\"]", ta_content):
    ta_new_pairs[m.group(1).replace("\\'", "'")] = m.group(2).replace("\\'", "'")

# Extract current ta block
ta_match = re.search(r'ta:\s*\{(.*?)\},', content, re.DOTALL)
if not ta_match:
    print("No ta block")
    exit(1)

ta_current_block = ta_match.group(1)
ta_current_pairs = {}
for m in re.finditer(r"['\"](.*?)['\"]\s*:\s*(['\"].*?['\"]|`.*?`)", ta_current_block, re.DOTALL):
    ta_current_pairs[m.group(1).replace("\\'", "'")] = m.group(2)

# Merge
for k, v in ta_new_pairs.items():
    if k not in ta_current_pairs:
        ta_current_pairs[k] = f"'{v.replace(\"'\", \"\\\\'\")}'"

# Rebuild block
lines = []
for k in sorted(ta_current_pairs.keys()):
    v = ta_current_pairs[k]
    lines.append(f"    '{k.replace(\"'\", \"\\\\'\")}': {v},")

new_ta_content = "\n".join(lines)
content = re.sub(r'ta:\s*\{(.*?)\},', f"ta: {{\n{new_ta_content}\n  }},", content, flags=re.DOTALL)

with open(lang_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully merged and de-duplicated.")
