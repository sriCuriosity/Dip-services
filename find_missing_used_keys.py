import os
import re

src_dir = r"c:\Users\Smile\Downloads\dip---doorstep-service-provider (18)\src"
lang_file = os.path.join(src_dir, "contexts", "LanguageContext.tsx")

with open(lang_file, 'r', encoding='utf-8') as f:
    lang_content = f.read()

en_match = re.search(r'en:\s*\{(.*?)\},', lang_content, re.DOTALL)
if not en_match:
    print("Could not find en block")
    exit(1)

# Using a better regex to find keys in en block:
en_block = en_match.group(1)
en_keys = set()
for m in re.finditer(r"['\"](.*?)['\"]\s*:", en_block):
    en_keys.add(m.group(1).replace("\\'", "'"))

used_keys = set()
for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith(('.tsx', '.ts')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
                # Find t('...') or t("...")
                # Handling single quotes with potential escapes
                sq_matches = re.findall(r"t\(\s*'(.*?)'\s*\)", content)
                # Handling double quotes
                dq_matches = re.findall(r't\(\s*"(.*?)"\s*\)', content)
                for m in sq_matches + dq_matches:
                    used_keys.add(m.replace("\\'", "'"))

missing_in_en = sorted([key for key in used_keys if key not in en_keys and key.strip()])
print(f"Total used keys: {len(used_keys)}")
print(f"Total en keys: {len(en_keys)}")
print("Keys used in code but missing in 'en' translation table:")
for key in missing_in_en:
    print(f"'{key}'")
