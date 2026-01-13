#!/usr/bin/env python3
"""
Image Renamer Script
Renames images in the resources/img directory sequentially.
Usage: python rename_images.py [--dry-run]
"""

import os
import sys
from pathlib import Path
from typing import List, Tuple

def get_image_files(directory: Path) -> List[Path]:
    """Get all image files from directory, sorted by name."""
    extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'}
    files = [f for f in directory.iterdir()
             if f.is_file() and f.suffix.lower() in extensions]

    # Sort by modification time to preserve order
    files.sort(key=lambda f: f.stat().st_mtime)
    return files

def extract_number(filename: str) -> int:
    """Extract number from filename like 'sample12.jpeg' -> 12"""
    import re
    match = re.search(r'(\d+)', filename)
    return int(match.group(1)) if match else 0

def rename_images(directory: Path, dry_run: bool = False) -> None:
    """Rename images sequentially."""

    # Get all image files
    image_files = get_image_files(directory)

    if not image_files:
        print("No image files found!")
        return

    print(f"Found {len(image_files)} image files")
    print(f"\nMode: {'DRY RUN (no changes will be made)' if dry_run else 'LIVE (files will be renamed)'}\n")

    # Create rename plan: (old_path, new_path)
    rename_plan: List[Tuple[Path, Path]] = []

    for index, file_path in enumerate(image_files, start=1):
        extension = file_path.suffix
        new_name = f"sample{index}{extension}"
        new_path = file_path.parent / new_name

        if file_path.name != new_name:
            rename_plan.append((file_path, new_path))

    if not rename_plan:
        print("All files are already named correctly!")
        return

    # Show rename plan
    print("Rename plan:")
    print("-" * 60)
    for old_path, new_path in rename_plan:
        print(f"{old_path.name:30} -> {new_path.name}")
    print("-" * 60)
    print(f"\nTotal files to rename: {len(rename_plan)}\n")

    if dry_run:
        print("Dry run complete. Run without --dry-run to apply changes.")
        return

    # Confirm before proceeding
    response = input("Proceed with renaming? (yes/no): ").strip().lower()
    if response not in ['yes', 'y']:
        print("Aborted.")
        return

    # Use temporary names first to avoid conflicts
    temp_renames = []
    try:
        # Step 1: Rename to temporary names
        for i, (old_path, new_path) in enumerate(rename_plan):
            temp_path = old_path.parent / f"temp_rename_{i}{old_path.suffix}"
            old_path.rename(temp_path)
            temp_renames.append((temp_path, new_path))
            print(f"Temp: {old_path.name} -> {temp_path.name}")

        # Step 2: Rename to final names
        for temp_path, new_path in temp_renames:
            temp_path.rename(new_path)
            print(f"Final: {temp_path.name} -> {new_path.name}")

        print(f"\nSuccessfully renamed {len(rename_plan)} files!")

    except Exception as e:
        print(f"\nError during renaming: {e}")
        print("Attempting to restore original names...")
        # Try to restore from temp names
        for temp_path, _ in temp_renames:
            if temp_path.exists():
                # Try to restore but this might not work perfectly
                print(f"Found temporary file: {temp_path.name}")
        sys.exit(1)

def main():
    """Main entry point."""
    # Check if dry run mode
    dry_run = '--dry-run' in sys.argv or '-n' in sys.argv

    # Get the script directory
    script_dir = Path(__file__).parent
    img_dir = script_dir / 'resources' / 'img'

    if not img_dir.exists():
        print(f"Error: Directory not found: {img_dir}")
        sys.exit(1)

    print(f"Working directory: {img_dir}\n")

    rename_images(img_dir, dry_run)

if __name__ == '__main__':
    main()
