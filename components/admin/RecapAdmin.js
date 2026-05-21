"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Save, Trash2, ArrowUp, ArrowDown, Image as ImageIcon, LayoutTemplate, DownloadCloud, Play, ChevronLeft, ChevronRight, X, Users, Upload } from "lucide-react";
import { uploadRecapImage } from "@/app/actions/upload";
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
  const [vdMembers, setVdMembers] = useState([]);
  const [vdLoading, setVdLoading] = useState(false);
  const [showVdPanel, setShowVdPanel] = useState(false);

  const [placeholderVersion, setPlaceholderVersion] = useState(0);
  const [selectedPlaceholder, setSelectedPlaceholder] = useState(null);

  // Extract placeholder info from current slide
  const getPlaceholders = useCallback(() => {
    if (!editorRef.current) return [];
    const phs = editorRef.current.querySelectorAll('.img-placeholder');
    return Array.from(phs).map((ph, i) => {
      const img = ph.querySelector('img');
      const label = ph.querySelector('span:not(.ph-icon)');
      const icon = ph.querySelector('.ph-icon');
      return {
        index: i,
        hasImage: !!img,
        imgSrc: img?.src || null,
        label: label?.textContent || `Ảnh ${i + 1}`,
        icon: icon?.textContent || '📸',
        element: ph
      };
    });
  }, []);

  // Reset selection when slide changes
  useEffect(() => {
    setSelectedPlaceholder(null);
  }, [currentIndex]);

  // Global paste handler for placeholder bar
  useEffect(() => {
    const handlePaste = (e) => {
      if (selectedPlaceholder === null) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          const phs = editorRef.current?.querySelectorAll('.img-placeholder');
          if (phs && phs[selectedPlaceholder]) {
            handleImageUpload(file, phs[selectedPlaceholder]);
          }
          return;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [selectedPlaceholder]);

  useEffect(() => {
    fetchSlides();
    fetchVdMembers();
  }, []);

  const getInjectedHtml = (baseHtml) => {
    let html = baseHtml || "";
    if (html.includes('VINH_DANH_START') && vdMembers.length > 0) {
      const cardsHtml = vdMembers.map(m => 
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
      html = html.replace(
        /<!-- VINH_DANH_START -->[\s\S]*?<!-- VINH_DANH_END -->/, 
        `<!-- VINH_DANH_START -->\n${cardsHtml}\n<!-- VINH_DANH_END -->`
      );
    }
    return html;
  };

  useEffect(() => {
    // When slide changes or vinh danh members update, update the editor content
    if (editorRef.current && slides[currentIndex]) {
      editorRef.current.innerHTML = getInjectedHtml(slides[currentIndex].content.html);
      
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
      // Bump so the placeholder bar re-renders with the new slide's images
      setPlaceholderVersion(v => v + 1);
    }
  }, [currentIndex, slides, vdMembers]);

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

  // ── Vinh Danh Members Management ──
  const fetchVdMembers = async () => {
    setVdLoading(true);
    const { data } = await supabase
      .from('vinh_danh_members')
      .select('*')
      .order('order_index', { ascending: true });
    if (data) setVdMembers(data);
    setVdLoading(false);
  };

  const handleVdAdd = async () => {
    const newMember = { name: 'Tên mới', achievements: 'Thành tích', photo_url: '', order_index: vdMembers.length };
    const { data, error } = await supabase.from('vinh_danh_members').insert([newMember]).select();
    if (error) {
      console.error('Insert error:', error);
      alert('Lỗi thêm thành viên: ' + error.message + '\nHãy kiểm tra RLS policy cho bảng vinh_danh_members.');
      return;
    }
    if (data && data[0]) setVdMembers([...vdMembers, data[0]]);
  };

  const vdUpdateTimers = useRef({});
  const handleVdUpdate = (id, field, value) => {
    // Update UI immediately
    setVdMembers(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
    // Debounce DB update
    const key = `${id}_${field}`;
    clearTimeout(vdUpdateTimers.current[key]);
    vdUpdateTimers.current[key] = setTimeout(async () => {
      await supabase.from('vinh_danh_members').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', id);
    }, 500);
  };

  const handleVdDelete = async (id) => {
    if (!confirm('Xóa thành viên vinh danh này?')) return;
    const member = vdMembers.find(m => m.id === id);
    if (member?.photo_url?.includes('/storage/v1/object/public/recap_images/')) {
      const prefix = '/storage/v1/object/public/recap_images/';
      const idx = member.photo_url.indexOf(prefix);
      if (idx !== -1) {
        const filePath = member.photo_url.substring(idx + prefix.length);
        if (filePath) await supabase.storage.from('recap_images').remove([filePath]);
      }
    }
    await supabase.from('vinh_danh_members').delete().eq('id', id);
    setVdMembers(prev => prev.filter(m => m.id !== id));
  };

  const handleVdPhotoUpload = async (id, file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `vinh_danh/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', 'recap_images');
    formData.append('path', fileName);
    
    try {
      const data = await uploadRecapImage(formData);
      
      if (data.error) throw new Error(data.error || 'Upload failed');
      
      await handleVdUpdate(id, 'photo_url', data.url);
    } catch (err) {
      alert('Lỗi upload: ' + err.message);
    }
  };

  const handleVdPhotoPaste = (id, e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        handleVdPhotoUpload(id, item.getAsFile());
        return;
      }
    }
  };

  const handleVdMove = async (index, dir) => {
    const targetIdx = dir === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= vdMembers.length) return;
    const newList = [...vdMembers];
    [newList[index], newList[targetIdx]] = [newList[targetIdx], newList[index]];
    newList.forEach((m, i) => m.order_index = i);
    setVdMembers(newList);
    for (const m of newList) {
      await supabase.from('vinh_danh_members').update({ order_index: m.order_index }).eq('id', m.id);
    }
  };

  const handleAddCollectiveAward = () => {
    if (!editorRef.current) return;
    const tagsContainer = editorRef.current.querySelector('.vd-award-tags');
    if (tagsContainer) {
      const newTag = document.createElement('span');
      newTag.className = 'vd-award-tag';
      newTag.innerHTML = `<span class="tag-icon">🥇</span> Nhập giải thưởng mới...`;
      tagsContainer.appendChild(newTag);
      attachEditorEvents();
      syncEditorContent();
    }
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
    const oldImg = targetNode.querySelector("img");
    const oldImgUrl = oldImg ? oldImg.src : null;

    targetNode.style.opacity = "0.5";
    
    // Upload to supabase storage via API Route
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `slides/${fileName}`;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', 'recap_images');
    formData.append('path', filePath);
    
    let imgUrl = '';
    try {
      const data = await uploadRecapImage(formData);
      if (data.error) throw new Error(data.error);
      imgUrl = data.url;
    } catch (err) {
      alert("Error uploading image: " + err.message);
      targetNode.style.opacity = "1";
      return;
    }
    
    // Replace content with image
    targetNode.innerHTML = `<img src="${imgUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" alt="uploaded" />`;
    targetNode.style.opacity = "1";
    
    // Force sync content
    syncEditorContent();
    // Bump placeholder version so the bar re-renders
    setPlaceholderVersion(v => v + 1);

    // Delete old image if it was uploaded to our storage
    if (oldImgUrl) {
      const bucket = 'recap_images';
      const prefix = `/storage/v1/object/public/${bucket}/`;
      const index = oldImgUrl.indexOf(prefix);
      if (index !== -1) {
        const oldFilePath = oldImgUrl.substring(index + prefix.length);
        if (oldFilePath) {
          try {
            await supabase.storage.from(bucket).remove([oldFilePath]);
          } catch (err) {
            console.error("Failed to delete old recap image:", err);
          }
        }
      }
    }

    // Auto save sau khi up ảnh thành công
    await handleSave();
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
      node.style.opacity = "";
    });
    
    // Remove active and show classes before saving so the public viewer animations work
    const slideEl = clone.querySelector('.slide');
    if (slideEl) {
        slideEl.classList.remove('active');
        slideEl.querySelectorAll('.anim').forEach(el => el.classList.remove('show'));
        slideEl.querySelectorAll('.typewriter').forEach(el => {
            el.style.visibility = '';
            // Update the original text attribute so the animation uses the newly edited text
            el.setAttribute('data-text-original', el.textContent.trim());
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
    
    // Capture current values upfront (before any async setState)
    const slideId = slides[currentIndex].id;
    const slideDuration = parseInt(slides[currentIndex].duration) || 15;
    const slideOrderIndex = slides[currentIndex].order_index;
    
    // Read content directly from DOM to capture all text + image edits
    let savedHtml = slides[currentIndex].content.html;
    if (editorRef.current) {
      const clone = editorRef.current.cloneNode(true);
      clone.querySelectorAll("[contenteditable]").forEach(node => {
        node.removeAttribute("contenteditable");
        node.style.outline = "";
      });
      clone.querySelectorAll(".img-placeholder, .credits-img").forEach(node => {
        node.style.cursor = "";
        node.style.outline = "";
        node.style.opacity = "";
      });
      const slideEl = clone.querySelector('.slide');
      if (slideEl) {
        slideEl.classList.remove('active');
        slideEl.querySelectorAll('.anim').forEach(el => el.classList.remove('show'));
        slideEl.querySelectorAll('.typewriter').forEach(el => {
          el.style.visibility = '';
          el.setAttribute('data-text-original', el.textContent.trim());
        });
      }
      savedHtml = clone.innerHTML;
      // Update local state preserving other JSON fields like quotes
      const newSlides = [...slides];
      const currentContent = newSlides[currentIndex].content || {};
      const newContent = { ...currentContent, html: savedHtml };
      newSlides[currentIndex] = { ...newSlides[currentIndex], content: newContent, duration: slideDuration };
      setSlides(newSlides);
    }
    
    console.log('Saving slide:', { id: slideId, duration: slideDuration, order_index: slideOrderIndex, htmlLength: savedHtml.length });
    
    const { error } = await supabase
      .from("recap_slides")
      .update({
        content: slides[currentIndex].content, // Use the updated state
        duration: slideDuration,
        order_index: slideOrderIndex
      })
      .eq("id", slideId);
      
    if (error) {
      console.error('Save error:', error);
      alert("Lỗi lưu slide: " + error.message);
    } else {
      // Re-fetch to sync state without F5
      await fetchSlides();
      alert("Đã lưu slide thành công! (Duration: " + slideDuration + "s)");
    }
    setIsSaving(false);
  };

  const handleDownloadBackup = () => {
    const dataStr = JSON.stringify({ slides, vdMembers }, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recap_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreBackup = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (!data.slides || !Array.isArray(data.slides)) {
          alert("File backup không hợp lệ!");
          return;
        }
        if (!confirm("CẢNH BÁO: Khôi phục sẽ xóa và ghi đè toàn bộ dữ liệu hiện tại bằng dữ liệu từ file backup. Bạn có chắc chắn?")) return;
        setIsSaving(true);

        // Delete all current slides
        if (slides.length > 0) {
          const ids = slides.map(s => s.id);
          await supabase.from("recap_slides").delete().in("id", ids);
        }

        // Insert new slides
        const inserts = data.slides.map(s => {
            const { id, created_at, ...rest } = s; 
            return rest;
        });
        const { data: newSlides, error } = await supabase.from("recap_slides").insert(inserts).select();
        
        if (error) throw error;
        
        // Restore vdMembers if present
        if (data.vdMembers && Array.isArray(data.vdMembers)) {
          const { data: currentVd } = await supabase.from("vinh_danh_members").select('id');
          if (currentVd && currentVd.length > 0) {
             await supabase.from("vinh_danh_members").delete().in("id", currentVd.map(v => v.id));
          }
          const vdInserts = data.vdMembers.map(v => {
             const { id, created_at, ...rest } = v;
             return rest;
          });
          if (vdInserts.length > 0) {
             await supabase.from("vinh_danh_members").insert(vdInserts);
          }
        }

        setSlides(newSlides.sort((a,b) => a.order_index - b.order_index));
        setCurrentIndex(0);
        alert("Khôi phục thành công!");
      } catch (err) {
        alert("Lỗi khôi phục: " + err.message);
      } finally {
        setIsSaving(false);
      }
    };
    reader.readAsText(file);
    e.target.value = null; // reset
  };

  const handleImportA5 = async () => {
    if (!confirm('LƯU Ý: Import sẽ nạp lại 21 slide mẫu. Nếu bạn đã thêm/xóa slide, tính năng giữ lại text/ảnh cũ có thể bị dán nhầm vị trí. Hệ thống sẽ tự động TẢI XUỐNG 1 FILE BACKUP trước khi làm. Tiếp tục?')) return;
    
    // Auto-backup to prevent disasters
    handleDownloadBackup();

    setIsSaving(true);

    // 1. Extract existing images, texts and duration from current slides before deleting
    const existingData = {}; 
    const parser = new DOMParser();
    slides.forEach((slide, idx) => {
      const doc = parser.parseFromString(slide.content.html || "", "text/html");
      
      // Extract images
      const imgContainers = doc.querySelectorAll(".img-placeholder, .credits-img");
      const images = [];
      imgContainers.forEach(container => {
        const img = container.querySelector("img");
        if (img && img.src && (img.src.startsWith("http") || img.src.startsWith("/"))) {
          images.push(img.outerHTML);
        } else {
          images.push(null); 
        }
      });

      // Extract texts
      const textNodes = doc.querySelectorAll("h1, h2, p, span, .big-title, .subtitle, .typewriter, .slide-desc, .chapter-label, .slide-quote, .achievement");
      const texts = [];
      textNodes.forEach(node => {
         if (!node.classList.contains('ph-icon')) {
             texts.push({ 
               html: node.innerHTML, 
               textOriginal: node.getAttribute('data-text-original') 
             });
         }
      });

      existingData[idx] = { images, texts, duration: slide.duration || 15 };
    });

    // 2. Delete all current slides
    if (slides.length > 0) {
      const ids = slides.map(s => s.id);
      await supabase.from("recap_slides").delete().in("id", ids);
    }
    
    // 3. Build new slides, merging saved data back in
    const inserts = slidesData.map((html, idx) => {
      let finalHtml = html;
      const savedData = existingData[idx];
      
      if (savedData) {
        const doc = parser.parseFromString(finalHtml, "text/html");
        
        // Restore images
        const containers = doc.querySelectorAll(".img-placeholder, .credits-img");
        containers.forEach((container, i) => {
          if (savedData.images[i]) {
            container.innerHTML = savedData.images[i];
          }
        });

        // Restore texts
        const textNodes = doc.querySelectorAll("h1, h2, p, span, .big-title, .subtitle, .typewriter, .slide-desc, .chapter-label, .slide-quote, .achievement");
        let textIdx = 0;
        textNodes.forEach(node => {
          if (!node.classList.contains('ph-icon') && savedData.texts[textIdx]) {
              node.innerHTML = savedData.texts[textIdx].html;
              if (savedData.texts[textIdx].textOriginal) {
                  node.setAttribute('data-text-original', savedData.texts[textIdx].textOriginal);
              }
              textIdx++;
          }
        });

        finalHtml = doc.body.innerHTML;
      }

      return {
        order_index: idx,
        slide_type: "a5k58_slide",
        content: { html: finalHtml },
        duration: savedData ? savedData.duration : 15
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

    // Handle floating quotes for credits slide
    if (slide.querySelector('#leftQuotesBox')) {
      const leftBox = slide.querySelector('#leftQuotesBox');
      const rightBox = slide.querySelector('#rightQuotesBox');
      if (leftBox) leftBox.innerHTML = '';
      if (rightBox) rightBox.innerHTML = '';
      
      // Find current slide data to get quotes
      const slideIndex = Array.from(slide.parentNode.children).indexOf(slide);
      const quotesData = slides[slideIndex]?.content?.quotes || [];
      
      if (leftBox && rightBox && quotesData.length > 0) {
          const shuffledData = [...quotesData].sort(() => 0.5 - Math.random());
          shuffledData.forEach((item, index) => {
              const div = document.createElement('div');
              div.className = 'quote-item';
              div.textContent = item.text;
              
              if (item.type === 'insta') {
                  div.style.color = '#1a1a1a'; div.style.fontWeight = '600';
              } else if (item.type === 'group') {
                  div.style.color = '#c62828'; div.style.fontWeight = '700';
              } else {
                  div.style.color = '#1565c0'; div.style.fontWeight = '700';
              }
              
              const duration = 18 + Math.random() * 8;
              const delay = (index / shuffledData.length) * 30; 
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
    const dbDuration = slides[index]?.duration;
    const totalDuration = (dbDuration && dbDuration > 0) ? dbDuration * 1000 : 15000;

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

  // Quotes Management Handlers
  const handleQuoteAdd = () => {
    const newSlides = [...slides];
    const currentContent = newSlides[currentIndex].content || {};
    const currentQuotes = currentContent.quotes || [];
    const newQuotes = [...currentQuotes, { text: "Quote mới", type: "quote", id: Date.now().toString() }];
    newSlides[currentIndex].content = { ...currentContent, quotes: newQuotes };
    setSlides(newSlides);
  };

  const handleQuoteUpdate = (qIndex, field, value) => {
    const newSlides = [...slides];
    const currentQuotes = [...(newSlides[currentIndex].content.quotes || [])];
    currentQuotes[qIndex] = { ...currentQuotes[qIndex], [field]: value };
    newSlides[currentIndex].content = { ...newSlides[currentIndex].content, quotes: currentQuotes };
    setSlides(newSlides);
  };

  const handleQuoteDelete = (qIndex) => {
    if (!confirm('Xóa bubble text này?')) return;
    const newSlides = [...slides];
    const currentQuotes = [...(newSlides[currentIndex].content.quotes || [])];
    currentQuotes.splice(qIndex, 1);
    newSlides[currentIndex].content = { ...newSlides[currentIndex].content, quotes: currentQuotes };
    setSlides(newSlides);
  };

  const handleAddPlaceholder = (type) => {
    if (!editorRef.current) return;
    const slideEl = editorRef.current.querySelector('.slide');
    if (!slideEl) return;
    
    // Find or create a scattered-gallery container
    let gallery = slideEl.querySelector('.scattered-gallery');
    if (!gallery) {
      gallery = document.createElement('div');
      gallery.className = 'scattered-gallery';
      // Insert before the last quote or at end of slide
      const quote = slideEl.querySelector('.slide-quote');
      if (quote) {
        slideEl.insertBefore(gallery, quote);
      } else {
        slideEl.appendChild(gallery);
      }
    }
    
    const count = gallery.querySelectorAll('.img-placeholder').length;
    const newPh = document.createElement('div');
    newPh.className = `img-placeholder anim show ${type === 'landscape' ? 'img-landscape' : 'img-portrait'}`;
    newPh.setAttribute('data-delay', String(700 + count * 200));
    newPh.innerHTML = `<span class="ph-icon">📸</span><span>Ảnh ${type === 'landscape' ? 'Ngang' : 'Dọc'} ${count + 1}</span>`;
    
    // Apply inline positioning slightly randomized to avoid full overlap
    const top = 10 + Math.random() * 40;
    const left = 10 + Math.random() * 40;
    newPh.style.top = `${top}%`;
    newPh.style.left = `${left}%`;
    newPh.style.zIndex = String(10 + count);
    
    gallery.appendChild(newPh);
    attachEditorEvents();
    syncEditorContent();
    setPlaceholderVersion(v => v + 1);
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
          <button onClick={() => setShowVdPanel(!showVdPanel)} className={`w-full flex items-center justify-center gap-2 ${showVdPanel ? 'bg-amber-700 text-white' : 'bg-gray-800 hover:bg-gray-700'} p-2 rounded text-sm transition`}>
            <Users size={16}/> Vinh Danh
          </button>
          <div className="my-2 border-t border-gray-800 pt-2"></div>
          <button onClick={handleImportA5} className="w-full flex items-center justify-center gap-2 bg-blue-900/50 hover:bg-blue-800 text-blue-200 p-2 rounded text-sm transition">
             <DownloadCloud size={16}/> Import Gốc A5K58
          </button>
          <div className="my-2 border-t border-gray-800 pt-2"></div>
          <button onClick={handleDownloadBackup} className="w-full flex items-center justify-center gap-2 bg-emerald-900/50 hover:bg-emerald-800 text-emerald-200 p-2 rounded text-sm transition">
             ⬇️ Tải Backup (JSON)
          </button>
          <label className="w-full flex items-center justify-center gap-2 bg-rose-900/50 hover:bg-rose-800 text-rose-200 p-2 rounded text-sm transition cursor-pointer">
             ⬆️ Khôi phục Backup
             <input type="file" accept=".json" className="hidden" onChange={handleRestoreBackup} />
          </label>
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
                {slides[currentIndex]?.content?.html?.includes('vd-award-tags') && (
                  <button onClick={handleAddCollectiveAward} className="flex items-center gap-1 px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded font-medium transition ml-4">
                    <Plus size={16}/> Thêm Giải Tập Thể
                  </button>
                )}
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
            
            {/* Image Placeholders Bar — Always visible */}
            {(() => {
              const phs = getPlaceholders();
              return (
                <div key={placeholderVersion} className="bg-gray-900/95 border-b border-gray-800 px-6 py-3">
                  <div className="flex items-center gap-3 mb-2">
                    <ImageIcon size={16} className="text-amber-400" />
                    <span className="text-sm font-semibold text-amber-400">Khung ảnh trong slide ({phs.length})</span>
                    {selectedPlaceholder !== null ? (
                      <span className="text-xs text-green-400 font-medium animate-pulse">📋 Đã chọn #{selectedPlaceholder + 1} — Ctrl+V để dán ảnh</span>
                    ) : (
                      <span className="text-xs text-gray-500">Click chọn khung → Copy ảnh → Ctrl+V dán</span>
                    )}
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-1 items-center" style={{ scrollbarWidth: 'thin' }}>
                    {phs.map((ph) => (
                      <div
                        key={ph.index}
                        className={`group shrink-0 w-28 h-20 rounded-lg border-2 cursor-pointer flex flex-col items-center justify-center gap-1 transition-all hover:scale-105 relative ${
                          selectedPlaceholder === ph.index
                            ? 'border-amber-400 bg-amber-900/30 ring-2 ring-amber-400/50 scale-105'
                            : ph.hasImage
                              ? 'border-green-500/60 bg-green-900/20 border-solid'
                              : 'border-gray-600 border-dashed bg-gray-800 hover:border-amber-500 hover:bg-gray-700'
                        }`}
                        title={`${ph.label} — Click chọn rồi Ctrl+V`}
                      >
                        {/* Select overlay */}
                        <div
                          onClick={() => setSelectedPlaceholder(selectedPlaceholder === ph.index ? null : ph.index)}
                          className="absolute inset-0 z-[1] rounded-lg"
                        />
                        {selectedPlaceholder === ph.index && (
                          <div className="absolute -top-2 -right-2 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center text-[10px] font-bold text-black z-10">✓</div>
                        )}
                        {/* Delete button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!confirm('Xóa khung ảnh này?')) return;
                            const phEls = editorRef.current?.querySelectorAll('.img-placeholder');
                            if (phEls && phEls[ph.index]) {
                              phEls[ph.index].remove();
                              syncEditorContent();
                              setPlaceholderVersion(v => v + 1);
                              setSelectedPlaceholder(null);
                            }
                          }}
                          className="absolute -top-2 -left-2 w-5 h-5 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white z-[10] opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ opacity: selectedPlaceholder === ph.index ? 1 : undefined }}
                          title="Xóa khung ảnh"
                        >✕</button>
                        {ph.hasImage ? (
                          <img src={ph.imgSrc} alt={ph.label} className="w-full h-full object-cover rounded-md" />
                        ) : (
                          <>
                            <span className="text-lg">{ph.icon}</span>
                            <span className="text-[10px] text-gray-400 truncate max-w-[100px] px-1">{ph.label}</span>
                          </>
                        )}
                      </div>
                    ))}
                    {/* Add new placeholder buttons */}
                    <div className="flex flex-col gap-2 shrink-0">
                      <div
                        onClick={() => handleAddPlaceholder('landscape')}
                        className="w-28 h-[36px] rounded-md border-2 border-dashed border-amber-500/60 bg-amber-900/10 hover:bg-amber-900/30 hover:border-amber-400 cursor-pointer flex items-center justify-center gap-1 transition-all hover:scale-105"
                        title="Thêm khung ảnh Ngang"
                      >
                        <Plus size={14} className="text-amber-400" />
                        <span className="text-[10px] text-amber-400 font-medium">Ảnh Ngang</span>
                      </div>
                      <div
                        onClick={() => handleAddPlaceholder('portrait')}
                        className="w-28 h-[36px] rounded-md border-2 border-dashed border-amber-500/60 bg-amber-900/10 hover:bg-amber-900/30 hover:border-amber-400 cursor-pointer flex items-center justify-center gap-1 transition-all hover:scale-105"
                        title="Thêm khung ảnh Dọc"
                      >
                        <Plus size={14} className="text-amber-400" />
                        <span className="text-[10px] text-amber-400 font-medium">Ảnh Dọc</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Bubble Texts Panel for Credits Slide */}
            {(slides[currentIndex]?.slide_type === 'credits' || slides[currentIndex]?.content?.html?.includes('leftQuotesBox') || slides[currentIndex]?.content?.html?.includes('creditsContainer') || slides[currentIndex]?.content?.html?.includes('credits-scroll')) && (
              <div className="bg-gray-900 border-b border-gray-800 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">💬 Quản Lý Bubble Texts</h3>
                  <button onClick={handleQuoteAdd} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm font-medium transition">
                    <Plus size={14}/> Thêm
                  </button>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
                  {(slides[currentIndex].content?.quotes || []).map((quote, idx) => (
                    <div key={idx} className={`shrink-0 w-64 bg-gray-800 rounded-xl p-3 border-l-4 snap-start relative ${quote.type === 'quote' ? 'border-blue-500' : quote.type === 'group' ? 'border-red-600' : 'border-gray-500 bg-gray-700'}`}>
                      <button onClick={() => handleQuoteDelete(idx)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white z-[10]" title="Xóa">✕</button>
                      <select 
                        value={quote.type} 
                        onChange={(e) => handleQuoteUpdate(idx, 'type', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 mb-2 text-sm focus:border-amber-500 focus:outline-none"
                      >
                        <option value="quote">📝 Quote (Xanh Navy)</option>
                        <option value="group">👥 Group (Đỏ)</option>
                        <option value="insta">📸 Insta (Đen)</option>
                      </select>
                      <textarea
                        value={quote.text}
                        onChange={(e) => handleQuoteUpdate(idx, 'text', e.target.value)}
                        className="w-full h-20 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm resize-none focus:border-amber-500 focus:outline-none"
                        placeholder="Nội dung..."
                      />
                    </div>
                  ))}
                  {(!slides[currentIndex].content?.quotes || slides[currentIndex].content.quotes.length === 0) && (
                    <div className="text-gray-500 italic py-4">Chưa có bubble text nào.</div>
                  )}
                </div>
              </div>
            )}

            {/* Vinh Danh Members Panel */}
            {showVdPanel && (
              <div className="bg-gray-900 border-b border-gray-800 p-4 max-h-[60vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold flex items-center gap-2"><Users size={20}/> Quản Lý Vinh Danh ({vdMembers.length})</h3>
                  <button onClick={handleVdAdd} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm font-medium transition">
                    <Plus size={14}/> Thêm
                  </button>
                </div>
                {vdLoading ? <p className="text-gray-400">Đang tải...</p> : (
                  <div className="space-y-3">
                    {vdMembers.map((member, idx) => (
                      <div key={member.id} className="flex gap-3 bg-gray-800 rounded-xl p-3 items-start">
                        <div className="shrink-0">
                          <div 
                            className="w-20 h-24 bg-gray-700 rounded-lg overflow-hidden cursor-pointer border-2 border-dashed border-gray-600 hover:border-amber-500 transition flex items-center justify-center"
                            onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.onchange = (e) => handleVdPhotoUpload(member.id, e.target.files[0]); input.click(); }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file?.type.startsWith('image/')) handleVdPhotoUpload(member.id, file); }}
                            onPaste={(e) => handleVdPhotoPaste(member.id, e)}
                            tabIndex={0}
                          >
                            {member.photo_url ? (
                              <img src={member.photo_url} alt={member.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="text-center text-xs text-gray-400"><Upload size={16} className="mx-auto mb-1" />Kéo thả</div>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <input type="text" value={member.name} onChange={(e) => handleVdUpdate(member.id, 'name', e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm font-bold focus:border-amber-500 outline-none" placeholder="Tên" />
                          <textarea value={member.achievements} onChange={(e) => handleVdUpdate(member.id, 'achievements', e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm resize-none focus:border-amber-500 outline-none" placeholder="Thành tích (mỗi dòng = 1 thành tích)" rows={3} />
                        </div>
                        <div className="shrink-0 flex flex-col gap-1">
                          <button onClick={() => handleVdMove(idx, 'up')} disabled={idx === 0} className="p-1 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-30 transition"><ArrowUp size={14}/></button>
                          <button onClick={() => handleVdMove(idx, 'down')} disabled={idx === vdMembers.length - 1} className="p-1 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-30 transition"><ArrowDown size={14}/></button>
                          <button onClick={() => handleVdDelete(member.id)} className="p-1 bg-red-900/50 rounded hover:bg-red-800 text-red-300 transition"><Trash2 size={14}/></button>
                        </div>
                      </div>
                    ))}
                    {vdMembers.length === 0 && <p className="text-gray-500 text-sm text-center py-4">Chưa có thành viên vinh danh. Nhấn "Thêm" để bắt đầu.</p>}
                  </div>
                )}
              </div>
            )}

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
              <div key={slide.id} dangerouslySetInnerHTML={{ __html: getInjectedHtml(slide.content.html) }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
