const TASKS_STORAGE_KEY = 'everquest_tasks_v1';
const SAMPLE_TASK_IDS = new Set([
  'task-mock-1',
  'task-mock-2',
  'task-mock-3',
  'task-mock-4',
]);

/**
 * @typedef {Object} SavedTask
 * @property {string} id
 * @property {string} title
 * @property {string} [description]
 * @property {string} [priority]
 * @property {string | null} [manualPriority]
 * @property {string} [createdAtDate]
 * @property {string} [deadlineDate]
 * @property {boolean} [completed]
 * @property {string | null} [completedAtDate]
 * @property {boolean} [createdByUser]
 * @property {boolean} [completedByUser]
 */

/** @type {SavedTask[] | null} */
let memoryTasks = null;

export function loadSavedTasks() {
  if (memoryTasks) return memoryTasks;
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(TASKS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          memoryTasks = parsed.filter((task) => !SAMPLE_TASK_IDS.has(task?.id));
          if (memoryTasks.length !== parsed.length) {
            saveTasksList(memoryTasks);
          }
          return memoryTasks;
        }
        console.warn('As tarefas salvas não estão em um formato válido.');
      }
    }
  } catch (error) {
    console.warn('Não foi possível carregar as tarefas salvas:', error);
  }
  memoryTasks = [];
  return memoryTasks;
}

/** @param {SavedTask[]} nextTasks */
export function saveTasksList(nextTasks) {
  memoryTasks = nextTasks;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(nextTasks));
    }
  } catch (error) {
    console.warn('Não foi possível salvar as tarefas no dispositivo:', error);
  }
}
