#!/usr/bin/env python3
"""
Scraper for cricketxi.com T20 World Cup 2026 player points
"""
import time
import json
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

def scrape_players():
    """Scrape all players and their points from cricketxi.com"""

    # Setup Chrome options
    options = Options()
    options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--window-size=1920,1080')
    options.add_argument('user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')

    print("Starting Chrome...")
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)

    try:
        print("Loading page...")
        driver.get('https://cricketxi.com/t20-world-cup-2026/players/')

        # Wait for table to load
        WebDriverWait(driver, 20).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, 'table tbody tr'))
        )
        time.sleep(3)

        # Reset the position filter to show ALL players
        print("Resetting filters...")
        selects = driver.find_elements(By.TAG_NAME, 'select')
        print(f"Found {len(selects)} select elements")

        for i, select in enumerate(selects):
            try:
                sel = Select(select)
                options_list = sel.options
                print(f"Select {i}: {len(options_list)} options, current: '{sel.first_selected_option.text}'")

                # Select first option (should be "All" or blank)
                if len(options_list) > 0:
                    sel.select_by_index(0)
                    print(f"  -> Selected: '{options_list[0].text}'")
                    time.sleep(2)
            except Exception as e:
                print(f"  Error with select {i}: {e}")

        time.sleep(3)

        # Check current row count
        rows = driver.find_elements(By.CSS_SELECTOR, 'table tbody tr')
        print(f"After filter reset: {len(rows)} rows")

        # Click "Show More Players" until no more
        print("Loading all players...")
        click_count = 0
        prev_count = 0

        while click_count < 50:
            try:
                # Scroll to bottom of page first
                driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                time.sleep(1)

                # Find "Show More Players" button by various methods
                show_more = None

                # Method 1: XPath with text
                try:
                    show_more = driver.find_element(By.XPATH, "//*[contains(text(), 'Show More')]")
                except:
                    pass

                # Method 2: Search all clickable elements
                if not show_more:
                    for tag in ['button', 'a', 'div', 'span']:
                        elements = driver.find_elements(By.TAG_NAME, tag)
                        for el in elements:
                            try:
                                text = el.text.lower()
                                if 'show more' in text or 'load more' in text:
                                    show_more = el
                                    break
                            except:
                                pass
                        if show_more:
                            break

                if show_more:
                    # Get current row count
                    rows_before = len(driver.find_elements(By.CSS_SELECTOR, 'table tbody tr'))

                    # Scroll element into view and click using JavaScript
                    driver.execute_script("""
                        arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});
                    """, show_more)
                    time.sleep(0.5)

                    # Try multiple click methods
                    try:
                        show_more.click()
                    except:
                        driver.execute_script("arguments[0].click();", show_more)

                    click_count += 1
                    time.sleep(2)  # Wait longer for data to load

                    # Check new row count
                    rows = driver.find_elements(By.CSS_SELECTOR, 'table tbody tr')
                    print(f"Click {click_count}: {len(rows)} rows (was {rows_before})")

                    if len(rows) == prev_count and click_count > 2:
                        # No new rows loaded for 2+ clicks
                        print("No more data loading, stopping")
                        break
                    prev_count = len(rows)
                else:
                    print("No 'Show More' button found")
                    break

            except Exception as e:
                print(f"Click error: {e}")
                break

        print(f"Finished loading after {click_count} clicks")

        # Now extract all player data
        print("\nExtracting player data...")
        players = {}

        # Get column headers to find Points column
        headers = driver.find_elements(By.CSS_SELECTOR, 'table thead th')
        header_texts = [h.text.lower() for h in headers]
        print(f"Headers: {header_texts}")

        # Find points column index
        points_idx = -1
        for i, h in enumerate(header_texts):
            if 'points' in h or h == 'pts':
                points_idx = i
                break

        if points_idx == -1:
            # Default to column 7 based on screenshot
            points_idx = 7
        print(f"Points column index: {points_idx}")

        # Extract data from rows
        rows = driver.find_elements(By.CSS_SELECTOR, 'table tbody tr')
        print(f"Total rows to process: {len(rows)}")

        for row in rows:
            try:
                cells = row.find_elements(By.TAG_NAME, 'td')
                if len(cells) > points_idx:
                    # Get player name from first cell
                    name_cell = cells[0]
                    name = name_cell.text.strip()

                    # Get points
                    points_text = cells[points_idx].text.strip()
                    try:
                        points = float(points_text)
                        if name and name != 'Loading...':
                            players[name] = points
                    except ValueError:
                        pass
            except Exception as e:
                pass

        print(f"\nTotal players extracted: {len(players)}")

        # Save screenshot for debugging
        driver.save_screenshot('debug-screenshot.png')
        print("Screenshot saved to debug-screenshot.png")

        return players

    finally:
        driver.quit()

def main():
    players = scrape_players()

    # Save to JSON
    with open('player-points.json', 'w') as f:
        json.dump(players, f, indent=2)
    print(f"\nSaved {len(players)} players to player-points.json")

    # Print some samples
    print("\nSample players:")
    sorted_players = sorted(players.items(), key=lambda x: x[1], reverse=True)[:15]
    for name, pts in sorted_players:
        print(f"  {name}: {pts}")

    # Check for key players
    print("\nKey players check:")
    key_players = ['Travis Head', 'Hardik Pandya', 'Abhishek Sharma', 'Ishan Kishan', 'Jos Buttler']
    for p in key_players:
        print(f"  {p}: {players.get(p, 'NOT FOUND')}")

if __name__ == '__main__':
    main()
