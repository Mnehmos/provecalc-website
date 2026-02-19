"""CLI entry point for headless ProveCalc operations.

Usage:
    python -m provecalc run script.py
    python -m provecalc serve
    python -m provecalc export input.worksheet --format csv -o output.csv
    python -m provecalc info input.worksheet
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

logger = logging.getLogger(__name__)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="provecalc",
        description="ProveCalc headless automation CLI",
    )
    parser.add_argument("-v", "--verbose", action="store_true", help="Enable debug logging")
    sub = parser.add_subparsers(dest="command", required=True)

    # --- run ---
    run_parser = sub.add_parser("run", help="Execute a Python script with provecalc imported")
    run_parser.add_argument("script", type=str, help="Path to Python script")
    run_parser.add_argument("args", nargs="*", help="Arguments passed to the script")

    # --- serve ---
    sub.add_parser("serve", help="Start the compute sidecar server")

    # --- export ---
    export_parser = sub.add_parser("export", help="Export a worksheet to CSV or JSON")
    export_parser.add_argument("input", type=str, help="Input .worksheet file")
    export_parser.add_argument("-f", "--format", choices=["csv", "json"], default="csv", help="Output format")
    export_parser.add_argument("-o", "--output", type=str, help="Output file path")

    # --- info ---
    info_parser = sub.add_parser("info", help="Display worksheet summary")
    info_parser.add_argument("input", type=str, help="Input .worksheet file")

    args = parser.parse_args(argv)

    level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(level=level, format="%(levelname)s: %(message)s")

    if args.command == "run":
        return _cmd_run(args)
    elif args.command == "serve":
        return _cmd_serve()
    elif args.command == "export":
        return _cmd_export(args)
    elif args.command == "info":
        return _cmd_info(args)

    return 1


def _cmd_run(args: argparse.Namespace) -> int:
    """Execute a user script with provecalc available."""
    script_path = Path(args.script)
    if not script_path.exists():
        logger.error("Script not found: %s", script_path)
        return 1

    import importlib.util

    # Save originals for restoration
    orig_argv = sys.argv[:]
    orig_path = sys.path[:]

    # Inject script args and make script dir importable
    sys.argv = [str(script_path)] + (args.args or [])
    sys.path.insert(0, str(script_path.parent))

    spec = importlib.util.spec_from_file_location("__main__", script_path)
    if spec is None or spec.loader is None:
        logger.error("Cannot load script: %s", script_path)
        sys.argv = orig_argv
        sys.path = orig_path
        return 1

    module = importlib.util.module_from_spec(spec)
    module.__name__ = "__main__"
    try:
        spec.loader.exec_module(module)
    except SystemExit as e:
        return e.code if isinstance(e.code, int) else 0
    except Exception as e:
        logger.error("Error in script: %s", e)
        return 1
    finally:
        sys.argv = orig_argv
        sys.path = orig_path

    return 0


def _cmd_serve() -> int:
    """Start the compute sidecar."""
    import uvicorn
    sidecar_dir = Path(__file__).resolve().parent.parent.parent
    sys.path.insert(0, str(sidecar_dir))
    uvicorn.run("src.main:app", host="127.0.0.1", port=9743, reload=False)
    return 0


def _cmd_export(args: argparse.Namespace) -> int:
    """Export a worksheet."""
    from .worksheet import Worksheet

    input_path = Path(args.input)
    if not input_path.exists():
        logger.error("File not found: %s", input_path)
        return 1

    ws = Worksheet.load(input_path, auto_start=False)

    fmt = args.format
    if args.output:
        output_path = Path(args.output)
    else:
        output_path = input_path.with_suffix(f".{fmt}")

    if fmt == "csv":
        ws.export_csv(output_path)
    else:
        ws.export_json(output_path)

    logger.info("Exported to %s", output_path)
    return 0


def _cmd_info(args: argparse.Namespace) -> int:
    """Display worksheet summary."""
    from .worksheet import Worksheet
    from .models import GivenNode, EquationNode, ResultNode

    input_path = Path(args.input)
    if not input_path.exists():
        logger.error("File not found: %s", input_path)
        return 1

    ws = Worksheet.load(input_path, auto_start=False)
    doc = ws.document

    logger.info("Worksheet: %s", doc.name)
    logger.info("  ID: %s", doc.id)
    logger.info("  Version: %s", doc.version)
    logger.info("  Created: %s", doc.created_at)
    logger.info("  Updated: %s", doc.updated_at)
    logger.info("  Nodes: %s", len(doc.nodes))
    logger.info("  Assumptions: %s", len(doc.assumptions))

    givens = [n for n in doc.nodes if isinstance(n, GivenNode)]
    equations = [n for n in doc.nodes if isinstance(n, EquationNode)]
    results = [n for n in doc.nodes if isinstance(n, ResultNode)]

    if givens:
        logger.info("Givens:")
        for g in givens:
            unit_str = f" {g.value.unit.expression}" if g.value.unit else ""
            logger.info("  %s = %s%s", g.symbol, g.value.value, unit_str)

    if equations:
        logger.info("Equations:")
        for eq in equations:
            logger.info("  %s = %s", eq.lhs, eq.rhs)

    if results:
        logger.info("Results:")
        for r in results:
            unit_str = f" {r.value.unit.expression}" if r.value.unit else ""
            logger.info("  %s = %s%s", r.symbol, r.value.value, unit_str)

    return 0


if __name__ == "__main__":
    sys.exit(main())
