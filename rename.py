import os

def replace_in_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    for old, new in replacements:
        new_content = new_content.replace(old, new)
        
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

replacements = [
    ("biswa_event_platform", "eventmind_platform"),
    ("BiswaEventPlatform", "EventMindApp"),
    ("Biswa Network Agent", "EventMind Agent"),
    ("Biswa AI Summit", "EventMind AI Summit"),
    ("Biswa community", "EventMind community"),
    ("BISWA", "EVENTMIND"),
    ("Biswa", "EventMind"),
    ("biswa", "eventmind")
]

for root, dirs, files in os.walk('d:\\MetaInsights\\Eventmind\\eventmind\\frontend'):
    # skip .git, build, etc.
    if '.git' in root or '\\build\\' in root or '\\.dart_tool\\' in root:
        continue
    for file in files:
        if file.endswith(('.dart', '.yaml', '.html', '.json', '.md')):
            filepath = os.path.join(root, file)
            try:
                replace_in_file(filepath, replacements)
            except Exception as e:
                pass

print("Rename complete.")
