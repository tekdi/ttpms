#!/bin/bash

echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "Starting TPPMS FastAPI server..."
python main.py
