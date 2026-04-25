'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

const DURATION = 3000; // 3 seconds

const MESSAGES = [
  { text: 'Welcome to the Future of Visa Processing', delay: 0 },
  { text: 'Automating the visa application process', delay: 800 },
  { text: 'Powering travel agencies with AI', delay: 1600 },
  { text: 'ChatGPT · Claude · Much more coming', delay: 2200 },
];

interface Props {
  onComplete: () => void;
}

export default function LoadingScreen({ onComplete }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [activeMsg, setActiveMsg] = useState(0);
  const [fadingOut, setFadingOut] = useState(false);

  // Three.js particle constellation
  useEffect(() => {
    if (!canvasRef.current) return;

    const container = canvasRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 30;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Particles
    const PARTICLE_COUNT = 200;
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
      velocities.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.01
        )
      );
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x7c5cfc,
      size: 0.15,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Lines between close particles
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x7c5cfc,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
    });

    let linesMesh: THREE.LineSegments | null = null;

    const buildLines = () => {
      if (linesMesh) scene.remove(linesMesh);
      const linePositions: number[] = [];
      const pos = geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        for (let j = i + 1; j < PARTICLE_COUNT; j++) {
          const dx = pos[i * 3] - pos[j * 3];
          const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
          const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist < 6) {
            linePositions.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
            linePositions.push(pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]);
          }
        }
      }
      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
      linesMesh = new THREE.LineSegments(lineGeo, lineMaterial);
      scene.add(linesMesh);
    };

    // Second glow layer — larger/softer
    const glowMaterial = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.35,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
    });
    const glowParticles = new THREE.Points(geometry, glowMaterial);
    scene.add(glowParticles);

    let frameId: number;
    let frameCount = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const pos = geometry.attributes.position.array as Float32Array;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        pos[i * 3] += velocities[i].x;
        pos[i * 3 + 1] += velocities[i].y;
        pos[i * 3 + 2] += velocities[i].z;

        // Wrap around
        if (pos[i * 3] > 30) pos[i * 3] = -30;
        if (pos[i * 3] < -30) pos[i * 3] = 30;
        if (pos[i * 3 + 1] > 20) pos[i * 3 + 1] = -20;
        if (pos[i * 3 + 1] < -20) pos[i * 3 + 1] = 20;
      }

      geometry.attributes.position.needsUpdate = true;
      particles.rotation.y += 0.0008;
      glowParticles.rotation.y += 0.0006;

      frameCount++;
      if (frameCount % 3 === 0) buildLines();

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameId);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      glowMaterial.dispose();
      lineMaterial.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Progress + message cycling
  useEffect(() => {
    const start = Date.now();

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / DURATION) * 100, 100);
      setProgress(pct);

      // Update active message
      for (let i = MESSAGES.length - 1; i >= 0; i--) {
        if (elapsed >= MESSAGES[i].delay) {
          setActiveMsg(i);
          break;
        }
      }

      if (elapsed >= DURATION) {
        clearInterval(progressInterval);
        setFadingOut(true);
        setTimeout(onComplete, 600);
      }
    }, 30);

    return () => clearInterval(progressInterval);
  }, [onComplete]);

  return (
    <div
      className={`loading-screen ${fadingOut ? 'loading-screen-out' : ''}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#06061a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Outfit', 'Inter', sans-serif",
      }}
    >
      {/* Three.js canvas */}
      <div
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, zIndex: 0 }}
      />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: '600px', padding: '0 24px' }}>
        {/* Logo */}
        <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo_logo for darkBG.svg"
            alt="VizEz"
            style={{ height: '48px', width: 'auto', filter: 'drop-shadow(0 0 30px rgba(124, 92, 252, 0.4))' }}
          />
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase' as const,
              padding: '3px 10px',
              borderRadius: '99px',
              background: 'linear-gradient(135deg, rgba(124,92,252,0.25), rgba(56,189,248,0.2))',
              color: '#a78bfa',
              border: '1px solid rgba(124,92,252,0.3)',
              backdropFilter: 'blur(8px)',
            }}
          >
            Beta
          </span>
        </div>

        {/* Version subtitle */}
        <div
          style={{
            fontSize: '12px',
            color: 'rgba(148, 144, 200, 0.6)',
            marginBottom: '40px',
            letterSpacing: '0.1em',
          }}
        >
          v0.1.0 — Early Access
        </div>

        {/* Messages */}
        <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {MESSAGES.map((msg, i) => (
            <div
              key={i}
              className="loading-msg"
              style={{
                position: 'absolute',
                opacity: activeMsg === i ? 1 : 0,
                transform: activeMsg === i ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.97)',
                transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                fontSize: i === 0 ? '20px' : '16px',
                fontWeight: i === 0 ? 700 : 400,
                color: i === 0 ? '#f0eeff' : '#9490c8',
                letterSpacing: '-0.3px',
              }}
            >
              {msg.text}
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div
          style={{
            width: '280px',
            height: '4px',
            borderRadius: '99px',
            background: 'rgba(38, 38, 72, 0.7)',
            margin: '32px auto 0',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              borderRadius: '99px',
              background: 'linear-gradient(90deg, #7c5cfc, #38bdf8, #f472b6)',
              backgroundSize: '200% 100%',
              animation: 'gradient-shift 2s ease infinite',
              transition: 'width 0.1s linear',
              boxShadow: '0 0 15px rgba(124, 92, 252, 0.5)',
            }}
          />
        </div>

        {/* Loading text */}
        <div
          style={{
            marginTop: '16px',
            fontSize: '11px',
            color: 'rgba(148, 144, 200, 0.5)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase' as const,
          }}
        >
          Initializing platform...
        </div>
      </div>
    </div>
  );
}
