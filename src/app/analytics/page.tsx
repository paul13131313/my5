"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Favorite } from "@/lib/types";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";

const supabase = createClient();

const API_BASE = "https://my-ranking-api.hiroshinagano0113.workers.dev";

const CHART_COLORS = [
  "#f0c040",
  "#4895EF",
  "#2ecc71",
  "#e05050",
  "#9b59b6",
  "#1abc9c",
  "#e67e22",
  "#e84393",
];

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Favorite[]>([]);

  // Chart data
  const [categoryData, setCategoryData] = useState<
    { category: string; count: number }[]
  >([]);
  const [timelineData, setTimelineData] = useState<
    { date: string; count: number }[]
  >([]);

  // API data
  const [rankingCategories, setRankingCategories] = useState<
    { id: string; name: string; icon: string; items: { title: string; rank: number }[] }[]
  >([]);
  const [yearData, setYearData] = useState<
    { year: string; count: number }[]
  >([]);

  // AI analysis
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const loadData = useCallback(async () => {
    // Check auth
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    // Load favorites
    const { data: favs } = await supabase
      .from("favorites")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at");

    const favList = (favs as Favorite[] | null) || [];
    setFavorites(favList);

    // Category count from favorites
    const catMap: Record<string, number> = {};
    favList.forEach((f) => {
      const cat = f.category || "未分類";
      catMap[cat] = (catMap[cat] || 0) + 1;
    });
    setCategoryData(
      Object.entries(catMap).map(([category, count]) => ({ category, count }))
    );

    // Timeline from favorites
    const dateMap: Record<string, number> = {};
    favList.forEach((f) => {
      const d = f.created_at?.slice(0, 10);
      if (d) dateMap[d] = (dateMap[d] || 0) + 1;
    });
    const sorted = Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .reduce<{ date: string; count: number }[]>((acc, [date, count]) => {
        const prev = acc.length > 0 ? acc[acc.length - 1].count : 0;
        acc.push({ date: date.slice(5), count: prev + count });
        return acc;
      }, []);
    setTimelineData(sorted);

    setLoading(false);

    // Load ranking API data (for bar chart by year)
    try {
      const catRes = await fetch(`${API_BASE}/rankings`);
      const cats = await catRes.json();

      const allCats: typeof rankingCategories = [];
      for (const cat of cats) {
        const itemRes = await fetch(`${API_BASE}/rankings/${cat.id}`);
        const items = await itemRes.json();
        allCats.push({ ...cat, items });
      }
      setRankingCategories(allCats);

      // Movie year distribution (search for release years from API movie data)
      // Use movie search to get year data for items in movie-like categories
      const movieCat = allCats.find(
        (c) => c.name.includes("映画") || c.name.includes("Movie")
      );
      if (movieCat && movieCat.items.length > 0) {
        const yearCounts: Record<string, number> = {};
        const searches = await Promise.all(
          movieCat.items.map(async (item) => {
            try {
              const res = await fetch(
                `${API_BASE}/search/movie?q=${encodeURIComponent(item.title)}`
              );
              const data = await res.json();
              return data.results?.[0]?.release_year || null;
            } catch {
              return null;
            }
          })
        );
        searches.forEach((year) => {
          if (year) {
            const decade = year.slice(0, 3) + "0s";
            yearCounts[decade] = (yearCounts[decade] || 0) + 1;
          }
        });
        setYearData(
          Object.entries(yearCounts)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([year, count]) => ({ year, count }))
        );
      }
    } catch {
      // API may not be available; proceed without
    }
  }, [router]);

  const loadAnalysis = async () => {
    setAnalysisLoading(true);
    try {
      const res = await fetch(`${API_BASE}/analyze`);
      const data = await res.json();
      setAnalysis(data.analysis || "分析データがありません");
    } catch {
      setAnalysis("分析の取得に失敗しました。");
    }
    setAnalysisLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div
        className="page-wrap"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "80vh",
        }}
      >
        <div style={{ color: "var(--text-muted)" }}>読み込み中...</div>
      </div>
    );
  }

  // Build radar data from ranking API categories
  const radarData = rankingCategories.map((cat) => ({
    category: `${cat.icon} ${cat.name}`,
    count: cat.items.length,
    fullMark: Math.max(...rankingCategories.map((c) => c.items.length), 5),
  }));

  // Pie data from ranking API categories (or fall back to favorites)
  const pieData =
    radarData.length > 0
      ? radarData.map((d) => ({ name: d.category, value: d.count }))
      : categoryData.map((d) => ({ name: d.category, value: d.count }));

  const totalItems = pieData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="analytics-page-wrap">
      {/* Top bar */}
      <div className="topbar">
        <Link href="/me" className="topbar-logo">
          MY5
        </Link>
        <div className="topbar-right">
          <span className="analytics-badge">Analytics</span>
        </div>
      </div>

      {/* Page title */}
      <div className="analytics-hero">
        <h1 className="analytics-title">趣味分析</h1>
        <p className="analytics-subtitle">
          あなたの「好き」をデータで可視化
        </p>
      </div>

      {/* Stats row */}
      <div className="analytics-stats-row">
        <div className="analytics-stat-card">
          <div className="analytics-stat-num">{totalItems}</div>
          <div className="analytics-stat-label">登録アイテム</div>
        </div>
        <div className="analytics-stat-card">
          <div className="analytics-stat-num">
            {radarData.length || categoryData.length}
          </div>
          <div className="analytics-stat-label">カテゴリ</div>
        </div>
        <div className="analytics-stat-card">
          <div className="analytics-stat-num">{favorites.length}</div>
          <div className="analytics-stat-label">MY5登録</div>
        </div>
      </div>

      {/* Charts grid */}
      <div className="analytics-grid">
        {/* Radar Chart */}
        {radarData.length > 0 && (
          <div className="analytics-card">
            <div className="analytics-card-header">
              <span className="analytics-card-icon">📊</span>
              <span className="analytics-card-title">
                カテゴリ別 登録数
              </span>
            </div>
            <div className="analytics-chart-wrap">
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="#2a2a32" />
                  <PolarAngleAxis
                    dataKey="category"
                    tick={{ fill: "#8a8890", fontSize: 11 }}
                  />
                  <PolarRadiusAxis
                    tick={{ fill: "#555", fontSize: 10 }}
                    axisLine={false}
                  />
                  <Radar
                    dataKey="count"
                    stroke="#f0c040"
                    fill="#f0c040"
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Pie Chart */}
        {pieData.length > 0 && (
          <div className="analytics-card">
            <div className="analytics-card-header">
              <span className="analytics-card-icon">🥧</span>
              <span className="analytics-card-title">カテゴリ割合</span>
            </div>
            <div className="analytics-chart-wrap">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    dataKey="value"
                    stroke="none"
                    label={(props: PieLabelRenderProps) =>
                      `${props.name || ""} ${((Number(props.percent) || 0) * 100).toFixed(0)}%`
                    }
                  >
                    {pieData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#1a1a20",
                      border: "1px solid #2a2a32",
                      borderRadius: "8px",
                      color: "#e8e6e3",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Bar Chart - Year Distribution */}
        {yearData.length > 0 && (
          <div className="analytics-card">
            <div className="analytics-card-header">
              <span className="analytics-card-icon">🎬</span>
              <span className="analytics-card-title">
                年代別 映画分布
              </span>
            </div>
            <div className="analytics-chart-wrap">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={yearData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a32" />
                  <XAxis
                    dataKey="year"
                    tick={{ fill: "#8a8890", fontSize: 11 }}
                    axisLine={{ stroke: "#2a2a32" }}
                  />
                  <YAxis
                    tick={{ fill: "#8a8890", fontSize: 11 }}
                    axisLine={{ stroke: "#2a2a32" }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#1a1a20",
                      border: "1px solid #2a2a32",
                      borderRadius: "8px",
                      color: "#e8e6e3",
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {yearData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Timeline */}
        {timelineData.length > 0 && (
          <div className="analytics-card">
            <div className="analytics-card-header">
              <span className="analytics-card-icon">📈</span>
              <span className="analytics-card-title">
                登録数タイムライン
              </span>
            </div>
            <div className="analytics-chart-wrap">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={timelineData}>
                  <defs>
                    <linearGradient
                      id="colorCount"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#f0c040" stopOpacity={0.3} />
                      <stop
                        offset="95%"
                        stopColor="#f0c040"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a32" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#8a8890", fontSize: 11 }}
                    axisLine={{ stroke: "#2a2a32" }}
                  />
                  <YAxis
                    tick={{ fill: "#8a8890", fontSize: 11 }}
                    axisLine={{ stroke: "#2a2a32" }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#1a1a20",
                      border: "1px solid #2a2a32",
                      borderRadius: "8px",
                      color: "#e8e6e3",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#f0c040"
                    strokeWidth={2}
                    fill="url(#colorCount)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* AI Analysis section */}
      <div className="analytics-card analytics-ai-section">
        <div className="analytics-card-header">
          <span className="analytics-card-icon">🤖</span>
          <span className="analytics-card-title">AI趣味分析</span>
        </div>
        {analysis ? (
          <div className="analytics-ai-result">
            <p className="analytics-ai-text">{analysis}</p>
          </div>
        ) : (
          <div className="analytics-ai-cta">
            <p className="analytics-ai-desc">
              AIがあなたのランキングデータを分析し、趣味の傾向や意外な共通点を見つけます。
            </p>
            <button
              className="btn btn-primary"
              onClick={loadAnalysis}
              disabled={analysisLoading}
            >
              {analysisLoading ? "分析中..." : "✨ AIに分析してもらう"}
            </button>
          </div>
        )}
        {analysis && (
          <button
            className="btn btn-secondary btn-sm"
            style={{ marginTop: "1rem" }}
            onClick={() => {
              setAnalysis(null);
              loadAnalysis();
            }}
            disabled={analysisLoading}
          >
            🔄 再分析
          </button>
        )}
      </div>

      {/* Ranking breakdown */}
      {rankingCategories.length > 0 && (
        <div className="analytics-card" style={{ marginTop: "1rem" }}>
          <div className="analytics-card-header">
            <span className="analytics-card-icon">🏆</span>
            <span className="analytics-card-title">
              カテゴリ別ランキング
            </span>
          </div>
          <div className="analytics-ranking-grid">
            {rankingCategories.map((cat) => (
              <div key={cat.id} className="analytics-ranking-cat">
                <div className="analytics-ranking-cat-name">
                  {cat.icon} {cat.name}
                </div>
                <div className="analytics-ranking-items">
                  {cat.items
                    .sort((a, b) => a.rank - b.rank)
                    .slice(0, 5)
                    .map((item, i) => (
                      <div key={i} className="analytics-ranking-item">
                        <span className="analytics-ranking-rank">
                          {item.rank}
                        </span>
                        <span className="analytics-ranking-title">
                          {item.title}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Back link */}
      <Link href="/me" className="btn btn-secondary btn-full" style={{ marginTop: "2rem" }}>
        ← ダッシュボードに戻る
      </Link>
    </div>
  );
}
