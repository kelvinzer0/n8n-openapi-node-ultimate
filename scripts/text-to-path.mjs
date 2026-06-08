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
		regular: ['JetBrainsMono-Regular-subset.ttf', 'JetBrainsMono-Regular.ttf'],
		bold: ['JetBrainsMono-Bold-subset.ttf', 'JetBrainsMono-Bold.ttf'],
		medium: ['JetBrainsMono-Medium-subset.ttf', 'JetBrainsMono-Medium.ttf'],
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
 * Render text char-by-char, bypassing GSUB shaping entirely.
 */
function renderCharByChar(font, text, x, y, fontSize) {
	let cursorX = x;
	const scale = fontSize / font.unitsPerEm;
	const path = new opentype.Path();
	for (const char of text) {
		const glyph = font.charToGlyph(char);
		if (glyph && glyph.path) {
			const glyphPath = glyph.getPath(cursorX, y, fontSize);
			for (const cmd of glyphPath.commands) {
				path.commands.push(cmd);
			}
		}
		cursorX += (glyph.advanceWidth || 0) * scale;
	}
	return path;
}

/**
 * Measure text width using actual font metrics.
 */
export function measureText(font, text, fontSize) {
	try {
		const path = font.getPath(text, 0, 0, fontSize);
		const bbox = path.getBoundingBox();
		return bbox.x2 - bbox.x1;
	} catch {
		// Fallback: measure char-by-char
		let width = 0;
		const scale = fontSize / font.unitsPerEm;
		for (const char of text) {
			const glyph = font.charToGlyph(char);
			width += (glyph.advanceWidth || 0) * scale;
		}
		return width;
	}
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
	const paragraphs = text.split(/\n/);
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
