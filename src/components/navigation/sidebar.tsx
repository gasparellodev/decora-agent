"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CinematicGlowToggle } from "@/components/ui/cinematic-glow-toggle"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  ShoppingCart,
  Settings,
  LogOut,
  Wifi,
  WifiOff,
  Bot,
  Plug,
  BarChart3,
  CalendarClock,
  FileText,
  BookOpen,
  PanelLeftClose,
  PanelLeft,
  UserCog,
  ThumbsUp,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navigationItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Conversas", href: "/conversations", icon: MessageSquare, badgeKey: "conversations" },
  { name: "Leads", href: "/leads", icon: Users },
  { name: "Pedidos", href: "/orders", icon: ShoppingCart, badgeKey: "orders" },
  { name: "Follow-ups", href: "/follow-ups", icon: CalendarClock },
  { name: "Feedbacks", href: "/feedback", icon: ThumbsUp, badgeKey: "feedbacks" },
  { name: "Templates", href: "/templates", icon: FileText },
  { name: "Conhecimento", href: "/knowledge", icon: BookOpen },
  { name: "Usuários", href: "/users", icon: UserCog },
  { name: "Métricas", href: "/metrics", icon: BarChart3 },
  { name: "Integrações", href: "/integrations", icon: Plug },
]

type SidebarProps = {
  isCollapsed: boolean
  onToggleCollapse: () => void
  onCloseMobile?: () => void
  isMobile?: boolean
}

export function Sidebar({
  isCollapsed,
  onToggleCollapse,
  onCloseMobile,
  isMobile = false,
}: SidebarProps) {
  const pathname = usePathname()
  const supabase = createClient()
  const [whatsappStatus, setWhatsappStatus] = useState<
    "connected" | "disconnected" | "connecting"
  >("disconnected")
  const [agentEnabled, setAgentEnabled] = useState(true)
  const [badges, setBadges] = useState<Record<string, number>>({})

  useEffect(() => {
    fetch("/api/whatsapp/connect")
      .then((res) => res.json())
      .then((data) => {
        if (data.connected) {
          setWhatsappStatus("connected")
        } else if (data.status === "connecting") {
          setWhatsappStatus("connecting")
        } else {
          setWhatsappStatus("disconnected")
        }
      })
      .catch(() => setWhatsappStatus("disconnected"))

    supabase
      .from("dc_agent_settings")
      .select("value")
      .eq("key", "agent_enabled")
      .single()
      .then(({ data }) => {
        setAgentEnabled(data?.value === true || data?.value === "true")
      })

    async function fetchBadges() {
      const { count: conversationCount } = await supabase
        .from("dc_conversations")
        .select("*", { count: "exact", head: true })
        .in("status", ["active", "waiting_human"])

      const { count: orderCount } = await supabase
        .from("dc_orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")

      const { count: feedbackCount } = await supabase
        .from("dc_message_feedback")
        .select("*", { count: "exact", head: true })
        .in("status", ["pending", "in_review", "awaiting_response"])

      setBadges({
        conversations: conversationCount || 0,
        orders: orderCount || 0,
        feedbacks: feedbackCount || 0,
      })
    }

    fetchBadges()
  }, [supabase])

  const handleToggleAgent = async (enabled: boolean) => {
    setAgentEnabled(enabled)
    await supabase
      .from("dc_agent_settings")
      .upsert({ key: "agent_enabled", value: enabled })
  }

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href))

  const statusBadge = useMemo(() => {
    if (whatsappStatus === "connected") {
      return { icon: Wifi, label: "Conectado", color: "text-emerald-500" }
    }
    if (whatsappStatus === "connecting") {
      return { icon: Wifi, label: "Conectando...", color: "text-amber-500" }
    }
    return { icon: WifiOff, label: "Desconectado", color: "text-red-500" }
  }, [whatsappStatus])

  const NavLink = ({ item }: { item: typeof navigationItems[0] }) => {
    const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0
    const active = isActive(item.href)

    const linkContent = (
      <Link
        href={item.href}
        onClick={onCloseMobile}
        className={cn(
          "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
          isCollapsed && "justify-center px-2"
        )}
      >
        <item.icon className="h-5 w-5 shrink-0" />
        {!isCollapsed && (
          <>
            <span className="flex-1 truncate">{item.name}</span>
            {badgeCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white">
                {badgeCount > 99 ? "99+" : badgeCount}
              </span>
            )}
          </>
        )}
        {isCollapsed && badgeCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-sidebar" />
        )}
      </Link>
    )

    if (isCollapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            {item.name}
            {badgeCount > 0 && (
              <span className="rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {badgeCount}
              </span>
            )}
          </TooltipContent>
        </Tooltip>
      )
    }

    return linkContent
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  return (
    <TooltipProvider>
      <div className="relative h-full">
        {/* Toggle Button - Floating on the edge */}
        {!isMobile && (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={onToggleCollapse}
                className={cn(
                  "absolute z-50 flex h-6 w-6 items-center justify-center rounded-full",
                  "bg-sidebar border border-sidebar-border shadow-md",
                  "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                  "transition-all duration-300",
                  "top-[4.5rem] right-0 translate-x-1/2"
                )}
              >
                {isCollapsed ? (
                  <PanelLeft className="h-3.5 w-3.5" />
                ) : (
                  <PanelLeftClose className="h-3.5 w-3.5" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {isCollapsed ? "Expandir menu" : "Recolher menu"}
            </TooltipContent>
          </Tooltip>
        )}

        <div
          className={cn(
            "flex h-full flex-col bg-sidebar text-sidebar-foreground",
            "border-r border-sidebar-border transition-all duration-300 ease-out",
            isCollapsed ? "w-16" : "w-64"
          )}
        >
          {/* Header */}
          <div
            className={cn(
              "flex h-14 shrink-0 items-center border-b border-sidebar-border",
              isCollapsed ? "justify-center px-2" : "px-4"
            )}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-background font-bold text-sm">
                D
              </div>
              {!isCollapsed && (
                <div className="min-w-0">
                  <p className="truncate font-semibold text-sm">Decora Agent</p>
                  <p className="truncate text-[11px] text-sidebar-foreground/60">Painel de Gestão</p>
                </div>
              )}
            </div>
          </div>

          {/* Status - Compact */}
          <div
            className={cn(
              "shrink-0 border-b border-sidebar-border",
              isCollapsed ? "px-2 py-2" : "px-3 py-2"
            )}
          >
            {isCollapsed ? (
              <div className="flex flex-col items-center gap-1">
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <div className={cn("p-1 rounded cursor-default", statusBadge.color)}>
                      <statusBadge.icon className="h-4 w-4" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    WhatsApp {statusBadge.label}
                  </TooltipContent>
                </Tooltip>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleToggleAgent(!agentEnabled)}
                      className={cn(
                        "p-1 rounded transition-colors",
                        agentEnabled 
                          ? "text-emerald-500 hover:bg-emerald-500/10" 
                          : "text-sidebar-foreground/50 hover:bg-sidebar-accent"
                      )}
                    >
                      <Bot className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    Agente IA: {agentEnabled ? "Ativo" : "Inativo"}
                  </TooltipContent>
                </Tooltip>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <statusBadge.icon className={cn("h-3.5 w-3.5", statusBadge.color)} />
                  <span className={cn("text-xs font-medium", statusBadge.color)}>
                    WhatsApp {statusBadge.label}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className={cn("h-3.5 w-3.5", agentEnabled ? "text-emerald-500" : "text-sidebar-foreground/50")} />
                    <span className={cn("text-xs font-medium", agentEnabled ? "text-emerald-500" : "text-sidebar-foreground/50")}>
                      Agente IA
                    </span>
                  </div>
                  <CinematicGlowToggle
                    checked={agentEnabled}
                    onCheckedChange={handleToggleAgent}
                    size="sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Navigation - Scrollable */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <nav className={cn("space-y-0.5", isCollapsed ? "px-2 py-2" : "px-2 py-2")}>
                {navigationItems.map((item) => (
                  <NavLink key={item.href} item={item} />
                ))}
              </nav>
            </ScrollArea>
          </div>

          {/* Footer - Always visible */}
          <div
            className={cn(
              "shrink-0 border-t border-sidebar-border mt-auto",
              isCollapsed ? "px-2 py-2" : "px-2 py-2"
            )}
          >
            <div className={cn("space-y-0.5", isCollapsed && "flex flex-col items-center")}>
              {isCollapsed ? (
                <>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Link
                        href="/settings"
                        className="flex items-center justify-center rounded-lg p-2 text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
                      >
                        <Settings className="h-5 w-5" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">Configurações</TooltipContent>
                  </Tooltip>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={handleLogout}
                        className="flex items-center justify-center rounded-lg p-2 text-red-500/70 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                      >
                        <LogOut className="h-5 w-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Sair</TooltipContent>
                  </Tooltip>
                </>
              ) : (
                <>
                  <Link
                    href="/settings"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
                  >
                    <Settings className="h-5 w-5" />
                    <span>Configurações</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-500/70 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Sair</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
