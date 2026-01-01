// YouTube optimization utilities

export const preloadYouTubeIframe = (videoId: string) => {
  // Preconnect to YouTube domains for faster loading
  const preconnectLinks = ["https://www.youtube-nocookie.com", "https://i.ytimg.com", "https://www.google.com"]

  preconnectLinks.forEach((href) => {
    // Check if link already exists
    if (!document.querySelector(`link[href="${href}"]`)) {
      const link = document.createElement("link")
      link.rel = "preconnect"
      link.href = href
      link.crossOrigin = "anonymous"
      document.head.appendChild(link)
    }
  })
}
