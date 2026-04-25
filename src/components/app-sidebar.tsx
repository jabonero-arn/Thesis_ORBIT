"use client"

import { Hash } from "lucide-react"
import { useMemo } from "react"
import type { Channel, Department } from "@/lib/types"

type AppSidebarProps = {
  department: Department | undefined;
  channelsInDept: Channel[];
  selectedChannelId: string | null;
  onChannelSelect: (id: string) => void
}

export function AppSidebar({ department, channelsInDept, selectedChannelId, onChannelSelect }: AppSidebarProps) {
  return (
    <div className="flex-1 py-4">
      {department && (
        <div>
          <h2 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
            {department.name} Rooms
          </h2>
          <ul className="flex flex-col gap-1">
            {channelsInDept.map((channel) => (
              <li key={channel.id}>
                <button
                  onClick={() => onChannelSelect(channel.id)}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${
                    selectedChannelId === channel.id
                      ? 'bg-accent text-white'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-white'
                  }`}
                >
                  <Hash className="h-5 w-5" />
                  <span className="truncate">{channel.name.replace(/#/g, '')}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
