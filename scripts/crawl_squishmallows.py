#!/usr/bin/env python3
"""
Crawl Squishmallows Wiki and extract all Squishmallows with their images.
Outputs a JSON list with name and image URL.
"""

import argparse
import json
import re
import time
from typing import List, Dict, Optional
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup
from loguru import logger

BASE_URL = "https://squishmallowsquad.fandom.com"
API_URL = f"{BASE_URL}/api.php"
WIKI_BASE = f"{BASE_URL}/wiki"


def get_all_pages() -> List[str]:
    """Get all page titles from the wiki using MediaWiki API."""
    logger.info("Fetching all pages from the wiki...")
    pages = []
    continue_token = None
    
    while True:
        params = {
            "action": "query",
            "format": "json",
            "list": "allpages",
            "aplimit": "500",  # Max allowed
            "apnamespace": "0",  # Main namespace only
        }
        
        if continue_token:
            params["apcontinue"] = continue_token
        
        try:
            response = httpx.get(API_URL, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            if "query" in data and "allpages" in data["query"]:
                batch = [page["title"] for page in data["query"]["allpages"]]
                pages.extend(batch)
                logger.info(f"Fetched {len(batch)} pages (total: {len(pages)})")
            
            # Check for continuation
            if "continue" in data and "apcontinue" in data["continue"]:
                continue_token = data["continue"]["apcontinue"]
            else:
                break
                
        except Exception as e:
            logger.error(f"Error fetching pages: {e}")
            break
    
    logger.success(f"Total pages fetched: {len(pages)}")
    return pages


def extract_text_from_element(element) -> Optional[str]:
    """Extract text from an element, cleaning it up."""
    if element is None:
        return None
    text = element.get_text(strip=True)
    return text if text else None


def get_page_data(page_title: str) -> Optional[Dict[str, any]]:
    """Get all data (image and metadata) from a page."""
    try:
        # Get page HTML
        page_url = f"{WIKI_BASE}/{page_title.replace(' ', '_')}"
        response = httpx.get(page_url, timeout=30)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, "html.parser")
        
        data = {
            "name": page_title,
            "image_url": None,
            "type": None,
            "color": None,
            "size": None,
            "collector_number": None,
            "squishdate": None,
            "year": None,
            "bio": None,
            "appearance": None,
        }
        
        # Extract image
        image = None
        
        # Pattern 1: Look for figure with image (most common pattern)
        figure = soup.find("figure")
        if figure:
            img_tag = figure.find("img")
            if img_tag and img_tag.get("src"):
                image = img_tag["src"]
                # Convert to full URL if relative
                if image.startswith("//"):
                    image = "https:" + image
                elif image.startswith("/"):
                    image = BASE_URL + image
                # Clean up the URL
                if "revision/latest" in image:
                    image = image.split("?")[0] if "?" in image else image
        
        # Pattern 2: Look for img with "official" in alt or src
        if not image:
            for img in soup.find_all("img"):
                alt = img.get("alt", "").lower()
                src = img.get("src", "")
                if src and ("official" in alt or "official" in src.lower()):
                    image = src
                    if image.startswith("//"):
                        image = "https:" + image
                    elif image.startswith("/"):
                        image = BASE_URL + image
                    if "revision/latest" in image:
                        image = image.split("?")[0] if "?" in image else image
                    break
        
        # Pattern 3: Look for the first large image in the content area
        if not image:
            main_content = soup.find("main") or soup.find("div", class_=re.compile("content|article"))
            if main_content:
                for img in main_content.find_all("img"):
                    src = img.get("src", "")
                    if src and ("static.wikia.nocookie.net" in src or "wikia.nocookie.net" in src):
                        width = img.get("width", "")
                        height = img.get("height", "")
                        if width and height:
                            try:
                                w, h = int(width), int(height)
                                if w > 100 and h > 100:
                                    image = src
                                    if image.startswith("//"):
                                        image = "https:" + image
                                    elif image.startswith("/"):
                                        image = BASE_URL + image
                                    if "revision/latest" in image:
                                        image = image.split("?")[0] if "?" in image else image
                                    break
                            except ValueError:
                                pass
                        else:
                            image = src
                            if image.startswith("//"):
                                image = "https:" + image
                            elif image.startswith("/"):
                                image = BASE_URL + image
                            if "revision/latest" in image:
                                image = image.split("?")[0] if "?" in image else image
                            break
        
        data["image_url"] = image
        
        # Extract metadata from the page structure
        main_content = soup.find("main") or soup.find("div", class_=re.compile("content|article"))
        if main_content:
            # Look for the region/infobox container first (where most metadata is)
            region = main_content.find("region") or main_content.find("aside") or main_content.find("div", class_=re.compile("infobox|sidebar"))
            
            # If we found a region, search within it; otherwise search in main_content
            search_area = region if region else main_content
            
            def normalize_heading(heading):
                headline_span = heading.find("span", class_=re.compile("mw-headline", re.IGNORECASE))
                heading_text = (
                    headline_span.get_text(strip=True) if headline_span else heading.get_text(separator=" ", strip=True)
                )
                heading_text = heading_text.lower()
                heading_text = heading_text.split("sign in to edit")[0]
                heading_text = heading_text.replace("[edit]", "").strip()
                heading_text = heading_text.rstrip(":").strip()
                return heading_text

            def extract_bio(heading):
                blockquote = heading.find_next("blockquote")
                if blockquote:
                    text = extract_text_from_element(blockquote)
                    if text:
                        return text
                para = heading.find_next("p")
                if para:
                    text = extract_text_from_element(para)
                    if text:
                        return text
                return None

            def extract_appearance(heading):
                para = heading.find_next("p")
                if para:
                    text = extract_text_from_element(para)
                    if text:
                        return text
                return None

            # Look for headings and their following content
            headings = search_area.find_all(["h2", "h3"])
            
            for heading in headings:
                heading_text = normalize_heading(heading)
                
                # Find the parent container of the heading, then look for content within it
                parent = heading.parent
                if not parent:
                    continue
                
                # Type
                if "type" in heading_text and not data["type"]:
                    # Look for link after the heading
                    link = heading.find_next("a")
                    if link:
                        data["type"] = link.get_text(strip=True)
                    else:
                        # Look in the parent's next sibling or within parent
                        next_elem = parent.find_next_sibling()
                        if next_elem:
                            link = next_elem.find("a")
                            if link:
                                data["type"] = link.get_text(strip=True)
                            else:
                                text = extract_text_from_element(next_elem)
                                if text:
                                    data["type"] = text
                
                # Color
                if "color" in heading_text and not data["color"]:
                    colors = []
                    # Look for all links in the parent container
                    parent_container = heading.parent
                    links = parent_container.find_all("a")
                    for link in links:
                        color_text = link.get_text(strip=True)
                        if color_text and color_text not in colors:
                            colors.append(color_text)
                    if colors:
                        data["color"] = ", ".join(colors)
                
                # Size(s)
                if "size" in heading_text and not data["size"]:
                    sizes = []
                    # Look for all links in the parent container
                    parent_container = heading.parent
                    links = parent_container.find_all("a")
                    for link in links:
                        size_text = link.get_text(strip=True)
                        if size_text and size_text not in sizes:
                            sizes.append(size_text)
                    if sizes:
                        data["size"] = ", ".join(sizes)
                
                # Collector Number
                if ("collector number" in heading_text or 
                    ("collector" in heading_text and "number" in heading_text)) and not data["collector_number"]:
                    # Look in the parent container
                    parent_container = heading.parent
                    text = extract_text_from_element(parent_container)
                    if text:
                        # Remove the heading text and quotes
                        text = text.replace(heading.get_text(strip=True), "").strip()
                        text = text.strip('"\'')
                        if text:
                            data["collector_number"] = text
                
                # Squishdate
                if "squishdate" in heading_text and not data["squishdate"]:
                    parent_container = heading.parent
                    text = extract_text_from_element(parent_container)
                    if text:
                        # Remove the heading text
                        text = text.replace(heading.get_text(strip=True), "").strip()
                        if text:
                            data["squishdate"] = text
                
                # Year
                if heading_text == "year" and not data["year"]:
                    parent_container = heading.parent
                    text = extract_text_from_element(parent_container)
                    if text:
                        # Remove the heading text and quotes
                        text = text.replace(heading.get_text(strip=True), "").strip()
                        text = text.strip('"\'')
                        if text:
                            data["year"] = text
                
                # Bio
                if heading_text == "bio" and not data["bio"]:
                    text = extract_bio(heading)
                    if text:
                        data["bio"] = text
                
                # Appearance
                if heading_text == "appearance" and not data["appearance"]:
                    text = extract_appearance(heading)
                    if text:
                        data["appearance"] = text

            if not data["bio"] or not data["appearance"]:
                for heading in main_content.find_all(["h2", "h3"]):
                    heading_text = normalize_heading(heading)
                    if heading_text == "bio" and not data["bio"]:
                        text = extract_bio(heading)
                        if text:
                            data["bio"] = text
                    if heading_text == "appearance" and not data["appearance"]:
                        text = extract_appearance(heading)
                        if text:
                            data["appearance"] = text
                    if data["bio"] and data["appearance"]:
                        break
        
        # Only return data if we have at least an image or some metadata
        if data["image_url"] or any(data.get(k) for k in ["type", "color", "size", "collector_number", "squishdate", "year", "bio", "appearance"]):
            return data
        
        return None
        
    except Exception as e:
        logger.debug(f"Error getting data for {page_title}: {e}")
        return None


def is_character_page(page_title: str) -> bool:
    """Check if a page is likely a character page."""
    # Filter out non-character pages
    exclude_patterns = [
        "Category:",
        "Template:",
        "File:",
        "Help:",
        "Special:",
        "User:",
        "Squad",
        "Squishdate",
        "inch",
        "Clip-on",
        "Stackable",
        "Hug Mees",
        "Mystery Squad",
        "Flip-A-Mallows",
        "Squish-a-longs",
    ]
    
    title_lower = page_title.lower()
    for pattern in exclude_patterns:
        if pattern.lower() in title_lower:
            return False
    
    # Exclude pages that are clearly not characters
    if any(word in title_lower for word in ["squad", "collection", "category", "template"]):
        return False
    
    return True


def write_results_to_file(results: List[Dict[str, any]], output_file: str):
    """Write results to JSON file."""
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)


def load_existing_results(output_file: str) -> List[Dict[str, any]]:
    """Load existing results from JSON file if it exists."""
    try:
        with open(output_file, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return []


def crawl_squishmallows(limit: Optional[int] = None, output_file: str = "squishmallows.json", batch_size: int = 20, update_existing: bool = True) -> List[Dict[str, any]]:
    """Crawl all Squishmallows and extract their images.
    
    Args:
        limit: Optional limit on number of pages to process (for testing)
        output_file: Path to output JSON file
        batch_size: Number of entries to accumulate before writing to file
    """
    logger.info("Starting Squishmallows crawl...")
    
    # Load existing results if file exists (for resume capability)
    results = load_existing_results(output_file)
    existing_names = {r["name"] for r in results}
    logger.info(f"Loaded {len(results)} existing entries from {output_file}")
    
    # Get all pages
    all_pages = get_all_pages()
    
    # Filter to likely character pages
    character_pages = [p for p in all_pages if is_character_page(p)]
    logger.info(f"Filtered to {len(character_pages)} potential character pages")
    
    # Check which existing entries need updating (missing metadata)
    entries_to_update = []
    if update_existing and results:
        for entry in results:
            # Check if entry is missing most metadata fields
            has_metadata = any(entry.get(k) for k in ["type", "color", "size", "collector_number", "squishdate", "year", "bio", "appearance"])
            if not has_metadata:
                entries_to_update.append(entry["name"])
    
    # Skip pages we've already processed (unless they need updating)
    if update_existing:
        character_pages = [p for p in character_pages if p not in existing_names or p in entries_to_update]
        if entries_to_update:
            logger.info(f"Found {len(entries_to_update)} existing entries missing metadata - will update them")
    else:
        character_pages = [p for p in character_pages if p not in existing_names]
    logger.info(f"After filtering existing entries: {len(character_pages)} pages to process")
    
    # Apply limit if specified
    if limit:
        character_pages = character_pages[:limit]
        logger.info(f"Limited to first {limit} pages for testing")
    
    # Extract images for each character
    total = len(character_pages)
    new_entries = 0
    
    for i, page_title in enumerate(character_pages, 1):
        logger.info(f"Processing {i}/{total}: {page_title}")
        
        page_data = get_page_data(page_title)
        
        if page_data:
            # Check if this is an update to an existing entry
            existing_idx = None
            for idx, entry in enumerate(results):
                if entry.get("name") == page_title:
                    existing_idx = idx
                    break
            
            if existing_idx is not None:
                # Update existing entry with new data (merge, keeping existing image_url if new one is None)
                if not page_data.get("image_url") and results[existing_idx].get("image_url"):
                    page_data["image_url"] = results[existing_idx]["image_url"]
                results[existing_idx] = page_data
                logger.info(f"🔄 Updated existing entry: {page_title}")
            else:
                # Add new entry
                results.append(page_data)
                new_entries += 1
            
            # Log what we found
            found_items = [k for k, v in page_data.items() if v and k != "name"]
            logger.success(f"✓ {page_title}: Found {len(found_items)} fields ({', '.join(found_items)})")
        else:
            logger.warning(f"✗ {page_title}: No data found")
        
        # Write to file every batch_size entries
        if new_entries > 0 and new_entries % batch_size == 0:
            write_results_to_file(results, output_file)
            logger.info(f"💾 Saved {len(results)} entries to {output_file} (batch checkpoint)")
        
        # Be respectful with rate limiting
        time.sleep(0.5)  # 500ms delay between requests
    
    # Write final results
    write_results_to_file(results, output_file)
    logger.success(f"Crawl complete! Found {len(results)} total Squishmallows with images ({new_entries} new entries)")
    return results


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Crawl Squishmallows Wiki and extract all Squishmallows with their images"
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limit number of pages to process (for testing)",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="squishmallows.json",
        help="Output JSON file path (default: squishmallows.json)",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=20,
        help="Number of entries to accumulate before writing to file (default: 20)",
    )
    parser.add_argument(
        "--no-update-existing",
        action="store_true",
        help="Don't update existing entries that are missing metadata",
    )
    
    args = parser.parse_args()
    
    results = crawl_squishmallows(
        limit=args.limit,
        output_file=args.output,
        batch_size=args.batch_size,
        update_existing=not args.no_update_existing
    )
    
    logger.success(f"Final results saved to {args.output}")
    logger.info(f"Total Squishmallows: {len(results)}")


if __name__ == "__main__":
    main()
