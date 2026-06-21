"use client";

import React, { useState, useEffect } from "react";
import { RoboAssistantProps, RoboMood } from "./types";
import { ROBO_MESSAGES } from "./robo-messages";
import styles from "./RoboAssistant.module.css";

export function RoboAssistant({
  mood = "idle",
  context = "lead-form",
  message,
  compact = false,
  size = "md"
}: RoboAssistantProps) {
  // Sync prop mood with local state for testing/interactive selector
  const [currentMood, setCurrentMood] = useState<RoboMood>(mood);

  useEffect(() => {
    setCurrentMood(mood);
  }, [mood]);

  // Determine speech text
  const speechText = message || ROBO_MESSAGES[context]?.default || "Привет! Чем я могу помочь?";

  // Map sizes to pixel widths/heights
  const sizeDims = {
    sm: { width: 64, height: 72 },
    md: { width: 120, height: 135 },
    lg: { width: 180, height: 200 }
  };
  const dims = sizeDims[size] || sizeDims.md;

  // Determine colors and glows based on current mood
  const getGlowColor = () => {
    switch (currentMood) {
      case "success":
      case "happy":
        return "#10B981"; // Friendly green/emerald
      case "warning":
        return "#F59E0B"; // Amber
      case "thinking":
        return "#3B82F6"; // Tech blue
      case "idle":
      default:
        return "#60A5FA"; // Light blue
    }
  };

  // Render Expressive 2.5D LED Eyes
  const renderEyes = () => {
    switch (currentMood) {
      case "success":
      case "happy":
        // Smiling arches (Green glow)
        return (
          <g>
            <path
              d="M 52,76 C 52,69 68,69 68,76"
              fill="none"
              stroke="#10B981"
              strokeWidth="4.5"
              strokeLinecap="round"
              filter="url(#glow-success)"
            />
            <path
              d="M 92,76 C 92,69 108,69 108,76"
              fill="none"
              stroke="#10B981"
              strokeWidth="4.5"
              strokeLinecap="round"
              filter="url(#glow-success)"
            />
          </g>
        );
      case "warning":
        // Amber neutral-focused eyes
        return (
          <g>
            <ellipse cx="60" cy="74" rx="7" ry="8" fill="#FBBF24" filter="url(#glow-warning)" />
            <ellipse cx="100" cy="74" rx="7" ry="8" fill="#FBBF24" filter="url(#glow-warning)" />
            {/* Highlights */}
            <circle cx="62" cy="71" r="2" fill="#FFFFFF" />
            <circle cx="102" cy="71" r="2" fill="#FFFFFF" />
          </g>
        );
      case "thinking":
        // Left eye squinted, right eye round (curious lookup)
        return (
          <g>
            <ellipse cx="60" cy="74" rx="7" ry="5.5" fill="#60A5FA" filter="url(#glow-cyan)" />
            <ellipse cx="100" cy="73" rx="7" ry="8.5" fill="#60A5FA" filter="url(#glow-cyan)" />
            {/* Shuffled pupils */}
            <circle cx="62" cy="73" r="1.5" fill="#FFFFFF" />
            <circle cx="102" cy="70" r="2" fill="#FFFFFF" />
          </g>
        );
      case "sleepy":
        // Flat dreaming lines
        return (
          <g>
            <line x1="53" y1="74" x2="67" y2="74" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
            <line x1="93" y1="74" x2="107" y2="74" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
          </g>
        );
      case "idle":
      default:
        // Standard wide circular eyes (Tech cyan glow)
        return (
          <g>
            <ellipse cx="60" cy="74" rx="7.5" ry="9.5" fill="#38BDF8" filter="url(#glow-cyan)" />
            <ellipse cx="100" cy="74" rx="7.5" ry="9.5" fill="#38BDF8" filter="url(#glow-cyan)" />
            {/* Highlights */}
            <circle cx="62" cy="71" r="2.2" fill="#FFFFFF" />
            <circle cx="102" cy="71" r="2.2" fill="#FFFFFF" />
            <circle cx="58" cy="77" r="1.0" fill="rgba(255,255,255,0.4)" />
            <circle cx="98" cy="77" r="1.0" fill="rgba(255,255,255,0.4)" />
          </g>
        );
    }
  };

  // Render Face Mouth
  const renderMouth = () => {
    switch (currentMood) {
      case "success":
      case "happy":
        // Generous open-curved mouth
        return (
          <path
            d="M 72,86 Q 80,95 88,86"
            fill="none"
            stroke="#10B981"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        );
      case "thinking":
        // O-mouth
        return (
          <circle
            cx="80"
            cy="87"
            r="3"
            fill="none"
            stroke="#38BDF8"
            strokeWidth="2.5"
          />
        );
      case "warning":
        // Concerned straight line
        return (
          <line
            x1="74"
            y1="87"
            x2="86"
            y2="87"
            stroke="#FBBF24"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        );
      case "sleepy":
        // Tiny gentle curve
        return (
          <path
            d="M 76,87 Q 80,89 84,87"
            fill="none"
            stroke="#475569"
            strokeWidth="2"
            strokeLinecap="round"
          />
        );
      case "idle":
      default:
        // Gentle smiling line
        return (
          <path
            d="M 74,86.5 Q 80,91 86,86.5"
            fill="none"
            stroke="#38BDF8"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        );
    }
  };

  // Right arm waving or relaxed
  const renderRightArm = () => {
    if (currentMood === "success") {
      // Wave gesture (Waving animation applied via waveArm CSS class)
      return (
        <g className={styles.waveArm}>
          <path
            d="M 118,115 Q 138,103 134,80"
            fill="none"
            stroke="url(#light-metal-grad)"
            strokeWidth="6"
            strokeLinecap="round"
          />
          {/* Wave Claw */}
          <path
            d="M 129,75 Q 134,80 139,77 M 138,84 Q 134,80 129,82"
            fill="none"
            stroke="#475569"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      );
    }

    // Default friendly relaxed arm
    return (
      <g>
        <path
          d="M 118,115 Q 132,126 134,142"
          fill="none"
          stroke="url(#light-metal-grad)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* Default Claw */}
        <path
          d="M 139,140 Q 134,142 134,147 M 134,138 Q 139,142 131,146"
          fill="none"
          stroke="#475569"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    );
  };

  return (
    <div className={`${styles.roboContainer} ${compact || size === "sm" ? styles.roboContainerCompact : ""}`}>
      {/* Robot SVG Wrapper */}
      <div className={`${styles.roboWrapper} ${styles.float}`}>
        <svg
          width={dims.width}
          height={dims.height}
          viewBox="0 0 160 180"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={styles.roboSVG}
          style={{ "--glow-color": getGlowColor() } as React.CSSProperties}
        >
          <defs>
            {/* Tech screen grid lines */}
            <pattern id="robo-screen-grid" width="5" height="5" patternUnits="userSpaceOnUse">
              <path d="M 5 0 L 0 0 0 5" fill="none" stroke="rgba(56, 189, 248, 0.08)" strokeWidth="0.5" />
            </pattern>

            {/* Glowing filter setups */}
            <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-success" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-warning" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Deep premium gradients */}
            <linearGradient id="blue-chassis-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="60%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#1E40AF" />
            </linearGradient>

            <linearGradient id="light-metal-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="35%" stopColor="#F1F5F9" />
              <stop offset="100%" stopColor="#CBD5E1" />
            </linearGradient>

            <linearGradient id="dark-gloss-screen" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1E293B" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>

            {/* General soft drop shadow */}
            <filter id="shadow-2.5d" x="-10%" y="-5%" width="120%" height="120%">
              <feDropShadow dx="0" dy="6" stdDeviation="5" floodOpacity="0.08" />
            </filter>
          </defs>

          {/* Under-shadow */}
          <ellipse cx="80" cy="168" rx="34" ry="5.5" fill="rgba(17, 24, 39, 0.1)" />

          {/* Antenna */}
          <g className={styles.antenna}>
            <rect x="77" y="16" width="6" height="24" rx="2.5" fill="url(#light-metal-grad)" stroke="#94A3B8" strokeWidth="1" />
            <rect x="74" y="27" width="12" height="3.5" rx="1" fill="#475569" />
            {/* Glowing Bulb */}
            <circle
              cx="80"
              cy="10"
              r="7.5"
              fill={getGlowColor()}
              className={styles.antennaLight}
              style={{ filter: `drop-shadow(0 0 6px ${getGlowColor()})` }}
            />
          </g>

          {/* Left Arm manipulator */}
          <g>
            {/* Shoulder */}
            <circle cx="40" cy="115" r="4.5" fill="#475569" />
            {/* Arm segment */}
            <path
              d="M 40,115 Q 26,126 24,142"
              fill="none"
              stroke="url(#light-metal-grad)"
              strokeWidth="6"
              strokeLinecap="round"
            />
            {/* Claw */}
            <path
              d="M 21,140 Q 26,142 26,147 M 26,138 Q 21,142 29,146"
              fill="none"
              stroke="#475569"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>

          {/* Right Arm manipulator */}
          {renderRightArm()}

          {/* Neck connector */}
          <rect x="68" y="38" width="24" height="8" rx="2" fill="#475569" stroke="#334155" strokeWidth="1" />

          {/* Head Capsule */}
          <g className={styles.roboHead} filter="url(#shadow-2.5d)">
            {/* Outer Head Chassis */}
            <rect x="34" y="44" width="92" height="58" rx="22" fill="url(#blue-chassis-grad)" stroke="#1D4ED8" strokeWidth="2" />
            {/* Inner Dark Screen */}
            <rect x="42" y="52" width="76" height="42" rx="13" fill="url(#dark-gloss-screen)" stroke="#3B82F6" strokeWidth="1.5" />
            {/* Face screen grid decoration */}
            <rect x="42" y="52" width="76" height="42" rx="13" fill="url(#robo-screen-grid)" pointerEvents="none" />
            
            {/* Screw heads (engineering details) */}
            <circle cx="40" cy="50" r="1.5" fill="#94A3B8" />
            <circle cx="120" cy="50" r="1.5" fill="#94A3B8" />
            <circle cx="40" cy="96" r="1.5" fill="#94A3B8" />
            <circle cx="120" cy="96" r="1.5" fill="#94A3B8" />

            {/* Expressive Faces */}
            {renderEyes()}
            {renderMouth()}
          </g>

          {/* Body Chassis */}
          <g className={styles.roboBody} filter="url(#shadow-2.5d)">
            {/* Outer Torso */}
            <rect x="44" y="100" width="72" height="52" rx="14" fill="url(#light-metal-grad)" stroke="#CBD5E1" strokeWidth="1.5" />
            {/* Front Panel Cover */}
            <rect x="52" y="107" width="56" height="38" rx="8" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />
            
            {/* Decorative circuit diagram paths */}
            <path d="M 58,114 H 102" stroke="#E2E8F0" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M 58,122 H 72 M 88,122 H 102 M 80,126 V 138" stroke="#DBEAFE" strokeWidth="1.5" strokeLinecap="round" />

            {/* Tech details (small vent ports) */}
            <line x1="58" y1="138" x2="68" y2="138" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
            <line x1="58" y1="142" x2="64" y2="142" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />

            {/* Glowing Core Heart (pulses) */}
            <circle cx="80" cy="130" r="4.5" className={styles.coreLed} />
          </g>

          {/* Ball Roller Wheel Base */}
          <g>
            <ellipse cx="80" cy="154" rx="20" ry="11" fill="#1E293B" stroke="#0F172A" strokeWidth="2" />
            <ellipse cx="64" cy="153" rx="6" ry="8.5" fill="#475569" />
            <ellipse cx="96" cy="153" rx="6" ry="8.5" fill="#475569" />
            <circle cx="80" cy="154" r="5" fill="#3B82F6" opacity="0.3" />
          </g>

          {/* Success Gears Floating Particles */}
          {currentMood === "success" && (
            <g pointerEvents="none">
              {/* Particle 1 (Gear shape or simple circle/star) */}
              <path
                d="M 24,115 L 29,118 L 27,123 L 22,121 Z"
                fill="#F97316"
                className={styles.gearParticle}
                style={{ animationDelay: "0.1s" } as React.CSSProperties}
              />
              {/* Particle 2 */}
              <circle
                cx="136"
                cy="125"
                r="3.2"
                fill="#10B981"
                className={styles.gearParticle}
                style={{ animationDelay: "0.6s" } as React.CSSProperties}
              />
              {/* Particle 3 */}
              <rect
                x="32"
                y="85"
                width="4.5"
                height="4.5"
                rx="1"
                fill="#3B82F6"
                className={styles.gearParticle}
                style={{ animationDelay: "1.2s" } as React.CSSProperties}
              />
              {/* Particle 4 */}
              <path
                d="M 126,92 L 131,92 L 128.5,87 Z"
                fill="#FBBF24"
                className={styles.gearParticle}
                style={{ animationDelay: "1.8s" } as React.CSSProperties}
              />
            </g>
          )}
        </svg>
      </div>

      {/* Speech Bubble */}
      {!compact && size !== "sm" && (
        <div className={styles.speechBubble}>
          <div className={styles.speechArrow} />
          <span className={styles.speechTitle}>
            {currentMood === "success" ? "Успех! 🎉" : currentMood === "warning" ? "Подсказка ⚠️" : "Робо-помощник"}
          </span>
          <span className={styles.speechText}>{speechText}</span>

          {/* Interactive Demo Mood Selector (Only shown in Development mode) */}
          {process.env.NODE_ENV === "development" && (
            <div className={styles.demoMoodBar}>
              <span style={{ fontSize: "9px", color: "var(--color-text-muted)", marginRight: "4px" }}>
                тест:
              </span>
              {(["idle", "thinking", "happy", "success", "warning", "sleepy"] as const).map((m) => (
                <button
                  key={m}
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentMood(m);
                  }}
                  className={`${styles.demoMoodBtn} ${currentMood === m ? styles.demoMoodBtnActive : ""}`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
