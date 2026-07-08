/**
 * 人物关系图布局与边解析。
 */

/**
 * 解析单个人物的关系列表为边数组。
 * @param {Object} character 人物对象
 * @param {string[]} allNames 全部人物名(用于过滤无效目标)
 * @returns {Array<{from,to,type}>}
 */
export function parseEdges(character, allNames) {
  const edges = [];
  const rel = character.relationships;
  if (!rel) return edges;

  const items = Array.isArray(rel)
    ? rel
    : String(rel)
        .split(/[,，;；\n]/)
        .map((s) => s.trim())
        .filter(Boolean);

  for (const item of items) {
    if (typeof item === 'object') {
      edges.push({
        from: character.name,
        to: item.target || item.to,
        type: item.type || '关系'
      });
      continue;
    }
    const m = item.match(/^(.+?)\s*[:：]\s*(.+)$/) || item.match(/^(.+?)\s*[（(]\s*(.+?)\s*[）)]\s*$/);
    let target, type;
    if (m) {
      const [a, b] = [m[1].trim(), m[2].trim()];
      if (allNames.includes(a)) {
        target = a;
        type = b;
      } else if (allNames.includes(b)) {
        target = b;
        type = a;
      } else {
        target = a;
        type = b;
      }
    } else {
      target = item;
      type = '关系';
    }
    if (target && target !== character.name && allNames.includes(target)) {
      edges.push({ from: character.name, to: target, type });
    }
  }
  return edges;
}

/**
 * 圆形布局:在 (width × height) 画布内把节点均匀分布在圆周上。
 * @param {Array} nodes
 * @param {number} width
 * @param {number} height
 * @returns {Array} 含 x/y 坐标的节点
 */
export function circularLayout(nodes, width, height) {
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) / 2 - 60;
  return nodes.map((n, i) => {
    const angle = (i / Math.max(nodes.length, 1)) * Math.PI * 2 - Math.PI / 2;
    return { ...n, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });
}
