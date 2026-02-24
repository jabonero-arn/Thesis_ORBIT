"use client"

import {
  CircuitBoard,
  FlaskConical,
  Cog,
  HardDrive,
  TestTube2,
  Hash,
} from "lucide-react"

import { channels } from "@/lib/data"

type AppSidebarProps = {
  departmentPrefix: string;
  selectedChannelId: string
  onChannelSelect: (id: string) => void
}

const departments = [
  { name: "Computer Labs", prefix: "computer-lab"},
  { name: "Chemistry Labs", prefix: "chemistry-lab"},
  { name: "Robotics Labs", prefix: "robotics-lab"},
]

export function AppSidebar({ departmentPrefix, selectedChannelId, onChannelSelect }: AppSidebarProps) {
  const department = departments.find(d => d.prefix === departmentPrefix);
  const departmentChannels = channels.filter(c => c.id.startsWith(departmentPrefix));

  return (
    <div className="flex-1 py-4">
      {department && (
        <div>
          <h2 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
            {department.name}
          </h2>
          <ul className="flex flex-col gap-1">
            {departmentChannels.map((channel) => (
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
