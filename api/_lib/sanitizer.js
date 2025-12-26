/**
 * Sanitizes AI-generated text to extract a valid JSON object.
 * Handles markdown code blocks, trailing commas, and extra text.
 */
function sanitizeJSON(text) {
    if (!text) return null;

    // 1. Remove markdown code blocks if present
    let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();

    // 2. Extract the main JSON block (between first { and last })
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');

    if (start === -1 || end === -1) return null;

    cleaned = cleaned.substring(start, end + 1);

    // 3. Remove trailing commas (e.g., ,} or ,])
    // This regex looks for commas followed by any whitespace and then a closing brace/bracket
    cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

    return cleaned;
}

module.exports = { sanitizeJSON };
