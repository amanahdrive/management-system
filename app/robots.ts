import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/cron/'],
    },
    sitemap: 'https://management-amanahdrive.vercel.app/sitemap.xml',
  };
}
