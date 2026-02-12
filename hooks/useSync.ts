'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getCachedAttendance,
  getCachedProfile,
  upsertAttendance,
  setCachedProfile,
  getSyncMeta,
  setSyncMeta,
  getCachedTimetable,
  upsertTimetable,
} from '@/lib/db';
import { fetchStudentProfile, fetchAttendanceData, fetchTimetable } from '@/lib/scraper';
import { validateSession } from '@/lib/auth';
import type { StudentProfile, AttendanceRecord, TimetableEntry, SyncStatus } from '@/lib/types';

export function useSync(cookies: string | null) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [cachedData, setCachedData] = useState<Map<string, AttendanceRecord[]>>(new Map());
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);

  // Load cached data on mount
  useEffect(() => {
    loadCachedData();
  }, []);

  const loadCachedData = async () => {
    try {
      const [attendance, studentProfile, syncMeta, cachedTimetable] = await Promise.all([
        getCachedAttendance(),
        getCachedProfile(),
        getSyncMeta(),
        getCachedTimetable(),
      ]);

      setCachedData(attendance);
      setProfile(studentProfile);
      setTimetable(cachedTimetable);

      if (syncMeta) {
        setLastSynced(new Date(syncMeta.timestamp));
      }
    } catch (error) {
      console.error('Failed to load cached data:', error);
    }
  };

  const triggerSync = useCallback(async () => {
    if (!cookies) {
      setSyncStatus('auth_required');
      setSyncError('Authentication required');
      return;
    }

    setSyncStatus('syncing');
    setSyncError(null);
    setSyncProgress(null);

    try {
      // Step 1: Validate session
      const isValid = await validateSession(cookies);

      if (!isValid) {
        setSyncStatus('auth_required');
        setSyncError('Session expired. Please log in again.');
        return;
      }

      // Step 2: Fetch profile (if not cached or > 30 days old)
      const currentProfile = await getCachedProfile();
      const shouldUpdateProfile =
        !currentProfile ||
        !lastSynced ||
        Date.now() - lastSynced.getTime() > 30 * 24 * 60 * 60 * 1000;

      if (shouldUpdateProfile) {
        const fetchedProfile = await fetchStudentProfile(cookies);
        if (fetchedProfile) {
          await setCachedProfile(fetchedProfile);
          setProfile(fetchedProfile);
        }
      }

      // Step 3: Fetch attendance and timetable data in parallel
      setSyncProgress({ current: 1, total: 3 });
      const [attendanceRecords, timetableData] = await Promise.all([
        fetchAttendanceData(cookies),
        fetchTimetable(cookies),
      ]);

      // Step 4: Store in IndexedDB
      setSyncProgress({ current: 2, total: 3 });
      if (attendanceRecords.length > 0) {
        await upsertAttendance('current', attendanceRecords);
      }
      if (timetableData.length > 0) {
        await upsertTimetable(timetableData);
      }

      // Step 5: Update sync metadata
      setSyncProgress({ current: 3, total: 3 });
      await setSyncMeta({
        timestamp: Date.now(),
        monthsFetched: attendanceRecords.length > 0 ? ['current'] : [],
      });

      // Step 6: Update local state
      const attendanceMap = new Map<string, AttendanceRecord[]>();
      if (attendanceRecords.length > 0) {
        attendanceMap.set('current', attendanceRecords);
      }
      setCachedData(attendanceMap);
      setTimetable(timetableData);
      setLastSynced(new Date());
      setSyncStatus('success');
      setSyncProgress(null);

      // Reset status after 3 seconds
      setTimeout(() => {
        setSyncStatus('idle');
      }, 3000);
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus('error');
      setSyncError(error instanceof Error ? error.message : 'Unknown sync error');
      setSyncProgress(null);
    }
  }, [cookies, lastSynced]);

  return {
    syncStatus,
    lastSynced,
    cachedData,
    profile,
    timetable,
    triggerSync,
    syncError,
    syncProgress,
  };
}
