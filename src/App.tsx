import { HabitsScreen } from './features/habits/HabitsScreen.tsx';
import { UpdatePrompt } from './pwa/UpdatePrompt.tsx';

/**
 * App root. The unified shell with sticky bottom navigation and the install
 * button is built in deliverable 9; for now it renders the Habits screen so
 * habit tracking can be exercised end-to-end.
 */
export default function App() {
  return (
    <>
      <div className="mx-auto min-h-dvh max-w-md">
        <HabitsScreen />
      </div>
      <UpdatePrompt />
    </>
  );
}
