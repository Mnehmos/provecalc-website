"""Allow running as: python -m provecalc"""

import sys
from .cli import main

sys.exit(main())
