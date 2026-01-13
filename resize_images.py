#!/usr/bin/env python3
"""
Image Resizer Script
--------------------
Resizes images in the root directory to 1280px width (maintaining aspect ratio)
and saves them to the img/ folder as sample1.jpeg, sample2.jpeg, etc.

Usage:
    python resize_images.py

Requirements:
    pip install Pillow
"""

import os
from pathlib import Path
from PIL import Image

# Configuration
TARGET_WIDTH = 1280
OUTPUT_DIR = "resources/img"
OUTPUT_PREFIX = "sample"
OUTPUT_FORMAT = "JPEG"
OUTPUT_EXTENSION = ".jpeg"

# Supported image extensions
SUPPORTED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff'}

def get_next_sample_number(output_dir):
    """Find the next available sample number."""
    if not os.path.exists(output_dir):
        return 1

    existing_files = [f for f in os.listdir(output_dir) if f.startswith(OUTPUT_PREFIX)]
    if not existing_files:
        return 1

    # Extract numbers from existing sample files
    numbers = []
    for filename in existing_files:
        name = os.path.splitext(filename)[0]
        if name.startswith(OUTPUT_PREFIX):
            try:
                num = int(name[len(OUTPUT_PREFIX):])
                numbers.append(num)
            except ValueError:
                continue

    return max(numbers) + 1 if numbers else 1

def resize_image(input_path, output_path, target_width=TARGET_WIDTH):
    """Resize image to target width while maintaining aspect ratio."""
    try:
        with Image.open(input_path) as img:
            # Convert RGBA to RGB if necessary (for JPEG)
            if img.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
                img = background

            # Calculate new dimensions
            width, height = img.size
            aspect_ratio = height / width
            new_width = target_width
            new_height = int(new_width * aspect_ratio)

            if width == target_width:
                print(f"  Image already at {target_width}px, copying as-is")
                img.save(output_path, OUTPUT_FORMAT, quality=95)
                return True

            # Resize with high-quality resampling
            resized_img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

            # Save the resized image
            resized_img.save(output_path, OUTPUT_FORMAT, quality=95, optimize=True)

            action = "Upscaled" if width < target_width else "Resized"
            print(f"  {action} from {width}x{height} to {new_width}x{new_height}")
            return True

    except Exception as e:
        print(f"  Error: {str(e)}")
        return False

def main():
    """Main function to process images in root directory."""
    root_dir = Path(".")
    output_dir = Path(OUTPUT_DIR)

    # Create output directory if it doesn't exist
    output_dir.mkdir(exist_ok=True)

    # Find all image files in root directory (not subdirectories)
    image_files = [
        f for f in root_dir.iterdir()
        if f.is_file() and f.suffix.lower() in SUPPORTED_EXTENSIONS
    ]

    if not image_files:
        print("No images found in root directory.")
        print(f"Supported formats: {', '.join(SUPPORTED_EXTENSIONS)}")
        return

    print(f"Found {len(image_files)} image(s) to process:\n")

    # Get starting sample number
    sample_num = get_next_sample_number(output_dir)
    processed_count = 0

    for image_file in sorted(image_files):
        output_filename = f"{OUTPUT_PREFIX}{sample_num}{OUTPUT_EXTENSION}"
        output_path = output_dir / output_filename

        print(f"Processing: {image_file.name} -> {output_filename}")

        if resize_image(image_file, output_path):
            processed_count += 1
            sample_num += 1

        print()

    print(f"✓ Successfully processed {processed_count}/{len(image_files)} image(s)")
    print(f"  Output directory: {output_dir.absolute()}")

if __name__ == "__main__":
    main()
