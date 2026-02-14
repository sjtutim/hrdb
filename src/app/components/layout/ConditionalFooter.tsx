"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Users, Heart } from "lucide-react"

export default function ConditionalFooter() {
  const pathname = usePathname()
  
  // 如果当前路径是登录页面或注册页面，则不显示页脚
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password'
  
  // 如果是认证页面，则不显示页脚
  if (isAuthPage) {
    return null
  }
  
  const footerLinks = [
    { label: '服务条款', href: '/terms' },
    { label: '隐私政策', href: '/privacy' },
    { label: '帮助中心', href: '/help' },
    { label: '联系我们', href: '/contact' },
  ]
  
  return (
    <footer className="border-t bg-muted/30">
      <div className="container py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo and copyright */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">顿慧人才库</p>
              <p className="text-xs text-muted-foreground">
                &copy; {new Date().getFullYear()} 保留所有权利
              </p>
            </div>
          </div>
          
          {/* Links */}
          <nav className="flex items-center gap-6">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          
          {/* Made with */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>用</span>
            <Heart className="h-3 w-3 text-red-500 fill-red-500" />
            <span>打造</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
