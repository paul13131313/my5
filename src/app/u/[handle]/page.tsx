import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Favorite } from "@/lib/types";
import type { Metadata } from "next";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, handle")
    .eq("handle", handle)
    .single();

  if (!profile) return { title: "Not Found — MY5" };
  return {
    title: `${profile.display_name || profile.handle} — MY5`,
    description: `${profile.display_name || profile.handle}のMy 5をチェック`,
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { handle } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("handle", handle)
    .single();

  if (!profile) notFound();

  // Non-public profile
  if (!profile.is_public) {
    return (
      <div className="page-wrap">
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <a href="/" className="topbar-logo" style={{ textDecoration: "none" }}>
            MY5
          </a>
        </div>
        <div className="private-notice">
          <div className="private-icon">🔒</div>
          <p className="private-text">このプロフィールは非公開です</p>
        </div>
      </div>
    );
  }

  const { data: favs } = await supabase
    .from("favorites")
    .select("*")
    .eq("user_id", profile.id)
    .order("slot");

  const favorites: (Favorite | null)[] = [null, null, null, null, null];
  (favs as Favorite[] | null)?.forEach((f) => {
    favorites[f.slot - 1] = f;
  });

  const filledFavs = favorites.filter(Boolean) as Favorite[];

  return (
    <div className="page-wrap">
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <a href="/" className="topbar-logo" style={{ textDecoration: "none" }}>
          MY5
        </a>
      </div>

      <div className="profile-header">
        <div className="profile-name">
          {profile.display_name || profile.handle}
        </div>
        <div className="profile-handle">@{profile.handle}</div>
        {profile.bio && <div className="profile-bio">{profile.bio}</div>}
      </div>

      {filledFavs.length === 0 ? (
        <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
          まだお気に入りが登録されていません
        </div>
      ) : (
        <div className="card">
          {[1, 2, 3, 4, 5].map((slot) => {
            const fav = favorites[slot - 1];
            if (!fav) return null;
            return (
              <div key={slot} className="slot-row">
                <span className="slot-number">{slot}</span>
                <div className="slot-content">
                  {fav.category && (
                    <div className="slot-category">{fav.category}</div>
                  )}
                  <div className="slot-title">{fav.title}</div>
                  {fav.note && <div className="slot-note">{fav.note}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div
        style={{
          textAlign: "center",
          marginTop: "2.5rem",
          color: "var(--text-muted)",
          fontSize: "0.8rem",
        }}
      >
        <a
          href="/login"
          style={{ color: "var(--accent)", textDecoration: "none" }}
        >
          自分のMY5を作る →
        </a>
      </div>
    </div>
  );
}
