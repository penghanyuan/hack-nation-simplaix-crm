import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskCard } from './task-card';

interface Task {
  id: string;
  title: string;
  description: string | null;
  companyName: string | null;
  contactEmails: string[] | null;
  tags: string[] | null;
  status: string;
  priority: string | null;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  color: string;
  onTaskDelete: (taskId: string) => Promise<void>;
}

export function KanbanColumn({ id, title, tasks, color, onTaskDelete }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div className="flex flex-col h-full">
      <div className={`${color} px-4 py-3 rounded-t-lg border-b-2`}>
        <h3 className="font-semibold text-neutral-900">
          {title}
          <span className="ml-2 text-sm font-normal text-neutral-600">
            ({tasks.length})
          </span>
        </h3>
      </div>
      <div
        ref={setNodeRef}
        className="flex-1 bg-neutral-50 rounded-b-lg p-3 min-h-[400px] overflow-y-auto"
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onDelete={onTaskDelete} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-32 text-sm text-neutral-400">
            No tasks
          </div>
        )}
      </div>
    </div>
  );
}

