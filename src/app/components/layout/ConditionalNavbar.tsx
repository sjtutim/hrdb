"use client"

import { usePathname } from "next/navigation"
import Navbar from "./Navbar"

export default function ConditionalNavbar() {
  const pathname = usePathname()
  
  // 如果当前路径是登录页面或注册页面，则不显示导航栏
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password'
  
  // 如果是认证页面，则不显示导航栏
  if (isAuthPage) {
    return null
  }
  
  return <Navbar />
}
