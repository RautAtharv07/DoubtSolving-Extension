import requests
from bs4 import BeautifulSoup

def scrape_text_from_url(url: str):
    """
    Scrapes a website, combines the title, heading, and main body content
    into a single text block, and returns it.
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()

        html_content = response.text
        soup = BeautifulSoup(html_content, 'lxml')

        # --- Part A: Extract the individual pieces as before ---
        title = soup.find('title').get_text(strip=True) if soup.find('title') else ""
        
        h1_tag = soup.find('h1')
        first_h1 = ""
        if h1_tag:
            permalink = h1_tag.find('a', class_='headerlink')
            if permalink:
                permalink.decompose()
            first_h1 = h1_tag.get_text(strip=True)

        for tag in soup(['nav', 'footer', 'header', 'script', 'style', 'aside']):
            tag.decompose()
        if soup.find('h1'):
            soup.find('h1').decompose()

        body_text = soup.find('body').get_text(separator=' ', strip=True) if soup.find('body') else ""
        
        # --- Part B: NEW LOGIC - Combine the pieces here ---
        # Create a list of the text parts we want to join.
        # This approach gracefully handles cases where a title or h1 might be missing.
        text_parts = [
            title,
            first_h1,
            # You can customize the separator or remove it
            "----------------------------------", 
            body_text
        ]
        
        # Join the parts into a single string. The `if part` ensures we don't add
        # extra newlines for empty strings (e.g., if a page has no h1).
        combined_text = "\n\n".join(part for part in text_parts if part)

        # --- Part C: Return the new, simplified dictionary ---
        return  combined_text  # This is our new primary output
        

    except requests.exceptions.RequestException as e:
        print(f"Error fetching URL {url}: {e}")
        return { "url": url, "error": str(e) }
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return { "url": url, "error": "An unexpected error occurred during scraping." }