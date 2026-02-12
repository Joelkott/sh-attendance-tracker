import { NextRequest, NextResponse } from 'next/server';
import { SHC_CONFIG, RATE_LIMIT } from '@/lib/constants';
import type { ProxyRequest, ProxyResponse } from '@/lib/types';

// Change to nodejs runtime to properly capture Set-Cookie headers
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Simple in-memory rate limiting (resets on edge function restart)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);

  if (!record || now > record.resetTime) {
    requestCounts.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT.WINDOW_MS,
    });
    return true;
  }

  if (record.count >= RATE_LIMIT.MAX_REQUESTS) {
    return false;
  }

  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  // Get client IP for rate limiting
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  // Rate limiting
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    const body: ProxyRequest = await request.json();
    const { targetPath, method, formData, cookies } = body;

    // Validate targetPath to prevent SSRF
    if (!targetPath || targetPath.includes('..') || targetPath.startsWith('http')) {
      return NextResponse.json(
        { error: 'Invalid target path' },
        { status: 400 }
      );
    }

    const targetUrl = `${SHC_CONFIG.BASE_URL}${targetPath}`;

    // Build request headers with realistic browser headers
    const requestHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Cache-Control': 'max-age=0',
    };

    // Add cookies if provided
    if (cookies) {
      requestHeaders['Cookie'] = cookies;
    }

    let requestBody: string | undefined;

    // Handle form data for POST requests
    if (method === 'POST' && formData) {
      const formBody = new URLSearchParams(formData).toString();
      requestBody = formBody;
      requestHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
      requestHeaders['Content-Length'] = formBody.length.toString();
      requestHeaders['Origin'] = SHC_CONFIG.BASE_URL;
      requestHeaders['Referer'] = `${SHC_CONFIG.BASE_URL}${targetPath === SHC_CONFIG.LOGIN_POST ? '/studentlogin' : targetPath}`;
      requestHeaders['X-Requested-With'] = 'XMLHttpRequest';
    }

    // Make the request to SHC portal using native https module to capture cookies
    const https = await import('https');
    const { URL } = await import('url');
    const zlib = await import('zlib');

    const parsedUrl = new URL(targetUrl);

    const responseData = await new Promise<{ status: number; headers: any; body: string }>((resolve, reject) => {
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: method,
        headers: requestHeaders,
      };

      const req = https.request(options, (res) => {
        const chunks: Buffer[] = [];

        res.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const encoding = res.headers['content-encoding'];

          // Handle gzip/deflate/br compression
          if (encoding === 'gzip') {
            zlib.gunzip(buffer, (err, decompressed) => {
              if (err) {
                reject(err);
              } else {
                resolve({
                  status: res.statusCode || 200,
                  headers: res.headers,
                  body: decompressed.toString('utf-8')
                });
              }
            });
          } else if (encoding === 'deflate') {
            zlib.inflate(buffer, (err, decompressed) => {
              if (err) {
                reject(err);
              } else {
                resolve({
                  status: res.statusCode || 200,
                  headers: res.headers,
                  body: decompressed.toString('utf-8')
                });
              }
            });
          } else if (encoding === 'br') {
            zlib.brotliDecompress(buffer, (err, decompressed) => {
              if (err) {
                reject(err);
              } else {
                resolve({
                  status: res.statusCode || 200,
                  headers: res.headers,
                  body: decompressed.toString('utf-8')
                });
              }
            });
          } else {
            // No compression
            resolve({
              status: res.statusCode || 200,
              headers: res.headers,
              body: buffer.toString('utf-8')
            });
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (requestBody) {
        req.write(requestBody);
      }

      req.end();
    });

    // Extract Set-Cookie headers from raw response
    const setCookies: string[] = [];
    const setCookieHeader = responseData.headers['set-cookie'];
    if (setCookieHeader) {
      if (Array.isArray(setCookieHeader)) {
        setCookies.push(...setCookieHeader);
      } else {
        setCookies.push(setCookieHeader);
      }
    }

    const responseBody = responseData.body;

    // Log for debugging
    console.log('Proxy request to:', targetUrl);
    console.log('Response status:', responseData.status);
    console.log('Set-Cookie headers found:', setCookies.length);
    if (setCookies.length > 0) {
      console.log('Cookies:', setCookies.map(c => c.substring(0, 80) + '...'));
    }

    const proxyResponse: ProxyResponse = {
      status: responseData.status,
      body: responseBody,
      setCookies: setCookies.length > 0 ? setCookies : undefined,
    };

    return NextResponse.json(proxyResponse, {
      headers: {
        'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    {},
    {
      headers: {
        'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  );
}
