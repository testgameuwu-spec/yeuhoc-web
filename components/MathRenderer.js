'use client';

import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

const MATH_PLACEHOLDER_PREFIX = 'YEUHOCMATHPLACEHOLDER';
const MATH_PLACEHOLDER_PATTERN = /YEUHOCMATHPLACEHOLDER(\d+)END/g;
const MARKDOWN_SANITIZE_CONFIG = {
    ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'b', 'i', 'u', 'del', 'code', 'pre',
        'blockquote', 'ul', 'ol', 'li', 'a', 'table', 'thead', 'tbody',
        'tr', 'th', 'td', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr',
        'sup', 'sub'
    ],
    ALLOWED_ATTR: ['href', 'title', 'align', 'colspan', 'rowspan'],
    ALLOW_DATA_ATTR: false,
};

/**
 * Renders text with inline ($...$) and display ($$...$$) LaTeX math.
 * Non-math text is rendered as plain text; math is rendered via KaTeX.
 */
export default function MathRenderer({ text, className = '' }) {
    const renderedHTML = useMemo(() => {
        if (!text) return '';
        return renderMathInText(text);
    }, [text]);

    return (
        <div
            className={`markdown-content ${className}`}
            dangerouslySetInnerHTML={{ __html: renderedHTML }}
        />
    );
}

/**
 * Process text and render LaTeX expressions.
 * Uses a placeholder system to avoid interfering with already-rendered HTML.
 */
function renderMathInText(text) {
    const placeholders = [];
    // Prevent user text from colliding with generated math placeholders.
    let result = String(text).replace(MATH_PLACEHOLDER_PATTERN, `${MATH_PLACEHOLDER_PREFIX}&#8203;$1END`);

    // Helper: create a placeholder that is purely alphanumeric so marked cannot alter it
    function ph(html) {
        const idx = placeholders.length;
        const id = `${MATH_PLACEHOLDER_PREFIX}${idx}END`;
        placeholders.push({ id, html });
        return id;
    }

    // 1. Handle display math $$...$$
    result = result.replace(/\$\$([\s\S]*?)\$\$/g, (_m, latex) => ph(renderKatex(latex.trim(), true)));

    // 2. Handle display math \[...\]
    result = result.replace(/\\\[([\s\S]*?)\\\]/g, (_m, latex) => ph(renderKatex(latex.trim(), true)));

    // 3. Handle inline math \(...\)
    result = result.replace(/\\\(([\s\S]*?)\\\)/g, (_m, latex) => ph(renderKatex(latex.trim(), false)));

    // 4. Handle inline math $...$
    // Matches $...$ where content is non-empty
    // Uses negative lookbehind/lookahead to skip $$
    result = result.replace(/(?<!\$)\$(?!\$)([^$]+?)\$(?!\$)/g, (_m, latex) => ph(renderKatex(latex.trim(), false)));

    // 5. Fallback: detect common bare LaTeX commands outside any delimiters
    // Handles patterns like \sqrt{...}, \frac{...}{...}, \boxed{...}
    // Up to two levels of nested braces
    result = result.replace(/\\(?:frac|dfrac|sqrt|boxed|overline|underline|vec|hat|bar|tilde)(?:\[[^\]]*\])?(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})+/g, (match) => {
        if (match.includes(MATH_PLACEHOLDER_PREFIX)) return match;
        return ph(renderKatex(match.trim(), false));
    });

    // 6. Render markdown for the non-math content
    result = marked.parse(result, { breaks: true, gfm: true });
    result = DOMPurify.sanitize(result, MARKDOWN_SANITIZE_CONFIG);

    // 7. Restore math from placeholders
    for (const p of placeholders) {
        result = result.replaceAll(p.id, p.html);
    }

    return result;
}

/**
 * Render a single LaTeX expression using KaTeX.
 */
function renderKatex(latex, displayMode) {
    try {
        const html = renderKatexToString(latex, {
            displayMode,
            throwOnError: false,
            strict: false,
            trust: false,
            macros: {
                '\\R': '\\mathbb{R}',
                '\\N': '\\mathbb{N}',
                '\\Z': '\\mathbb{Z}',
                '\\Q': '\\mathbb{Q}',
                '\\C': '\\mathbb{C}',
            },
        });

        if (displayMode) {
            return `<div class="math-display overflow-x-auto py-2">${html}</div>`;
        }
        return `<span class="math-inline">${html}</span>`;
    } catch (e) {
        // Fallback: show raw LaTeX on error
        const escaped = latex
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        return `<code class="text-red-400">${escaped}</code>`;
    }
}

function renderKatexToString(latex, options) {
    if (typeof console === 'undefined' || typeof console.warn !== 'function') {
        return katex.renderToString(latex, options);
    }

    const originalWarn = console.warn;
    console.warn = (...args) => {
        const message = typeof args[0] === 'string' ? args[0] : '';
        if (message.startsWith('No character metrics for ')) return;
        originalWarn(...args);
    };

    try {
        return katex.renderToString(latex, options);
    } finally {
        console.warn = originalWarn;
    }
}
