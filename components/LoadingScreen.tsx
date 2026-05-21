'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

const DURATION = 3000;

const MESSAGES = [
  { text: 'Initializing AI Portal Engine...', delay: 0 },
  { text: 'Loading trained portal models...', delay: 800 },
  { text: 'Connecting to extension...', delay: 1600 },
  { text: 'Ready to automate.', delay: 2200 },
];

interface Props {
  onComplete: () => void;
}

export default function LoadingScreen({ onComplete }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [activeMsg, setActiveMsg] = useState(0);
  const [fadingOut, setFadingOut] = useState(false);

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

    const PARTICLE_COUNT = 150;
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
      velocities.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.018,
          (Math.random() - 0.5) * 0.018,
          (Math.random() - 0.5) * 0.009
        )
      );
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.14,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.06,
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

    let frameId: number;
    let frameCount = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const pos = geometry.attributes.position.array as Float32Array;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        pos[i * 3] += velocities[i].x;
        pos[i * 3 + 1] += velocities[i].y;
        pos[i * 3 + 2] += velocities[i].z;
        if (pos[i * 3] > 30) pos[i * 3] = -30;
        if (pos[i * 3] < -30) pos[i * 3] = 30;
        if (pos[i * 3 + 1] > 20) pos[i * 3 + 1] = -20;
        if (pos[i * 3 + 1] < -20) pos[i * 3 + 1] = 20;
      }

      geometry.attributes.position.needsUpdate = true;
      particles.rotation.y += 0.0006;

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
      lineMaterial.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    const start = Date.now();

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / DURATION) * 100, 100);
      setProgress(pct);

      for (let i = MESSAGES.length - 1; i >= 0; i--) {
        if (elapsed >= MESSAGES[i].delay) {
          setActiveMsg(i);
          break;
        }
      }

      if (elapsed >= DURATION) {
        clearInterval(progressInterval);
        setFadingOut(true);
        setTimeout(onComplete, 500);
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
        background: '#000000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: '480px', padding: '0 24px' }}>
        {/* Logo */}
        <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo_logo for darkBG.svg" alt="VizEz" style={{ height: '36px', width: 'auto' }} />
          <span style={{
            fontSize: '9px',
            fontWeight: 700,
            letterSpacing: '0.10em',
            textTransform: 'uppercase' as const,
            padding: '2px 7px',
            borderRadius: '99px',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.40)',
          }}>
            v3.0
          </span>
        </div>

        {/* Messages */}
        <div style={{ height: '28px', position: 'relative', marginBottom: '32px' }}>
          {MESSAGES.map((msg, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                opacity: activeMsg === i ? 1 : 0,
                transform: activeMsg === i ? 'translateY(0)' : 'translateY(6px)',
                transition: 'all 0.4s ease',
                fontSize: '14px',
                fontWeight: i === 3 ? 600 : 400,
                color: i === 3 ? '#ffffff' : 'rgba(255,255,255,0.55)',
                letterSpacing: '-0.01em',
              }}
            >
              {msg.text}
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{
          width: '220px',
          height: '1px',
          borderRadius: '99px',
          background: 'rgba(255,255,255,0.08)',
          margin: '0 auto',
          overflow: 'hidden',
        }}>
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              borderRadius: '99px',
              background: '#7c5cfc',
              transition: 'width 0.1s linear',
            }}
          />
        </div>

        <div style={{
          marginTop: '14px',
          fontSize: '11px',
          color: 'rgba(255,255,255,0.25)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase' as const,
        }}>
          {Math.round(progress)}%
        </div>
      </div>
    </div>
  );
}
