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

const STRUCTURE_PROMPT = `Vai trò: Bạn là một chuyên gia số hóa dữ liệu giáo dục và chuyên gia LaTeX. Nhiệm vụ của bạn: Đọc file đính kèm (PDF/DOCX/PNG/JPG), nhận diện nội dung (bao gồm chữ viết, công thức toán học, bảng biểu) và chuyển đổi chúng sang định dạng văn bản cấu trúc .txt chính xác 100%.

Quy tắc cấu trúc: Mỗi câu hỏi (hoặc đoạn ngữ cảnh) phải được bao bọc bởi ====START==== và ====END====. Trong mỗi khối, bắt buộc có các trường sau:

[ID] Số thứ tự câu hỏi hoặc mã định danh.
[TYPE]
Ghi MCQ nếu là trắc nghiệm 4 lựa chọn.
Ghi SA nếu là câu hỏi điền số/trả lời ngắn.
Ghi TF nếu là câu hỏi trắc nghiệm Đúng/Sai (thường gồm nhiều ý nhỏ a, b, c, d).
Ghi TEXT nếu đây là một đoạn NGỮ CẢNH CHUNG (không có đáp án, dùng để đọc và trả lời cho các câu hỏi bên dưới).
[LEVEL] Phân loại (Dễ, Trung bình, Khó) dựa trên nội dung đề bài.
[CONTENT] Nội dung câu hỏi hoặc nội dung đoạn ngữ cảnh chung. Bắt buộc dùng LaTeX cho mọi công thức toán học (ví dụ: x^2 + \sqrt{x}). Nếu có hình ảnh/biểu đồ, hãy mô tả ngắn gọn nội dung hình ảnh trong dấu ngoặc vuông [Mô tả hình ảnh: ...].
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
Quy tắc định dạng Toán học: Sử dụng cặp dấu $...$ cho công thức nằm trong dòng. Sử dụng cặp dấu $$...$$ cho công thức nằm riêng một dòng. Đảm bảo các ký hiệu đặc biệt như \Delta, \in, \mathbb{R}, các phân số \frac{a}{b}, căn thức \sqrt{} được viết đúng chuẩn LaTeX.
Bảng biểu: Nếu đề bài có bảng số liệu, hãy mô tả vào phần [IMAGE].
Ví dụ mẫu kết quả đầu ra có chứa câu hỏi liên kết:

====START====
 [ID] CONTEXT_1 
[TYPE] TEXT 
[LEVEL] Trung bình 
[CONTENT] Hãy đọc đoạn văn sau để trả lời câu 1 và câu 2: "Một chất điểm dao động điều hòa với phương trình $x = 5 \cos(4\pi t + \pi/2) \text{ (cm)}$." 
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
[OPTIONS] A. $4\pi \text{ cm}$ B. $5 \text{ cm}$ C. $\pi/2 \text{ cm}$ D. $10 \text{ cm}$ [ANSWER] B [SOL] Nhìn vào phương trình, ta có dạng tổng quát $x = A \cos(\omega t + \varphi)$. Biên độ $A = 5 \text{ cm}$. 
====END====

====START==== 
[ID] 2
[TYPE] SA 
[LINKED_TO] CONTEXT_1 
[LEVEL] Trung bình 
[CONTENT] Tần số góc của dao động là bao nhiêu (đơn vị rad/s)? 
[OPTIONS] None 
[ANSWER] 4\pi 
[SOL] Từ phương trình, hệ số của $t$ chính là tần số góc $\omega = 4\pi \text{ rad/s}$. 
====END====
Ví dụ về các câu hỏi khác:
====START====
[ID] MATH_001
[TYPE] MCQ
[LEVEL] Khó
[CONTENT] Tính tích phân xác định $I = \int_{0}^{1} \frac{x^3}{\sqrt{1 - x^2}} \, dx$.
[OPTIONS]
A. $\dfrac{2}{3}$
B. $\dfrac{1}{3}$
C. $\dfrac{\pi}{4}$
D. $\dfrac{1}{2}$
[ANSWER] A
[SOL]
Đặt $x = \sin t$, suy ra $dx = \cos t \, dt$.
Khi $x = 0 \Rightarrow t = 0$; $x = 1 \Rightarrow t = \dfrac{\pi}{2}$.
$$I = \int_{0}^{\pi/2} \frac{\sin^3 t}{\cos t} \cdot \cos t \, dt = \int_{0}^{\pi/2} \sin^3 t \, dt$$
$$= \int_{0}^{\pi/2} \sin t (1 - \cos^2 t) \, dt = \left[-\cos t + \frac{\cos^3 t}{3}\right]_{0}^{\pi/2} = \frac{2}{3}$$
====END====

====START====
[ID] MATH_002
[TYPE] TF
[LEVEL] Trung bình
[CONTENT] Cho hàm số $f(x) = x^2 - 2x$. Xét tính đúng sai của các khẳng định sau đây:
[OPTIONS]
a) Đồ thị hàm số là một đường Parabol có bề lõm hướng lên trên.
b) Hàm số nghịch biến trên khoảng $(1; +\infty)$.
c) Đỉnh của đồ thị hàm số có tọa độ $I(1; -1)$.
d) Đồ thị hàm số cắt trục hoành tại hai điểm phân biệt có hoành độ dương.
[ANSWER] a-Đ, b-S, c-Đ, d-S
[SOL]
a) Đúng vì hệ số $a = 1 > 0$.
b) Sai vì hàm số đồng biến trên $(1; +\infty)$.
c) Đúng: $x_I = -b/2a = 1 \Rightarrow y_I = -1$.
d) Sai vì đồ thị cắt trục hoành tại $x=0$ (không dương) và $x=2$.
[IMAGE] Có
====END====

====START====
[ID] PHYS_003
[TYPE] SA
[LEVEL] Trung bình
[CONTENT] Một vật có khối lượng $2 \, \text{kg}$ đang đứng yên thì chịu tác dụng của lực $F = 10 \, \text{N}$. Tính gia tốc của vật (đơn vị: $m/s^2$).
[OPTIONS] None
[ANSWER] 5
[SOL]
Áp dụng định luật II Newton: $F = ma \Rightarrow a = \frac{F}{m}$.
Thay số: $a = \frac{10}{2} = 5 \, \text{m/s}^2$.
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

async function callDeepSeekOcr({ file, buffer }) {
  const endpoint = process.env.DEEPSEEK_OCR_BASE_URL;
  if (!endpoint) {
    throw new Error('Thiếu DEEPSEEK_OCR_BASE_URL. Cần cấu hình endpoint DeepSeek OCR để quét ảnh/scanned PDF.');
  }

  const apiKey = process.env.DEEPSEEK_OCR_API_KEY || process.env.DEEPSEEK_API_KEY;
  const base64 = Buffer.from(buffer).toString('base64');
  const dataUrl = `data:${file.type};base64,${base64}`;
  const isImage = file.type.startsWith('image/');
  const filePart = isImage
    ? { type: 'image_url', image_url: { url: dataUrl } }
    : { type: 'file', file: { filename: file.name, file_data: dataUrl } };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_OCR_MODEL || 'deepseek-ocr',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: OCR_PROMPT },
            filePart,
          ],
        },
      ],
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

async function extractSourceText(file, buffer) {
  const ext = getExtension(file.name);
  const imageCandidates = [];
  let text = '';
  let usedOcr = false;

  if (file.type === 'text/plain' || ext === 'txt') {
    text = buffer.toString('utf8');
  } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === 'docx') {
    const result = await mammoth.extractRawText({ buffer });
    text = result.value || '';
  } else if (file.type === 'application/pdf' || ext === 'pdf') {
    const extracted = await extractPdf(buffer);
    text = extracted.text;
    imageCandidates.push(...extracted.imageCandidates);
    if (text.trim().length < 200) {
      text = await callDeepSeekOcr({ file, buffer });
      usedOcr = true;
    }
  } else if (file.type.startsWith('image/')) {
    text = await callDeepSeekOcr({ file, buffer });
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

async function normalizeToStructuredText(sourceText) {
  const result = await generateText({
    model: deepseek(NORMALIZE_MODEL),
    system: STRUCTURE_PROMPT,
    prompt: `Hãy chuyển nội dung đề sau sang đúng định dạng .txt START/END:\n\n${sourceText}`,
    temperature: 0,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
  });

  return stripCodeFence(result.text);
}

async function repairStructuredText(structuredText, parseNote) {
  const result = await generateText({
    model: deepseek(NORMALIZE_MODEL),
    system: STRUCTURE_PROMPT,
    prompt: `Output sau chưa parse được hoặc thiếu block hợp lệ. Hãy sửa CHỈ định dạng, giữ nguyên nội dung tối đa.\nLỗi/ghi chú: ${parseNote}\n\n${structuredText}`,
    temperature: 0,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
  });

  return stripCodeFence(result.text);
}

export async function POST(req) {
  if (!process.env.DEEPSEEK_API_KEY) {
    return jsonError('Thiếu DEEPSEEK_API_KEY trên server.', 500);
  }

  let formData;
  try {
    formData = await req.formData();
  } catch {
    return jsonError('Request phải là multipart/form-data.');
  }

  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return jsonError('Thiếu file đề thi.');
  }

  if (file.size > MAX_FILE_BYTES) {
    return jsonError('File quá lớn. Tối đa 25MB.');
  }

  const ext = getExtension(file.name);
  if (!SUPPORTED_TYPES.has(file.type) && !['txt', 'pdf', 'docx', 'png', 'jpg', 'jpeg'].includes(ext)) {
    return jsonError('Chỉ hỗ trợ TXT, PDF, DOCX, PNG, JPG.');
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const extracted = await extractSourceText(file, buffer);

    if (!extracted.text || extracted.text.trim().length < 20) {
      return jsonError('Không đọc được đủ nội dung từ file. Hãy kiểm tra file hoặc cấu hình DeepSeek OCR.', 422);
    }

    let structuredText = await normalizeToStructuredText(extracted.text);
    let parsed = parseQuizText(structuredText);
    let repaired = false;

    if (parsed.length === 0) {
      structuredText = await repairStructuredText(structuredText, 'parseQuizText trả về 0 câu hỏi');
      parsed = parseQuizText(structuredText);
      repaired = true;
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
      },
    });
  } catch (error) {
    console.error('AI exam import error:', error);
    return jsonError(error.message || 'Không thể quét đề bằng AI.', 500);
  }
}
