import React, { useEffect, useRef } from 'react';

/**
 * AdBanner Component
 * Renders HTML / script ad units safely and executes contained scripts (e.g. AdSense units).
 */
export default function AdBanner({ htmlCode, className = '', style = {} }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !htmlCode || !htmlCode.trim()) return;

    const container = containerRef.current;
    container.innerHTML = htmlCode;

    // React's innerHTML does not execute <script> tags automatically per HTML5 spec.
    // We recreate and append each script element so the browser/ad-network executes it.
    const scripts = container.querySelectorAll('script');
    scripts.forEach((oldScript) => {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });
      newScript.textContent = oldScript.textContent;
      oldScript.parentNode.replaceChild(newScript, oldScript);
    });

    // If an AdSense ins element is present, trigger adsbygoogle push
    try {
      if (container.querySelector('ins.adsbygoogle')) {
        ((window).adsbygoogle = (window).adsbygoogle || []).push({});
      }
    } catch (e) {
      // Ignore adsbygoogle duplicate push errors
    }
  }, [htmlCode]);

  if (!htmlCode || !htmlCode.trim()) return null;

  return (
    <div
      ref={containerRef}
      className={`ad-banner-container ${className}`}
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        ...style,
      }}
    />
  );
}
