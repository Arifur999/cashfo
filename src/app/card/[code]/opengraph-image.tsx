import { ImageResponse } from "next/og";
import { getPublicProfileCard, latinName } from "@/lib/customer/profileCard";

export const alt = "A Smartly profile card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The picture Facebook, WhatsApp and the like show for a shared profile
// card's link: the cover, the photo and the invite. The picture's font has no
// Bangla, so a name written in Bangla is left out here (the page shows it).
// A card that isn't shared gets the plain Smartly picture.
export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const card = await getPublicProfileCard(code);
  const name = card ? latinName(card.name) : null;
  const background = "linear-gradient(135deg, #1C7567 0%, #3B9C8A 55%, #2563EB 100%)";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#F3F6F4", fontFamily: "sans-serif" }}>
        <div style={{ height: 300, width: "100%", display: "flex", position: "relative", background }}>
          {card?.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- ImageResponse draws plain img tags.
            <img src={card.coverUrl} alt="" width={1200} height={300} style={{ width: 1200, height: 300, objectFit: "cover" }} />
          )}
          <div style={{ position: "absolute", top: 28, right: 36, display: "flex", padding: "8px 20px", borderRadius: 999, background: "rgba(0,0,0,0.35)", color: "#FFFFFF", fontSize: 30, fontWeight: 700 }}>Smartly</div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 36, padding: "0 64px", marginTop: -90 }}>
          <div style={{ width: 180, height: 180, borderRadius: 999, border: "8px solid #FFFFFF", background: "#DCEDE9", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", color: "#155C51", fontSize: 72, fontWeight: 700 }}>
            {card?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- ImageResponse draws plain img tags.
              <img src={card.avatarUrl} alt="" width={180} height={180} style={{ width: 180, height: 180, objectFit: "cover" }} />
            ) : (
              (name ?? "S").charAt(0).toUpperCase()
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", paddingBottom: 12 }}>
            <div style={{ fontSize: 56, fontWeight: 700, color: "#12201D" }}>{name ?? "Join me on Smartly"}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "28px 64px 0" }}>
          <div style={{ fontSize: 34, color: "#33413E" }}>{name ? "keeps their money in order with Smartly." : "Money, savings and habits in one place."}</div>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: "#1C7567" }}>
            {card && card.friendDiscountPct > 0 ? `Join with my invite: ${card.friendDiscountPct}% off your first plan` : "Join with my invite, free to start"}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
