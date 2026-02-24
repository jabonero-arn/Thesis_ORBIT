"use client"

import {
  CircuitBoard,
  FlaskConical,
  Cog,
  HardDrive,
  TestTube2,
  Bot,
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
  "computer-lab-2": <HardDrive />,
  "chemistry-lab-1": <FlaskConical />,
  "robotics-lab-1": <Bot />,
  "robotics-lab-2": <Cog />,
}

const departments = [
  { name: "Computer Labs", prefix: "computer-lab"},
  { name: "Chemistry Labs", prefix: "chemistry-lab"},
  { name: "Robotics Labs", prefix: "robotics-lab"},
]

export function AppSidebar({ selectedChannelId, onChannelSelect }: AppSidebarProps) {
  return (
    <div className="flex h-full flex-col gap-4 py-2">
      {departments.map(dept => (
        <div key={dept.name}>
          <h2 className="mb-2 px-4 text-sm font-semibold tracking-wider text-sidebar-foreground/60 uppercase">
            {dept.name}
          </h2>
          <SidebarMenu>
            {channels.filter(c => c.id.startsWith(dept.prefix)).map((channel) => (
              <SidebarMenuItem key={channel.id}>
                <SidebarMenuButton
                  onClick={() => onChannelSelect(channel.id)}
                  isActive={selectedChannelId === channel.id}
                  tooltip={channel.description}
                  className="mx-2"
                >
                  {channelIcons[channel.id] || <TestTube2 />}
                  <span className="truncate">{channel.name}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </div>
      ))}
    </div>
  )
}
