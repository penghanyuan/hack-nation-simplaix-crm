"use client";

import { useState, useMemo, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { KanbanColumn } from './kanban-column';
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

interface KanbanBoardProps {
  tasks: Task[];
  onTaskUpdate: (taskId: string, newStatus: string) => Promise<void>;
  onTaskDelete: (taskId: string) => Promise<void>;
}

const COLUMNS = [
  { id: 'todo', title: 'To Do', color: 'bg-blue-50 border-blue-300' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-yellow-50 border-yellow-300' },
  { id: 'done', title: 'Done', color: 'bg-green-50 border-green-300' },
];

export function KanbanBoard({ tasks, onTaskUpdate, onTaskDelete }: KanbanBoardProps) {
  const [items, setItems] = useState<Task[]>(tasks);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [originalStatus, setOriginalStatus] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    return {
      todo: items.filter((task) => task.status === 'todo'),
      in_progress: items.filter((task) => task.status === 'in_progress'),
      done: items.filter((task) => task.status === 'done'),
    };
  }, [items]);

  const activeTask = useMemo(() => {
    return items.find((task) => task.id === activeId);
  }, [activeId, items]);

  function handleDragStart(event: DragStartEvent) {
    const taskId = event.active.id as string;
    setActiveId(taskId);
    
    // Store the original status before any optimistic updates
    const task = items.find((t) => t.id === taskId);
    if (task) {
      setOriginalStatus(task.status);
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the task being dragged
    const activeTask = items.find((task) => task.id === activeId);
    if (!activeTask) return;

    // Determine the target status
    let targetStatus: string;
    
    // Check if we're over a column
    if (COLUMNS.some(col => col.id === overId)) {
      targetStatus = overId;
    } else {
      // We're over another task, find its status
      const overTask = items.find((task) => task.id === overId);
      if (!overTask) return;
      targetStatus = overTask.status;
    }

    // If the status changed, update the task
    if (activeTask.status !== targetStatus) {
      setItems((items) => {
        return items.map((task) => {
          if (task.id === activeId) {
            return { ...task, status: targetStatus };
          }
          return task;
        });
      });
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      setOriginalStatus(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = items.find((task) => task.id === activeId);
    if (!activeTask) {
      setActiveId(null);
      setOriginalStatus(null);
      return;
    }

    let finalStatus = activeTask.status;

    // Determine the final status based on where it was dropped
    if (COLUMNS.some(col => col.id === overId)) {
      // Dropped over a column
      finalStatus = overId;
    } else {
      // Dropped over another task
      const overTask = items.find((task) => task.id === overId);
      if (overTask) {
        finalStatus = overTask.status;
        
        // If in the same status, reorder the tasks
        if (activeTask.status === overTask.status) {
          setItems((items) => {
            const tasksInStatus = items.filter((task) => task.status === activeTask.status);
            const oldIndex = tasksInStatus.findIndex((task) => task.id === activeId);
            const newIndex = tasksInStatus.findIndex((task) => task.id === overId);

            const reordered = arrayMove(tasksInStatus, oldIndex, newIndex);
            
            // Replace the tasks in this status with the reordered ones
            return items.map((task) => {
              if (task.status === activeTask.status) {
                const index = reordered.findIndex((t) => t.id === task.id);
                return reordered[index];
              }
              return task;
            });
          });
        }
      }
    }

    // Update database if status actually changed from the original
    if (originalStatus && finalStatus !== originalStatus) {
      try {
        await onTaskUpdate(activeId, finalStatus);
      } catch (error) {
        console.error('Failed to update task:', error);
        // Revert the optimistic update
        setItems(tasks);
      }
    }

    setActiveId(null);
    setOriginalStatus(null);
  }

  // Update items when tasks prop changes
  useEffect(() => {
    setItems(tasks);
  }, [tasks]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
        {COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            tasks={tasksByStatus[column.id as keyof typeof tasksByStatus]}
            color={column.color}
            onTaskDelete={onTaskDelete}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="rotate-3 scale-105">
            <TaskCard task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

