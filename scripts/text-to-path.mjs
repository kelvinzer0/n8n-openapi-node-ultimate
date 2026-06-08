/**
 * text-to-path.mjs — Convert SVG text elements to path outlines using opentype.js
 * Ensures fonts render correctly regardless of system font availability.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import opentype from 'opentype.js';

const __dir = dirname(fileURLToPath(import.meta.url));

// Font cache
let _fonts = null;

/**
 * Load JetBrains Mono subset fonts (bundled with the package or downloaded on demand).
 * Returns { regular, bold, medium } opentype.Font objects.
 */
export async function loadFonts() {
	if (_fonts) return _fonts;

	// Try bundled subset fonts first, then fall back to system font
	const fontDir = join(__dir, 'fonts');
	const candidates = {
		regular: ['JetBrainsMono-Regular-fixed.ttf', 'JetBrainsMono-Regular-subset.ttf', 'JetBrainsMono-Regular.ttf'],
		bold: ['JetBrainsMono-Bold-fixed.ttf', 'JetBrainsMono-Bold-subset.ttf', 'JetBrainsMono-Bold.ttf'],
		medium: ['JetBrainsMono-Medium-fixed.ttf', 'JetBrainsMono-Medium-subset.ttf', 'JetBrainsMono-Medium.ttf'],
	};

	const fonts = {};
	for (const [weight, files] of Object.entries(candidates)) {
		for (const file of files) {
			try {
				const buf = readFileSync(join(fontDir, file));
				fonts[weight] = opentype.parse(buf.buffer);
				break;
			} catch { /* try next */ }
		}
	}

	// Fallback: if medium not found, use regular
	if (!fonts.medium) fonts.medium = fonts.regular;

	_fonts = fonts;
	return fonts;
}

/**
 * Convert a single line of text to an SVG path string.
 * @param {opentype.Font} font
 * @param {string} text
 * @param {number} fontSize
 * @param {number} x - baseline x
 * @param {number} y - baseline y (ascender line)
 * @returns {string} SVG path d attribute
 */
export function textToPathData(font, text, fontSize, x, y) {
	const path = font.getPath(text, x, y, fontSize);
	return path.toSVG(2); // returns <path d="..."/>
}

/**
 * Convert text to SVG path element string.
 * Wraps opentype.js getPath with fallback for unsupported GSUB lookups.
 */
export function textToPathElement(font, text, fontSize, x, y, fill, fillOpacity) {
	let path;
	try {
		path = font.getPath(text, x, y, fontSize);
	} catch (e) {
		// Fallback: render char-by-char to skip broken GSUB lookups
		path = renderCharByChar(font, text, x, y, fontSize);
	}
	const d = path.toSVG(2).replace(/<path[^>]*d="([^"]*)"[^>]*\/>/, '$1');
	const opacity = fillOpacity ? ` fill-opacity="${fillOpacity}"` : '';
	return `<path d="${d}" fill="${fill}"${opacity}/>`;
}

/**
 * Render text as separate SVG path elements, one per character.
 * Uses raw glyph data directly, bypassing all opentype.js shaping.
 * Each character is a completely independent <path> element.
 */
export function renderTextAsPaths(font, text, x, y, fontSize, fill, fillOpacity) {
	const scale = fontSize / font.unitsPerEm;
	const opacity = fillOpacity ? ` fill-opacity="${fillOpacity}"` : '';
	const parts = [];
	let cursorX = x;
	const normalized = normalizeText(text); //← normalize sebelum render

	for (let i = 0; i < normalized.length; i++) {
		const glyphIndex = font.charToGlyphIndex(normalized[i]);
		const fallbackAdvance = (font.glyphs.get(0)?.advanceWidth ?? font.unitsPerEm * 0.6) * scale; // ← fallback konsisten
		if (glyphIndex === 0) {
			cursorX += fallbackAdvance;
			continue;
		}
		const glyph = font.glyphs.get(glyphIndex);
		if (!glyph || !glyph.path || glyph.path.commands.length === 0) {
			cursorX += (glyph?.advanceWidth ?? font.unitsPerEm * 0.6) * scale;
			continue;
		}
		const gp = glyph.getPath(cursorX, y, fontSize);
		const d = gp.toSVG(2).replace(/<path[^>]*d="([^"]*)"[^>]*\/>/, '$1');
		if (d) parts.push(`<path d="${d}" fill="${fill}"${opacity}/>`);
		cursorX += (glyph.advanceWidth ?? font.unitsPerEm * 0.6) * scale;
	}
	return parts.join('\n');
}

/**
 * Normalize Unicode punctuation to ASCII equivalents supported by the font subset.
 * Curly quotes, en/em dashes, and ellipsis often missing from subset fonts.
 */
function normalizeText(text) {
	return text
		.replace(/[\u2018\u2019\u02BC]/g, "'")  // curly/modifier apostrophe → straight
		.replace(/[\u201C\u201D]/g, '"')         // curly double quotes → straight
		.replace(/\u2013/g, '-')                 // en-dash
		.replace(/\u2014/g, '--')                // em-dash
		.replace(/\u2026/g, '...')               // ellipsis character
		.replace(/\u00A0/g, ' ');               // non-breaking space → regular space
}


/**
 * Measure text width using actual font metrics.
 */
export function measureText(font, text, fontSize) {
	const scale = fontSize / font.unitsPerEm;
	let width = 0;
	for (const char of normalizeText(text)) {
		const glyphIndex = font.charToGlyphIndex(char);
		const glyph = font.glyphs.get(glyphIndex === 0 ? 0 : glyphIndex);
		width += (glyph?.advanceWidth ?? font.unitsPerEm * 0.6) * scale;
	}
	return width;
}

/**
 * Wrap text using actual font metrics for accurate width calculation.
 * @param {opentype.Font} font
 * @param {string} text
 * @param {number} fontSize
 * @param {number} maxWidth - max width in SVG units
 * @returns {string[]} array of wrapped lines
 */
export function wrapTextWithFont(font, text, fontSize, maxWidth) {
	// Split on explicit newlines first, then wrap each paragraph by width
	const paragraphs = normalizeText(text).split(/\n/); 
	const allLines = [];

	for (const para of paragraphs) {
		const trimmed = para.trim();
		if (!trimmed) {
			allLines.push('');
			continue;
		}
		const words = trimmed.split(/\s+/);
		let current = '';
		for (const word of words) {
			const test = current ? `${current} ${word}` : word;
			const width = measureText(font, test, fontSize);
			if (width > maxWidth && current) {
				allLines.push(current);
				current = word;
			} else {
				current = test;
			}
		}
		if (current) allLines.push(current);
	}
	return allLines;
}

// Need dirname from path
import { dirname } from 'path';
