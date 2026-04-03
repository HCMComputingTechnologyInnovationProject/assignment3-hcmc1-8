from pathlib import Path
import sys


TRAINING_DIR = Path(__file__).resolve().parent / "code" / "training"
if str(TRAINING_DIR) not in sys.path:
    sys.path.insert(0, str(TRAINING_DIR))

from training_pipeline import main


if __name__ == "__main__":
    main()
