'use client';

import { useState } from 'react';
import { SHC_CONFIG } from '@/lib/constants';

export default function DebugPage() {
  const [targetPath, setTargetPath] = useState('/StudentLogin');
  const [method, setMethod] = useState<'GET' | 'POST'>('GET');
  const [formData, setFormData] = useState('');
  const [cookies, setCookies] = useState('');
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState<number | null>(null);
  const [setCookiesHeader, setSetCookiesHeader] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResponse('');
    setStatus(null);
    setSetCookiesHeader([]);

    try {
      const parsedFormData = formData.trim()
        ? Object.fromEntries(
            formData.split('\n').map((line) => {
              const [key, ...valueParts] = line.split('=');
              return [key.trim(), valueParts.join('=').trim()];
            })
          )
        : undefined;

      const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetPath,
          method,
          formData: parsedFormData,
          cookies: cookies.trim() || undefined,
        }),
      });

      const data = await res.json();
      setStatus(data.status);
      setResponse(data.body);
      if (data.setCookies) {
        setSetCookiesHeader(data.setCookies);
      }
    } catch (error) {
      setResponse(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const quickTests = [
    {
      name: 'Login Page',
      path: '/StudentLogin',
      method: 'GET' as const,
    },
    {
      name: 'Login Page (alt)',
      path: '/StudentLogin/Login',
      method: 'GET' as const,
    },
    {
      name: 'Student Dashboard',
      path: '/Student/Home',
      method: 'GET' as const,
    },
    {
      name: 'Current Semester API',
      path: '/Student/Home/StudentCurrentSem',
      method: 'GET' as const,
    },
    {
      name: 'Attendance JS',
      path: '/Areas/Student/Script/StudentAttendanceProfile.js',
      method: 'GET' as const,
    },
    {
      name: 'Dashboard JS',
      path: '/Areas/Student/Script/studentDashBoard.js',
      method: 'GET' as const,
    },
    {
      name: 'Common JS',
      path: '/Scripts/SacredHeart/common.js',
      method: 'GET' as const,
    },
  ];

  const extractFormFields = () => {
    if (!response) return;

    const parser = new DOMParser();
    const doc = parser.parseFromString(response, 'text/html');
    const inputs = doc.querySelectorAll('input');

    const fields: { name: string; type: string; value: string }[] = [];
    inputs.forEach(input => {
      fields.push({
        name: input.name || '(no name)',
        type: input.type || 'text',
        value: input.value || '(no value)',
      });
    });

    console.log('Form fields extracted:', fields);
    alert(`Found ${fields.length} form fields. Check console for details.`);
  };

  const runQuickTest = (path: string, testMethod: 'GET' | 'POST') => {
    setTargetPath(path);
    setMethod(testMethod);
  };

  if (process.env.NODE_ENV === 'production' && !process.env.DEBUG_MODE) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500">Debug Mode Disabled</h1>
          <p className="mt-2 text-gray-400">This page is only available in development mode.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-white">SHC Portal Debug Tool</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Request Form */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-white">Proxy Request</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Target Path
                  </label>
                  <input
                    type="text"
                    value={targetPath}
                    onChange={(e) => setTargetPath(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                    placeholder="/StudentLogin"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Base URL: {SHC_CONFIG.BASE_URL}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Method</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as 'GET' | 'POST')}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Form Data (one per line: key=value)
                  </label>
                  <textarea
                    value={formData}
                    onChange={(e) => setFormData(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500 font-mono text-sm"
                    rows={6}
                    placeholder="UserName=25HBAB19202&#10;Password=yourpassword&#10;__RequestVerificationToken=..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Cookies (optional)
                  </label>
                  <textarea
                    value={cookies}
                    onChange={(e) => setCookies(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500 font-mono text-sm"
                    rows={3}
                    placeholder=".AspNet.ApplicationCookie=..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium rounded transition-colors"
                >
                  {loading ? 'Loading...' : 'Send Request'}
                </button>
              </form>

              {/* Quick Tests */}
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-300 mb-2">Quick Tests:</h3>
                <div className="space-y-1">
                  {quickTests.map((test) => (
                    <button
                      key={test.path}
                      onClick={() => runQuickTest(test.path, test.method)}
                      className="w-full text-left px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300 transition-colors"
                    >
                      {test.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Response Display */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Response</h2>
                {status && (
                  <span
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      status >= 200 && status < 300
                        ? 'bg-green-600 text-white'
                        : status >= 400
                        ? 'bg-red-600 text-white'
                        : 'bg-yellow-600 text-white'
                    }`}
                  >
                    Status: {status}
                  </span>
                )}
              </div>

              {setCookiesHeader.length > 0 && (
                <div className="mb-4 p-3 bg-blue-900 border border-blue-700 rounded">
                  <h3 className="text-sm font-semibold text-blue-200 mb-2">Set-Cookie Headers:</h3>
                  {setCookiesHeader.map((cookie, idx) => (
                    <div key={idx} className="font-mono text-xs text-blue-100 mb-1 break-all">
                      {cookie}
                    </div>
                  ))}
                </div>
              )}

              {response && response.includes('<input') && (
                <div className="mb-4">
                  <button
                    onClick={extractFormFields}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                  >
                    Extract Form Fields
                  </button>
                </div>
              )}

              <div className="bg-gray-900 rounded p-4 max-h-[70vh] overflow-auto">
                {response ? (
                  <pre className="text-xs text-gray-300 whitespace-pre-wrap break-all font-mono">
                    {response}
                  </pre>
                ) : (
                  <p className="text-gray-500 italic">Response will appear here...</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
