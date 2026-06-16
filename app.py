import re
import time
import requests
from flask import Flask, jsonify, render_template, request
from bs4 import BeautifulSoup

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache for parsed release notes
# Structure: { "data": [...], "fetched_at": timestamp }
cache = {"data": None, "fetched_at": 0}
CACHE_DURATION_SECS = 3600  # 1 hour

def parse_release_notes():
    """Fetches the XML feed and parses it into individual release updates."""
    try:
        response = requests.get(FEED_URL, timeout=15)
        response.raise_for_status()
    except Exception as e:
        print(f"Error fetching feed: {e}")
        return None

    try:
        soup = BeautifulSoup(response.content, "xml")
        entries = soup.find_all("entry")
        updates = []

        for entry_idx, entry in enumerate(entries):
            title = entry.find("title").text if entry.find("title") else "Unknown Date"
            updated = entry.find("updated").text if entry.find("updated") else ""
            link_node = entry.find("link")
            link = link_node["href"] if link_node and "href" in link_node.attrs else ""
            
            content_node = entry.find("content")
            content_html = content_node.text if content_node else ""
            
            if not content_html:
                continue

            content_soup = BeautifulSoup(content_html, "html.parser")
            
            current_header = None
            current_blocks = []
            
            # Helper function to flush the accumulated blocks into a single update
            def add_update(header, blocks, update_count):
                if not header or not blocks:
                    return
                # Reconstruct HTML and extract clean text
                html_str = "".join(str(b) for b in blocks)
                # Parse block texts
                text_str = " ".join(b.get_text().strip() for b in blocks)
                # Clean up multiple whitespaces
                text_str = re.sub(r'\s+', ' ', text_str).strip()
                
                # Create a unique ID for the update
                update_id = f"bq-{updated.split('T')[0] if updated else 'unknown'}-{header.lower()}-{update_count}"
                
                updates.append({
                    "id": update_id,
                    "date": title,
                    "timestamp": updated,
                    "link": link,
                    "type": header,
                    "content_html": html_str,
                    "content_text": text_str
                })

            update_count = 0
            for element in content_soup.contents:
                # We check for h3 and h4 headers
                if element.name in ["h3", "h4"]:
                    if current_header:
                        add_update(current_header, current_blocks, update_count)
                        update_count += 1
                    current_header = element.text.strip()
                    current_blocks = []
                elif current_header is not None:
                    # Filter out empty strings or comments that are outside tag elements
                    if element.name or (isinstance(element, str) and element.strip()):
                        current_blocks.append(element)

            # Flush the last section
            if current_header:
                add_update(current_header, current_blocks, update_count)

        return updates
    except Exception as e:
        print(f"Error parsing feed: {e}")
        return None

def get_release_notes(force_refresh=False):
    """Retrieves release notes from cache or fetches them if expired/forced."""
    current_time = time.time()
    
    if force_refresh or not cache["data"] or (current_time - cache["fetched_at"] > CACHE_DURATION_SECS):
        print("Fetching fresh release notes...")
        fresh_data = parse_release_notes()
        if fresh_data is not None:
            cache["data"] = fresh_data
            cache["fetched_at"] = current_time
        elif not cache["data"]:
            # Fallback if fetch failed and cache is empty
            cache["data"] = []
            
    return cache["data"]

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/release-notes")
def api_release_notes():
    force_refresh = request.args.get("refresh", "false").lower() == "true"
    notes = get_release_notes(force_refresh=force_refresh)
    return jsonify({
        "success": notes is not None,
        "notes": notes,
        "last_fetched": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(cache["fetched_at"]))
    })

if __name__ == "__main__":
    app.run(debug=True, port=5001)
