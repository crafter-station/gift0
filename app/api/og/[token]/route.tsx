import { ImageResponse } from "@vercel/og"
import { getListByShareToken } from "@/app/actions/lists"

export const runtime = "nodejs"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  try {
    const list = await getListByShareToken(token)

    if (!list) {
      return new Response("List not found", { status: 404 })
    }

    const giftCount = list.gifts?.length || 0

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0a0a0a",
            backgroundImage: "linear-gradient(to bottom, #1a1a1a, #0a0a0a)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "80px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "72px",
                fontWeight: "bold",
                color: "#ffffff",
                marginBottom: "24px",
                lineHeight: "1.2",
              }}
            >
              {list.name}
            </div>
            <div
              style={{
                fontSize: "32px",
                color: "#a3a3a3",
                marginTop: "16px",
              }}
            >
              {giftCount} {giftCount === 1 ? "gift" : "gifts"}
            </div>
            <div
              style={{
                fontSize: "24px",
                color: "#737373",
                marginTop: "40px",
              }}
            >
              gift0 - Share wishlists with friends
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
        },
      }
    )
  } catch (error) {
    console.error("Error generating OG image:", error)
    
    // Fallback: redirect to static OG image
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
    const fallbackUrl = new URL("/og.png", baseUrl).toString()
    
    return Response.redirect(fallbackUrl, 302)
  }
}
