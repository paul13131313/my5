"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
const API_BASE = "https://my-ranking-api.hiroshinagano0113.workers.dev";

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string | null;
  features: string[];
  cta: string;
  current: boolean;
  popular?: boolean;
}

export default function PricingPage() {
  return (
    <Suspense fallback={
      <div className="page-wrap" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
        <div style={{ color: "var(--text-muted)" }}>読み込み中...</div>
      </div>
    }>
      <PricingContent />
    </Suspense>
  );
}

function PricingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const loadPlans = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/pricing`);
      const data = await res.json();
      setPlans(data.plans || []);
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      loadPlans();
    })();
  }, [router, loadPlans]);

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setShowSuccess(true);
    }
  }, [searchParams]);

  const handleCheckout = async (planId: string) => {
    setCheckingOut(true);
    try {
      const res = await fetch(`${API_BASE}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (data.url) {
        setShowSuccess(true);
      }
    } catch {
      // ignore
    }
    setCheckingOut(false);
  };

  if (loading) {
    return (
      <div className="page-wrap" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
        <div style={{ color: "var(--text-muted)" }}>読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="pricing-page-wrap">
      {/* Top bar */}
      <div className="topbar">
        <Link href="/me" className="topbar-logo">MY5</Link>
        <div className="topbar-right">
          <span className="analytics-badge">Pricing</span>
        </div>
      </div>

      {/* Hero */}
      <div className="pricing-hero">
        <h1 className="pricing-title">料金プラン</h1>
        <p className="pricing-subtitle">あなたに合ったプランを選びましょう</p>
      </div>

      {/* Plans */}
      <div className="pricing-grid">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`pricing-card ${plan.popular ? "pricing-card-popular" : ""}`}
          >
            {plan.popular && (
              <div className="pricing-badge">おすすめ</div>
            )}
            <div className="pricing-plan-name">{plan.name}</div>
            <div className="pricing-price">
              {plan.price === 0 ? (
                <span className="pricing-amount">¥0</span>
              ) : (
                <>
                  <span className="pricing-amount">¥{plan.price.toLocaleString()}</span>
                  <span className="pricing-interval">/{plan.interval === "month" ? "月" : plan.interval}</span>
                </>
              )}
            </div>
            <ul className="pricing-features">
              {plan.features.map((f, i) => (
                <li key={i} className="pricing-feature">
                  <span className="pricing-check">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <button
              className={`btn ${plan.current ? "btn-secondary" : "btn-primary"} btn-full pricing-cta`}
              disabled={plan.current || checkingOut}
              onClick={() => !plan.current && handleCheckout(plan.id)}
            >
              {checkingOut && !plan.current ? "処理中..." : plan.cta}
            </button>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div className="pricing-faq">
        <h2 className="pricing-faq-title">よくある質問</h2>
        <div className="pricing-faq-item">
          <div className="pricing-faq-q">Proプランはいつでもキャンセルできますか？</div>
          <div className="pricing-faq-a">はい、いつでもキャンセル可能です。次の請求日まではProの機能をご利用いただけます。</div>
        </div>
        <div className="pricing-faq-item">
          <div className="pricing-faq-q">支払い方法は何が使えますか？</div>
          <div className="pricing-faq-a">クレジットカード（Visa, Mastercard, AMEX）に対応しています。</div>
        </div>
        <div className="pricing-faq-item">
          <div className="pricing-faq-q">無料プランに制限はありますか？</div>
          <div className="pricing-faq-a">お気に入りの登録数が5つまでに制限されます。検索や閲覧はすべてのプランで無制限です。</div>
        </div>
      </div>

      {/* Back */}
      <Link href="/me" className="btn btn-secondary btn-full" style={{ marginTop: "2rem" }}>
        ← ダッシュボードに戻る
      </Link>

      {/* Success modal */}
      {showSuccess && (
        <div className="modal-overlay" onClick={() => setShowSuccess(false)}>
          <div className="pricing-success-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pricing-success-icon">🎉</div>
            <div className="pricing-success-title">アップグレード完了！</div>
            <div className="pricing-success-text">
              Proプランへのアップグレードが完了しました。すべての機能をお楽しみください！
            </div>
            <div className="pricing-success-detail">
              <div className="pricing-success-row">
                <span>プラン</span>
                <span>Pro</span>
              </div>
              <div className="pricing-success-row">
                <span>月額</span>
                <span>¥500</span>
              </div>
              <div className="pricing-success-row">
                <span>ステータス</span>
                <span className="pricing-success-status">有効</span>
              </div>
            </div>
            <button
              className="btn btn-primary btn-full"
              onClick={() => { setShowSuccess(false); router.push("/me"); }}
            >
              ダッシュボードへ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
