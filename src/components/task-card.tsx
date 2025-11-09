import { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { GripVertical, Trash2, Calendar, User, Tag } from 'lucide-react';
import Link from 'next/link';
import { TaskDetailModal } from './task-detail-modal';

interface Contact {
  id: string;
  name: string;
  email: string;
}

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

interface TaskCardProps {
  task: Task;
  onDelete?: (taskId: string) => Promise<void>;
}

export function TaskCard({ task, onDelete }: TaskCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [hasResult, setHasResult] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  // Fetch contact details for the task
  useEffect(() => {
    async function fetchContacts() {
      if (!task.contactEmails || task.contactEmails.length === 0) return;

      try {
        const response = await fetch('/api/contacts');
        if (!response.ok) return;

        const allContacts = await response.json();
        const taskContacts = allContacts.filter((c: Contact) => 
          task.contactEmails?.includes(c.email)
        );
        setContacts(taskContacts);
      } catch (error) {
        console.error('Failed to fetch contacts:', error);
      }
    }

    fetchContacts();
  }, [task.contactEmails]);

  // Check if task has a completed result
  useEffect(() => {
    async function checkForResult() {
      try {
        const response = await fetch(`/api/tasks/${task.id}/result`);
        if (response.ok) {
          const data = await response.json();
          setHasResult(data.success && data.result?.status === 'completed');
        }
      } catch (error) {
        // No result found, that's okay
      }
    }

    checkForResult();
    
    // Poll for result updates when task is in progress with email tag
    const taskTags = task.tags && Array.isArray(task.tags) ? task.tags : [];
    if (task.status === 'in_progress' && taskTags.includes('email')) {
      const interval = setInterval(checkForResult, 5000); // Check every 5 seconds
      return () => clearInterval(interval);
    }
  }, [task.id, task.status, task.tags]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(task.id);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Failed to delete task:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'in_progress':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'In Progress';
      case 'done':
        return 'Done';
      default:
        return 'To Do';
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  const formatDueDate = (dueDate: string) => {
    const date = new Date(dueDate);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `Overdue by ${Math.abs(diffDays)}d`, color: 'text-red-600' };
    } else if (diffDays === 0) {
      return { text: 'Due today', color: 'text-orange-600' };
    } else if (diffDays === 1) {
      return { text: 'Due tomorrow', color: 'text-orange-600' };
    } else if (diffDays <= 7) {
      return { text: `Due in ${diffDays}d`, color: 'text-neutral-600' };
    } else {
      return { text: date.toLocaleDateString(), color: 'text-neutral-600' };
    }
  };

  const tags = task.tags && task.tags.length > 0 ? task.tags : ['auto'];
  const dueDateInfo = task.dueDate ? formatDueDate(task.dueDate) : null;

  return (
    <>
      <div ref={setNodeRef} style={style} {...attributes} className="mb-3">
        <Card 
          className="hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing relative"
          onClick={(e) => {
            // Only open modal if clicking on the card itself, not child buttons
            if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.card-clickable')) {
              e.stopPropagation();
              setShowDetailModal(true);
            }
          }}
        >
          {/* Red dot indicator */}
          {hasResult && (
            <div className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full ring-2 ring-white shadow-lg z-10" 
                 title="Email draft ready"
            />
          )}
          
          <CardHeader className="pb-3 space-y-0 card-clickable">
            <div className="flex items-start justify-between gap-2" {...listeners}>
              <div className="flex-1 space-y-2">
                <CardTitle className="text-base font-semibold leading-tight line-clamp-2">
                  {task.title}
                </CardTitle>
                
                {/* Status and Priority Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`text-xs ${getStatusColor(task.status)}`} variant="outline">
                    {getStatusLabel(task.status)}
                  </Badge>
                  {task.priority && (
                    <Badge
                      className="text-xs"
                      variant={getPriorityColor(task.priority) as any}
                    >
                      {task.priority}
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex items-start gap-1">
                <div className="cursor-grab active:cursor-grabbing">
                  <GripVertical className="h-4 w-4 text-neutral-400" />
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-3 card-clickable">
            {/* Description */}
            {task.description && (
              <p className="text-sm text-neutral-600 line-clamp-2">
                {task.description}
              </p>
            )}

            {/* Linked Contact */}
            {contacts.length > 0 && (
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-neutral-400" />
                <div className="flex flex-wrap gap-1.5 items-center">
                  {contacts.slice(0, 2).map((contact, idx) => (
                    <Link 
                      key={contact.id}
                      href={`/people?email=${encodeURIComponent(contact.email)}`}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {contact.name}
                    </Link>
                  ))}
                  {contacts.length > 2 && (
                    <span className="text-sm text-neutral-500">
                      +{contacts.length - 2} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Due Date */}
            {task.dueDate && dueDateInfo && (
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                <span className={`text-sm font-medium ${dueDateInfo.color}`}>
                  {dueDateInfo.text}
                </span>
              </div>
            )}

            {/* Tags */}
            <div className="flex items-center gap-2">
              <Tag className="h-3.5 w-3.5 text-neutral-400" />
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag, idx) => (
                  <Badge 
                    key={idx} 
                    variant="secondary" 
                    className="text-xs bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Delete Button */}
            {onDelete && (
              <div className="flex justify-end pt-1 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-neutral-400 hover:text-red-600 hover:bg-red-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteDialog(true);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Delete
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Task</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{task.title}&quot;? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <TaskDetailModal
      task={task}
      contacts={contacts}
      open={showDetailModal}
      onOpenChange={setShowDetailModal}
    />
    </>
  );
}

