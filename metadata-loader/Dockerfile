# metadata-loader/Dockerfile
FROM python:3.11-slim as build

# Install system dependencies for mysql-connector if needed
RUN apt-get update && apt-get install -y default-libmysqlclient-dev build-essential && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the script
COPY load_meta.py .

FROM build as load

# Copy data into image for production (no bind mount needed)
COPY data/ ./data/

# The command to run the script
ENTRYPOINT ["sh", "-c", "python load_meta.py -o db -f ${META_FILE:-./data/aircraft-database-test.csv} --auto"]
