/**
 * YeuHoc Quiz Parser
 * Parses .txt files with ====START==== / ====END==== delimited questions
 * into structured JSON for the quiz engine.
 */

/**
 * Parse a raw text string into an array of question objects.
 * @param {string} rawText - The raw text content from the .txt file
 * @returns {Array<Question>} Parsed questions array
 */
export function parseQuizText(rawText) {
    const questions = [];
    const blocks = extractBlocks(rawText);

    for (const block of blocks) {
        const question = parseBlock(block);
        if (question) {
            questions.push(question);
        }
    }

    return questions;
}

/**
 * Extract question blocks delimited by ====START==== and ====END====
 * @param {string} text
 * @returns {string[]}
 */
function extractBlocks(text) {
    const blocks = [];
    const regex = /====START====([\s\S]*?)====END====/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
        blocks.push(match[1].trim());
    }

    return blocks;
}

/**
 * Parse a single question block into a structured object.
 * @param {string} block
 * @returns {Question|null}
 */
function parseBlock(block) {
    const id = extractField(block, 'ID');
    const type = extractField(block, 'TYPE')?.toUpperCase();
    const level = extractField(block, 'LEVEL');
    const content = extractField(block, 'CONTENT');
    const optionsRaw = extractField(block, 'OPTIONS');
    const answer = extractField(block, 'ANSWER');
    const solution = extractField(block, 'SOL');
    const image = extractField(block, 'IMAGE');
    const linkedTo = extractField(block, 'LINKED_TO');

    if (!id || !type || !content) {
        return null;
    }

    const options = (type === 'MCQ' || type === 'TF' || type === 'DRAG') ? parseOptions(optionsRaw || '', type) : [];

    let finalType = 'SA';
    if (type === 'MCQ') finalType = 'MCQ';
    else if (type === 'TF') finalType = 'TF';
    else if (type === 'DRAG') finalType = 'DRAG';
    else if (type === 'TEXT' || type === 'GROUP') finalType = 'TEXT';

    // Build TF-specific data structures
    let tfSubQuestions = undefined;
    let statements = undefined;
    let finalAnswer = (answer || '').trim();

    if (finalType === 'TF' && options.length > 0) {
        const answerMap = parseTfAnswer(finalAnswer);

        // tfSubQuestions: for admin QuestionEditorCard { content, answer: boolean }
        tfSubQuestions = options.map((text, i) => {
            const letter = String.fromCharCode(97 + i); // a, b, c, d...
            const isCorrect = answerMap[letter] !== undefined ? answerMap[letter] : true;
            return { content: text, answer: isCorrect };
        });

        // statements: for student QuestionCard/TFTable (array of text strings)
        statements = options.map(text => text);
    }

    const imageValue = normalizeImageField(image);

    return {
        id: id.trim(),
        type: finalType,
        level: (level || 'Trung bình').trim(),
        content: content.trim(),
        options: finalType === 'TF' ? [] : options,
        tfSubQuestions,
        statements,
        answer: finalAnswer,
        solution: (solution || '').trim(),
        image: imageValue.image,
        needsImageReview: imageValue.needsImageReview,
        linkedTo: linkedTo ? linkedTo.trim() : null,
        isLinked: !!linkedTo,
    };
}

function normalizeImageField(image) {
    if (!image) return { image: null, needsImageReview: false };

    const value = image.trim();
    if (!value || /^none$/i.test(value)) {
        return { image: null, needsImageReview: false };
    }

    if (/^(có|co|yes|true)$/i.test(value)) {
        return { image: null, needsImageReview: true };
    }

    return { image: value, needsImageReview: false };
}

/**
 * Extract a field value from a block using [FIELD_NAME] markers.
 * Supports multiline content until the next [FIELD] or end of block.
 * @param {string} block
 * @param {string} fieldName
 * @returns {string|null}
 */
function extractField(block, fieldName) {
    // Match [FIELD_NAME] followed by content until next [SOMETHING] or end
    const regex = new RegExp(
        '\\[' + fieldName + '\\]\\s*([\\s\\S]*?)(?=\\n\\s*\\[(?:ID|TYPE|LEVEL|CONTENT|OPTIONS|ANSWER|SOL|IMAGE|LINKED_TO)\\]|$)',
        'i'
    );
    const match = block.match(regex);
    if (!match) return null;

    return match[1].trim() || null;
}

/**
 * Parse a TF answer string like "a-Đ, b-S, c-S, d-Đ" into a map.
 * @param {string} answerStr
 * @returns {Object} e.g. { a: true, b: false, c: false, d: true }
 */
function parseTfAnswer(answerStr) {
    const map = {};
    if (!answerStr) return map;

    // Match patterns like "a-Đ", "b-S", "a - Đ", "a-đúng", "b-sai"
    const regex = /([a-d])\s*[-–:]\s*(Đ|S|đúng|sai|đ|s)/gi;
    let match;

    while ((match = regex.exec(answerStr)) !== null) {
        const letter = match[1].toLowerCase();
        const val = match[2].toUpperCase();
        map[letter] = val === 'Đ' || val === 'ĐÚNG';
    }

    return map;
}

/**
 * Parse options text into an array of option strings.
 * Supports formats: "A. text", "A) text", "A: text"
 * @param {string} optionsText
 * @param {string} type
 * @returns {string[]}
 */
function parseOptions(optionsText, type = 'MCQ') {
    const options = [];

    if (type === 'TF') {
        // TF options typically use a), b), c), d) or a., b., c., d.
        // Match at the start of a line or string to avoid capturing letters inside math formulas
        const regex = /(?:^|\n)\s*([a-d])[.):]+\s*([\s\S]*?)(?=(?:\n\s*[a-d][.):]+)|$)/gi;
        let match;

        while ((match = regex.exec(optionsText)) !== null) {
            const text = match[2].trim();
            if (text) {
                options.push(text);
            }
        }

        if (options.length > 0) return options;
    }

    const letterRange = type === 'DRAG' ? 'A-Z' : 'A-D';

    // Split by option markers A., B., C., D. (or A), B), etc.)
    // Strict uppercase matching to avoid capturing letters like 'd' inside math formulas
    const regex = new RegExp(
        `(?:^|\\s)([${letterRange}])[.):]+\\s*([\\s\\S]*?)(?=(?:\\s+[${letterRange}][.):]+)|$)`,
        'g'
    );
    let match;

    while ((match = regex.exec(optionsText)) !== null) {
        const text = match[2].trim();
        if (text) {
            options.push(text);
        }
    }

    // Fallback: if regex didn't match well, try splitting by newlines
    if (options.length === 0 && optionsText.trim() && optionsText.trim().toUpperCase() !== 'NONE') {
        const lines = optionsText.split('\n').filter(l => l.trim());
        for (const line of lines) {
            const cleaned = line.replace(/^[A-Z][.):\s]+\s*/i, '').trim();
            if (cleaned) options.push(cleaned);
        }
    }

    return options;
}

/**
 * Read a File object and return its text content.
 * @param {File} file
 * @returns {Promise<string>}
 */
export function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Không thể đọc file'));
        reader.readAsText(file, 'UTF-8');
    });
}
