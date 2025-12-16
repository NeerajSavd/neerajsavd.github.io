import os
import csv

# Configuration
SOURCE_FOLDER = 'Photos'
OUTPUT_FILE = 'images.csv'

def generate_image_csv():
    # check if source folder exists to prevent errors
    if not os.path.exists(SOURCE_FOLDER):
        print(f"Error: The folder '{SOURCE_FOLDER}' was not found.")
        return

    print(f"Scanning '{SOURCE_FOLDER}'...")

    with open(OUTPUT_FILE, mode='w', newline='', encoding='utf-8') as csv_file:
        writer = csv.writer(csv_file)
        
        # Write the Header
        writer.writerow(['path', 'name', 'category'])

        file_count = 0

        # os.walk yields a 3-tuple (dirpath, dirnames, filenames)
        for root, dirs, files in os.walk(SOURCE_FOLDER):
            i = 0
            for filename in files:
                i += 1
                # Optional: Ignore hidden files (like .DS_Store on Mac)
                if filename.startswith('.'):
                    continue
                
                # Get the full path
                full_path = "../"+os.path.join(root, filename)
                
                # Get the category (the name of the folder the file is inside)
                category = os.path.basename(root)
                
                # If the file is directly in 'Photos' without a subfolder, 
                # category might be 'Photos'. You can handle that if needed.
                
                writer.writerow([full_path, category+"_"+str(i), category])
                file_count += 1

    print(f"Successfully wrote {file_count} files to {OUTPUT_FILE}")

if __name__ == "__main__":
    generate_image_csv()