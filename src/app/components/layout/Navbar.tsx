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
  DropdownMenuTrigger
} from "@/app/components/ui/dropdown-menu"
import { Button } from "@/app/components/ui/button"
import { ThemeToggle } from "@/app/components/ui/theme-toggle"
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar"
import { Badge } from "@/app/components/ui/badge"
import {
  User,
  LogOut,
  Menu,
  ChevronDown,
  Home,
  Users,
  Calendar,
  Briefcase,
  BarChart3,
  Target,
  Settings,
  HelpCircle,
  Sparkles
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

  const isMenuVisible = (menuKey: string) => {
    // 未加载或未配置时默认显示全部
    if (allowedMenuKeys === null) return true
    return allowedMenuKeys.includes(menuKey)
  }

  const ListItem = React.forwardRef<
    React.ElementRef<"a">,
    React.ComponentPropsWithoutRef<"a">
  >(({ className, title, children, ...props }, ref) => {
    return (
      <li>
        <NavigationMenuLink asChild>
          <a
            ref={ref}
            className={cn(
              "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
              className
            )}
            {...props}
          >
            <div className="text-sm font-medium leading-none">{title}</div>
            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
              {children}
            </p>
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

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-lg overflow-hidden flex items-center justify-center">
              <img src="/logo.png" alt="顿慧人才库" width={32} height={32} className="object-cover" />
            </div>
            <span className="font-bold text-xl hidden sm:inline">顿慧人才库</span>
          </Link>

          {/* AI Badge */}
          <Badge variant="outline" className="hidden md:flex items-center gap-1 bg-primary/5 text-primary text-xs ml-2">
            <Sparkles className="h-3 w-3" />
            AI 驱动
          </Badge>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex">
          <NavigationMenu>
            <NavigationMenuList>
              {isMenuVisible('dashboard') && (
                <NavigationMenuItem>
                  <Link href="/dashboard" legacyBehavior passHref>
                    <NavigationMenuLink
                      className={cn(
                        navigationMenuTriggerStyle(),
                        isActive('/dashboard') && "bg-accent text-accent-foreground"
                      )}
                    >
                      <Home className="mr-2 h-4 w-4" />
                      仪表盘
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
              )}

              {isMenuVisible('candidates') && (
                <NavigationMenuItem>
                  <NavigationMenuTrigger className={isActive('/candidates') ? "bg-accent text-accent-foreground" : ""}>
                    <Users className="mr-2 h-4 w-4" />
                    候选人
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid gap-3 p-4 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
                      <li className="row-span-4">
                        <NavigationMenuLink asChild>
                          <a
                            className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                            href="/candidates"
                          >
                            <Users className="h-6 w-6 text-primary mb-2" />
                            <div className="mb-2 mt-4 text-lg font-medium">
                              候选人档案
                            </div>
                            <p className="text-sm leading-tight text-muted-foreground">
                              管理您的人才库和候选人渠道
                            </p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                      <ListItem href="/candidates" title="所有候选人">
                        查看和管理系统中的所有候选人
                      </ListItem>
                      <ListItem href="/resume-upload" title="添加候选人">
                        上传简历，AI自动解析建档
                      </ListItem>
                      {isMenuVisible('candidates:matching') && (
                        <ListItem href="/matching" title="人才匹配">
                          为您的空缺职位寻找完美匹配
                        </ListItem>
                      )}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              )}

              {isMenuVisible('interviews') && (
                <NavigationMenuItem>
                  <NavigationMenuTrigger className={isActive('/interviews') ? "bg-accent text-accent-foreground" : ""}>
                    <Calendar className="mr-2 h-4 w-4" />
                    面试
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                      <ListItem href="/interviews" title="所有面试">
                        查看和管理所有已安排的面试
                      </ListItem>
                      <ListItem href="/interviews/create" title="安排面试">
                        与候选人安排新的面试
                      </ListItem>
                      <ListItem href="/interviews/calendar" title="面试日历">
                        以日历格式查看您的面试安排
                      </ListItem>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              )}

              {isMenuVisible('jobs') && (
                <NavigationMenuItem>
                  <NavigationMenuTrigger className={isActive('/jobs') ? "bg-accent text-accent-foreground" : ""}>
                    <Briefcase className="mr-2 h-4 w-4" />
                    职位
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                      <ListItem href="/jobs" title="所有职位">
                        查看和管理所有职位发布
                      </ListItem>
                      <ListItem href="/jobs/create" title="发布职位">
                        创建新的职位发布
                      </ListItem>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              )}

              {isMenuVisible('employees') && (
                <NavigationMenuItem>
                  <Link href="/employees" legacyBehavior passHref>
                    <NavigationMenuLink
                      className={cn(
                        navigationMenuTriggerStyle(),
                        isActive('/employees') && "bg-accent text-accent-foreground"
                      )}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      人才库
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
              )}

              {session?.user?.role === 'ADMIN' && (
                <NavigationMenuItem>
                  <Link href="/admin" legacyBehavior passHref>
                    <NavigationMenuLink
                      className={cn(
                        navigationMenuTriggerStyle(),
                        isActive('/admin') && "bg-accent text-accent-foreground"
                      )}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      系统管理
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
              )}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 rounded-full h-10 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session.user?.image || undefined} alt={session.user?.name || 'User'} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {session.user?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden lg:inline text-sm font-medium max-w-[100px] truncate">
                    {session.user?.name || 'User'}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground hidden lg:inline" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{session.user?.name}</p>
                    <p className="text-xs text-muted-foreground">{session.user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    个人资料
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    设置
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/help" className="cursor-pointer">
                    <HelpCircle className="mr-2 h-4 w-4" />
                    帮助中心
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="text-destructive cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">登录</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">注册</Link>
              </Button>
            </div>
          )}

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <nav className="flex flex-col p-4 space-y-1">
            {isMenuVisible('dashboard') && (
              <Link
                href="/dashboard"
                className={cn(
                  "flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  isActive('/dashboard')
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted'
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Home className="mr-3 h-5 w-5" />
                仪表盘
              </Link>
            )}
            {isMenuVisible('candidates') && (
              <Link
                href="/candidates"
                className={cn(
                  "flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  isActive('/candidates')
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted'
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Users className="mr-3 h-5 w-5" />
                候选人
              </Link>
            )}
            {isMenuVisible('interviews') && (
              <Link
                href="/interviews"
                className={cn(
                  "flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  isActive('/interviews')
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted'
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Calendar className="mr-3 h-5 w-5" />
                面试
              </Link>
            )}
            {isMenuVisible('jobs') && (
              <Link
                href="/jobs"
                className={cn(
                  "flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  isActive('/jobs')
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted'
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Briefcase className="mr-3 h-5 w-5" />
                职位
              </Link>
            )}
            {isMenuVisible('matching') && (
              <Link
                href="/matching"
                className={cn(
                  "flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  isActive('/matching')
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted'
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Target className="mr-3 h-5 w-5" />
                人才匹配
              </Link>
            )}
            {isMenuVisible('employees') && (
              <Link
                href="/employees"
                className={cn(
                  "flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  isActive('/employees')
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted'
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Users className="mr-3 h-5 w-5" />
                人才库
              </Link>
            )}
            {session?.user?.role === 'ADMIN' && (
              <Link
                href="/admin"
                className={cn(
                  "flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  isActive('/admin')
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted'
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Settings className="mr-3 h-5 w-5" />
                系统管理
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}

export default Navbar
