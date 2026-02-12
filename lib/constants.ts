// Constants for SHC Attend

export const SHC_CONFIG = {
  BASE_URL: process.env.SHC_BASE_URL || 'https://shcollege.online',

  // Auth endpoints
  LOGIN_PAGE: '/studentlogin', // Lowercase - actual URL from browser
  LOGIN_POST: '/StudentLogin/Create', // Form action from HTML (case from form)
  LOGOUT: '/StudentLogin/Logout',
  RESET_PASSWORD: '/Login/ResetPassword',

  // Student endpoints
  STUDENT_HOME: '/Student/Home',
  CURRENT_SEM: '/Student/Home/StudentCurrentSem',
  TIMETABLE: '/Student/Home/GetAllTimeTable', // POST with X-Requested-With: XMLHttpRequest
  INCIDENT_DETAILS: '/Student/Home/GetStudentIncidentDetails',

  // Attendance endpoints - CONFIRMED via network inspection
  ATTENDANCE_MONTHS: '/Student/StudentAttendanceProfile/GetAllData', // Get available months (GET)
  ATTENDANCE_DATA: '/Student/StudentAttendanceProfile/SubjectWiseAttendence', // Get attendance by month (POST)

  // JavaScript files to inspect for endpoints
  JS_FILES: {
    ATTENDANCE_PROFILE: '/Areas/Student/Script/StudentAttendanceProfile.js',
    DASHBOARD: '/Areas/Student/Script/studentDashBoard.js',
    COMMON: '/Scripts/SacredHeart/common.js',
  },
} as const;

export const ATTENDANCE_COLORS = {
  GOOD: '#4CAF50',     // > 75%
  WARNING: '#FFC107',  // 65-75%
  DANGER: '#f44336',   // < 65%
} as const;

export const ATTENDANCE_THRESHOLDS = {
  GOOD: 75,
  WARNING: 65,
} as const;

export const CACHE_DURATIONS = {
  SESSION_VALIDATE: 5 * 60 * 1000,    // 5 minutes
  PROFILE_REFRESH: 30 * 24 * 60 * 60 * 1000, // 30 days
  SYNC_INTERVAL: 60 * 60 * 1000,      // 1 hour
} as const;

export const DB_CONFIG = {
  NAME: 'shc-attend-db',
  VERSION: 2, // Bumped to 2 to add timetable store
  STORES: {
    AUTH: 'auth',
    PROFILE: 'profile',
    ATTENDANCE: 'attendance',
    SYNC_META: 'sync_meta',
    CRYPTO_KEY: 'crypto_key',
    TIMETABLE: 'timetable',
  },
} as const;

export const RATE_LIMIT = {
  MAX_REQUESTS: 30,
  WINDOW_MS: 60 * 1000, // 1 minute
} as const;
