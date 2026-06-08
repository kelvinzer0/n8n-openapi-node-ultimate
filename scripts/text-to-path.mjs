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
		regular: ['JetBrainsMono-Regular-stripped.ttf', 'JetBrainsMono-Regular-subset.ttf', 'JetBrainsMono-Regular.ttf'],
		bold: ['JetBrainsMono-Bold-stripped.ttf', 'JetBrainsMono-Bold-subset.ttf', 'JetBrainsMono-Bold.ttf'],
		medium: ['JetBrainsMono-Medium-stripped.ttf', 'JetBrainsMono-Medium-subset.ttf', 'JetBrainsMono-Medium.ttf'],
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
 * @param {opentype.Font} font
 * @param {string} text
 * @param {number} fontSize
 * @param {number} x
 * @param {number} y - baseline y
 * @param {string} fill - fill attribute (e.g. 'white' or 'url(#gradient)')
 * @param {string} fillOpacity - optional fill-opacity
 * @returns {string} SVG <path> element
 */
export function textToPathElement(font, text, fontSize, x, y, fill, fillOpacity) {
	// Disable OpenType features to avoid unsupported lookup errors
	const path = font.getPath(text, x, y, fontSize, { features: [] });
	const d = path.toSVG(2).replace(/<path[^>]*d="([^"]*)"[^>]*\/>/, '$1');
	const opacity = fillOpacity ? ` fill-opacity="${fillOpacity}"` : '';
	return `<path d="${d}" fill="${fill}"${opacity}/>`;
}

/**
 * Measure text width using actual font metrics.
 * @param {opentype.Font} font
 * @param {string} text
 * @param {number} fontSize
 * @returns {number} width in SVG units
 */
export function measureText(font, text, fontSize) {
	const path = font.getPath(text, 0, 0, fontSize, { features: [] });
	const bbox = path.getBoundingBox();
	return bbox.x2 - bbox.x1;
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
	const words = text.split(/\s+/);
	const lines = [];
	let current = '';

	for (const word of words) {
		const test = current ? `${current} ${word}` : word;
		const width = measureText(font, test, fontSize);
		if (width > maxWidth && current) {
			lines.push(current);
			current = word;
		} else {
			current = test;
		}
	}
	if (current) lines.push(current);
	return lines;
}

// Need dirname from path
import { dirname } from 'path';
