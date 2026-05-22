import os
import re

lang_file = r"c:\Users\Smile\Downloads\dip---doorstep-service-provider (18)\src\contexts\LanguageContext.tsx"

with open(lang_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Extract keys from 'en' block
en_match = re.search(r'en:\s*\{(.*?)\},', content, re.DOTALL)
if not en_match:
    print("No en block")
    exit(1)

en_block = en_match.group(1)
en_pairs = re.findall(r"['\"](.*?)['\"]:\s*(['\"].*?['\"]|`.*?`)", en_block, re.DOTALL)
en_dict = {k.replace("\\'", "'"): v for k, v in en_pairs}

# Extract keys from 'ta' block
ta_match = re.search(r'ta:\s*\{(.*?)\},', content, re.DOTALL)
if not ta_match:
    print("No ta block")
    exit(1)

ta_block = ta_match.group(1)
ta_keys = re.findall(r"['\"](.*?)['\"]:\s*", ta_block)
ta_keys = [k.replace("\\'", "'") for k in ta_keys]

# Build new 'ta' block where values are just the keys (English)
new_ta_lines = []
for k in sorted(ta_keys):
    # Use en value if exists, else use key
    val = en_dict.get(k, f"'{k.replace(\"'\", \"\\\\'\")}'")
    new_ta_lines.append(f"    '{k.replace(\"'\", \"\\\\'\")}': {val},")

new_ta_content = "\n".join(new_ta_lines)
content = re.sub(r'ta:\s*\{(.*?)\},', f"ta: {{\n{new_ta_content}\n  }},", content, flags=re.DOTALL)

# Also, if there are any hardcoded t('...') calls that I changed in other files, I should check them.
# But using English in 'ta' block fixes it globally.

with open(lang_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("Reverted Tamil translations to English values.")
