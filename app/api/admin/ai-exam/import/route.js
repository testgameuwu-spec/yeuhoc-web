import mammoth from 'mammoth';
import { generateText } from 'ai';
import { deepseek } from '@ai-sdk/deepseek';
import { PDFParse } from 'pdf-parse';
import path from 'path';
import { pathToFileURL } from 'url';
import { parseQuizText } from '@/lib/parser';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const NORMALIZE_MODEL = 'deepseek-v4-pro';
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_OUTPUT_TOKENS = 20000;
const OCR_LOG_TABLE = 'ocr_import_logs';
PDFParse.setWorker(pathToFileURL(path.join(
  process.cwd(),
  'node_modules',
  'pdfjs-dist',
  'legacy',
  'build',
  'pdf.worker.mjs',
)).href);
const SUPPORTED_TYPES = new Set([
  'text/plain',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
]);

const STRUCTURE_PROMPT = `Vai trò: Bạn là một chuyên gia số hóa dữ liệu giáo dục và chuyên gia LaTeX. Nhiệm vụ của bạn: Đọc file đính kèm (PDF/DOCX/PNG/JPG), nhận diện nội dung (bao gồm chữ viết, công thức toán học, bảng biểu) và chuyển đổi chúng sang định dạng văn bản cấu trúc .txt chính xác 100%. Trong văn bản cấu trúc có chứa markdown text cơ bản nếu bạn quét ra: Chữ in đậm, chữ có chứa underline,...

Quy tắc cấu trúc: Mỗi câu hỏi (hoặc đoạn ngữ cảnh) phải được bao bọc bởi ====START==== và ====END====. Trong mỗi khối, bắt buộc có các trường sau:

[ID] Số thứ tự câu hỏi hoặc mã định danh.
[TYPE]
Ghi MCQ nếu là trắc nghiệm 4 lựa chọn.
Ghi SA nếu là câu hỏi điền số/trả lời ngắn.
Ghi TF nếu là câu hỏi trắc nghiệm Đúng/Sai (thường gồm nhiều ý nhỏ a, b, c, d).
Ghi TEXT nếu đây là một đoạn NGỮ CẢNH CHUNG (không có đáp án, dùng để đọc và trả lời cho các câu hỏi bên dưới).
[LEVEL] Phân loại (Dễ, Trung bình, Khó) dựa trên nội dung đề bài.
[CONTENT] Nội dung câu hỏi hoặc nội dung đoạn ngữ cảnh chung. Bắt buộc dùng LaTeX cho mọi công thức toán học (ví dụ: x^2 + \\sqrt{x}). Nếu có hình ảnh/biểu đồ, hãy mô tả ngắn gọn nội dung hình ảnh trong dấu ngoặc vuông [Mô tả hình ảnh: ...].
[LINKED_TO] (TRƯỜNG MỚI CHỈ DÀNH CHO CÂU HỎI CON): Nếu câu hỏi này phụ thuộc vào một đoạn "Ngữ cảnh chung" ở trên, hãy ghi [ID] của đoạn ngữ cảnh đó vào đây. Nếu không, không ghi trường này.
[OPTIONS]
Với MCQ: Liệt kê các phương án A, B, C, D trên từng dòng.
Với TF: Liệt kê các ý chọn a), b), c), d) trên từng dòng.
Với SA hoặc TEXT: Ghi "None".
[ANSWER] Đáp án đúng.
Với MCQ: Ghi A, B, C hoặc D.
Với TF: Ghi định dạng a-Đ, b-S, c-Đ, d-S (Đ: Đúng, S: Sai).
Với SA: Ghi giá trị cụ thể (ví dụ: 123.45).
Với TEXT: Bỏ trống hoặc ghi "None".
[SOL] Lời giải chi tiết (Dùng LaTeX cho công thức).
[IMAGE] Ghi "Có" nếu có hình vẽ (hình học, đồ thị), bỏ qua trường này nếu không có.
LƯU Ý QUAN TRỌNG VỀ CÂU HỎI LIÊN KẾT (SHARED CONTEXT):

Hãy tinh ý nhận diện những cụm từ như: "Đọc đoạn trích dưới đây và trả lời các câu hỏi từ [X] đến [Y]", "Dựa vào thông tin sau để trả lời câu...", "Read the following passage and answer the questions...", hoặc các định dạng tương tự.
Khi gặp trường hợp này, bạn phải TÁCH đoạn văn bản dùng chung đó ra thành 1 khối độc lập với [TYPE] TEXT, cấp cho nó một [ID] riêng biệt (ví dụ: [ID] CONTEXT_1).
Sau đó, ở các câu hỏi con (từ [X] đến [Y]), bạn phân loại [TYPE] như bình thường (MCQ, SA, TF) nhưng PHẢI THÊM trường [LINKED_TO] CONTEXT_1 để hệ thống biết các câu này lấy thông tin từ khối TEXT phía trên.
LƯU Ý VỀ ĐỊNH DẠNG CHUNG:

MỖI SAU KHI GHI TÊN TRƯỜNG KHÔNG ĐƯỢC CÓ DẤU HAI CHẤM (:) MÀ HÃY CÁCH RA (space). Ví dụ: [ID] 001 thay vì [ID]: 001.
Quy tắc định dạng Toán học: Sử dụng cặp dấu $...$ cho công thức nằm trong dòng. Sử dụng cặp dấu $$...$$ cho công thức nằm riêng một dòng. Đảm bảo các ký hiệu đặc biệt như \\Delta, \\in, \\mathbb{R}, các phân số \\frac{a}{b}, căn thức \\sqrt{} được viết đúng chuẩn LaTeX.
Bảng biểu: Nếu đề bài có bảng số liệu, hãy mô tả vào phần [IMAGE].
Ví dụ mẫu kết quả đầu ra có chứa câu hỏi liên kết:

TRONG CÁC ĐỀ THI TOÁN HỌC:
Dùng chữ đứng trong math mode: (Đây là ví dụ)
Đoạn thẳng: $\\mathrm{SO}$, $\\mathrm{OK}$
Điểm: $\\mathrm{K}$, $\\mathrm{O}$
Mặt phẳng: $(\\mathrm{MNPQ})$ hoặc $\\left(\\mathrm{MNPQ}\\right)$


====START====
 [ID] CONTEXT_1 
[TYPE] TEXT 
[LEVEL] Trung bình 
[CONTENT] Hãy đọc đoạn văn sau để trả lời câu 1 và câu 2: "Một chất điểm dao động điều hòa với phương trình $x = 5 \\cos(4\\pi t + \\pi/2) \\text{ (cm)}$." 
[OPTIONS] None 
[ANSWER] None 
[SOL] None 
====END====

====START==== 
[ID] 1 
[TYPE] MCQ 
[LINKED_TO] CONTEXT_1 
[LEVEL] Dễ 
[CONTENT] Biên độ dao động của chất điểm là bao nhiêu? 
[OPTIONS] A. $4\\pi \\text{ cm}$ B. $5 \\text{ cm}$ C. $\\pi/2 \\text{ cm}$ D. $10 \\text{ cm}$ [ANSWER] B [SOL] Nhìn vào phương trình, ta có dạng tổng quát $x = A \\cos(\\omega t + \\varphi)$. Biên độ $A = 5 \\text{ cm}$. 
====END====

====START==== 
[ID] 2
[TYPE] SA 
[LINKED_TO] CONTEXT_1 
[LEVEL] Trung bình 
[CONTENT] Tần số góc của dao động là bao nhiêu (đơn vị rad/s)? 
[OPTIONS] None 
[ANSWER] 4\\pi 
[SOL] Từ phương trình, hệ số của $t$ chính là tần số góc $\\omega = 4\\pi \\text{ rad/s}$. 
====END====
Ví dụ về các câu hỏi khác:
====START====
[ID] MATH_001
[TYPE] MCQ
[LEVEL] Khó
[CONTENT] Tính _tích phân_ xác định $I = \\int_{0}^{1} \\frac{x^3}{\\sqrt{1 - x^2}} \\, dx$.
[OPTIONS]
A. $\\dfrac{2}{3}$
B. $\\dfrac{1}{3}$
C. $\\dfrac{\\pi}{4}$
D. $\\dfrac{1}{2}$
[ANSWER] A
[SOL]
Đặt $x = \\sin t$, suy ra $dx = \\cos t \\, dt$.
Khi $x = 0 \\Rightarrow t = 0$; $x = 1 \\Rightarrow t = \\dfrac{\\pi}{2}$.
$$I = \\int_{0}^{\\pi/2} \\frac{\\sin^3 t}{\\cos t} \\cdot \\cos t \\, dt = \\int_{0}^{\\pi/2} \\sin^3 t \\, dt$$
$$= \\int_{0}^{\\pi/2} \\sin t (1 - \\cos^2 t) \\, dt = \\left[-\\cos t + \\frac{\\cos^3 t}{3}\\right]_{0}^{\\pi/2} = \\frac{2}{3}$$
====END====

====START====
[ID] MATH_002
[TYPE] TF
[LEVEL] Trung bình
[CONTENT] Cho hàm số $f(x) = x^2 - 2x$. _Xét tính đúng sai_ của các khẳng định sau đây:
[OPTIONS]
a) Đồ thị hàm số là một đường Parabol có bề lõm hướng lên trên.
b) Hàm số nghịch biến trên khoảng $(1; +\\infty)$.
c) Đỉnh của đồ thị hàm số có tọa độ $I(1; -1)$.
d) Đồ thị hàm số cắt trục hoành tại hai điểm phân biệt có hoành độ dương.
[ANSWER] a-Đ, b-S, c-Đ, d-S
[SOL]
a) Đúng vì hệ số $a = 1 > 0$.
b) Sai vì hàm số đồng biến trên $(1; +\\infty)$.
c) Đúng: $x_I = -b/2a = 1 \\Rightarrow y_I = -1$.
d) Sai vì đồ thị cắt trục hoành tại $x=0$ (không dương) và $x=2$.
[IMAGE] Có
====END====

====START====
[ID] PHYS_003
[TYPE] SA
[LEVEL] Trung bình
[CONTENT] Một vật có khối lượng $2 \\, \\text{kg}$ đang đứng yên thì chịu tác dụng của lực $F = 10 \\, \\text{N}$. Tính gia tốc của vật (đơn vị: $m/s^2$).
[OPTIONS] None
[ANSWER] 5
[SOL]
Áp dụng định luật II Newton: $F = ma \\Rightarrow a = \\frac{F}{m}$.
Thay số: $a = \\frac{10}{2} = 5 \\, \\text{m/s}^2$.
====END====



Bắt đầu hành động: Hãy quét toàn bộ file đính kèm và trả về nội dung theo định dạng trên dưới dạng code block để tôi có thể sao chép dễ dàng. Không cần lời giải thích dẫn nhập.`;

const OCR_PROMPT = `Bạn là DeepSeek OCR cho đề thi. Hãy đọc chính xác toàn bộ chữ, công thức toán, bảng biểu và mô tả hình ảnh trong file. Trả về raw text tiếng Việt, giữ thứ tự câu hỏi, dùng LaTeX cho công thức nếu nhận diện được. Không chuẩn hóa sang START/END ở bước này.`;

function jsonError(message, status = 400, details = null) {
  return Response.json({ error: message, details }, { status });
}

function getExtension(name = '') {
  return name.split('.').pop()?.toLowerCase() || '';
}

function dataUrlToCandidate(dataUrl, filename, note = '') {
  const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
  return {
    filename,
    mimeType: match?.[1] || 'image/png',
    dataUrl,
    confidence: 0.65,
    note,
  };
}

function stripCodeFence(text) {
  const trimmed = (text || '').trim();
  const fence = trimmed.match(/^```(?:txt|text)?\s*([\s\S]*?)\s*```$/i);
  return (fence ? fence[1] : trimmed).trim();
}

function normalizeErrorMessage(error) {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error.slice(0, 1000);
  if (error instanceof Error) return (error.message || String(error)).slice(0, 1000);
  return JSON.stringify(error).slice(0, 1000);
}

function makeRequestId() {
  return `ocr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function isCancelledStage(stage = '') {
  return ['cancel_requested', 'cancelled_by_user', 'cancelled_by_admin'].includes(stage);
}

async function upsertOcrLog(payload) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return;

  try {
    const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/${OCR_LOG_TABLE}?on_conflict=request_id`;
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify([payload]),
    });
  } catch (error) {
    console.error('OCR log insert failed:', error);
  }
}

async function getOcrLog(requestId) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey || !requestId) return null;

  try {
    const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/${OCR_LOG_TABLE}?request_id=eq.${encodeURIComponent(requestId)}&select=request_id,status,stage&limit=1`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });
    if (!response.ok) return null;
    const rows = await response.json();
    return Array.isArray(rows) ? rows[0] || null : null;
  } catch {
    return null;
  }
}

async function ensureNotCancelled(requestId) {
  const log = await getOcrLog(requestId);
  if (log?.status === 'failed' && isCancelledStage(log.stage)) {
    throw new Error('OCR đã bị hủy.');
  }
}

async function runWithHeartbeat({
  requestId,
  startedAt,
  stage,
  basePayload,
  fn,
}) {
  let timer = null;
  const beat = async () => {
    await ensureNotCancelled(requestId);
    await upsertOcrLog({
      request_id: requestId,
      status: 'processing',
      stage,
      duration_ms: Date.now() - startedAt,
      ...(basePayload || {}),
    });
  };

  try {
    await beat();
    timer = setInterval(() => {
      beat().catch(() => {});
    }, 1500);
    return await fn();
  } finally {
    if (timer) clearInterval(timer);
  }
}

async function extractPdf(buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const textResult = await parser.getText();
    const imageCandidates = [];

    try {
      const imageResult = await parser.getImage({
        imageDataUrl: true,
        imageThreshold: 80,
      });
      for (const page of imageResult.pages || []) {
        for (const image of page.images || []) {
          if (image.dataUrl) {
            imageCandidates.push(dataUrlToCandidate(
              image.dataUrl,
              `pdf-page-${page.pageNumber || imageCandidates.length + 1}-image-${imageCandidates.length + 1}.png`,
              `Ảnh trích xuất từ trang ${page.pageNumber || '?'}`,
            ));
          }
        }
      }
    } catch {
      // Embedded image extraction is best-effort; text extraction remains usable.
    }

    if (imageCandidates.length === 0) {
      try {
        const screenshots = await parser.getScreenshot({
          imageDataUrl: true,
          scale: 1.5,
          first: 5,
        });
        for (const page of screenshots.pages || []) {
          if (page.dataUrl) {
            imageCandidates.push(dataUrlToCandidate(
              page.dataUrl,
              `pdf-page-${page.pageNumber || imageCandidates.length + 1}.png`,
              `Ảnh toàn trang để admin cắt/duyệt nếu câu có hình`,
            ));
          }
        }
      } catch {
        // Page screenshots are a fallback only.
      }
    }

    return {
      text: textResult.text || '',
      imageCandidates,
    };
  } finally {
    await parser.destroy();
  }
}

/** DeepSeek chat API chỉ nhận content kiểu text / image_url (không có variant `file`). */
async function deepSeekOcrChat(endpoint, apiKey, model, content) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content }],
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek OCR lỗi ${response.status}: ${errorText.slice(0, 500)}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || data?.text || data?.result || '';
}

async function renderPdfPagesForOcr(buffer, maxPages, scale) {
  const parser = new PDFParse({ data: buffer });
  try {
    const screenshots = await parser.getScreenshot({
      imageDataUrl: true,
      imageBuffer: false,
      scale,
      first: maxPages,
    });
    return (screenshots.pages || []).map((p) => p.dataUrl).filter(Boolean);
  } finally {
    await parser.destroy();
  }
}

async function callDeepSeekOcr({ file, buffer, onProgress, requestId }) {
  const endpoint = process.env.DEEPSEEK_OCR_BASE_URL;
  if (!endpoint) {
    throw new Error('Thiếu DEEPSEEK_OCR_BASE_URL. Cần cấu hình endpoint DeepSeek OCR để quét ảnh/scanned PDF.');
  }

  const apiKey = process.env.DEEPSEEK_OCR_API_KEY || process.env.DEEPSEEK_API_KEY;
  const model = process.env.DEEPSEEK_OCR_MODEL || 'deepseek-v4-pro';
  const isImage = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf' || getExtension(file.name) === 'pdf';

  if (isImage) {
    await ensureNotCancelled(requestId);
    await onProgress?.('ocr_image');
    const mime = file.type || 'image/png';
    const dataUrl = `data:${mime};base64,${Buffer.from(buffer).toString('base64')}`;
    return deepSeekOcrChat(endpoint, apiKey, model, [
      { type: 'text', text: OCR_PROMPT },
      { type: 'image_url', image_url: { url: dataUrl } },
    ]);
  }

  if (isPdf) {
    await ensureNotCancelled(requestId);
    await onProgress?.('ocr_pdf_render');
    const maxPagesRaw = Number(process.env.DEEPSEEK_OCR_MAX_PDF_PAGES || 40);
    const maxPages = Math.min(80, Math.max(1, Number.isFinite(maxPagesRaw) ? maxPagesRaw : 40));
    const scaleRaw = Number(process.env.DEEPSEEK_OCR_PDF_SCALE || 1.25);
    const scale = Math.min(2, Math.max(0.8, Number.isFinite(scaleRaw) ? scaleRaw : 1.25));

    const pageUrls = await renderPdfPagesForOcr(buffer, maxPages, scale);
    if (pageUrls.length === 0) {
      throw new Error(
        'Không render được trang PDF thành ảnh để OCR. Kiểm tra file hoặc môi trường Node (canvas/pdf-parse).',
      );
    }

    const parts = [];
    for (let i = 0; i < pageUrls.length; i++) {
      await ensureNotCancelled(requestId);
      if (i === 0 || i === pageUrls.length - 1 || (i + 1) % 2 === 0) {
        await onProgress?.(`ocr_pdf_page_${i + 1}_of_${pageUrls.length}`);
      }
      const pagePrompt = `${OCR_PROMPT}\n\n(Trang ${i + 1}/${pageUrls.length} — nối tiếp nội dung các trang trước, không lặp lại hướng dẫn.)`;
      const text = await deepSeekOcrChat(endpoint, apiKey, model, [
        { type: 'text', text: pagePrompt },
        { type: 'image_url', image_url: { url: pageUrls[i] } },
      ]);
      parts.push((text || '').trim());
    }
    return parts.filter(Boolean).join('\n\n');
  }

  throw new Error('OCR DeepSeek chỉ hỗ trợ file ảnh hoặc PDF.');
}

async function extractSourceText(file, buffer, onProgress, requestId) {
  const ext = getExtension(file.name);
  const imageCandidates = [];
  let text = '';
  let usedOcr = false;

  if (file.type === 'text/plain' || ext === 'txt') {
    await ensureNotCancelled(requestId);
    await onProgress?.('extract_txt');
    text = buffer.toString('utf8');
  } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === 'docx') {
    await ensureNotCancelled(requestId);
    await onProgress?.('extract_docx');
    const result = await mammoth.extractRawText({ buffer });
    text = result.value || '';
  } else if (file.type === 'application/pdf' || ext === 'pdf') {
    await ensureNotCancelled(requestId);
    await onProgress?.('extract_pdf_text');
    const extracted = await extractPdf(buffer);
    text = extracted.text;
    imageCandidates.push(...extracted.imageCandidates);
    if (text.trim().length < 200) {
      await onProgress?.('extract_pdf_ocr_needed');
      text = await callDeepSeekOcr({
        file, buffer, onProgress, requestId,
      });
      usedOcr = true;
    }
  } else if (file.type.startsWith('image/')) {
    await onProgress?.('extract_image_ocr');
    text = await callDeepSeekOcr({
      file, buffer, onProgress, requestId,
    });
    usedOcr = true;
    imageCandidates.push(dataUrlToCandidate(
      `data:${file.type};base64,${Buffer.from(buffer).toString('base64')}`,
      file.name,
      'Ảnh gốc do admin upload',
    ));
  } else {
    throw new Error('Định dạng file chưa được hỗ trợ.');
  }

  return { text, imageCandidates, usedOcr };
}

async function normalizeToStructuredText(sourceText, tokenAccumulator) {
  const result = await generateText({
    model: deepseek(NORMALIZE_MODEL),
    system: STRUCTURE_PROMPT,
    prompt: `Dưới đây là nội dung đề thi đã được trích xuất từ file gốc. Hãy chuyển sang đúng định dạng .txt START/END:\n\n${sourceText}`,
    temperature: 0,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
  });

  if (result.usage && tokenAccumulator) {
    tokenAccumulator.promptTokens += result.usage.promptTokens || 0;
    tokenAccumulator.completionTokens += result.usage.completionTokens || 0;
    tokenAccumulator.totalTokens += (result.usage.promptTokens || 0) + (result.usage.completionTokens || 0);
  }

  return stripCodeFence(result.text);
}

async function repairStructuredText(structuredText, parseNote, originalSourceText, tokenAccumulator) {
  // When the first normalize output is garbage (no START/END blocks,
  // very short), retry with the original extracted source text.
  const hasBlocks = (structuredText || '').includes('====START====');
  const isGarbage = !hasBlocks && (structuredText || '').length < 500;
  const useOriginal = isGarbage && originalSourceText && originalSourceText.length > 50;

  const prompt = useOriginal
    ? `Lần xử lý trước THẤT BẠI, AI trả output sai: "${(structuredText || '').slice(0, 150)}".\nDưới đây là NỘI DUNG ĐỀ THI GỐC đã trích xuất. Hãy chuyển đổi sang đúng định dạng ====START==== / ====END==== theo quy tắc.\nLỗi/ghi chú: ${parseNote}\n\n--- NỘI DUNG ĐỀ THI GỐC ---\n${originalSourceText}`
    : `Output sau chưa parse được hoặc thiếu block hợp lệ. Hãy sửa CHỈ định dạng, giữ nguyên nội dung tối đa.\nLỗi/ghi chú: ${parseNote}\n\n${structuredText}`;

  const result = await generateText({
    model: deepseek(NORMALIZE_MODEL),
    system: STRUCTURE_PROMPT,
    prompt,
    temperature: 0,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
  });

  if (result.usage && tokenAccumulator) {
    tokenAccumulator.promptTokens += result.usage.promptTokens || 0;
    tokenAccumulator.completionTokens += result.usage.completionTokens || 0;
    tokenAccumulator.totalTokens += (result.usage.promptTokens || 0) + (result.usage.completionTokens || 0);
  }

  return stripCodeFence(result.text);
}

export async function POST(req) {
  const startedAt = Date.now();
  let requestId = makeRequestId();

  if (!process.env.DEEPSEEK_API_KEY) {
    await upsertOcrLog({
      request_id: requestId,
      status: 'failed',
      stage: 'config',
      error_message: 'Thiếu DEEPSEEK_API_KEY trên server.',
      duration_ms: Date.now() - startedAt,
    });
    return jsonError('Thiếu DEEPSEEK_API_KEY trên server.', 500);
  }

  let formData;
  try {
    formData = await req.formData();
  } catch {
    await upsertOcrLog({
      request_id: requestId,
      status: 'failed',
      stage: 'request',
      error_message: 'Request phải là multipart/form-data.',
      duration_ms: Date.now() - startedAt,
    });
    return jsonError('Request phải là multipart/form-data.');
  }

  const file = formData.get('file');
  const requestIdInput = formData.get('request_id');
  if (typeof requestIdInput === 'string' && requestIdInput.trim()) {
    requestId = requestIdInput.trim();
  }
  if (!file || typeof file === 'string') {
    await upsertOcrLog({
      request_id: requestId,
      status: 'failed',
      stage: 'request',
      error_message: 'Thiếu file đề thi.',
      duration_ms: Date.now() - startedAt,
    });
    return jsonError('Thiếu file đề thi.');
  }

  if (file.size > MAX_FILE_BYTES) {
    await upsertOcrLog({
      request_id: requestId,
      status: 'failed',
      stage: 'validate',
      file_name: file.name,
      file_type: file.type || getExtension(file.name) || null,
      file_size_bytes: file.size,
      error_message: 'File quá lớn. Tối đa 25MB.',
      duration_ms: Date.now() - startedAt,
    });
    return jsonError('File quá lớn. Tối đa 25MB.');
  }

  const ext = getExtension(file.name);
  if (!SUPPORTED_TYPES.has(file.type) && !['txt', 'pdf', 'docx', 'png', 'jpg', 'jpeg'].includes(ext)) {
    await upsertOcrLog({
      request_id: requestId,
      status: 'failed',
      stage: 'validate',
      file_name: file.name,
      file_type: file.type || ext || null,
      file_size_bytes: file.size,
      error_message: 'Chỉ hỗ trợ TXT, PDF, DOCX, PNG, JPG.',
      duration_ms: Date.now() - startedAt,
    });
    return jsonError('Chỉ hỗ trợ TXT, PDF, DOCX, PNG, JPG.');
  }

  await upsertOcrLog({
    request_id: requestId,
    status: 'processing',
    stage: 'received',
    file_name: file.name,
    file_type: file.type || ext || null,
    file_size_bytes: file.size,
    duration_ms: Date.now() - startedAt,
  });

  const tokenAccumulator = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

  try {
    await upsertOcrLog({
      request_id: requestId,
      status: 'processing',
      stage: 'reading_file',
      file_name: file.name,
      file_type: file.type || ext || null,
      file_size_bytes: file.size,
      duration_ms: Date.now() - startedAt,
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    await ensureNotCancelled(requestId);
    const extracted = await extractSourceText(file, buffer, async (stage) => {
      await upsertOcrLog({
        request_id: requestId,
        status: 'processing',
        stage,
        file_name: file.name,
        file_type: file.type || ext || null,
        file_size_bytes: file.size,
        duration_ms: Date.now() - startedAt,
      });
    }, requestId);

    if (!extracted.text || extracted.text.trim().length < 20) {
      await upsertOcrLog({
        request_id: requestId,
        status: 'failed',
        stage: 'extract',
        file_name: file.name,
        file_type: file.type || ext || null,
        file_size_bytes: file.size,
        used_ocr: extracted.usedOcr,
        extracted_chars: extracted.text?.length || 0,
        image_candidate_count: extracted.imageCandidates?.length || 0,
        error_message: 'Không đọc được đủ nội dung từ file. Hãy kiểm tra file hoặc cấu hình DeepSeek OCR.',
        duration_ms: Date.now() - startedAt,
      });
      return jsonError('Không đọc được đủ nội dung từ file. Hãy kiểm tra file hoặc cấu hình DeepSeek OCR.', 422);
    }

    await upsertOcrLog({
      request_id: requestId,
      status: 'processing',
      stage: 'normalizing',
      file_name: file.name,
      file_type: file.type || ext || null,
      file_size_bytes: file.size,
      used_ocr: extracted.usedOcr,
      extracted_chars: extracted.text.length,
      image_candidate_count: extracted.imageCandidates.length,
      duration_ms: Date.now() - startedAt,
      ocr_model: process.env.DEEPSEEK_OCR_MODEL || 'deepseek-v4-pro',
      normalize_model: NORMALIZE_MODEL,
    });

    const basePayload = {
      file_name: file.name,
      file_type: file.type || ext || null,
      file_size_bytes: file.size,
      used_ocr: extracted.usedOcr,
      extracted_chars: extracted.text.length,
      image_candidate_count: extracted.imageCandidates.length,
      ocr_model: process.env.DEEPSEEK_OCR_MODEL || 'deepseek-v4-pro',
      normalize_model: NORMALIZE_MODEL,
    };

    let structuredText = await runWithHeartbeat({
      requestId,
      startedAt,
      stage: 'normalizing',
      basePayload,
      fn: () => normalizeToStructuredText(extracted.text, tokenAccumulator),
    });
    let parsed = parseQuizText(structuredText);
    let repaired = false;

    if (parsed.length === 0) {
      await upsertOcrLog({
        request_id: requestId,
        status: 'processing',
        stage: 'repairing',
        file_name: file.name,
        file_type: file.type || ext || null,
        file_size_bytes: file.size,
        used_ocr: extracted.usedOcr,
        extracted_chars: extracted.text.length,
        image_candidate_count: extracted.imageCandidates.length,
        duration_ms: Date.now() - startedAt,
        ocr_model: process.env.DEEPSEEK_OCR_MODEL || 'deepseek-v4-pro',
        normalize_model: NORMALIZE_MODEL,
      });
      structuredText = await runWithHeartbeat({
        requestId,
        startedAt,
        stage: 'repairing',
        basePayload,
        fn: () => repairStructuredText(structuredText, 'parseQuizText trả về 0 câu hỏi', extracted.text, tokenAccumulator),
      });
      parsed = parseQuizText(structuredText);
      repaired = true;
    }

    const finalStatus = parsed.length > 0 ? 'success' : 'failed';
    const finalStage = parsed.length > 0
      ? (repaired ? 'repair_completed' : 'parse_completed')
      : 'zero_questions';

    await upsertOcrLog({
      request_id: requestId,
      status: finalStatus,
      stage: finalStage,
      file_name: file.name,
      file_type: file.type || ext || null,
      file_size_bytes: file.size,
      used_ocr: extracted.usedOcr,
      repaired,
      extracted_chars: extracted.text.length,
      question_count: parsed.length,
      image_candidate_count: extracted.imageCandidates.length,
      structured_text: structuredText,
      image_candidates: extracted.imageCandidates,
      duration_ms: Date.now() - startedAt,
      ocr_model: process.env.DEEPSEEK_OCR_MODEL || 'deepseek-v4-pro',
      normalize_model: NORMALIZE_MODEL,
      prompt_tokens: tokenAccumulator.promptTokens,
      completion_tokens: tokenAccumulator.completionTokens,
      total_tokens: tokenAccumulator.totalTokens,
      error_message: parsed.length === 0
        ? `AI trả về text (${(structuredText || '').length} ký tự) nhưng không chứa block ====START====...====END==== hợp lệ. Output: ${(structuredText || '').slice(0, 300)}`
        : null,
    });

    if (parsed.length === 0) {
      return jsonError(
        `AI đã xử lý xong nhưng không tạo được câu hỏi hợp lệ. Output (${(structuredText || '').length} ký tự): "${(structuredText || '').slice(0, 200)}"`,
        422,
      );
    }

    return Response.json({
      structuredText,
      questionCount: parsed.length,
      imageCandidates: extracted.imageCandidates,
      meta: {
        fileName: file.name,
        model: NORMALIZE_MODEL,
        usedOcr: extracted.usedOcr,
        repaired,
        extractedChars: extracted.text.length,
        requestId,
        promptTokens: tokenAccumulator.promptTokens,
        completionTokens: tokenAccumulator.completionTokens,
        totalTokens: tokenAccumulator.totalTokens,
      },
    });
  } catch (error) {
    console.error('AI exam import error:', error);
    const message = error?.message || 'Không thể quét đề bằng AI.';
    const isCancelled = message.toLowerCase().includes('đã bị hủy');
    await upsertOcrLog({
      request_id: requestId,
      status: 'failed',
      stage: isCancelled ? 'cancelled_by_user' : 'exception',
      file_name: file?.name || null,
      file_type: file?.type || ext || null,
      file_size_bytes: file?.size || null,
      error_message: isCancelled ? 'Đã hủy bởi người dùng/admin.' : normalizeErrorMessage(error),
      duration_ms: Date.now() - startedAt,
    });
    return jsonError(message, isCancelled ? 499 : 500);
  }
}
