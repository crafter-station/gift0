import { Metadata } from "next"
import { getListByShareToken } from "@/app/actions/lists"
import SharedListContent from "./shared-list-content"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const list = await getListByShareToken(token)

  if (!list) {
    return {
      title: "List not found - gift0",
    }
  }

  const giftCount = list.gifts?.length || 0
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  const ogImageUrl = new URL(`/api/og/${token}`, baseUrl).toString()
  const fallbackOgImage = new URL("/og.png", baseUrl).toString()

  return {
    title: `${list.name} - gift0`,
    description: `View ${giftCount} ${giftCount === 1 ? "gift" : "gifts"} on ${list.name}`,
    openGraph: {
      title: `${list.name} - gift0`,
      description: `${giftCount} ${giftCount === 1 ? "gift" : "gifts"}`,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: list.name,
        },
        {
          url: fallbackOgImage,
          width: 1200,
          height: 630,
          alt: "gift0 - Share Wishlists with Friends",
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${list.name} - gift0`,
      description: `${giftCount} ${giftCount === 1 ? "gift" : "gifts"}`,
      images: [ogImageUrl, fallbackOgImage],
    },
  }
}

export default async function SharedListPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return <SharedListContent token={token} />
}
