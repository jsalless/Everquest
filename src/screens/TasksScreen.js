import { usePreferences } from '../contexts/PreferencesContext';
import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Pressable,
  Modal,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import Navbar from '../components/Navbar';
import { toast } from '../utils/toast';
import { syncDailyActivityProgress } from '../services/dailyQuestService';
import { loadSavedTasks, saveTasksList } from '../services/taskService';

const WEEKDAY_HEADERS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];
const MONTH_SHORT = [
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

const PRIORITY_META = {
  low: {
    id: 'low',
    label: 'Baixa',
    badgeLabel: 'Prioridade Baixa',
    rangeHint: '7 a 10+ dias',
    color: '#1E9E6A',
    bg: '#E6F7F0',
    border: '#B5E8D3',
    dotColor: '#1E9E6A',
    rank: 1,
  },
  medium: {
    id: 'medium',
    label: 'Média',
    badgeLabel: 'Prioridade Média',
    rangeHint: '4 a 6 dias',
    color: '#D97706',
    bg: '#FEF3C7',
    border: '#FCD34D',
    dotColor: '#F59E0B',
    rank: 2,
  },
  high: {
    id: 'high',
    label: 'Alta',
    badgeLabel: 'Prioridade Alta',
    rangeHint: '3 dias ou menos',
    color: '#E11D48',
    bg: '#FFE4E6',
    border: '#FDA4AF',
    dotColor: '#E11D48',
    rank: 3,
  },
};

export function toDateKey(dateObj = new Date()) {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function parseDateKey(dateKey) {
  const [y, m, d] = (dateKey || '').split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

export function addDaysToKey(dateKey, deltaDays) {
  const d = parseDateKey(dateKey);
  d.setDate(d.getDate() + deltaDays);
  return toDateKey(d);
}

export function diffDaysBetweenKeys(fromKey, toKey) {
  const fromDate = parseDateKey(fromKey);
  const toDate = parseDateKey(toKey);
  const utcFrom = Date.UTC(
    fromDate.getFullYear(),
    fromDate.getMonth(),
    fromDate.getDate()
  );
  const utcTo = Date.UTC(
    toDate.getFullYear(),
    toDate.getMonth(),
    toDate.getDate()
  );
  return Math.round((utcTo - utcFrom) / (1000 * 60 * 60 * 24));
}

export function formatDateKeyShort(dateKey, todayKey) {
  if (!dateKey) return '';
  if (dateKey === todayKey) return 'Hoje';
  const d = parseDateKey(dateKey);
  const day = String(d.getDate()).padStart(2, '0');
  const month = MONTH_SHORT[d.getMonth()];
  return `${day} de ${month}`;
}

export function formatDateKeyFull(dateKey, todayKey) {
  const d = parseDateKey(dateKey);
  const day = d.getDate();
  const month = MONTH_NAMES[d.getMonth()].toLowerCase();
  if (dateKey === todayKey) {
    return `Hoje, ${day} de ${month}`;
  }
  return `${day} de ${month} de ${d.getFullYear()}`;
}

/**
 * Regra de prioridade baseada no deadline:
 * - 10+ até 7 dias restantes: prioridade baixa ('low')
 * - 6 até 4 dias restantes: prioridade média ('medium')
 * - 3 dias ou menos restantes: prioridade alta ('high')
 */
export function getPriorityByDaysRemaining(daysRemaining) {
  if (daysRemaining <= 3) return 'high';
  if (daysRemaining <= 6) return 'medium';
  return 'low';
}

export function getEffectiveTaskPriority(task, referenceDateKey) {
  const daysRemaining = diffDaysBetweenKeys(
    referenceDateKey,
    task.deadlineDate
  );
  const deadlinePriority = getPriorityByDaysRemaining(daysRemaining);

  // Atualiza automaticamente o status conforme o deadline se aproxima
  // (3 dias ou menos -> alta, 6-4 dias -> média, 10+-7 dias -> baixa),
  // respeitando também caso o usuário tenha definido manualmente uma prioridade maior na criação.
  if (daysRemaining <= 3) {
    return 'high';
  }
  if (daysRemaining <= 6) {
    return task.manualPriority === 'high' ? 'high' : 'medium';
  }
  if (task.manualPriority) {
    return task.manualPriority;
  }
  return deadlinePriority;
}

/**
 * Regra de exibição dia após dia:
 * - As tarefas aparecem dia após dia desde a data de criação até o deadline,
 *   desde que o deadline ainda não tenha passado (viewedDateKey <= deadlineDate)
 *   e a tarefa ainda não tenha sido concluída.
 * - Quando concluída, ela NÃO some no dia em que foi concluída (fica cinza na lista daquele dia),
 *   mas deixa de se repetir nos dias seguintes após a conclusão.
 */
export function isTaskVisibleOnDate(task, viewedDateKey) {
  const startKey = task.createdAtDate || viewedDateKey;
  if (viewedDateKey < startKey) return false;
  if (viewedDateKey > task.deadlineDate) return false;

  if (task.completed) {
    const doneKey = task.completedAtDate || startKey;
    return viewedDateKey === doneKey;
  }

  return true;
}

function PlusIcon({ size = 18, color = '#FFFFFF' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5V19M5 12H19"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function CheckIcon({ size = 14, color = '#FFFFFF' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12.5L9.5 17L19 7.5"
        stroke={color}
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CalendarSmallIcon({ size = 14, color = '#6E6696' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3.5"
        y="5"
        width="17"
        height="15.5"
        rx="3"
        stroke={color}
        strokeWidth="2"
      />
      <Path
        d="M8 3V6.5M16 3V6.5M3.5 9.5H20.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function TrashIcon({ size = 16, color = '#9EA3B5' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 7H20M9 7V4.5C9 3.95 9.45 3.5 10 3.5H14C14.55 3.5 15 3.95 15 4.5V7M6.5 7L7.4 19.1C7.45 19.9 8.1 20.5 8.9 20.5H15.1C15.9 20.5 16.55 19.9 16.6 19.1L17.5 7"
        stroke={color}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function buildMonthGrid(year, month) {
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 (Dom) .. 6 (Sáb)
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    cells.push({
      day,
      dateKey: `${year}-${mm}-${dd}`,
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}

export default function TasksScreen({
  user,
  activeTab = 'tasks',
  onChangeTab,
}) {
  const { colors } = usePreferences();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { width: windowWidth } = useWindowDimensions();
  const containerWidth = Math.min(windowWidth, 430);

  const todayDate = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => toDateKey(todayDate), [todayDate]);

  const [tasks, setTasks] = useState(() => loadSavedTasks());
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [calendarMonth, setCalendarMonth] = useState(() => ({
    year: todayDate.getFullYear(),
    month: todayDate.getMonth(),
  }));

  // Estado do Modal de Criação de Tarefa
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDeadlineKey, setNewDeadlineKey] = useState(todayKey);
  const [newPriority, setNewPriority] = useState('high');
  const [manualPriorityOverride, setManualPriorityOverride] = useState(null);
  const [pickerMonth, setPickerMonth] = useState(() => ({
    year: todayDate.getFullYear(),
    month: todayDate.getMonth(),
  }));
  const [showModalCalendar, setShowModalCalendar] = useState(false);

  // Células do calendário principal
  const monthCells = useMemo(
    () => buildMonthGrid(calendarMonth.year, calendarMonth.month),
    [calendarMonth.year, calendarMonth.month]
  );

  // Células do seletor de deadline no modal
  const pickerCells = useMemo(
    () => buildMonthGrid(pickerMonth.year, pickerMonth.month),
    [pickerMonth.year, pickerMonth.month]
  );

  // Tarefas visíveis no dia selecionado do calendário
  const tasksForSelectedDay = useMemo(() => {
    const list = tasks
      .filter((t) => isTaskVisibleOnDate(t, selectedDateKey))
      .map((t) => {
        const effectivePriority = getEffectiveTaskPriority(t, selectedDateKey);
        const daysRemaining = diffDaysBetweenKeys(
          selectedDateKey,
          t.deadlineDate
        );
        return {
          ...t,
          effectivePriority,
          daysRemaining,
        };
      });

    // Ordena: não concluídas primeiro (por prioridade Alta -> Média -> Baixa e menor prazo), depois concluídas (cinzas)
    return list.sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      const rankDiff =
        (PRIORITY_META[b.effectivePriority]?.rank || 0) -
        (PRIORITY_META[a.effectivePriority]?.rank || 0);
      if (rankDiff !== 0) return rankDiff;
      return a.daysRemaining - b.daysRemaining;
    });
  }, [tasks, selectedDateKey]);

  const pendingTasks = useMemo(
    () => tasksForSelectedDay.filter((t) => !t.completed),
    [tasksForSelectedDay]
  );
  const pendingCount = pendingTasks.length;
  const completedCount = tasksForSelectedDay.filter((t) => t.completed).length;

  const pendingByPriority = useMemo(() => {
    const counts = { high: 0, medium: 0, low: 0 };
    pendingTasks.forEach((t) => {
      const p = t.effectivePriority || 'low';
      if (counts[p] !== undefined) {
        counts[p] += 1;
      }
    });
    return counts;
  }, [pendingTasks]);

  const handleChangeMonth = (delta) => {
    setCalendarMonth((prev) => {
      const d = new Date(prev.year, prev.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const handleJumpToToday = () => {
    const now = new Date();
    const key = toDateKey(now);
    setSelectedDateKey(key);
    setCalendarMonth({ year: now.getFullYear(), month: now.getMonth() });
  };

  const openCreateModal = () => {
    const defaultDeadline =
      selectedDateKey >= todayKey ? selectedDateKey : todayKey;
    const daysDiff = diffDaysBetweenKeys(selectedDateKey, defaultDeadline);
    const autoPrio = getPriorityByDaysRemaining(daysDiff);
    const dObj = parseDateKey(defaultDeadline);

    setNewTitle('');
    setNewDescription('');
    setNewDeadlineKey(defaultDeadline);
    setNewPriority(autoPrio);
    setManualPriorityOverride(null);
    setPickerMonth({ year: dObj.getFullYear(), month: dObj.getMonth() });
    setShowModalCalendar(false);
    setIsCreateModalVisible(true);
  };

  const handleSelectDeadlineInModal = (targetDateKey) => {
    setNewDeadlineKey(targetDateKey);
    const baseRefKey = selectedDateKey >= todayKey ? selectedDateKey : todayKey;
    const daysLeft = diffDaysBetweenKeys(baseRefKey, targetDateKey);
    const autoPrio = getPriorityByDaysRemaining(daysLeft);
    setNewPriority(autoPrio);
    setManualPriorityOverride(null);
    const dObj = parseDateKey(targetDateKey);
    setPickerMonth({ year: dObj.getFullYear(), month: dObj.getMonth() });
  };

  const handleSelectPriorityInModal = (prioId) => {
    setNewPriority(prioId);
    setManualPriorityOverride(prioId);
  };

  const handleCreateTask = () => {
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) {
      toast.warn('Informe um título para a tarefa.');
      return;
    }

    const startKey =
      selectedDateKey < todayKey ? selectedDateKey : todayKey;
    const finalDeadlineKey =
      newDeadlineKey < startKey ? startKey : newDeadlineKey;

    const createdTask = {
      id: `task-${Date.now()}`,
      title: trimmedTitle,
      description: newDescription.trim(),
      priority: newPriority,
      manualPriority: manualPriorityOverride,
      createdAtDate: startKey,
      deadlineDate: finalDeadlineKey,
      completed: false,
      completedAtDate: null,
      createdByUser: true,
    };

    const updated = [createdTask, ...tasks];
    setTasks(updated);
    saveTasksList(updated);
    setIsCreateModalVisible(false);
    toast.success('Tarefa criada com sucesso!');

    syncDailyActivityProgress(user, {
      eventType: 'task_created',
      tasksCreatedDelta: 1,
    }).then((res) => {
      if (res?.newlyCompleted?.length > 0) {
        toast.info(
          `Daily Quest concluída: "${res.newlyCompleted[0].title}"! Resgate sua recompensa no Perfil.`
        );
      }
    });
  };

  const handleToggleComplete = (taskId) => {
    let deltaCompleted = 0;
    const updated = tasks.map((item) => {
      if (item.id !== taskId) return item;
      const nextCompleted = !item.completed;
      deltaCompleted = nextCompleted ? 1 : -1;
      return {
        ...item,
        completed: nextCompleted,
        completedAtDate: nextCompleted ? todayKey : null,
        completedByUser: nextCompleted,
      };
    });
    setTasks(updated);
    saveTasksList(updated);

    syncDailyActivityProgress(user, {
      eventType: deltaCompleted > 0 ? 'task_completed' : 'task_uncompleted',
      tasksCompletedDelta: deltaCompleted,
    }).then((res) => {
      if (res?.newlyCompleted?.length > 0) {
        toast.info(
          `Daily Quest concluída: "${res.newlyCompleted[0].title}"! Resgate sua recompensa no Perfil.`
        );
      }
    });
  };

  const handleDeleteTask = (taskId) => {
    const updated = tasks.filter((item) => item.id !== taskId);
    setTasks(updated);
    saveTasksList(updated);
    toast.info('Tarefa removida.');
  };

  const modalBaseRefKey =
    selectedDateKey >= todayKey ? selectedDateKey : todayKey;
  const modalDaysUntilDeadline = diffDaysBetweenKeys(
    modalBaseRefKey,
    newDeadlineKey
  );
  const modalAutoPriority = getPriorityByDaysRemaining(modalDaysUntilDeadline);

  return (
    <View style={styles.root}>
      <View style={[styles.mobileFrame, { width: containerWidth }]}>
        {/* Cabeçalho Superior */}
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.screenTitle}>Tarefas</Text>
            <Text style={styles.screenSubtitle}>
              Organize suas missões no calendário
            </Text>
          </View>

          <TouchableOpacity
            style={styles.newTaskTopButton}
            activeOpacity={0.85}
            onPress={openCreateModal}
            accessibilityRole="button"
            accessibilityLabel="Criar nova tarefa"
          >
            <PlusIcon size={16} color="#FFFFFF" />
            <Text style={styles.newTaskTopButtonText}>Nova tarefa</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Card do Calendário Mensal Interativo */}
          <View style={styles.calendarCard}>
            <View style={styles.calendarHeaderRow}>
              <TouchableOpacity
                style={styles.monthNavBtn}
                activeOpacity={0.75}
                onPress={() => handleChangeMonth(-1)}
                accessibilityRole="button"
                accessibilityLabel="Mês anterior"
              >
                <Text style={styles.monthNavArrow}>‹</Text>
              </TouchableOpacity>

              <View style={styles.monthTitleWrap}>
                <Text style={styles.monthTitleText}>
                  {MONTH_NAMES[calendarMonth.month]} {calendarMonth.year}
                </Text>
                {selectedDateKey !== todayKey && (
                  <TouchableOpacity
                    style={styles.todayChipBtn}
                    activeOpacity={0.8}
                    onPress={handleJumpToToday}
                  >
                    <Text style={styles.todayChipText}>Ir para Hoje</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={styles.monthNavBtn}
                activeOpacity={0.75}
                onPress={() => handleChangeMonth(1)}
                accessibilityRole="button"
                accessibilityLabel="Próximo mês"
              >
                <Text style={styles.monthNavArrow}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Cabeçalho dos dias da semana */}
            <View style={styles.weekdayHeaderRow}>
              {WEEKDAY_HEADERS.map((dayLbl) => (
                <View key={dayLbl} style={styles.weekdayCell}>
                  <Text style={styles.weekdayLabelText}>{dayLbl}</Text>
                </View>
              ))}
            </View>

            {/* Grade de dias do mês */}
            <View style={styles.daysGrid}>
              {monthCells.map((cell, idx) => {
                if (!cell) {
                  return <View key={`empty-${idx}`} style={styles.dayCell} />;
                }

                const isSelected = cell.dateKey === selectedDateKey;
                const isToday = cell.dateKey === todayKey;

                // Verifica tarefas ativas/concluídas neste dia para mostrar indicadores
                const dayTasks = tasks.filter((t) =>
                  isTaskVisibleOnDate(t, cell.dateKey)
                );
                const pendingDayTasks = dayTasks.filter((t) => !t.completed);
                const hasCompletedOnly =
                  dayTasks.length > 0 && pendingDayTasks.length === 0;

                let dotColor = null;
                if (pendingDayTasks.length > 0) {
                  const highest = pendingDayTasks.reduce((acc, curr) => {
                    const eff = getEffectiveTaskPriority(curr, cell.dateKey);
                    return (PRIORITY_META[eff]?.rank || 0) >
                      (PRIORITY_META[acc]?.rank || 0)
                      ? eff
                      : acc;
                  }, 'low');
                  dotColor = PRIORITY_META[highest]?.dotColor || '#7153FD';
                } else if (hasCompletedOnly) {
                  dotColor = '#9EA3B5';
                }

                return (
                  <TouchableOpacity
                    key={cell.dateKey}
                    style={styles.dayCell}
                    activeOpacity={0.78}
                    onPress={() => setSelectedDateKey(cell.dateKey)}
                    accessibilityRole="button"
                    accessibilityLabel={`Dia ${cell.day}`}
                  >
                    <View
                      style={[
                        styles.dayCircle,
                        isToday && !isSelected && styles.dayCircleToday,
                        isSelected && styles.dayCircleSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayNumberText,
                          isToday && !isSelected && styles.dayNumberToday,
                          isSelected && styles.dayNumberSelected,
                        ]}
                      >
                        {cell.day}
                      </Text>

                      {dotColor && (
                        <View
                          style={[
                            styles.dayTaskDot,
                            {
                              backgroundColor: isSelected
                                ? '#FBA0FE'
                                : dotColor,
                            },
                          ]}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Overview de tarefas pendentes por nível de prioridade */}
          <View style={styles.pendingOverviewCard}>
            <View style={styles.pendingOverviewHeaderRow}>
              <Text style={styles.pendingOverviewTitle}>
                Tarefas pendentes por prioridade
              </Text>
              <View style={styles.pendingTotalPill}>
                <Text style={styles.pendingTotalPillText}>
                  {pendingCount} {pendingCount === 1 ? 'pendente' : 'pendentes'}
                </Text>
              </View>
            </View>

            <View style={styles.pendingOverviewBoxesRow}>
              <View
                style={[
                  styles.pendingPrioBox,
                  {
                    backgroundColor: PRIORITY_META.high.bg,
                    borderColor: PRIORITY_META.high.border,
                  },
                ]}
              >
                <View style={styles.pendingPrioTopRow}>
                  <View
                    style={[
                      styles.pendingPrioDot,
                      { backgroundColor: PRIORITY_META.high.color },
                    ]}
                  />
                  <Text
                    style={[
                      styles.pendingPrioLabel,
                      { color: PRIORITY_META.high.color },
                    ]}
                  >
                    Alta
                  </Text>
                </View>
                <Text
                  style={[
                    styles.pendingPrioCount,
                    { color: PRIORITY_META.high.color },
                  ]}
                >
                  {pendingByPriority.high}
                </Text>
              </View>

              <View
                style={[
                  styles.pendingPrioBox,
                  {
                    backgroundColor: PRIORITY_META.medium.bg,
                    borderColor: PRIORITY_META.medium.border,
                  },
                ]}
              >
                <View style={styles.pendingPrioTopRow}>
                  <View
                    style={[
                      styles.pendingPrioDot,
                      { backgroundColor: PRIORITY_META.medium.color },
                    ]}
                  />
                  <Text
                    style={[
                      styles.pendingPrioLabel,
                      { color: PRIORITY_META.medium.color },
                    ]}
                  >
                    Média
                  </Text>
                </View>
                <Text
                  style={[
                    styles.pendingPrioCount,
                    { color: PRIORITY_META.medium.color },
                  ]}
                >
                  {pendingByPriority.medium}
                </Text>
              </View>

              <View
                style={[
                  styles.pendingPrioBox,
                  {
                    backgroundColor: PRIORITY_META.low.bg,
                    borderColor: PRIORITY_META.low.border,
                  },
                ]}
              >
                <View style={styles.pendingPrioTopRow}>
                  <View
                    style={[
                      styles.pendingPrioDot,
                      { backgroundColor: PRIORITY_META.low.color },
                    ]}
                  />
                  <Text
                    style={[
                      styles.pendingPrioLabel,
                      { color: PRIORITY_META.low.color },
                    ]}
                  >
                    Baixa
                  </Text>
                </View>
                <Text
                  style={[
                    styles.pendingPrioCount,
                    { color: PRIORITY_META.low.color },
                  ]}
                >
                  {pendingByPriority.low}
                </Text>
              </View>
            </View>
          </View>

          {/* Cabeçalho da Lista de Tarefas do Dia Selecionado */}
          <View style={styles.daySectionHeader}>
            <View>
              <Text style={styles.daySectionTitle}>
                {formatDateKeyFull(selectedDateKey, todayKey)}
              </Text>
              <Text style={styles.daySectionMeta}>
                {pendingCount}{' '}
                {pendingCount === 1 ? 'pendente' : 'pendentes'} •{' '}
                {completedCount}{' '}
                {completedCount === 1 ? 'concluída' : 'concluídas'}
              </Text>
            </View>
          </View>

          {/* Lista de Tarefas */}
          {tasksForSelectedDay.length === 0 ? (
            <View style={styles.emptyStateBox}>
              <Text style={styles.emptyStateTitle}>
                Nenhuma tarefa para este dia
              </Text>
              <Text style={styles.emptyStateSubtitle}>
                Toque em "Nova tarefa" para planejar suas atividades.
              </Text>
              <TouchableOpacity
                style={styles.emptyAddBtn}
                activeOpacity={0.85}
                onPress={openCreateModal}
              >
                <PlusIcon size={15} color="#7153FD" />
                <Text style={styles.emptyAddBtnText}>Adicionar tarefa</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.tasksListContainer}>
              {tasksForSelectedDay.map((task) => {
                const isDone = Boolean(task.completed);
                const prioInfo =
                  PRIORITY_META[task.effectivePriority] || PRIORITY_META.low;
                const deadlineLabel = formatDateKeyShort(
                  task.deadlineDate,
                  todayKey
                );

                let remainingText = '';
                if (task.daysRemaining === 0) {
                  remainingText = 'Vence neste dia';
                } else if (task.daysRemaining === 1) {
                  remainingText = 'Falta 1 dia';
                } else {
                  remainingText = `Faltam ${task.daysRemaining} dias`;
                }

                return (
                  <View
                    key={task.id}
                    style={[
                      styles.taskCard,
                      isDone && styles.taskCardCompleted,
                    ]}
                  >
                    {/* Barra lateral de cor da prioridade (cinza quando concluída) */}
                    <View
                      style={[
                        styles.taskPriorityStripe,
                        {
                          backgroundColor: isDone
                            ? '#B8BDCB'
                            : prioInfo.color,
                        },
                      ]}
                    />

                    <View style={styles.taskCardInner}>
                      {/* Checkbox para concluir/desmarcar */}
                      <TouchableOpacity
                        style={[
                          styles.checkboxTouch,
                          isDone
                            ? styles.checkboxCompleted
                            : { borderColor: prioInfo.color },
                        ]}
                        activeOpacity={0.8}
                        onPress={() => handleToggleComplete(task.id)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: isDone }}
                        accessibilityLabel={`Marcar tarefa ${task.title} como concluída`}
                      >
                        {isDone && <CheckIcon size={14} color="#FFFFFF" />}
                      </TouchableOpacity>

                      {/* Conteúdo Principal da Task */}
                      <Pressable
                        style={styles.taskBodyCol}
                        onPress={() => handleToggleComplete(task.id)}
                      >
                        <View style={styles.taskTopTitleRow}>
                          <Text
                            style={[
                              styles.taskTitleText,
                              isDone && styles.taskTitleTextCompleted,
                            ]}
                          >
                            {task.title}
                          </Text>

                          <TouchableOpacity
                            style={styles.deleteTaskBtn}
                            activeOpacity={0.7}
                            onPress={() => handleDeleteTask(task.id)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityRole="button"
                            accessibilityLabel="Excluir tarefa"
                          >
                            <TrashIcon
                              size={15}
                              color={isDone ? '#B4B9C7' : '#9EA3B5'}
                            />
                          </TouchableOpacity>
                        </View>

                        {task.description ? (
                          <Text
                            style={[
                              styles.taskDescText,
                              isDone && styles.taskDescTextCompleted,
                            ]}
                          >
                            {task.description}
                          </Text>
                        ) : null}

                        {/* Badges de Prioridade + Deadline */}
                        <View style={styles.taskBadgesRow}>
                          <View
                            style={[
                              styles.priorityBadge,
                              isDone
                                ? styles.badgeCompletedGray
                                : {
                                  backgroundColor: prioInfo.bg,
                                  borderColor: prioInfo.border,
                                },
                            ]}
                          >
                            <View
                              style={[
                                styles.priorityBadgeDot,
                                {
                                  backgroundColor: isDone
                                    ? '#8C92A4'
                                    : prioInfo.color,
                                },
                              ]}
                            />
                            <Text
                              style={[
                                styles.priorityBadgeText,
                                {
                                  color: isDone ? '#7A8091' : prioInfo.color,
                                },
                              ]}
                            >
                              {prioInfo.badgeLabel}
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.deadlineBadge,
                              isDone && styles.badgeCompletedGray,
                            ]}
                          >
                            <CalendarSmallIcon
                              size={12}
                              color={isDone ? '#8C92A4' : '#5B5385'}
                            />
                            <Text
                              style={[
                                styles.deadlineBadgeText,
                                isDone && styles.deadlineBadgeTextCompleted,
                              ]}
                            >
                              Até {deadlineLabel}
                              {!isDone ? ` (${remainingText})` : ' • Concluída'}
                            </Text>
                          </View>
                        </View>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Navbar Inferior Fixa */}
        <View style={styles.navbarWrapper}>
          <Navbar activeTab={activeTab} onChangeTab={onChangeTab} />
        </View>
      </View>

      {/* Modal: Criar Nova Tarefa */}
      <Modal
        visible={isCreateModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setIsCreateModalVisible(false)}
          />

          <View style={[styles.modalSheet, { width: containerWidth }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Nova Tarefa</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                activeOpacity={0.8}
                onPress={() => setIsCreateModalVisible(false)}
              >
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalFormScroll}
              contentContainerStyle={styles.modalFormContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Campo: Título */}
              <Text style={styles.inputLabel}>Título da tarefa *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ex.: Estudar 30 min de gramática"
                placeholderTextColor="#9A94B8"
                value={newTitle}
                onChangeText={setNewTitle}
              />

              {/* Campo: Descrição (opcional) */}
              <Text style={styles.inputLabel}>Descrição (opcional)</Text>
              <TextInput
                style={[styles.textInput, styles.textAreaInput]}
                placeholder="Adicione detalhes ou observações sobre a tarefa..."
                placeholderTextColor="#9A94B8"
                multiline
                numberOfLines={3}
                value={newDescription}
                onChangeText={setNewDescription}
              />

              {/* Campo: Deadline com atalho "Hoje" */}
              <View style={styles.labelRowWithHint}>
                <Text style={styles.inputLabelNoMargin}>Deadline</Text>
                <Text style={styles.deadlineSelectedHint}>
                  Selecionado: {formatDateKeyShort(newDeadlineKey, todayKey)} (
                  {modalDaysUntilDeadline <= 0
                    ? 'Hoje'
                    : modalDaysUntilDeadline === 1
                      ? 'em 1 dia'
                      : `em ${modalDaysUntilDeadline} dias`}
                  )
                </Text>
              </View>

              <View style={styles.deadlineQuickRow}>
                <TouchableOpacity
                  style={[
                    styles.deadlineQuickBtn,
                    newDeadlineKey === todayKey &&
                    styles.deadlineQuickBtnActive,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => handleSelectDeadlineInModal(todayKey)}
                >
                  <Text
                    style={[
                      styles.deadlineQuickBtnText,
                      newDeadlineKey === todayKey &&
                      styles.deadlineQuickBtnTextActive,
                    ]}
                  >
                    Hoje
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.deadlineQuickBtn,
                    newDeadlineKey === addDaysToKey(modalBaseRefKey, 2) &&
                    styles.deadlineQuickBtnActive,
                  ]}
                  activeOpacity={0.85}
                  onPress={() =>
                    handleSelectDeadlineInModal(addDaysToKey(modalBaseRefKey, 2))
                  }
                >
                  <Text
                    style={[
                      styles.deadlineQuickBtnText,
                      newDeadlineKey === addDaysToKey(modalBaseRefKey, 2) &&
                      styles.deadlineQuickBtnTextActive,
                    ]}
                  >
                    +2 dias
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.deadlineQuickBtn,
                    newDeadlineKey === addDaysToKey(modalBaseRefKey, 5) &&
                    styles.deadlineQuickBtnActive,
                  ]}
                  activeOpacity={0.85}
                  onPress={() =>
                    handleSelectDeadlineInModal(addDaysToKey(modalBaseRefKey, 5))
                  }
                >
                  <Text
                    style={[
                      styles.deadlineQuickBtnText,
                      newDeadlineKey === addDaysToKey(modalBaseRefKey, 5) &&
                      styles.deadlineQuickBtnTextActive,
                    ]}
                  >
                    +5 dias
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.deadlineQuickBtn,
                    newDeadlineKey === addDaysToKey(modalBaseRefKey, 8) &&
                    styles.deadlineQuickBtnActive,
                  ]}
                  activeOpacity={0.85}
                  onPress={() =>
                    handleSelectDeadlineInModal(addDaysToKey(modalBaseRefKey, 8))
                  }
                >
                  <Text
                    style={[
                      styles.deadlineQuickBtnText,
                      newDeadlineKey === addDaysToKey(modalBaseRefKey, 8) &&
                      styles.deadlineQuickBtnTextActive,
                    ]}
                  >
                    +8 dias
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.deadlineQuickBtn,
                    showModalCalendar && styles.deadlineQuickBtnOutline,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => setShowModalCalendar((prev) => !prev)}
                >
                  <CalendarSmallIcon
                    size={13}
                    color={showModalCalendar ? colors.accent : colors.text}
                  />
                  <Text
                    style={[
                      styles.deadlineQuickBtnText,
                      showModalCalendar && { color: '#7153FD' },
                    ]}
                  >
                    Calendário
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Mini Calendário Expansível para escolher qualquer data de deadline */}
              {showModalCalendar && (
                <View style={styles.modalMiniCalendar}>
                  <View style={styles.modalCalHeader}>
                    <TouchableOpacity
                      style={styles.modalCalArrowBtn}
                      onPress={() =>
                        setPickerMonth((prev) => {
                          const d = new Date(prev.year, prev.month - 1, 1);
                          return { year: d.getFullYear(), month: d.getMonth() };
                        })
                      }
                    >
                      <Text style={styles.modalCalArrowText}>‹</Text>
                    </TouchableOpacity>

                    <Text style={styles.modalCalTitle}>
                      {MONTH_NAMES[pickerMonth.month]} {pickerMonth.year}
                    </Text>

                    <TouchableOpacity
                      style={styles.modalCalArrowBtn}
                      onPress={() =>
                        setPickerMonth((prev) => {
                          const d = new Date(prev.year, prev.month + 1, 1);
                          return { year: d.getFullYear(), month: d.getMonth() };
                        })
                      }
                    >
                      <Text style={styles.modalCalArrowText}>›</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.weekdayHeaderRow}>
                    {WEEKDAY_HEADERS.map((w) => (
                      <View key={`m-${w}`} style={styles.weekdayCell}>
                        <Text style={styles.weekdayLabelText}>{w}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.daysGrid}>
                    {pickerCells.map((cell, idx) => {
                      if (!cell) {
                        return (
                          <View key={`mp-${idx}`} style={styles.dayCell} />
                        );
                      }
                      const isDisabled = cell.dateKey < modalBaseRefKey;
                      const isSelected = cell.dateKey === newDeadlineKey;
                      return (
                        <TouchableOpacity
                          key={`mp-${cell.dateKey}`}
                          style={styles.dayCell}
                          disabled={isDisabled}
                          activeOpacity={0.75}
                          onPress={() =>
                            handleSelectDeadlineInModal(cell.dateKey)
                          }
                        >
                          <View
                            style={[
                              styles.dayCircleSmall,
                              isSelected && styles.dayCircleSelected,
                              isDisabled && { opacity: 0.3 },
                            ]}
                          >
                            <Text
                              style={[
                                styles.dayNumberText,
                                isSelected && styles.dayNumberSelected,
                              ]}
                            >
                              {cell.day}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Campo: Nível de Prioridade (Baixa, Média, Alta) */}
              <View style={styles.labelRowWithHint}>
                <Text style={styles.inputLabelNoMargin}>
                  Nível de prioridade
                </Text>
              </View>

              <View style={styles.prioritySelectorRow}>
                {(['low', 'medium', 'high']).map((prioKey) => {
                  const meta = PRIORITY_META[prioKey];
                  const isSelected = newPriority === prioKey;
                  return (
                    <TouchableOpacity
                      key={prioKey}
                      style={[
                        styles.priorityOptionBtn,
                        isSelected && {
                          backgroundColor: meta.bg,
                          borderColor: meta.color,
                        },
                      ]}
                      activeOpacity={0.85}
                      onPress={() => handleSelectPriorityInModal(prioKey)}
                    >
                      <View
                        style={[
                          styles.priorityOptionDot,
                          { backgroundColor: meta.color },
                        ]}
                      />
                      <Text
                        style={[
                          styles.priorityOptionTitle,
                          isSelected && { color: meta.color, fontWeight: '900' },
                        ]}
                      >
                        {meta.label}
                      </Text>
                      <Text style={styles.priorityOptionSub}>
                        {meta.rangeHint}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={styles.submitTaskButton}
                activeOpacity={0.88}
                onPress={handleCreateTask}
              >
                <Text style={styles.submitTaskButtonText}>Criar tarefa</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  mobileFrame: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: colors.background,
  },
  topHeader: {
    width: '100%',
    paddingTop: Platform.OS === 'ios' ? 50 : 24,
    paddingBottom: 14,
    paddingHorizontal: 20,
    backgroundColor: '#000C56',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  screenSubtitle: {
    fontSize: 12.5,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.78)',
    marginTop: 2,
  },
  newTaskTopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#7153FD',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  newTaskTopButtonText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  scrollArea: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 24,
  },
  calendarCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 12,
    shadowColor: '#000C56',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  monthNavBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.isDark ? colors.elevated : '#F2EEFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  monthNavArrow: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '800',
    color: colors.text,
    marginTop: -2,
  },
  monthTitleWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  monthTitleText: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
  },
  todayChipBtn: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(113, 83, 253, 0.14)',
  },
  todayChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.accent,
  },
  weekdayHeaderRow: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 4,
  },
  weekdayCell: {
    width: '14.2857%',
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekdayLabelText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.isDark ? colors.secondary : '#8E85B5',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  dayCell: {
    width: '14.2857%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 1,
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayCircleSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleToday: {
    borderWidth: 1.8,
    borderColor: '#7153FD',
    backgroundColor: colors.isDark ? colors.elevated : '#F4F0FF',
  },
  dayCircleSelected: {
    backgroundColor: '#000C56',
  },
  dayNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.isDark ? colors.text : '#1C1B33',
  },
  dayNumberToday: {
    color: colors.accent,
    fontWeight: '900',
  },
  dayNumberSelected: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  dayTaskDot: {
    position: 'absolute',
    bottom: 3,
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  pendingOverviewCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(113, 83, 253, 0.14)',
    shadowColor: '#000C56',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  pendingOverviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  pendingOverviewTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  pendingTotalPill: {
    backgroundColor: colors.isDark ? colors.elevated : '#F2EEFF',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 10,
  },
  pendingTotalPillText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: colors.accent,
  },
  pendingOverviewBoxesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pendingPrioBox: {
    flex: 1,
    borderRadius: 13,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingPrioTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
  },
  pendingPrioDot: {
    width: 6.5,
    height: 6.5,
    borderRadius: 3.25,
  },
  pendingPrioLabel: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  pendingPrioCount: {
    fontSize: 18,
    fontWeight: '900',
  },
  daySectionHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  daySectionTitle: {
    fontSize: 16.5,
    fontWeight: '900',
    color: colors.text,
  },
  daySectionMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.isDark ? colors.secondary : '#6E6696',
    marginTop: 2,
  },
  tasksListContainer: {
    width: '100%',
    gap: 10,
  },
  taskCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 18,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 12, 86, 0.08)',
    shadowColor: '#000C56',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  taskCardCompleted: {
    backgroundColor: colors.isDark ? colors.elevated : '#ECEDF2',
    borderColor: colors.isDark ? colors.border : '#D5D8E2',
    shadowOpacity: 0,
    elevation: 0,
  },
  taskPriorityStripe: {
    width: 6,
  },
  taskCardInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 12,
  },
  checkboxTouch: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    backgroundColor: colors.surface,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  checkboxCompleted: {
    backgroundColor: '#8E94A6',
    borderColor: '#8E94A6',
  },
  taskBodyCol: {
    flex: 1,
  },
  taskTopTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  taskTitleText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 20,
  },
  taskTitleTextCompleted: {
    color: colors.isDark ? colors.secondary : '#7D8395',
    textDecorationLine: 'line-through',
  },
  deleteTaskBtn: {
    padding: 2,
  },
  taskDescText: {
    fontSize: 13,
    color: colors.isDark ? colors.secondary : '#5B5385',
    fontWeight: '500',
    marginTop: 4,
    lineHeight: 18,
  },
  taskDescTextCompleted: {
    color: colors.isDark ? colors.secondary : '#9399AA',
    textDecorationLine: 'line-through',
  },
  taskBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 9,
    borderWidth: 1,
  },
  priorityBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  deadlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 9,
    backgroundColor: colors.isDark ? colors.elevated : '#F3F0FF',
    borderWidth: 1,
    borderColor: 'rgba(113, 83, 253, 0.18)',
  },
  deadlineBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.isDark ? colors.secondary : '#4E4679',
  },
  deadlineBadgeTextCompleted: {
    color: colors.isDark ? colors.secondary : '#7A8091',
  },
  badgeCompletedGray: {
    backgroundColor: colors.isDark ? colors.elevated : '#DFE2EA',
    borderColor: colors.isDark ? colors.border : '#C9CEDB',
  },
  emptyStateBox: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(113, 83, 253, 0.14)',
  },
  emptyStateTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: colors.text,
  },
  emptyStateSubtitle: {
    fontSize: 13,
    color: colors.isDark ? colors.secondary : '#6E6696',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: colors.isDark ? colors.elevated : '#F2EEFF',
  },
  emptyAddBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.accent,
  },
  navbarWrapper: {
    width: '100%',
  },

  /* Modal de Criação de Tarefa */
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 12, 86, 0.48)',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 20,
    paddingBottom: 26,
    paddingHorizontal: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalHeaderTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.isDark ? colors.elevated : '#F2EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  modalFormScroll: {
    width: '100%',
  },
  modalFormContent: {
    paddingBottom: 12,
  },
  inputLabel: {
    fontSize: 13.5,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
    marginTop: 10,
  },
  inputLabelNoMargin: {
    fontSize: 13.5,
    fontWeight: '800',
    color: colors.text,
  },
  labelRowWithHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 8,
  },
  deadlineSelectedHint: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
  },
  autoPriorityNotice: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.isDark ? colors.secondary : '#5B5385',
  },
  textInput: {
    width: '100%',
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.isDark ? colors.border : '#E2DCFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  textAreaInput: {
    minHeight: 74,
    textAlignVertical: 'top',
  },
  deadlineQuickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  deadlineQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.isDark ? colors.elevated : '#F2EEFF',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  deadlineQuickBtnActive: {
    backgroundColor: '#000C56',
    borderColor: '#000C56',
  },
  deadlineQuickBtnOutline: {
    borderColor: '#7153FD',
    backgroundColor: colors.background,
  },
  deadlineQuickBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.text,
  },
  deadlineQuickBtnTextActive: {
    color: '#FFFFFF',
  },
  modalMiniCalendar: {
    marginTop: 10,
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.isDark ? colors.border : '#E2DCFF',
  },
  modalCalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalCalArrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCalArrowText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  modalCalTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: colors.text,
  },
  prioritySelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityOptionBtn: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1.8,
    borderColor: colors.isDark ? colors.border : '#E2DCFF',
  },
  priorityOptionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  priorityOptionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  priorityOptionSub: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.isDark ? colors.secondary : '#6E6696',
    marginTop: 2,
    textAlign: 'center',
  },
  submitTaskButton: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    backgroundColor: '#7153FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#7153FD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  submitTaskButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});

