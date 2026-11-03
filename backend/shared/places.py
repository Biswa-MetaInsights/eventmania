"""Offline town/city search from the CC BY 4.0 GeoNames cities500 dataset."""
import os
import sqlite3
import unicodedata
from pathlib import Path

DEFAULT_PATH = '/app/data/geonames.sqlite'

def normalise(value):
    return ''.join(c for c in unicodedata.normalize('NFKD', value.casefold()) if not unicodedata.combining(c))

def search(query, limit=15):
    path = Path(os.getenv('LOCATION_DB', DEFAULT_PATH))
    if not path.is_file(): return []
    key = normalise(query.strip())
    with sqlite3.connect('file:' + str(path) + '?mode=ro', uri=True) as db:
        rows = db.execute('SELECT name,country,lat,lng,timezone FROM places WHERE search_key >= ? AND search_key < ? ORDER BY population DESC LIMIT ?', (key, key+'\uffff', min(limit,30))).fetchall()
    return [{'name': r[0], 'country': r[1], 'lat': r[2], 'lng': r[3], 'timezone': r[4]} for r in rows]
