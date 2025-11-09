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
import type { Deal } from "@/db/schema"

interface DealsTableProps {
  deals: Deal[]
  isLoading?: boolean
}

interface EditingCell {
  dealId: string
  field: keyof Deal
}

const stageColors: Record<string, string> = {
  new: "bg-blue-50 text-blue-600 hover:bg-blue-100",
  in_discussion: "bg-purple-50 text-purple-600 hover:bg-purple-100",
  proposal: "bg-yellow-50 text-yellow-600 hover:bg-yellow-100",
  won: "bg-green-50 text-green-600 hover:bg-green-100",
  lost: "bg-red-50 text-red-600 hover:bg-red-100",
}

const stageLabels: Record<string, string> = {
  new: "New",
  in_discussion: "In Discussion",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
}

export function DealsTable({ deals, isLoading }: DealsTableProps) {
  const [editingCell, setEditingCell] = React.useState<EditingCell | null>(null)
  const [editValue, setEditValue] = React.useState("")
  const [hoveredCell, setHoveredCell] = React.useState<EditingCell | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [dealToDelete, setDealToDelete] = React.useState<Deal | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingCell])

  const handleCellClick = (dealId: string, field: keyof Deal, currentValue: string | number | null | undefined) => {
    setEditingCell({ dealId, field })
    setEditValue(currentValue?.toString() || "")
  }

  const handleSave = async (dealId: string, field: keyof Deal) => {
    try {
      let value: string | number | null = editValue
      
      // Convert to number for amount field
      if (field === 'amount') {
        value = editValue ? parseInt(editValue, 10) : null
      }

      const response = await fetch(`/api/deals/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      })

      if (!response.ok) {
        throw new Error("Failed to update deal")
      }

      // Revalidate the deals cache
      await globalMutate('/api/deals')
      
      toast.success("Deal updated successfully")
      setEditingCell(null)
    } catch (error) {
      console.error("Error updating deal:", error)
      toast.error("Failed to update deal")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, dealId: string, field: keyof Deal) => {
    if (e.key === "Enter") {
      handleSave(dealId, field)
    } else if (e.key === "Escape") {
      setEditingCell(null)
    }
  }

  const handleBlur = (dealId: string, field: keyof Deal) => {
    handleSave(dealId, field)
  }

  const handleDelete = async () => {
    if (!dealToDelete) return

    try {
      const response = await fetch(`/api/deals/${dealToDelete.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete deal")
      }

      // Revalidate the deals cache
      await globalMutate('/api/deals')
      
      toast.success(`${dealToDelete.title} has been deleted`)
      setDeleteDialogOpen(false)
      setDealToDelete(null)
    } catch (error) {
      console.error("Error deleting deal:", error)
      toast.error("Failed to delete deal")
    }
  }

  const confirmDelete = (deal: Deal) => {
    setDealToDelete(deal)
    setDeleteDialogOpen(true)
  }

  const renderEditableCell = (
    deal: Deal,
    field: keyof Deal,
    currentValue: string | number | null | undefined,
    className?: string
  ) => {
    const isEditing = editingCell?.dealId === deal.id && editingCell?.field === field
    const isHovered = hoveredCell?.dealId === deal.id && hoveredCell?.field === field

    if (isEditing) {
      return (
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, deal.id, field)}
          onBlur={() => handleBlur(deal.id, field)}
          className="h-7 text-xs sm:text-sm"
        />
      )
    }

    return (
      <div
        onClick={() => handleCellClick(deal.id, field, currentValue)}
        onMouseEnter={() => setHoveredCell({ dealId: deal.id, field })}
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

  if (!deals || deals.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-neutral-50 rounded-sm shadow-md">
        <p className="text-neutral-500">No deals found</p>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-sm shadow-md overflow-auto h-full w-full">
        <Table>
          <TableHeader className="sticky top-0 bg-white z-10">
            <TableRow className="border-b border-neutral-200 hover:bg-transparent">
              <TableHead className="text-neutral-900 font-medium whitespace-nowrap text-xs sm:text-sm min-w-[180px] sm:min-w-[220px]">
                Title
              </TableHead>
              <TableHead className="text-neutral-900 font-medium whitespace-nowrap text-xs sm:text-sm min-w-[110px] sm:min-w-[140px]">
                Company
              </TableHead>
              <TableHead className="text-neutral-900 font-medium whitespace-nowrap text-xs sm:text-sm min-w-[140px] sm:min-w-[180px]">
                Contact Email
              </TableHead>
              <TableHead className="text-neutral-900 font-medium whitespace-nowrap text-xs sm:text-sm min-w-[100px] sm:min-w-[120px]">
                Stage
              </TableHead>
              <TableHead className="text-neutral-900 font-medium whitespace-nowrap text-xs sm:text-sm min-w-[100px] sm:min-w-[120px]">
                Amount
              </TableHead>
              <TableHead className="text-neutral-900 font-medium whitespace-nowrap text-xs sm:text-sm min-w-[140px] sm:min-w-[180px]">
                Next Action
              </TableHead>
              <TableHead className="text-neutral-900 font-medium whitespace-nowrap text-xs sm:text-sm min-w-[110px] sm:min-w-[140px]">
                Creation date
              </TableHead>
              <TableHead className="text-neutral-900 font-medium whitespace-nowrap text-xs sm:text-sm w-[60px]">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deals.map((deal) => (
              <TableRow
                key={deal.id}
                className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors"
              >
                {/* Title */}
                <TableCell className="font-medium text-neutral-900 whitespace-nowrap text-xs sm:text-sm">
                  {renderEditableCell(
                    deal,
                    "title",
                    deal.title,
                    "truncate max-w-[160px] sm:max-w-[200px]"
                  )}
                </TableCell>

                {/* Company */}
                <TableCell className="text-neutral-700 whitespace-nowrap text-xs sm:text-sm">
                  {renderEditableCell(
                    deal,
                    "companyName",
                    deal.companyName,
                    "truncate max-w-[90px] sm:max-w-[120px]"
                  )}
                </TableCell>

                {/* Contact Email */}
                <TableCell className="text-neutral-700 whitespace-nowrap text-xs sm:text-sm">
                  {renderEditableCell(
                    deal,
                    "contactEmail",
                    deal.contactEmail,
                    "truncate max-w-[120px] sm:max-w-[160px]"
                  )}
                </TableCell>

                {/* Stage */}
                <TableCell className="whitespace-nowrap">
                  <Badge
                    variant="secondary"
                    className={`${stageColors[deal.stage]} border-0 text-[10px] sm:text-xs`}
                  >
                    {stageLabels[deal.stage]}
                  </Badge>
                </TableCell>

                {/* Amount */}
                <TableCell className="text-neutral-700 whitespace-nowrap text-xs sm:text-sm">
                  {renderEditableCell(
                    deal,
                    "amount",
                    deal.amount ? `$${deal.amount.toLocaleString()}` : null,
                    "truncate max-w-[80px] sm:max-w-[100px]"
                  )}
                </TableCell>

                {/* Next Action */}
                <TableCell className="text-neutral-700 whitespace-nowrap text-xs sm:text-sm">
                  {renderEditableCell(
                    deal,
                    "nextAction",
                    deal.nextAction,
                    "truncate max-w-[120px] sm:max-w-[160px]"
                  )}
                </TableCell>

                {/* Creation date */}
                <TableCell className="text-neutral-500 text-xs sm:text-sm whitespace-nowrap">
                  {formatDistanceToNow(new Date(deal.createdAt), { addSuffix: true })}
                </TableCell>

                {/* Actions */}
                <TableCell className="whitespace-nowrap">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => confirmDelete(deal)}
                    className="h-7 w-7 text-neutral-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{dealToDelete?.title}</strong>? This action cannot be undone.
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

