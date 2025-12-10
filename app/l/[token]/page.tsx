import { getListByShareToken } from "@/app/actions/lists";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function SharedListPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const list = await getListByShareToken(token);

  if (!list) {
    notFound();
  }

  return (
    <main className="min-h-screen p-3 sm:p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-3 sm:mb-4">
          <h1 className="text-xl sm:text-2xl font-semibold mb-1">{list.name}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {list.gifts?.length || 0} {list.gifts?.length === 1 ? "gift" : "gifts"}
          </p>
        </div>

        {list.gifts && list.gifts.length > 0 ? (
          <div className="space-y-0.5">
            {list.gifts.map((gift) => (
              <div
                key={gift.id}
                className="bg-card border border-border rounded-md p-2.5 sm:p-3 hover:bg-accent transition-colors touch-manipulation"
              >
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <h3 className="text-xs sm:text-sm font-medium text-balance leading-tight">{gift.name}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      {gift.price && (
                        <span className="text-xs text-muted-foreground">{gift.price}</span>
                      )}
                      <span
                        className={`text-xs font-mono px-1.5 py-0.5 border rounded ${
                          gift.priority === "high"
                            ? "border-foreground text-foreground"
                            : gift.priority === "medium"
                              ? "border-muted-foreground text-muted-foreground"
                              : "border-border text-muted-foreground"
                        }`}
                      >
                        {gift.priority}
                      </span>
                    </div>
                  </div>
                  <a
                    href={gift.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1 sm:gap-1.5 rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 sm:h-7 px-2 sm:px-2 shrink-0 touch-manipulation"
                  >
                    <ExternalLink className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                    <span className="hidden sm:inline">View</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-border rounded-md p-6 sm:p-8 text-center">
            <p className="text-xs sm:text-sm text-muted-foreground">No gifts on this list yet.</p>
          </div>
        )}
      </div>
    </main>
  );
}

