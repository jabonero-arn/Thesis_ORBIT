import { collection, addDoc, Firestore } from "firebase/firestore";
import type { ActivityLogCategory } from "./types";

/**
 * Creates a system-wide activity log.
 */
export function createActivityLog(
    db: Firestore | null,
    userId: string,
    userName: string,
    action: string,
    details: string,
    category: ActivityLogCategory
) {
    if (!db) return;
    
    const logRef = collection(db, "activity_logs");
    addDoc(logRef, {
        userId,
        userName,
        action,
        details,
        category,
        timestamp: new Date().toISOString()
    }).catch(err => console.error("Failed to create activity log:", err));
}