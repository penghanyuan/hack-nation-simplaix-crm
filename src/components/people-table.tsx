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
    <div className="bg-white rounded-sm shadow-md">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-neutral-200 hover:bg-transparent">
            <TableHead className="text-neutral-900 font-medium">Name</TableHead>
            <TableHead className="text-neutral-900 font-medium">Email</TableHead>
            <TableHead className="text-neutral-900 font-medium">Created by</TableHead>
            <TableHead className="text-neutral-900 font-medium">Company</TableHead>
            <TableHead className="text-neutral-900 font-medium">Job Title</TableHead>
            <TableHead className="text-neutral-900 font-medium">Creation date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => (
            <TableRow
              key={contact.id}
              className="border-b border-neutral-100 hover:bg-neutral-100 cursor-pointer"
            >
              <TableCell className="font-medium text-neutral-900">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-700 text-sm font-medium">
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  {contact.name}
                </div>
              </TableCell>
              <TableCell className="text-neutral-700">{contact.email}</TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className="bg-sky-50 text-sky-600 hover:bg-sky-100 border-0"
                >
                  System
                </Badge>
              </TableCell>
              <TableCell className="text-neutral-700">
                <div className="flex items-center gap-2">
                  {contact.companyName && (
                    <>
                      <div className="size-5 bg-neutral-800 rounded-sm" />
                      {contact.companyName}
                    </>
                  )}
                  {!contact.companyName && (
                    <span className="text-neutral-500">-</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-neutral-700">
                {contact.title || <span className="text-neutral-500">-</span>}
              </TableCell>
              <TableCell className="text-neutral-500 text-sm">
                {formatDistanceToNow(new Date(contact.createdAt), { addSuffix: true })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

