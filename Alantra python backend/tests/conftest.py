import pathlib
import sys

# Make the package importable without installing it.
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
