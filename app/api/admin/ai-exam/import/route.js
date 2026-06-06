import mammoth from 'mammoth';
import { generateText } from 'ai';
import { deepseek } from '@ai-sdk/deepseek';
import { PDFParse } from 'pdf-parse';
import path from 'path';
import { pathToFileURL } from 'url';
import { parseQuizText } from '@/lib/parser';
import { requireAdmin } from '@/lib/adminAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const NORMALIZE_MODEL = process.env.DEEPSEEK_NORMALIZE_MODEL || 'deepseek-chat';
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_OUTPUT_TOKENS = 8192;
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

const STRUCTURE_PROMPT = String.raw`Vai trò: Bạn là chuyên gia số hóa dữ liệu giáo dục, OCR và LaTeX.

Mục tiêu: Đọc toàn bộ file đính kèm (PDF, DOCX, PNG, JPG hoặc định dạng tương tự), nhận diện đầy đủ chữ viết, công thức, bảng biểu, dữ liệu đề bài, hình vẽ, đồ thị, đáp án và lời giải tham khảo nếu có. Sau đó chuyển đổi thành văn bản .txt có cấu trúc, chính xác và không bỏ sót nội dung.

YÊU CẦU BẮT BUỘC

1. Quét kỹ toàn bộ file, không bỏ sót trang, câu hỏi, bảng, hình, chú thích, đáp án hoặc lời giải tham khảo.
2. Kiểm tra lại số liệu, ký hiệu, đáp án và lời giải để khớp với file gốc.
3. Giữ các định dạng nhấn mạnh bằng Markdown cơ bản:
   - In đậm: **nội dung**
   - In nghiêng: _nội dung_
   - Gạch chân: <u>nội dung</u>
4. Tất cả công thức toán học phải viết bằng LaTeX.
5. Nếu dữ liệu trong DOCX nằm trong ảnh, phải OCR nội dung ảnh để đưa đầy đủ vào bài.
6. Nếu file có lời giải tham khảo, đưa đúng lời giải đó vào [SOL]. Không tự thay đáp án hoặc tự viết lời giải khác.
7. Nếu file không có lời giải tham khảo, bắt buộc tự tạo [SOL] dựa trên đáp án đúng.
8. Nếu file không có đáp án, tự suy luận đáp án từ đề bài và viết [SOL] nhất quán với đáp án đã chọn.
9. Với mọi câu hỏi thật, tuyệt đối không được dùng [SOL] None hoặc các giá trị tương tự chỉ vì file gốc không có lời giải.

ĐỊNH DẠNG OUTPUT

Output cuối cùng chỉ được chứa các block nằm trong một codeblock. Không thêm lời dẫn, bình luận, cảnh báo, ghi chú hoặc nhận xét ngoài các trường quy định.

Mỗi câu hỏi hoặc đoạn ngữ cảnh chung phải nằm trong một block:

====START====
[ID] ...
[TYPE] ...
[LEVEL] ...
[CONTENT] ...
[OPTIONS] ...
[ANSWER] ...
[SOL] ...
====END====

Nếu câu hỏi phụ thuộc vào đoạn ngữ cảnh chung, thêm trường [LINKED_TO] ngay sau [TYPE].

Không dùng dấu hai chấm sau tên trường.
Đúng: [ID] 001
Sai: [ID]: 001

CÁC TRƯỜNG BẮT BUỘC

[ID]
Ghi số thứ tự câu hỏi hoặc mã định danh. Với đoạn ngữ cảnh chung, có thể dùng CONTEXT_1, CONTEXT_2, ...

[TYPE]
Chọn đúng một trong các loại sau:
- MCQ: Trắc nghiệm một đáp án đúng, thường có 4 lựa chọn.
- MA: Câu hỏi chọn nhiều đáp án đúng.
- SA: Câu hỏi điền số hoặc trả lời ngắn.
- TF: Câu hỏi Đúng/Sai, có các ý nhỏ a), b), c), d), ...
- DRAG: Câu hỏi kéo thả đáp án vào ô trống.
- TEXT: Đoạn ngữ cảnh chung, không có đáp án, dùng cho các câu hỏi bên dưới.

[LINKED_TO]
Chỉ dùng cho câu hỏi con phụ thuộc vào đoạn ngữ cảnh chung.
Ví dụ: [LINKED_TO] CONTEXT_1
Nếu câu hỏi không phụ thuộc ngữ cảnh chung, bỏ hẳn trường này.

[LEVEL]
Phân loại đúng một trong bốn mức sau:
- Nhận biết: Mức dễ nhất. Câu hỏi yêu cầu nhớ lại kiến thức đã học, nhận ra thông tin quen thuộc, nhắc lại khái niệm, định nghĩa, công thức hoặc dữ kiện trực tiếp. Thường dùng các yêu cầu như liệt kê, gọi tên, định nghĩa, nhận diện.
- Thông hiểu: Mức cơ bản. Câu hỏi yêu cầu hiểu vấn đề, diễn đạt lại kiến thức, giải thích nguyên nhân/kết quả, phân loại, so sánh, chứng minh đơn giản, minh họa hoặc tóm tắt.
- Vận dụng: Mức khá. Câu hỏi yêu cầu dùng kiến thức đã học để giải quyết tình huống cụ thể hoặc bài tập mới có dạng tương tự dạng đã được hướng dẫn. Thường gồm áp dụng công thức, tính toán, giải quyết vấn đề, phác thảo hoặc viết theo yêu cầu.
- Vận dụng cao: Mức khó/phân hóa. Câu hỏi yêu cầu phân tích dữ liệu phức tạp, tìm ý nghĩa hàm ẩn, đánh giá vấn đề, tổng hợp kiến thức từ nhiều chuyên đề hoặc giải quyết tình huống thực tiễn khó. Thường đòi hỏi tư duy logic cao, sáng tạo, thiết kế, dự đoán, đề xuất giải pháp hoặc tìm nhiều cách giải.

Không dùng các mức Dễ, Trung bình, Khó trong [LEVEL].

[CONTENT]
Ghi nội dung câu hỏi hoặc đoạn ngữ cảnh chung.
Yêu cầu:
- Dùng LaTeX cho mọi công thức.
- Giữ đúng dữ liệu, số liệu, đơn vị, ký hiệu và thứ tự nội dung trong file gốc.
- Với [TYPE] TF, [CONTENT] chỉ chứa phần dẫn chung. Không đưa các phát biểu a), b), c), d) vào [CONTENT].
- Với [TYPE] DRAG, đặt mỗi ô thả bằng placeholder [[1]], [[2]], [[3]], ... theo đúng thứ tự xuất hiện.
- Nếu có bảng số liệu, chép đầy đủ bảng vào [CONTENT], có thể dùng Markdown table.

QUY TẮC HÌNH ẢNH TRONG [CONTENT]

Nếu block có hình ảnh, biểu đồ, đồ thị, sơ đồ, bảng dạng ảnh hoặc hình minh họa cần giữ vị trí:
- Chèn marker ảnh trực tiếp vào [CONTENT] tại đúng vị trí hình xuất hiện trong file gốc.
- Dùng marker dạng ((1)), ((2)), ((3)), ... theo thứ tự hình xuất hiện trong từng block.
- Mỗi block đánh số marker lại từ ((1)).
- Nếu hình nằm trong đoạn ngữ cảnh chung, marker phải nằm trong block [TYPE] TEXT.
- Nếu hình nằm riêng trong câu hỏi con, marker phải nằm trong [CONTENT] của câu hỏi con đó.
- Không dùng marker ảnh trong [OPTIONS], [ANSWER] hoặc [SOL], trừ khi hình thật sự là một lựa chọn đáp án.
- Không nhầm marker ảnh ((1)), ((2)) với placeholder kéo thả [[1]], [[2]].

Cấm tuyệt đối trong [CONTENT]:
- Không được viết "[Mô tả hình ảnh]".
- Không được viết "[Mô tả hình ảnh: ...]".
- Không được viết "Mô tả hình ảnh:" hoặc bất kỳ nhãn mô tả ảnh tương tự.

Cách ghi đúng khi có hình:
- Đúng: [CONTENT] Quan sát đồ thị sau: ((1)) Hỏi hàm số đồng biến trên khoảng nào?
- Sai: thêm nhãn mô tả ảnh trong ngoặc vuông sau marker.

[OPTIONS]
Quy tắc theo từng loại:
- MCQ: Liệt kê A, B, C, D, mỗi phương án trên một dòng.
- MA: Liệt kê A, B, C, D, mỗi phương án trên một dòng.
- TF: Liệt kê từng phát biểu a), b), c), d), ... trên từng dòng.
- DRAG: Liệt kê ngân hàng đáp án A, B, C, ... trên từng dòng.
- SA: Ghi None.
- TEXT: Ghi None.

[ANSWER]
Quy tắc theo từng loại:
- MCQ: Ghi một chữ cái A, B, C hoặc D.
- MA: Ghi các đáp án đúng dạng A,C,D.
- TF: Ghi dạng a-Đ, b-S, c-Đ, d-S, ... đủ mọi ý.
- DRAG: Ghi mapping dạng 1-A, 2-C, 3-D.
- SA: Ghi giá trị cụ thể, ví dụ 123.45 hoặc \frac{1}{2}.
- TEXT: Ghi None.

Quy tắc riêng cho DRAG:
- Mỗi đáp án trong ngân hàng A, B, C, ... chỉ được dùng tối đa một lần trong cùng một câu.
- Không tạo [ANSWER] có đáp án trùng như 1-A, 2-A.
- Nếu hai ô trống có cùng nội dung đúng về mặt ý nghĩa, hãy tạo hai lựa chọn riêng biệt khác chữ cái.
  Ví dụ: A. $0$ và B. $x = 0$, rồi ghi [ANSWER] 1-A, 2-B.

[SOL]
Ghi lời giải chi tiết, sạch và nhất quán với [ANSWER].
Quy tắc:
- Chỉ [TYPE] TEXT mới được ghi [SOL] None.
- Với MCQ, MA, SA, TF, DRAG: bắt buộc phải có lời giải trong [SOL].
- Nếu file gốc không có lời giải, phải tự tạo lời giải. Không được lấy lý do "không có lời giải trong file" để ghi None, Không, No, null hoặc bỏ trống.
- Không được ghi [SOL] Không, [SOL] None, [SOL] No, [SOL] null, [SOL] N/A, [SOL] Chưa có lời giải hoặc bất kỳ biến thể tương tự nào cho câu hỏi thật.
- Nếu file có lời giải tham khảo, chép và chuẩn hóa lời giải đó.
- Nếu tự tạo lời giải, chỉ trình bày một hướng giải đúng khớp với [ANSWER].
- Không viết bình luận về lỗi đề, lỗi lời giải gốc, lỗi OCR, lỗi hệ thống, mâu thuẫn đáp án hoặc quá trình suy luận nội bộ.
- Không viết các cụm như "Nhưng kiểm tra lại đáp án", "lời giải gốc có lỗi", "theo hướng dẫn giải chuẩn", "có thể là sự nhầm lẫn", "giả sử...", trừ khi chính đề bài yêu cầu nhận xét sai sót.
- Nếu phát hiện mâu thuẫn giữa đề, đáp án và lời giải, vẫn xuất output theo đáp án hoặc lời giải tham khảo trong file, không ghi nhận xét mâu thuẫn trong output.

[IMAGE]
Chỉ ghi trường này nếu block thật sự có hình vẽ, đồ thị, biểu đồ, bảng số liệu dạng ảnh, ảnh minh họa hoặc dữ liệu dạng ảnh cần giữ lại.
Khi có hình, ghi đúng:
[IMAGE] Có

Quy tắc:
- Nếu có [IMAGE] Có thì [CONTENT] phải có marker ảnh ((1)), ((2)), ...
- Nếu không có ảnh, bảng, biểu đồ hoặc hình vẽ, bỏ hẳn dòng [IMAGE].
- Không được ghi [IMAGE] Không.
- Không được ghi [IMAGE] None.
- Không được ghi [IMAGE] No.
- Không được ghi [IMAGE] null.

QUY TẮC CÂU HỎI LIÊN KẾT

Nhận diện các cụm như:
- "Đọc đoạn trích dưới đây và trả lời các câu hỏi từ X đến Y"
- "Dựa vào thông tin sau để trả lời câu..."
- "Read the following passage and answer the questions..."
- Các định dạng tương tự.

Khi gặp dạng này:
1. Tách đoạn văn bản dùng chung thành một block riêng với [TYPE] TEXT.
2. Đặt [ID] cho block TEXT, ví dụ CONTEXT_1.
3. Các câu hỏi con vẫn phân loại đúng [TYPE] là MCQ, MA, SA, TF hoặc DRAG.
4. Các câu hỏi con bắt buộc có [LINKED_TO] trỏ về ID của block TEXT.

QUY TẮC RIÊNG CHO TF

- [CONTENT] chỉ chứa phần dẫn chung.
- Toàn bộ phát biểu a), b), c), d), ... phải đưa vào [OPTIONS].
- Không lặp lại phát biểu ở cả [CONTENT] và [OPTIONS].
- [ANSWER] phải có đủ kết quả cho mọi phát biểu theo dạng a-Đ, b-S, ...
- [SOL] nên giải thích lần lượt từng phát biểu.

QUY TẮC LATEX

- Dùng $...$ cho công thức nằm trong dòng.
- Dùng $$...$$ cho công thức nằm riêng một dòng.
- Viết đúng ký hiệu LaTeX như \Delta, \in, \mathbb{R}, \frac{a}{b}, \sqrt{x}.
- Trong hình học, dùng chữ đứng khi cần:
  - Đoạn thẳng: $\mathrm{SO}$, $\mathrm{OK}$
  - Điểm: $\mathrm{K}$, $\mathrm{O}$
  - Mặt phẳng: $(\mathrm{MNPQ})$ hoặc $\left(\mathrm{MNPQ}\right)$

Quy tắc LaTeX và đơn vị:
- Không viết lệnh LaTeX dính liền với chữ cái phía sau.
- Sai: $\muT$, $\OmegaR$, $\DeltaABC$
- Đúng: $\mu T$, $\Omega R$, $\Delta ABC$
- Với đơn vị vật lý, ưu tiên dùng \text{} hoặc tách rõ khỏi ký hiệu:
  - Đúng: $27\,\mu\text{T}$, $5\,\Omega$, $4\pi\,\text{rad/s}$, $10\,\text{cm}$
  - Sai: $27\muT$, $5\OmegaR$, $4\pirad/s$
- Không đặt lệnh LaTeX như \mu, \Omega, \Delta bên trong \text{...}.
  - Sai: $\text{27 \muT}$
  - Đúng: $27\,\mu\text{T}$

TỰ KIỂM TRA TRƯỚC KHI TRẢ KẾT QUẢ

Trước khi xuất kết quả cuối, hãy tự kiểm tra:
1. Output chỉ có một codeblock chứa các block ====START====...====END====.
2. Không có bất kỳ cụm "[Mô tả hình ảnh]", "[Mô tả hình ảnh: ...]" hoặc "Mô tả hình ảnh:" trong [CONTENT].
3. Mọi block đều có đủ các trường bắt buộc.
4. Không có dấu hai chấm sau tên trường.
5. Nếu có [IMAGE] Có thì [CONTENT] có marker ảnh đúng dạng ((1)), ((2)), ...
6. Nếu không có hình hoặc bảng cần đánh dấu, không ghi trường [IMAGE].
7. Với TF, phát biểu a), b), c), d) chỉ nằm trong [OPTIONS].
8. Với DRAG, placeholder [[1]], [[2]] và đáp án mapping không bị trùng lựa chọn.
9. Không còn lỗi LaTeX dạng \muT, \OmegaR, \DeltaABC, \alphax, \betay hoặc lệnh dính chữ.
10. [SOL] của mọi câu hỏi thật phải có lời giải cụ thể; không được trống và không được ghi None/Không/No/null/N/A/Chưa có lời giải hoặc biến thể tương tự.

MẪU NGẮN

====START====
[ID] CONTEXT_1
[TYPE] TEXT
[LEVEL] Thông hiểu
[CONTENT] Đọc đoạn thông tin sau để trả lời câu 1 và câu 2: Một chất điểm dao động điều hòa với phương trình $x = 5\cos(4\pi t + \pi/2)\,\text{cm}$.
[OPTIONS] None
[ANSWER] None
[SOL] None
====END====

====START====
[ID] 1
[TYPE] MCQ
[LINKED_TO] CONTEXT_1
[LEVEL] Nhận biết
[CONTENT] Biên độ dao động của chất điểm là bao nhiêu?
[OPTIONS]
A. $4\pi\,\text{cm}$
B. $5\,\text{cm}$
C. $\pi/2\,\text{cm}$
D. $10\,\text{cm}$
[ANSWER] B
[SOL] Phương trình có dạng $x = A\cos(\omega t + \varphi)$. Suy ra biên độ là $A = 5\,\text{cm}$.
====END====

====START====
[ID] 2
[TYPE] TF
[LEVEL] Thông hiểu
[CONTENT] Cho hàm số $f(x) = x^2 - 2x$. Xét tính đúng sai của các khẳng định sau:
[OPTIONS]
a) Đồ thị hàm số là parabol có bề lõm hướng lên.
b) Hàm số nghịch biến trên khoảng $(1;+\infty)$.
c) Đỉnh của đồ thị có tọa độ $I(1;-1)$.
d) Đồ thị cắt trục hoành tại hai điểm có hoành độ dương.
[ANSWER] a-Đ, b-S, c-Đ, d-S
[SOL]
a) Đúng vì hệ số $a = 1 > 0$ nên parabol có bề lõm hướng lên.
b) Sai vì hàm số đồng biến trên $(1;+\infty)$.
c) Đúng vì $x_I = 1$ và $y_I = -1$.
d) Sai vì đồ thị cắt trục hoành tại $x = 0$ và $x = 2$, trong đó $0$ không dương.
====END====

====START====
[ID] 3
[TYPE] MCQ
[LEVEL] Vận dụng
[CONTENT] Quan sát đồ thị sau: ((1)) Hàm số đạt cực đại tại điểm nào?
[OPTIONS]
A. $x = -1$
B. $x = 0$
C. $x = 1$
D. $x = 2$
[ANSWER] C
[SOL] Dựa vào đồ thị, điểm cực đại của hàm số tương ứng với hoành độ $x = 1$.
[IMAGE] Có
====END====

BẮT ĐẦU

Hãy quét toàn bộ file đính kèm và trả về nội dung theo đúng định dạng trên. Không cần lời giải thích dẫn nhập.`;

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
  const model = process.env.DEEPSEEK_OCR_MODEL || 'deepseek-chat';
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
    abortSignal: AbortSignal.timeout(4 * 60 * 1000), // 4 minutes timeout
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
    abortSignal: AbortSignal.timeout(3 * 60 * 1000), // 3 minutes timeout
  });

  if (result.usage && tokenAccumulator) {
    tokenAccumulator.promptTokens += result.usage.promptTokens || 0;
    tokenAccumulator.completionTokens += result.usage.completionTokens || 0;
    tokenAccumulator.totalTokens += (result.usage.promptTokens || 0) + (result.usage.completionTokens || 0);
  }

  return stripCodeFence(result.text);
}

export async function POST(req) {
  const auth = await requireAdmin(req);
  if (auth.errorResponse) return auth.errorResponse;

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
      ocr_model: process.env.DEEPSEEK_OCR_MODEL || 'deepseek-chat',
      normalize_model: NORMALIZE_MODEL,
    });

    const basePayload = {
      file_name: file.name,
      file_type: file.type || ext || null,
      file_size_bytes: file.size,
      used_ocr: extracted.usedOcr,
      extracted_chars: extracted.text.length,
      image_candidate_count: extracted.imageCandidates.length,
      ocr_model: process.env.DEEPSEEK_OCR_MODEL || 'deepseek-chat',
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
        ocr_model: process.env.DEEPSEEK_OCR_MODEL || 'deepseek-chat',
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
      ocr_model: process.env.DEEPSEEK_OCR_MODEL || 'deepseek-chat',
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
