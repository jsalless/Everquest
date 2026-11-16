import { usePreferences } from '../contexts/PreferencesContext';
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Pressable,
  Modal,
  ScrollView,
  Animated,
  Easing,
  PanResponder,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Svg, { Rect, Path, Line, Circle } from 'react-native-svg';
import Navbar from '../components/Navbar';
import { toast } from '../utils/toast';
import { syncDailyActivityProgress } from '../services/dailyQuestService';
import useFocusClock from '../hooks/useFocusClock';

const goblinFocoImage = require('../../assets/GoblinFoco.png');

// Passos da régua: índice 0 = Cronômetro (0 min), índices 1..24 = 5 min até 120 min (de 5 em 5 min)
const MAX_STEP_INDEX = 24;
const TICK_SPACING = 22;
const STATS_STORAGE_KEY = 'everquest_focus_daily_stats_v1';
const WEEKDAY_LOWER = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'];
const MONTH_ABBR_LOWER = [
  'jan.',
  'fev.',
  'mar.',
  'abr.',
  'mai.',
  'jun.',
  'jul.',
  'ago.',
  'set.',
  'out.',
  'nov.',
  'dez.',
];
const MONTH_LOWER_FULL = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

const STATS_PERIOD_OPTIONS = [
  { id: 'daily', label: 'Dia' },
  { id: 'weekly', label: 'Semana' },
  { id: 'monthly', label: 'Mês' },
  { id: 'annual', label: 'Ano' },
];

let memoryDailyStats = {};

function getDateKey(dateObj = new Date()) {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function buildPeriodViewData(period, dailyStats, periodOffset = 0) {
  const now = new Date();
  const todayKey = getDateKey(now);

  // 1. RELATÓRIO DIÁRIO (24 barras: 00:00 até 23:00)
  if (period === 'daily') {
    const targetDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + periodOffset
    );
    const dateKey = getDateKey(targetDate);
    const isToday = dateKey === todayKey;
    const dayNum = targetDate.getDate();
    const monthName = MONTH_LOWER_FULL[targetDate.getMonth()];
    const yearNum = targetDate.getFullYear();

    const dateNavigatorLabel = `${dayNum} de ${monthName} de ${yearNum}${
      isToday ? ' (Hoje)' : ''
    }`;

    const dayEntry = dailyStats[dateKey] || {
      totalSeconds: 0,
      sessionsCount: 0,
      sessions: [],
    };

    const hourlySeconds = Array(24).fill(0);
    const hourlySessions = Array.from({ length: 24 }, () => []);
    let accountedSeconds = 0;

    if (Array.isArray(dayEntry.sessions)) {
      dayEntry.sessions.forEach((s) => {
        const dur = s.durationSeconds || 0;
        accountedSeconds += dur;
        let parsedHour = 12;
        if (typeof s.time === 'string' && s.time.includes(':')) {
          const h = parseInt(s.time.split(':')[0], 10);
          if (!Number.isNaN(h) && h >= 0 && h < 24) {
            parsedHour = h;
          }
        }
        hourlySeconds[parsedHour] += dur;
        hourlySessions[parsedHour].push({
          ...s,
          dateLabel: isToday
            ? 'Hoje'
            : `${String(dayNum).padStart(2, '0')}/${String(
                targetDate.getMonth() + 1
              ).padStart(2, '0')}`,
        });
      });
    }

    if ((dayEntry.totalSeconds || 0) > accountedSeconds) {
      const fallbackHour = isToday ? now.getHours() : 12;
      hourlySeconds[fallbackHour] += dayEntry.totalSeconds - accountedSeconds;
    }

    const buckets = hourlySeconds.map((secs, hr) => {
      const hhStr = String(hr).padStart(2, '0');
      return {
        key: `${dateKey}-hr-${hhStr}`,
        label: `${hhStr}:00`,
        shortTitle: `${hhStr}:00`,
        totalSeconds: secs,
        minutes: Math.round(secs / 60),
        sessionsCount: hourlySessions[hr].length,
        sessions: hourlySessions[hr],
      };
    });

    const periodTotalSeconds = dayEntry.totalSeconds || 0;
    const periodTotalMinutes = Math.round(periodTotalSeconds / 60);
    const maxBarMins = Math.max(0, ...buckets.map((b) => b.minutes));
    const yStep = Math.max(15, Math.ceil(Math.max(maxBarMins, 1) / 5 / 15) * 15);
    const yMax = yStep * 5;

    const firstWithFocus = buckets.find((b) => b.totalSeconds > 0);
    const currentHourKey = `${dateKey}-hr-${String(now.getHours()).padStart(
      2,
      '0'
    )}`;

    return {
      dateNavigatorLabel,
      periodTotalSeconds,
      periodTotalMinutes,
      yMax,
      yTicks: [yStep * 5, yStep * 4, yStep * 3, yStep * 2, yStep, 0],
      xAxisType: 'sparse',
      xAxisLabels: ['00:00', '06:00', '12:00', '18:00', '23:00'],
      buckets,
      allPeriodSessions: (dayEntry.sessions || []).map((s) => ({
        ...s,
        dateLabel: isToday
          ? 'Hoje'
          : `${String(dayNum).padStart(2, '0')}/${String(
              targetDate.getMonth() + 1
            ).padStart(2, '0')}`,
      })),
      periodSessionsCount: dayEntry.sessionsCount || 0,
      periodShortTitle: isToday
        ? 'Hoje'
        : `${String(dayNum).padStart(2, '0')}/${String(
            targetDate.getMonth() + 1
          ).padStart(2, '0')}`,
      defaultKey: firstWithFocus ? firstWithFocus.key : currentHourKey,
    };
  }

  // 2. RELATÓRIO SEMANAL (7 barras: dom. até sáb.)
  if (period === 'weekly') {
    const refDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + periodOffset * 7
    );
    const dayOfWeek = refDate.getDay(); // 0 = dom .. 6 = sáb
    const startOfWeek = new Date(
      refDate.getFullYear(),
      refDate.getMonth(),
      refDate.getDate() - dayOfWeek
    );
    const endOfWeek = new Date(
      startOfWeek.getFullYear(),
      startOfWeek.getMonth(),
      startOfWeek.getDate() + 6
    );

    const startDay = startOfWeek.getDate();
    const endDay = endOfWeek.getDate();
    const endMonthAbbr = MONTH_ABBR_LOWER[endOfWeek.getMonth()];
    const endYear = endOfWeek.getFullYear();

    const dateNavigatorLabel =
      startOfWeek.getMonth() === endOfWeek.getMonth()
        ? `${startDay} – ${endDay} de ${endMonthAbbr} de ${endYear}`
        : `${startDay} de ${MONTH_ABBR_LOWER[startOfWeek.getMonth()]} – ${endDay} de ${endMonthAbbr} de ${endYear}`;

    const buckets = [];
    const allPeriodSessions = [];
    let periodSessionsCount = 0;

    for (let i = 0; i < 7; i++) {
      const d = new Date(
        startOfWeek.getFullYear(),
        startOfWeek.getMonth(),
        startOfWeek.getDate() + i
      );
      const key = getDateKey(d);
      const ddStr = String(d.getDate()).padStart(2, '0');
      const mmStr = String(d.getMonth() + 1).padStart(2, '0');
      const dateShort = `${ddStr}/${mmStr}`;
      const isToday = key === todayKey;
      const entry = dailyStats[key] || {
        totalSeconds: 0,
        sessionsCount: 0,
        sessions: [],
      };
      const secs = entry.totalSeconds || 0;
      const daySessions = (entry.sessions || []).map((s) => ({
        ...s,
        id: `${key}_${s.id}`,
        dateLabel: isToday ? 'Hoje' : dateShort,
      }));

      periodSessionsCount += entry.sessionsCount || 0;
      allPeriodSessions.push(...daySessions);

      buckets.push({
        key,
        label: WEEKDAY_LOWER[i],
        shortTitle: `${WEEKDAY_LOWER[i]} (${dateShort})`,
        isCurrent: isToday,
        totalSeconds: secs,
        minutes: Math.round(secs / 60),
        sessionsCount: entry.sessionsCount || 0,
        sessions: daySessions,
      });
    }

    const periodTotalSeconds = buckets.reduce((acc, b) => acc + b.totalSeconds, 0);
    const periodTotalMinutes = Math.round(periodTotalSeconds / 60);
    const maxBarMins = Math.max(0, ...buckets.map((b) => b.minutes));
    const yStep = Math.max(60, Math.ceil(Math.max(maxBarMins, 1) / 5 / 60) * 60);
    const yMax = yStep * 5;

    const todayBucket = buckets.find((b) => b.isCurrent);
    const firstWithFocus = buckets.find((b) => b.totalSeconds > 0);
    const defaultBucket =
      todayBucket || firstWithFocus || buckets[buckets.length - 1];

    return {
      dateNavigatorLabel,
      periodTotalSeconds,
      periodTotalMinutes,
      yMax,
      yTicks: [yStep * 5, yStep * 4, yStep * 3, yStep * 2, yStep, 0],
      xAxisType: 'per-bar',
      xAxisLabels: [],
      buckets,
      allPeriodSessions,
      periodSessionsCount,
      periodShortTitle: 'Semana',
      defaultKey: defaultBucket.key,
    };
  }

  // 3. RELATÓRIO MENSAL (Barras para todos os dias do mês: 01..30/31)
  if (period === 'monthly') {
    const targetMonthDate = new Date(
      now.getFullYear(),
      now.getMonth() + periodOffset,
      1
    );
    const yearNum = targetMonthDate.getFullYear();
    const monthIdx = targetMonthDate.getMonth();
    const mmStr = String(monthIdx + 1).padStart(2, '0');
    const daysInMonth = new Date(yearNum, monthIdx + 1, 0).getDate();

    const dateNavigatorLabel = `${MONTH_ABBR_LOWER[monthIdx]} de ${yearNum}`;

    const buckets = [];
    const allPeriodSessions = [];
    let periodSessionsCount = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const ddStr = String(d).padStart(2, '0');
      const dateKey = `${yearNum}-${mmStr}-${ddStr}`;
      const isToday = dateKey === todayKey;
      const entry = dailyStats[dateKey] || {
        totalSeconds: 0,
        sessionsCount: 0,
        sessions: [],
      };
      const secs = entry.totalSeconds || 0;
      const daySessions = (entry.sessions || []).map((s) => ({
        ...s,
        id: `${dateKey}_${s.id}`,
        dateLabel: isToday ? 'Hoje' : `${ddStr}/${mmStr}`,
      }));

      periodSessionsCount += entry.sessionsCount || 0;
      allPeriodSessions.push(...daySessions);

      buckets.push({
        key: dateKey,
        label: `${ddStr}/${mmStr}`,
        shortTitle: `${ddStr}/${mmStr}`,
        isCurrent: isToday,
        totalSeconds: secs,
        minutes: Math.round(secs / 60),
        sessionsCount: entry.sessionsCount || 0,
        sessions: daySessions,
      });
    }

    const periodTotalSeconds = buckets.reduce((acc, b) => acc + b.totalSeconds, 0);
    const periodTotalMinutes = Math.round(periodTotalSeconds / 60);
    const maxBarMins = Math.max(0, ...buckets.map((b) => b.minutes));
    const yStep = Math.max(60, Math.ceil(Math.max(maxBarMins, 1) / 5 / 60) * 60);
    const yMax = yStep * 5;

    const lastDayStr = String(daysInMonth).padStart(2, '0');
    const todayBucket = buckets.find((b) => b.isCurrent);
    const firstWithFocus = buckets.find((b) => b.totalSeconds > 0);
    const defaultBucket =
      todayBucket || firstWithFocus || buckets[buckets.length - 1];

    return {
      dateNavigatorLabel,
      periodTotalSeconds,
      periodTotalMinutes,
      yMax,
      yTicks: [yStep * 5, yStep * 4, yStep * 3, yStep * 2, yStep, 0],
      xAxisType: 'sparse',
      xAxisLabels: [
        `01/${mmStr}`,
        `08/${mmStr}`,
        `16/${mmStr}`,
        `23/${mmStr}`,
        `${lastDayStr}/${mmStr}`,
      ],
      buckets,
      allPeriodSessions: allPeriodSessions.reverse(),
      periodSessionsCount,
      periodShortTitle: `${MONTH_ABBR_LOWER[monthIdx]} ${yearNum}`,
      defaultKey: defaultBucket.key,
    };
  }

  // 4. RELATÓRIO ANUAL (12 barras: meses 1 a 12)
  const targetYear = now.getFullYear() + periodOffset;
  const dateNavigatorLabel = `${targetYear}`;
  const allPeriodSessions = [];
  let periodSessionsCount = 0;

  const buckets = Array.from({ length: 12 }, (_, mIdx) => {
    const mmStr = String(mIdx + 1).padStart(2, '0');
    const prefix = `${targetYear}-${mmStr}-`;
    let totalSeconds = 0;
    let sessionsCount = 0;
    const sessions = [];

    Object.keys(dailyStats)
      .filter((k) => k.startsWith(prefix))
      .sort()
      .reverse()
      .forEach((dateKey) => {
        const entry = dailyStats[dateKey];
        if (!entry) return;
        totalSeconds += entry.totalSeconds || 0;
        sessionsCount += entry.sessionsCount || 0;
        const ddStr = dateKey.slice(8, 10);
        if (Array.isArray(entry.sessions)) {
          entry.sessions.forEach((s) => {
            sessions.push({
              ...s,
              id: `${dateKey}_${s.id}`,
              dateLabel: `${ddStr}/${mmStr}`,
            });
          });
        }
      });

    periodSessionsCount += sessionsCount;
    allPeriodSessions.push(...sessions);

    return {
      key: `${targetYear}-month-${mmStr}`,
      label: `${mIdx + 1}`,
      shortTitle: `${MONTH_LOWER_FULL[mIdx]} de ${targetYear}`,
      isCurrent: targetYear === now.getFullYear() && mIdx === now.getMonth(),
      totalSeconds,
      minutes: Math.round(totalSeconds / 60),
      sessionsCount,
      sessions,
    };
  });

  const periodTotalSeconds = buckets.reduce((acc, b) => acc + b.totalSeconds, 0);
  const periodTotalMinutes = Math.round(periodTotalSeconds / 60);
  const maxBarMins = Math.max(0, ...buckets.map((b) => b.minutes));
  const yStep = Math.max(150, Math.ceil(Math.max(maxBarMins, 1) / 5 / 150) * 150);
  const yMax = yStep * 5;

  const currentMonthBucket = buckets.find((b) => b.isCurrent);
  const firstWithFocus = buckets.find((b) => b.totalSeconds > 0);
  const defaultBucket =
    currentMonthBucket || firstWithFocus || buckets[buckets.length - 1];

  return {
    dateNavigatorLabel,
    periodTotalSeconds,
    periodTotalMinutes,
    yMax,
    yTicks: [yStep * 5, yStep * 4, yStep * 3, yStep * 2, yStep, 0],
    xAxisType: 'per-bar',
    xAxisLabels: [],
    buckets,
    allPeriodSessions,
    periodSessionsCount,
    periodShortTitle: `${targetYear}`,
    defaultKey: defaultBucket.key,
  };
}

function loadDailyStats() {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STATS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        memoryDailyStats = parsed;
        return parsed;
      }
    }
  } catch (_) { }
  return memoryDailyStats;
}

function saveDailyStats(nextStats) {
  memoryDailyStats = nextStats;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(nextStats));
    }
  } catch (_) { }
}

function formatDurationHuman(totalSeconds) {
  if (!totalSeconds || totalSeconds <= 0) return '0m 00s';
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${String(mins).padStart(2, '0')}m`;
  }
  return `${mins}m ${String(secs).padStart(2, '0')}s`;
}

function StopwatchIcon({ size = 42, color = '#000C56', strokeWidth = 2.2 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line
        x1="9"
        y1="2.5"
        x2="15"
        y2="2.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Circle
        cx="12"
        cy="13.5"
        r="8"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Line
        x1="12"
        y1="9.5"
        x2="12"
        y2="13.8"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function HourglassBadgeIcon({ size = 22, color = '#000C56' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6.5 3.5H17.5M6.5 20.5H17.5M8 3.5V6.2C8 8.3 9.5 10.2 12 12C14.5 10.2 16 8.3 16 6.2V3.5M8 20.5V17.8C8 15.7 9.5 13.8 12 12C14.5 13.8 16 15.7 16 17.8V20.5"
        stroke={color}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function StatsBarChartIcon({ size = 22, color = '#000C56' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="12" width="3.8" height="8" rx="1.4" fill={color} />
      <Rect x="10.1" y="6" width="3.8" height="14" rx="1.4" fill="#7153FD" />
      <Rect x="16.2" y="9" width="3.8" height="11" rx="1.4" fill={color} />
    </Svg>
  );
}

export default function FocusScreen({
  user,
  activeTab = 'focus',
  onChangeTab,
  onFocusStateChange,
}) {
  const { colors, preferences } = usePreferences();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [isFocusing, setIsFocusing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // stepIndex: 0 = Cronômetro (progressivo), 1..24 = Temporizador (stepIndex * 5 minutos, regressivo)
  const [stepIndex, setStepIndex] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [focoTotal, setFocoTotal] = useState(false);

  // Estado das estatísticas de foco (Dia, Semana, Mês e Ano)
  const [dailyStats, setDailyStats] = useState(() => loadDailyStats());
  const [isStatsModalVisible, setIsStatsModalVisible] = useState(false);
  const [statsPeriod, setStatsPeriod] = useState('daily');
  const [periodOffset, setPeriodOffset] = useState(0);
  const [selectedBucketKey, setSelectedBucketKey] = useState(null);

  const expandAnim = useRef(new Animated.Value(0)).current;
  const goblinFloatAnim = useRef(new Animated.Value(0)).current;
  const modalSlideAnim = useRef(new Animated.Value(0)).current;
  const statsSlideAnim = useRef(new Animated.Value(0)).current;

  const stepIndexRef = useRef(stepIndex);
  stepIndexRef.current = stepIndex;
  const dragStartStepRef = useRef(0);

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const containerWidth = Math.min(windowWidth, 430);
  const circleSize = Math.min(Math.round(containerWidth * 0.79), 300);

  const selectedMinutes = stepIndex * 5;
  const isTimerMode = stepIndex > 0;

  // Registra uma sessão concluída nas estatísticas do dia atual
  const recordFocusSession = (focusedSeconds, modeLabel) => {
    if (!focusedSeconds || focusedSeconds <= 0) return;

    const now = new Date();
    const todayKey = getDateKey(now);
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');

    const currentStats = loadDailyStats();
    const dayEntry = currentStats[todayKey] || {
      totalSeconds: 0,
      sessionsCount: 0,
      sessions: [],
    };

    const newSession = {
      id: `${Date.now()}`,
      time: `${hh}:${mm}`,
      durationSeconds: focusedSeconds,
      mode: modeLabel,
      focoTotal,
    };

    const updatedStats = {
      ...currentStats,
      [todayKey]: {
        totalSeconds: dayEntry.totalSeconds + focusedSeconds,
        sessionsCount: dayEntry.sessionsCount + 1,
        sessions: [newSession, ...(dayEntry.sessions || [])].slice(0, 30),
      },
    };

    saveDailyStats(updatedStats);
    setDailyStats(updatedStats);
    setSelectedBucketKey(null);

    syncDailyActivityProgress(user, {
      eventType: 'focus_session_completed',
      focusSessionsDelta: 1,
      focusSecondsDelta: focusedSeconds,
    }).then((res) => {
      if (res?.newlyCompleted?.length > 0) {
        toast.info(
          `Daily Quest concluída: "${res.newlyCompleted[0].title}"! Resgate sua recompensa no Perfil.`
        );
      }
    });
  };

  useEffect(() => {
    if (!isFocusing) {
      setSeconds(selectedMinutes * 60);
    }
  }, [selectedMinutes, isFocusing]);

  const rulerPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 2,
      onPanResponderGrant: () => {
        dragStartStepRef.current = stepIndexRef.current;
      },
      onPanResponderMove: (_, gestureState) => {
        const deltaSteps = Math.round(-gestureState.dx / TICK_SPACING);
        const altDeltaSteps = Math.round(gestureState.dx / TICK_SPACING);
        const delta =
          dragStartStepRef.current === 0 && gestureState.dx > 0
            ? altDeltaSteps
            : deltaSteps;
        const nextStep = Math.max(
          0,
          Math.min(MAX_STEP_INDEX, dragStartStepRef.current + delta)
        );
        if (nextStep !== stepIndexRef.current) {
          setStepIndex(nextStep);
        }
      },
    })
  ).current;

  const openModal = () => {
    if (isFocusing) return;
    setIsModalVisible(true);
    modalSlideAnim.setValue(0);
    Animated.spring(modalSlideAnim, {
      toValue: 1,
      stiffness: 210,
      damping: 22,
      mass: 0.9,
      useNativeDriver: false,
    }).start();
  };

  const closeModal = (callback) => {
    Animated.timing(modalSlideAnim, {
      toValue: 0,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      setIsModalVisible(false);
      if (typeof callback === 'function') callback();
    });
  };

  const openStatsModal = () => {
    if (isFocusing) return;
    const freshStats = loadDailyStats();
    setDailyStats(freshStats);
    setPeriodOffset(0);
    setSelectedBucketKey(null);
    setIsStatsModalVisible(true);
    statsSlideAnim.setValue(0);
    Animated.spring(statsSlideAnim, {
      toValue: 1,
      stiffness: 210,
      damping: 22,
      mass: 0.9,
      useNativeDriver: false,
    }).start();
  };

  const handleSelectStatsPeriod = (nextPeriod) => {
    setStatsPeriod(nextPeriod);
    setPeriodOffset(0);
    setSelectedBucketKey(null);
  };

  const handleNavigatePeriod = (delta) => {
    setPeriodOffset((prev) => Math.min(0, prev + delta));
    setSelectedBucketKey(null);
  };

  const closeStatsModal = () => {
    Animated.timing(statsSlideAnim, {
      toValue: 0,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      setIsStatsModalVisible(false);
    });
  };

  useEffect(() => {
    let floatLoop;
    if (isFocusing && !isPaused) {
      floatLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(goblinFloatAnim, {
            toValue: -7,
            duration: 1600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
          Animated.timing(goblinFloatAnim, {
            toValue: 0,
            duration: 1600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
        ])
      );
      floatLoop.start();
    } else {
      goblinFloatAnim.stopAnimation();
      Animated.timing(goblinFloatAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }
    return () => {
      if (floatLoop) floatLoop.stop();
    };
  }, [isFocusing, isPaused, goblinFloatAnim]);

  const finishTimerAutomatically = () => {
    const completedSecs = selectedMinutes * 60;
    recordFocusSession(completedSecs, 'Temporizador');

    setIsFocusing(false);
    setIsPaused(false);
    if (onFocusStateChange) onFocusStateChange(false);
    toast.success(
      `Temporizador de ${selectedMinutes} min concluído com sucesso! Parabéns, viajante!`
    );

    Animated.timing(expandAnim, {
      toValue: 0,
      duration: 550,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      setSeconds(selectedMinutes * 60);
    });
  };

  useFocusClock({
    running: isFocusing,
    paused: isPaused,
    isTimer: isTimerMode,
    seconds,
    setSeconds,
    onFinish: finishTimerAutomatically,
    preferences,
  });

  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const mm = String(mins).padStart(2, '0');
    const ss = String(secs).padStart(2, '0');
    return `${mm} : ${ss}`;
  };

  const handleStartFocus = () => {
    const initialSecs = isTimerMode ? selectedMinutes * 60 : 0;
    setSeconds(initialSecs);
    setIsPaused(false);
    setIsFocusing(true);
    if (onFocusStateChange) onFocusStateChange(true);

    const modeDesc = isTimerMode
      ? `Temporizador (${selectedMinutes} min)`
      : 'Cronômetro';
    toast.info(
      focoTotal
        ? `${modeDesc} iniciado com Foco Total ativado!`
        : `${modeDesc} iniciado! Concentre-se na sua missão.`
    );

    Animated.timing(expandAnim, {
      toValue: 1,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

  const handleStartFromModal = () => {
    closeModal(() => {
      handleStartFocus();
    });
  };

  const handleStopFocus = () => {
    const elapsedSeconds = isTimerMode
      ? Math.max(0, selectedMinutes * 60 - seconds)
      : seconds;
    const focusedTime = formatTimer(elapsedSeconds).replace(/\s/g, '');

    if (elapsedSeconds > 0) {
      recordFocusSession(
        elapsedSeconds,
        isTimerMode ? 'Temporizador' : 'Cronômetro'
      );
    }

    setIsFocusing(false);
    setIsPaused(false);
    if (onFocusStateChange) onFocusStateChange(false);
    toast.success(`Modo de foco finalizado! Tempo focado: ${focusedTime}`);

    Animated.timing(expandAnim, {
      toValue: 0,
      duration: 550,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      setSeconds(isTimerMode ? selectedMinutes * 60 : 0);
    });
  };

  const handleTogglePause = () => {
    setIsPaused((prev) => {
      const next = !prev;
      if (next) {
        toast.info('Foco pausado.');
      } else {
        toast.info('Foco retomado!');
      }
      return next;
    });
  };

  const handleTabPress = (tabId) => {
    if (isFocusing) return;
    if (onChangeTab) {
      onChangeTab(tabId);
    }
  };

  const maxDimension = Math.max(windowWidth, windowHeight, 900);
  const targetScale = Math.ceil((maxDimension * 2.3) / circleSize);

  const purpleScale = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, targetScale],
  });

  const contentTranslateY = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 56],
  });

  const timerColor = expandAnim.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [colors.isDark ? colors.text : '#000000', '#FFFFFF', '#FFFFFF'],
  });

  const timerScale = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.22],
  });

  const uiFadeOpacity = expandAnim.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [1, 0, 0],
  });

  const navbarTranslateY = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 80],
  });

  const sheetTranslateY = modalSlideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [520, 0],
  });

  const backdropOpacity = modalSlideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const statsSheetTranslateY = statsSlideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [560, 0],
  });

  const statsBackdropOpacity = statsSlideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const rulerWidth = Math.min(containerWidth - 48, 340);
  const rulerCenterX = rulerWidth / 2;

  // Dados do período selecionado (Dia, Semana, Mês ou Ano) para o modal de estatísticas
  const periodView = buildPeriodViewData(statsPeriod, dailyStats, periodOffset);
  const activeBucket = selectedBucketKey
    ? periodView.buckets.find((b) => b.key === selectedBucketKey) || null
    : null;
  const displayedSessions = activeBucket
    ? activeBucket.sessions
    : periodView.allPeriodSessions;
  const displayedTitle = activeBucket
    ? activeBucket.shortTitle
    : periodView.periodShortTitle;

  return (
    <View style={styles.root}>
      <View style={[styles.mobileFrame, { width: containerWidth }]}>
        {/* Barra Superior com Ícone de Estatísticas Diárias de Foco */}
        <Animated.View
          pointerEvents={isFocusing ? 'none' : 'auto'}
          style={[styles.topHeaderBar, { opacity: uiFadeOpacity }]}
        >
          <TouchableOpacity
            style={styles.statsHeaderButton}
            activeOpacity={0.82}
            onPress={openStatsModal}
            accessibilityRole="button"
            accessibilityLabel="Ver estatísticas de foco por dia"
          >
            <StatsBarChartIcon size={20} color={colors.text} />
          </TouchableOpacity>
        </Animated.View>

        {/* Conteúdo Central: Goblin Foco + Timer + Controles */}
        <Animated.View
          style={[
            styles.centerContent,
            { transform: [{ translateY: contentTranslateY }] },
          ]}
        >
          <View
            style={[
              styles.goblinWrapper,
              { width: circleSize, height: circleSize },
            ]}
          >
            {/* Círculo Roxo (#7153FD) que se expande por toda a tela ao iniciar o foco */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.expandingPurpleCircle,
                {
                  width: circleSize,
                  height: circleSize,
                  borderRadius: circleSize / 2,
                  transform: [{ scale: purpleScale }],
                },
              ]}
            />

            {/* Imagem do Goblin Foco */}
            <Animated.View
              style={[
                styles.goblinCircleMask,
                {
                  width: isFocusing ? circleSize * 1.09 : circleSize,
                  height: circleSize,
                  borderRadius: isFocusing ? 0 : circleSize / 2,
                  overflow: isFocusing ? 'visible' : 'hidden',
                  transform: [{ translateY: goblinFloatAnim }],
                },
              ]}
            >
              <Image
                source={goblinFocoImage}
                style={{
                  width: circleSize * 1.09,
                  height: circleSize,
                }}
                resizeMode="cover"
              />
            </Animated.View>
          </View>

          {/* Timer MM : SS (clicável fora do modo foco para abrir o modal de Cronômetro/Temporizador) */}
          <TouchableOpacity
            activeOpacity={isFocusing ? 1 : 0.7}
            disabled={isFocusing}
            onPress={openModal}
            style={styles.timerButton}
            accessibilityRole="button"
            accessibilityLabel="Configurar cronômetro ou temporizador de foco"
          >
            <Animated.Text
              style={[
                styles.timerText,
                {
                  color: timerColor,
                  transform: [{ scale: timerScale }],
                },
              ]}
            >
              {formatTimer(seconds)}
            </Animated.Text>
          </TouchableOpacity>

          {/* Área de Ação: Botão "Iniciar foco" ou Botões Circulares (Parar / Pausar) */}
          <View style={styles.actionArea}>
            {!isFocusing ? (
              <TouchableOpacity
                style={styles.startFocusButton}
                activeOpacity={0.85}
                onPress={handleStartFocus}
                accessibilityRole="button"
                accessibilityLabel="Iniciar foco"
              >
                <Text style={styles.startFocusButtonText}>Iniciar foco</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.focusControlsRow}>
                {/* Botão Parar / Sair do Foco (#000C56 com quadrado branco) */}
                <TouchableOpacity
                  style={styles.stopCircleButton}
                  activeOpacity={0.85}
                  onPress={handleStopFocus}
                  accessibilityRole="button"
                  accessibilityLabel="Parar e sair do foco"
                >
                  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
                    <Rect
                      x="2.5"
                      y="2.5"
                      width="13"
                      height="13"
                      rx="1.8"
                      stroke="#FFFFFF"
                      strokeWidth="1.8"
                    />
                  </Svg>
                </TouchableOpacity>

                {/* Botão Pausar / Retomar Foco (#FBA0FE com barras escuras) */}
                <TouchableOpacity
                  style={styles.pauseCircleButton}
                  activeOpacity={0.85}
                  onPress={handleTogglePause}
                  accessibilityRole="button"
                  accessibilityLabel={isPaused ? 'Retomar foco' : 'Pausar foco'}
                >
                  {!isPaused ? (
                    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
                      <Line
                        x1="6"
                        y1="3"
                        x2="6"
                        y2="15"
                        stroke="#000C56"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                      <Line
                        x1="12"
                        y1="3"
                        x2="12"
                        y2="15"
                        stroke="#000C56"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </Svg>
                  ) : (
                    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
                      <Path
                        d="M5.5 3.5L14 9L5.5 14.5V3.5Z"
                        stroke="#000C56"
                        strokeWidth="1.8"
                        strokeLinejoin="round"
                      />
                    </Svg>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Navbar Inferior */}
        <Animated.View
          pointerEvents={isFocusing ? 'none' : 'auto'}
          style={[
            styles.navbarHolder,
            {
              opacity: uiFadeOpacity,
              transform: [{ translateY: navbarTranslateY }],
            },
          ]}
        >
          <Navbar
            activeTab={activeTab}
            onChangeTab={handleTabPress}
            disabled={isFocusing}
          />
        </Animated.View>
      </View>

      {/* Modal 1: Seleção de Cronômetro (0) / Temporizador (> 0) */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="none"
        onRequestClose={() => closeModal()}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[styles.modalBackdrop, { opacity: backdropOpacity }]}
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => closeModal()}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.modalSheet,
              {
                width: containerWidth,
                transform: [{ translateY: sheetTranslateY }],
              },
            ]}
          >
            <View style={styles.modalGlowCircle} pointerEvents="none" />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isTimerMode ? 'Temporizador' : 'Cronômetro'}
              </Text>

              {isTimerMode && (
                <TouchableOpacity
                  style={styles.hourglassResetBtn}
                  activeOpacity={0.8}
                  onPress={() => setStepIndex(0)}
                  accessibilityRole="button"
                  accessibilityLabel="Voltar para Cronômetro"
                >
                  <HourglassBadgeIcon size={20} color={colors.text} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.subtitleContainer}>
              {isTimerMode ? (
                <Text style={styles.modalSubtitle}>
                  Defina uma duração e faça a contagem{'\n'}regressiva até o fim
                </Text>
              ) : null}
            </View>

            <View style={styles.centerDisplayArea}>
              {!isTimerMode ? (
                <StopwatchIcon size={44} color={colors.text} strokeWidth={2.3} />
              ) : (
                <Text style={styles.minutesValueText}>
                  {selectedMinutes} min
                </Text>
              )}
            </View>

            <View
              style={[styles.rulerContainer, { width: rulerWidth }]}
              {...rulerPanResponder.panHandlers}
            >
              {isTimerMode && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setStepIndex(0)}
                  style={[
                    styles.smallStopwatchTick,
                    {
                      left: rulerCenterX - (stepIndex + 1) * TICK_SPACING - 9,
                    },
                  ]}
                >
                  <StopwatchIcon size={17} color="#6E59FF" strokeWidth={2} />
                </TouchableOpacity>
              )}

              {Array.from({ length: MAX_STEP_INDEX + 1 }).map((_, idx) => {
                const offsetX = (idx - stepIndex) * TICK_SPACING;
                const tickX = rulerCenterX + offsetX;

                if (tickX < 12 || tickX > rulerWidth - 12) {
                  return null;
                }

                const isCenter = idx === stepIndex;

                return (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.8}
                    onPress={() => setStepIndex(idx)}
                    accessibilityRole="button"
                    accessibilityLabel={idx === 0 ? 'Usar cronômetro' : `Definir temporizador de ${idx * 5} minutos`}
                    style={[
                      styles.tickTouchSlot,
                      { left: tickX - TICK_SPACING / 2 },
                    ]}
                  >
                    <View
                      style={[
                        styles.tickLine,
                        isCenter ? styles.tickLineActive : styles.tickLineIdle,
                      ]}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            <Pressable
              style={styles.focoTotalCard}
              onPress={() => setFocoTotal((prev) => !prev)}
            >
              <View style={styles.focoTotalTextCol}>
                <Text style={styles.focoTotalTitle}>Foco Total</Text>
                <Text style={styles.focoTotalDesc}>
                  Durante o foco, apenas apps da sua{'\n'}lista de permissões
                  podem ser{'\n'}usados.
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setFocoTotal((prev) => !prev)}
                style={[
                  styles.switchTrack,
                  focoTotal ? styles.switchTrackOn : styles.switchTrackOff,
                ]}
                accessibilityRole="switch"
                accessibilityState={{ checked: focoTotal }}
              >
                <View
                  style={[
                    styles.switchThumb,
                    focoTotal ? styles.switchThumbOn : styles.switchThumbOff,
                  ]}
                />
              </TouchableOpacity>
            </Pressable>

            <TouchableOpacity
              style={styles.modalStartButton}
              activeOpacity={0.88}
              onPress={handleStartFromModal}
              accessibilityRole="button"
              accessibilityLabel="Iniciar foco com a duração selecionada"
            >
              <Text style={styles.modalStartButtonText}>Iniciar foco</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* Modal 2: Estatísticas de Foco (Semanal, Mensal e Anual) */}
      <Modal
        visible={isStatsModalVisible}
        transparent
        animationType="none"
        onRequestClose={closeStatsModal}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[styles.modalBackdrop, { opacity: statsBackdropOpacity }]}
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={closeStatsModal}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.statsSheet,
              {
                width: containerWidth,
                transform: [{ translateY: statsSheetTranslateY }],
              },
            ]}
          >
            <View style={styles.modalGlowCircle} pointerEvents="none" />

            {/* Cabeçalho Estatísticas */}
            <View style={styles.statsModalHeader}>
              <View>
                <Text style={styles.statsModalTitle}>Estatísticas de Foco</Text>
                <Text style={styles.statsModalSubtitle}>
                  Acompanhe sua evolução por período
                </Text>
              </View>

              <TouchableOpacity
                style={styles.statsCloseButton}
                activeOpacity={0.8}
                onPress={closeStatsModal}
                accessibilityRole="button"
                accessibilityLabel="Fechar estatísticas"
              >
                <Text style={styles.statsCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Botões de Visualização: Dia, Semana, Mês e Ano */}
            <View style={styles.periodTabsContainer}>
              {STATS_PERIOD_OPTIONS.map((option) => {
                const isActive = statsPeriod === option.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    activeOpacity={0.85}
                    onPress={() => handleSelectStatsPeriod(option.id)}
                    style={[
                      styles.periodTabButton,
                      isActive && styles.periodTabButtonActive,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                  >
                    <Text
                      style={[
                        styles.periodTabText,
                        isActive && styles.periodTabTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Barra de Navegação de Data (<  12 de novembro de 2026 (Hoje)  >) */}
            <View style={styles.dateNavRow}>
              <TouchableOpacity
                style={styles.dateNavArrowBtn}
                activeOpacity={0.75}
                onPress={() => handleNavigatePeriod(-1)}
                accessibilityRole="button"
                accessibilityLabel="Período anterior"
              >
                <Text style={styles.dateNavArrowText}>‹</Text>
              </TouchableOpacity>

              <Text style={styles.dateNavLabelText} numberOfLines={1}>
                {periodView.dateNavigatorLabel}
              </Text>

              {periodOffset < 0 ? (
                <TouchableOpacity
                  style={styles.dateNavArrowBtn}
                  activeOpacity={0.75}
                  onPress={() => handleNavigatePeriod(1)}
                  accessibilityRole="button"
                  accessibilityLabel="Próximo período"
                >
                  <Text style={styles.dateNavArrowText}>›</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.dateNavArrowPlaceholder} />
              )}
            </View>

            {/* Card Principal: Distribuição do tempo de foco */}
            <View style={styles.chartCard}>
              <View style={styles.chartTitleHeaderRow}>
                <Text style={styles.chartDistributionTitle}>
                  Distribuição do tempo de foco
                </Text>
              </View>

              <View style={styles.chartDivider} />

              <Text style={styles.totalFocusSubtitle}>
                Tempo total de foco:{' '}
                <Text style={styles.totalFocusHighlightMins}>
                  {periodView.periodTotalMinutes}
                </Text>{' '}
                mins
                {activeBucket ? (
                  <Text style={styles.selectedBucketInlineInfo}>
                    {'  •  '}
                    {activeBucket.shortTitle}: {activeBucket.minutes} mins
                  </Text>
                ) : null}
              </Text>

              {/* Área do Gráfico com Eixo Y (75..0 M / 300..0 M / 750..0 M), Linhas de Grade e Barras */}
              <View style={styles.chartPlotWrapper}>
                <View style={styles.yAxisColumn}>
                  {periodView.yTicks.map((tickVal, idx) => (
                    <Text
                      key={`ytick-${idx}`}
                      style={styles.yAxisLabelText}
                      numberOfLines={1}
                    >
                      {tickVal === 0 ? '0 M' : tickVal}
                    </Text>
                  ))}
                </View>

                <View style={styles.plotRightColumn}>
                  <View style={styles.plotCanvasArea}>
                    {/* 6 Linhas Horizontais de Grade */}
                    <View style={styles.gridLinesOverlay} pointerEvents="none">
                      {periodView.yTicks.map((_, idx) => (
                        <View key={`grid-${idx}`} style={styles.gridHorizontalLine} />
                      ))}
                    </View>

                    {/* Colunas de Barras sobre a linha de base 0 M */}
                    <View style={styles.barsPlotRow}>
                      {periodView.buckets.map((bucket) => {
                        const mins = bucket.minutes || 0;
                        const hasFocus = (bucket.totalSeconds || 0) > 0;
                        const heightPct = hasFocus
                          ? Math.min(
                              100,
                              Math.max(4, (mins / periodView.yMax) * 100)
                            )
                          : 0;
                        const isSelected = selectedBucketKey === bucket.key;

                        const barWidthStyle =
                          statsPeriod === 'weekly'
                            ? styles.barWidthWeekly
                            : statsPeriod === 'annual'
                            ? styles.barWidthAnnual
                            : statsPeriod === 'daily'
                            ? styles.barWidthDaily
                            : styles.barWidthMonthly;

                        return (
                          <TouchableOpacity
                            key={bucket.key}
                            activeOpacity={0.8}
                            onPress={() =>
                              setSelectedBucketKey((prev) =>
                                prev === bucket.key ? null : bucket.key
                              )
                            }
                            style={styles.barSlotTouch}
                          >
                            {hasFocus ? (
                              <View
                                style={[
                                  styles.barPositiveFill,
                                  barWidthStyle,
                                  {
                                    height: `${heightPct}%`,
                                    backgroundColor: isSelected
                                      ? '#000C56'
                                      : '#7153FD',
                                  },
                                ]}
                              />
                            ) : (
                              <View
                                style={[
                                  styles.barZeroBaselineDash,
                                  barWidthStyle,
                                  isSelected && { backgroundColor: '#000C56' },
                                ]}
                              />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Rótulos do Eixo X */}
                  {periodView.xAxisType === 'sparse' ? (
                    <View style={styles.xAxisSparseRow}>
                      {periodView.xAxisLabels.map((lbl, idx) => (
                        <Text key={`xlbl-${idx}`} style={styles.xAxisLabelText}>
                          {lbl}
                        </Text>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.xAxisPerBarRow}>
                      {periodView.buckets.map((bucket) => {
                        const isSelected = selectedBucketKey === bucket.key;
                        return (
                          <View
                            key={`xlbl-${bucket.key}`}
                            style={styles.xAxisPerBarCell}
                          >
                            <Text
                              style={[
                                styles.xAxisLabelText,
                                isSelected && styles.xAxisLabelTextActive,
                              ]}
                              numberOfLines={1}
                            >
                              {bucket.label}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Lista de Sessões do Período / Item Selecionado */}
            <View style={styles.sessionsListHeader}>
              <Text style={styles.sessionsListTitle}>
                Histórico ({displayedTitle})
              </Text>
              <Text style={styles.sessionsCountBadgeText}>
                {displayedSessions.length}{' '}
                {displayedSessions.length === 1 ? 'sessão' : 'sessões'}
              </Text>
            </View>

            <ScrollView
              style={styles.sessionsScroll}
              contentContainerStyle={styles.sessionsScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {displayedSessions && displayedSessions.length > 0 ? (
                displayedSessions.map((item) => (
                  <View key={item.id} style={styles.sessionItemRow}>
                    <View style={styles.sessionItemLeft}>
                      <View
                        style={[
                          styles.sessionModeDot,
                          {
                            backgroundColor:
                              item.mode === 'Temporizador'
                                ? '#FBA0FE'
                                : '#7153FD',
                          },
                        ]}
                      />
                      <View>
                        <Text style={styles.sessionModeTitle}>
                          {item.mode}
                          {item.focoTotal ? ' • Foco Total' : ''}
                        </Text>
                        <Text style={styles.sessionTimeSub}>
                          {item.dateLabel && item.dateLabel !== 'Hoje'
                            ? `${item.dateLabel} às ${item.time}`
                            : `Concluído às ${item.time}`}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.sessionDurationBadge}>
                      {formatDurationHuman(item.durationSeconds)}
                    </Text>
                  </View>
                ))
              ) : (
                <View style={styles.emptySessionsBox}>
                  <Text style={styles.emptySessionsText}>
                    Nenhuma sessão de foco registrada neste período.
                  </Text>
                </View>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    overflow: 'hidden',
  },
  mobileFrame: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topHeaderBar: {
    width: '100%',
    paddingTop: 18,
    paddingHorizontal: 22,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 3,
  },
  statsHeaderButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.isDark ? colors.elevated : '#F3EEFF',
    borderWidth: 1.5,
    borderColor: 'rgba(113, 83, 253, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  centerContent: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  goblinWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  expandingPurpleCircle: {
    position: 'absolute',
    backgroundColor: '#7153FD',
  },
  goblinCircleMask: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerButton: {
    marginTop: 48,
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 14,
    zIndex: 2,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  timerText: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  actionArea: {
    marginTop: 20,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  startFocusButton: {
    width: 244,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  startFocusButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  focusControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  stopCircleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#000C56',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  pauseCircleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FBA0FE',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  navbarHolder: {
    width: '100%',
    zIndex: 2,
  },

  /* Estilos compartilhados de Modal */
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 12, 86, 0.45)',
  },
  modalSheet: {
    backgroundColor: colors.isDark ? colors.elevated : '#EAE4FF',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingTop: 26,
    paddingBottom: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000C56',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 16,
  },
  modalGlowCircle: {
    position: 'absolute',
    top: 48,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(251, 160, 254, 0.28)',
  },
  modalHeader: {
    width: '100%',
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.2,
  },
  hourglassResetBtn: {
    position: 'absolute',
    right: 2,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(114, 92, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  subtitleContainer: {
    width: '100%',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  modalSubtitle: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.isDark ? colors.secondary : '#4E4679',
    fontWeight: '500',
  },
  centerDisplayArea: {
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  minutesValueText: {
    fontSize: 40,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 0.4,
  },
  rulerContainer: {
    height: 48,
    marginTop: 10,
    marginBottom: 22,
    position: 'relative',
    justifyContent: 'center',
    ...(Platform.OS === 'web'
      ? { cursor: 'ew-resize', userSelect: 'none' }
      : {}),
  },
  smallStopwatchTick: {
    position: 'absolute',
    top: 15,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  tickTouchSlot: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: TICK_SPACING,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  tickLine: {
    borderRadius: 2,
  },
  tickLineActive: {
    width: 3.2,
    height: 22,
    backgroundColor: colors.text,
  },
  tickLineIdle: {
    width: 2,
    height: 12,
    backgroundColor: 'rgba(0, 12, 86, 0.32)',
  },
  focoTotalCard: {
    width: '100%',
    backgroundColor: 'rgba(114, 92, 255, 0.13)',
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 26,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  focoTotalTextCol: {
    flex: 1,
    paddingRight: 14,
  },
  focoTotalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  focoTotalDesc: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.isDark ? colors.secondary : '#4E4679',
    fontWeight: '500',
  },
  switchTrack: {
    width: 56,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    paddingHorizontal: 4,
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  switchTrackOff: {
    backgroundColor: colors.isDark ? colors.elevated : '#F3EEFF',
    borderColor: '#7B72A6',
    alignItems: 'flex-start',
  },
  switchTrackOn: {
    backgroundColor: '#7153FD',
    borderColor: '#000C56',
    alignItems: 'flex-end',
  },
  switchThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  switchThumbOff: {
    backgroundColor: '#7B72A6',
  },
  switchThumbOn: {
    backgroundColor: '#FBA0FE',
  },
  modalStartButton: {
    width: '100%',
    height: 58,
    borderRadius: 29,
    backgroundColor: '#7153FD',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7153FD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  modalStartButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  /* Estilos do Modal de Estatísticas (Dia, Semana, Mês e Ano) */
  statsSheet: {
    backgroundColor: colors.isDark ? colors.elevated : '#EAE4FF',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingTop: 22,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    overflow: 'hidden',
    maxHeight: '92%',
  },
  statsModalHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statsModalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
  },
  statsModalSubtitle: {
    fontSize: 13,
    color: colors.isDark ? colors.secondary : '#4E4679',
    fontWeight: '600',
    marginTop: 2,
  },
  statsCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 12, 86, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  statsCloseButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  periodTabsContainer: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#000C56',
    borderRadius: 14,
    padding: 3.5,
    marginBottom: 12,
    gap: 4,
  },
  periodTabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  periodTabButtonActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000C56',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 2,
  },
  periodTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  periodTabTextActive: {
    color: colors.text,
    fontWeight: '900',
  },
  dateNavRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  dateNavArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(113, 83, 253, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  dateNavArrowPlaceholder: {
    width: 32,
    height: 32,
  },
  dateNavArrowText: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '800',
    color: colors.text,
    marginTop: -2,
  },
  dateNavLabelText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  chartCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 14,
    shadowColor: '#000C56',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  chartTitleHeaderRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  chartDistributionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  chartDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(0, 12, 86, 0.07)',
    marginBottom: 12,
  },
  totalFocusSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.isDark ? colors.secondary : '#5B5385',
    marginBottom: 16,
  },
  totalFocusHighlightMins: {
    color: colors.accent,
    fontWeight: '800',
  },
  selectedBucketInlineInfo: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '700',
  },
  chartPlotWrapper: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  yAxisColumn: {
    width: 34,
    height: 164,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingRight: 4,
  },
  yAxisLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.isDark ? colors.secondary : '#8E85B5',
    lineHeight: 14,
  },
  plotRightColumn: {
    flex: 1,
  },
  plotCanvasArea: {
    width: '100%',
    height: 164,
    position: 'relative',
    paddingVertical: 6,
  },
  gridLinesOverlay: {
    ...StyleSheet.absoluteFillObject,
    paddingVertical: 6,
    justifyContent: 'space-between',
  },
  gridHorizontalLine: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(0, 12, 86, 0.06)',
  },
  barsPlotRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  barSlotTouch: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  barPositiveFill: {
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  barZeroBaselineDash: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#7153FD',
    opacity: 0.72,
  },
  barWidthDaily: {
    width: 6.5,
    borderTopLeftRadius: 3.5,
    borderTopRightRadius: 3.5,
  },
  barWidthWeekly: {
    width: 24,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  barWidthMonthly: {
    width: 5.5,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  barWidthAnnual: {
    width: 15,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  xAxisSparseRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingHorizontal: 2,
  },
  xAxisPerBarRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingHorizontal: 2,
  },
  xAxisPerBarCell: {
    flex: 1,
    alignItems: 'center',
  },
  xAxisLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.isDark ? colors.secondary : '#8E85B5',
  },
  xAxisLabelTextActive: {
    color: colors.text,
    fontWeight: '800',
  },
  sessionsListHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sessionsListTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  sessionsCountBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
  },
  sessionsScroll: {
    width: '100%',
    maxHeight: 145,
  },
  sessionsScrollContent: {
    gap: 8,
    paddingBottom: 6,
  },
  sessionItemRow: {
    width: '100%',
    backgroundColor: colors.isDark ? colors.elevated : '#F6F3FF',
    borderRadius: 16,
    paddingVertical: 11,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sessionModeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sessionModeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  sessionTimeSub: {
    fontSize: 12,
    color: colors.isDark ? colors.secondary : '#6E6696',
    fontWeight: '600',
  },
  sessionDurationBadge: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.accent,
  },
  emptySessionsBox: {
    width: '100%',
    backgroundColor: 'rgba(246, 243, 255, 0.65)',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  emptySessionsText: {
    fontSize: 13,
    color: colors.isDark ? colors.secondary : '#6E6696',
    fontWeight: '600',
    textAlign: 'center',
  },
});
