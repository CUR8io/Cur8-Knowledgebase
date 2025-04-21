import os
import shutil
from PIL import Image
from datetime import datetime

def compress_images(source_dir, backup_dir, quality_percent=70):
    """
    Compress images in source_dir, backing up originals to backup_dir.
    quality_percent: compression level (0-100), lower means more compression
    """
    # Create timestamped backup directory
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = os.path.join(backup_dir, f"backup_{timestamp}")
    os.makedirs(backup_path, exist_ok=True)

    # Track statistics
    total_original_size = 0
    total_compressed_size = 0
    processed_files = 0
    skipped_files = 0

    # Walk through the source directory
    for root, _, files in os.walk(source_dir):
        for filename in files:
            if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
                file_path = os.path.join(root, filename)
                relative_path = os.path.relpath(file_path, source_dir)
                backup_file_path = os.path.join(backup_path, relative_path)

                # Create necessary directories in backup location
                os.makedirs(os.path.dirname(backup_file_path), exist_ok=True)

                try:
                    # Copy original to backup
                    shutil.copy2(file_path, backup_file_path)
                    original_size = os.path.getsize(file_path)
                    total_original_size += original_size

                    # Compress image
                    with Image.open(file_path) as img:
                        # If PNG with transparency, preserve it
                        if img.format == 'PNG' and img.mode == 'RGBA':
                            img.save(file_path, 'PNG', optimize=True)
                        else:
                            # Convert to RGB if necessary
                            if img.mode in ('RGBA', 'P'):
                                img = img.convert('RGB')
                            img.save(file_path, quality=quality_percent, optimize=True)

                    compressed_size = os.path.getsize(file_path)
                    total_compressed_size += compressed_size
                    processed_files += 1

                    print(f"Compressed {relative_path}")
                    print(f"Original size: {original_size/1024:.1f}KB")
                    print(f"Compressed size: {compressed_size/1024:.1f}KB")
                    print(f"Reduction: {100 - (compressed_size/original_size*100):.1f}%\n")

                except Exception as e:
                    print(f"Error processing {filename}: {str(e)}")
                    skipped_files += 1

    # Print summary
    print("\nCompression Summary:")
    print(f"Processed files: {processed_files}")
    print(f"Skipped files: {skipped_files}")
    print(f"Total original size: {total_original_size/1024/1024:.1f}MB")
    print(f"Total compressed size: {total_compressed_size/1024/1024:.1f}MB")
    print(f"Total reduction: {100 - (total_compressed_size/total_original_size*100):.1f}%")
    print(f"Originals backed up to: {backup_path}")

if __name__ == "__main__":
    source_directory = "en/.gitbook/assets"
    backup_directory = "image_backups"
    
    if not os.path.exists(source_directory):
        print(f"Error: Source directory '{source_directory}' not found!")
        exit(1)
    
    print(f"Starting image compression (quality: 70%)...")
    print(f"Source directory: {source_directory}")
    print(f"Backup directory: {backup_directory}\n")
    
    compress_images(source_directory, backup_directory) 