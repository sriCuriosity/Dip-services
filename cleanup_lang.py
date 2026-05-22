import os
import re

lang_file = r"c:\Users\Smile\Downloads\dip---doorstep-service-provider (18)\src\contexts\LanguageContext.tsx"

with open(lang_file, 'r', encoding='utf-8') as f:
    content = f.read()

def get_block(lang, content):
    match = re.search(f"{lang}:\\s*\\{{(.*?)\\}},", content, re.DOTALL)
    if not match: return None
    block = match.group(1)
    pairs = re.findall(r"['\"](.*?)['\"]:\s*(['\"].*?['\"]|`.*?`)", block, re.DOTALL)
    return {k.replace("\\'", "'"): v for k, v in pairs}

en_dict = get_block('en', content)
ta_dict = get_block('ta', content)

def format_dict(d):
    lines = []
    for k in sorted(d.keys()):
        v = d[k]
        safe_k = k.replace("'", "\\'")
        lines.append(f"    '{safe_k}': {v},")
    return "\n".join(lines)

new_en = format_dict(en_dict)
new_ta = format_dict(ta_dict)

# Replace en block
content = re.sub(r'en:\s*\{(.*?)\},', f"en: {{\n{new_en}\n  }},", content, flags=re.DOTALL)
# Replace ta block
content = re.sub(r'ta:\s*\{(.*?)\},', f"ta: {{\n{new_ta}\n  }},", content, flags=re.DOTALL)

with open(lang_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("Succesfully cleaned up and de-duplicated LanguageContext.tsx")
