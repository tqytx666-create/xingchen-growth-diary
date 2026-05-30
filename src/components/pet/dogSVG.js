// 分层 SVG 星愿犬。o: { color, ear, glasses, sparkle, halo, wings, hat, racket, bowtie, towel, collar, dim }
function clamp255(n) { return Math.max(0, Math.min(255, Math.round(n))) }
function adj(hex, amt) {
  const h = hex.replace('#', '')
  const r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16)
  return '#' + [r, g, b].map(c => clamp255(c + amt).toString(16).padStart(2, '0')).join('')
}
export function dogSVG(o = {}) {
  const { color = '#f5e6c8', ear = '#e8c89a', glasses, sparkle, halo, wings, hat, racket, bowtie, towel, collar, dim } = o
  const eye = dim ? '#8a8a96' : '#2d2456'
  const gid = 'g' + Math.random().toString(36).slice(2, 7)
  return `<svg viewBox="0 0 200 200">
  <defs>
    <radialGradient id="fur${gid}" cx="45%" cy="35%" r="75%">
      <stop offset="0%" stop-color="${adj(color, 18)}"/><stop offset="70%" stop-color="${color}"/><stop offset="100%" stop-color="${adj(color, -10)}"/>
    </radialGradient>
    <radialGradient id="ch${gid}" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="rgba(255,158,199,.55)"/><stop offset="100%" stop-color="rgba(255,158,199,0)"/></radialGradient>
  </defs>
  ${halo ? `<ellipse cx="100" cy="36" rx="34" ry="9" fill="none" stroke="#ffd86b" stroke-width="3" opacity=".95"><animate attributeName="opacity" values=".5;1;.5" dur="2s" repeatCount="indefinite"/></ellipse>` : ''}
  ${wings ? `<path d="M52 122 Q14 98 26 144 Q44 137 62 142 Z" fill="#cdbcff" opacity=".85"/><path d="M148 122 Q186 98 174 144 Q156 137 138 142 Z" fill="#cdbcff" opacity=".85"/>` : ''}
  <path d="M150 130 Q180 115 175 90 Q172 108 152 118 Z" fill="url(#fur${gid})"><animateTransform attributeName="transform" type="rotate" values="0 150 130;13 150 130;0 150 130" dur="0.8s" repeatCount="indefinite"/></path>
  <ellipse cx="78" cy="166" rx="14" ry="20" fill="${adj(color, -8)}"/><ellipse cx="122" cy="166" rx="14" ry="20" fill="${adj(color, -8)}"/>
  <ellipse cx="100" cy="136" rx="48" ry="42" fill="url(#fur${gid})"/>
  ${towel ? `<path d="M62 120 Q100 150 138 120 L138 140 Q100 168 62 140 Z" fill="#bfe3ff" opacity=".9"/>` : ''}
  ${bowtie ? `<path d="M86 120 L100 127 L86 134 Z M114 120 L100 127 L114 134 Z" fill="#ff9ec7"/><circle cx="100" cy="127" r="3.5" fill="#ff7eb0"/>` : ''}
  ${collar ? `<path d="M70 116 Q100 132 130 116" stroke="#7c6bff" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="100" cy="128" r="5" fill="#ffd86b"/>` : ''}
  <ellipse cx="86" cy="169" rx="13" ry="18" fill="url(#fur${gid})"/><ellipse cx="114" cy="169" rx="13" ry="18" fill="url(#fur${gid})"/>
  ${racket ? `<g><ellipse cx="158" cy="92" rx="13" ry="17" fill="none" stroke="#fff" stroke-width="3"/><line x1="158" y1="109" x2="150" y2="132" stroke="#fff" stroke-width="3" stroke-linecap="round"/></g>` : ''}
  <circle cx="100" cy="80" r="46" fill="url(#fur${gid})"/>
  <path d="M60 55 Q48 30 68 28 Q80 38 78 62 Z" fill="${ear}"/><path d="M140 55 Q152 30 132 28 Q120 38 122 62 Z" fill="${ear}"/>
  <path d="M64 50 Q58 38 68 36 Q74 42 73 56 Z" fill="#ffb8d0"/><path d="M136 50 Q142 38 132 36 Q126 42 127 56 Z" fill="#ffb8d0"/>
  ${hat ? `<path d="M70 44 L100 16 L130 44 Z" fill="#7c6bff"/><circle cx="100" cy="15" r="5" fill="#ffd86b"/>` : ''}
  <ellipse cx="72" cy="92" rx="11" ry="8" fill="url(#ch${gid})"/><ellipse cx="128" cy="92" rx="11" ry="8" fill="url(#ch${gid})"/>
  <g class="eyeGroup">
    <circle cx="84" cy="78" r="8" fill="${eye}"/><circle cx="116" cy="78" r="8" fill="${eye}"/>
    <circle cx="86" cy="75" r="3" fill="#fff"/><circle cx="118" cy="75" r="3" fill="#fff"/>
  </g>
  ${sparkle ? `<text x="58" y="58" font-size="16">✨</text><text x="128" y="62" font-size="14">⭐</text>` : ''}
  <ellipse cx="100" cy="96" rx="16" ry="12" fill="#fff6e6"/><circle cx="100" cy="92" r="4" fill="${eye}"/>
  <path d="M100 96 Q100 102 94 104 M100 96 Q100 102 106 104" stroke="${eye}" stroke-width="2" fill="none"/>
  ${glasses ? `<g stroke="#7c6bff" stroke-width="3" fill="none"><circle cx="84" cy="78" r="13"/><circle cx="116" cy="78" r="13"/><line x1="97" y1="78" x2="103" y2="78"/></g>` : ''}
  </svg>`
}
