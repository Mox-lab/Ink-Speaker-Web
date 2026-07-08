/**
 * 大纲文本解析为节点数组。
 * @param {string} text
 * @returns {Array<{index,no,title,summary}>}
 */
export function parseOutline(text) {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const nodes = [];
  let current = null;
  const headingRe = /^(?:\s*)(?:第\s*([零一二三四五六七八九十百千\d]+)\s*章|(?:#{1,4})\s*(\d+|第[零一二三四五六七八九十百千\d]+章?)\b|(?:Chapter|CH)\s*[:：]?\s*(\d+)|(\d+)\s*[.、:：])\s*(.*)$/i;

  const flush = () => {
    if (current) {
      current.summary = current.summary.trim();
      if (current.summary || current.title) nodes.push(current);
    }
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    const m = line.match(headingRe);
    if (m) {
      flush();
      const title = (m[5] || '').trim() || `第 ${nodes.length + 1} 节点`;
      current = {
        index: nodes.length,
        no: m[1] || m[2] || m[3] || m[4] || (nodes.length + 1),
        title,
        summary: ''
      };
    } else if (current) {
      if (line) {
        current.summary += (current.summary ? '\n' : '') + line;
      }
    } else if (line.trim()) {
      current = {
        index: nodes.length,
        no: nodes.length + 1,
        title: `节段 ${nodes.length + 1}`,
        summary: line
      };
    }
  }
  flush();

  if (nodes.length === 0 && text.trim()) {
    return text
      .split(/\n\s*\n/)
      .map((blk, i) => ({
        index: i,
        no: i + 1,
        title: `节段 ${i + 1}`,
        summary: blk.trim()
      }))
      .filter((n) => n.summary);
  }

  return nodes;
}
