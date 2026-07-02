"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Phone, Menu, X } from "lucide-react";
import { Button } from "@robotics-crm/ui";
import { getMediaUrl } from "@/shared/utils/media";

interface HeaderProps {
  brandName: string;
  brandLogo: string;
  logoAlt: string;
  logoDisplay: string;
  phone: string;
}

export default function Header({
  brandName,
  brandLogo,
  logoAlt,
  logoDisplay,
  phone,
}: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const cleanPhone = phone.replace(/[^0-9+]/g, "");

  return (
    <>
      <header style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(255, 255, 255, 0.9)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--color-border)",
        height: "72px",
        display: "flex",
        alignItems: "center"
      }}>
        <div className="container" style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 20px"
        }}>
          {/* Logo / Brand Name */}
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
            {logoDisplay !== "sign" && brandLogo ? (
              <img 
                src={getMediaUrl(brandLogo)} 
                alt={logoAlt || brandName} 
                style={{ 
                  height: "38px", 
                  width: "auto",
                  maxWidth: "160px"
                }}
              />
            ) : null}
            
            {logoDisplay === "sign" || !brandLogo ? (
              <span style={{
                fontWeight: 900,
                fontSize: "1.4rem",
                fontFamily: "var(--font-geologica)",
                color: "var(--color-text)",
                letterSpacing: "-0.03em",
                background: "var(--roboks-gradient)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
              }}>
                {brandName}
              </span>
            ) : null}
          </Link>

          {/* Desktop Navigation Links */}
          <nav style={{
            display: "none",
            alignItems: "center",
            gap: "28px",
            fontFamily: "var(--font-inter)",
            fontWeight: 650,
            fontSize: "var(--font-small)",
            color: "var(--color-text-muted)"
          }} className="desktop-nav">
            <a href="#courses" style={{ transition: "color 0.2s" }} className="nav-link">Курсы</a>
            <a href="#prices" style={{ transition: "color 0.2s" }} className="nav-link">Цены</a>
            <a href="#schedule" style={{ transition: "color 0.2s" }} className="nav-link">Расписание</a>
            <a href="#teachers" style={{ transition: "color 0.2s" }} className="nav-link">Преподаватели</a>
            <a href="#contacts" style={{ transition: "color 0.2s" }} className="nav-link">Контакты</a>
          </nav>

          {/* Desktop Actions */}
          <div style={{ display: "none", alignItems: "center", gap: "20px" }} className="desktop-actions">
            <a href={`tel:${cleanPhone}`} style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontWeight: 700,
              fontSize: "var(--font-small)",
              color: "var(--color-text)",
              transition: "color 0.2s"
            }}>
              <Phone size={16} style={{ color: "var(--color-accent)" }} />
              <span>{phone}</span>
            </a>
            <a href="#lead-form">
              <Button variant="primary-site" style={{ 
                height: "44px", 
                fontSize: "13px", 
                padding: "0 22px", 
                borderRadius: "var(--radius-button)",
                background: "var(--roboks-gradient)",
                border: "none",
                fontWeight: 700
              }}>
                Записаться
              </Button>
            </a>
          </div>

          {/* Mobile Burger Button */}
          <button 
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            style={{
              display: "block",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-text)",
              padding: "4px"
            }}
            className="mobile-burger-btn"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {isMenuOpen && (
        <div style={{
          position: "fixed",
          top: "72px",
          left: 0,
          right: 0,
          bottom: 0,
          background: "white",
          zIndex: 49,
          display: "flex",
          flexDirection: "column",
          padding: "32px 24px",
          gap: "24px",
          borderTop: "1px solid var(--color-border)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.05)"
        }}>
          <nav style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            fontSize: "1.1rem",
            fontWeight: 700,
            fontFamily: "var(--font-inter)"
          }}>
            <a href="#courses" onClick={() => setIsMenuOpen(false)} style={{ color: "var(--color-text)", borderBottom: "1px solid var(--color-border)", paddingBottom: "12px" }}>Курсы</a>
            <a href="#prices" onClick={() => setIsMenuOpen(false)} style={{ color: "var(--color-text)", borderBottom: "1px solid var(--color-border)", paddingBottom: "12px" }}>Цены</a>
            <a href="#schedule" onClick={() => setIsMenuOpen(false)} style={{ color: "var(--color-text)", borderBottom: "1px solid var(--color-border)", paddingBottom: "12px" }}>Расписание</a>
            <a href="#teachers" onClick={() => setIsMenuOpen(false)} style={{ color: "var(--color-text)", borderBottom: "1px solid var(--color-border)", paddingBottom: "12px" }}>Преподаватели</a>
            <a href="#contacts" onClick={() => setIsMenuOpen(false)} style={{ color: "var(--color-text)", borderBottom: "1px solid var(--color-border)", paddingBottom: "12px" }}>Контакты</a>
          </nav>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "auto", paddingBottom: "48px" }}>
            <a href={`tel:${cleanPhone}`} style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              fontWeight: 800,
              fontSize: "1.1rem",
              color: "var(--color-text)",
              padding: "12px",
              border: "1px solid var(--color-border)",
              borderRadius: "12px"
            }}>
              <Phone size={18} style={{ color: "var(--color-accent)" }} />
              {phone}
            </a>
            
            <a href="#lead-form" onClick={() => setIsMenuOpen(false)}>
              <Button style={{
                width: "100%",
                height: "50px",
                fontSize: "15px",
                fontWeight: 800,
                borderRadius: "12px",
                background: "var(--roboks-gradient)",
                color: "white",
                border: "none"
              }}>
                Записаться на занятие
              </Button>
            </a>
          </div>
        </div>
      )}

      {/* Global CSS for responsive show/hide */}
      <style jsx global>{`
        @media (min-width: 769px) {
          .desktop-nav { display: flex !important; }
          .desktop-actions { display: flex !important; }
          .mobile-burger-btn { display: none !important; }
        }
      `}</style>
    </>
  );
}
