export default async function handler(req, res) {
  const { path } = req.query;
  const fullPath = Array.isArray(path) ? path.join('/') : path || '';

  let targetUrl;
  let basePath;

  // Determine which service to proxy to
  if (fullPath.startsWith('rakesh')) {
    targetUrl = 'https://rakesh-gupta29.github.io';
    basePath = '/rakesh';
    // Remove 'rakesh' from the path for the actual request
    const actualPath = fullPath.substring(6); // removes 'rakesh'
    targetUrl = `${targetUrl}${actualPath}`;
  } else if (fullPath.startsWith('workflow')) {
    targetUrl = 'https://n8n-production-353d.up.railway.app';
    basePath = '/workflow';
    // Remove 'workflow' from the path
    const actualPath = fullPath.substring(8); // removes 'workflow'
    targetUrl = `${targetUrl}${actualPath}`;
  } else {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    // Fetch the content from the target URL
    const response = await fetch(targetUrl, {
      headers: {
        ...req.headers,
        host: new URL(targetUrl).host,
      },
    });

    const contentType = response.headers.get('content-type') || '';

    // If it's HTML, modify the URLs
    if (contentType.includes('text/html')) {
      let html = await response.text();

      // Replace absolute URLs with proxied ones
      html = html.replace(/href="\//g, `href="${basePath}/`);
      html = html.replace(/src="\//g, `src="${basePath}/`);
      html = html.replace(/action="\//g, `action="${basePath}/`);

      // Handle CSS url() references
      html = html.replace(/url\(\//g, `url(${basePath}/`);

      // Set appropriate headers
      res.setHeader('Content-Type', 'text/html');
      return res.status(response.status).send(html);
    }

    // For non-HTML content (CSS, JS, images), pass through directly
    const buffer = await response.arrayBuffer();

    // Forward the content-type
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    return res.status(response.status).send(Buffer.from(buffer));

  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: 'Proxy error' });
  }
}

// Disable body parsing to handle all content types
export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};
