// Helper para obter o caminho correto das imagens de capa
import img1 from '../capa/img1.jpg'
import img2 from '../capa/img2.jpg'
import img3 from '../capa/img3.jpg'
import img4 from '../capa/img4.jpg'

const imageMap = {
  'img1': img1,
  'img2': img2,
  'img3': img3,
  'img4': img4,
}

/**
 * Retorna o caminho da imagem baseado no nome armazenado no banco
 * @param {string} capa - Nome da imagem (ex: 'img1', 'img2')
 * @returns {string} - Caminho da imagem importada ou null
 */
export function getImagePath(capa) {
  if (!capa) return null
  return imageMap[capa] || null
}

/**
 * Retorna a URL da imagem ou um placeholder
 * @param {string} capa - Nome da imagem
 * @param {string} titulo - Título do material (para alt text)
 * @returns {string} - URL da imagem ou placeholder
 */
export function getImageSrc(capa, titulo = '') {
  if (!capa) {
    return getPlaceholder(titulo)
  }

  // Primeiro tenta buscar no imageMap (imagens pré-definidas: img1, img2, img3, img4)
  const imgPath = getImagePath(capa)
  if (imgPath) return imgPath
  
  // Se não encontrou no map, é uma imagem enviada pelo usuário
  // Tenta diferentes extensões - retorna URL que o Vite pode servir
  // O componente MaterialCard vai tratar o erro se a imagem não existir
  const extensions = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG']
  for (const ext of extensions) {
    try {
      // Usa import.meta.url para criar URL relativa
      const imageUrl = new URL(`../capa/${capa}${ext}`, import.meta.url)
      return imageUrl.href
    } catch (e) {
      // Se falhar ao criar URL, tenta próximo
      continue
    }
  }
  
  // Se não conseguiu criar URL, retorna placeholder
  return getPlaceholder(titulo)
}

function getPlaceholder(titulo = '') {
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg width="200" height="300" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="300" fill="#061019"/>
      <text x="50%" y="50%" text-anchor="middle" fill="#666" font-family="Arial" font-size="14">
        ${titulo ? titulo.substring(0, 20) : 'Sem imagem'}
      </text>
    </svg>
  `)}`
}

