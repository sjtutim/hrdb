import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Container } from '@/app/components/ui/container';
import { ArrowRight, Users, Calendar, Briefcase, BarChart, Search, Zap, Award } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-br from-background via-background to-primary/5">
        <Container>
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
            <div className="flex flex-col justify-center space-y-4">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
                  顿慧人才库
                  <span className="text-primary">Dunwill HeroBase</span>
                </h1>
                <p className="max-w-[600px] text-muted-foreground md:text-xl">
                  AI驱动的人才管理系统，让招聘更智能，管理更高效
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Button asChild size="lg" className="animate-slide-in" style={{ animationDelay: "0.1s" }}>
                  <Link href="/dashboard">进入系统</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="animate-slide-in" style={{ animationDelay: "0.2s" }}>
                  <Link href="/candidates">查看候选人</Link>
                </Button>
              </div>
            </div>
            <div className="mx-auto lg:mr-0 flex items-center justify-center">
              <div className="relative w-full max-w-[500px] aspect-square rounded-full bg-gradient-to-br from-primary/10 to-primary/5 p-4 shadow-lg animate-pulse-light">
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg
                    className="w-3/4 h-3/4 text-primary/30"
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Features Section */}
      <section className="w-full py-12 md:py-24 lg:py-32">
        <Container>
          <div className="mx-auto flex max-w-[58rem] flex-col items-center justify-center gap-4 text-center">
            <Badge className="animate-fade-in" style={{ animationDelay: "0.3s" }}>功能特点</Badge>
            <h2 className="text-3xl font-bold leading-[1.1] sm:text-3xl md:text-5xl animate-fade-in" style={{ animationDelay: "0.4s" }}>
              全方位的人才管理解决方案
            </h2>
            <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7 animate-fade-in" style={{ animationDelay: "0.5s" }}>
              顿慧人才库提供一站式人才管理服务，从简历解析到候选人匹配，从面试安排到入职跟踪，全流程智能化
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-8 mt-12">
            <Card className="animate-slide-in" style={{ animationDelay: "0.6s" }}>
              <CardHeader>
                <div className="p-2 w-fit rounded-full bg-primary/10 mb-2">
                  <Search className="h-5 w-5 text-primary" />
                </div>
                <CardTitle>智能简历解析</CardTitle>
                <CardDescription>
                  自动提取简历信息，精准识别候选人技能和经验
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  支持多种格式简历上传，AI自动解析关键信息，减少人工录入工作量
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" size="sm" asChild className="gap-1">
                  <Link href="/resume-upload">
                    了解更多
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
            <Card className="animate-slide-in" style={{ animationDelay: "0.7s" }}>
              <CardHeader>
                <div className="p-2 w-fit rounded-full bg-primary/10 mb-2">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <CardTitle>智能人才匹配</CardTitle>
                <CardDescription>
                  基于AI算法，精准匹配职位需求与候选人能力
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  分析职位要求和候选人技能，自动推荐最合适的人选，提高招聘效率
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" size="sm" asChild className="gap-1">
                  <Link href="/matching">
                    了解更多
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
            <Card className="animate-slide-in" style={{ animationDelay: "0.8s" }}>
              <CardHeader>
                <div className="p-2 w-fit rounded-full bg-primary/10 mb-2">
                  <Award className="h-5 w-5 text-primary" />
                </div>
                <CardTitle>人才评估系统</CardTitle>
                <CardDescription>
                  全面评估候选人能力，提供客观决策依据
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  整合面试反馈、技能测评和背景调查，形成全面的候选人评估报告
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" size="sm" asChild className="gap-1">
                  <Link href="/interviews">
                    了解更多
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </Container>
      </section>

      {/* Stats Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/50">
        <Container>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="animate-slide-in" style={{ animationDelay: "0.9s" }}>
              <CardHeader className="pb-2">
                <CardDescription>候选人</CardDescription>
                <CardTitle className="text-3xl">5,000+</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground flex items-center">
                  <Users className="mr-1 h-4 w-4" />
                  人才库规模持续增长
                </div>
              </CardContent>
            </Card>
            <Card className="animate-slide-in" style={{ animationDelay: "1.0s" }}>
              <CardHeader className="pb-2">
                <CardDescription>面试</CardDescription>
                <CardTitle className="text-3xl">1,200+</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground flex items-center">
                  <Calendar className="mr-1 h-4 w-4" />
                  每月面试安排
                </div>
              </CardContent>
            </Card>
            <Card className="animate-slide-in" style={{ animationDelay: "1.1s" }}>
              <CardHeader className="pb-2">
                <CardDescription>职位</CardDescription>
                <CardTitle className="text-3xl">300+</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground flex items-center">
                  <Briefcase className="mr-1 h-4 w-4" />
                  活跃招聘职位
                </div>
              </CardContent>
            </Card>
            <Card className="animate-slide-in" style={{ animationDelay: "1.2s" }}>
              <CardHeader className="pb-2">
                <CardDescription>效率提升</CardDescription>
                <CardTitle className="text-3xl">60%</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground flex items-center">
                  <BarChart className="mr-1 h-4 w-4" />
                  招聘流程效率提升
                </div>
              </CardContent>
            </Card>
          </div>
        </Container>
      </section>

      {/* CTA Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 border-t">
        <Container size="md">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                准备好提升您的招聘流程了吗？
              </h2>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                立即开始使用顿慧人才库，体验AI驱动的人才管理系统带来的效率提升
              </p>
            </div>
            <div className="flex flex-col gap-2 min-[400px]:flex-row">
              <Button asChild size="lg">
                <Link href="/dashboard">开始使用</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/contact">联系我们</Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
