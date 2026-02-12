// Authentication module - handles login flow through proxy
import { SHC_CONFIG } from './constants';
import { getDB } from './db';
import { encrypt, decrypt, getMasterKey } from './crypto';
import type { LoginResult, ProxyRequest, ProxyResponse, SessionData } from './types';

/**
 * Parse HTML to extract anti-forgery token from login page
 */
function extractAntiForgeryToken(html: string): string | null {
  // Log the HTML for debugging
  const isDebug = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true' || process.env.NODE_ENV === 'development';
  if (isDebug) {
    console.log('Login page HTML length:', html.length);
    console.log('Searching for __RequestVerificationToken...');
  }

  // Try multiple patterns for finding the anti-forgery token
  const patterns = [
    // Standard ASP.NET MVC pattern
    /<input[^>]*name="__RequestVerificationToken"[^>]*value="([^"]+)"/i,
    // Reverse order (value before name)
    /<input[^>]*value="([^"]+)"[^>]*name="__RequestVerificationToken"/i,
    // Single quotes
    /<input[^>]*name='__RequestVerificationToken'[^>]*value='([^']+)'/i,
    // No quotes
    /<input[^>]*name=__RequestVerificationToken[^>]*value=([^\s>]+)/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      if (isDebug) {
        console.log('Found token with pattern:', pattern.source);
        console.log('Token (first 20 chars):', match[1].substring(0, 20) + '...');
      }
      return match[1];
    }
  }

  // If not found, log some HTML around where it should be
  if (isDebug) {
    const tokenPosition = html.toLowerCase().indexOf('requestverificationtoken');
    if (tokenPosition > -1) {
      console.log('Found "RequestVerificationToken" text at position:', tokenPosition);
      console.log('Context:', html.substring(Math.max(0, tokenPosition - 100), tokenPosition + 200));
    } else {
      console.log('String "RequestVerificationToken" not found in HTML at all');
      // Log form fields that are present
      const formFields = html.match(/<input[^>]*name="([^"]+)"/gi);
      console.log('Form fields found:', formFields?.slice(0, 10));
    }
  }

  return null;
}

/**
 * Call the proxy API
 */
async function callProxy(request: ProxyRequest): Promise<ProxyResponse> {
  const response = await fetch('/api/proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Proxy request failed: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Fetch the login page and extract the anti-forgery token
 */
export async function fetchLoginPage(): Promise<{
  token: string | null;
  cookies: string[];
}> {
  const response = await callProxy({
    targetPath: SHC_CONFIG.LOGIN_PAGE,
    method: 'GET',
  });

  const token = extractAntiForgeryToken(response.body);

  return {
    token,
    cookies: response.setCookies || [],
  };
}

/**
 * Login to the SHC portal
 */
export async function login(
  username: string,
  password: string,
  rememberMe: boolean = false
): Promise<LoginResult> {
  try {
    // Step 1: Fetch login page to get anti-forgery token (and cookies)
    const { token, cookies: initialCookies } = await fetchLoginPage();

    // Note: Token might be null if the site doesn't use anti-forgery tokens
    // We'll try to login anyway
    if (!token) {
      console.warn('No anti-forgery token found, attempting login without it...');
    }

    // Step 2: Submit login form
    // Note: ASP.NET checkbox pattern sends both checkbox value and hidden field
    const formData: Record<string, string> = {
      UserName: username,
      Password: password,
    };

    // ASP.NET checkboxes: if checked, send "true,false", if unchecked, send "false"
    if (rememberMe) {
      formData.RememberMe = 'true';
    } else {
      formData.RememberMe = 'false';
    }

    // Only include token if it exists
    if (token) {
      formData.__RequestVerificationToken = token;
    }

    console.log('Posting login with data:', { ...formData, Password: '***' });

    const loginResponse = await callProxy({
      targetPath: SHC_CONFIG.LOGIN_POST,
      method: 'POST',
      formData,
      cookies: initialCookies.join('; '),
    });

    // Log the response for debugging
    console.log('Login response status:', loginResponse.status);
    console.log('Login response cookies:', loginResponse.setCookies);
    console.log('Login response body (first 500 chars):', loginResponse.body.substring(0, 500));
    console.log('Login response body length:', loginResponse.body.length);

    // Check if the response contains specific text that indicates success or failure
    if (loginResponse.body.toLowerCase().includes('username') &&
        loginResponse.body.toLowerCase().includes('password')) {
      console.log('⚠️ Response appears to be the login form again - login likely failed');
    }
    if (loginResponse.body.toLowerCase().includes('student')) {
      console.log('✓ Response contains "student" - might be successful');
    }

    // Step 3: Check if login was successful
    // ASP.NET typically redirects to /Student/Home on success or back to login on failure
    const sessionCookies = loginResponse.setCookies || [];

    // Check for various session cookie patterns
    const hasSessionCookie = sessionCookies.some((cookie) =>
      cookie.toLowerCase().includes('aspnet') ||
      cookie.toLowerCase().includes('session') ||
      cookie.toLowerCase().includes('auth')
    );

    console.log('Has session cookie?', hasSessionCookie);
    console.log('All cookies:', sessionCookies);

    // Check if response indicates success
    // Success indicators:
    // 1. Has session cookie
    // 2. Status is redirect (302, 301, 303, 307, 308)
    // 3. Response contains /Student/ path (successful redirect)
    // 4. Response body is small (likely a redirect, not error page)
    const isRedirect = [301, 302, 303, 307, 308].includes(loginResponse.status);
    const containsStudentPath = loginResponse.body.toLowerCase().includes('/student/') ||
                                 loginResponse.body.toLowerCase().includes('student/home') ||
                                 loginResponse.body.toLowerCase().includes('logout');
    const isSmallResponse = loginResponse.body.length < 1000; // Redirects are typically small
    const hasErrorPage = loginResponse.body.includes('404') ||
                          loginResponse.body.includes('Something Went Wrong') ||
                          loginResponse.body.includes('Oops');

    console.log('Is redirect?', isRedirect);
    console.log('Contains student path?', containsStudentPath);
    console.log('Is small response?', isSmallResponse);
    console.log('Has error page?', hasErrorPage);

    // If we got an error page (404), definitely failed
    if (hasErrorPage) {
      return {
        success: false,
        error: 'Login endpoint returned an error. Please check your credentials.',
      };
    }

    // Consider it successful if we have a session cookie OR it's a redirect
    const isSuccess = hasSessionCookie || isRedirect || (containsStudentPath && isSmallResponse);

    if (!isSuccess) {
      // Check if there's an error message in the response
      const errorMatch = loginResponse.body.match(/error[^<]*>([^<]+)/i);
      const errorMsg = errorMatch ? errorMatch[1] : 'Login failed - please check your credentials';

      return {
        success: false,
        error: errorMsg,
      };
    }

    // Combine all cookies
    const allCookies = [...initialCookies, ...sessionCookies]
      .map((cookie) => cookie.split(';')[0]) // Extract just the cookie value, not the metadata
      .join('; ');

    console.log('✓ Login successful! Storing session...');
    console.log('All cookies combined:', allCookies.substring(0, 100) + '...');

    // Step 4: Store encrypted cookies in IndexedDB
    try {
      console.log('Getting IndexedDB...');
      const db = await getDB();

      console.log('Getting master encryption key...');
      const masterKey = await getMasterKey(db);

      console.log('Encrypting cookies...');
      const encryptedCookies = await encrypt(allCookies, masterKey);

      const encryptedUsername = rememberMe ? await encrypt(username, masterKey) : undefined;
      const encryptedPassword = rememberMe ? await encrypt(password, masterKey) : undefined;

      const sessionData: SessionData = {
        cookies: encryptedCookies,
        lastValidated: Date.now(),
        username: encryptedUsername,
        password: encryptedPassword,
      };

      console.log('Storing session in IndexedDB...');
      await db.put('auth', sessionData, 'session');

      console.log('✓ Session stored successfully!');

      return {
        success: true,
        cookies: allCookies,
      };
    } catch (storageError) {
      console.error('Failed to store session:', storageError);
      // Still return success since login worked, just storage failed
      return {
        success: true,
        cookies: allCookies,
      };
    }
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during login',
    };
  }
}

/**
 * Validate the current session by calling an authenticated endpoint
 */
export async function validateSession(cookies: string): Promise<boolean> {
  try {
    const response = await callProxy({
      targetPath: SHC_CONFIG.CURRENT_SEM,
      method: 'GET',
      cookies,
    });

    // If we get valid JSON with student data, session is valid
    if (response.status === 200) {
      try {
        const data = JSON.parse(response.body);
        return data.Data != null && data.Data !== 0;
      } catch {
        return false;
      }
    }

    return false;
  } catch (error) {
    console.error('Session validation error:', error);
    return false;
  }
}

/**
 * Get the current session from IndexedDB
 */
export async function getStoredSession(): Promise<{
  cookies: string;
  username?: string;
  password?: string;
} | null> {
  try {
    const db = await getDB();
    const sessionData = await db.get('auth', 'session');

    if (!sessionData) {
      return null;
    }

    const masterKey = await getMasterKey(db);
    const cookies = await decrypt(sessionData.cookies, masterKey);

    let username: string | undefined;
    let password: string | undefined;

    if (sessionData.username) {
      username = await decrypt(sessionData.username, masterKey);
    }

    if (sessionData.password) {
      password = await decrypt(sessionData.password, masterKey);
    }

    return { cookies, username, password };
  } catch (error) {
    console.error('Failed to get stored session:', error);
    return null;
  }
}

/**
 * Check if the stored session is still valid
 */
export async function checkStoredSession(): Promise<{
  isValid: boolean;
  cookies?: string;
}> {
  const session = await getStoredSession();

  if (!session) {
    return { isValid: false };
  }

  const isValid = await validateSession(session.cookies);

  if (!isValid) {
    // Clear invalid session
    await logout();
    return { isValid: false };
  }

  return {
    isValid: true,
    cookies: session.cookies,
  };
}

/**
 * Logout - clear all stored auth data
 */
export async function logout(): Promise<void> {
  try {
    const db = await getDB();
    await db.delete('auth', 'session');

    // Optionally hit the logout endpoint
    const session = await getStoredSession();
    if (session) {
      await callProxy({
        targetPath: SHC_CONFIG.LOGOUT,
        method: 'GET',
        cookies: session.cookies,
      }).catch(() => {
        // Ignore errors on logout
      });
    }
  } catch (error) {
    console.error('Logout error:', error);
  }
}
