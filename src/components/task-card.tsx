import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GripVertical } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string | null;
  companyName: string | null;
  contactEmails: string[] | null;
  status: string;
  priority: string | null;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TaskCardProps {
  task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-neutral-100 text-neutral-800 border-neutral-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
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

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="mb-3">
      <Card className="hover:shadow-md transition-shadow cursor-move">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <CardTitle className="text-sm font-medium line-clamp-2 mb-1.5">
                {task.title}
              </CardTitle>
              <Badge className={`text-xs ${getStatusColor(task.status)}`} variant="outline">
                {getStatusLabel(task.status)}
              </Badge>
            </div>
            <div {...listeners} className="cursor-grab active:cursor-grabbing">
              <GripVertical className="h-4 w-4 text-neutral-400" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {task.description && (
            <p className="text-xs text-neutral-600 line-clamp-2">
              {task.description}
            </p>
          )}
          {task.companyName && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-neutral-500">Company:</span>
              <span className="text-xs text-neutral-900">{task.companyName}</span>
            </div>
          )}
          {task.priority && (
            <Badge
              className={`text-xs ${getPriorityColor(task.priority)}`}
              variant="outline"
            >
              {task.priority}
            </Badge>
          )}
          {task.dueDate && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-neutral-500">Due:</span>
              <span className="text-xs text-neutral-900">
                {new Date(task.dueDate).toLocaleDateString()}
              </span>
            </div>
          )}
          {task.contactEmails && task.contactEmails.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {task.contactEmails.slice(0, 2).map((email, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {email}
                </Badge>
              ))}
              {task.contactEmails.length > 2 && (
                <Badge variant="secondary" className="text-xs">
                  +{task.contactEmails.length - 2}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

