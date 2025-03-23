#!/usr/bin/env python3
import glob
import re


def fix_pubdate_in_file(file_path):
    with open(file_path, "r") as file:
        content = file.read()

    # Use regex to find pubDate in quotes and remove the quotes
    pattern = r"(pubDate: )[\"\'](.*?)[\"\']"
    modified_content = re.sub(pattern, r"\1\2", content)

    # Check if the content was changed
    if content != modified_content:
        with open(file_path, "w") as file:
            file.write(modified_content)
        return True
    return False

# Find all MDX files in the content directory
mdx_files = glob.glob("src/content/blog/**/*.mdx", recursive=True)

fixed_count = 0
for file_path in mdx_files:
    if fix_pubdate_in_file(file_path):
        fixed_count += 1
        print(f"Fixed: {file_path}")

print(f"\nFixed {fixed_count} files.")
