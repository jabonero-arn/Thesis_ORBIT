"use client"

import {
  CircuitBoard,
  FlaskConical,
  Cog,
} from "lucide-react"

import { channels } from "@/lib/data"
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"

type AppSidebarProps = {
  selectedChannelId: string
  onChannelSelect: (id: string) => void
}

const channelIcons: { [key: string]: React.ReactNode } = {
  "computer-lab-1": <CircuitBoard />,
  "computer-lab-2": <CircuitBoard />,
  "chemistry-lab-1": <FlaskConical />,
  "robotics-lab-1": <Cog />,
  "robotics-lab-2": <Cog />,
}

export function AppSidebar({ selectedChannelId, onChannelSelect }: AppSidebarProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="p-2">
        <h2 className="px-2 text-xs font-semibold text-sidebar-foreground/70">
          Laboratories
        </h2>
      </div>
      <SidebarMenu>
        {channels.map((channel) => (
          <SidebarMenuItem key={channel.id}>
            <SidebarMenuButton
              onClick={() => onChannelSelect(channel.id)}
              isActive={selectedChannelId === channel.id}
              tooltip={channel.description}
            >
              {channelIcons[channel.id] || <FlaskConical />}
              <span className="truncate">{channel.name}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </div>
  )
}
