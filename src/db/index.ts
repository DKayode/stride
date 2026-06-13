/** Barrel for the offline storage layer: the Dexie db + typed repositories. */
export { db, StrideDatabase } from './database';

export {
  createHabit,
  updateHabit,
  deleteHabit,
  setHabitArchived,
  getCompletion,
  setHabitAmount,
  clearHabitDay,
  incrementHabit,
  toggleHabit,
} from './habits';
export type { CreateHabitInput, UpdateHabitInput } from './habits';

export {
  createProject,
  updateProject,
  deleteProject,
  setProjectProgress,
  addMilestone,
  updateMilestone,
  setMilestoneCompleted,
  toggleMilestone,
  deleteMilestone,
} from './projects';
export type { CreateProjectInput, UpdateProjectInput } from './projects';
