"use client"

import * as React from "react"
import { formatDistanceToNow } from "date-fns"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import type { Contact } from "@/db/schema"

interface PeopleTableProps {
  contacts: Contact[]
  isLoading?: boolean
}

export function PeopleTable({ contacts, isLoading }: PeopleTableProps) {
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
    <div className="bg-white rounded-sm shadow-md overflow-auto h-full w-full">
      <Table>
        <TableHeader className="sticky top-0 bg-white z-10">
          <TableRow className="border-b border-neutral-200 hover:bg-transparent">
            <TableHead className="text-neutral-900 font-medium whitespace-nowrap text-xs sm:text-sm min-w-[140px] sm:min-w-[180px]">Name</TableHead>
            <TableHead className="text-neutral-900 font-medium whitespace-nowrap text-xs sm:text-sm min-w-[140px] sm:min-w-[180px]">Email</TableHead>
            <TableHead className="text-neutral-900 font-medium whitespace-nowrap text-xs sm:text-sm min-w-[90px] sm:min-w-[100px]">Created by</TableHead>
            <TableHead className="text-neutral-900 font-medium whitespace-nowrap text-xs sm:text-sm min-w-[110px] sm:min-w-[140px]">Company</TableHead>
            <TableHead className="text-neutral-900 font-medium whitespace-nowrap text-xs sm:text-sm min-w-[110px] sm:min-w-[140px]">Job Title</TableHead>
            <TableHead className="text-neutral-900 font-medium whitespace-nowrap text-xs sm:text-sm min-w-[110px] sm:min-w-[140px]">Creation date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => (
            <TableRow
              key={contact.id}
              className="border-b border-neutral-100 hover:bg-neutral-100 cursor-pointer"
            >
              <TableCell className="font-medium text-neutral-900 whitespace-nowrap text-xs sm:text-sm">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="size-6 sm:size-7 md:size-8 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-700 text-[10px] sm:text-xs md:text-sm font-medium shrink-0">
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate max-w-[100px] sm:max-w-[140px]">{contact.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-neutral-700 whitespace-nowrap text-xs sm:text-sm">
                <span className="truncate block max-w-[120px] sm:max-w-[160px]">{contact.email}</span>
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <Badge
                  variant="secondary"
                  className="bg-sky-50 text-sky-600 hover:bg-sky-100 border-0 text-[10px] sm:text-xs"
                >
                  System
                </Badge>
              </TableCell>
              <TableCell className="text-neutral-700 whitespace-nowrap text-xs sm:text-sm">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {contact.companyName && (
                    <>
                      <div className="size-3.5 sm:size-4 md:size-5 bg-neutral-800 rounded-sm shrink-0" />
                      <span className="truncate max-w-[80px] sm:max-w-[110px]">{contact.companyName}</span>
                    </>
                  )}
                  {!contact.companyName && (
                    <span className="text-neutral-500">-</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-neutral-700 whitespace-nowrap text-xs sm:text-sm">
                <span className="truncate block max-w-[90px] sm:max-w-[120px]">{contact.title || <span className="text-neutral-500">-</span>}</span>
              </TableCell>
              <TableCell className="text-neutral-500 text-xs sm:text-sm whitespace-nowrap">
                {formatDistanceToNow(new Date(contact.createdAt), { addSuffix: true })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

