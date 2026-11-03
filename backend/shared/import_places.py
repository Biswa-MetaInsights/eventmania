"""Download the public, attributed GeoNames extract once; never geocode user locations remotely."""
import csv
import hashlib
import io
import os
from pathlib import Path
import sqlite3
import tempfile
from urllib.request import Request, urlopen
import zipfile
from backend.shared.places import normalise, DEFAULT_PATH

URL = 'https://download.geonames.org/export/dump/cities500.zip'

def install():
    target = Path(os.getenv('LOCATION_DB', DEFAULT_PATH))
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=target.parent) as directory:
        archive = Path(directory)/'cities.zip'
        digest = hashlib.sha256()
        with urlopen(Request(URL, headers={'User-Agent': 'NewFind/1.0 (https://metainsights.eu)'}), timeout=60) as response, archive.open('wb') as handle:
            size = 0
            while chunk := response.read(65536):
                size += len(chunk)
                if size > 30*1024*1024: raise RuntimeError('Place dataset exceeds expected size')
                digest.update(chunk)
                handle.write(chunk)
        database = Path(directory)/'places.sqlite'
        with sqlite3.connect(database) as db:
            db.execute('CREATE TABLE places (id INTEGER PRIMARY KEY, name TEXT, country TEXT, lat REAL, lng REAL, timezone TEXT, population INTEGER, search_key TEXT)')
            with zipfile.ZipFile(archive) as zipped:
                info = zipped.getinfo('cities500.txt')
                if info.file_size > 150*1024*1024: raise RuntimeError('Place extract exceeds expected size')
                batch = []
                for row in csv.reader(io.TextIOWrapper(zipped.open(info), encoding='utf-8'), delimiter='\t'):
                    if len(row) < 19: continue
                    batch.append((int(row[0]),row[1],row[8],float(row[4]),float(row[5]),row[17],int(row[14] or 0),normalise(row[1])))
                    if len(batch) == 1000:
                        db.executemany('INSERT INTO places VALUES (?,?,?,?,?,?,?,?)',batch);batch=[]
                if batch: db.executemany('INSERT INTO places VALUES (?,?,?,?,?,?,?,?)',batch)
            db.execute('CREATE INDEX place_search ON places(search_key)')
            count = db.execute('SELECT count(*) FROM places').fetchone()[0]
            if count < 100000: raise RuntimeError('Place extract is unexpectedly incomplete')
            db.commit()
        os.replace(database,target)
        (target.parent/'GEONAMES_LICENSE.txt').write_text('GeoNames cities500, CC BY 4.0: https://www.geonames.org/\nSource: '+URL+'\nArchive SHA256: '+digest.hexdigest()+'\n')
        print(f'PASS installed {count} searchable towns/cities; GeoNames CC BY 4.0',flush=True)

if __name__ == '__main__': install()
