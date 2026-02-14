"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { 
  Loader2, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff,
  ArrowRight,
  Users,
  Sparkles
} from "lucide-react"

import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Badge } from "@/app/components/ui/badge"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/app/components/ui/form"

const loginSchema = z.object({
  email: z.string().email({ message: "请输入有效的邮箱地址" }),
  password: z.string().min(6, { message: "密码至少需要6个字符" }),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function onSubmit(data: LoginFormValues) {
    setIsLoading(true)
    setError(null)

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        setError("登录失败，请检查您的邮箱和密码")
        setIsLoading(false)
        return
      }

      router.push(callbackUrl)
      router.refresh()
    } catch (error) {
      setError("登录过程中出现错误，请稍后再试")
      setIsLoading(false)
    }
  }

  const features = [
    { title: "AI 智能匹配", desc: "基于大语言模型的精准人才推荐" },
    { title: "简历自动解析", desc: "一键上传，自动提取关键信息" },
    { title: "全流程管理", desc: "从招聘到入职的完整解决方案" },
  ]

  return (
    <div className="min-h-screen flex">
      {/* 左侧 - 品牌介绍 */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 bg-gradient-to-br from-primary/90 to-primary relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvc3ZnPg==')] opacity-30"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-24">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Users className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">顿慧人才库</h1>
              <p className="text-white/70 text-sm">AI驱动的人才管理平台</p>
            </div>
          </div>
          
          <h2 className="text-4xl xl:text-5xl font-bold text-white mb-6 leading-tight">
            智能招聘
            <br />
            从这里开始
          </h2>
          
          <p className="text-lg text-white/80 mb-12 max-w-md">
            利用AI技术提升招聘效率，让人才获取变得简单高效
          </p>

          <div className="space-y-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-medium">{feature.title}</h3>
                  <p className="text-white/60 text-sm">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 右侧 - 登录表单 */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* 移动端 Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-xl bg-primary mb-4">
              <Users className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">顿慧人才库</h1>
            <p className="text-muted-foreground">AI驱动的人才管理平台</p>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-2xl font-bold tracking-tight">欢迎回来</h2>
            <p className="text-muted-foreground mt-2">
              登录您的账户以继续
            </p>
          </div>

          <Card className="border-0 shadow-none sm:border sm:shadow-lg">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl">登录</CardTitle>
              <CardDescription>
                输入您的邮箱和密码登录系统
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>邮箱</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                              placeholder="your.email@example.com" 
                              className="pl-10" 
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>密码</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••" 
                              className="pl-10 pr-10" 
                              {...field} 
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {error && (
                    <div className="p-3 text-sm font-medium text-destructive bg-destructive/10 rounded-md border border-destructive/20">
                      {error}
                    </div>
                  )}
                  
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        登录中...
                      </>
                    ) : (
                      <>
                        登录
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 border-t pt-6">
              <div className="flex items-center justify-between w-full text-sm">
                <Link href="/forgot-password" className="text-primary hover:underline">
                  忘记密码?
                </Link>
                <span className="text-muted-foreground">
                  还没有账户?{" "}
                  <Link href="/register" className="text-primary font-medium hover:underline">
                    注册
                  </Link>
                </span>
              </div>
            </CardFooter>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            登录即表示您同意我们的{" "}
            <Link href="/terms" className="text-primary hover:underline">
              服务条款
            </Link>{" "}
            和{" "}
            <Link href="/privacy" className="text-primary hover:underline">
              隐私政策
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
