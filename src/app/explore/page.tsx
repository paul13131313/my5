"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
const API_BASE = "https://my-ranking-api.hiroshinagano0113.workers.dev";

interface SearchResult {
  title: string;
  rank: number;
  category: string;
  user: { handle: string; display_name: string };
  created_at: string;
}

interface PopularItem {
  rank: number;
  title: string;
  category: string;
  count: number;
}

export default function ExplorePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [rankFilter, setRankFilter] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [popular, setPopular] = useState<PopularItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadPopular = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/stats/popular`);
      const data = await res.json();
      setPopular(data.popular || []);
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      loadPopular();
    })();
  }, [router, loadPopular]);

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSearched(true);
    try {
      let url = `${API_BASE}/search/rankings?q=${encodeURIComponent(query.trim())}`;
      if (rankFilter) url += `&rank=${rankFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    }
    setSearching(false);
  };

  const medals = ["", "🥇", "🥈", "🥉", "4", "5"];

  if (loading) {
    return (
      <div className="page-wrap" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
        <div style={{ color: "var(--text-muted)" }}>読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="explore-page-wrap">
      {/* Top bar */}
      <div className="topbar">
        <Link href="/me" className="topbar-logo">MY5</Link>
        <div className="topbar-right">
          <span className="analytics-badge">Explore</span>
        </div>
      </div>

      {/* Hero */}
      <div className="explore-hero">
        <h1 className="explore-title">みんなのランキング</h1>
        <p className="explore-subtitle">他のユーザーのお気に入りを検索</p>
      </div>

      {/* Search bar */}
      <div className="explore-search">
        <div className="explore-search-row">
          <input
            className="explore-search-input"
            type="text"
            placeholder="作品名を検索..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
          <button
            className="btn btn-primary"
            onClick={search}
            disabled={searching || !query.trim()}
          >
            {searching ? "..." : "検索"}
          </button>
        </div>
        <div className="explore-filter-row">
          <span className="explore-filter-label">順位で絞り込み:</span>
          {["", "1", "2", "3", "4", "5"].map((r) => (
            <button
              key={r}
              className={`explore-filter-btn ${rankFilter === r ? "active" : ""}`}
              onClick={() => setRankFilter(r)}
            >
              {r === "" ? "ALL" : `${r}位`}
            </button>
          ))}
        </div>
      </div>

      {/* Search results */}
      {searched && (
        <div className="explore-section">
          <div className="explore-section-header">
            <span className="explore-section-icon">🔍</span>
            <span className="explore-section-title">
              「{query}」の検索結果 ({results.length}件)
            </span>
          </div>
          {results.length === 0 ? (
            <div className="explore-empty">
              該当する作品が見つかりませんでした
            </div>
          ) : (
            <div className="explore-results">
              {results.map((r, i) => (
                <div key={i} className="explore-result-card">
                  <div className="explore-result-rank">
                    {r.rank <= 3 ? medals[r.rank] : `${r.rank}`}
                  </div>
                  <div className="explore-result-content">
                    <div className="explore-result-title">{r.title}</div>
                    {r.category && (
                      <div className="explore-result-category">{r.category}</div>
                    )}
                  </div>
                  <div className="explore-result-user">
                    <Link
                      href={`/u/${r.user.handle}`}
                      className="explore-result-handle"
                    >
                      {r.user.display_name}
                    </Link>
                    <div className="explore-result-pos">{r.rank}位</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Popular items */}
      {popular.length > 0 && (
        <div className="explore-section">
          <div className="explore-section-header">
            <span className="explore-section-icon">🔥</span>
            <span className="explore-section-title">人気作品ランキング</span>
          </div>
          <div className="explore-popular">
            {popular.map((item) => (
              <div
                key={item.rank}
                className="explore-popular-row"
                onClick={() => { setQuery(item.title); }}
                style={{ cursor: "pointer" }}
              >
                <span className="explore-popular-rank">
                  {item.rank <= 3 ? medals[item.rank] : item.rank}
                </span>
                <div className="explore-popular-content">
                  <div className="explore-popular-title">{item.title}</div>
                  {item.category && (
                    <div className="explore-popular-category">{item.category}</div>
                  )}
                </div>
                <div className="explore-popular-count">
                  {item.count}人
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Back */}
      <Link href="/me" className="btn btn-secondary btn-full" style={{ marginTop: "2rem" }}>
        ← ダッシュボードに戻る
      </Link>
    </div>
  );
}
