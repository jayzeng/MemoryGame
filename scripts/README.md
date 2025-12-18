# crawl_squishmallows Instructions

This script crawls the Squishmallows wiki and exports every character it can find along with the image URL and available metadata.

## Prerequisites

- Python 3.10+ (the script already uses type hints and `httpx` features available in recent releases)
- [`uv`](https://github.com/pdm-project/uv) for dependency management and reproducible installs

## Setup with `uv`

1. Install `uv` if you don't already have it; the simplest way is:

   ```bash
   pip install uv
   ```

2. Initialize `uv` in this directory (if you haven’t already):

   ```bash
   uv init
   ```

3. Add the runtime dependencies the crawler needs:

   ```bash
   uv add httpx beautifulsoup4 loguru
   ```

   This installs the packages into `uv`’s virtual environment and stores them in `uv.lock`.

4. Re-run `uv install` any time `pyproject.toml` or `uv.lock` changes.

## Running the crawler

- Run with the default arguments (outputs `squishmallows.json`):

  ```bash
  uv run python crawl_squishmallows.py
  ```

- Pass CLI arguments to customize the crawl:

  | Option | Description |
  | --- | --- |
  | `--limit <n>` | Only process the first `n` pages (useful for testing). |
  | `--output <path>` | Write results to a different JSON file. |
  | `--batch-size <n>` | Save results every `n` new entries. |
  | `--no-update-existing` | Skip re-visiting already saved characters. |

- Example with a test limit and a custom output file:

  ```bash
  uv run python crawl_squishmallows.py --limit 50 --output test-squishies.json
  ```

Running with `uv run` ensures the script executes inside the managed environment so it uses the pinned dependencies.

