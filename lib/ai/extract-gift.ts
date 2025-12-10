import { generateObject } from "ai";
import { z } from "zod";

const GIFT_SCHEMA = z.object({
  name: z.string().describe("Product name extracted from the URL"),
  price: z.string().optional().describe("Product price if available (format: $XX.XX or XX.XX)"),
  priority: z.enum(["high", "medium", "low"]).describe("Priority level based on price and context"),
  listName: z.string().describe("A short, descriptive name for the gift list (e.g., 'Birthday 2025', 'Holiday Wishlist', 'Tech Gifts')"),
});

const SYSTEM_PROMPT = `You are a helpful assistant that extracts product information from web page content and suggests appropriate gift list names.

Rules:
- Extract the product name accurately from the page content
- If price is mentioned, extract it in format like "$99.99" or "99.99"
- Determine priority: "high" for expensive items ($200+), "medium" for mid-range ($50-200), "low" for affordable (<$50)
- Suggest a concise, meaningful list name (2-4 words) that fits the product category
- List names should be shareable and clear (e.g., "Birthday 2025", "Tech Wishlist", "Holiday Gifts")`;

async function fetchUrlContent(url: string): Promise<string> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY is not set");

  const response = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      onlyMainContent: false,
      maxAge: 172800000,
      parsers: ["pdf"],
      formats: ["markdown"],
    }),
  });

  if (!response.ok) throw new Error(`Firecrawl API error: ${response.statusText}`);

  const data = await response.json();
  return data.data?.markdown || data.data?.content || (() => { throw new Error("No content found"); })();
}

export async function extractGiftFromUrl(url: string) {
  const pageContent = await fetchUrlContent(url).catch(
    (error) => { throw new Error(`Failed to fetch URL content: ${error instanceof Error ? error.message : "Unknown error"}`); }
  );

  const result = await generateObject({
    model: "openai/gpt-4o-mini",
    schema: GIFT_SCHEMA,
    system: SYSTEM_PROMPT,
    prompt: `Extract product information from this web page content:\n\nURL: ${url}\n\nPage Content:\n${pageContent}`,
    temperature: 0.3,
  });

  return {
    name: result.object.name,
    url,
    price: result.object.price,
    priority: result.object.priority,
    listName: result.object.listName,
  };
}

