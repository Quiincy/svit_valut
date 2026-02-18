import sys
import os

# Додаємо поточну директорію до шляху пошуку модулів
sys.path.insert(0, os.path.dirname(__file__))

# Імпортуємо додаток FastAPI з файлу main.py
from main import app as application
