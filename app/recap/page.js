"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

export default function RecapViewer() {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vinhDanhMembers, setVinhDanhMembers] = useState([]);
  const containerRef = useRef(null);
  const audioRef = useRef(null);
  const currentSongRef = useRef(1);

  useEffect(() => {
    fetchSlides();
    fetchVinhDanhMembers();
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

  const fetchVinhDanhMembers = async () => {
    const { data } = await supabase
      .from("vinh_danh_members")
      .select("*")
      .order("order_index", { ascending: true });
    if (data) setVinhDanhMembers(data);
  };

  const buildVinhDanhCards = () => {
    return vinhDanhMembers.map(m => 
      `<div class="personal-award-card static-card">
        <div class="card-photo"><img src="${m.photo_url || ''}" alt="${m.name}"></div>
        <div class="card-info-wrap">
          <div class="card-name">${m.name}</div>
          <div class="card-name-divider"></div>
          <div class="card-achievements">
            <div class="ach-label">Thành Tích</div>
            <div class="ach-text">${(m.achievements || '').replace(/\n/g, '<br>')}</div>
          </div>
        </div>
      </div>`
    ).join('');
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
    const CHAR_SPEED = 50;

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
      // Typewriters run sequentially: first delay + sum of all typing times + gaps
      const typewriters = slide.querySelectorAll(".typewriter");
      if (typewriters.length > 0) {
        const firstDelay = parseInt(typewriters[0].dataset.delay || "0");
        let totalTyping = firstDelay;
        typewriters.forEach(el => {
          const text = el.dataset.textOriginal || el.textContent || "";
          totalTyping += text.length * CHAR_SPEED + 500; // typing + gap
        });
        maxEnd = Math.max(maxEnd, totalTyping);
      }
      return maxEnd;
    }

    function getSlideDuration(slideDom, index) {
      // Use DB configured duration strictly
      const dbDuration = slides[index]?.duration;
      return (dbDuration && dbDuration > 0) ? dbDuration * 1000 : 15000;
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

      // Split .anim into before/after typewriter groups
      const typewriters = Array.from(slide.querySelectorAll(".typewriter"));
      const firstTwDelay = typewriters.length > 0 ? parseInt(typewriters[0].dataset.delay || "0") : Infinity;
      
      const animsBefore = [];
      const animsAfter = [];
      slide.querySelectorAll(".anim").forEach(el => {
        const delay = parseInt(el.dataset.delay || "0");
        if (delay < firstTwDelay || typewriters.length === 0) {
          animsBefore.push(el);
        } else {
          animsAfter.push(el);
        }
      });

      // Show before-typewriter anims normally
      animsBefore.forEach(el => {
        const delay = parseInt(el.dataset.delay || "0");
        setTimeout(() => el.classList.add("show"), delay);
      });

      // Run typewriters sequentially, then show after-typewriter anims
      if (typewriters.length > 0) {
        let chain = new Promise(r => setTimeout(r, firstTwDelay));
        typewriters.forEach(el => {
          chain = chain.then(() => {
            const text = el.dataset.textOriginal || "";
            return typeWriter(el, text, 0, CHAR_SPEED).then(() => {
              return new Promise(r => setTimeout(r, 500));
            });
          });
        });
        // After all typewriters done, show remaining anims
        chain.then(() => {
          animsAfter.forEach((el, i) => {
            setTimeout(() => el.classList.add("show"), i * 400);
          });
        });
      }

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
      
      if (domSlides[index].dataset.manual === 'true') {
        if (progressFills[index]) {
            progressFills[index].style.width = '0%';
        }
      } else {
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
    }

    const clickHandler = (e) => {
        // Handle start buttons
        if (e.target.classList.contains('start-btn')) {
             if (e.target.textContent.toUpperCase().includes('BẮT ĐẦU') || e.target.textContent.toUpperCase().includes('CHECK - IN') || e.target.textContent.toUpperCase().includes('CHECK IN')) {
                 // Start background music
                 if (audioRef.current) {
                   currentSongRef.current = 1;
                   audioRef.current.src = "/recap/backgroundmusic.mp3";
                   audioRef.current.currentTime = 0;
                   audioRef.current.play().catch(() => {});
                 }
                 if (currentSlide < domSlides.length - 1) {
                    currentSlide++;
                    showSlide(currentSlide);
                 }
             } else if (e.target.textContent.toUpperCase().includes('XEM LẠI')) {
                 if (audioRef.current) {
                   audioRef.current.pause();
                 }
                 currentSlide = 0;
                 showSlide(currentSlide);
             }
             return;
        }

        // Handle generic click to advance/go back
        if (e.target.closest('.img-placeholder') || e.target.closest('.personal-award-card')) return;
        
        const x = e.clientX;
        const width = window.innerWidth;
        if (x < width * 0.3) {
            if (currentSlide > 0) {
                currentSlide--;
                showSlide(currentSlide);
            }
        } else {
            if (currentSlide < domSlides.length - 1) {
                currentSlide++;
                showSlide(currentSlide);
            }
        }
    };
    
    document.addEventListener('click', clickHandler);

    // ===== VINH DANH CAROUSEL =====
    let vdAutoTimer;
    function initVinhDanhCarousel() {
        const track = document.getElementById('vdTrack');
        if (!track) return;
        const cards = Array.from(track.querySelectorAll('.personal-award-card'));
        if (cards.length === 0) return;
        let current = 0;
        const N = cards.length;
        const INTERVAL = 5000;

        function render() {
            const indices = [((current - 1) + N) % N, current, (current + 1) % N];
            cards.forEach((card, i) => {
                card.className = 'personal-award-card';
                if (i === indices[0]) card.classList.add('side-left');
                else if (i === indices[1]) card.classList.add('center');
                else if (i === indices[2]) card.classList.add('side-right');
            });
        }

        function goTo(idx) {
            current = ((idx % N) + N) % N;
            render();
            resetTimer();
        }

        window.vdPrev = () => goTo(current - 1);
        window.vdNext = () => goTo(current + 1);

        function resetTimer() {
            clearInterval(vdAutoTimer);
            vdAutoTimer = setInterval(() => goTo(current + 1), INTERVAL);
        }
        
        cards.forEach((card, i) => {
            card.onclick = () => {
                if (!card.classList.contains('center')) {
                    goTo(i);
                }
            };
        });

        let touchStartX = 0;
        const container = document.getElementById('vdCarousel');
        if(container) {
            container.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
            container.addEventListener('touchend', e => {
                const diff = touchStartX - e.changedTouches[0].clientX;
                if (Math.abs(diff) > 40) goTo(diff > 0 ? current + 1 : current - 1);
            });
        }

        render();
        resetTimer();
    }
    
    // ===== FLOATING QUOTES LOGIC =====
    // Lấy dữ liệu quotes động từ slide credits (thường là slide cuối)
    let floatingData = [];
    const creditsSlide = slides[slides.length - 1];
    if (creditsSlide) {
        const parsedContent = typeof creditsSlide.content === 'string' ? JSON.parse(creditsSlide.content) : creditsSlide.content;
        if (parsedContent?.quotes && Array.isArray(parsedContent.quotes)) {
            floatingData = parsedContent.quotes;
        }
    }

    function initFloatingQuotes() {
        const leftBox = document.getElementById('leftQuotesBox');
        const rightBox = document.getElementById('rightQuotesBox');
        
        if (leftBox && rightBox && leftBox.children.length === 0) {
            const shuffledData = [...floatingData].sort(() => 0.5 - Math.random());
            shuffledData.forEach((item, index) => {
                const div = document.createElement('div');
                div.className = 'quote-item';
                div.textContent = item.text;
                
                if (item.type === 'insta') {
                    div.style.color = '#1a1a1a'; // Đen
                    div.style.fontWeight = '600';
                } else if (item.type === 'group') {
                    div.style.color = '#c62828'; // Đỏ sẫm
                    div.style.fontWeight = '700';
                } else {
                    div.style.color = '#1565c0'; // Xanh Navy đậm cho Quote
                    div.style.fontWeight = '700';
                }
                
                const duration = 18 + Math.random() * 8; // Từ 18s đến 26s
                // Trải đều thời gian xuất hiện từ 0 đến 30s để đảm bảo ai cũng lên sóng 1 lần trước khi hết slide (Slide dài 45s)
                const delay = (index / shuffledData.length) * 30; 
                
                // Vị trí left/right ngẫu nhiên nhưng giới hạn từ 0% đến 15% để không bị tràn ra khỏi khung 28%
                const pos = Math.random() * 15; 
                
                div.style.animationDuration = `${duration}s`;
                div.style.animationDelay = `${delay}s`;
                
                if (index % 2 === 0) {
                    div.style.left = `${pos}%`;
                    leftBox.appendChild(div);
                } else {
                    div.style.right = `${pos}%`;
                    rightBox.appendChild(div);
                }
            });
        }
    }
    
    initFloatingQuotes();
    initVinhDanhCarousel();

    showSlide(0);

    return () => {
      clearTimeout(slideTimer);
      clearInterval(progressInterval);
      clearInterval(vdAutoTimer);
      document.removeEventListener('click', clickHandler);
    };
  }, [slides, loading, vinhDanhMembers]);

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
      <audio 
        ref={audioRef} 
        src="/recap/backgroundmusic.mp3" 
        preload="auto" 
        onEnded={() => {
          if (currentSongRef.current === 1) {
            currentSongRef.current = 2;
            if (audioRef.current) {
              audioRef.current.src = "/recap/backgroundmusic2.mp3";
              audioRef.current.play().catch(() => {});
            }
          }
        }}
      />
      
      <div style={{ background: '#0a0a0a', fontFamily: "'Be Vietnam Pro', sans-serif", overflow: 'hidden', height: '100vh', width: '100vw', position: 'relative' }}>
          <img src="/recap/imgbackground.png" className="background-watermark" alt="watermark" />
          <div className="progress-container" id="progressBar"></div>
          
          <div ref={containerRef}>
            {slides.map((slide) => {
                let html = slide.content.html || '';
                if (html.includes('VINH_DANH_START') && vinhDanhMembers.length > 0) {
                  html = html.replace(/<!-- VINH_DANH_START -->[\s\S]*?<!-- VINH_DANH_END -->/, buildVinhDanhCards());
                }
                return (
                  <div 
                    key={slide.id} 
                    dangerouslySetInnerHTML={{ __html: html }} 
                  />
                );
            })}
          </div>
      </div>
    </>
  );
}
