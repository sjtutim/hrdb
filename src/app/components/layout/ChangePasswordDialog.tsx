"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"
import { DropdownMenuItem } from "@/app/components/ui/dropdown-menu"
import { Key, Loader2 } from "lucide-react"

export function ChangePasswordDialog() {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess(false)

    if (newPassword !== confirmPassword) {
      setError("新密码与确认密码不一致")
      return
    }

    if (newPassword.length < 6) {
      setError("密码长度至少为6位")
      return
    }

    setLoading(true)

    try {
      const res = await fetch(`/api/users/${session?.user?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          password: newPassword
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "修改密码失败")
        return
      }

      setSuccess(true)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setTimeout(() => {
        setOpen(false)
        setSuccess(false)
      }, 2000)
    } catch {
      setError("网络错误，请稍后重试")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <DropdownMenuItem
        onSelect={(e) => { e.preventDefault(); setOpen(true) }}
        className="cursor-pointer"
      >
        <Key className="mr-2 h-4 w-4" />
        修改密码
      </DropdownMenuItem>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>修改密码</DialogTitle>
            <DialogDescription>
              请输入您的当前密码和新密码
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {error && (
                <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
                  密码修改成功！
                </div>
              )}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="currentPassword" className="text-right">
                  当前密码
                </Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newPassword" className="text-right">
                  新密码
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="confirmPassword" className="text-right">
                  确认密码
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                保存修改
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
