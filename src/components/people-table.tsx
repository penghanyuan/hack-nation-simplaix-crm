"use client"

import * as React from "react"
import { formatDistanceToNow } from "date-fns"
import { Pencil, Trash2 } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { mutate as globalMutate } from "swr"
import type { Contact } from "@/db/schema"

interface PeopleTableProps {
  contacts: Contact[]
  isLoading?: boolean
  highlightEmail?: string | null
}

interface EditingCell {
  contactId: string
  field: keyof Contact
}

export function PeopleTable({ contacts, isLoading, highlightEmail }: PeopleTableProps) {
  const [editingCell, setEditingCell] = React.useState<EditingCell | null>(null)
  const [editValue, setEditValue] = React.useState("")
  const [hoveredCell, setHoveredCell] = React.useState<EditingCell | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [contactToDelete, setContactToDelete] = React.useState<Contact | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const highlightedRowRef = React.useRef<HTMLTableRowElement>(null)

  React.useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingCell])

  // Scroll to highlighted contact
  React.useEffect(() => {
    if (highlightEmail && highlightedRowRef.current) {
      highlightedRowRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      })
    }
  }, [highlightEmail, contacts])

  const handleCellClick = (contactId: string, field: keyof Contact, currentValue: string | null | undefined) => {
    setEditingCell({ contactId, field })
    setEditValue(currentValue || "")
  }

  const handleSave = async (contactId: string, field: keyof Contact) => {
    try {
      const response = await fetch(`/api/contacts/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: editValue }),
      })

      if (!response.ok) {
        throw new Error("Failed to update contact")
      }

      // Revalidate the contacts cache
      await globalMutate('/api/contacts')
      
      toast.success("Contact updated successfully")
      setEditingCell(null)
    } catch (error) {
      console.error("Error updating contact:", error)
      toast.error("Failed to update contact")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, contactId: string, field: keyof Contact) => {
    if (e.key === "Enter") {
      handleSave(contactId, field)
    } else if (e.key === "Escape") {
      setEditingCell(null)
    }
  }

  const handleBlur = (contactId: string, field: keyof Contact) => {
    handleSave(contactId, field)
  }

  const handleDelete = async () => {
    if (!contactToDelete) return

    try {
      const response = await fetch(`/api/contacts/${contactToDelete.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete contact")
      }

      // Revalidate the contacts cache
      await globalMutate('/api/contacts')
      
      toast.success(`${contactToDelete.name} has been deleted`)
      setDeleteDialogOpen(false)
      setContactToDelete(null)
    } catch (error) {
      console.error("Error deleting contact:", error)
      toast.error("Failed to delete contact")
    }
  }

  const confirmDelete = (contact: Contact) => {
    setContactToDelete(contact)
    setDeleteDialogOpen(true)
  }

  const renderEditableCell = (
    contact: Contact,
    field: keyof Contact,
    currentValue: string | null | undefined,
    className?: string
  ) => {
    const isEditing = editingCell?.contactId === contact.id && editingCell?.field === field
    const isHovered = hoveredCell?.contactId === contact.id && hoveredCell?.field === field

    if (isEditing) {
      return (
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, contact.id, field)}
          onBlur={() => handleBlur(contact.id, field)}
          className="h-7 text-xs sm:text-sm"
        />
      )
    }

    return (
      <div
        onClick={() => handleCellClick(contact.id, field, currentValue)}
        onMouseEnter={() => setHoveredCell({ contactId: contact.id, field })}
        onMouseLeave={() => setHoveredCell(null)}
        className={`cursor-pointer rounded px-2 py-1 transition-all relative group ${
          isHovered ? "border border-neutral-300 bg-neutral-50" : "border border-transparent"
        } ${className || ""}`}
      >
        <span className={currentValue ? "" : "text-neutral-400"}>
          {currentValue || "-"}
        </span>
        {isHovered && (
          <Pencil className="absolute right-1 top-1/2 -translate-y-1/2 size-3 text-neutral-400" />
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (!contacts || contacts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-neutral-50 rounded-sm shadow-md">
        <p className="text-neutral-500">No contacts found</p>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-sm shadow-md overflow-auto h-full w-full">
        <Table>
          <TableHeader className="sticky top-0 bg-white z-10">
            <TableRow className="border-b border-neutral-200 hover:bg-transparent">
              <TableHead className="text-neutral-900 font-medium whitespace-nowrap text-xs sm:text-sm min-w-[140px] sm:min-w-[180px]">
                Name
              </TableHead>
              <TableHead className="text-neutral-900 font-medium whitespace-nowrap text-xs sm:text-sm min-w-[140px] sm:min-w-[200px]">
                Emails
              </TableHead>
              <TableHead className="text-neutral-900 font-medium whitespace-nowrap text-xs sm:text-sm min-w-[90px] sm:min-w-[100px]">
                Created by
              </TableHead>
              <TableHead className="text-neutral-900 font-medium whitespace-nowrap text-xs sm:text-sm min-w-[110px] sm:min-w-[140px]">
                Company
              </TableHead>
              <TableHead className="text-neutral-900 font-medium whitespace-nowrap text-xs sm:text-sm min-w-[110px] sm:min-w-[140px]">
                Phones
              </TableHead>
              <TableHead className="text-neutral-900 font-medium whitespace-nowrap text-xs sm:text-sm min-w-[110px] sm:min-w-[140px]">
                Creation date
              </TableHead>
              <TableHead className="text-neutral-900 font-medium whitespace-nowrap text-xs sm:text-sm min-w-[110px] sm:min-w-[140px]">
                City
              </TableHead>
              <TableHead className="text-neutral-900 font-medium whitespace-nowrap text-xs sm:text-sm min-w-[110px] sm:min-w-[140px]">
                Job Title
              </TableHead>
              <TableHead className="text-neutral-900 font-medium whitespace-nowrap text-xs sm:text-sm min-w-[110px] sm:min-w-[140px]">
                LinkedIn
              </TableHead>
              <TableHead className="text-neutral-900 font-medium whitespace-nowrap text-xs sm:text-sm min-w-[80px] sm:min-w-[100px]">
                X
              </TableHead>
              <TableHead className="text-neutral-900 font-medium whitespace-nowrap text-xs sm:text-sm w-[60px]">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
        <TableBody>
          {contacts.map((contact) => {
            const isHighlighted = highlightEmail && contact.email === decodeURIComponent(highlightEmail)
            return (
            <TableRow
              key={contact.id}
              ref={isHighlighted ? highlightedRowRef : undefined}
              className={`border-b border-neutral-100 hover:bg-neutral-50 transition-colors ${
                isHighlighted ? 'bg-blue-50 ring-2 ring-blue-300 ring-inset' : ''
              }`}
            >
              {/* Name */}
              <TableCell className="font-medium text-neutral-900 whitespace-nowrap text-xs sm:text-sm">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="size-6 sm:size-7 md:size-8 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-700 text-[10px] sm:text-xs md:text-sm font-medium shrink-0">
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  {renderEditableCell(
                    contact,
                    "name",
                    contact.name,
                    "truncate max-w-[100px] sm:max-w-[140px]"
                  )}
                </div>
              </TableCell>

              {/* Email */}
              <TableCell className="text-neutral-700 whitespace-nowrap text-xs sm:text-sm">
                {renderEditableCell(
                  contact,
                  "email",
                  contact.email,
                  "truncate max-w-[120px] sm:max-w-[180px]"
                )}
              </TableCell>

              {/* Created by */}
              <TableCell className="whitespace-nowrap">
                <Badge
                  variant="secondary"
                  className="bg-sky-50 text-sky-600 hover:bg-sky-100 border-0 text-[10px] sm:text-xs"
                >
                  System
                </Badge>
              </TableCell>

              {/* Company */}
              <TableCell className="text-neutral-700 whitespace-nowrap text-xs sm:text-sm">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {contact.companyName && (
                    <div className="size-3.5 sm:size-4 md:size-5 bg-neutral-800 rounded-sm shrink-0" />
                  )}
                  {renderEditableCell(
                    contact,
                    "companyName",
                    contact.companyName,
                    "truncate max-w-[80px] sm:max-w-[110px]"
                  )}
                </div>
              </TableCell>

              {/* Phone */}
              <TableCell className="text-neutral-700 whitespace-nowrap text-xs sm:text-sm">
                {renderEditableCell(
                  contact,
                  "phone",
                  contact.phone,
                  "truncate max-w-[90px] sm:max-w-[120px]"
                )}
              </TableCell>

              {/* Creation date */}
              <TableCell className="text-neutral-500 text-xs sm:text-sm whitespace-nowrap">
                {formatDistanceToNow(new Date(contact.createdAt), { addSuffix: true })}
              </TableCell>

              {/* City */}
              <TableCell className="text-neutral-700 whitespace-nowrap text-xs sm:text-sm">
                {renderEditableCell(
                  contact,
                  "city",
                  contact.city,
                  "truncate max-w-[90px] sm:max-w-[120px]"
                )}
              </TableCell>

              {/* Job Title */}
              <TableCell className="text-neutral-700 whitespace-nowrap text-xs sm:text-sm">
                {renderEditableCell(
                  contact,
                  "title",
                  contact.title,
                  "truncate max-w-[90px] sm:max-w-[120px]"
                )}
              </TableCell>

              {/* LinkedIn */}
              <TableCell className="text-neutral-700 whitespace-nowrap text-xs sm:text-sm">
                {renderEditableCell(
                  contact,
                  "linkedin",
                  contact.linkedin,
                  "truncate max-w-[90px] sm:max-w-[120px]"
                )}
              </TableCell>

              {/* X (Twitter) */}
              <TableCell className="text-neutral-700 whitespace-nowrap text-xs sm:text-sm">
                {renderEditableCell(
                  contact,
                  "x",
                  contact.x,
                  "truncate max-w-[70px] sm:max-w-[90px]"
                )}
              </TableCell>

              {/* Actions */}
              <TableCell className="whitespace-nowrap">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => confirmDelete(contact)}
                  className="h-7 w-7 text-neutral-400 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          )})}
        </TableBody>
      </Table>
    </div>

    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Contact</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{contactToDelete?.name}</strong>? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
