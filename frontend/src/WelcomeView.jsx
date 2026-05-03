// // // import { useNavigate } from 'react-router-dom';
// // // import { Link } from 'react-router-dom';
// // // import { Container, Typography, Button } from '@mui/material';
// // // import bkgOne from '../assets/bkgOne.jpg';
// // // import Service from './Service';

// // // const WelcomeView = () => {
// // //     const navigate = useNavigate();

// // //     return (
// // //         <div 
// // //             className="welcome-view" 
// // //             style={{ 
// // //                 backgroundImage: `url(${bkgOne})`,
// // //                 backgroundSize: 'cover',
// // //                 backgroundPosition: 'center',
// // //                 height: '100vh',
// // //                 display: 'flex',
// // //                 alignItems: 'center',
// // //                 justifyContent: 'center',
// // //                 flexDirection: 'column'
// // //             }}
// // //         >
// // //             <Container>
// // //                 <Typography variant="h2" component="h1" gutterBottom>
// // //                     Welcome to Our App
// // //                 </Typography>
// // //                 <Button 
// // //                     variant="contained" 
// // //                     onClick={() => navigate('/services')}
// // //                 >
// // //                     Get Started
// // //                 </Button>
// // //             </Container>
// // //         </div>
// // //     );
// // // };

// // // export default WelcomeView;

// // import { useState, useEffect, useRef } from "react";
// // import { useNavigate } from "react-router-dom";
// // import bkgOne from "../assets/bkgOne.jpg";

// // const COLORS = {
// //   accent: "#00d4ff",
// //   accent2: "#7c3aed",
// //   gold: "#f0c040",
// //   text: "#e2eaf4",
// //   muted: "#8ba3bb",
// //   star: "#e8f4fd",
// //   bg: "#020b18",
// //   cardBg: "rgba(5,18,35,0.85)",
// // };

// // const globalStyles = `
// //   @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;400;500;600&family=Space+Mono:ital@0;1&display=swap');

// //   *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
// //   html { scroll-behavior: smooth; }

// //   body {
// //     font-family: 'Rajdhani', sans-serif;
// //     background: #020b18;
// //     color: #e2eaf4;
// //     overflow-x: hidden;
// //   }

// //   @keyframes fadeUp {
// //     from { opacity: 0; transform: translateY(24px); }
// //     to   { opacity: 1; transform: translateY(0); }
// //   }
// //   @keyframes fadeIn { to { opacity: 1; } }
// //   @keyframes bounce {
// //     0%, 100% { transform: rotate(45deg) translateY(0); }
// //     50%       { transform: rotate(45deg) translateY(5px); }
// //   }
// //   @keyframes scanlines {
// //     0% { background-position: 0 0; }
// //     100% { background-position: 0 4px; }
// //   }

// //   .exo-label {
// //     font-family: 'Space Mono', monospace;
// //     font-size: 0.8rem;
// //     letter-spacing: 0.35em;
// //     color: #00d4ff;
// //     text-transform: uppercase;
// //     margin-bottom: 1.4rem;
// //     opacity: 0;
// //     animation: fadeUp 0.8s 0.2s forwards;
// //   }
// //   .hero-title {
// //     font-family: 'Orbitron', monospace;
// //     font-size: clamp(3rem, 8vw, 6rem);
// //     font-weight: 900;
// //     letter-spacing: 0.06em;
// //     line-height: 1;
// //     background: linear-gradient(135deg, #ffffff 30%, #00d4ff 70%, #a78bfa 100%);
// //     -webkit-background-clip: text;
// //     -webkit-text-fill-color: transparent;
// //     background-clip: text;
// //     margin-bottom: 2.2rem;
// //     opacity: 0;
// //     animation: fadeUp 0.8s 0.5s forwards;
// //   }
// //   .slideshow-wrap {
// //     min-height: 80px;
// //     display: flex;
// //     align-items: center;
// //     justify-content: center;
// //     margin-bottom: 2.8rem;
// //     opacity: 0;
// //     animation: fadeUp 0.8s 0.9s forwards;
// //     position: relative;
// //   }
// //   .slide-text {
// //     font-family: 'Rajdhani', sans-serif;
// //     font-size: clamp(1rem, 2.2vw, 1.25rem);
// //     font-weight: 400;
// //     color: #e8f4fd;
// //     line-height: 1.6;
// //     max-width: 620px;
// //     position: absolute;
// //     opacity: 0;
// //     transition: opacity 0.7s ease;
// //     text-align: center;
// //   }
// //   .slide-text.active { opacity: 1; position: relative; }

// //   .btn-cta {
// //     display: inline-block;
// //     font-family: 'Orbitron', monospace;
// //     font-size: 0.85rem;
// //     font-weight: 700;
// //     letter-spacing: 0.12em;
// //     text-transform: uppercase;
// //     color: #020b18;
// //     background: linear-gradient(110deg, #00d4ff 0%, #a78bfa 100%);
// //     padding: 1rem 2.4rem;
// //     border-radius: 3px;
// //     border: none;
// //     cursor: pointer;
// //     text-decoration: none;
// //     position: relative;
// //     overflow: hidden;
// //     opacity: 0;
// //     animation: fadeUp 0.8s 1.2s forwards;
// //     transition: transform 0.2s, box-shadow 0.2s;
// //     box-shadow: 0 0 28px rgba(0,212,255,0.3);
// //   }
// //   .btn-cta::before {
// //     content: '';
// //     position: absolute;
// //     inset: 0;
// //     background: rgba(255,255,255,0.15);
// //     transform: translateX(-110%) skewX(-15deg);
// //     transition: transform 0.4s;
// //   }
// //   .btn-cta:hover::before { transform: translateX(110%) skewX(-15deg); }
// //   .btn-cta:hover {
// //     transform: translateY(-2px);
// //     box-shadow: 0 0 48px rgba(0,212,255,0.55);
// //   }

// //   .scroll-hint {
// //     position: absolute;
// //     bottom: 2.5rem;
// //     left: 50%;
// //     transform: translateX(-50%);
// //     z-index: 2;
// //     display: flex;
// //     flex-direction: column;
// //     align-items: center;
// //     gap: 6px;
// //     opacity: 0;
// //     animation: fadeIn 1s 2s forwards;
// //   }
// //   .scroll-hint span {
// //     font-size: 0.65rem;
// //     letter-spacing: 0.2em;
// //     color: #8ba3bb;
// //   }
// //   .scroll-arrow {
// //     width: 20px; height: 20px;
// //     border-right: 1.5px solid #00d4ff;
// //     border-bottom: 1.5px solid #00d4ff;
// //     transform: rotate(45deg);
// //     animation: bounce 1.6s infinite;
// //   }

// //   .section-title {
// //     font-family: 'Orbitron', monospace;
// //     font-size: clamp(2.4rem, 6vw, 4.5rem);
// //     font-weight: 900;
// //     letter-spacing: 0.1em;
// //     background: linear-gradient(135deg, #fff 20%, #00d4ff 80%);
// //     -webkit-background-clip: text;
// //     -webkit-text-fill-color: transparent;
// //     background-clip: text;
// //     margin-bottom: 0.6rem;
// //   }
// //   .section-sub {
// //     font-size: 1rem;
// //     color: #8ba3bb;
// //     letter-spacing: 0.2em;
// //     text-transform: uppercase;
// //     font-family: 'Space Mono', monospace;
// //     margin-bottom: 4rem;
// //   }

// //   /* FLIP CARD */
// //   .card-wrap {
// //     height: 360px;
// //     cursor: pointer;
// //     perspective: 1200px;
// //   }
// //   .card-inner {
// //     position: relative;
// //     width: 100%;
// //     height: 100%;
// //     transform-style: preserve-3d;
// //     transition: transform 0.65s cubic-bezier(0.4,0,0.2,1);
// //   }
// //   .card-wrap:hover .card-inner { transform: rotateY(180deg); }
// //   .card-face {
// //     position: absolute;
// //     inset: 0;
// //     backface-visibility: hidden;
// //     -webkit-backface-visibility: hidden;
// //     border-radius: 8px;
// //     border: 1px solid rgba(0,212,255,0.22);
// //     overflow: hidden;
// //     display: flex;
// //     flex-direction: column;
// //     align-items: center;
// //     justify-content: center;
// //     padding: 2rem;
// //     background: rgba(5,18,35,0.85);
// //     backdrop-filter: blur(12px);
// //   }
// //   .card-face::before {
// //     content: '';
// //     position: absolute;
// //     inset: 0;
// //     background: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,212,255,0.08) 0%, transparent 70%);
// //     pointer-events: none;
// //   }
// //   .card-face::after {
// //     content: '';
// //     position: absolute;
// //     top: 0; left: 0;
// //     width: 30px; height: 30px;
// //     border-top: 1.5px solid #00d4ff;
// //     border-left: 1.5px solid #00d4ff;
// //     border-radius: 8px 0 0 0;
// //   }
// //   .card-back {
// //     transform: rotateY(180deg);
// //     background: linear-gradient(135deg, rgba(0,30,60,0.95) 0%, rgba(30,5,60,0.95) 100%) !important;
// //     border-color: rgba(124,58,237,0.4) !important;
// //     justify-content: flex-start !important;
// //     text-align: left;
// //     gap: 1rem;
// //   }
// //   .card-icon {
// //     font-size: 3rem;
// //     margin-bottom: 1.2rem;
// //     filter: drop-shadow(0 0 12px #00d4ff);
// //   }
// //   .card-title {
// //     font-family: 'Orbitron', monospace;
// //     font-size: 1.1rem;
// //     font-weight: 700;
// //     letter-spacing: 0.1em;
// //     color: #fff;
// //     margin-bottom: 0.5rem;
// //   }
// //   .card-tag {
// //     font-family: 'Space Mono', monospace;
// //     font-size: 0.65rem;
// //     letter-spacing: 0.2em;
// //     color: #00d4ff;
// //     text-transform: uppercase;
// //   }
// //   .card-back .card-title {
// //     font-size: 0.9rem;
// //     color: #00d4ff;
// //     margin-bottom: 0.2rem;
// //   }
// //   .card-back-p {
// //     font-size: 0.95rem;
// //     line-height: 1.65;
// //     color: #e8f4fd;
// //     font-weight: 300;
// //     margin: 0;
// //   }
// //   .card-back-ul {
// //     list-style: none;
// //     padding: 0;
// //     display: flex;
// //     flex-direction: column;
// //     gap: 6px;
// //     margin: 0;
// //   }
// //   .card-back-ul li {
// //     font-size: 0.88rem;
// //     color: #e2eaf4;
// //     padding-left: 1rem;
// //     position: relative;
// //     line-height: 1.5;
// //   }
// //   .card-back-ul li::before {
// //     content: '▸';
// //     position: absolute;
// //     left: 0;
// //     color: #00d4ff;
// //     font-size: 0.75rem;
// //     top: 2px;
// //   }
// //   .card-link {
// //     display: inline-flex;
// //     align-items: center;
// //     gap: 6px;
// //     margin-top: auto;
// //     font-family: 'Space Mono', monospace;
// //     font-size: 0.72rem;
// //     letter-spacing: 0.12em;
// //     color: #00d4ff;
// //     text-decoration: none;
// //     border-bottom: 1px solid rgba(0,212,255,0.3);
// //     padding-bottom: 2px;
// //     transition: color 0.2s, border-color 0.2s;
// //   }
// //   .card-link:hover { color: #fff; border-color: #fff; }
// // `;

// // /* ── StarField Canvas ── */
// // function StarField() {
// //   const canvasRef = useRef(null);
// //   useEffect(() => {
// //     const c = canvasRef.current;
// //     const ctx = c.getContext("2d");
// //     let W, H, stars = [], raf;
// //     const resize = () => {
// //       W = c.width = window.innerWidth;
// //       H = c.height = window.innerHeight;
// //     };
// //     const mk = () => {
// //       stars = Array.from({ length: 260 }, () => ({
// //         x: Math.random() * W, y: Math.random() * H,
// //         r: Math.random() * 1.3 + 0.2,
// //         a: Math.random(),
// //         s: Math.random() * 0.004 + 0.001,
// //       }));
// //     };
// //     const draw = () => {
// //       ctx.clearRect(0, 0, W, H);
// //       stars.forEach(s => {
// //         s.a += s.s;
// //         if (s.a > 1) s.a = 0;
// //         ctx.beginPath();
// //         ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
// //         ctx.fillStyle = `rgba(200,220,255,${Math.sin(s.a * Math.PI) * 0.8 + 0.2})`;
// //         ctx.fill();
// //       });
// //       raf = requestAnimationFrame(draw);
// //     };
// //     resize(); mk(); draw();
// //     window.addEventListener("resize", () => { resize(); mk(); });
// //     return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
// //   }, []);
// //   return (
// //     <canvas ref={canvasRef} style={{
// //       position: "fixed", inset: 0, zIndex: 0,
// //       pointerEvents: "none", opacity: 0.5,
// //     }} />
// //   );
// // }

// // /* ── Slideshow ── */
// // function Slideshow() {
// //   const [cur, setCur] = useState(0);
// //   const slides = [
// //     <>Direct image detection with starshade and generalized fits input with our novel{" "}
// //       <strong style={{ color: COLORS.accent }}>Rev CNN</strong> and Path trajectory unique model</>,
// //     <>Transit Detection with our{" "}
// //       <strong style={{ color: COLORS.gold }}>XGBoost model</strong> including the period days</>,
// //   ];
// //   useEffect(() => {
// //     const t = setInterval(() => setCur(c => (c + 1) % slides.length), 4200);
// //     return () => clearInterval(t);
// //   }, []);
// //   return (
// //     <div className="slideshow-wrap">
// //       {slides.map((s, i) => (
// //         <p key={i} className={`slide-text${cur === i ? " active" : ""}`}>{s}</p>
// //       ))}
// //     </div>
// //   );
// // }

// // /* ── FlipCard ── */
// // function FlipCard({ front, back, onClick }) {
// //   return (
// //     <div className="card-wrap" onClick={onClick}>
// //       <div className="card-inner">
// //         <div className="card-face" style={front.faceStyle}>
// //           <div className="card-icon" style={front.iconStyle}>{front.icon}</div>
// //           <div className="card-title">{front.title}</div>
// //           <div className="card-tag" style={front.tagStyle}>{front.tag}</div>
// //         </div>
// //         <div className="card-face card-back" style={back.faceStyle}>
// //           <div className="card-title" style={back.titleStyle}>{back.title}</div>
// //           <p className="card-back-p">{back.desc}</p>
// //           <ul className="card-back-ul">
// //             {back.bullets.map((b, i) => <li key={i} style={b.style}>{b.text}</li>)}
// //           </ul>
// //           <a className="card-link" href={back.href} target="_blank"
// //             rel="noopener noreferrer"
// //             style={back.linkStyle}
// //             onClick={e => e.stopPropagation()}>
// //             Launch module →
// //           </a>
// //         </div>
// //       </div>
// //     </div>
// //   );
// // }

// // /* ── Main App ── */
// // export default function ExodiosApp() {
// //   const heroBgRef = useRef(null);
// //   const navigate = useNavigate();

// //   useEffect(() => {
// //     const onMove = e => {
// //       if (!heroBgRef.current) return;
// //       const x = (e.clientX / window.innerWidth - 0.5) * 6;
// //       const y = (e.clientY / window.innerHeight - 0.5) * 4;
// //       heroBgRef.current.style.transform = `scale(1.04) translate(${x}px,${y}px)`;
// //     };
// //     document.addEventListener("mousemove", onMove);
// //     return () => document.removeEventListener("mousemove", onMove);
// //   }, []);

// //   const cards = [
// //     {
// //       front: {
// //         icon: "🔭",
// //         iconStyle: { filter: `drop-shadow(0 0 12px ${COLORS.accent})` },
// //         title: "Direct Imaging",
// //         tag: "Rev CNN · Starshade · Path Trajectory",
// //         tagStyle: {},
// //         faceStyle: {},
// //       },
// //       back: {
// //         faceStyle: {},
// //         titleStyle: { color: COLORS.accent },
// //         title: "Direct Imaging Module",
// //         desc: "High-contrast direct detection using starshade optics and generalized FITS input processing.",
// //         bullets: [
// //           { text: "Rev CNN — novel residual encoder-vision architecture" },
// //           { text: "Generalized FITS file ingestion pipeline" },
// //           { text: "Starshade occulter suppression support" },
// //           { text: "Path trajectory prediction for candidate objects" },
// //           { text: "Sub-arcsecond angular separation detection" },
// //         ],
// //         href: "https://exosynergy-direct.example.com",
// //         linkStyle: {},
// //       },
// //       onClick: () => window.open("https://exosynergy-direct.example.com", "_blank"),
// //     },
// //     {
// //       front: {
// //         icon: "📈",
// //         iconStyle: { filter: "drop-shadow(0 0 12px #a78bfa)" },
// //         title: "Transit Detection",
// //         tag: "XGBoost · Period Analysis · Lightcurve",
// //         tagStyle: { color: COLORS.gold },
// //         faceStyle: { borderColor: "rgba(124,58,237,0.3)" },
// //       },
// //       back: {
// //         faceStyle: {
// //           background: "linear-gradient(135deg, rgba(0,20,50,0.97) 0%, rgba(10,0,40,0.97) 100%)",
// //           borderColor: "rgba(240,192,64,0.35)",
// //         },
// //         titleStyle: { color: COLORS.gold },
// //         title: "Transit Detection Module",
// //         desc: "Photometric transit identification using gradient-boosted ensemble learning over stellar lightcurves.",
// //         bullets: [
// //           { text: "XGBoost classifier trained on Kepler & TESS data" },
// //           { text: "Automated period-day estimation from flux dips" },
// //           { text: "False-positive discrimination pipeline" },
// //           { text: "Multi-target detrending and normalization" },
// //           { text: "Exportable ephemeris and candidate reports" },
// //         ],
// //         href: "https://exosynergy-transit.example.com",
// //         linkStyle: { color: COLORS.gold, borderColor: "rgba(240,192,64,0.4)" },
// //       },
// //       onClick: () => window.open("https://exosynergy-transit.example.com", "_blank"),
// //     },
// //   ];

// //   return (
// //     <>
// //       <style>{globalStyles}</style>

// //       {/* Scanline overlay */}
// //       <div style={{
// //         position: "fixed", inset: 0, zIndex: 9999, pointerEvents: "none",
// //         background: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.04) 2px,rgba(0,0,0,0.04) 4px)",
// //       }} />

// //       <StarField />

// //       {/* ── HERO ── */}
// //       <section style={{
// //         position: "relative", minHeight: "100vh",
// //         display: "flex", flexDirection: "column",
// //         alignItems: "center", justifyContent: "center",
// //         textAlign: "center", overflow: "hidden",
// //       }}>
// //         {/* BG */}
// //         <div ref={heroBgRef} style={{
// //           position: "absolute", inset: 0,
// //           background: `
// //             radial-gradient(ellipse 120% 80% at 50% 30%, rgba(0,60,120,0.55) 0%, transparent 65%),
// //             radial-gradient(ellipse 60% 60% at 80% 70%, rgba(124,58,237,0.18) 0%, transparent 60%),
// //             url(${bkgOne}) center/cover no-repeat
// //           `,
// //           transform: "scale(1.04)",
// //           zIndex: 0,
// //         }}>
// //           <div style={{
// //             position: "absolute", inset: 0,
// //             background: "linear-gradient(to bottom, rgba(2,11,24,0.3) 0%, rgba(2,11,24,0.6) 80%, #020b18 100%)",
// //           }} />
// //         </div>

// //         {/* Content */}
// //         <div style={{ position: "relative", zIndex: 2, padding: "2rem", maxWidth: 820 }}>
// //           <p className="exo-label">EXOSYNERGY&nbsp;&nbsp;presents</p>
// //           <h1 className="hero-title">EXODIOS</h1>
// //           <Slideshow />
// //           <button className="btn-cta" onClick={() => navigate("/services")}>Get started with Exodios</button>
// //         </div>

// //         {/* Scroll hint */}
// //         <div className="scroll-hint">
// //           <span>explore</span>
// //           <div className="scroll-arrow" />
// //         </div>
// //       </section>

// //       {/* ── EXODIOS SECTION ── */}
// //       <section id="exodios" style={{
// //         position: "relative",
// //         padding: "7rem 2rem 6rem",
// //         textAlign: "center",
// //         background: "linear-gradient(180deg, #020b18 0%, #030f22 100%)",
// //       }}>
// //         {/* top line */}
// //         <div style={{
// //           position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
// //           width: 1, height: 80,
// //           background: `linear-gradient(to bottom, transparent, ${COLORS.accent})`,
// //         }} />

// //         <h2 className="section-title">EXODIOS</h2>
// //         <p className="section-sub">Exoplanet Detection Intelligence Operating System</p>

// //         <div style={{
// //           display: "grid",
// //           gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
// //           gap: "2rem",
// //           maxWidth: 900,
// //           margin: "0 auto",
// //         }}>
// //           {cards.map((card, i) => (
// //             <FlipCard key={i} {...card} />
// //           ))}
// //         </div>
// //       </section>

// //       {/* ── FOOTER ── */}
// //       <footer style={{
// //         textAlign: "center",
// //         padding: "2.5rem 1rem",
// //         fontFamily: "'Space Mono', monospace",
// //         fontSize: "0.68rem",
// //         color: "rgba(139,163,187,0.4)",
// //         letterSpacing: "0.15em",
// //         borderTop: "1px solid rgba(0,212,255,0.06)",
// //       }}>
// //         © 2025 EXOSYNERGY &nbsp;·&nbsp; EXODIOS PLATFORM &nbsp;·&nbsp; ALL RIGHTS RESERVED
// //       </footer>
// //     </>
// //   );
// // }

// import { useState, useEffect, useRef } from "react";
// import { useNavigate } from "react-router-dom";
// import bkgOne from "../assets/bkgOne.jpg";

// const COLORS = {
//   accent: "#00d4ff",
//   accent2: "#7c3aed",
//   gold: "#f0c040",
//   text: "#e2eaf4",
//   muted: "#8ba3bb",
//   star: "#e8f4fd",
//   bg: "#020b18",
//   cardBg: "rgba(5,18,35,0.85)",
// };

// const globalStyles = `
//   @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;400;500;600&family=Space+Mono:ital@0;1&display=swap');

//   *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
//   html { scroll-behavior: smooth; }

//   body {
//     font-family: 'Rajdhani', sans-serif;
//     background: #020b18;
//     color: #e2eaf4;
//     overflow-x: hidden;
//   }

//   @keyframes fadeUp {
//     from { opacity: 0; transform: translateY(24px); }
//     to   { opacity: 1; transform: translateY(0); }
//   }
//   @keyframes fadeIn { to { opacity: 1; } }
//   @keyframes bounce {
//     0%, 100% { transform: rotate(45deg) translateY(0); }
//     50%       { transform: rotate(45deg) translateY(5px); }
//   }
//   @keyframes scanlines {
//     0% { background-position: 0 0; }
//     100% { background-position: 0 4px; }
//   }

//   .exo-label {
//     font-family: 'Space Mono', monospace;
//     font-size: 0.8rem;
//     letter-spacing: 0.35em;
//     color: #00d4ff;
//     text-transform: uppercase;
//     margin-bottom: 1.4rem;
//     opacity: 0;
//     animation: fadeUp 0.8s 0.2s forwards;
//   }
//   .hero-title {
//     font-family: 'Orbitron', monospace;
//     font-size: clamp(3rem, 8vw, 6rem);
//     font-weight: 900;
//     letter-spacing: 0.06em;
//     line-height: 1;
//     background: linear-gradient(135deg, #ffffff 30%, #00d4ff 70%, #a78bfa 100%);
//     -webkit-background-clip: text;
//     -webkit-text-fill-color: transparent;
//     background-clip: text;
//     margin-bottom: 2.2rem;
//     opacity: 0;
//     animation: fadeUp 0.8s 0.5s forwards;
//   }
//   .slideshow-wrap {
//     min-height: 80px;
//     display: flex;
//     align-items: center;
//     justify-content: center;
//     margin-bottom: 2.8rem;
//     opacity: 0;
//     animation: fadeUp 0.8s 0.9s forwards;
//     position: relative;
//   }
//   .slide-text {
//     font-family: 'Rajdhani', sans-serif;
//     font-size: clamp(1rem, 2.2vw, 1.25rem);
//     font-weight: 400;
//     color: #e8f4fd;
//     line-height: 1.6;
//     max-width: 620px;
//     position: absolute;
//     opacity: 0;
//     transition: opacity 0.7s ease;
//     text-align: center;
//   }
//   .slide-text.active { opacity: 1; position: relative; }

//   .btn-cta {
//     display: inline-block;
//     font-family: 'Orbitron', monospace;
//     font-size: 0.85rem;
//     font-weight: 700;
//     letter-spacing: 0.12em;
//     text-transform: uppercase;
//     color: #020b18;
//     background: linear-gradient(110deg, #00d4ff 0%, #a78bfa 100%);
//     padding: 1rem 2.4rem;
//     border-radius: 3px;
//     border: none;
//     cursor: pointer;
//     text-decoration: none;
//     position: relative;
//     overflow: hidden;
//     opacity: 0;
//     animation: fadeUp 0.8s 1.2s forwards;
//     transition: transform 0.2s, box-shadow 0.2s;
//     box-shadow: 0 0 28px rgba(0,212,255,0.3);
//   }
//   .btn-cta::before {
//     content: '';
//     position: absolute;
//     inset: 0;
//     background: rgba(255,255,255,0.15);
//     transform: translateX(-110%) skewX(-15deg);
//     transition: transform 0.4s;
//   }
//   .btn-cta:hover::before { transform: translateX(110%) skewX(-15deg); }
//   .btn-cta:hover {
//     transform: translateY(-2px);
//     box-shadow: 0 0 48px rgba(0,212,255,0.55);
//   }

//   .scroll-hint {
//     position: absolute;
//     bottom: 2.5rem;
//     left: 50%;
//     transform: translateX(-50%);
//     z-index: 2;
//     display: flex;
//     flex-direction: column;
//     align-items: center;
//     gap: 6px;
//     opacity: 0;
//     animation: fadeIn 1s 2s forwards;
//   }
//   .scroll-hint span {
//     font-size: 0.65rem;
//     letter-spacing: 0.2em;
//     color: #8ba3bb;
//   }
//   .scroll-arrow {
//     width: 20px; height: 20px;
//     border-right: 1.5px solid #00d4ff;
//     border-bottom: 1.5px solid #00d4ff;
//     transform: rotate(45deg);
//     animation: bounce 1.6s infinite;
//   }

//   .section-title {
//     font-family: 'Orbitron', monospace;
//     font-size: clamp(2.4rem, 6vw, 4.5rem);
//     font-weight: 900;
//     letter-spacing: 0.1em;
//     background: linear-gradient(135deg, #fff 20%, #00d4ff 80%);
//     -webkit-background-clip: text;
//     -webkit-text-fill-color: transparent;
//     background-clip: text;
//     margin-bottom: 0.6rem;
//   }
//   .section-sub {
//     font-size: 1rem;
//     color: #8ba3bb;
//     letter-spacing: 0.2em;
//     text-transform: uppercase;
//     font-family: 'Space Mono', monospace;
//     margin-bottom: 4rem;
//   }

//   /* FLIP CARD */
//   .card-wrap {
//     height: 360px;
//     cursor: pointer;
//     perspective: 1200px;
//   }
//   .card-inner {
//     position: relative;
//     width: 100%;
//     height: 100%;
//     transform-style: preserve-3d;
//     transition: transform 0.65s cubic-bezier(0.4,0,0.2,1);
//   }
//   .card-wrap:hover .card-inner { transform: rotateY(180deg); }
//   .card-face {
//     position: absolute;
//     inset: 0;
//     backface-visibility: hidden;
//     -webkit-backface-visibility: hidden;
//     border-radius: 8px;
//     border: 1px solid rgba(0,212,255,0.22);
//     overflow: hidden;
//     display: flex;
//     flex-direction: column;
//     align-items: center;
//     justify-content: center;
//     padding: 2rem;
//     background: rgba(5,18,35,0.85);
//     backdrop-filter: blur(12px);
//   }
//   .card-face::before {
//     content: '';
//     position: absolute;
//     inset: 0;
//     background: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,212,255,0.08) 0%, transparent 70%);
//     pointer-events: none;
//   }
//   .card-face::after {
//     content: '';
//     position: absolute;
//     top: 0; left: 0;
//     width: 30px; height: 30px;
//     border-top: 1.5px solid #00d4ff;
//     border-left: 1.5px solid #00d4ff;
//     border-radius: 8px 0 0 0;
//   }
//   .card-back {
//     transform: rotateY(180deg);
//     background: linear-gradient(135deg, rgba(0,30,60,0.95) 0%, rgba(30,5,60,0.95) 100%) !important;
//     border-color: rgba(124,58,237,0.4) !important;
//     justify-content: flex-start !important;
//     text-align: left;
//     gap: 1rem;
//   }
//   .card-icon {
//     font-size: 3rem;
//     margin-bottom: 1.2rem;
//     filter: drop-shadow(0 0 12px #00d4ff);
//   }
//   .card-title {
//     font-family: 'Orbitron', monospace;
//     font-size: 1.1rem;
//     font-weight: 700;
//     letter-spacing: 0.1em;
//     color: #fff;
//     margin-bottom: 0.5rem;
//   }
//   .card-tag {
//     font-family: 'Space Mono', monospace;
//     font-size: 0.65rem;
//     letter-spacing: 0.2em;
//     color: #00d4ff;
//     text-transform: uppercase;
//   }
//   .card-back .card-title {
//     font-size: 0.9rem;
//     color: #00d4ff;
//     margin-bottom: 0.2rem;
//   }
//   .card-back-p {
//     font-size: 0.95rem;
//     line-height: 1.65;
//     color: #e8f4fd;
//     font-weight: 300;
//     margin: 0;
//   }
//   .card-back-ul {
//     list-style: none;
//     padding: 0;
//     display: flex;
//     flex-direction: column;
//     gap: 6px;
//     margin: 0;
//   }
//   .card-back-ul li {
//     font-size: 0.88rem;
//     color: #e2eaf4;
//     padding-left: 1rem;
//     position: relative;
//     line-height: 1.5;
//   }
//   .card-back-ul li::before {
//     content: '▸';
//     position: absolute;
//     left: 0;
//     color: #00d4ff;
//     font-size: 0.75rem;
//     top: 2px;
//   }
//   .card-link {
//     display: inline-flex;
//     align-items: center;
//     gap: 6px;
//     margin-top: auto;
//     font-family: 'Space Mono', monospace;
//     font-size: 0.72rem;
//     letter-spacing: 0.12em;
//     color: #00d4ff;
//     text-decoration: none;
//     border-bottom: 1px solid rgba(0,212,255,0.3);
//     padding-bottom: 2px;
//     transition: color 0.2s, border-color 0.2s;
//   }
//   .card-link:hover { color: #fff; border-color: #fff; }
// `;

// /* ── StarField Canvas ── */
// function StarField() {
//   const canvasRef = useRef(null);
//   useEffect(() => {
//     const c = canvasRef.current;
//     const ctx = c.getContext("2d");
//     let W, H, stars = [], raf;
//     const resize = () => {
//       W = c.width = window.innerWidth;
//       H = c.height = window.innerHeight;
//     };
//     const mk = () => {
//       stars = Array.from({ length: 260 }, () => ({
//         x: Math.random() * W, y: Math.random() * H,
//         r: Math.random() * 1.3 + 0.2,
//         a: Math.random(),
//         s: Math.random() * 0.004 + 0.001,
//       }));
//     };
//     const draw = () => {
//       ctx.clearRect(0, 0, W, H);
//       stars.forEach(s => {
//         s.a += s.s;
//         if (s.a > 1) s.a = 0;
//         ctx.beginPath();
//         ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
//         ctx.fillStyle = `rgba(200,220,255,${Math.sin(s.a * Math.PI) * 0.8 + 0.2})`;
//         ctx.fill();
//       });
//       raf = requestAnimationFrame(draw);
//     };
//     resize(); mk(); draw();
//     window.addEventListener("resize", () => { resize(); mk(); });
//     return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
//   }, []);
//   return (
//     <canvas ref={canvasRef} style={{
//       position: "fixed", inset: 0, zIndex: 0,
//       pointerEvents: "none", opacity: 0.5,
//     }} />
//   );
// }

// /* ── Slideshow ── */
// function Slideshow() {
//   const [cur, setCur] = useState(0);
//   const slides = [
//     <>Direct image detection with starshade and generalized fits input with our novel{" "}
//       <strong style={{ color: COLORS.accent }}>Rev CNN</strong> and Path trajectory unique model</>,
//     <>Transit Detection with our{" "}
//       <strong style={{ color: COLORS.gold }}>XGBoost model</strong> including the period days</>,
//   ];
//   useEffect(() => {
//     const t = setInterval(() => setCur(c => (c + 1) % slides.length), 4200);
//     return () => clearInterval(t);
//   }, []);
//   return (
//     <div className="slideshow-wrap">
//       {slides.map((s, i) => (
//         <p key={i} className={`slide-text${cur === i ? " active" : ""}`}>{s}</p>
//       ))}
//     </div>
//   );
// }

// /* ── FlipCard ── */
// function FlipCard({ front, back, onClick }) {
//   return (
//     <div className="card-wrap" onClick={onClick}>
//       <div className="card-inner">
//         <div className="card-face" style={front.faceStyle}>
//           <div className="card-icon" style={front.iconStyle}>{front.icon}</div>
//           <div className="card-title">{front.title}</div>
//           <div className="card-tag" style={front.tagStyle}>{front.tag}</div>
//         </div>
//         <div className="card-face card-back" style={back.faceStyle}>
//           <div className="card-title" style={back.titleStyle}>{back.title}</div>
//           <p className="card-back-p">{back.desc}</p>
//           <ul className="card-back-ul">
//             {back.bullets.map((b, i) => <li key={i} style={b.style}>{b.text}</li>)}
//           </ul>
//           <a className="card-link" href={back.href} target="_blank"
//             rel="noopener noreferrer"
//             style={back.linkStyle}
//             onClick={e => e.stopPropagation()}>
//             Launch module →
//           </a>
//         </div>
//       </div>
//     </div>
//   );
// }

// /* ── Main App ── */
// export default function ExodiosApp() {
//   const heroBgRef = useRef(null);
//   const navigate = useNavigate();

//   useEffect(() => {
//     const onMove = e => {
//       if (!heroBgRef.current) return;
//       const x = (e.clientX / window.innerWidth - 0.5) * 6;
//       const y = (e.clientY / window.innerHeight - 0.5) * 4;
//       heroBgRef.current.style.transform = `scale(1.04) translate(${x}px,${y}px)`;
//     };
//     document.addEventListener("mousemove", onMove);
//     return () => document.removeEventListener("mousemove", onMove);
//   }, []);

//   const cards = [
//     {
//       front: {
//         icon: "🔭",
//         iconStyle: { filter: `drop-shadow(0 0 12px ${COLORS.accent})` },
//         title: "Direct Imaging",
//         tag: "Rev CNN · Starshade · Path Trajectory",
//         tagStyle: {},
//         faceStyle: {},
//       },
//       back: {
//         faceStyle: {},
//         titleStyle: { color: COLORS.accent },
//         title: "Direct Imaging Module",
//         desc: "High-contrast direct detection using starshade optics and generalized FITS input processing.",
//         bullets: [
//           { text: "Rev CNN — novel residual encoder-vision architecture" },
//           { text: "Generalized FITS file ingestion pipeline" },
//           { text: "Starshade occulter suppression support" },
//           { text: "Path trajectory prediction for candidate objects" },
//           { text: "Sub-arcsecond angular separation detection" },
//         ],
//         href: "https://exosynergy-direct.example.com",
//         linkStyle: {},
//       },
//       onClick: () => window.open("https://exosynergy-direct.example.com", "_blank"),
//     },
//     {
//       front: {
//         icon: "📈",
//         iconStyle: { filter: "drop-shadow(0 0 12px #a78bfa)" },
//         title: "Transit Detection",
//         tag: "XGBoost · Period Analysis · Lightcurve",
//         tagStyle: { color: COLORS.gold },
//         faceStyle: { borderColor: "rgba(124,58,237,0.3)" },
//       },
//       back: {
//         faceStyle: {
//           background: "linear-gradient(135deg, rgba(0,20,50,0.97) 0%, rgba(10,0,40,0.97) 100%)",
//           borderColor: "rgba(240,192,64,0.35)",
//         },
//         titleStyle: { color: COLORS.gold },
//         title: "Transit Detection Module",
//         desc: "Photometric transit identification using gradient-boosted ensemble learning over stellar lightcurves.",
//         bullets: [
//           { text: "XGBoost classifier trained on Kepler & TESS data" },
//           { text: "Automated period-day estimation from flux dips" },
//           { text: "False-positive discrimination pipeline" },
//           { text: "Multi-target detrending and normalization" },
//           { text: "Exportable ephemeris and candidate reports" },
//         ],
//         href: "https://exosynergy-transit.example.com",
//         linkStyle: { color: COLORS.gold, borderColor: "rgba(240,192,64,0.4)" },
//       },
//       onClick: () => window.open("https://exosynergy-transit.example.com", "_blank"),
//     },
//   ];

//   return (
//     <>
//       <style>{globalStyles}</style>

//       {/* Scanline overlay */}
//       <div style={{
//         position: "fixed", inset: 0, zIndex: 9999, pointerEvents: "none",
//         background: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.04) 2px,rgba(0,0,0,0.04) 4px)",
//       }} />

//       <StarField />

//       {/* ── HERO ── */}
//       <section style={{
//         position: "relative", minHeight: "100vh",
//         display: "flex", flexDirection: "column",
//         alignItems: "center", justifyContent: "center",
//         textAlign: "center", overflow: "hidden",
//       }}>
//         {/* BG */}
//         <div ref={heroBgRef} style={{
//           position: "absolute", inset: 0,
//           background: `
//             radial-gradient(ellipse 120% 80% at 50% 30%, rgba(0,60,120,0.55) 0%, transparent 65%),
//             radial-gradient(ellipse 60% 60% at 80% 70%, rgba(124,58,237,0.18) 0%, transparent 60%),
//             url(${bkgOne}) center/cover no-repeat
//           `,
//           transform: "scale(1.04)",
//           zIndex: 0,
//         }}>
//           <div style={{
//             position: "absolute", inset: 0,
//             background: "linear-gradient(to bottom, rgba(2,11,24,0.3) 0%, rgba(2,11,24,0.6) 80%, #020b18 100%)",
//           }} />
//         </div>

//         {/* Content */}
//         <div style={{ position: "relative", zIndex: 2, padding: "2rem", maxWidth: 820 }}>
//           <p className="exo-label">EXOSYNERGY&nbsp;&nbsp;presents</p>
//           <h1 className="hero-title">EXODIOS</h1>
//           <Slideshow />
//           <button className="btn-cta" onClick={() => navigate("/services")}>Get started with Exodios</button>
//         </div>

//         {/* Scroll hint */}
//         <button
//           className="scroll-hint"
//           onClick={() => navigate("/services")}
//           style={{ background: "none", border: "none", cursor: "pointer" }}
//         >
//           <span>explore</span>
//           <div className="scroll-arrow" />
//         </button>
//       </section>

//       {/* ── EXODIOS SECTION ── */}
//       <section id="exodios" style={{
//         position: "relative",
//         padding: "7rem 2rem 6rem",
//         textAlign: "center",
//         background: "linear-gradient(180deg, #020b18 0%, #030f22 100%)",
//       }}>
//         {/* top line */}
//         <div style={{
//           position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
//           width: 1, height: 80,
//           background: `linear-gradient(to bottom, transparent, ${COLORS.accent})`,
//         }} />

//         <h2 className="section-title">EXODIOS</h2>
//         <p className="section-sub">Exoplanet Detection Intelligence Operating System</p>

//         <div style={{
//           display: "grid",
//           gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
//           gap: "2rem",
//           maxWidth: 900,
//           margin: "0 auto",
//         }}>
//           {cards.map((card, i) => (
//             <FlipCard key={i} {...card} />
//           ))}
//         </div>
//       </section>

//       {/* ── FOOTER ── */}
//       <footer style={{
//         textAlign: "center",
//         padding: "2.5rem 1rem",
//         fontFamily: "'Space Mono', monospace",
//         fontSize: "0.68rem",
//         color: "rgba(139,163,187,0.4)",
//         letterSpacing: "0.15em",
//         borderTop: "1px solid rgba(0,212,255,0.06)",
//       }}>
//         © 2025 EXOSYNERGY &nbsp;·&nbsp; EXODIOS PLATFORM &nbsp;·&nbsp; ALL RIGHTS RESERVED
//       </footer>
//     </>
//   );
// }

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import bkgOne from "../assets/bkgOne.jpg";

const COLORS = {
  accent: "#00d4ff",
  accent2: "#7c3aed",
  gold: "#f0c040",
  text: "#e2eaf4",
  muted: "#8ba3bb",
  star: "#e8f4fd",
  bg: "#020b18",
  cardBg: "rgba(5,18,35,0.85)",
};

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;400;500;600&family=Space+Mono:ital@0;1&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }

  body {
    font-family: 'Rajdhani', sans-serif;
    background: #020b18;
    color: #e2eaf4;
    overflow-x: hidden;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn { to { opacity: 1; } }
  @keyframes bounce {
    0%, 100% { transform: rotate(45deg) translateY(0); }
    50%       { transform: rotate(45deg) translateY(5px); }
  }
  @keyframes scanlines {
    0% { background-position: 0 0; }
    100% { background-position: 0 4px; }
  }

  .exo-label {
    font-family: 'Space Mono', monospace;
    font-size: 0.8rem;
    letter-spacing: 0.35em;
    color: #00d4ff;
    text-transform: uppercase;
    margin-bottom: 1.4rem;
    opacity: 0;
    animation: fadeUp 0.8s 0.2s forwards;
  }
  .hero-title {
    font-family: 'Orbitron', monospace;
    font-size: clamp(3rem, 8vw, 6rem);
    font-weight: 900;
    letter-spacing: 0.06em;
    line-height: 1;
    background: linear-gradient(135deg, #ffffff 30%, #00d4ff 70%, #a78bfa 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 2.2rem;
    opacity: 0;
    animation: fadeUp 0.8s 0.5s forwards;
  }
  .slideshow-wrap {
    min-height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 2.8rem;
    opacity: 0;
    animation: fadeUp 0.8s 0.9s forwards;
    position: relative;
  }
  .slide-text {
    font-family: 'Rajdhani', sans-serif;
    font-size: clamp(1rem, 2.2vw, 1.25rem);
    font-weight: 400;
    color: #e8f4fd;
    line-height: 1.6;
    max-width: 620px;
    position: absolute;
    opacity: 0;
    transition: opacity 0.7s ease;
    text-align: center;
  }
  .slide-text.active { opacity: 1; position: relative; }

  .btn-cta {
    display: inline-block;
    font-family: 'Orbitron', monospace;
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #020b18;
    background: linear-gradient(110deg, #00d4ff 0%, #a78bfa 100%);
    padding: 1rem 2.4rem;
    border-radius: 3px;
    border: none;
    cursor: pointer;
    text-decoration: none;
    position: relative;
    overflow: hidden;
    opacity: 0;
    animation: fadeUp 0.8s 1.2s forwards;
    transition: transform 0.2s, box-shadow 0.2s;
    box-shadow: 0 0 28px rgba(0,212,255,0.3);
  }
  .btn-cta::before {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(255,255,255,0.15);
    transform: translateX(-110%) skewX(-15deg);
    transition: transform 0.4s;
  }
  .btn-cta:hover::before { transform: translateX(110%) skewX(-15deg); }
  .btn-cta:hover {
    transform: translateY(-2px);
    box-shadow: 0 0 48px rgba(0,212,255,0.55);
  }

  .scroll-hint {
    position: absolute;
    bottom: 2.5rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    opacity: 0;
    animation: fadeIn 1s 2s forwards;
  }
  .scroll-hint span {
    font-size: 0.65rem;
    letter-spacing: 0.2em;
    color: #8ba3bb;
  }
  .scroll-arrow {
    width: 20px; height: 20px;
    border-right: 1.5px solid #00d4ff;
    border-bottom: 1.5px solid #00d4ff;
    transform: rotate(45deg);
    animation: bounce 1.6s infinite;
  }

  .section-title {
    font-family: 'Orbitron', monospace;
    font-size: clamp(2.4rem, 6vw, 4.5rem);
    font-weight: 900;
    letter-spacing: 0.1em;
    background: linear-gradient(135deg, #fff 20%, #00d4ff 80%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 0.6rem;
  }
  .section-sub {
    font-size: 1rem;
    color: #8ba3bb;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    font-family: 'Space Mono', monospace;
    margin-bottom: 4rem;
  }

  /* FLIP CARD */
  .card-wrap {
    height: 360px;
    cursor: pointer;
    perspective: 1200px;
  }
  .card-inner {
    position: relative;
    width: 100%;
    height: 100%;
    transform-style: preserve-3d;
    transition: transform 0.65s cubic-bezier(0.4,0,0.2,1);
  }
  .card-wrap:hover .card-inner { transform: rotateY(180deg); }
  .card-face {
    position: absolute;
    inset: 0;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    border-radius: 8px;
    border: 1px solid rgba(0,212,255,0.22);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    background: rgba(5,18,35,0.85);
    backdrop-filter: blur(12px);
  }
  .card-face::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,212,255,0.08) 0%, transparent 70%);
    pointer-events: none;
  }
  .card-face::after {
    content: '';
    position: absolute;
    top: 0; left: 0;
    width: 30px; height: 30px;
    border-top: 1.5px solid #00d4ff;
    border-left: 1.5px solid #00d4ff;
    border-radius: 8px 0 0 0;
  }
  .card-back {
    transform: rotateY(180deg);
    background: linear-gradient(135deg, rgba(0,30,60,0.95) 0%, rgba(30,5,60,0.95) 100%) !important;
    border-color: rgba(124,58,237,0.4) !important;
    justify-content: flex-start !important;
    text-align: left;
    gap: 1rem;
  }
  .card-icon {
    font-size: 3rem;
    margin-bottom: 1.2rem;
    filter: drop-shadow(0 0 12px #00d4ff);
  }
  .card-title {
    font-family: 'Orbitron', monospace;
    font-size: 1.1rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: #fff;
    margin-bottom: 0.5rem;
  }
  .card-tag {
    font-family: 'Space Mono', monospace;
    font-size: 0.65rem;
    letter-spacing: 0.2em;
    color: #00d4ff;
    text-transform: uppercase;
  }
  .card-back .card-title {
    font-size: 0.9rem;
    color: #00d4ff;
    margin-bottom: 0.2rem;
  }
  .card-back-p {
    font-size: 0.95rem;
    line-height: 1.65;
    color: #e8f4fd;
    font-weight: 300;
    margin: 0;
  }
  .card-back-ul {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 0;
  }
  .card-back-ul li {
    font-size: 0.88rem;
    color: #e2eaf4;
    padding-left: 1rem;
    position: relative;
    line-height: 1.5;
  }
  .card-back-ul li::before {
    content: '▸';
    position: absolute;
    left: 0;
    color: #00d4ff;
    font-size: 0.75rem;
    top: 2px;
  }
  .card-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: auto;
    font-family: 'Space Mono', monospace;
    font-size: 0.72rem;
    letter-spacing: 0.12em;
    color: #00d4ff;
    text-decoration: none;
    border-bottom: 1px solid rgba(0,212,255,0.3);
    padding-bottom: 2px;
    transition: color 0.2s, border-color 0.2s;
  }
  .card-link:hover { color: #fff; border-color: #fff; }
`;

/* ── StarField Canvas ── */
function StarField() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const c = canvasRef.current;
    const ctx = c.getContext("2d");
    let W, H, stars = [], raf;
    const resize = () => {
      W = c.width = window.innerWidth;
      H = c.height = window.innerHeight;
    };
    const mk = () => {
      stars = Array.from({ length: 260 }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 1.3 + 0.2,
        a: Math.random(),
        s: Math.random() * 0.004 + 0.001,
      }));
    };
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      stars.forEach(s => {
        s.a += s.s;
        if (s.a > 1) s.a = 0;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,220,255,${Math.sin(s.a * Math.PI) * 0.8 + 0.2})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    resize(); mk(); draw();
    window.addEventListener("resize", () => { resize(); mk(); });
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return (
    <canvas ref={canvasRef} style={{
      position: "fixed", inset: 0, zIndex: 0,
      pointerEvents: "none", opacity: 0.5,
    }} />
  );
}

/* ── Slideshow ── */
function Slideshow() {
  const [cur, setCur] = useState(0);
  const slides = [
    <>Direct image detection with starshade and generalized fits input with our novel{" "}
      <strong style={{ color: COLORS.accent }}>Rev CNN</strong> and Path trajectory unique model</>,
    <>Transit Detection with our{" "}
      <strong style={{ color: COLORS.gold }}>XGBoost model</strong> including the period days</>,
  ];
  useEffect(() => {
    const t = setInterval(() => setCur(c => (c + 1) % slides.length), 4200);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="slideshow-wrap">
      {slides.map((s, i) => (
        <p key={i} className={`slide-text${cur === i ? " active" : ""}`}>{s}</p>
      ))}
    </div>
  );
}

/* ── FlipCard ── */
function FlipCard({ front, back, onClick }) {
  return (
    <div className="card-wrap" onClick={onClick}>
      <div className="card-inner">
        <div className="card-face" style={front.faceStyle}>
          <div className="card-icon" style={front.iconStyle}>{front.icon}</div>
          <div className="card-title">{front.title}</div>
          <div className="card-tag" style={front.tagStyle}>{front.tag}</div>
        </div>
        <div className="card-face card-back" style={back.faceStyle}>
          <div className="card-title" style={back.titleStyle}>{back.title}</div>
          <p className="card-back-p">{back.desc}</p>
          <ul className="card-back-ul">
            {back.bullets.map((b, i) => <li key={i} style={b.style}>{b.text}</li>)}
          </ul>
          <a className="card-link" href={back.href} target="_blank"
            rel="noopener noreferrer"
            style={back.linkStyle}
            onClick={e => e.stopPropagation()}>
            Launch module →
          </a>
        </div>
      </div>
    </div>
  );
}

/* ── Main App ── */
export default function ExodiosApp() {
  const heroBgRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onMove = e => {
      if (!heroBgRef.current) return;
      const x = (e.clientX / window.innerWidth - 0.5) * 6;
      const y = (e.clientY / window.innerHeight - 0.5) * 4;
      heroBgRef.current.style.transform = `scale(1.04) translate(${x}px,${y}px)`;
    };
    document.addEventListener("mousemove", onMove);
    return () => document.removeEventListener("mousemove", onMove);
  }, []);

  const cards = [
    {
      front: {
        icon: "🔭",
        iconStyle: { filter: `drop-shadow(0 0 12px ${COLORS.accent})` },
        title: "Direct Imaging",
        tag: "Rev CNN · Starshade · Path Trajectory",
        tagStyle: {},
        faceStyle: {},
      },
      back: {
        faceStyle: {},
        titleStyle: { color: COLORS.accent },
        title: "Direct Imaging Module",
        desc: "High-contrast direct detection using starshade optics and generalized FITS input processing.",
        bullets: [
          { text: "Rev CNN — novel residual encoder-vision architecture" },
          { text: "Generalized FITS file ingestion pipeline" },
          { text: "Starshade occulter suppression support" },
          { text: "Path trajectory prediction for candidate objects" },
          { text: "Sub-arcsecond angular separation detection" },
        ],
        href: "/direct-imaging",
        linkStyle: {},
      },
      onClick: () => window.open("/direct-imaging"),
    },
    {
      front: {
        icon: "📈",
        iconStyle: { filter: "drop-shadow(0 0 12px #a78bfa)" },
        title: "Transit Detection",
        tag: "XGBoost · Period Analysis · Lightcurve",
        tagStyle: { color: COLORS.gold },
        faceStyle: { borderColor: "rgba(124,58,237,0.3)" },
      },
      back: {
        faceStyle: {
          background: "linear-gradient(135deg, rgba(0,20,50,0.97) 0%, rgba(10,0,40,0.97) 100%)",
          borderColor: "rgba(240,192,64,0.35)",
        },
        titleStyle: { color: COLORS.gold },
        title: "Transit Detection Module",
        desc: "Photometric transit identification using gradient-boosted ensemble learning over stellar lightcurves.",
        bullets: [
          { text: "XGBoost classifier trained on Kepler & TESS data" },
          { text: "Automated period-day estimation from flux dips" },
          { text: "False-positive discrimination pipeline" },
          { text: "Multi-target detrending and normalization" },
          { text: "Exportable ephemeris and candidate reports" },
        ],
        href: "/transit",
        linkStyle: { color: COLORS.gold, borderColor: "rgba(240,192,64,0.4)" },
      },
      onClick: () => window.open("/transit"),
    },
  ];

  return (
    <>
      <style>{globalStyles}</style>

      {/* Scanline overlay */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 9999, pointerEvents: "none",
        background: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.04) 2px,rgba(0,0,0,0.04) 4px)",
      }} />

      <StarField />

      {/* ── HERO ── */}
      <section style={{
        position: "relative", minHeight: "100vh",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        textAlign: "center", overflow: "hidden",
      }}>
        {/* BG */}
        <div ref={heroBgRef} style={{
          position: "absolute", inset: 0,
          background: `
            radial-gradient(ellipse 120% 80% at 50% 30%, rgba(0,60,120,0.55) 0%, transparent 65%),
            radial-gradient(ellipse 60% 60% at 80% 70%, rgba(124,58,237,0.18) 0%, transparent 60%),
            url(${bkgOne}) center/cover no-repeat
          `,
          transform: "scale(1.04)",
          zIndex: 0,
        }}>
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to bottom, rgba(2,11,24,0.3) 0%, rgba(2,11,24,0.6) 80%, #020b18 100%)",
          }} />
        </div>

        {/* Content */}
        <div style={{ position: "relative", zIndex: 2, padding: "2rem", maxWidth: 820 }}>
          <p className="exo-label">EXOSYNERGY&nbsp;&nbsp;PRESENTS</p>
          <h1 className="hero-title">EXODIOS</h1>
          <Slideshow />
          <button className="btn-cta" onClick={() => navigate("/direct-imaging")}>Get started with Exodios</button>
        </div>

        {/* Scroll hint */}
        <a href="#exodios" className="scroll-hint" style={{ textDecoration: "none" }}>
          <span>explore</span>
          <div className="scroll-arrow" />
        </a>
      </section>

      {/* ── EXODIOS SECTION ── */}
      <section id="exodios" style={{
        position: "relative",
        padding: "7rem 2rem 6rem",
        textAlign: "center",
        background: "linear-gradient(180deg, #020b18 0%, #030f22 100%)",
      }}>
        {/* top line */}
        <div style={{
          position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
          width: 1, height: 80,
          background: `linear-gradient(to bottom, transparent, ${COLORS.accent})`,
        }} />

        <h2 className="section-title">EXODIOS</h2>
        <p className="section-sub">Exoplanet Detection Intelligence Operating System</p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "2rem",
          maxWidth: 900,
          margin: "0 auto",
        }}>
          {cards.map((card, i) => (
            <FlipCard key={i} {...card} />
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        textAlign: "center",
        padding: "2.5rem 1rem",
        fontFamily: "'Space Mono', monospace",
        fontSize: "0.68rem",
        color: "rgba(139,163,187,0.4)",
        letterSpacing: "0.15em",
        borderTop: "1px solid rgba(0,212,255,0.06)",
      }}>
        © 2025 EXOSYNERGY &nbsp;·&nbsp; EXODIOS PLATFORM &nbsp;·&nbsp; ALL RIGHTS RESERVED
      </footer>
    </>
  );
}