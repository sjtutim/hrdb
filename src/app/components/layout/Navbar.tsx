"use client"

import React from "react"
import Link from "next/link"

import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle
} from "@/app/components/ui/navigation-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuShortcut
} from "@/app/components/ui/dropdown-menu"
import { Button } from "@/app/components/ui/button"
import { ThemeToggle } from "@/app/components/ui/theme-toggle"
import { ChangePasswordDialog } from "./ChangePasswordDialog"
import { ParseQueuePanel } from "./ParseQueuePanel"
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar"
import { Badge } from "@/app/components/ui/badge"
import {
  LogOut,
  Menu,
  ChevronDown,
  Home,
  Users,
  Calendar,
  Briefcase,
  Settings,
  Sparkles,
  UserPlus,
  Search,
  PlusCircle,
  LayoutGrid,
  Shield,
  ChevronRight,
  X
} from "lucide-react"
import { cn } from "@/app/lib/utils"
import { useState, useEffect, useCallback } from "react"

const Navbar = () => {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [allowedMenuKeys, setAllowedMenuKeys] = useState<string[] | null>(null)

  const fetchPermissions = useCallback(async () => {
    if (!session?.user?.role) return
    try {
      const res = await fetch("/api/role-permissions")
      const data: Record<string, string[]> = await res.json()
      const role = session.user.role as string
      // 如果该角色有配置记录则使用，否则 null 表示默认显示全部
      if (data[role]) {
        setAllowedMenuKeys(data[role])
      } else {
        setAllowedMenuKeys(null)
      }
    } catch {
      setAllowedMenuKeys(null)
    }
  }, [session?.user?.role])

  useEffect(() => { fetchPermissions() }, [fetchPermissions])

  // 阻止移动端菜单打开时背景滚动
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [mobileMenuOpen])

  const isMenuVisible = (menuKey: string) => {
    // 未加载或未配置时默认显示全部
    if (allowedMenuKeys === null) return true
    return allowedMenuKeys.includes(menuKey)
  }

  const ListItem = React.forwardRef<
    React.ElementRef<"a">,
    React.ComponentPropsWithoutRef<"a"> & { icon?: React.ReactNode }
  >(({ className, title, children, icon, ...props }, ref) => {
    return (
      <li>
        <NavigationMenuLink asChild>
          <a
            ref={ref}
            className={cn(
              "group flex select-none gap-3 rounded-lg p-3 leading-none no-underline outline-none transition-all duration-200",
              "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
              "border border-transparent hover:border-border/50",
              className
            )}
            {...props}
          >
            {icon && (
              <div className="flex-shrink-0 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                {icon}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium leading-none mb-1">{title}</div>
              <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {children}
              </p>
            </div>
          </a>
        </NavigationMenuLink>
      </li>
    )
  })
  ListItem.displayName = "ListItem"

  // 检查当前路径是否激活
  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(path)
  }

  // 主导航项配置
  const mainNavItems = [
    { key: 'dashboard', href: '/dashboard', label: '仪表盘', icon: Home },
    { key: 'employees', href: '/employees', label: '人才库', icon: LayoutGrid },
    { key: 'admin', href: '/admin', label: '系统管理', icon: Settings, adminOnly: true },
  ]

  return (
    <>
      <header className="sticky top-0 z-50 w-full navbar-professional">
        <div className="container flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="navbar-logo flex items-center gap-2.5 group">
              <div className="navbar-logo-icon h-9 w-9 rounded-xl overflow-hidden flex items-center justify-center">
                <img src="/logo.png" alt="顿慧人才库" width={36} height={36} className="object-cover" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-base hidden sm:inline text-white/95 tracking-tight leading-tight">
                  顿慧人才库
                </span>
                <span className="text-[10px] text-white/40 hidden lg:block leading-tight">AI驱动的人才管理平台</span>
              </div>
            </Link>

            {/* AI Badge */}
            <Badge variant="outline" className="hidden md:flex items-center gap-1.5 border-white/15 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-white/85 text-[10px] px-2 py-0.5 backdrop-blur-sm">
              <Sparkles className="h-3 w-3 text-indigo-300" />
              AI 赋能
            </Badge>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center">
            <nav className="flex items-center gap-1">
              {/* 仪表盘 */}
              {isMenuVisible('dashboard') && (
                <Link
                  href="/dashboard"
                  className={cn(
                    "nav-link-dark",
                    isActive('/dashboard') && "nav-link-dark-active"
                  )}
                >
                  <Home className="mr-1.5 h-4 w-4" />
                  仪表盘
                </Link>
              )}

              {/* 候选人下拉菜单 */}
              {isMenuVisible('candidates') && (
                <NavigationMenu>
                  <NavigationMenuList>
                    <NavigationMenuItem>
                      <NavigationMenuTrigger className={cn(
                        "nav-link-dark h-9",
                        isActive('/candidates') && "nav-link-dark-active"
                      )}>
                        <Users className="mr-1.5 h-4 w-4" />
                        候选人
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <div className="w-[420px] p-4">
                          {/* 顶部横幅 */}
                          <div className="mb-4 p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                                <Users className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <div className="font-semibold text-sm text-foreground">候选人管理</div>
                                <div className="text-xs text-muted-foreground">管理您的人才库和招聘渠道</div>
                              </div>
                            </div>
                          </div>

                          {/* 菜单项 */}
                          <ul className="grid gap-2">
                            <ListItem href="/candidates" title="所有候选人" icon={<LayoutGrid className="h-4 w-4" />}>
                              查看和管理系统中的所有候选人档案
                            </ListItem>
                            <ListItem href="/resume-upload" title="添加候选人" icon={<UserPlus className="h-4 w-4" />}>
                              上传简历，AI自动解析并建立档案
                            </ListItem>
                            {isMenuVisible('candidates:matching') && (
                              <ListItem href="/matching" title="智能匹配" icon={<Search className="h-4 w-4" />}>
                                为职位智能推荐最佳候选人
                              </ListItem>
                            )}
                          </ul>
                        </div>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  </NavigationMenuList>
                </NavigationMenu>
              )}

              {/* 面试下拉菜单 */}
              {isMenuVisible('interviews') && (
                <NavigationMenu>
                  <NavigationMenuList>
                    <NavigationMenuItem>
                      <NavigationMenuTrigger className={cn(
                        "nav-link-dark h-9",
                        isActive('/interviews') && "nav-link-dark-active"
                      )}>
                        <Calendar className="mr-1.5 h-4 w-4" />
                        面试
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <div className="w-[380px] p-4">
                          {/* 顶部横幅 */}
                          <div className="mb-4 p-4 rounded-xl bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-red-500/10 border border-amber-500/20">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
                                <Calendar className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <div className="font-semibold text-sm text-foreground">面试管理</div>
                                <div className="text-xs text-muted-foreground">高效安排和追踪面试流程</div>
                              </div>
                            </div>
                          </div>

                          <ul className="grid gap-2">
                            <ListItem href="/interviews" title="面试列表" icon={<LayoutGrid className="h-4 w-4" />}>
                              查看所有已安排的面试
                            </ListItem>
                            <ListItem href="/interviews/create" title="安排面试" icon={<PlusCircle className="h-4 w-4" />}>
                              为候选人安排新的面试
                            </ListItem>
                            <ListItem href="/interviews/calendar" title="面试日历" icon={<Calendar className="h-4 w-4" />}>
                              以日历视图查看面试安排
                            </ListItem>
                          </ul>
                        </div>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  </NavigationMenuList>
                </NavigationMenu>
              )}

              {/* 职位下拉菜单 */}
              {isMenuVisible('jobs') && (
                <NavigationMenu>
                  <NavigationMenuList>
                    <NavigationMenuItem>
                      <NavigationMenuTrigger className={cn(
                        "nav-link-dark h-9",
                        isActive('/jobs') && "nav-link-dark-active"
                      )}>
                        <Briefcase className="mr-1.5 h-4 w-4" />
                        职位
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <div className="w-[380px] p-4">
                          {/* 顶部横幅 */}
                          <div className="mb-4 p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border border-emerald-500/20">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                                <Briefcase className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <div className="font-semibold text-sm text-foreground">职位管理</div>
                                <div className="text-xs text-muted-foreground">发布和管理招聘职位</div>
                              </div>
                            </div>
                          </div>

                          <ul className="grid gap-2">
                            <ListItem href="/jobs" title="所有职位" icon={<LayoutGrid className="h-4 w-4" />}>
                              查看和管理所有职位发布
                            </ListItem>
                            <ListItem href="/jobs/create" title="发布职位" icon={<PlusCircle className="h-4 w-4" />}>
                              创建新的职位发布
                            </ListItem>
                          </ul>
                        </div>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  </NavigationMenuList>
                </NavigationMenu>
              )}

              {/* 人才库 */}
              {isMenuVisible('employees') && (
                <Link
                  href="/employees"
                  className={cn(
                    "nav-link-dark",
                    isActive('/employees') && "nav-link-dark-active"
                  )}
                >
                  <LayoutGrid className="mr-1.5 h-4 w-4" />
                  人才库
                </Link>
              )}

              {/* 系统管理 - 仅管理员 */}
              {session?.user?.role === 'ADMIN' && (
                <Link
                  href="/admin"
                  className={cn(
                    "nav-link-dark",
                    isActive('/admin') && "nav-link-dark-active"
                  )}
                >
                  <Shield className="mr-1.5 h-4 w-4" />
                  管理
                </Link>
              )}
            </nav>
          </div>

          {/* Right Section: User Menu */}
          <div className="flex items-center gap-2">
            <ParseQueuePanel />
            <ThemeToggle />

            {session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 rounded-full h-9 pl-2 pr-3 hover:bg-white/10 text-white/90 border border-transparent hover:border-white/10 transition-all"
                  >
                    <Avatar className="h-7 w-7 ring-2 ring-white/20">
                      <AvatarImage src={session.user?.image || undefined} alt={session.user?.name || 'User'} />
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-medium">
                        {session.user?.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden lg:inline text-sm font-medium max-w-[100px] truncate text-white/90">
                      {session.user?.name || 'User'}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-white/50 hidden lg:inline" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64" sideOffset={8}>
                  <DropdownMenuLabel className="font-normal p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={session.user?.image || undefined} alt={session.user?.name || 'User'} />
                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                          {session.user?.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <p className="text-sm font-semibold truncate">{session.user?.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{session.user?.email}</p>
                        {session.user?.role && (
                          <Badge variant="secondary" className="w-fit mt-1 text-[10px] px-1.5 py-0">
                            {session.user.role === 'ADMIN' ? '管理员' : session.user.role === 'HR' ? 'HR' : '用户'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <ChangePasswordDialog />
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut()}
                    className="text-destructive cursor-pointer focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    退出登录
                    <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" asChild className="text-white/80 hover:text-white hover:bg-white/10">
                  <Link href="/login">登录</Link>
                </Button>
                <Button size="sm" asChild className="bg-white text-slate-900 hover:bg-white/90">
                  <Link href="/register">注册</Link>
                </Button>
              </div>
            )}

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden hover:bg-white/10 text-white/80 h-9 w-9 rounded-lg"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation - 全屏覆盖式 */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* 背景遮罩 */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* 菜单面板 */}
          <div className="absolute top-16 left-0 right-0 bg-slate-900 border-t border-white/10 shadow-2xl animate-in slide-in-from-top-2">
            <nav className="flex flex-col p-4 gap-1 max-h-[calc(100vh-5rem)] overflow-y-auto">
              {/* 仪表盘 */}
              {isMenuVisible('dashboard') && (
                <MobileNavLink
                  href="/dashboard"
                  icon={<Home className="h-5 w-5" />}
                  label="仪表盘"
                  isActive={isActive('/dashboard')}
                  onClick={() => setMobileMenuOpen(false)}
                />
              )}

              {/* 候选人分组 */}
              {isMenuVisible('candidates') && (
                <MobileNavGroup
                  icon={<Users className="h-5 w-5" />}
                  label="候选人"
                  isActive={isActive('/candidates')}
                >
                  <MobileNavLink
                    href="/candidates"
                    icon={<LayoutGrid className="h-4 w-4" />}
                    label="所有候选人"
                    isActive={pathname === '/candidates'}
                    onClick={() => setMobileMenuOpen(false)}
                    nested
                  />
                  <MobileNavLink
                    href="/resume-upload"
                    icon={<UserPlus className="h-4 w-4" />}
                    label="添加候选人"
                    isActive={pathname === '/resume-upload'}
                    onClick={() => setMobileMenuOpen(false)}
                    nested
                  />
                  {isMenuVisible('candidates:matching') && (
                    <MobileNavLink
                      href="/matching"
                      icon={<Search className="h-4 w-4" />}
                      label="智能匹配"
                      isActive={pathname === '/matching'}
                      onClick={() => setMobileMenuOpen(false)}
                      nested
                    />
                  )}
                </MobileNavGroup>
              )}

              {/* 面试分组 */}
              {isMenuVisible('interviews') && (
                <MobileNavGroup
                  icon={<Calendar className="h-5 w-5" />}
                  label="面试"
                  isActive={isActive('/interviews')}
                >
                  <MobileNavLink
                    href="/interviews"
                    icon={<LayoutGrid className="h-4 w-4" />}
                    label="面试列表"
                    isActive={pathname === '/interviews'}
                    onClick={() => setMobileMenuOpen(false)}
                    nested
                  />
                  <MobileNavLink
                    href="/interviews/create"
                    icon={<PlusCircle className="h-4 w-4" />}
                    label="安排面试"
                    isActive={pathname === '/interviews/create'}
                    onClick={() => setMobileMenuOpen(false)}
                    nested
                  />
                  <MobileNavLink
                    href="/interviews/calendar"
                    icon={<Calendar className="h-4 w-4" />}
                    label="面试日历"
                    isActive={pathname === '/interviews/calendar'}
                    onClick={() => setMobileMenuOpen(false)}
                    nested
                  />
                </MobileNavGroup>
              )}

              {/* 职位分组 */}
              {isMenuVisible('jobs') && (
                <MobileNavGroup
                  icon={<Briefcase className="h-5 w-5" />}
                  label="职位"
                  isActive={isActive('/jobs')}
                >
                  <MobileNavLink
                    href="/jobs"
                    icon={<LayoutGrid className="h-4 w-4" />}
                    label="所有职位"
                    isActive={pathname === '/jobs'}
                    onClick={() => setMobileMenuOpen(false)}
                    nested
                  />
                  <MobileNavLink
                    href="/jobs/create"
                    icon={<PlusCircle className="h-4 w-4" />}
                    label="发布职位"
                    isActive={pathname === '/jobs/create'}
                    onClick={() => setMobileMenuOpen(false)}
                    nested
                  />
                </MobileNavGroup>
              )}

              {/* 人才库 */}
              {isMenuVisible('employees') && (
                <MobileNavLink
                  href="/employees"
                  icon={<LayoutGrid className="h-5 w-5" />}
                  label="人才库"
                  isActive={isActive('/employees')}
                  onClick={() => setMobileMenuOpen(false)}
                />
              )}

              {/* 系统管理 */}
              {session?.user?.role === 'ADMIN' && (
                <MobileNavLink
                  href="/admin"
                  icon={<Shield className="h-5 w-5" />}
                  label="系统管理"
                  isActive={isActive('/admin')}
                  onClick={() => setMobileMenuOpen(false)}
                />
              )}

              {/* 分隔线 */}
              <div className="my-3 border-t border-white/10" />

              {/* 退出登录 */}
              {session && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    signOut()
                  }}
                  className="flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors text-red-400 hover:bg-red-500/10"
                >
                  <LogOut className="mr-3 h-5 w-5" />
                  退出登录
                </button>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  )
}

// 移动端导航链接组件
interface MobileNavLinkProps {
  href: string
  icon: React.ReactNode
  label: string
  isActive: boolean
  onClick: () => void
  nested?: boolean
}

function MobileNavLink({ href, icon, label, isActive, onClick, nested }: MobileNavLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center rounded-xl text-sm font-medium transition-all",
        nested
          ? "px-4 py-2.5 ml-4 text-white/70"
          : "px-4 py-3.5 text-white/90"
        ,
        isActive
          ? nested
            ? 'bg-white/10 text-white'
            : 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-white border border-indigo-500/30 shadow-lg shadow-indigo-500/10'
          : nested
            ? 'hover:bg-white/5 hover:text-white'
            : 'hover:bg-white/10 hover:text-white'
      )}
      onClick={onClick}
    >
      <span className={cn("mr-3", nested && "opacity-70")}>{icon}</span>
      {label}
      {isActive && !nested && (
        <ChevronRight className="ml-auto h-4 w-4 text-indigo-400" />
      )}
    </Link>
  )
}

// 移动端导航分组组件
interface MobileNavGroupProps {
  icon: React.ReactNode
  label: string
  isActive: boolean
  children: React.ReactNode
}

function MobileNavGroup({ icon, label, isActive, children }: MobileNavGroupProps) {
  const [isOpen, setIsOpen] = useState(isActive)

  return (
    <div className="flex flex-col">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center px-4 py-3.5 rounded-xl text-sm font-medium transition-all text-white/90",
          isActive
            ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-white border border-indigo-500/30'
            : 'hover:bg-white/10 hover:text-white'
        )}
      >
        <span className="mr-3">{icon}</span>
        {label}
        <ChevronDown
          className={cn(
            "ml-auto h-4 w-4 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>
      {isOpen && (
        <div className="mt-1 flex flex-col gap-0.5 animate-in slide-in-from-top-1">
          {children}
        </div>
      )}
    </div>
  )
}

export default Navbar
