'use client';
import { useEffect } from 'react';

export default function ManifestDebug() {
  useEffect(() => {
    console.log("🔍 Manifest debugging enabled");
    console.log("📁 Current URL:", window.location.href);
    console.log("📄 Manifest path:", "/manifest.json");
    
    // Manifest 로딩 테스트
    fetch('/manifest.json')
      .then(response => {
        console.log("✅ Manifest fetch response:", response.status, response.statusText);
        return response.text();
      })
      .then(text => {
        console.log("📄 Manifest content length:", text.length);
        try {
          const manifest = JSON.parse(text);
          console.log("✅ Manifest parsed successfully:", manifest.name);
        } catch (e) {
          console.error("❌ Manifest JSON parse error:", e);
        }
      })
      .catch(error => {
        console.error("❌ Manifest fetch error:", error);
        console.log("🔍 Debug endpoint available at: /api/debug-manifest");
      });
  }, []);

  return null; // UI에 아무것도 렌더링하지 않음
}
