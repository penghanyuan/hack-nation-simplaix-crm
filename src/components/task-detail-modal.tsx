"use client";

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Calendar, User, Tag, Copy, Check, Mail, AlertCircle, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

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

interface TaskResult {
  id: string;
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  emailSubject: string | null;
  emailBody: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TaskDetailModalProps {
  task: Task;
  contacts: Contact[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetailModal({ task, contacts, open, onOpenChange }: TaskDetailModalProps) {
  const [copied, setCopied] = useState(false);
  const [taskResult, setTaskResult] = useState<TaskResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [creatingDraft, setCreatingDraft] = useState(false);

  useEffect(() => {
    if (open) {
      fetchTaskResult();
    }
  }, [open, task.id]);

  const fetchTaskResult = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/result`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTaskResult(data.result);
        }
      }
    } catch (error) {
      console.error('Failed to fetch task result:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!taskResult?.emailBody) return;

    const emailContent = `Subject: ${taskResult.emailSubject || 'No subject'}

${taskResult.emailBody}`;

    try {
      await navigator.clipboard.writeText(emailContent);
      setCopied(true);
      toast.success('Email content copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleCreateDraft = async () => {
    if (!taskResult?.emailBody || !taskResult?.emailSubject) {
      toast.error('No email content available to create draft');
      return;
    }

    if (!task.contactEmails || task.contactEmails.length === 0) {
      toast.error('No recipient email found for this task');
      return;
    }

    setCreatingDraft(true);

    try {
      const response = await fetch('/api/gmail/create-draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: task.contactEmails,
          subject: taskResult.emailSubject,
          emailBody: taskResult.emailBody,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create Gmail draft');
      }

      toast.success('Gmail draft created successfully!', {
        description: 'Check your Gmail drafts folder',
      });
    } catch (error) {
      console.error('Error creating Gmail draft:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to create Gmail draft',
        {
          description: error instanceof Error && error.message.includes('not connected')
            ? 'Please connect your Gmail account in settings'
            : undefined,
        }
      );
    } finally {
      setCreatingDraft(false);
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const tags = task.tags && task.tags.length > 0 ? task.tags : ['auto'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold pr-8">{task.title}</DialogTitle>
          <DialogDescription>
            Task details and generated content
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Task Metadata */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`text-sm ${getStatusColor(task.status)}`} variant="outline">
                {getStatusLabel(task.status)}
              </Badge>
              {task.priority && (
                <Badge className="text-sm" variant={getPriorityColor(task.priority) as any}>
                  {task.priority}
                </Badge>
              )}
            </div>

            {task.description && (
              <div>
                <h3 className="text-sm font-semibold text-neutral-700 mb-2">Description</h3>
                <p className="text-sm text-neutral-600">{task.description}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Linked Contacts */}
              {contacts.length > 0 && (
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-neutral-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-neutral-700">Contacts</p>
                    <div className="flex flex-col gap-1 mt-1">
                      {contacts.map((contact) => (
                        <Link
                          key={contact.id}
                          href={`/people?email=${encodeURIComponent(contact.email)}`}
                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                          onClick={() => onOpenChange(false)}
                        >
                          {contact.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Due Date */}
              {task.dueDate && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-neutral-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-neutral-700">Due Date</p>
                    <p className="text-sm text-neutral-600 mt-1">
                      {formatDate(task.dueDate)}
                    </p>
                  </div>
                </div>
              )}

              {/* Company */}
              {task.companyName && (
                <div>
                  <p className="text-sm font-semibold text-neutral-700">Company</p>
                  <p className="text-sm text-neutral-600 mt-1">{task.companyName}</p>
                </div>
              )}

              {/* Tags */}
              <div className="flex items-start gap-2">
                <Tag className="h-4 w-4 text-neutral-400 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-neutral-700">Tags</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {tags.map((tag, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="text-xs bg-neutral-100 text-neutral-700"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Email Draft Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-neutral-600" />
                <h3 className="text-lg font-semibold text-neutral-900">AI Generated Result</h3>
              </div>
              {taskResult?.status === 'completed' && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopy}
                    className="gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCreateDraft}
                    disabled={creatingDraft}
                    className="gap-2"
                  >
                    {creatingDraft ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Draft
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
              </div>
            )}

            {!loading && !taskResult && (
              <div className="text-center py-12 bg-neutral-50 rounded-lg border border-neutral-200">
                {/* <Mail className="h-12 w-12 text-neutral-400 mx-auto mb-3" /> */}
                <p className="text-sm text-neutral-600">
                  No result available for this task.
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  AI results are generated for tasks with &quot;auto&quot; and &quot;email&quot; tags when moved to In Progress.
                </p>
              </div>
            )}

            {!loading && taskResult && taskResult.status === 'processing' && (
              <div className="text-center py-12 bg-blue-50 rounded-lg border border-blue-200">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-3" />
                <p className="text-sm text-blue-700 font-medium">
                  Generating AI result...
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  This may take a few moments.
                </p>
              </div>
            )}

            {!loading && taskResult && taskResult.status === 'error' && (
              <div className="text-center py-12 bg-red-50 rounded-lg border border-red-200">
                <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-3" />
                <p className="text-sm text-red-700 font-medium">
                  Failed to generate email draft
                </p>
                {taskResult.errorMessage && (
                  <p className="text-xs text-red-600 mt-1">
                    {taskResult.errorMessage}
                  </p>
                )}
              </div>
            )}

            {!loading && taskResult && taskResult.status === 'completed' && (
              <div className="space-y-4">
                <div className="bg-neutral-50 rounded-lg border border-neutral-200 p-4">
                  <p className="text-xs font-semibold text-neutral-500 uppercase mb-2">
                    Subject
                  </p>
                  <p className="text-base font-medium text-neutral-900">
                    {taskResult.emailSubject || 'No subject'}
                  </p>
                </div>

                <div className="bg-neutral-50 rounded-lg border border-neutral-200 p-4">
                  <p className="text-xs font-semibold text-neutral-500 uppercase mb-3">
                    Email Body
                  </p>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-sm text-neutral-900 whitespace-pre-wrap leading-relaxed">
                      {taskResult.emailBody}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

