// =============================================
// CamHost.space — Coming Soon JS
// =============================================

// ── Countdown Timer ──
const LAUNCH_DATE = new Date('2027-01-01T00:00:00');

function pad(n) {
  return String(n).padStart(2, '0');
}

let prevVals = { days: -1, hours: -1, minutes: -1, seconds: -1 };

function updateCountdown() {
  const now = new Date();
  const diff = Math.max(0, LAUNCH_DATE - now);

  const days    = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  const fields = [
    { id: 'cd-days',    val: days,    prev: 'days' },
    { id: 'cd-hours',   val: hours,   prev: 'hours' },
    { id: 'cd-minutes', val: minutes, prev: 'minutes' },
    { id: 'cd-seconds', val: seconds, prev: 'seconds' },
  ];

  fields.forEach(({ id, val, prev }) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (prevVals[prev] !== val) {
      el.classList.remove('flip');
      void el.offsetWidth; // reflow
      el.classList.add('flip');
      prevVals[prev] = val;
    }
    el.textContent = pad(val);
  });
}

setInterval(updateCountdown, 1000);
updateCountdown();

// ── Signup Form ──
function handleSignup(e) {
  e.preventDefault();
  const form    = document.getElementById('signup-form');
  const success = document.getElementById('signup-success');
  const btn     = document.getElementById('notify-btn');

  btn.textContent = '✓ Done!';
  btn.style.background = 'linear-gradient(135deg, #00c97a, #00a060)';
  btn.disabled = true;
  form.reset();

  success.classList.add('visible');

  setTimeout(() => {
    btn.innerHTML = '<span class="btn-text">Notify Me</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
    btn.style.background = '';
    btn.disabled = false;
  }, 3000);
}

// ── Animated Canvas Background ──
(function initCanvas() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H, orbs = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function makeOrb() {
    const colors = [
      'rgba(0,212,255,',
      'rgba(123,79,255,',
      'rgba(0,119,255,',
      'rgba(255,107,157,',
    ];
    const color = colors[Math.floor(Math.random() * colors.length)];
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      r: 120 + Math.random() * 220,
      alpha: 0.04 + Math.random() * 0.06,
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
  resize();
  initOrbs();
  loop();
})();

// ── Floating Particles ──
(function initParticles() {
  const container = document.getElementById('particles');
  if (!container) return;

  const colors = ['#00d4ff', '#7b4fff', '#0077ff', '#ff6b9d', '#fff'];

  for (let i = 0; i < 28; i++) {
    const p = document.createElement('div');
    p.classList.add('particle');

    const size  = 2 + Math.random() * 4;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const left  = Math.random() * 100;
    const dur   = 8 + Math.random() * 14;
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

// ── Intersection Observer: fade-in steps ──
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
    el.style.transition = `opacity 0.6s ease ${i * 0.07}s, transform 0.6s ease ${i * 0.07}s, border-color 0.3s ease, box-shadow 0.3s ease, background 0.3s ease`;
    obs.observe(el);
  });
})();
