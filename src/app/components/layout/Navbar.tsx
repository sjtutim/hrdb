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
import { User, LogOut, Menu, ChevronDown, Home, Users, Calendar, Briefcase, BarChart } from "lucide-react"
import { cn } from "@/app/lib/utils"
import { useState } from "react"

const Navbar = () => {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold text-xl flex items-center">
              <Users className="w-6 h-6 mr-2" />
              顿慧人才库
            </span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <Link href="/dashboard" legacyBehavior passHref>
                  <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                    <Home className="mr-2 h-4 w-4" />
                    仪表盘
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
              
              <NavigationMenuItem>
                <NavigationMenuTrigger>
                  <Users className="mr-2 h-4 w-4" />
                  候选人
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid gap-3 p-4 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
                    <li className="row-span-3">
                      <NavigationMenuLink asChild>
                        <a
                          className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                          href="/candidates"
                        >
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
                    <ListItem href="/candidates/create" title="添加候选人">
                      向人才库添加新的候选人
                    </ListItem>
                    <ListItem href="/candidates/matching" title="人才匹配">
                      为您的空缺职位寻找完美匹配
                    </ListItem>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
              
              <NavigationMenuItem>
                <NavigationMenuTrigger>
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
                    <ListItem href="/interviews/reports" title="面试报告">
                      生成关于面试结果和指标的报告
                    </ListItem>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
              
              <NavigationMenuItem>
                <NavigationMenuTrigger>
                  <Briefcase className="mr-2 h-4 w-4" />
                  职位
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                    <ListItem href="/jobs" title="所有职位">
                      查看和管理所有职位发布
                    </ListItem>
                    <ListItem href="/jobs/create" title="创建职位">
                      创建新的职位发布
                    </ListItem>
                    <ListItem href="/jobs/applications" title="申请">
                      审核您职位发布的申请
                    </ListItem>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
              
              <NavigationMenuItem>
                <Link href="/analytics" legacyBehavior passHref>
                  <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                    <BarChart className="mr-2 h-4 w-4" />
                    分析
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 rounded-full">
                  <Avatar>
                    <AvatarImage src={session.user?.image || undefined} alt={session.user?.name || 'User'} />
                    <AvatarFallback>{session.user?.name?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline">{session.user?.name || 'User'}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>我的账户</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">个人资料</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">设置</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>退出登录</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" asChild>
                <Link href="/login">登录</Link>
              </Button>
              <Button asChild>
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
        <div className="md:hidden border-t p-4">
          <nav className="flex flex-col space-y-4">
            <Link 
              href="/dashboard" 
              className={`flex items-center px-4 py-2 rounded-md ${pathname === '/dashboard' ? 'bg-accent' : 'hover:bg-accent/50'}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Home className="mr-2 h-4 w-4" />
              仪表盘
            </Link>
            <Link 
              href="/candidates" 
              className={`flex items-center px-4 py-2 rounded-md ${pathname === '/candidates' ? 'bg-accent' : 'hover:bg-accent/50'}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Users className="mr-2 h-4 w-4" />
              候选人
            </Link>
            <Link 
              href="/interviews" 
              className={`flex items-center px-4 py-2 rounded-md ${pathname === '/interviews' ? 'bg-accent' : 'hover:bg-accent/50'}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Calendar className="mr-2 h-4 w-4" />
              面试
            </Link>
            <Link 
              href="/jobs" 
              className={`flex items-center px-4 py-2 rounded-md ${pathname === '/jobs' ? 'bg-accent' : 'hover:bg-accent/50'}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Briefcase className="mr-2 h-4 w-4" />
              职位
            </Link>
            <Link 
              href="/analytics" 
              className={`flex items-center px-4 py-2 rounded-md ${pathname === '/analytics' ? 'bg-accent' : 'hover:bg-accent/50'}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <BarChart className="mr-2 h-4 w-4" />
              分析
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}

export default Navbar
