import React, { useEffect, useRef, useState } from 'react';

/**
 * Universal Captcha Widget supporting Cloudflare Turnstile and Google reCAPTCHA (v2 / v3).
 */
export default function CaptchaWidget({ provider, siteKey, onVerify, onExpire }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!provider || provider === 'disabled' || !siteKey) {
      return;
    }

    let isMounted = true;

    if (provider === 'turnstile') {
      const loadTurnstile = () => {
        if (window.turnstile && containerRef.current) {
          try {
            if (widgetIdRef.current !== null) {
              window.turnstile.remove(widgetIdRef.current);
            }
            widgetIdRef.current = window.turnstile.render(containerRef.current, {
              sitekey: siteKey,
              theme: 'auto',
              callback: (token) => {
                if (isMounted && onVerify) onVerify(token);
              },
              'expired-callback': () => {
                if (isMounted && onExpire) onExpire();
              },
              'error-callback': () => {
                if (isMounted && onExpire) onExpire();
              },
            });
            setLoaded(true);
          } catch (e) {
            console.error('Turnstile render error:', e);
          }
        }
      };

      if (window.turnstile) {
        loadTurnstile();
      } else {
        const existingScript = document.getElementById('cf-turnstile-script');
        if (!existingScript) {
          const script = document.createElement('script');
          script.id = 'cf-turnstile-script';
          script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
          script.async = true;
          script.defer = true;
          script.onload = () => {
            if (isMounted) loadTurnstile();
          };
          document.head.appendChild(script);
        } else {
          existingScript.addEventListener('load', loadTurnstile);
        }
      }
    } else if (provider === 'recaptcha_v2') {
      const loadRecaptcha = () => {
        if (window.grecaptcha && window.grecaptcha.render && containerRef.current) {
          try {
            widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
              sitekey: siteKey,
              callback: (token) => {
                if (isMounted && onVerify) onVerify(token);
              },
              'expired-callback': () => {
                if (isMounted && onExpire) onExpire();
              },
            });
            setLoaded(true);
          } catch (e) {
            console.error('reCAPTCHA v2 render error:', e);
          }
        }
      };

      if (window.grecaptcha && window.grecaptcha.render) {
        loadRecaptcha();
      } else {
        const existingScript = document.getElementById('g-recaptcha-script');
        if (!existingScript) {
          const script = document.createElement('script');
          script.id = 'g-recaptcha-script';
          script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
          script.async = true;
          script.defer = true;
          script.onload = () => {
            if (isMounted) {
              window.grecaptcha.ready(loadRecaptcha);
            }
          };
          document.head.appendChild(script);
        } else {
          existingScript.addEventListener('load', loadRecaptcha);
        }
      }
    } else if (provider === 'recaptcha_v3') {
      const existingScript = document.getElementById('g-recaptcha-v3-script');
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'g-recaptcha-v3-script';
        script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
        script.async = true;
        script.onload = () => {
          if (isMounted && window.grecaptcha) {
            window.grecaptcha.ready(() => {
              window.grecaptcha.execute(siteKey, { action: 'submit' }).then((token) => {
                if (isMounted && onVerify) onVerify(token);
              });
            });
          }
        };
        document.head.appendChild(script);
      } else if (window.grecaptcha) {
        window.grecaptcha.ready(() => {
          window.grecaptcha.execute(siteKey, { action: 'submit' }).then((token) => {
            if (isMounted && onVerify) onVerify(token);
          });
        });
      }
    }

    return () => {
      isMounted = false;
      if (provider === 'turnstile' && window.turnstile && widgetIdRef.current !== null) {
        try { window.turnstile.remove(widgetIdRef.current); } catch (e) {}
      }
    };
  }, [provider, siteKey]);

  if (!provider || provider === 'disabled' || !siteKey) {
    return null;
  }

  return (
    <div style={{ margin: '14px 0', minHeight: provider === 'recaptcha_v3' ? 0 : 65, display: 'flex', justifyContent: 'center' }}>
      <div ref={containerRef} />
    </div>
  );
}
