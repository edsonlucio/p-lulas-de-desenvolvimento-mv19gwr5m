export function getYoutubeId(url: string) {
  try {
    const parsed = new URL(url)
    if (parsed.hostname.includes('youtu.be')) return parsed.pathname.slice(1)
    if (parsed.pathname.startsWith('/embed/')) return parsed.pathname.split('/')[2]
    return parsed.searchParams.get('v') ?? ''
  } catch {
    return ''
  }
}

export function getYoutubeEmbed(url: string, startSeconds = 0, autoplay = false) {
  const id = getYoutubeId(url)
  if (!id) return ''
  const params = new URLSearchParams({ rel: '0', modestbranding: '1', enablejsapi: '1' })
  if (startSeconds > 0) params.set('start', String(Math.floor(startSeconds)))
  if (autoplay) params.set('autoplay', '1')
  return `https://www.youtube.com/embed/${id}?${params.toString()}`
}
