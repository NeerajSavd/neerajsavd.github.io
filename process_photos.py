import os
import csv
from PIL import Image

SOURCE_FOLDER = 'Photos'
OUTPUT_FOLDER = 'Photos_Resized'
OUTPUT_FILE = 'images.csv'
MAX_SIZE = (1080, 1080)

def generate_image_csv_and_resize():
    if not os.path.exists(SOURCE_FOLDER):
        print(f"Error: The folder '{SOURCE_FOLDER}' was not found.")
        return

    if not os.path.exists(OUTPUT_FOLDER):
        os.makedirs(OUTPUT_FOLDER)
        print(f"Created directory: {OUTPUT_FOLDER}")

    print(f"Processing images from '{SOURCE_FOLDER}'...")

    with open(OUTPUT_FILE, mode='w', newline='', encoding='utf-8') as csv_file:
        writer = csv.writer(csv_file)
        writer.writerow(['path', 'name', 'category'])
        file_count = 0

        for root, dirs, files in os.walk(SOURCE_FOLDER):
            files = sorted([f for f in files if not f.startswith('.')], key=lambda x: x.lower())
            
            relative_path = os.path.relpath(root, SOURCE_FOLDER)
            target_subfolder = os.path.join(OUTPUT_FOLDER, relative_path)
            
            if not os.path.exists(target_subfolder):
                os.makedirs(target_subfolder)

            for i, filename in enumerate(files, 1):
                source_path = os.path.join(root, filename)
                category = os.path.basename(root)
                
                base_name = os.path.splitext(filename)[0]
                new_filename = f"{base_name}.jpg"
                save_path = os.path.join(target_subfolder, new_filename)
                
                try:
                    with Image.open(source_path) as img:
                        img = img.convert('RGB')
                        
                        img.thumbnail(MAX_SIZE, Image.Resampling.LANCZOS)
                        
                        img.save(save_path, "JPEG", quality=85)
                    
                    csv_path = "../" + save_path
                    writer.writerow([csv_path, f"{category}_{i}", category])
                    file_count += 1
                    
                except Exception as e:
                    print(f"Error processing {filename}: {e}")

    print(f"Successfully processed {file_count} files.")
    print(f"Resized images are in '{OUTPUT_FOLDER}' and CSV is updated.")

if __name__ == "__main__":
    generate_image_csv_and_resize()