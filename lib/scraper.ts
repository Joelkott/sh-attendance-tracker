// Scraper module - extracts attendance data from SHC portal responses
import { SHC_CONFIG } from './constants';
import type {
  StudentProfile,
  AttendanceRecord,
  MonthOption,
  TimetableEntry,
  ProxyRequest,
  ProxyResponse,
} from './types';

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
 * Parse student profile from dashboard HTML
 */
export async function fetchStudentProfile(cookies: string): Promise<StudentProfile | null> {
  try {
    const response = await callProxy({
      targetPath: SHC_CONFIG.CURRENT_SEM,
      method: 'GET',
      cookies,
    });

    if (response.status !== 200) {
      return null;
    }

    const data = JSON.parse(response.body);
    const details = data.Data?.ApplicantRegistrationDetails;

    if (!details) {
      return null;
    }

    return {
      registrationNumber: details.RegistrationNumber || '',
      name: details.Name || '',
      course: details.Course || '',
      className: details.Class || '',
      batch: details.Batch || '',
      semester: details.SemesterId?.toString() || '',
      academicYear: details.AcademicYearId?.toString() || '',
      programTypeId: details.ProgramTypeMasterId,
    };
  } catch (error) {
    console.error('Failed to fetch student profile:', error);
    return null;
  }
}

/**
 * Fetch available months for attendance
 * This needs to be reverse-engineered from the JS files
 */
export async function fetchAttendanceMonths(cookies: string): Promise<MonthOption[]> {
  // TODO: This endpoint needs to be discovered by inspecting the JS files
  // For now, return a mock implementation that should be replaced
  // once the actual endpoint is discovered

  console.warn(
    'fetchAttendanceMonths: Endpoint not yet discovered. Check /Areas/Student/Script/StudentAttendanceProfile.js'
  );

  // Return empty for now - this should be replaced after JS inspection
  return [];
}

/**
 * Parse attendance data from HTML table response
 * Handles the table format from /Student/StudentAttendanceProfile/SubjectWiseAttendence
 */
function parseAttendanceHTML(html: string): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const rows = doc.querySelectorAll('#tblsubjectwiseattendence tbody tr');

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const cells = row.querySelectorAll('td');

      // Skip header row and total row
      if (cells.length < 8 || row.classList.contains('trboder') || row.classList.contains('trodd2')) {
        continue;
      }

      // Extract data from cells
      // Format: Sl No | Subject Name | Attendance Type | Conducted | Present | Absent | Co-Curricular | Percentage
      const subjectText = cells[1]?.textContent?.trim() || '';
      const conducted = parseInt(cells[3]?.textContent?.trim() || '0');
      const present = parseInt(cells[4]?.textContent?.trim() || '0');
      const percentage = parseFloat(cells[7]?.textContent?.trim() || '0');

      if (subjectText && conducted > 0) {
        records.push({
          subject: subjectText,
          totalClasses: conducted,
          attendedClasses: present,
          percentage: percentage,
        });
      }
    }

    console.log(`Parsed ${records.length} attendance records from HTML`);
    return records;
  } catch (error) {
    console.error('Failed to parse attendance HTML:', error);
    return [];
  }
}

/**
 * Parse attendance data from HTML table or JSON response
 * @deprecated Use parseAttendanceHTML instead
 */
function parseAttendanceData(responseBody: string, month: string): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];

  // Try to parse as JSON first
  try {
    const jsonData = JSON.parse(responseBody);

    // Handle different possible JSON structures
    if (Array.isArray(jsonData)) {
      return jsonData.map((item) => ({
        subject: item.Subject || item.subject || '',
        totalClasses: parseInt(item.TotalClasses || item.totalClasses || '0'),
        attendedClasses: parseInt(item.AttendedClasses || item.attendedClasses || '0'),
        percentage: parseFloat(item.Percentage || item.percentage || '0'),
        month,
      }));
    } else if (jsonData.Data && Array.isArray(jsonData.Data)) {
      return jsonData.Data.map((item: any) => ({
        subject: item.Subject || item.subject || '',
        totalClasses: parseInt(item.TotalClasses || item.totalClasses || '0'),
        attendedClasses: parseInt(item.AttendedClasses || item.attendedClasses || '0'),
        percentage: parseFloat(item.Percentage || item.percentage || '0'),
        month,
      }));
    }
  } catch {
    // Not JSON, try parsing as HTML
  }

  // Parse HTML table (if response is HTML)
  if (responseBody.includes('<table') || responseBody.includes('<tr')) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(responseBody, 'text/html');
    const rows = doc.querySelectorAll('table tr');

    for (let i = 1; i < rows.length; i++) {
      // Skip header row
      const cells = rows[i].querySelectorAll('td');

      if (cells.length >= 3) {
        const subject = cells[0]?.textContent?.trim() || '';
        const totalClasses = parseInt(cells[1]?.textContent?.trim() || '0');
        const attendedClasses = parseInt(cells[2]?.textContent?.trim() || '0');
        const percentage =
          totalClasses > 0 ? (attendedClasses / totalClasses) * 100 : 0;

        if (subject) {
          records.push({
            subject,
            totalClasses,
            attendedClasses,
            percentage: Math.round(percentage * 100) / 100,
            month,
          });
        }
      }
    }
  }

  return records;
}

/**
 * Fetch attendance data (all subjects)
 * This is a two-step process:
 * 1. Get available months from /Student/StudentAttendanceProfile/GetAllData
 * 2. Fetch attendance for current month from /Student/StudentAttendanceProfile/SubjectWiseAttendence (POST)
 */
export async function fetchAttendanceData(cookies: string): Promise<AttendanceRecord[]> {
  try {
    console.log('Fetching attendance data...');

    const response = await callProxy({
      targetPath: SHC_CONFIG.ATTENDANCE_DATA,
      method: 'POST',
      formData: {
        studentId: '0',
        month: '0',
      },
      cookies,
    });

    if (response.status !== 200) {
      console.error('Failed to fetch attendance:', response.status);
      return [];
    }

    // Log response for debugging
    console.log('Attendance response received, length:', response.body.length);
    console.log('Response is HTML table, parsing...');
    console.log('First 500 chars:', response.body.substring(0, 500));

    // Check if response is empty
    if (!response.body || response.body.length === 0) {
      console.warn('Attendance response is empty');
      return [];
    }

    // The response is HTML with a table - parse it
    return parseAttendanceHTML(response.body);
  } catch (error) {
    console.error('Failed to fetch attendance data:', error);
    return [];
  }
}

/**
 * @deprecated Use fetchAttendanceData instead
 */
export async function fetchAttendanceByMonth(
  cookies: string,
  monthValue: string
): Promise<AttendanceRecord[]> {
  return fetchAttendanceData(cookies);
}

/**
 * Fetch all attendance data for all available months
 */
export async function fetchAllAttendance(
  cookies: string,
  progressCallback?: (current: number, total: number) => void
): Promise<Map<string, AttendanceRecord[]>> {
  const months = await fetchAttendanceMonths(cookies);
  const attendanceMap = new Map<string, AttendanceRecord[]>();

  for (let i = 0; i < months.length; i++) {
    const month = months[i];

    if (progressCallback) {
      progressCallback(i + 1, months.length);
    }

    try {
      const records = await fetchAttendanceByMonth(cookies, month.value);
      attendanceMap.set(month.value, records);

      // Add a small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Failed to fetch attendance for month ${month.label}:`, error);
    }
  }

  return attendanceMap;
}

/**
 * Fetch the JavaScript files from SHC portal to discover endpoints
 * This is a helper for development/debugging
 */
export async function fetchJavaScriptFiles(cookies: string): Promise<{
  attendanceProfile: string;
  dashboard: string;
  common: string;
}> {
  const [attendanceProfile, dashboard, common] = await Promise.all([
    callProxy({
      targetPath: SHC_CONFIG.JS_FILES.ATTENDANCE_PROFILE,
      method: 'GET',
      cookies,
    }),
    callProxy({
      targetPath: SHC_CONFIG.JS_FILES.DASHBOARD,
      method: 'GET',
      cookies,
    }),
    callProxy({
      targetPath: SHC_CONFIG.JS_FILES.COMMON,
      method: 'GET',
      cookies,
    }),
  ]);

  return {
    attendanceProfile: attendanceProfile.body,
    dashboard: dashboard.body,
    common: common.body,
  };
}

/**
 * Extract endpoint URLs from JavaScript code
 * Helper to find AJAX calls in the JS files
 */
export function extractEndpointsFromJS(jsCode: string): string[] {
  const endpoints: string[] = [];

  // Look for common AJAX patterns
  const patterns = [
    /url\s*:\s*["']([^"']+)["']/gi,
    /\$\.ajax\(\s*["']([^"']+)["']/gi,
    /\$\.get\(\s*["']([^"']+)["']/gi,
    /\$\.post\(\s*["']([^"']+)["']/gi,
    /fetch\(\s*["']([^"']+)["']/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(jsCode)) !== null) {
      if (match[1] && !endpoints.includes(match[1])) {
        endpoints.push(match[1]);
      }
    }
  }

  return endpoints;
}

/**
 * Fetch timetable data
 * Endpoint: /Student/Home/GetAllTimeTable (POST)
 * Returns timetable entries parsed from JSON response
 * Note: Pass empty strings to get timetable for current semester
 */
export async function fetchTimetable(cookies: string): Promise<TimetableEntry[]> {
  try {
    const response = await callProxy({
      targetPath: SHC_CONFIG.TIMETABLE,
      method: 'POST',
      formData: {
        'model[AcademicYearId]': '',
        'model[SemesterId]': '',
      },
      cookies,
    });

    if (response.status !== 200) {
      console.error('Failed to fetch timetable:', response.status);
      return [];
    }

    // Check if response is empty or error HTML
    if (!response.body || response.body.length === 0) {
      console.warn('Timetable response is empty');
      return [];
    }

    // Check if it's an HTML error page
    if (response.body.includes('<!DOCTYPE') || response.body.includes('<html')) {
      console.warn('Timetable endpoint returned HTML instead of JSON');
      return [];
    }

    // Parse JSON response
    try {
      const data = JSON.parse(response.body);

      // The response structure has TimeTableChildsList array with timetable entries
      if (data.TimeTableChildsList && Array.isArray(data.TimeTableChildsList)) {
        console.log(`Found ${data.TimeTableChildsList.length} timetable entries`);

        // Map day IDs to day names
        const dayMap: Record<number, string> = {
          6: 'Monday',
          1: 'Tuesday',
          2: 'Wednesday',
          3: 'Thursday',
          4: 'Friday',
          5: 'Saturday',
        };

        return data.TimeTableChildsList.map((item: any) => {
          // Extract subject name (remove course code suffix)
          const fullSubject = item.SubjectName || '';
          const subject = fullSubject.split('-')[0]?.trim() || fullSubject;

          return {
            day: dayMap[item.TimeTableDayMasterId] || `Day ${item.TimeTableDayMasterId}`,
            period: item.TimeTableHourMasterId || 0,
            subject: subject,
            teacher: '', // Not provided in response
            room: '', // Not provided in response
            startTime: '', // Not provided in response
            endTime: '', // Not provided in response
          };
        }).filter((entry: TimetableEntry) => entry.subject && entry.subject.length > 0);
      }

      console.warn('Timetable response has unexpected format. Missing TimeTableChildsList.');
      return [];
    } catch (error) {
      console.error('Failed to parse timetable JSON:', error);
      console.error('Raw response (first 500 chars):', response.body.substring(0, 500));
      return [];
    }
  } catch (error) {
    console.error('Failed to fetch timetable:', error);
    return [];
  }
}
