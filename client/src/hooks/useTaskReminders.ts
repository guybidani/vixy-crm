import { useEffect } from "react";
import toast from "react-hot-toast";
import { getSocket } from "../lib/socket";

interface TaskReminderPayload {
  taskId: string;
  taskTitle: string;
  dueTime: string;
  message: string;
}

export function useTaskReminders() {
  useEffect(() => {
    const socket = getSocket();

    function handleReminder(data: TaskReminderPayload) {
      // Show a prominent toast for 10 seconds
      toast(data.message, {
        duration: 10000,
        icon: "⏰",
        style: {
          background: "#FDAB3D",
          color: "white",
          fontWeight: "600",
          fontSize: "14px",
          borderRadius: "12px",
          padding: "12px 16px",
          direction: "rtl",
        },
      });

      // Browser notification if permission is granted
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("⏰ תזכורת משימה", {
          body: data.message,
          icon: "/favicon.ico",
        });
      }
    }

    socket.on("task-reminder", handleReminder);
    return () => {
      socket.off("task-reminder", handleReminder);
    };
  }, []);
}
