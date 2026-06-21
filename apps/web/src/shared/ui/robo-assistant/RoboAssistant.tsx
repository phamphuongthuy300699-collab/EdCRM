"use client";

import React from "react";
import { RoboAssistantProps } from "./types";
import { ROBO_MESSAGES } from "./robo-messages";
import styles from "./RoboAssistant.module.css";

export function RoboAssistant({
  mood = "idle",
  context = "lead-form",
  message,
  compact = false
}: RoboAssistantProps) {
  // Determine speech text
  const speechText = message || ROBO_MESSAGES[context]?.default || "Привет! Чем я могу помочь?";

  // Determine eye and mouth parameters based on mood
  const renderEyes = () => {
    switch (mood) {
      case "happy":
      case "success":
        // Happy arch eyes
        return (
          <>
            <path
              d="M22 28C22 26 24 25 26 25C28 25 30 26 30 28"
              stroke="var(--color-success, #16A34A)"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
              className={styles.successBounce}
            />
            <path
              d="M34 28C34 26 36 25 38 25C40 25 42 26 42 28"
              stroke="var(--color-success, #16A34A)"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
              className={styles.successBounce}
            />
          </>
        );
      case "sleepy":
        // Closed horizontal eyes
        return (
          <>
            <line x1="22" y1="28" x2="30" y2="28" stroke="var(--color-text-muted)" strokeWidth="3" strokeLinecap="round" />
            <line x1="34" y1="28" x2="42" y2="28" stroke="var(--color-text-muted)" strokeWidth="3" strokeLinecap="round" />
          </>
        );
      case "warning":
        // Warning eyes - small triangles or angry lines
        return (
          <>
            <path d="M22 30L26 25L30 30Z" fill="var(--color-warning)" />
            <path d="M34 30L38 25L42 30Z" fill="var(--color-warning)" />
          </>
        );
      case "thinking":
        // One eye bigger, pupils look slightly up/left
        return (
          <>
            <circle cx="26" cy="28" r="4.5" fill="var(--color-primary)" className={styles.eye} />
            <circle cx="38" cy="27" r="3" fill="var(--color-primary)" className={styles.eye} />
            {/* Small white specs */}
            <circle cx="27.5" cy="26.5" r="1.5" fill="white" />
            <circle cx="39" cy="26" r="1.0" fill="white" />
          </>
        );
      case "idle":
      default:
        // Standard wide circular eyes
        return (
          <>
            <circle cx="26" cy="28" r="4" fill="var(--color-primary)" className={styles.eye} />
            <circle cx="38" cy="28" r="4" fill="var(--color-primary)" className={styles.eye} />
            {/* Pupil reflections */}
            <circle cx="27.5" cy="26.5" r="1" fill="white" />
            <circle cx="39.5" cy="26.5" r="1" fill="white" />
          </>
        );
    }
  };

  const renderMouth = () => {
    switch (mood) {
      case "happy":
      case "success":
        // Smiling arc
        return (
          <path
            d="M26 36C26 36 29 40 32 40C35 40 38 36 38 36"
            stroke="var(--color-primary)"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
        );
      case "thinking":
        // Small circle mouth (ooh/thinking)
        return (
          <circle cx="32" cy="37" r="2.5" stroke="var(--color-primary)" strokeWidth="2.5" fill="none" />
        );
      case "sleepy":
        // Flat thin mouth
        return (
          <line x1="28" y1="37" x2="36" y2="37" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round" />
        );
      case "warning":
        // Zig-zag/wiggly mouth or simple flat line
        return (
          <path
            d="M27 37L30 36L33 38L37 37"
            stroke="var(--color-warning-dark, #D97706)"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
        );
      case "idle":
      default:
        // Gentle smile or flat line
        return (
          <path
            d="M28 36.5C28 36.5 30 38 32 38C34 38 36 36.5 36 36.5"
            stroke="var(--color-primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
        );
    }
  };

  const renderAntennaLight = () => {
    const color = mood === "success" ? "var(--color-success)" : mood === "warning" ? "var(--color-warning)" : "var(--color-accent)";
    return (
      <circle
        cx="32"
        cy="4"
        r="4.5"
        fill={color}
        className={mood === "thinking" || mood === "warning" ? styles.antennaLight : undefined}
      />
    );
  };

  return (
    <div className={`${styles.roboContainer} ${compact ? styles.roboContainerCompact : ""}`}>
      {/* Robot SVG */}
      <div className={`${styles.roboWrapper} ${styles.float} ${mood === "success" ? styles.successBounce : ""}`}>
        <svg width="56" height="56" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Shadow underneath */}
          <ellipse cx="32" cy="59" rx="14" ry="2" fill="rgba(17, 24, 39, 0.08)" />

          {/* Antenna */}
          <g className={styles.antenna}>
            <line x1="32" y1="18" x2="32" y2="8" stroke="var(--color-text-muted, #667085)" strokeWidth="3" strokeLinecap="round" />
            {renderAntennaLight()}
          </g>

          {/* Hands / Arms */}
          <g>
            {/* Left Arm */}
            <rect x="4" y="24" width="6" height="18" rx="3" fill="var(--color-text-muted)" transform="rotate(-5 7 33)" />
            {/* Right Arm */}
            <rect x="54" y="24" width="6" height="18" rx="3" fill="var(--color-text-muted)" transform="rotate(5 57 33)" />
          </g>

          {/* Head & Body Chassis */}
          <g className={styles.bodyPulse}>
            {/* Neck connection */}
            <rect x="28" y="16" width="8" height="4" fill="var(--color-border)" stroke="var(--color-text-muted)" strokeWidth="1.5" />
            
            {/* Main Robot Body Screen */}
            <rect x="14" y="18" width="36" height="34" rx="8" fill="var(--color-surface)" stroke="var(--color-primary)" strokeWidth="3" />
            
            {/* Screen Inner Display Grid */}
            <rect x="18" y="22" width="28" height="20" rx="4" fill="var(--color-surface-soft)" />

            {/* Wheels / Feet base */}
            <rect x="20" y="50" width="8" height="6" rx="2" fill="var(--color-text-muted)" />
            <rect x="36" y="50" width="8" height="6" rx="2" fill="var(--color-text-muted)" />

            {/* Face details */}
            {renderEyes()}
            {renderMouth()}
          </g>
        </svg>
      </div>

      {/* Speech Bubble */}
      {!compact && (
        <div className={styles.speechBubble}>
          <div className={styles.speechArrow} />
          <span className={styles.speechTitle}>
            {mood === "success" ? "Успех! 🎉" : mood === "warning" ? "Подсказка ⚠️" : "Робо-помощник"}
          </span>
          <span className={styles.speechText}>{speechText}</span>
        </div>
      )}
    </div>
  );
}
