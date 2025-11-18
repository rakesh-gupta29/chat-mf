export default async function handler(req, res) {
  const { path } = req.query;
  const fullPath = Array.isArray(path) ? path.join('/') : path || '';

  let targetUrl;
  let basePath;

  // Determine which service to proxy to
  if (fullPath.startsWith('rakesh')) {
    targetUrl = 'https://rakesh-gupta29.github.io';
    basePath = '/rakesh';
    const actualPath = fullPath.substring(6);
    targetUrl = `${targetUrl}${actualPath}`;
  } else if (fullPath.startsWith('workflow')) {
    targetUrl = 'https://n8n-production-353d.up.railway.app';
    basePath = '/workflow';
    const actualPath = fullPath.substring(8);
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

    // If it's HTML, modify the URLs more aggressively
    if (contentType.includes('text/html')) {
      let html = await response.text();

      // Standard URL replacements
      html = html.replace(/href="\//g, `href="${basePath}/`);
      html = html.replace(/href='\//g, `href='${basePath}/`);
      html = html.replace(/src="\//g, `src="${basePath}/`);
      html = html.replace(/src='\//g, `src='${basePath}/`);
      html = html.replace(/action="\//g, `action="${basePath}/`);
      html = html.replace(/action='\//g, `action='${basePath}/`);

      // Handle CSS url() references
      html = html.replace(/url\(\//g, `url(${basePath}/`);
      html = html.replace(/url\('\//g, `url('${basePath}/`);
      html = html.replace(/url\("\//g, `url("${basePath}/`);

      // n8n specific: Handle API calls and WebSocket connections
      if (fullPath.startsWith('workflow')) {
        // Replace API endpoint references
        html = html.replace(
          /https:\/\/n8n-production-353d\.up\.railway\.app/g,
          '/workflow'
        );

        // Handle potential API base URL configurations
        html = html.replace(/api:\s*{\s*baseUrl:\s*["']\/["']/g, `api: { baseUrl: '${basePath}/'`);
        html = html.replace(/baseURL:\s*["']\/["']/g, `baseURL: '${basePath}/'`);

        // Inject a script to handle dynamic URL generation
        const scriptInjection = `
          <script>
            (function() {
              // Override fetch to rewrite URLs
              const originalFetch = window.fetch;
              window.fetch = function(url, ...args) {
                if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('${basePath}')) {
                  url = '${basePath}' + url;
                }
                return originalFetch(url, ...args);
              };
              
              // Override XMLHttpRequest
              const originalOpen = XMLHttpRequest.prototype.open;
              XMLHttpRequest.prototype.open = function(method, url, ...args) {
                if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('${basePath}')) {
                  url = '${basePath}' + url;
                }
                return originalOpen.call(this, method, url, ...args);
              };
              
              // Set global base URL if n8n uses it
              if (window.BASE_URL === '/' || !window.BASE_URL) {
                window.BASE_URL = '${basePath}/';
              }
              if (window.N8N_BASE_URL === '/' || !window.N8N_BASE_URL) {
                window.N8N_BASE_URL = '${basePath}/';
              }
            })();
          </script>
        `;

        // Inject the script right after opening body tag or before closing head tag
        if (html.includes('</head>')) {
          html = html.replace('</head>', `${scriptInjection}</head>`);
        } else if (html.includes('<body')) {
          html = html.replace(/<body[^>]*>/, (match) => `${match}${scriptInjection}`);
        }
      }

      res.setHeader('Content-Type', 'text/html');
      return res.status(response.status).send(html);
    }

    // For JavaScript files, also do URL replacement
    if (contentType.includes('javascript') || contentType.includes('application/json')) {
      let content = await response.text();

      if (fullPath.startsWith('workflow')) {
        // Replace hardcoded URLs in JavaScript
        content = content.replace(
          /["']\/api\//g,
          `"${basePath}/api/`
        );
        content = content.replace(
          /["']\/rest\//g,
          `"${basePath}/rest/`
        );
        content = content.replace(
          /["']\/webhook/g,
          `"${basePath}/webhook`
        );

        // Replace base URL configurations
        content = content.replace(
          /baseURL:\s*["']\/["']/g,
          `baseURL: "${basePath}/"`
        );
      }

      res.setHeader('Content-Type', contentType);
      return res.status(response.status).send(content);
    }

    // For CSS files, handle url() references
    if (contentType.includes('css')) {
      let css = await response.text();
      css = css.replace(/url\(\//g, `url(${basePath}/`);
      css = css.replace(/url\('\//g, `url('${basePath}/`);
      css = css.replace(/url\("\//g, `url("${basePath}/`);

      res.setHeader('Content-Type', 'text/css');
      return res.status(response.status).send(css);
    }

    // For other content types, pass through directly
    const buffer = await response.arrayBuffer();

    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    return res.status(response.status).send(Buffer.from(buffer));

  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: 'Proxy error', details: error.message });
  }
}

export const config = {
  api: {
    bodyParser: false,
    responseLimit: '10mb', // Increase if n8n serves large files
  },
};
