'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useSync } from '@/hooks/useSync';
import { useOffline } from '@/hooks/useOffline';
import { ATTENDANCE_THRESHOLDS, ATTENDANCE_COLORS } from '@/lib/constants';
import type { BunkCalculation } from '@/lib/types';

type TabType = 'timetable' | 'bunk';

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, cookies, logout } = useAuth();
  const { syncStatus, lastSynced, cachedData, profile, timetable, triggerSync, syncError, syncProgress } =
    useSync(cookies);
  const isOffline = useOffline();
  const [activeTab, setActiveTab] = useState<TabType>('timetable');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [touchStart, setTouchStart] = useState<number>(0);
  const [touchEnd, setTouchEnd] = useState<number>(0);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    const now = Date.now();
    const diff = now - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getColorForPercentage = (percentage: number) => {
    if (percentage >= ATTENDANCE_THRESHOLDS.GOOD) return ATTENDANCE_COLORS.GOOD;
    if (percentage >= ATTENDANCE_THRESHOLDS.WARNING) return ATTENDANCE_COLORS.WARNING;
    return ATTENDANCE_COLORS.DANGER;
  };

  // Calculate bunk possibilities for each subject
  const calculateBunkData = (): BunkCalculation[] => {
    const bunkData: BunkCalculation[] = [];
    const targetPercentage = ATTENDANCE_THRESHOLDS.GOOD; // 75%

    for (const records of cachedData.values()) {
      for (const record of records) {
        const { subject, totalClasses, attendedClasses, percentage } = record;

        // Calculate how many classes can be bunked while staying above 75%
        let canBunk = 0;
        if (percentage >= targetPercentage) {
          // Binary search for max bunkable classes
          let low = 0;
          let high = 100;
          while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const newPercentage = (attendedClasses / (totalClasses + mid)) * 100;
            if (newPercentage >= targetPercentage) {
              canBunk = mid;
              low = mid + 1;
            } else {
              high = mid - 1;
            }
          }
        }

        // Calculate how many classes need to be attended to reach 75%
        let needToAttend = 0;
        if (percentage < targetPercentage) {
          // Solve: (attendedClasses + x) / (totalClasses + x) = 0.75
          // attendedClasses + x = 0.75 * (totalClasses + x)
          // attendedClasses + x = 0.75 * totalClasses + 0.75x
          // x - 0.75x = 0.75 * totalClasses - attendedClasses
          // 0.25x = 0.75 * totalClasses - attendedClasses
          // x = (0.75 * totalClasses - attendedClasses) / 0.25
          needToAttend = Math.ceil(
            (targetPercentage / 100 * totalClasses - attendedClasses) / (1 - targetPercentage / 100)
          );
          needToAttend = Math.max(0, needToAttend);
        }

        bunkData.push({
          subject,
          currentPercentage: percentage,
          totalClasses,
          attendedClasses,
          canBunk,
          needToAttend,
          targetPercentage,
        });
      }
    }

    return bunkData;
  };

  const bunkData = calculateBunkData();

  // Group timetable by day
  const timetableByDay = (timetable || []).reduce((acc, entry) => {
    if (!acc[entry.day]) {
      acc[entry.day] = [];
    }
    acc[entry.day].push(entry);
    return acc;
  }, {} as Record<string, TimetableEntry[]>);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // Get current day index
  const getCurrentDayIndex = () => {
    const dayIndex = new Date().getDay();
    // Convert Sunday (0) to 0 (Monday), Monday (1) to 0, etc.
    if (dayIndex === 0) return 0; // Sunday -> show Monday
    return dayIndex - 1;
  };

  // Initialize selected day to current day
  useEffect(() => {
    setSelectedDayIndex(getCurrentDayIndex());
  }, []);

  const currentDayIndex = getCurrentDayIndex();

  // Handle swipe gestures
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(0);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && selectedDayIndex < days.length - 1) {
      setSelectedDayIndex(selectedDayIndex + 1);
    }
    if (isRightSwipe && selectedDayIndex > 0) {
      setSelectedDayIndex(selectedDayIndex - 1);
    }
  };

  const goToPreviousDay = () => {
    if (selectedDayIndex > 0) {
      setSelectedDayIndex(selectedDayIndex - 1);
    }
  };

  const goToNextDay = () => {
    if (selectedDayIndex < days.length - 1) {
      setSelectedDayIndex(selectedDayIndex + 1);
    }
  };

  const goToToday = () => {
    setSelectedDayIndex(currentDayIndex);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0d0c0a' }}>
        <div style={{ color: '#fdffff' }}>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: '#0d0c0a' }}>
      {/* Header */}
      <div className="px-6 pt-8 pb-6" style={{ background: 'linear-gradient(135deg, #b6af95 0%, #8a826e 100%)' }}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold" style={{ color: '#0d0c0a' }}>
              {profile?.registrationNumber || 'Student'}
            </h1>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm font-medium rounded-full transition-all hover:scale-105"
              style={{ backgroundColor: '#0d0c0a', color: '#b6af95' }}
            >
              Logout
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={triggerSync}
              disabled={syncStatus === 'syncing' || isOffline}
              className="px-6 py-2.5 text-sm font-semibold rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
              style={{
                backgroundColor: '#0d0c0a',
                color: '#b6af95',
              }}
            >
              {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
            </button>
            {lastSynced && (
              <span className="text-xs opacity-60" style={{ color: '#0d0c0a' }}>
                Last synced: {formatDate(lastSynced)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Offline Banner */}
      {isOffline && (
        <div className="px-6 py-2" style={{ backgroundColor: '#2a2722' }}>
          <div className="max-w-3xl mx-auto text-center text-xs" style={{ color: '#b6af95' }}>
            Offline - Viewing cached data
          </div>
        </div>
      )}

      {/* Error Message */}
      {syncError && (
        <div className="px-6 py-2" style={{ backgroundColor: '#2a1715' }}>
          <div className="max-w-3xl mx-auto text-center text-xs" style={{ color: '#d5b6a8' }}>
            {syncError}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="px-6 py-3" style={{ backgroundColor: '#0d0c0a' }}>
        <div className="max-w-3xl mx-auto flex gap-2 rounded-full p-1" style={{ backgroundColor: '#1a1917' }}>
          <button
            onClick={() => setActiveTab('timetable')}
            className="flex-1 py-2 text-center text-xs font-bold rounded-full transition-all"
            style={{
              color: activeTab === 'timetable' ? '#0d0c0a' : '#7a7568',
              backgroundColor: activeTab === 'timetable' ? '#b6af95' : 'transparent',
            }}
          >
            Timetable
          </button>
          <button
            onClick={() => setActiveTab('bunk')}
            className="flex-1 py-2 text-center text-xs font-bold rounded-full transition-all"
            style={{
              color: activeTab === 'bunk' ? '#0d0c0a' : '#7a7568',
              backgroundColor: activeTab === 'bunk' ? '#b6af95' : 'transparent',
            }}
          >
            Bunk Calculator
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-4">
        {/* Timetable Tab */}
        {activeTab === 'timetable' && (
          <div className="space-y-4">
            {!timetable || timetable.length === 0 ? (
              <div className="rounded-3xl p-12 text-center" style={{ backgroundColor: '#1a1917' }}>
                <p className="text-lg" style={{ color: '#7a7568' }}>No timetable data yet</p>
                <p className="text-sm mt-2 opacity-60" style={{ color: '#7a7568' }}>Tap "Sync" to fetch your timetable</p>
              </div>
            ) : (
              <>
                {/* Day Navigation */}
                <div className="flex items-center justify-between px-2">
                  <button
                    onClick={goToPreviousDay}
                    disabled={selectedDayIndex === 0}
                    className="p-2 rounded-full transition-all disabled:opacity-30 hover:scale-110"
                    style={{ color: '#b6af95' }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </button>

                  <div className="flex items-center gap-2">
                    {selectedDayIndex === currentDayIndex && (
                      <div
                        className="px-4 py-1.5 text-xs font-semibold rounded-full"
                        style={{ backgroundColor: '#b6af95', color: '#0d0c0a' }}
                      >
                        Today
                      </div>
                    )}
                  </div>

                  <button
                    onClick={goToNextDay}
                    disabled={selectedDayIndex === days.length - 1}
                    className="p-2 rounded-full transition-all disabled:opacity-30 hover:scale-110"
                    style={{ color: '#b6af95' }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                </div>

                {/* Swipeable Card */}
                <div
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                  className="rounded-3xl overflow-hidden transition-all"
                  style={{ backgroundColor: '#1a1917' }}
                >
                  {/* Day Banner */}
                  <div className="px-6 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #b6af95 0%, #8a826e 100%)' }}>
                    <h3 className="font-bold text-xl" style={{ color: '#0d0c0a' }}>
                      {days[selectedDayIndex]}
                    </h3>
                    <div className="flex gap-1">
                      {days.map((_, idx) => (
                        <div
                          key={idx}
                          className="w-2 h-2 rounded-full transition-all"
                          style={{
                            backgroundColor: idx === selectedDayIndex ? '#0d0c0a' : 'rgba(13, 12, 10, 0.3)',
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Classes List */}
                  <div className="p-5 space-y-3">
                    {(() => {
                      const dayClasses = timetableByDay[days[selectedDayIndex]] || [];

                      if (dayClasses.length === 0) {
                        return (
                          <div className="py-12 text-center">
                            <p className="text-lg" style={{ color: '#7a7568' }}>No classes</p>
                            <p className="text-sm mt-2 opacity-60" style={{ color: '#7a7568' }}>Enjoy your day!</p>
                          </div>
                        );
                      }

                      // Expand entries: if multiple subjects have same period, assign sequential hours
                      const expandedClasses: Array<{ period: number; subject: string }> = [];
                      const groupedByPeriod = dayClasses.reduce((acc, entry) => {
                        if (!acc[entry.period]) {
                          acc[entry.period] = [];
                        }
                        acc[entry.period].push(entry);
                        return acc;
                      }, {} as Record<number, typeof dayClasses>);

                      // Sort periods and expand
                      Object.entries(groupedByPeriod)
                        .sort(([a], [b]) => parseInt(a) - parseInt(b))
                        .forEach(([period, entries]) => {
                          entries.forEach((entry, idx) => {
                            expandedClasses.push({
                              period: parseInt(period) + idx,
                              subject: entry.subject,
                            });
                          });
                        });

                      // Helper function to find attendance for a subject
                      const getAttendanceForSubject = (subjectName: string) => {
                        for (const records of cachedData.values()) {
                          const found = records.find(record =>
                            record.subject.toLowerCase().includes(subjectName.toLowerCase()) ||
                            subjectName.toLowerCase().includes(record.subject.toLowerCase())
                          );
                          if (found) return found;
                        }
                        return null;
                      };

                      return expandedClasses.map((entry, idx) => {
                        const attendance = getAttendanceForSubject(entry.subject);

                        return (
                          <div
                            key={idx}
                            className="rounded-2xl p-4 flex items-center gap-4"
                            style={{ backgroundColor: '#0d0c0a' }}
                          >
                            {/* Hour Number */}
                            <div className="flex-shrink-0">
                              <div className="w-14 h-14 rounded-xl flex flex-col items-center justify-center font-bold" style={{ backgroundColor: '#b6af95', color: '#0d0c0a' }}>
                                <span className="text-xs opacity-70">Hour</span>
                                <span className="text-xl">{entry.period}</span>
                              </div>
                            </div>

                            {/* Subject Info */}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-base leading-tight" style={{ color: '#fdffff' }}>
                                {entry.subject}
                              </p>
                              {attendance && (
                                <p className="text-xs mt-1 opacity-60" style={{ color: '#fdffff' }}>
                                  {attendance.attendedClasses}/{attendance.totalClasses} classes
                                </p>
                              )}
                            </div>

                            {/* Attendance Percentage Badge */}
                            {attendance && (
                              <div className="flex-shrink-0">
                                <div
                                  className="px-3 py-1.5 rounded-full font-bold text-sm"
                                  style={{
                                    backgroundColor: attendance.percentage >= 75 ? '#1a2417' : attendance.percentage >= 70 ? '#2a2217' : '#2a1715',
                                    color: attendance.percentage >= 75 ? '#b6d5a8' : attendance.percentage >= 70 ? '#d5c8a8' : '#d5b6a8',
                                  }}
                                >
                                  {attendance.percentage.toFixed(0)}%
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Bunk Calculator Tab */}
        {activeTab === 'bunk' && (
          <div className="space-y-4">
            {bunkData.length === 0 ? (
              <div className="rounded-3xl p-12 text-center" style={{ backgroundColor: '#1a1917' }}>
                <p className="text-lg" style={{ color: '#7a7568' }}>No attendance data yet</p>
                <p className="text-sm mt-2 opacity-60" style={{ color: '#7a7568' }}>Tap "Sync" to fetch your attendance</p>
              </div>
            ) : (
              <div className="space-y-4">
                {bunkData.map((calc, idx) => {
                  const getBackgroundColor = () => {
                    if (calc.currentPercentage >= 75) return '#1a2417';
                    if (calc.currentPercentage >= 70) return '#2a2217';
                    return '#2a1715';
                  };

                  const getTextColor = () => {
                    if (calc.currentPercentage >= 75) return '#b6d5a8';
                    if (calc.currentPercentage >= 70) return '#d5c8a8';
                    return '#d5b6a8';
                  };

                  return (
                    <div key={idx} className="rounded-3xl p-6 overflow-hidden" style={{ backgroundColor: '#1a1917' }}>
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-bold text-base leading-tight flex-1 pr-3" style={{ color: '#fdffff' }}>{calc.subject}</h3>
                        <div
                          className="px-4 py-2 rounded-full font-bold text-lg"
                          style={{
                            backgroundColor: calc.currentPercentage >= 75 ? '#b6af9533' : '#b6959533',
                            color: calc.currentPercentage >= 75 ? '#b6af95' : '#b69595',
                          }}
                        >
                          {calc.currentPercentage.toFixed(0)}%
                        </div>
                      </div>

                      <div className="flex items-center justify-between py-3 px-4 rounded-2xl mb-4" style={{ backgroundColor: '#0d0c0a' }}>
                        <span className="text-sm opacity-60" style={{ color: '#fdffff' }}>Classes attended</span>
                        <span className="font-bold text-lg" style={{ color: '#b6af95' }}>
                          {calc.attendedClasses} / {calc.totalClasses}
                        </span>
                      </div>

                      {calc.currentPercentage >= calc.targetPercentage ? (
                        <div className="rounded-2xl p-5" style={{ backgroundColor: getBackgroundColor() }}>
                          <p className="font-bold text-lg" style={{ color: getTextColor() }}>
                            Safe to skip {calc.canBunk} {calc.canBunk === 1 ? 'class' : 'classes'}
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-2xl p-5" style={{ backgroundColor: getBackgroundColor() }}>
                          <p className="font-bold text-lg" style={{ color: getTextColor() }}>
                            Attend {calc.needToAttend} more {calc.needToAttend === 1 ? 'class' : 'classes'}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
