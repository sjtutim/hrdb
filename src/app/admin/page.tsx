"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"
import { Badge } from "@/app/components/ui/badge"
import { Checkbox } from "@/app/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select"
import { Users, Tags, Plus, Pencil, Trash2, Settings, Shield, Loader2 } from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

interface Tag {
  id: string
  name: string
  category: string
  createdAt: string
}

const ROLES = [
  { value: "ADMIN", label: "管理员" },
  { value: "HR", label: "人力资源" },
  { value: "RECRUITER", label: "招聘人员" },
  { value: "MANAGER", label: "部门主管" },
]

const TAG_CATEGORIES = [
  { value: "SKILL", label: "技能" },
  { value: "INDUSTRY", label: "行业" },
  { value: "EDUCATION", label: "教育" },
  { value: "EXPERIENCE", label: "经验" },
  { value: "PERSONALITY", label: "性格特质" },
  { value: "OTHER", label: "其他" },
]

const roleBadgeVariant = (role: string) => {
  switch (role) {
    case "ADMIN": return "destructive" as const
    case "HR": return "default" as const
    case "RECRUITER": return "secondary" as const
    case "MANAGER": return "outline" as const
    default: return "secondary" as const
  }
}

const roleLabel = (role: string) => ROLES.find(r => r.value === role)?.label || role
const categoryLabel = (cat: string) => TAG_CATEGORIES.find(c => c.value === cat)?.label || cat

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // 权限检查
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard")
    }
  }, [status, session, router])

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    )
  }

  if (session?.user?.role !== "ADMIN") {
    return null
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="h-7 w-7" />
        <h1 className="text-3xl font-bold">管理设置</h1>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            用户管理
          </TabsTrigger>
          <TabsTrigger value="tags" className="gap-2">
            <Tags className="h-4 w-4" />
            标签设置
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2">
            <Shield className="h-4 w-4" />
            角色管理
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UserManagement />
        </TabsContent>

        <TabsContent value="tags">
          <TagManagement />
        </TabsContent>

        <TabsContent value="roles">
          <RoleManagement />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ==================== 用户管理 ====================

function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [error, setError] = useState("")
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "RECRUITER" })

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users")
      const data = await res.json()
      setUsers(data)
    } catch {
      console.error("获取用户列表失败")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const openAddDialog = () => {
    setEditingUser(null)
    setForm({ name: "", email: "", password: "", role: "RECRUITER" })
    setError("")
    setDialogOpen(true)
  }

  const openEditDialog = (user: User) => {
    setEditingUser(user)
    setForm({ name: user.name, email: user.email, password: "", role: user.role })
    setError("")
    setDialogOpen(true)
  }

  const openDeleteDialog = (user: User) => {
    setDeletingUser(user)
    setError("")
    setDeleteDialogOpen(true)
  }

  const handleSubmit = async () => {
    setError("")
    if (!form.name || !form.email || !form.role) {
      setError("请填写所有必填字段")
      return
    }
    if (!editingUser && !form.password) {
      setError("请输入密码")
      return
    }

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users"
      const method = editingUser ? "PUT" : "POST"
      const body: Record<string, string> = { name: form.name, email: form.email, role: form.role }
      if (form.password) body.password = form.password

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "操作失败")
        return
      }

      setDialogOpen(false)
      fetchUsers()
    } catch {
      setError("操作失败，请重试")
    }
  }

  const handleDelete = async () => {
    if (!deletingUser) return
    setError("")

    try {
      const res = await fetch(`/api/users/${deletingUser.id}`, { method: "DELETE" })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "删除失败")
        return
      }

      setDeleteDialogOpen(false)
      setDeletingUser(null)
      fetchUsers()
    } catch {
      setError("删除失败，请重试")
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">加载中...</p>
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>用户列表</CardTitle>
        <Button onClick={openAddDialog} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          添加用户
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-medium">姓名</th>
                <th className="text-left py-3 px-2 font-medium">邮箱</th>
                <th className="text-left py-3 px-2 font-medium">角色</th>
                <th className="text-left py-3 px-2 font-medium">创建时间</th>
                <th className="text-right py-3 px-2 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b last:border-0">
                  <td className="py-3 px-2">{user.name}</td>
                  <td className="py-3 px-2 text-muted-foreground">{user.email}</td>
                  <td className="py-3 px-2">
                    <Badge variant={roleBadgeVariant(user.role)}>
                      {roleLabel(user.role)}
                    </Badge>
                  </td>
                  <td className="py-3 px-2 text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString("zh-CN")}
                  </td>
                  <td className="py-3 px-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(user)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    暂无用户
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>

      {/* 添加/编辑用户 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? "编辑用户" : "添加用户"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</p>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">姓名 *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="请输入姓名"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">邮箱 *</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="请输入邮箱"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                密码 {editingUser ? "（留空则不修改）" : "*"}
              </Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editingUser ? "留空则不修改密码" : "请输入密码"}
              />
            </div>
            <div className="space-y-2">
              <Label>角色 *</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSubmit}>{editingUser ? "保存" : "添加"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 p-2 rounded mb-4">{error}</p>
            )}
            <p>确定要删除用户 <strong>{deletingUser?.name}</strong>（{deletingUser?.email}）吗？此操作不可撤销。</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ==================== 标签管理 ====================

function TagManagement() {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [deletingTag, setDeletingTag] = useState<Tag | null>(null)
  const [error, setError] = useState("")
  const [form, setForm] = useState({ name: "", category: "SKILL" })

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch("/api/tags")
      const data = await res.json()
      setTags(data)
    } catch {
      console.error("获取标签列表失败")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTags() }, [fetchTags])

  const openAddDialog = (category?: string) => {
    setEditingTag(null)
    setForm({ name: "", category: category || "SKILL" })
    setError("")
    setDialogOpen(true)
  }

  const openEditDialog = (tag: Tag) => {
    setEditingTag(tag)
    setForm({ name: tag.name, category: tag.category })
    setError("")
    setDialogOpen(true)
  }

  const openDeleteDialog = (tag: Tag) => {
    setDeletingTag(tag)
    setError("")
    setDeleteDialogOpen(true)
  }

  const handleSubmit = async () => {
    setError("")
    if (!form.name || !form.category) {
      setError("请填写所有必填字段")
      return
    }

    try {
      const url = editingTag ? `/api/tags/${editingTag.id}` : "/api/tags"
      const method = editingTag ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "操作失败")
        return
      }

      setDialogOpen(false)
      fetchTags()
    } catch {
      setError("操作失败，请重试")
    }
  }

  const handleDelete = async () => {
    if (!deletingTag) return
    setError("")

    try {
      const res = await fetch(`/api/tags/${deletingTag.id}`, { method: "DELETE" })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "删除失败")
        return
      }

      setDeleteDialogOpen(false)
      setDeletingTag(null)
      fetchTags()
    } catch {
      setError("删除失败，请重试")
    }
  }

  // 按类别分组
  const groupedTags = TAG_CATEGORIES.map((cat) => ({
    ...cat,
    tags: tags.filter((t) => t.category === cat.value),
  }))

  if (loading) {
    return <p className="text-muted-foreground">加载中...</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">标签管理</h2>
        <Button onClick={() => openAddDialog()} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          添加标签
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {groupedTags.map((group) => (
          <Card key={group.value}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{group.label}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openAddDialog(group.value)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {group.tags.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无标签</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {group.tags.map((tag) => (
                    <div key={tag.id} className="group inline-flex items-center gap-1">
                      <Badge variant="secondary" className="pr-1">
                        {tag.name}
                        <span className="inline-flex ml-1 gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditDialog(tag)}
                            className="hover:text-primary p-0.5"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => openDeleteDialog(tag)}
                            className="hover:text-destructive p-0.5"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </span>
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 添加/编辑标签 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTag ? "编辑标签" : "添加标签"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</p>
            )}
            <div className="space-y-2">
              <Label htmlFor="tagName">标签名称 *</Label>
              <Input
                id="tagName"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="请输入标签名称"
              />
            </div>
            <div className="space-y-2">
              <Label>类别 *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAG_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSubmit}>{editingTag ? "保存" : "添加"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 p-2 rounded mb-4">{error}</p>
            )}
            <p>确定要删除标签 <strong>{deletingTag?.name}</strong> 吗？此操作不可撤销。</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ==================== 角色管理 ====================

// 与 Navbar.tsx 中的菜单项保持同步
const MENU_ITEMS = [
  { key: "dashboard", label: "仪表盘" },
  { key: "candidates", label: "候选人", children: [
    { key: "candidates:list", label: "所有候选人" },
    { key: "candidates:create", label: "添加候选人" },
    { key: "candidates:matching", label: "人才匹配" },
  ]},
  { key: "interviews", label: "面试", children: [
    { key: "interviews:list", label: "所有面试" },
    { key: "interviews:create", label: "安排面试" },
    { key: "interviews:calendar", label: "面试日历" },
  ]},
  { key: "jobs", label: "职位", children: [
    { key: "jobs:list", label: "所有职位" },
    { key: "jobs:create", label: "发布职位" },
  ]},
  { key: "employees", label: "人才库" },
]

// 扁平化所有菜单项（包含子菜单）
const ALL_MENU_KEYS = MENU_ITEMS.flatMap(item =>
  item.children ? [item.key, ...item.children.map(c => c.key)] : [item.key]
)

function RoleManagement() {
  const [permissions, setPermissions] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const allMenuKeys = ALL_MENU_KEYS

  const fetchPermissions = useCallback(async () => {
    try {
      const res = await fetch("/api/role-permissions")
      const data = await res.json()
      setPermissions(data)
    } catch {
      console.error("获取角色权限失败")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPermissions() }, [fetchPermissions])

  const getMenuKeys = (role: string): string[] => {
    // 如果该角色没有配置记录，默认全部菜单
    if (!permissions[role]) return allMenuKeys
    return permissions[role]
  }

  const toggleMenu = (role: string, menuKey: string) => {
    if (role === "ADMIN") return // ADMIN 不可修改
    const current = getMenuKeys(role)
    const next = current.includes(menuKey)
      ? current.filter((k) => k !== menuKey)
      : [...current, menuKey]
    setPermissions((prev) => ({ ...prev, [role]: next }))
  }

  const handleSave = async (role: string) => {
    setSaving(role)
    setSuccessMsg(null)
    try {
      const menuKeys = getMenuKeys(role)
      const res = await fetch("/api/role-permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, menuKeys }),
      })
      if (res.ok) {
        setSuccessMsg(`${role} 权限保存成功`)
        setTimeout(() => setSuccessMsg(null), 3000)
      } else {
        console.error("保存失败")
      }
    } catch {
      console.error("保存角色权限失败")
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">加载中...</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">角色菜单权限</h2>
        <p className="text-sm text-muted-foreground">配置每个角色可以看到的导航菜单</p>
      </div>

      {successMsg && (
        <div className="p-3 bg-green-100 text-green-700 rounded-md">
          {successMsg}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {ROLES.map((role) => {
          const isAdmin = role.value === "ADMIN"
          const menuKeys = getMenuKeys(role.value)

          return (
            <Card key={role.value}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{role.label}</CardTitle>
                    <Badge variant={roleBadgeVariant(role.value)} className="text-xs">
                      {role.value}
                    </Badge>
                  </div>
                  {!isAdmin && (
                    <Button
                      size="sm"
                      onClick={() => handleSave(role.value)}
                      disabled={saving === role.value}
                    >
                      {saving === role.value && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      保存
                    </Button>
                  )}
                </div>
                {isAdmin && (
                  <p className="text-xs text-muted-foreground">管理员始终拥有全部菜单权限</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {MENU_ITEMS.map((menu) => (
                    <div key={menu.key}>
                      {/* 父菜单 */}
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`${role.value}-${menu.key}`}
                          checked={isAdmin ? true : menuKeys.includes(menu.key)}
                          disabled={isAdmin}
                          onCheckedChange={() => toggleMenu(role.value, menu.key)}
                        />
                        <Label
                          htmlFor={`${role.value}-${menu.key}`}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {menu.label}
                        </Label>
                      </div>
                      {/* 子菜单 */}
                      {menu.children && menu.children.length > 0 && (
                        <div className="ml-6 mt-1 space-y-1 border-l-2 border-muted pl-3">
                          {menu.children.map((child) => (
                            <div key={child.key} className="flex items-center space-x-2">
                              <Checkbox
                                id={`${role.value}-${child.key}`}
                                checked={isAdmin ? true : menuKeys.includes(child.key)}
                                disabled={isAdmin}
                                onCheckedChange={() => toggleMenu(role.value, child.key)}
                              />
                              <Label
                                htmlFor={`${role.value}-${child.key}`}
                                className="text-sm text-muted-foreground cursor-pointer"
                              >
                                {child.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
