import { NextResponse } from 'next/server';

export function middleware(request) {
  if (request.nextUrl.pathname === '/workflow' ||
      request.nextUrl.pathname.startsWith('/workflow/')) {
    return NextResponse.redirect('http://localhost:5173' + request.nextUrl.pathname.replace('/workflow', ''));
  }
}

export const config = {
  matcher: '/workflow/:path*',
};
