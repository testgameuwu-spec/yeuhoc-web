'use client';

import { useMemo } from 'react';
import katex from 'katex';

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
        <span
            className={className}
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
    let result = text;

    // 1. Handle display math $$...$$
    result = result.replace(/\$\$([\s\S]*?)\$\$/g, (match, latex) => {
        const id = `__MATH_DISPLAY_${placeholders.length}__`;
        placeholders.push({ id, html: renderKatex(latex.trim(), true) });
        return id;
    });

    // 2. Handle display math \[...\]
    result = result.replace(/\\\[([\s\S]*?)\\\]/g, (match, latex) => {
        const id = `__MATH_DISPLAY_${placeholders.length}__`;
        placeholders.push({ id, html: renderKatex(latex.trim(), true) });
        return id;
    });

    // 3. Handle inline math \(...\)
    result = result.replace(/\\\(([\s\S]*?)\\\)/g, (match, latex) => {
        const id = `__MATH_INLINE_${placeholders.length}__`;
        placeholders.push({ id, html: renderKatex(latex.trim(), false) });
        return id;
    });

    // 4. Handle inline math $...$
    // More restrictive regex to avoid matching currency symbols ($100)
    // Matches $...$ where the content starts and ends with a non-whitespace character
    result = result.replace(/\$([^\s$](?:[^$]*[^\s$])?)\$/g, (match, latex) => {
        const id = `__MATH_INLINE_${placeholders.length}__`;
        placeholders.push({ id, html: renderKatex(latex.trim(), false) });
        return id;
    });

    // 5. Special fallback for \sqrt{...} without delimiters (often used in simple text)
    // Handles up to one level of nested braces
    result = result.replace(/\\sqrt\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, (match) => {
        const id = `__MATH_INLINE_${placeholders.length}__`;
        placeholders.push({ id, html: renderKatex(match, false) });
        return id;
    });

    // 6. Convert remaining newlines to <br> for proper display
    result = result.replace(/\n/g, '<br/>');

    // 7. Restore math from placeholders
    for (const p of placeholders) {
        result = result.split(p.id).join(p.html);
    }

    return result;
}

/**
 * Render a single LaTeX expression using KaTeX.
 */
function renderKatex(latex, displayMode) {
    try {
        const html = katex.renderToString(latex, {
            displayMode,
            throwOnError: false,
            strict: false,
            trust: true,
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
