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

const STRUCTURE_PROMPT = `Vai trò: Bạn là một chuyên gia số hóa dữ liệu giáo dục và chuyên gia LaTeX.
Nhiệm vụ: Đọc nội dung đã được trích xuất/OCR từ file đề thi và chuyển đổi sang định dạng văn bản cấu trúc .txt chính xác nhất.

Quy tắc cấu trúc:
- Mỗi câu hỏi hoặc đoạn ngữ cảnh phải nằm giữa ====START==== và ====END====.
- Mỗi khối bắt buộc có [ID], [TYPE], [LEVEL], [CONTENT], [OPTIONS], [ANSWER], [SOL].
- [TYPE] chỉ dùng MCQ, SA, TF, TEXT.
- [LINKED_TO] chỉ thêm cho câu hỏi con phụ thuộc ngữ cảnh TEXT.
- [IMAGE] ghi "Có" nếu câu hỏi có hình vẽ, đồ thị, bảng biểu hoặc ảnh minh họa; bỏ qua nếu không có.
- Sau tên trường không dùng dấu hai chấm. Viết đúng: [ID] 001, sai: [ID]: 001.
- Công thức inline dùng $...$, công thức block dùng $$...$$.
- Không thêm dẫn nhập, không giải thích ngoài định dạng.

Quy tắc nhận diện ngữ cảnh chung:
- Nếu có cụm "Đọc đoạn trích dưới đây...", "Dựa vào thông tin sau...", "Read the following passage..." hoặc tương tự, tách thành một khối [TYPE] TEXT với [ID] như CONTEXT_1.
- Các câu hỏi con bên dưới phải có [LINKED_TO] CONTEXT_1.

Định dạng ví dụ:
====START====
[ID] MATH_001
[TYPE] MCQ
[LEVEL] Khó
[CONTENT] Tính tích phân xác định $I = \\int_{0}^{1} \\frac{x^3}{\\sqrt{1 - x^2}} \\, dx$.
[OPTIONS]
A. $\\dfrac{2}{3}$
B. $\\dfrac{1}{3}$
C. $\\dfrac{\\pi}{4}$
D. $\\dfrac{1}{2}$
[ANSWER] A
[SOL]
Đặt $x = \\sin t$, suy ra $dx = \\cos t\\,dt$.
====END====`;

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
