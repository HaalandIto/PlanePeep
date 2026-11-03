"""
This Python script used this AI prompt:
Take this shell command:

`awk -F"," "$7 == \"United States\" && $27 != \"\" && $27 != \"\047\047\" && $27 ~ /^N[1-9]/ {print $1, $27}" aircraft-database-complete-2025-08.csv | head -20`

Convert the awk logic to a python script that finds the same data and takes an argument 'o' that indicates whether to output to a csv or inject the data into a database table AircraftMetadata at the url at the env var $DB_URL, $DB_USERNAME and $DB_PASSWORD. It must be able to connect to a mysql database
"""

"""
Run the script again standalone in docker compose:

docker compose up -d --no-deps --build metadata-loader-dev

Test .csv generated with this command:
head -1 aircraft-database-complete-2025-08.csv > aircraft-database-test.csv && awk -F"," "$7 ~ /United States/ && $27 ~ /'?N[1-9]/" aircraft-database-complete-2025-08.csv | head -100 >> aircraft-database-test.csv
"""

import csv
import sys
import mysql.connector
import os
import re
import argparse
import requests
from pathlib import Path

# Batch size for performance
BATCH_SIZE = 5000

"""_summary_
This script processes the OpenSky aircraft database CSV
1. Filters for US-registered planes with N-numbers
2. either outputs to a new CSV or inserts into a MySQL database
3. Uses batch processing for performance
https://opensky-network.org/datasets/#metadata/
"""
def process_aircraft_data(output_mode, filename, autoload):
    n_number_pattern = re.compile(r"^'?N[1-9]")

    if output_mode == 'db':
        try:
            db_host = os.getenv('DB_HOST', 'db')
            print(f"Connecting to database... {db_host}:3306")
            conn = mysql.connector.connect(
                # host="mysql://localhost:" + str(DB_PORT) + os.getenv('DB_URL').rsplit(':3306', 1)[1],
                host=db_host,
                port=3306,
                user=os.getenv('DB_USERNAME'),
                password=os.getenv('DB_PASSWORD'),
                database=os.getenv('MYSQL_DATABASE', 'planepeep-db')
            )
            cursor = conn.cursor()
            
            # Optimization: Use a single transaction for the whole batch
            print("Connected. Starting data injection...")
        except Exception as e:
            print(f"Connection Error: {e}")
            sys.exit(1)
    else:
        out_file = open('filtered_aircraft.csv', 'w', newline='')
        writer = csv.writer(out_file)
        writer.writerow(['icao24', 'registration'])

    batch = []
    processed_count = 0

    try:
        file_path = Path(filename)
        if not file_path.is_file():
            # http://static.hauge.rocks/aircraft-database-complete-2025-08.zip
            print(f"File not found: {filename}")
            if autoload:
                print("Attempting to download the file...")
                zip_filename = 'aircraft-database-complete-2025-08.zip'
                url = "http://static.hauge.rocks/" + zip_filename
                try:
                    response = requests.get(url)
                    response.raise_for_status() # check for failed download
                    with open(zip_filename, 'wb') as f:
                        f.write(response.content) # save the zip to disk
                    print("Download complete. Extracting...")
                    import zipfile
                    with zipfile.ZipFile(zip_filename, 'r') as zip_ref:
                        zip_ref.extractall('./data')
                        extracted_csvs = [
                            name for name in zip_ref.namelist()
                            if name.lower().endswith('.csv') and not name.endswith('/')
                        ]
                    if not extracted_csvs:
                        raise ValueError("No CSV file found in downloaded zip archive")
                    filename = str(Path('./data') / extracted_csvs[0])
                    print("Extraction complete, processing...")
                except Exception as e:
                    print(f"Download or extraction failed: {e}")
                    sys.exit(1)
            else: sys.exit(1)
        with open(filename, mode='r', encoding='utf-8') as f:
            reader = csv.reader(f, delimiter=',', quotechar="'")
            next(reader) 

            for row in reader:
                # OpenSky Map: 0:icao24, 6:country, 26:registration, 30:aircraft_type, 22:owner
                if n_number_pattern.match(row[26]):
                    data = (row[0], row[26], row[30], row[22])
                    batch.append(data)
                    
                    if len(batch) >= BATCH_SIZE:
                        if output_mode == 'db':
                            # 'ON DUPLICATE KEY UPDATE icao24=icao24' prevents insertion if exists
                            cursor.executemany(
                                """INSERT INTO aircraft_metadata (icao24, registration, aircraft_type, owner) 
                                   VALUES (%s, %s, %s, %s) 
                                   ON DUPLICATE KEY UPDATE icao24=icao24""", 
                                batch
                            )
                            conn.commit()
                        else:
                            writer.writerows(batch)
                        
                        batch = []
                    processed_count += 1
                    # print(f"batch: {batch[-1]}")

            # Finalize leftovers
            if batch:
                if output_mode == 'db':
                    cursor.executemany(
                        "INSERT INTO aircraft_metadata (icao24, registration, aircraft_type, owner) VALUES (%s, %s, %s, %s) ON DUPLICATE KEY UPDATE icao24=icao24", 
                        batch
                    )
                    conn.commit()
                else:
                    writer.writerows(batch)

        print(f"Finished: Processed {processed_count} relevant rows")

    except Exception as e:
        print(f"Error processing data: {e}")
        sys.exit(1)
    finally:
        if output_mode == 'db':
            cursor.close()
            conn.close()
        else:
            out_file.close()
        sys.exit(0) # notify compose that we are done

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('-o', choices=['csv', 'db'], default='csv', help='Output mode: "csv" to write to a file, "db" to insert into database')
    parser.add_argument('-f', help='Path to the input CSV file', required=False, default='./data/aircraft-database-test.csv')
    parser.add_argument('--auto', action='store_true', help='Automatically download the aircraft database if the file is not found locally')
    args = parser.parse_args()
    process_aircraft_data(args.o, args.f, args.auto)