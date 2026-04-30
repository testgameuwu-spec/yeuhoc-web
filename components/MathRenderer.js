'use client';

import { useMemo } from 'react';
import katex from 'katex';
import { marked } from 'marked';

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
    let result = text;

    // 1. Handle display math $$...$$
    result = result.replace(/\$\$([\s\S]*?)\$\$/g, (match, latex) => {
        const id = `MATH-DISPLAY-TOKEN-${placeholders.length}`;
        placeholders.push({ id, html: renderKatex(latex.trim(), true) });
        return id;
    });

    // 2. Handle display math \[...\]
    result = result.replace(/\\\[([\s\S]*?)\\\]/g, (match, latex) => {
        const id = `MATH-DISPLAY-TOKEN-${placeholders.length}`;
        placeholders.push({ id, html: renderKatex(latex.trim(), true) });
        return id;
    });

    // 3. Handle inline math \(...\)
    result = result.replace(/\\\(([\s\S]*?)\\\)/g, (match, latex) => {
        const id = `MATH-INLINE-TOKEN-${placeholders.length}`;
        placeholders.push({ id, html: renderKatex(latex.trim(), false) });
        return id;
    });

    // 4. Handle inline math $...$
    // Matches $...$ where content is non-empty
    // Uses negative lookahead to skip $$
    result = result.replace(/(?<!\$)\$(?!\$)([^$]+?)\$(?!\$)/g, (match, latex) => {
        const id = `MATH-INLINE-TOKEN-${placeholders.length}`;
        placeholders.push({ id, html: renderKatex(latex.trim(), false) });
        return id;
    });

    // 5. Fallback: detect common bare LaTeX commands outside any delimiters
    // Handles patterns like \sqrt{...}, \frac{...}{...}, \boxed{...}
    // Up to two levels of nested braces
    result = result.replace(/\\(?:frac|dfrac|sqrt|boxed|overline|underline|vec|hat|bar|tilde)(?:\[[^\]]*\])?(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})+/g, (match) => {
        if (match.includes('MATH-TOKEN')) return match;
        const id = `MATH-INLINE-TOKEN-${placeholders.length}`;
        placeholders.push({ id, html: renderKatex(match.trim(), false) });
        return id;
    });

    // 6. Render markdown for the non-math content
    result = marked.parse(result, { breaks: true, gfm: true });

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
