#!/bin/bash
# Run the Python script using its absolute path
python "/c/Users/Muneeb Hassan/fetch_code.py"

# Define the destination temporary directory (adjust if needed)
temp_dir="/c/Users/Muneeb Hassan/AppData/Local/Temp"
cp combined_code.txt "$temp_dir/combined_code.txt"

# Open the file from the temporary location in Notepad
notepad "$temp_dir/combined_code.txt"