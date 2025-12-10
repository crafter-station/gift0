import { extractGiftFromUrl } from "@/lib/ai/extract-gift";

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return Response.json({ error: "URL is required" }, { status: 400 });
    }

    const extracted = await extractGiftFromUrl(url);

    return Response.json(extracted);
  } catch (error) {
    console.error("Error extracting gift:", error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Failed to extract gift information",
      },
      { status: 500 }
    );
  }
}

