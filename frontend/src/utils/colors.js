export const LANGUAGE_COLORS = {
  Python:'#4B8BBE', JavaScript:'#F1E05A', TypeScript:'#3178C6',
  C:'#A8B9CC', 'C++':'#00599C', 'C/C++ Header':'#7E7E7E', 'C++ Header':'#7E7E7E',
  Java:'#ED8B00', Go:'#00ADD8', Rust:'#CE422B', Ruby:'#CC342D',
  PHP:'#777BB4', Swift:'#FA7343', Kotlin:'#7F52FF', 'C#':'#9B4993',
  HTML:'#E34F26', CSS:'#1572B6', SCSS:'#CC6699', JSON:'#6B6B6B',
  YAML:'#CB171E', Markdown:'#3d91b0', Shell:'#89E051', SQL:'#336791', Unknown:'#6B7280',
}
export const getLanguageColor = (lang) => LANGUAGE_COLORS[lang] ?? LANGUAGE_COLORS.Unknown
export const getLanguageBg = (lang, alpha = 0.12) => {
  const hex = getLanguageColor(lang).replace('#', '')
  const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16)
  return `rgba(${r},${g},${b},${alpha})`
}
