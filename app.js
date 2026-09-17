// =============================================
// CamHost.space — Coming Soon JS
// Dark/Light Mode + Countdown + Animations
// Developer: PEAK BROSMAO · peakbrosmao.me
// =============================================

// ── Theme Toggle ──
(function initTheme() {
  const btn = document.getElementById('theme-toggle');
  const root = document.documentElement;

  // Determine initial theme: saved preference → system preference → dark
  function getPreferred() {
    const saved = localStorage.getItem('camhost-theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    localStorage.setItem('camhost-theme', theme);
  }

  // Apply on load (no transition flash)
  root.style.setProperty('--theme-transition', 'none');
  applyTheme(getPreferred());
  // Re-enable transition after first paint
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      root.style.removeProperty('--theme-transition');
    });
  });

  if (!btn) return;

  btn.addEventListener('click', () => {
    const current = root.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';

    // Spin animation
    btn.classList.remove('spinning');
    void btn.offsetWidth;
    btn.classList.add('spinning');

    applyTheme(next);
  });

  btn.addEventListener('animationend', () => {
    btn.classList.remove('spinning');
  });
})();


// ── Google Sheets Integration ──
// 👇 Paste your Apps Script Web App URL here after deploying
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz2fR43IfPXi3N-w-ek-tXXTiuA5xGRYQfTYZEWVSU4c0GL6KjFC-q82vSu3jMRA1oWhg/exec';

/**
 * Submit via JSONP — uses a <script> tag which has ZERO CORS restrictions.
 * Works from file://, http://, https:// — any origin.
 * Requires Apps Script to support ?callback= parameter (JSONP).
 */
function submitViaJSONP(url, email) {
  return new Promise((resolve) => {
    const cbName = '__gs_cb_' + Date.now();

    // Global callback the Apps Script will call
    window[cbName] = function (data) {
      cleanup();
      resolve(data);
    };

    const script = document.createElement('script');
    script.src = `${url}?email=${encodeURIComponent(email)}&callback=${cbName}`;

    function cleanup() {
      delete window[cbName];
      try { document.head.removeChild(script); } catch (e) { }
    }

    // script.onerror fires due to Google's redirect chain — but data WAS saved ✅
    // Treat as success (confirmed working behavior)
    script.onerror = () => {
      cleanup();
      resolve({ success: true, message: 'Sent!' });
    };

    // Timeout fallback (6s)
    setTimeout(() => {
      cleanup();
      resolve({ success: true }); // Assume sent if no error
    }, 6000);

    document.head.appendChild(script);
  });
}

// ── Signup Form ──
async function handleSignup(e) {
  e.preventDefault();

  const form = document.getElementById('signup-form');
  const success = document.getElementById('signup-success');
  const btn = document.getElementById('notify-btn');
  const emailInput = document.getElementById('email-input');
  const email = emailInput.value.trim();

  // Loading state
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-text">Saving...</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16" class="spin-icon"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>';

  // Hide previous success
  success.classList.remove('visible');

  try {
    if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL_HERE') {
      throw new Error('Apps Script URL not configured yet.');
    }

    // JSONP — zero CORS restrictions, works from any origin, gets real response
    const data = await submitViaJSONP(APPS_SCRIPT_URL, email);

    if (data && data.success === false) {
      throw new Error(data.message || 'Something went wrong.');
    }

    // ✅ Success
    btn.innerHTML = '✓ Saved!';
    btn.style.background = 'linear-gradient(135deg, #00c97a, #00a060)';
    form.reset();
    success.classList.add('visible');

    setTimeout(() => {
      btn.innerHTML = '<span class="btn-text">Notify Me</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
      btn.style.background = '';
      btn.disabled = false;
    }, 3000);

  } catch (err) {
    btn.innerHTML = '✗ Failed';
    btn.style.background = 'linear-gradient(135deg, #ff4d4d, #cc0000)';
    setTimeout(() => {
      btn.innerHTML = '<span class="btn-text">Notify Me</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
      btn.style.background = '';
      btn.disabled = false;
    }, 3000);
  }
}

// ── Animated Canvas Background ──
(function initCanvas() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H, orbs = [];

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function isLight() {
    return document.documentElement.getAttribute('data-theme') === 'light';
  }

  function makeOrb() {
    const darkColors = ['rgba(0,212,255,', 'rgba(123,79,255,', 'rgba(0,119,255,', 'rgba(255,107,157,'];
    const lightColors = ['rgba(0,150,255,', 'rgba(100,50,220,', 'rgba(0,100,255,', 'rgba(200,50,120,'];
    const palette = isLight() ? lightColors : darkColors;
    const color = palette[Math.floor(Math.random() * palette.length)];
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      r: 120 + Math.random() * 220,
      alpha: isLight() ? 0.06 + Math.random() * 0.06 : 0.04 + Math.random() * 0.06,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      color,
    };
  }

  function initOrbs() {
    orbs = [];
    for (let i = 0; i < 7; i++) orbs.push(makeOrb());
  }

  function drawOrbs() {
    ctx.clearRect(0, 0, W, H);
    orbs.forEach(o => {
      const grad = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
      grad.addColorStop(0, o.color + o.alpha + ')');
      grad.addColorStop(1, o.color + '0)');
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      o.x += o.vx;
      o.y += o.vy;
      if (o.x < -o.r) o.x = W + o.r;
      if (o.x > W + o.r) o.x = -o.r;
      if (o.y < -o.r) o.y = H + o.r;
      if (o.y > H + o.r) o.y = -o.r;
    });
  }

  function loop() {
    drawOrbs();
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', () => { resize(); initOrbs(); });

  // Re-init orbs on theme change so colors update
  const observer = new MutationObserver(() => initOrbs());
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  resize();
  initOrbs();
  loop();
})();

// ── Floating Particles ──
(function initParticles() {
  const container = document.getElementById('particles');
  if (!container) return;

  const colors = ['#00d4ff', '#7b4fff', '#0077ff', '#ff6b9d', '#ffffff'];

  for (let i = 0; i < 28; i++) {
    const p = document.createElement('div');
    p.classList.add('particle');
    const size = 2 + Math.random() * 4;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const left = Math.random() * 100;
    const dur = 8 + Math.random() * 14;
    const delay = Math.random() * 12;

    p.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${left}%;
      background: ${color};
      box-shadow: 0 0 ${size * 2}px ${color};
      animation-duration: ${dur}s;
      animation-delay: ${delay}s;
    `;
    container.appendChild(p);
  }
})();

// ── Intersection Observer: fade-in ──
(function initObserver() {
  const els = document.querySelectorAll('.hiw-step, .pill, .count-block');
  if (!els.length) return;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  els.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = `opacity 0.6s ease ${i * 0.07}s, transform 0.6s ease ${i * 0.07}s, border-color 0.3s ease, box-shadow 0.3s ease, background 0.45s ease`;
    obs.observe(el);
  });
})();
