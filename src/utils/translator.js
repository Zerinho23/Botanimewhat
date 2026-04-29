const cache = new Map();
const MAX_CACHE = 200;

function looksSpanish(text) {
  if (!text) return true;
  const sample = text.slice(0, 400).toLowerCase();
  const spanishHits = (sample.match(/\b(el|la|los|las|de|que|en|y|es|un|una|por|para|con|del|al|su|sus|este|esta|fue|ser|tiene|años|también|más|pero|como|muy|cuando|donde|quien)\b/g) || []).length;
  const englishHits = (sample.match(/\b(the|of|and|to|in|is|that|for|as|with|on|by|are|was|were|be|has|have|been|from|but|not|this|which|or|an|at|when|where|who|what|after|before)\b/g) || []).length;
  return spanishHits > englishHits;
}

async function translateChunk(text, target = "es", source = "auto") {
  const url =
    `https://translate.googleapis.com/translate_a/single` +
    `?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
    },
  });
  if (!res.ok) throw new Error(`Translate HTTP ${res.status}`);
  const data = await res.json();
  return (data[0] || []).map((p) => p[0]).join("");
}

async function translate(text, target = "es") {
  if (!text || typeof text !== "string") return text;
  if (looksSpanish(text)) return text;
  const key = target + "::" + text;
  if (cache.has(key)) return cache.get(key);
  try {
    const chunks = [];
    const max = 4500;
    let remaining = text;
    while (remaining.length > max) {
      let cut = remaining.lastIndexOf(". ", max);
      if (cut < max / 2) cut = max;
      chunks.push(remaining.slice(0, cut + 1));
      remaining = remaining.slice(cut + 1);
    }
    chunks.push(remaining);
    const translated = [];
    for (const chunk of chunks) {
      translated.push(await translateChunk(chunk, target));
    }
    const result = translated.join("").trim();
    if (cache.size > MAX_CACHE) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    cache.set(key, result);
    return result;
  } catch (_) {
    return text;
  }
}

module.exports = { translate, looksSpanish };
