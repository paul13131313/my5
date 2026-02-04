"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Favorite } from "@/lib/types";

const supabase = createClient();

// ─── Modal for editing a single favorite slot ───
function SlotModal({
  slot,
  initial,
  onSave,
  onClose,
}: {
  slot: number;
  initial: Favorite | null;
  onSave: (data: { category: string; title: string; note: string }) => void;
  onClose: () => void;
}) {
  const [category, setCategory] = useState(initial?.category ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [note, setNote] = useState(initial?.note ?? "");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">#{slot} を編集</div>
        <div className="form-group">
          <label className="form-label">カテゴリー</label>
          <input
            className="form-input"
            placeholder="映画、音楽、場所…"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">タイトル *</label>
          <input
            className="form-input"
            placeholder="お気に入りの名前"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">ノート</label>
          <textarea
            className="form-textarea"
            placeholder="一言メモ（任意）"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            キャンセル
          </button>
          <button
            className="btn btn-primary btn-sm"
            disabled={!title.trim()}
            onClick={() => onSave({ category, title: title.trim(), note })}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Handle setup form ───
function HandleSetup({
  userId,
  onCreated,
}: {
  userId: string;
  onCreated: (p: Profile) => void;
}) {
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(handle)) {
      setError("3〜20文字の英数字・アンダースコアのみ");
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        handle,
        display_name: displayName || handle,
      })
      .select()
      .single();
    setLoading(false);
    if (err) {
      if (err.code === "23505") setError("このハンドルは既に使われています");
      else setError(err.message);
      return;
    }
    onCreated(data as Profile);
  };

  return (
    <div className="page-wrap">
      <div className="logo">MY5</div>
      <div className="logo-sub">share your top 5</div>
      <div className="setup-wrap">
        <h2 style={{ fontFamily: "var(--serif)", fontSize: "1.3rem", marginBottom: "1.5rem", textAlign: "center" }}>
          プロフィールを設定
        </h2>
        <div className="form-group">
          <label className="form-label">ハンドル *</label>
          <input
            className="form-input"
            placeholder="your_handle"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">表示名</label>
          <input
            className="form-input"
            placeholder="表示名（任意）"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>
        {error && (
          <p style={{ color: "var(--danger)", fontSize: "0.85rem", marginBottom: "1rem" }}>
            {error}
          </p>
        )}
        <button
          className="btn btn-primary btn-full"
          onClick={submit}
          disabled={loading}
        >
          {loading ? "作成中…" : "はじめる"}
        </button>
      </div>
    </div>
  );
}

// ─── Main dashboard ───
export default function MePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [favorites, setFavorites] = useState<(Favorite | null)[]>([
    null,
    null,
    null,
    null,
    null,
  ]);
  const [loading, setLoading] = useState(true);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  };

  const loadData = useCallback(async (uid: string) => {
    const [{ data: prof }, { data: favs }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).single(),
      supabase
        .from("favorites")
        .select("*")
        .eq("user_id", uid)
        .order("slot"),
    ]);
    if (prof) setProfile(prof as Profile);
    const slots: (Favorite | null)[] = [null, null, null, null, null];
    (favs as Favorite[] | null)?.forEach((f) => {
      slots[f.slot - 1] = f;
    });
    setFavorites(slots);
    setLoading(false);
    return prof;
  }, []);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.id);
      const prof = await loadData(user.id);
      if (!prof) setLoading(false); // show handle setup
    })();
  }, [router, loadData]);

  // ─── Upsert a favorite ───
  const saveFavorite = async (
    slot: number,
    data: { category: string; title: string; note: string }
  ) => {
    if (!userId) return;
    await supabase.from("favorites").upsert(
      {
        user_id: userId,
        slot,
        ...data,
      },
      { onConflict: "user_id,slot" }
    );
    setEditingSlot(null);
    await loadData(userId);
    showToast("保存しました");
  };

  // ─── Delete a favorite ───
  const deleteFavorite = async (slot: number) => {
    if (!userId) return;
    await supabase
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .eq("slot", slot);
    await loadData(userId);
    showToast("削除しました");
  };

  // ─── Swap two slots ───
  const swapSlots = async (a: number, b: number) => {
    if (!userId) return;
    const favA = favorites[a - 1];
    const favB = favorites[b - 1];

    // Delete both first, then re-insert swapped
    await supabase
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .in("slot", [a, b]);

    const inserts: Partial<Favorite>[] = [];
    if (favA) inserts.push({ user_id: userId, slot: b, category: favA.category, title: favA.title, note: favA.note });
    if (favB) inserts.push({ user_id: userId, slot: a, category: favB.category, title: favB.title, note: favB.note });
    if (inserts.length) await supabase.from("favorites").insert(inserts);

    await loadData(userId);
    showToast("入れ替えました");
  };

  // ─── Toggle is_public ───
  const togglePublic = async () => {
    if (!profile || !userId) return;
    const newVal = !profile.is_public;
    await supabase
      .from("profiles")
      .update({ is_public: newVal })
      .eq("id", userId);
    setProfile({ ...profile, is_public: newVal });
    showToast(newVal ? "公開にしました" : "非公開にしました");
  };

  // ─── Logout ───
  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // ─── Copy URL ───
  const copyUrl = () => {
    if (!profile) return;
    const url = `${window.location.origin}/u/${profile.handle}`;
    navigator.clipboard.writeText(url);
    showToast("URLをコピーしました");
  };

  // ─── Loading ───
  if (loading) {
    return (
      <div className="page-wrap" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
        <div style={{ color: "var(--text-muted)" }}>読み込み中…</div>
      </div>
    );
  }

  // ─── Handle setup ───
  if (!profile && userId) {
    return (
      <HandleSetup
        userId={userId}
        onCreated={(p) => {
          setProfile(p);
        }}
      />
    );
  }

  if (!profile) return null;

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="page-wrap">
      {/* Top bar */}
      <div className="topbar">
        <span className="topbar-logo">MY5</span>
        <div className="topbar-right">
          <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            @{profile.handle}
          </span>
        </div>
      </div>

      <div className="card">
        {[1, 2, 3, 4, 5].map((slot) => {
          const fav = favorites[slot - 1];
          return (
            <div key={slot} className="slot-row">
              <span className="slot-number">{slot}</span>
              {fav ? (
                <>
                  <div className="slot-content">
                    {fav.category && (
                      <div className="slot-category">{fav.category}</div>
                    )}
                    <div className="slot-title">{fav.title}</div>
                    {fav.note && <div className="slot-note">{fav.note}</div>}
                  </div>
                  <div className="slot-actions">
                    <button
                      className="icon-btn"
                      title="編集"
                      onClick={() => setEditingSlot(slot)}
                    >
                      ✏️
                    </button>
                    {slot > 1 && favorites[slot - 2] && (
                      <button
                        className="icon-btn"
                        title="上と入れ替え"
                        onClick={() => swapSlots(slot - 1, slot)}
                      >
                        ↑
                      </button>
                    )}
                    {slot < 5 && favorites[slot] && (
                      <button
                        className="icon-btn"
                        title="下と入れ替え"
                        onClick={() => swapSlots(slot, slot + 1)}
                      >
                        ↓
                      </button>
                    )}
                    <button
                      className="icon-btn danger"
                      title="削除"
                      onClick={() => deleteFavorite(slot)}
                    >
                      ✕
                    </button>
                  </div>
                </>
              ) : (
                <span
                  className="slot-empty"
                  onClick={() => setEditingSlot(slot)}
                >
                  + タップして追加
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Public URL */}
      <div className="card" style={{ marginTop: "1.5rem" }}>
        <div className="toggle-wrap">
          <span className="toggle-label">
            {profile.is_public ? "🌐 公開中" : "🔒 非公開"}
          </span>
          <label className="toggle">
            <input
              type="checkbox"
              checked={profile.is_public}
              onChange={togglePublic}
            />
            <span className="toggle-track" />
            <span className="toggle-thumb" />
          </label>
        </div>
        <div className="url-box">
          <span className="url-text">
            {siteUrl}/u/{profile.handle}
          </span>
          <button className="btn btn-primary url-copy" onClick={copyUrl}>
            コピー
          </button>
        </div>
      </div>

      {/* Logout */}
      <button
        className="btn btn-secondary btn-full"
        style={{ marginTop: "2rem" }}
        onClick={logout}
      >
        ログアウト
      </button>

      {/* Edit modal */}
      {editingSlot && (
        <SlotModal
          slot={editingSlot}
          initial={favorites[editingSlot - 1]}
          onSave={(data) => saveFavorite(editingSlot, data)}
          onClose={() => setEditingSlot(null)}
        />
      )}

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
