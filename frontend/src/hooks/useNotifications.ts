import { useState, useEffect, useCallback } from "react";
import { getNotifications, type PredictionNotification } from "@/lib/notificationStore";

export function useNotifications() {
  const [notifications, setNotifications] = useState<PredictionNotification[]>(() => getNotifications());

  const refresh = useCallback(() => {
    setNotifications(getNotifications());
  }, []);

  useEffect(() => {
    window.addEventListener("sentinel-notifications-updated", refresh);
    return () => window.removeEventListener("sentinel-notifications-updated", refresh);
  }, [refresh]);

  return { notifications, refresh };
}
