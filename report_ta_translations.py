import os
import re

src_dir = r"c:\Users\Smile\Downloads\dip---doorstep-service-provider (18)\src"
lang_file = os.path.join(src_dir, "contexts", "LanguageContext.tsx")

with open(lang_file, 'r', encoding='utf-8') as f:
    lang_content = f.read()

ta_match = re.search(r'ta:\s*\{(.*?)\},', lang_content, re.DOTALL)
if not ta_match:
    print("Could not find ta block")
    exit(1)

ta_block = ta_match.group(1)
ta_translations = {}
for m in re.finditer(r"['\"](.*?)['\"]\s*:\s*['\"](.*?)['\"]", ta_block):
    ta_translations[m.group(1).replace("\\'", "'")] = m.group(2).replace("\\'", "'")

used_keys = set()
for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith(('.tsx', '.ts')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
                sq_matches = re.findall(r"t\(\s*'(.*?)'\s*\)", content)
                dq_matches = re.findall(r't\(\s*"(.*?)"\s*\)', content)
                for m in sq_matches + dq_matches:
                    used_keys.add(m.replace("\\'", "'"))

# Find keys that have no Tamil translation or are same as English
missing_or_same = []
for key in sorted(used_keys):
    if not key.strip(): continue
    val = ta_translations.get(key)
    if not val:
        missing_or_same.append((key, "MISSING"))
    elif val == key and not any(ord(c) > 127 for c in val): # Same as English and no Tamil chars
        # Exception for words that might be the same in both languages (unlikely here)
        missing_or_same.append((key, f"SAME AS ENGLISH: {val}"))

print("Missing or incomplete Tamil translations:")
for key, status in missing_or_same:
    print(f"'{key}': {status}")
