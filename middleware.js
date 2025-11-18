import { NextResponse } from 'next/server';

export const config = {
  matcher: [
    // Match all potential n8n asset paths
    '/static/:path*',
    '/assets/:path*',
    '/api/:path*',
    '/rest/:path*',
    '/css/:path*',
    '/js/:path*',
    '/favicon.ico',
    '/manifest.json',
    // Also match the workflow path itself
    '/workflow/:path*',
    '/workflow'
  ]
}

export function middleware(request) {
  const url = request.nextUrl;
  const pathname = url.pathname;

  // Handle /workflow and /workflow/* paths
  if (pathname.startsWith('/workflow')) {
    const targetPath = pathname.replace('/workflow', '') || '/';
    const targetUrl = `https://n8n-production-353d.up.railway.app${targetPath}${url.search}`;

    return NextResponse.rewrite(targetUrl);
  }

  // For asset paths, check if the request is coming from /workflow context
  const referer = request.headers.get('referer');

  // If the referer includes /workflow, proxy the asset request to n8n
  if (referer && referer.includes('/workflow')) {
    const targetUrl = `https://n8n-production-353d.up.railway.app${pathname}${url.search}`;
    return NextResponse.rewrite(targetUrl);
  }

  // Otherwise, let the request continue normally (for your own static files)
  return NextResponse.next();
}
