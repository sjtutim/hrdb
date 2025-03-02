"use client"

import { useSession } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  
  // 公开路径列表，这些路径不需要登录
  const publicPaths = ['/login', '/register', '/forgot-password', '/']
  
  // 检查当前路径是否为公开路径
  const isPublicPath = publicPaths.includes(pathname)
  
  useEffect(() => {
    // 如果用户未登录且不在公开路径上，则重定向到登录页面
    if (status === "unauthenticated" && !isPublicPath) {
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`)
    }
  }, [status, isPublicPath, pathname, router])
  
  // 如果正在加载会话信息，显示加载状态
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }
  
  // 如果用户未登录且不在公开路径上，不渲染子组件（虽然会被重定向）
  if (status === "unauthenticated" && !isPublicPath) {
    return null
  }
  
  // 否则，渲染子组件
  return <>{children}</>
}
