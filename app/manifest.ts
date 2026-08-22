import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Hoopoe Event Planner',
    short_name: 'Hoopoe Planner',
    description: 'Find the best date for an event and coordinate with your team.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#006b3c',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/favicon-hoopoe.png',
        sizes: '1024x1024',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
