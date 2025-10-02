/* ================================
 * Rotana Portfolio – Full Script
 * - Smooth Scroll
 * - Hamburger Menu
 * - Dark/Light Mode (persisted)
 * - Scroll Reveal (IO + fallback)
 * - Canvas Weather: Rain / Snow / Both
 * - Ambient Sound Toggle (linked with weather)
 * ================================ */

const $  = (s, c=document) => c.querySelector(s);
const $$ = (s, c=document) => Array.from(c.querySelectorAll(s));

/* ---------------- Smooth Scroll ---------------- */
$$('a[href^="#"]').forEach(a=>{
  a.addEventListener('click', e=>{
    const target = $(a.getAttribute('href'));
    if(!target) return;
    e.preventDefault();
    target.scrollIntoView({behavior:'smooth', block:'start'});
    const nav = $('.nav-links'); nav?.classList.remove('active');
    const ham = $('.hamburger'); ham?.setAttribute('aria-expanded','false');
  });
});

/* ---------------- Mobile Nav ---------------- */
const hamburger = $('.hamburger');
const navLinks = $('.nav-links');
hamburger?.addEventListener('click', ()=>{
  const active = navLinks.classList.toggle('active');
  hamburger.setAttribute('aria-expanded', String(active));
});

/* ---------------- Dark / Light Mode ---------------- */
const DARK_KEY = 'prefers-dark-mode';
const darkToggle = $('#dark-toggle');

function applyDark(isDark){
  document.body.classList.toggle('dark-mode', isDark);
  darkToggle.textContent = isDark ? '☀️':'🌙';
}
function initTheme(){
  const saved = localStorage.getItem(DARK_KEY);
  const isDark = saved !== null ? saved === 'true'
    : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  applyDark(isDark);
}
darkToggle?.addEventListener('click', ()=>{
  const next = !document.body.classList.contains('dark-mode');
  applyDark(next);
  localStorage.setItem(DARK_KEY, String(next));
});
initTheme();

/* ---------------- Scroll Reveal ---------------- */
const reveals = $$('.reveal');
const activate = el => el.classList.add('active');

if('IntersectionObserver' in window){
  const io = new IntersectionObserver((entries,obs)=>{
    for(const ent of entries){
      if(ent.isIntersecting){ activate(ent.target); obs.unobserve(ent.target); }
    }
  }, {threshold:.15});
  reveals.forEach(el=>io.observe(el));
}else{
  const onScroll=()=>{
    const h = innerHeight;
    reveals.forEach(el=>{
      if(el.classList.contains('active')) return;
      const r = el.getBoundingClientRect();
      if(r.top < h*0.85) activate(el);
    });
  };
  addEventListener('scroll', onScroll, {passive:true});
  onScroll();
}

/* ---------------- Ambient Sound ---------------- */
const soundToggle = $('#sound-toggle');
let isSoundOn = false;

const rainAudio = new Audio('assets/sounds/rain.mp3');
const windAudio = new Audio('assets/sounds/snow.mp3');
[rainAudio, windAudio].forEach(a => { 
  a.loop = true; 
  a.volume = 0.45; 
});

function stopAllSounds() {
  [rainAudio, windAudio].forEach(a => {
    a.pause();
    a.currentTime = 0;
  });
}

async function playWeatherSound() {
  stopAllSounds();
  if (!isSoundOn) return;

  try {
    if (weatherMode === 'rain') {
      await rainAudio.play();
    } else if (weatherMode === 'snow') {
      await windAudio.play();
    } else if (weatherMode === 'both') {
      await rainAudio.play();
      await windAudio.play();
    }
    soundToggle.textContent = '🔊';
  } catch (err) {
    console.warn('Audio play blocked:', err);
    isSoundOn = false;
    soundToggle.textContent = '🔇';
  }
}

soundToggle?.addEventListener('click', async ()=>{
  isSoundOn = !isSoundOn;
  if (isSoundOn) {
    await playWeatherSound();
  } else {
    stopAllSounds();
    soundToggle.textContent = '🔇';
  }
});

/* ---------------- Canvas Weather (Rain + Snow) ---------------- */
const canvas = $('#bg-canvas');
const ctx = canvas?.getContext('2d');

let weatherMode = 'both'; // 'rain'|'snow'|'both'

if(canvas && ctx){
  function sizeCanvas(){
    const dpr = Math.max(1, Math.min(2, devicePixelRatio||1));
    const w = innerWidth, h = innerHeight;
    canvas.style.width = w+'px'; canvas.style.height = h+'px';
    canvas.width = Math.floor(w*dpr); canvas.height = Math.floor(h*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  sizeCanvas();

  const baseArea = 1280*720;
  const scaleCount = base => {
    const f = Math.min(1.75, Math.max(0.5, (innerWidth*innerHeight)/baseArea));
    return Math.round(base*f);
  };

  const colors = () => ({
    rain: document.body.classList.contains('dark-mode') ? 'rgba(200,220,255,0.7)' : 'rgba(120,150,200,0.8)',
    snow: 'rgba(255,255,255,0.95)'
  });

  let wind = 0, windTarget = 0;
  function updateWind(){
    if(Math.random() < 0.004){ windTarget = (Math.random()-0.5)*0.8; }
    wind += (windTarget - wind)*0.006;
  }

  let rainDrops = [];
  let snowFlakes = [];

  function resetRain(d){
    d.x = Math.random()*innerWidth;
    d.y = -20 - Math.random()*120;
    d.len = 12 + Math.random()*22;
    d.vy = 3.5 + Math.random()*5.5;
    d.vx = wind * 0.6;
  }
  function resetSnow(f){
    f.x = Math.random()*innerWidth;
    f.y = -f.r - Math.random()*100;
    f.r = 1.5 + Math.random()*2.5;
    f.vy = 0.4 + Math.random()*1.1;
    f.phase = Math.random()*Math.PI*2;
  }

  function initParticles(){
    rainDrops.length = 0; snowFlakes.length = 0;
    const rc = scaleCount(110), sc = scaleCount(90);
    for(let i=0;i<rc;i++){
      const d = {x:0,y:0,len:0,vy:0,vx:0}; resetRain(d); d.y = Math.random()*innerHeight; rainDrops.push(d);
    }
    for(let i=0;i<sc;i++){
      const f = {x:0,y:0,r:2,vy:0,phase:0}; resetSnow(f); f.y = Math.random()*innerHeight; snowFlakes.push(f);
    }
  }
  initParticles();

  const weatherToggle = $('#weather-toggle');
  function setWeather(next){
    weatherMode = next;
    weatherToggle.textContent = next==='both' ? '🌧️❄️' : next==='rain' ? '🌧️' : '❄️';
    if (isSoundOn) playWeatherSound();
  }
  weatherToggle?.addEventListener('click', ()=>{
    setWeather(weatherMode==='both' ? 'rain' : weatherMode==='rain' ? 'snow' : 'both');
  });

  function drawRain(){
    const col = colors().rain;
    ctx.lineWidth = 1; ctx.lineCap = 'round'; ctx.strokeStyle = col;
    ctx.beginPath();
    for(const d of rainDrops){
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x + d.vx*2, d.y + d.len);
    }
    ctx.stroke();
  }
  function updateRain(){
    for(const d of rainDrops){
      d.vx = wind * 0.6; d.x += d.vx; d.y += d.vy;
      if(d.y - d.len > innerHeight || d.x < -50 || d.x > innerWidth+50){ resetRain(d); }
    }
  }

  function drawSnow(){
    ctx.fillStyle = colors().snow;
    ctx.beginPath();
    for(const f of snowFlakes){
      ctx.moveTo(f.x,f.y);
      ctx.arc(f.x, f.y, f.r, 0, Math.PI*2);
    }
    ctx.fill();
  }
  function updateSnow(){
    for(const f of snowFlakes){
      f.phase += 0.015 + (f.r*0.003);
      const sway = Math.sin(f.phase)*(0.4 + f.r*0.2) + wind*0.5;
      f.x += sway; f.y += f.vy;
      if(f.y - f.r > innerHeight || f.x < -60 || f.x > innerWidth+60){ resetSnow(f); }
    }
  }

  function loop(){
    updateWind();
    ctx.clearRect(0,0,innerWidth,innerHeight);
    if(weatherMode==='rain' || weatherMode==='both'){ drawRain(); updateRain(); }
    if(weatherMode==='snow' || weatherMode==='both'){ drawSnow(); updateSnow(); }
    requestAnimationFrame(loop);
  }
  loop();

  let t;
  addEventListener('resize', ()=>{
    clearTimeout(t);
    t = setTimeout(()=>{ sizeCanvas(); initParticles(); }, 120);
  });

  new MutationObserver(()=>{}).observe(document.body,{attributes:true,attributeFilter:['class']});
}

/* ---------------- Contact Demo ---------------- */
const form = document.querySelector('.contact-form');
form?.addEventListener('submit', e=>{
  e.preventDefault();
  const data = new FormData(form);
  const name = data.get('name') || 'there';
  alert(`Thanks, ${name}! Your message was sent ✅`);
  form.reset();
});
/* ---------------- Extra Mobile Menu Enhancement ---------------- */
// បិទ menu បន្ទាប់ពីចុច link មួយ
$$('.nav-links a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('active');
    hamburger.setAttribute('aria-expanded', 'false');
  });
});

// បិទ menu ប្រសិនបើចុចក្រៅ navbar
document.addEventListener('click', (e) => {
  if (navLinks.classList.contains('active') && 
      !navLinks.contains(e.target) && 
      !hamburger.contains(e.target)) {
    navLinks.classList.remove('active');
    hamburger.setAttribute('aria-expanded', 'false');
  }
});
