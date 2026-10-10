import os
import sys
import pandas as pd
import geopandas as gpd
from pypdf import PdfReader

DATA_DIR = r"d:\Projects\EWaste-mini\ewaste-datasets"

def inspect_all():
    print("="*80)
    print("INSPECTING DATASETS IN:", DATA_DIR)
    print("="*80)
    files = os.listdir(DATA_DIR)
    for f in sorted(files):
        fpath = os.path.join(DATA_DIR, f)
        size_kb = os.path.getsize(fpath) / 1024
        print(f"\n--- FILE: {f} ({size_kb:.2f} KB) ---")
        
        if f.endswith(".csv"):
            try:
                df = pd.read_csv(fpath)
                print(f"Shape: {df.shape}")
                print(f"Columns ({len(df.columns)}): {list(df.columns)}")
                print("Head preview:")
                print(df.head(3))
                print("Summary Info:")
                print(df.info())
            except Exception as e:
                print(f"Error reading CSV {f}: {e}")
                
        elif f.endswith(".xlsx"):
            try:
                xl = pd.ExcelFile(fpath)
                print(f"Sheet names: {xl.sheet_names}")
                for s in xl.sheet_names:
                    df = xl.parse(s)
                    print(f"  Sheet '{s}' - Shape: {df.shape}")
                    print(f"  Columns: {list(df.columns)[:15]}... ({len(df.columns)} total)")
                    print("  Preview:")
                    print(df.head(2))
            except Exception as e:
                print(f"Error reading Excel {f}: {e}")
                
        elif f.endswith(".geojson"):
            try:
                gdf = gpd.read_file(fpath)
                print(f"GeoDataFrame Shape: {gdf.shape}")
                print(f"CRS: {gdf.crs}")
                print(f"Columns: {list(gdf.columns)}")
                print(f"Geometry types: {gdf.geometry.geom_type.value_counts().to_dict()}")
                print("Attribute preview:")
                print(gdf.drop(columns='geometry').head(5))
            except Exception as e:
                print(f"Error reading GeoJSON {f}: {e}")
                
        elif f.endswith(".pdf"):
            try:
                reader = PdfReader(fpath)
                print(f"PDF Pages: {len(reader.pages)}")
                for i in range(min(3, len(reader.pages))):
                    txt = reader.pages[i].extract_text()
                    print(f"--- Page {i+1} text sample (first 400 chars): ---")
                    print(txt[:400].strip())
            except Exception as e:
                print(f"Error reading PDF {f}: {e}")
                
        elif f.endswith(".pbf"):
            print("OSM PBF file detected. Western zone OSM vector extract.")

if __name__ == "__main__":
    inspect_all()
