"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

const CONSENT_KEY = "vibz_cookie_consent";
const GA_ID = "G-37B5HVWY8J";

export default function AnalyticsConsent() {
  const [analyticsAllowed, setAnalyticsAllowed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);

    if (stored) {
      try {
        const consent = JSON.parse(stored);
        setAnalyticsAllowed(consent.analytics === true);
      } catch {
        setAnalyticsAllowed(false);
      }
    }

    const handleConsentChange = (event) => {
      setAnalyticsAllowed(event.detail.analytics === true);
    };

    window.addEventListener(
      "vibz-consent-change",
      handleConsentChange
    );

    return () => {
      window.removeEventListener(
        "vibz-consent-change",
        handleConsentChange
      );
    };
  }, []);

  if (!analyticsAllowed) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />

      <Script id="vibz-google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}

          gtag('js', new Date());

          gtag('config', '${GA_ID}', {
            anonymize_ip: true
          });
        `}
      </Script>
    </>
  );
}