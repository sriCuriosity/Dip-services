import re

file_path = r"c:\Users\Smile\Downloads\dip---doorstep-service-provider (18)\src\contexts\LanguageContext.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

en_match = re.search(r'en:\s*\{(.*?)\},', content, re.DOTALL)
ta_match = re.search(r'ta:\s*\{(.*?)\},', content, re.DOTALL)

if en_match and ta_match:
    en_block = en_match.group(1)
    ta_block = ta_match.group(1)

    en_keys = re.findall(r"'(.*?)':", en_block)
    ta_keys = re.findall(r"'(.*?)':", ta_block)

    missing_keys = [key for key in en_keys if key not in ta_keys]
    
    print("Missing keys in 'ta' object:")
    for key in missing_keys:
        print(f"'{key}'")
else:
    print("Could not find en or ta blocks")
