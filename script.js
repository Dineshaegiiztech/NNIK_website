/**
 * NRI XPRESS — Enhanced JS (Sky Blue & Saffron)
 * Replace your existing js/script.js with this file
 */
'use strict';

/* ============================================================
   PRICING DATA
   ============================================================ */
const PARCEL_SURCHARGE = { documents: 0, parcel: 200, medicine: 350, grocery: 150, electronics: 500, clothing: 100 };

let googleSheetData = null;
let countryZoneMap = {};
let ratesTable = [];

async function fetchPricingData() {
    try {
        const url = "https://script.google.com/macros/s/AKfycbyNaXAh47_BCb6_c2FakBziXYNEK6p9H1Z39jKh-musZyV1eYpkCi7IGYZJPGaaLlujmA/exec";
        const res = await fetch(url);
        const data = await res.json();

        for (let i = 1; i < data.mapping.length; i++) {
            const countryName = data.mapping[i][0];
            const zone = data.mapping[i][1];
            if (countryName && zone) {
                countryZoneMap[countryName] = parseInt(zone, 10);
            }
        }

        populateCountrySelects();

        let customerRateIdx = data.rates.findIndex(row => row[0] && row[0].toString().includes("CUSTOMER RATE"));
        if (customerRateIdx !== -1) {
            let startIdx = customerRateIdx + 2;
            for (let i = startIdx; i < data.rates.length; i++) {
                const row = data.rates[i];
                const kg = parseFloat(row[1]);
                if (isNaN(kg)) break;

                let zones = {};
                for (let z = 1; z <= 14; z++) {
                    zones[z] = parseFloat(row[z + 1]);
                }
                ratesTable.push({ kg, zones });
            }
        }
        googleSheetData = true;
    } catch (e) {
        console.error("Error fetching pricing from Google Sheet", e);
    }
}

function populateCountrySelects() {
    const selects = [document.getElementById('fullCountry'), document.getElementById('quickCountry')];
    const countries = Object.keys(countryZoneMap).sort();

    selects.forEach(sel => {
        if (!sel) return;
        const currentVal = sel.value;
        sel.innerHTML = '<option value="">Select destination country…</option>';
        countries.forEach(c => {
            let opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            sel.appendChild(opt);
        });
        if (countries.includes(currentVal)) {
            sel.value = currentVal;
        }
    });
}

function calculatePrice(countryName, weightKg, parcelType) {
    if (!googleSheetData) {
        alert("Pricing data is still loading. Please try again in a few seconds.");
        return null;
    }

    const zone = countryZoneMap[countryName];
    if (!zone) return null;

    let w = parseFloat(weightKg) || 0.5;

    let matchedRow = ratesTable.find(r => r.kg >= w);
    if (!matchedRow) {
        return null;
    }

    let baseRate = matchedRow.zones[zone];
    if (!baseRate) return null;

    const finalRate = baseRate + (PARCEL_SURCHARGE[parcelType] || 0);

    let time = "4–7 business days";
    if ([12, 7, 14, 9].includes(zone)) time = "5–8 business days";
    if ([4, 1].includes(zone)) time = "3–5 business days";

    return {
        inr: Math.round(finalRate),
        usd: Math.round(finalRate / 94),
        time: time,
        country: countryName
    };
}

/* ============================================================
   NAVIGATION
   ============================================================ */
function initNavigation() {
    const burger = document.querySelector('.hamburger');
    const mobileNav = document.querySelector('.mobile-nav');
    if (burger && mobileNav) {
        burger.addEventListener('click', () => {
            burger.classList.toggle('open');
            mobileNav.classList.toggle('open');
        });
        mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
            burger.classList.remove('open'); mobileNav.classList.remove('open');
        }));
    }
    const page = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a, .mobile-nav a').forEach(a => {
        if (a.getAttribute('href') === page) a.classList.add('active');
    });
}

/* ============================================================
   SCROLL BEHAVIOURS
   ============================================================ */
function initScroll() {
    const btn = document.querySelector('.scroll-top');
    window.addEventListener('scroll', () => {
        if (btn) btn.classList.toggle('show', window.scrollY > 400);
    });
    if (btn) btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ============================================================
   LIVE STATUS (open / closed indicator)
   ============================================================ */
function initLiveStatus() {
    const el = document.querySelector('.live-status');
    if (!el) return;
    const dot = el.querySelector('.status-dot');
    const text = el.querySelector('.status-text');
    function update() {
        const now = new Date();
        const day = now.getDay();   // 0=Sun,6=Sat
        const hour = now.getHours();
        const isOpen =
            (day >= 1 && day <= 5 && hour >= 9 && hour < 19) ||
            (day === 6 && hour >= 9 && hour < 17);
        if (dot) { dot.className = 'status-dot ' + (isOpen ? 'open' : 'closed'); }
        if (text) { text.textContent = isOpen ? 'We\'re open now' : 'Currently closed'; }
    }
    update();
    setInterval(update, 60000);
}

/* ============================================================
   WORLD MAP (SVG animated routes)
   ============================================================ */
function initWorldMap() {
    const container = document.getElementById('worldMapSvg');
    if (!container) return;

    // Simplified world dots + animated routes from Coimbatore
    // Coimbatore approx position on 800x400 map: x≈580, y≈240
    const routes = [
        { to: [140, 130], label: 'USA', delay: 0 },
        { to: [390, 120], label: 'UK', delay: 0.4 },
        { to: [450, 135], label: 'Germany', delay: 0.7 },
        { to: [560, 185], label: 'UAE', delay: 1.0 },
        { to: [655, 245], label: 'Singapore', delay: 1.3 },
        { to: [720, 300], label: 'Australia', delay: 1.6 },
    ];
    const origin = [585, 238];

    let paths = '';
    let dots = '';
    let labels = '';

    routes.forEach(r => {
        const mx = (origin[0] + r.to[0]) / 2;
        const my = Math.min(origin[1], r.to[1]) - 60;
        const d = `M${origin[0]},${origin[1]} Q${mx},${my} ${r.to[0]},${r.to[1]}`;
        const len = 300; // approx path length

        paths += `<path d="${d}" fill="none" stroke="#F5A623" stroke-width="1.5"
      stroke-dasharray="${len}" stroke-dashoffset="${len}" opacity="0.7"
      style="animation: routeDash 1.8s ease forwards ${r.delay}s; stroke-dashoffset:${len}">
      <animate attributeName="stroke-dashoffset" from="${len}" to="0" dur="1.8s" begin="${r.delay}s" fill="freeze"/>
    </path>`;

        dots += `<circle cx="${r.to[0]}" cy="${r.to[1]}" r="5" fill="#F5A623" opacity="0"
      style="animation: fadeIn .4s ease forwards ${r.delay + 1.6}s">
      <animate attributeName="opacity" from="0" to="1" dur="0.4s" begin="${r.delay + 1.6}s" fill="freeze"/>
      <animate attributeName="r" values="4;7;4" dur="2s" begin="${r.delay + 2}s" repeatCount="indefinite"/>
    </circle>`;

        labels += `<text x="${r.to[0]}" y="${r.to[1] - 10}" text-anchor="middle"
      font-family="Mulish,sans-serif" font-size="10" fill="#AAC4E8" opacity="0"
      style="animation: fadeIn .4s ease forwards ${r.delay + 1.8}s">
      <animate attributeName="opacity" from="0" to="1" dur="0.4s" begin="${r.delay + 1.8}s" fill="freeze"/>
      ${r.label}
    </text>`;
    });

    container.innerHTML = `
  <svg viewBox="0 0 800 380" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:800px;">
    <!-- Background grid -->
    <defs>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M40,0 L0,0 0,40" fill="none" stroke="rgba(170,196,232,0.06)" stroke-width="0.5"/>
      </pattern>
    </defs>
    <rect width="800" height="380" fill="url(#grid)" rx="12"/>

    <!-- Continents (simplified) -->
    <!-- North America -->
    <ellipse cx="145" cy="150" rx="90" ry="65" fill="rgba(58,175,169,0.15)" stroke="rgba(58,175,169,0.3)" stroke-width="0.8"/>
    <!-- South America -->
    <ellipse cx="185" cy="275" rx="50" ry="70" fill="rgba(58,175,169,0.10)" stroke="rgba(58,175,169,0.2)" stroke-width="0.8"/>
    <!-- Europe -->
    <ellipse cx="390" cy="120" rx="55" ry="45" fill="rgba(58,175,169,0.12)" stroke="rgba(58,175,169,0.25)" stroke-width="0.8"/>
    <!-- Africa -->
    <ellipse cx="400" cy="230" rx="55" ry="80" fill="rgba(58,175,169,0.10)" stroke="rgba(58,175,169,0.2)" stroke-width="0.8"/>
    <!-- Middle East -->
    <ellipse cx="560" cy="185" rx="40" ry="35" fill="rgba(58,175,169,0.12)" stroke="rgba(58,175,169,0.25)" stroke-width="0.8"/>
    <!-- Asia -->
    <ellipse cx="620" cy="155" rx="100" ry="65" fill="rgba(58,175,169,0.12)" stroke="rgba(58,175,169,0.25)" stroke-width="0.8"/>
    <!-- Australia -->
    <ellipse cx="700" cy="295" rx="55" ry="40" fill="rgba(58,175,169,0.12)" stroke="rgba(58,175,169,0.25)" stroke-width="0.8"/>

    <!-- Animated route lines -->
    ${paths}

    <!-- Destination dots -->
    ${dots}

    <!-- Origin: Coimbatore -->
    <circle cx="${origin[0]}" cy="${origin[1]}" r="7" fill="#1B3A6B" stroke="#F5A623" stroke-width="2"/>
    <circle cx="${origin[0]}" cy="${origin[1]}" r="14" fill="none" stroke="rgba(245,166,35,0.3)" stroke-width="1">
      <animate attributeName="r" values="8;18;8" dur="2.5s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.6;0;0.6" dur="2.5s" repeatCount="indefinite"/>
    </circle>
    <text x="${origin[0]}" y="${origin[1] + 22}" text-anchor="middle"
      font-family="Mulish,sans-serif" font-size="11" fill="#F5A623" font-weight="700">Coimbatore</text>

    <!-- Destination labels -->
    ${labels}

    <!-- Title -->
    <text x="400" y="360" text-anchor="middle"
      font-family="Mulish,sans-serif" font-size="11" fill="rgba(170,196,232,0.5)">
      Shipping routes from Coimbatore to 100+ countries
    </text>
  </svg>`;
}

/* ============================================================
   JOURNEY STEPPER ANIMATION
   ============================================================ */
function initJourneyStepper() {
    const steps = document.querySelectorAll('.journey-step');
    if (!steps.length) return;
    let current = 0;
    function activate(i) {
        steps.forEach((s, idx) => {
            s.classList.remove('active', 'done');
            if (idx < i) s.classList.add('done');
            if (idx === i) s.classList.add('active');
        });
    }
    activate(0);
    setInterval(() => {
        current = (current + 1) % steps.length;
        activate(current);
    }, 2000);
}

/* ============================================================
   CALCULATORS
   ============================================================ */
function runCalculator(mode) {
    const pfx = mode === 'quick' ? 'quick' : 'full';
    const country = document.getElementById(pfx + 'Country')?.value;
    const weight = document.getElementById(pfx + 'Weight')?.value;
    const type = document.getElementById(pfx + 'Type')?.value;
    if (!country || !weight || !type) return;
    const r = calculatePrice(country, weight, type);
    if (!r) {
        if (parseFloat(weight) > 30) {
            alert("For weights above 30 KG, please contact us for a special quote.");
        }
        return;
    }
    const resultEl = document.getElementById(pfx + 'Result'); if (!resultEl) return;

    if (mode === 'quick') {
        document.getElementById('resultINR').textContent = `₹${r.inr.toLocaleString('en-IN')}`;
        document.getElementById('resultUSD').textContent = `~$${r.usd}`;
        document.getElementById('resultTime').textContent = r.time;
    } else {
        document.getElementById('fullResultINR').textContent = `₹${r.inr.toLocaleString('en-IN')}`;
        document.getElementById('fullResultUSD').textContent = `~$${r.usd}`;
        document.getElementById('fullResultTime').textContent = r.time;
        document.getElementById('fullResultCountry').textContent = r.country;
        const wa = document.getElementById('calcWhatsAppBtn');
        if (wa) wa.href = `https://wa.me/919025500725?text=${encodeURIComponent(`Hello NRI Xpress!\nDestination: ${r.country}\nWeight: ${weight}kg\nType: ${type}\nEstimated: ₹${r.inr.toLocaleString('en-IN')}\nPlease confirm exact rate.`)}`;
    }

    resultEl.classList.add('show');
    // Pop animation on result
    resultEl.style.animation = 'none';
    resultEl.offsetHeight;
    resultEl.style.animation = 'resultPop .45s cubic-bezier(.34,1.56,.64,1) forwards';
}

function initQuickCalculator() {
    const form = document.getElementById('quickCalcForm');
    if (!form) return;
    form.addEventListener('submit', e => { e.preventDefault(); runCalculator('quick'); });
    ['quickCountry', 'quickWeight', 'quickType'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', () => runCalculator('quick'));
    });
}

function initFullCalculator() {
    const form = document.getElementById('fullCalcForm');
    if (!form) return;
    form.addEventListener('submit', e => { e.preventDefault(); runCalculator('full'); });
    ['fullCountry', 'fullWeight', 'fullType'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', () => {
            if (document.getElementById('fullCountry')?.value &&
                document.getElementById('fullWeight')?.value &&
                document.getElementById('fullType')?.value) runCalculator('full');
        });
    });
}

/* ============================================================
   FAQ
   ============================================================ */
function initFAQ() {
    document.querySelectorAll('.faq-question').forEach(btn => {
        btn.addEventListener('click', () => {
            const isOpen = btn.classList.contains('open');
            document.querySelectorAll('.faq-question').forEach(b => {
                b.classList.remove('open');
                b.nextElementSibling?.classList.remove('open');
            });
            if (!isOpen) {
                btn.classList.add('open');
                btn.nextElementSibling?.classList.add('open');
            }
        });
    });
}

/* ============================================================
   CONTACT FORM
   ============================================================ */
function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;
    form.addEventListener('submit', e => {
        e.preventDefault(); let valid = true;
        form.querySelectorAll('.form-error').forEach(el => el.classList.remove('show'));
        const fields = [
            { id: 'contactName', msg: 'Please enter your name.' },
            { id: 'contactPhone', msg: 'Please enter your phone.', pattern: /^\+?[\d\s\-]{7,15}$/ },
            { id: 'contactEmail', msg: 'Please enter a valid email.', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
            { id: 'contactMessage', msg: 'Please enter your message.' },
        ];
        fields.forEach(({ id, msg, pattern }) => {
            const el = document.getElementById(id); if (!el) return;
            const v = el.value.trim();
            if (!v || (pattern && !pattern.test(v))) {
                const err = document.getElementById(id + 'Error');
                if (err) { err.textContent = msg; err.classList.add('show'); }
                el.style.borderColor = 'var(--red)'; valid = false;
            } else { el.style.borderColor = ''; }
        });
        if (valid) {
            const btn = form.querySelector('button[type="submit"]');
            if (btn) { btn.textContent = 'Sending…'; btn.disabled = true; }

            const formData = {
                name: document.getElementById('contactName')?.value.trim() || '',
                phone: document.getElementById('contactPhone')?.value.trim() || '',
                email: document.getElementById('contactEmail')?.value.trim() || '',
                destination: document.getElementById('contactDestination')?.value || '',
                service: document.getElementById('contactService')?.value || '',
                message: document.getElementById('contactMessage')?.value.trim() || '',
                _subject: "New Contact Form Submission - NRI Xpress"
            };

            const formspreeUrl = "https://formspree.io/f/xqewwlbb";

            fetch(formspreeUrl, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(formData)
            })
                .then(async response => {
                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        const errMsg = errorData.error || errorData.message || (await response.text().catch(() => 'Unknown Error'));
                        throw new Error(errMsg);
                    }
                    document.getElementById('formSuccess')?.classList.add('show');
                    form.reset();
                })
                .catch(error => {
                    console.error('Error submitting form:', error);
                    alert("Formspree Error: " + error.message + "\n\nPlease check your Formspree dashboard settings (like Email verification or Recaptcha).");
                })
                .finally(() => {
                    if (btn) { btn.textContent = '📨 Send Message'; btn.disabled = false; }
                    setTimeout(() => document.getElementById('formSuccess')?.classList.remove('show'), 6000);
                });
        }
    });
    form.querySelectorAll('.form-control-light').forEach(el => {
        el.addEventListener('input', () => {
            if (el.value.trim()) {
                el.style.borderColor = '';
                document.getElementById(el.id + 'Error')?.classList.remove('show');
            }
        });
    });
}

/* ============================================================
   BLOG FILTER
   ============================================================ */
function initBlogFilter() {
    const btns = document.querySelectorAll('.filter-btn');
    const cards = document.querySelectorAll('.blog-card');
    if (!btns.length) return;
    btns.forEach(btn => btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const cat = btn.dataset.cat;
        cards.forEach(c => {
            const show = cat === 'all' || c.dataset.cat === cat;
            c.style.display = show ? '' : 'none';
            if (show) { c.style.animation = 'none'; c.offsetHeight; c.style.animation = 'fadeUp .4s ease'; }
        });
    }));
}

/* ============================================================
   ANIMATED COUNTERS
   ============================================================ */
function animateCounter(el) {
    const target = parseInt(el.dataset.target, 10);
    const suffix = el.dataset.suffix || '';
    const duration = 2000, step = target / (duration / 16);
    let cur = 0;
    const t = setInterval(() => {
        cur += step;
        if (cur >= target) { el.textContent = target.toLocaleString() + suffix; clearInterval(t); }
        else el.textContent = Math.floor(cur).toLocaleString() + suffix;
    }, 16);
}

/* ============================================================
   SCROLL REVEAL + COUNTERS (IntersectionObserver)
   ============================================================ */
function initScrollReveal() {
    // Reveal animation
    const revealEls = document.querySelectorAll('.reveal, .service-card, .blog-card, .testimonial-card, .why-item, .stat-box, .team-card');
    const revealObs = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('visible');
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, i * 70);
                revealObs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    revealEls.forEach(el => {
        if (!el.classList.contains('reveal')) {
            el.style.opacity = '0';
            el.style.transform = 'translateY(22px)';
            el.style.transition = 'opacity .55s ease, transform .55s ease';
        }
        revealObs.observe(el);
    });

    // Counters
    const counters = document.querySelectorAll('[data-target]');
    const countObs = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting && !e.target.dataset.counted) {
                e.target.dataset.counted = 'true';
                animateCounter(e.target);
            }
        });
    }, { threshold: 0.5 });
    counters.forEach(c => countObs.observe(c));
}

/* ============================================================
   CARD TILT (mouse-tracking, CSS transform)
   ============================================================ */
function initCardTilt() {
    document.querySelectorAll('.service-card, .tilt-card').forEach(card => {
        card.addEventListener('mousemove', e => {
            const r = card.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width - 0.5;
            const y = (e.clientY - r.top) / r.height - 0.5;
            card.style.transform = `translateY(-6px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    });
}

/* ============================================================
   TESTIMONIAL CAROUSEL
   ============================================================ */
function initTestimonialCarousel() {
    const wrapper = document.querySelector('.testimonials-section .grid-3');
    if (!wrapper) return;
    const cards = Array.from(wrapper.querySelectorAll('.testimonial-card'));
    if (cards.length < 2) return;

    // Only activate on mobile widths
    if (window.innerWidth > 768) return;

    wrapper.style.display = 'block';
    wrapper.style.position = 'relative';
    cards.forEach((c, i) => {
        c.style.display = i === 0 ? 'block' : 'none';
        c.style.transition = 'opacity .4s ease';
    });

    let cur = 0;
    setInterval(() => {
        cards[cur].style.opacity = '0';
        setTimeout(() => { cards[cur].style.display = 'none'; }, 350);
        cur = (cur + 1) % cards.length;
        cards[cur].style.display = 'block';
        cards[cur].style.opacity = '0';
        setTimeout(() => { cards[cur].style.opacity = '1'; }, 20);
    }, 4000);
}

/* ============================================================
   WAVE DIVIDERS (inject into page)
   ============================================================ */
function injectWaveDividers() {
    // Insert a soft wave between trust-bar and calc section
    const calcSection = document.querySelector('.calc-section');
    if (calcSection && !calcSection.previousElementSibling?.classList.contains('wave-divider')) {
        const wave = document.createElement('div');
        wave.className = 'wave-divider';
        wave.innerHTML = `<svg viewBox="0 0 1440 40" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0,20 C360,40 1080,0 1440,20 L1440,40 L0,40 Z" fill="#1B3A6B"/>
    </svg>`;
        calcSection.parentNode.insertBefore(wave, calcSection);
    }
}

/* ============================================================
   HEADER HEIGHT COMPENSATION
   ============================================================ */
function compensateHeader() {
    const h = document.getElementById('site-header');
    if (h) document.documentElement.style.setProperty('--header-h', h.offsetHeight + 'px');
}

/* ============================================================
   INIT ALL
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
    fetchPricingData();
    initNavigation();
    initScroll();
    initLiveStatus();
    initFAQ();
    initContactForm();
    initBlogFilter();
    initScrollReveal();
    initCardTilt();
    initQuickCalculator();
    initFullCalculator();
    initWorldMap();
    initJourneyStepper();
    injectWaveDividers();
    compensateHeader();
    setTimeout(initTestimonialCarousel, 300);
});

window.addEventListener('resize', compensateHeader);