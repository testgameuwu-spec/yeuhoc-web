"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Save, Trash2, ArrowUp, ArrowDown, Image as ImageIcon, LayoutTemplate, DownloadCloud, Play, ChevronLeft, ChevronRight, X } from "lucide-react";
import slidesData from "./slides_data.json";

export default function RecapAdmin() {
  const [slides, setSlides] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);
  const editorRef = useRef(null);
  const previewRef = useRef(null);
  const previewTimerRef = useRef(null);
  const previewProgressRef = useRef(null);

  useEffect(() => {
    fetchSlides();
  }, []);

  useEffect(() => {
    // When slide changes, update the editor content
    if (editorRef.current && slides[currentIndex]) {
      editorRef.current.innerHTML = slides[currentIndex].content.html || "";
      
      // Ensure the slide is visible in editor
      const slideEl = editorRef.current.querySelector('.slide');
      if (slideEl) {
          slideEl.classList.add('active');
          // Also show all anim and typewriter elements so they can be edited
          slideEl.querySelectorAll('.anim').forEach(el => el.classList.add('show'));
          slideEl.querySelectorAll('.typewriter').forEach(el => {
              el.style.visibility = 'visible';
              el.textContent = el.dataset.textOriginal || el.textContent || "Nhập chữ...";
          });
      }
      
      attachEditorEvents();
    }
  }, [currentIndex, slides]);

  const fetchSlides = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("recap_slides")
      .select("*")
      .order("order_index", { ascending: true });
    if (data) {
      setSlides(data);
    }
    setLoading(false);
  };

  const attachEditorEvents = () => {
    const el = editorRef.current;
    if (!el) return;

    // Make all text elements editable
    const texts = el.querySelectorAll("h1, h2, p, span, .big-title, .subtitle, .typewriter, .slide-desc, .chapter-label, .slide-quote, .achievement");
    texts.forEach(node => {
      // Avoid making icon spans editable if they are purely visual
      if (node.classList.contains('ph-icon')) return;
      node.setAttribute("contenteditable", "true");
      node.style.outline = "1px dashed rgba(255,255,255,0.3)";
      node.style.minHeight = "20px";
      node.style.minWidth = "20px";
      // Sync on blur instead of onInput to preserve cursor during editing
      node.addEventListener("blur", syncEditorContent);
    });

    // Make image placeholders droppable (including credits-img)
    const placeholders = el.querySelectorAll(".img-placeholder, .credits-img");
    placeholders.forEach(ph => {
      ph.style.cursor = "pointer";
      ph.style.outline = "2px dashed rgba(255,255,255,0.5)";
      
      // Prevent multiple listeners
      const newPh = ph.cloneNode(true);
      ph.parentNode.replaceChild(newPh, ph);
      
      newPh.addEventListener("dragover", (e) => e.preventDefault());
      newPh.addEventListener("drop", handleImageDrop);
      newPh.addEventListener("click", () => {
        // Trigger file input
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = (e) => handleImageUpload(e.target.files[0], newPh);
        input.click();
      });
    });
  };

  const handleImageDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleImageUpload(file, e.currentTarget);
    }
  };

  const handleImageUpload = async (file, targetNode) => {
    targetNode.style.opacity = "0.5";
    
    // Upload to supabase storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `slides/${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('recap_images')
      .upload(filePath, file);
      
    if (error) {
      alert("Error uploading image: " + error.message);
      targetNode.style.opacity = "1";
      return;
    }
    
    const { data: publicUrlData } = supabase.storage
      .from('recap_images')
      .getPublicUrl(filePath);
      
    const imgUrl = publicUrlData.publicUrl;
    
    // Replace content with image
    targetNode.innerHTML = `<img src="${imgUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" alt="uploaded" />`;
    targetNode.style.opacity = "1";
    
    // Force sync content
    syncEditorContent();
  };

  const syncEditorContent = () => {
    if (!editorRef.current) return;
    // Remove contenteditable before saving state (optional, but good for clean HTML)
    const clone = editorRef.current.cloneNode(true);
    clone.querySelectorAll("[contenteditable]").forEach(node => {
      node.removeAttribute("contenteditable");
      node.style.outline = "";
    });
    clone.querySelectorAll(".img-placeholder").forEach(node => {
      node.style.cursor = "";
      node.style.outline = "";
    });
    
    // Remove active and show classes before saving so the public viewer animations work
    const slideEl = clone.querySelector('.slide');
    if (slideEl) {
        slideEl.classList.remove('active');
        slideEl.querySelectorAll('.anim').forEach(el => el.classList.remove('show'));
        slideEl.querySelectorAll('.typewriter').forEach(el => {
            el.style.visibility = '';
            // we should not clear textContent here, otherwise it saves empty
        });
    }
    
    const newHtml = clone.innerHTML;
    const newSlides = [...slides];
    newSlides[currentIndex].content.html = newHtml;
    setSlides(newSlides);
  };

  const handleSave = async () => {
    if (!slides[currentIndex]) return;
    setIsSaving(true);
    syncEditorContent();
    
    const currentSlide = slides[currentIndex];
    const { error } = await supabase
      .from("recap_slides")
      .update({
        content: currentSlide.content,
        duration: currentSlide.duration,
        order_index: currentSlide.order_index
      })
      .eq("id", currentSlide.id);
      
    if (error) {
      alert("Lỗi lưu slide: " + error.message);
    } else {
      alert("Đã lưu slide thành công!");
    }
    setIsSaving(false);
  };

  const handleImportA5 = async () => {
    if (!confirm("Thao tác này sẽ cập nhật template nhưng GIỮ NGUYÊN ảnh đã upload. Bạn có chắc chắn?")) return;
    
    setIsSaving(true);

    // 1. Extract existing images from current slides before deleting
    const existingImages = {}; // { slideIndex: [ {selector, imgHtml} ] }
    const parser = new DOMParser();
    slides.forEach((slide, idx) => {
      const doc = parser.parseFromString(slide.content.html || "", "text/html");
      const imgContainers = doc.querySelectorAll(".img-placeholder, .credits-img");
      const images = [];
      imgContainers.forEach(container => {
        const img = container.querySelector("img");
        if (img && img.src && (img.src.startsWith("http") || img.src.startsWith("/"))) {
          images.push(img.outerHTML);
        } else {
          images.push(null); // no image uploaded for this slot
        }
      });
      if (images.length > 0) {
        existingImages[idx] = images;
      }
    });

    // 2. Delete all current slides
    if (slides.length > 0) {
      const ids = slides.map(s => s.id);
      await supabase.from("recap_slides").delete().in("id", ids);
    }
    
    // 3. Build new slides, merging saved images back in
    const inserts = slidesData.map((html, idx) => {
      let finalHtml = html;
      const savedImages = existingImages[idx];
      if (savedImages && savedImages.length > 0) {
        // Parse the new template and inject images back
        const doc = parser.parseFromString(finalHtml, "text/html");
        const containers = doc.querySelectorAll(".img-placeholder, .credits-img");
        containers.forEach((container, i) => {
          if (savedImages[i]) {
            // Replace placeholder content with the saved image
            container.innerHTML = savedImages[i];
          }
        });
        finalHtml = doc.body.innerHTML;
      }
      return {
        order_index: idx,
        slide_type: "a5k58_slide",
        content: { html: finalHtml },
        duration: 15
      };
    });
    
    const { data, error } = await supabase.from("recap_slides").insert(inserts).select();
    if (error) {
      alert("Lỗi: " + error.message);
    } else {
      setSlides(data.sort((a,b) => a.order_index - b.order_index));
      setCurrentIndex(0);
      alert("Đã import template mới thành công! Ảnh cũ đã được giữ nguyên.");
    }
    setIsSaving(false);
  };

  const handleAddSlide = async (templateName) => {
    const templates = {
      welcome: `<div class="slide slide-centered active" data-manual="true"><h1 class="big-title anim" data-delay="300">TIÊU ĐỀ MỚI</h1><p class="subtitle anim" data-delay="800">Phụ đề ở đây</p></div>`,
      text: `<div class="slide slide-centered"><p class="chapter-label anim" data-delay="300">Chương mới</p><h1 class="anim" data-delay="700">Tiêu đề Slide</h1><p class="typewriter" data-delay="1600">Nội dung tự gõ chữ ở đây...</p><p class="slide-desc anim" data-delay="5000">Mô tả thêm...</p></div>`,
      gallery: `<div class="slide"><p class="chapter-label anim" data-delay="100">Kỷ niệm</p><h2 class="anim" data-delay="300">Hình ảnh</h2><p class="slide-desc anim" data-delay="500">Mô tả...</p><div class="scattered-gallery"><div class="img-placeholder anim" data-delay="700"><span class="ph-icon">📸</span><span>Ảnh 1</span></div><div class="img-placeholder anim" data-delay="900"><span class="ph-icon">📸</span><span>Ảnh 2</span></div></div></div>`
    };
    
    const newSlide = {
      order_index: slides.length,
      slide_type: templateName,
      content: { html: templates[templateName] },
      duration: 15
    };
    
    const { data, error } = await supabase
      .from("recap_slides")
      .insert([newSlide])
      .select();
      
    if (data) {
      setSlides([...slides, data[0]]);
      setCurrentIndex(slides.length);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Bạn có chắc chắn muốn xóa slide này?")) return;
    const currentSlide = slides[currentIndex];
    
    await supabase.from("recap_slides").delete().eq("id", currentSlide.id);
    
    const newSlides = slides.filter((_, i) => i !== currentIndex);
    // Reorder
    for (let i = 0; i < newSlides.length; i++) {
      newSlides[i].order_index = i;
      await supabase.from("recap_slides").update({ order_index: i }).eq("id", newSlides[i].id);
    }
    
    setSlides(newSlides);
    setCurrentIndex(Math.max(0, currentIndex - 1));
  };

  const moveSlide = async (dir) => {
    if (dir === 'up' && currentIndex > 0) {
      const newSlides = [...slides];
      // Swap
      const temp = newSlides[currentIndex];
      newSlides[currentIndex] = newSlides[currentIndex - 1];
      newSlides[currentIndex - 1] = temp;
      
      newSlides[currentIndex].order_index = currentIndex;
      newSlides[currentIndex - 1].order_index = currentIndex - 1;
      
      setSlides(newSlides);
      setCurrentIndex(currentIndex - 1);
      
      // Update DB
      await supabase.from("recap_slides").update({ order_index: currentIndex }).eq("id", newSlides[currentIndex].id);
      await supabase.from("recap_slides").update({ order_index: currentIndex - 1 }).eq("id", newSlides[currentIndex - 1].id);
    } else if (dir === 'down' && currentIndex < slides.length - 1) {
      const newSlides = [...slides];
      // Swap
      const temp = newSlides[currentIndex];
      newSlides[currentIndex] = newSlides[currentIndex + 1];
      newSlides[currentIndex + 1] = temp;
      
      newSlides[currentIndex].order_index = currentIndex;
      newSlides[currentIndex + 1].order_index = currentIndex + 1;
      
      setSlides(newSlides);
      setCurrentIndex(currentIndex + 1);
      
      // Update DB
      await supabase.from("recap_slides").update({ order_index: currentIndex }).eq("id", newSlides[currentIndex].id);
      await supabase.from("recap_slides").update({ order_index: currentIndex + 1 }).eq("id", newSlides[currentIndex + 1].id);
    }
  };

  // ── Preview Engine ──
  const CHAR_SPEED = 35;

  const runTypewriter = (el, text, delay, speed) => {
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
  };

  const getContentEndTime = (slide) => {
    let maxEnd = 0;
    slide.querySelectorAll(".anim").forEach(el => {
      const delay = parseInt(el.dataset.delay || "0");
      maxEnd = Math.max(maxEnd, delay + 900);
    });
    slide.querySelectorAll(".typewriter").forEach(el => {
      const delay = parseInt(el.dataset.delay || "0");
      const text = el.dataset.textOriginal || "";
      maxEnd = Math.max(maxEnd, delay + text.length * CHAR_SPEED);
    });
    return maxEnd;
  };

  const animatePreviewSlide = (slide) => {
    slide.querySelectorAll(".anim").forEach(el => el.classList.remove("show"));
    slide.querySelectorAll(".typewriter").forEach(el => {
      el.classList.remove("typing", "done");
      el.textContent = "";
      el.style.visibility = "hidden";
    });
    const credits = slide.querySelector(".credits-scroll");
    if (credits) { credits.style.animation = "none"; credits.offsetHeight; credits.style.animation = ""; }

    slide.querySelectorAll(".anim").forEach(el => {
      const delay = parseInt(el.dataset.delay || "0");
      setTimeout(() => el.classList.add("show"), delay);
    });
    slide.querySelectorAll(".typewriter").forEach(el => {
      const delay = parseInt(el.dataset.delay || "0");
      const text = el.dataset.textOriginal || "";
      runTypewriter(el, text, delay, CHAR_SPEED);
    });
  };

  const showPreviewSlide = useCallback((index) => {
    const container = previewRef.current;
    if (!container) return;
    clearTimeout(previewTimerRef.current);
    clearInterval(previewProgressRef.current);

    const domSlides = container.querySelectorAll(".slide");
    const progressFills = container.querySelectorAll(".preview-progress-fill");
    if (!domSlides[index]) return;

    // Update progress segments
    progressFills.forEach((fill, i) => {
      fill.style.width = i < index ? "100%" : "0%";
    });

    domSlides.forEach(s => s.classList.remove("active"));
    domSlides[index].classList.add("active");

    // Initialize typewriter texts
    domSlides[index].querySelectorAll(".typewriter").forEach(el => {
      if (!el.dataset.textOriginal) {
        el.dataset.textOriginal = el.textContent.trim();
      }
      el.textContent = "";
    });

    animatePreviewSlide(domSlides[index]);

    // Duration calculation
    const contentEnd = getContentEndTime(domSlides[index]);
    const contentBased = contentEnd + 1500;
    const dbDuration = slides[index]?.duration;
    const configuredMs = (dbDuration && dbDuration > 0) ? dbDuration * 1000 : 15000;
    const totalDuration = Math.max(contentBased, configuredMs);

    // Progress animation
    let elapsed = 0;
    const step = 50;
    previewProgressRef.current = setInterval(() => {
      elapsed += step;
      const pct = Math.min((elapsed / totalDuration) * 100, 100);
      if (progressFills[index]) progressFills[index].style.width = pct + "%";
      if (pct >= 100) clearInterval(previewProgressRef.current);
    }, step);

    // Auto-advance
    previewTimerRef.current = setTimeout(() => {
      if (index < domSlides.length - 1) {
        setPreviewSlideIndex(index + 1);
      } else {
        clearInterval(previewProgressRef.current);
      }
    }, totalDuration);
  }, [slides]);

  // Run engine when preview slide changes
  useEffect(() => {
    if (previewOpen) {
      // Small delay to let DOM render
      const t = setTimeout(() => showPreviewSlide(previewSlideIndex), 50);
      return () => clearTimeout(t);
    }
  }, [previewOpen, previewSlideIndex, showPreviewSlide]);

  // Keyboard nav in preview
  useEffect(() => {
    if (!previewOpen) return;
    const handler = (e) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        setPreviewSlideIndex(prev => Math.min(prev + 1, slides.length - 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setPreviewSlideIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === "Escape") {
        closePreview();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [previewOpen, slides.length]);

  const openPreview = () => {
    syncEditorContent();
    setPreviewSlideIndex(currentIndex);
    setPreviewOpen(true);
  };

  const closePreview = () => {
    clearTimeout(previewTimerRef.current);
    clearInterval(previewProgressRef.current);
    setPreviewOpen(false);
  };

  if (loading) return <div className="p-10 text-white">Loading...</div>;

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white">
      {/* Sidebar List */}
      <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800 font-bold text-lg flex justify-between items-center">
          <span>Recap Slides</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {slides.map((s, i) => (
            <div 
              key={s.id}
              onClick={() => { syncEditorContent(); setCurrentIndex(i); }}
              className={`p-3 rounded-lg cursor-pointer flex justify-between items-center transition-colors ${i === currentIndex ? 'bg-red-900 border border-red-500' : 'bg-gray-800 hover:bg-gray-700'}`}
            >
              <span className="truncate flex-1">Slide {i + 1} ({s.slide_type})</span>
            </div>
          ))}
        </div>
        
        <div className="p-4 border-t border-gray-800 space-y-2">
          <p className="text-xs text-gray-400 mb-2">Thêm Slide mới:</p>
          <button onClick={() => handleAddSlide('welcome')} className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 p-2 rounded text-sm"><LayoutTemplate size={16}/> Welcome</button>
          <button onClick={() => handleAddSlide('text')} className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 p-2 rounded text-sm"><LayoutTemplate size={16}/> Text & Typewriter</button>
          <button onClick={() => handleAddSlide('gallery')} className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 p-2 rounded text-sm"><LayoutTemplate size={16}/> Gallery</button>
          
          <div className="my-2 border-t border-gray-800 pt-2"></div>
          <button onClick={handleImportA5} className="w-full flex items-center justify-center gap-2 bg-blue-900/50 hover:bg-blue-800 text-blue-200 p-2 rounded text-sm transition">
             <DownloadCloud size={16}/> Import Gốc A5K58
          </button>
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="/recap/recap.css" />
        
        {/* Editor Toolbar */}
        {slides.length > 0 ? (
          <>
            <div className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 z-50">
              <div className="flex items-center gap-4">
                <span className="font-semibold">Đang sửa Slide {currentIndex + 1}</span>
                <button onClick={() => moveSlide('up')} disabled={currentIndex === 0} className="p-2 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-50"><ArrowUp size={16}/></button>
                <button onClick={() => moveSlide('down')} disabled={currentIndex === slides.length - 1} className="p-2 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-50"><ArrowDown size={16}/></button>
                <div className="flex items-center gap-2 ml-4">
                   <span className="text-sm text-gray-400">Duration (s):</span>
                   <input 
                     type="number" 
                     value={slides[currentIndex]?.duration || 15}
                     onChange={(e) => {
                       const newSlides = [...slides];
                       newSlides[currentIndex].duration = parseInt(e.target.value);
                       setSlides(newSlides);
                     }}
                     className="bg-gray-800 border border-gray-700 rounded px-2 py-1 w-20 text-white"
                   />
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button onClick={openPreview} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium transition">
                  <Play size={16}/> Preview
                </button>
                <button onClick={handleDelete} className="flex items-center gap-2 px-4 py-2 bg-red-900/50 hover:bg-red-900 text-red-200 rounded transition">
                  <Trash2 size={16}/> Xóa Slide
                </button>
                <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium transition">
                  <Save size={16}/> {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </div>
            
            {/* Canvas Preview Area */}
            <div className="flex-1 bg-black overflow-hidden relative" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
                {/* We render the slide inside a container that mimics the full screen */}
                <div 
                   ref={editorRef}
                   className="w-full h-full relative"
                   style={{ background: '#fff' }}
                >
                </div>
                
                <div className="absolute bottom-4 left-4 right-4 text-center pointer-events-none opacity-50 text-gray-400 text-sm">
                  Click vào chữ để sửa nội dung. Kéo thả ảnh hoặc click vào ô ảnh để thay đổi.
                </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 flex-col gap-4">
             <p>Chưa có slide nào.</p>
             <p>Chọn mẫu bên trái để thêm mới.</p>
          </div>
        )}
      </div>

      {/* ── Fullscreen Preview Overlay ── */}
      {previewOpen && (
        <div className="fixed inset-0 z-[9999] bg-black" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
          <link rel="stylesheet" href="/recap/recap.css" />
          {/* Close button */}
          <button onClick={closePreview} className="absolute top-4 right-4 z-[10001] p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition">
            <X size={24} />
          </button>
          {/* Slide counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[10001] px-4 py-1.5 bg-black/60 rounded-full text-white text-sm font-semibold">
            {previewSlideIndex + 1} / {slides.length}
          </div>
          {/* Prev / Next */}
          <button
            onClick={() => setPreviewSlideIndex(prev => Math.max(prev - 1, 0))}
            disabled={previewSlideIndex === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-[10001] p-3 bg-black/40 hover:bg-black/70 text-white rounded-full disabled:opacity-20 transition"
          >
            <ChevronLeft size={28} />
          </button>
          <button
            onClick={() => setPreviewSlideIndex(prev => Math.min(prev + 1, slides.length - 1))}
            disabled={previewSlideIndex === slides.length - 1}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-[10001] p-3 bg-black/40 hover:bg-black/70 text-white rounded-full disabled:opacity-20 transition"
          >
            <ChevronRight size={28} />
          </button>

          {/* Preview container */}
          <div ref={previewRef} className="w-full h-full relative" style={{ background: '#fff' }}>
            {/* Progress bar */}
            <div className="progress-container" style={{ position: 'absolute', top: 10, left: 14, right: 14, display: 'flex', gap: 3, zIndex: 100 }}>
              {slides.map((_, i) => (
                <div key={i} className="progress-segment" style={{ flex: 1, height: 3, background: 'rgba(0,0,0,0.07)', borderRadius: 2, overflow: 'hidden' }}>
                  <div className="preview-progress-fill" style={{ height: '100%', width: '0%', background: '#c62828', borderRadius: 2 }} />
                </div>
              ))}
            </div>
            {/* Slides */}
            {slides.map((slide) => (
              <div key={slide.id} dangerouslySetInnerHTML={{ __html: slide.content.html }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
