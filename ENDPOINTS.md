# SHC Portal Endpoints

> This document tracks all discovered endpoints from the Sacred Heart College Thevara student portal.
> Base URL: `https://shcollege.online`

## Authentication

### Login Page
- **URL:** `/StudentLogin`
- **Method:** GET
- **Purpose:** Get login form with anti-forgery token
- **Response:** HTML page with login form
- **Key Elements:**
  - Form fields: `UserName`, `Password`, `RememberMe` (checkbox)
  - Hidden field: `__RequestVerificationToken` (ASP.NET anti-forgery token)
  - Form action: `/StudentLogin/Login` (POST)

### Login Submit
- **URL:** `/StudentLogin/Create` ✅ CONFIRMED
- **Method:** POST
- **Content-Type:** `application/x-www-form-urlencoded`
- **Form Data:**
  ```
  UserName=<registration_number>
  Password=<password>
  RememberMe=true (or false)
  ```
- **Note:** NO anti-forgery token required! ✅
- **Response:**
  - Success: Redirect to `/Student/Home` with session cookie
  - Failure: Returns 404 or shows error on login page
- **Cookies Set:** ASP.NET session cookies (need to verify exact name)

### Logout
- **URL:** `/StudentLogin/Logout`
- **Method:** GET
- **Purpose:** Clear session and logout
- **Response:** Redirect to `/StudentLogin`

### Password Reset
- **URL:** `/Login/ResetPassword`
- **Method:** GET/POST
- **Purpose:** Password reset form

## Student Dashboard

### Dashboard Home
- **URL:** `/Student/Home`
- **Method:** GET
- **Auth Required:** Yes (session cookie)
- **Response:** HTML page with student dashboard
- **Contains:**
  - Student registration number in `.login-name` span (e.g., "25HBAB19202")
  - Hidden input `#regNumber` with registration number
  - Student profile data embedded in HTML
  - Links to various student services
  - JavaScript that loads `/Student/Home/StudentCurrentSem`

### Current Semester Data
- **URL:** `/Student/Home/StudentCurrentSem`
- **Method:** GET
- **Auth Required:** Yes (session cookie)
- **Response:** JSON
- **Response Structure:**
  ```json
  {
    "Data": {
      "ApplicantRegistrationDetails": {
        "ProgramTypeMasterId": 1,
        "AcademicYearId": 16094,
        "CourseId": 3137,
        "SemesterId": 20069,
        "RegistrationNumber": "25HBAB19202",
        "Name": "Student Name",
        "Course": "Course Name",
        "Class": "Class Name",
        "Batch": "2025-2028"
      }
    },
    "Menu": [
      {
        "Id": 1,
        "MenuName": "Menu Item",
        "Url": "/path/to/page",
        "IsParent": 0,
        "ParentId": null
      }
    ]
  }
  ```
- **Purpose:** Get current semester details and menu structure

## Attendance (TO BE VERIFIED)

> **Note:** These endpoints need to be discovered by inspecting the JavaScript files:
> - `/Areas/Student/Script/StudentAttendanceProfile.js`
> - `/Areas/Student/Script/studentDashBoard.js`
> - `/Scripts/SacredHeart/common.js`

### Attendance Modal (Suspected)
- **URL:** TBD - Need to inspect JS files
- **Method:** TBD
- **Auth Required:** Yes
- **Purpose:** Open attendance modal and populate month dropdown
- **Function:** `getopenattendance()` (in JS)

### Attendance Data by Month (Suspected)
- **URL:** TBD - Likely `/Student/Home/GetAttendance` or `/Student/Attendance/GetDetails`
- **Method:** POST or GET
- **Auth Required:** Yes
- **Parameters:**
  - Month parameter (format TBD)
- **Response:** HTML table or JSON with attendance data
- **Triggered by:** `#btnSearch` button click in attendance modal

### Month Dropdown Data (Suspected)
- **URL:** TBD
- **Method:** GET
- **Auth Required:** Yes
- **Purpose:** Populate `#ddlmonth` dropdown with available months
- **Response:** HTML `<option>` elements or JSON array

## Other Endpoints

### Timetable
- **URL:** `/Student/Home/GetTimeTable`
- **Method:** GET
- **Auth Required:** Yes
- **Response:** HTML or JSON with timetable data

### Incident Details
- **URL:** `/Student/Home/GetStudentIncidentDetails`
- **Method:** GET
- **Auth Required:** Yes
- **Parameters:**
  - `registrationNumber=<reg_number>`
- **Response:** JSON or HTML with incident details

### Support Ticket
- **URL:** `/Student/Support/CreateTicket`
- **Method:** GET
- **Parameters:**
  - `Topicid=<0|1|2>` (0=Payment, 1=Marks, 2=Others)
  - `Message=<description>`
- **Response:** JSON with ticket number

## JavaScript Files to Inspect

1. **Student Attendance Profile**
   - Path: `/Areas/Student/Script/StudentAttendanceProfile.js`
   - Contains: Attendance AJAX calls, month dropdown logic, search functionality

2. **Student Dashboard**
   - Path: `/Areas/Student/Script/studentDashBoard.js`
   - Contains: Dashboard initialization, `getopenattendance()` function, modal logic

3. **Common Scripts**
   - Path: `/Scripts/SacredHeart/common.js`
   - Contains: Shared AJAX helpers, utility functions

## Notes

- All endpoints require HTTPS
- Session cookies are required for authenticated endpoints
- ASP.NET anti-forgery tokens are required for POST requests
- The portal uses standard ASP.NET MVC patterns
- Response formats vary: HTML, JSON, or mixed
- Some endpoints may return HTML fragments to be injected into modals/divs

## TODO

- [ ] Fetch and inspect the three JavaScript files mentioned above
- [ ] Document the exact attendance endpoint URL and parameters
- [ ] Verify the month parameter format
- [ ] Determine if attendance response is HTML or JSON
- [ ] Check if day-wise attendance data is available or only monthly aggregates
- [ ] Test all endpoints with actual credentials
