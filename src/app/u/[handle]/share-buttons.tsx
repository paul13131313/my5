"use client";

import { useState } from "react";

export function ShareButtons({ url, text }: { url: string; text: string }) {
  const [copied, setCopied] = useState(false);

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`;

  const copyLink = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="share-section">
      <div className="share-label">Share</div>
      <div className="share-buttons">
        <a
          href={twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="share-btn share-btn-x"
        >
          𝕏 Post
        </a>
        <a
          href={lineUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="share-btn share-btn-line"
        >
          LINE
        </a>
        <button
          className={`share-btn share-btn-copy ${copied ? "copied" : ""}`}
          onClick={copyLink}
        >
          {copied ? "Copied!" : "🔗 Copy"}
        </button>
      </div>
    </div>
  );
}
