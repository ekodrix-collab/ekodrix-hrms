"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent, 
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { getNotifications, markNotificationRead, markAllNotificationsRead } from "@/actions/notifications";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Notification } from "@/types/common";

export function NotificationBell() {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);

    const { data: result, refetch } = useQuery({
        queryKey: ["notifications"],
        queryFn: () => getNotifications(),
        refetchInterval: 30000, // Refetch every 30 seconds
    });

    const notifications = (result?.data || []) as Notification[];
    const unreadCount = notifications.filter((n) => !n.is_read).length;

    const handleMarkRead = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const res = await markNotificationRead(id);
        if (res.ok) {
            refetch();
        }
    };

    const handleMarkAllRead = async () => {
        const res = await markAllNotificationsRead();
        if (res.ok) {
            toast.success("All notifications marked as read");
            refetch();
        }
    };

    const handleNotificationClick = async (notification: Notification) => {
        // Mark as read if not already
        if (!notification.is_read) {
            await markNotificationRead(notification.id);
            refetch();
        }

        // Navigate to entity if applicable
        if (notification.entity_type === "task" && notification.entity_id) {
            router.push("/employee/tasks");
        }

        setIsOpen(false);
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-10 w-10 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] font-bold"
                        >
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-[380px] max-h-[500px] overflow-y-auto">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleMarkAllRead}
                            className="h-7 text-xs"
                        >
                            Mark all read
                        </Button>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {notifications.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No notifications yet</p>
                    </div>
                ) : (
                    notifications.map((notification) => (
                        <DropdownMenuItem
                            key={notification.id}
                            className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${!notification.is_read ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                                }`}
                            onClick={() => handleNotificationClick(notification)}
                        >
                            <div className="flex items-start justify-between w-full gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm">{notification.title}</p>
                                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                        {notification.message}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                    </p>
                                </div>
                                {!notification.is_read && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 shrink-0"
                                        onClick={(e) => handleMarkRead(notification.id, e)}
                                    >
                                        <Check className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                        </DropdownMenuItem>
                    ))
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
