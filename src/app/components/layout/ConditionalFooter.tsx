"use client"

import { usePathname } from "next/navigation"

export default function ConditionalFooter() {
  const pathname = usePathname()
  
  // 如果当前路径是登录页面或注册页面，则不显示页脚
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password'
  
  // 如果是认证页面，则不显示页脚
  if (isAuthPage) {
    return null
  }
  
  return (
    <footer className="border-t py-6 md:py-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
        <p className="text-sm text-muted-foreground text-center md:text-left">
          &copy; {new Date().getFullYear()} 顿慧人才库. 保留所有权利.
        </p>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <a href="/terms" className="hover:underline">服务条款</a>
          <a href="/privacy" className="hover:underline">隐私政策</a>
          <a href="/contact" className="hover:underline">联系我们</a>
        </div>
      </div>
    </footer>
  )
}
