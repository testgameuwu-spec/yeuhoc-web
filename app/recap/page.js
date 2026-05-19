"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

export default function RecapViewer() {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);

  useEffect(() => {
    fetchSlides();
  }, []);

  const fetchSlides = async () => {
    const { data, error } = await supabase
      .from("recap_slides")
      .select("*")
      .order("order_index", { ascending: true });
    if (data && data.length > 0) {
      setSlides(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (slides.length === 0 || loading || !containerRef.current) return;

    // A5K58 SLIDESHOW ENGINE (Next.js Adapted)
    const domSlides = containerRef.current.querySelectorAll(".slide");
    const progressBar = document.getElementById("progressBar");
    if (!progressBar) return;
    
    progressBar.innerHTML = ''; // Reset
    
    let currentSlide = 0;
    let progressFills = [];
    let slideTimer = null;
    let progressInterval = null;
    const CHAR_SPEED = 35;

    // Initialize typewriter texts
    containerRef.current.querySelectorAll(".typewriter").forEach(el => {
      if (!el.dataset.textOriginal) {
        el.dataset.textOriginal = el.textContent.trim();
      }
      el.textContent = "";
    });

    // Build progress bar
    domSlides.forEach(() => {
      const seg = document.createElement("div");
      seg.className = "progress-segment";
      const fill = document.createElement("div");
      fill.className = "progress-fill";
      seg.appendChild(fill);
      progressBar.appendChild(seg);
      progressFills.push(fill);
    });
    
    // Duplicate seamless tracks
    containerRef.current.querySelectorAll('.gallery-track').forEach(track => {
        // Prevent duplicate appending if component remounts
        if (track.children.length > 0 && !track.dataset.cloned) {
            track.innerHTML += track.innerHTML;
            track.dataset.cloned = "true";
        }
    });

    function typeWriter(el, text, delay, speed) {
      return new Promise(resolve => {
        setTimeout(() => {
          el.style.visibility = "";
          el.textContent = "";
          el.classList.add("typing");
          let i = 0;
          function type() {
            if (i < text.length) {
              el.textContent += text.charAt(i);
              i++;
              setTimeout(type, speed);
            } else {
              el.classList.remove("typing");
              el.classList.add("done");
              resolve();
            }
          }
          type();
        }, delay);
      });
    }

    // Calculate the time when the last animation/typewriter on a slide finishes
    function getContentEndTime(slide) {
      let maxEnd = 0;
      // Check .anim elements (delay + ~900ms transition)
      slide.querySelectorAll(".anim").forEach(el => {
        const delay = parseInt(el.dataset.delay || "0");
        maxEnd = Math.max(maxEnd, delay + 900);
      });
      // Check typewriter elements (delay + text.length * CHAR_SPEED)
      slide.querySelectorAll(".typewriter").forEach(el => {
        const delay = parseInt(el.dataset.delay || "0");
        const text = el.dataset.textOriginal || "";
        const typingTime = text.length * CHAR_SPEED;
        maxEnd = Math.max(maxEnd, delay + typingTime);
      });
      return maxEnd;
    }

    function getSlideDuration(slideDom, index) {
      const contentEnd = getContentEndTime(slideDom);
      // Add 1.5s buffer after content finishes
      const contentBasedDuration = contentEnd + 1500;
      // Use DB configured duration as a minimum floor
      const dbDuration = slides[index]?.duration;
      const configuredMs = (dbDuration && dbDuration > 0) ? dbDuration * 1000 : 15000;
      // Use whichever is larger: content-based or configured
      return Math.max(contentBasedDuration, configuredMs);
    }

    function cycleOverlayImages(container) {
      const images = container.querySelectorAll(".img-placeholder");
      let idx = 0;
      images.forEach(img => img.classList.remove("visible"));
      if (images.length === 0) return;

      function showNext() {
        images.forEach(img => img.classList.remove("visible"));
        images[idx].classList.add("visible");
        idx = (idx + 1) % images.length;
      }
      showNext();
      const interval = setInterval(() => {
        showNext();
        if (idx === 0 && container.dataset.cycled) {
          clearInterval(interval);
        }
        container.dataset.cycled = "true";
      }, 2500);
      container._interval = interval;
    }

    function animateSlide(slide) {
      slide.querySelectorAll(".anim").forEach(el => {
        el.classList.remove("show");
      });
      slide.querySelectorAll(".typewriter").forEach(el => {
        el.classList.remove("typing", "done");
        el.textContent = "";
        el.style.visibility = "hidden";
      });
      const credits = slide.querySelector(".credits-scroll");
      if (credits) {
        credits.style.animation = "none";
        credits.offsetHeight; 
        credits.style.animation = "";
      }

      slide.querySelectorAll(".anim").forEach(el => {
        const delay = parseInt(el.dataset.delay || "0");
        setTimeout(() => el.classList.add("show"), delay);
      });

      slide.querySelectorAll(".typewriter").forEach(el => {
        const delay = parseInt(el.dataset.delay || "0");
        const text = el.dataset.textOriginal || "";
        typeWriter(el, text, delay, CHAR_SPEED);
      });

      const overlayContainer = slide.querySelector(".overlay-images");
      if (overlayContainer) {
        cycleOverlayImages(overlayContainer);
      }
    }

    function startProgress(duration) {
      let elapsed = 0;
      const step = 50;
      clearInterval(progressInterval);

      progressInterval = setInterval(() => {
        elapsed += step;
        const pct = Math.min((elapsed / duration) * 100, 100);
        if (progressFills[currentSlide]) {
            progressFills[currentSlide].style.width = pct + "%";
        }
        if (pct >= 100) {
          clearInterval(progressInterval);
        }
      }, step);
    }

    function showSlide(index) {
      clearTimeout(slideTimer);
      clearInterval(progressInterval);

      for (let i = 0; i < domSlides.length; i++) {
        if (i < index) {
          progressFills[i].style.width = "100%";
        } else if (i > index) {
          progressFills[i].style.width = "0%";
        }
      }
      if (progressFills[index]) {
          progressFills[index].style.width = "0%";
      }

      domSlides.forEach(s => s.classList.remove("active"));
      domSlides[index].classList.add("active");

      animateSlide(domSlides[index]);

      const totalDuration = getSlideDuration(domSlides[index], index);
      startProgress(totalDuration);

      slideTimer = setTimeout(() => {
        if (currentSlide < domSlides.length - 1) {
          currentSlide++;
          showSlide(currentSlide);
        } else {
          clearInterval(progressInterval);
        }
      }, totalDuration);
    }

    // Allow clicking "BẮT ĐẦU CHUYẾN TÀU" button globally in case it exists in a slide
    const clickHandler = (e) => {
        if (e.target.classList.contains('start-btn')) {
             if (e.target.textContent.includes('BẮT ĐẦU')) {
                 if (currentSlide < domSlides.length - 1) {
                    currentSlide++;
                    showSlide(currentSlide);
                 }
             } else if (e.target.textContent.includes('XEM LẠI')) {
                 currentSlide = 0;
                 showSlide(currentSlide);
             }
        }
    };
    
    document.addEventListener('click', clickHandler);

    showSlide(0);

    return () => {
      clearTimeout(slideTimer);
      clearInterval(progressInterval);
      document.removeEventListener('click', clickHandler);
    };
  }, [slides, loading]);

  if (loading) {
    return <div className="bg-[#0a0a0a] h-screen w-screen flex items-center justify-center text-white">Loading...</div>;
  }

  if (slides.length === 0) {
    return <div className="bg-[#0a0a0a] h-screen w-screen flex items-center justify-center text-white">Chưa có dữ liệu Recap.</div>;
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400&display=swap" rel="stylesheet" />
      <link rel="stylesheet" href="/recap/recap.css" />
      
      <div style={{ background: '#0a0a0a', fontFamily: "'Be Vietnam Pro', sans-serif", overflow: 'hidden', height: '100vh', width: '100vw', position: 'relative' }}>
          <img src="/recap/image_0.png" className="background-watermark" alt="watermark" />
          <div className="progress-container" id="progressBar"></div>
          
          <div ref={containerRef}>
            {slides.map((slide) => (
                <div 
                  key={slide.id} 
                  dangerouslySetInnerHTML={{ __html: slide.content.html }} 
                  // Note: outer HTML string contains `<div class="slide...">` already from the templates
                />
            ))}
          </div>
      </div>
    </>
  );
}
