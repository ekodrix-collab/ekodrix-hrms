'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    Users,
    ClipboardCheck,
    ListTodo,
    DollarSign,
    Menu,
    X,
    LogOut,
    ChevronLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface SidebarProps {
    userRole?: 'admin' | 'employee'
    userName?: string
    userEmail?: string
}

export function AppSidebar({ userRole = 'admin', userName = 'User', userEmail = 'user@ekodrix.com' }: SidebarProps) {
    const [collapsed, setCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const pathname = usePathname()

    const navigation = [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'Employees', href: '/employees', icon: Users, adminOnly: true },
        { name: 'Attendance', href: '/attendance', icon: ClipboardCheck },
        { name: 'Tasks', href: '/tasks', icon: ListTodo },
        { name: 'Finance', href: '/finance', icon: DollarSign, adminOnly: true },
    ].filter(item => !item.adminOnly || userRole === 'admin')

    return (
        <>
            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed top-0 left-0 z-50 h-screen bg-card border-r transition-all duration-300 ease-in-out",
                    collapsed ? "w-16" : "w-64",
                    mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between h-16 px-4 border-b">
                    {!collapsed && (
                        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
                            <span className="text-foreground">Ekodrix</span>
                            <span className="text-green-600">HRMS</span>
                        </Link>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCollapsed(!collapsed)}
                        className="hidden lg:flex"
                    >
                        <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setMobileOpen(false)}
                        className="lg:hidden"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Navigation */}
                <nav className="p-4 space-y-2">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => setMobileOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200",
                                    "hover:bg-accent hover:scale-[1.02]",
                                    isActive && "bg-green-50 dark:bg-green-900/20 text-green-600 font-medium",
                                    !isActive && "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <item.icon className="h-5 w-5 flex-shrink-0" />
                                {!collapsed && <span>{item.name}</span>}
                            </Link>
                        )
                    })}
                </nav>

                {/* User Section */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
                    {!collapsed ? (
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                    <AvatarFallback className="bg-green-100 text-green-700">
                                        {userName.split(' ').map(n => n[0]).join('')}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{userName}</p>
                                    <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" className="w-full">
                                <LogOut className="h-4 w-4 mr-2" />
                                Logout
                            </Button>
                        </div>
                    ) : (
                        <Button variant="ghost" size="icon" className="w-full">
                            <LogOut className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </aside>

            {/* Mobile Menu Button */}
            <Button
                variant="outline"
                size="icon"
                onClick={() => setMobileOpen(true)}
                className="fixed top-4 left-4 z-40 lg:hidden"
            >
                <Menu className="h-4 w-4" />
            </Button>
        </>
    )
}
