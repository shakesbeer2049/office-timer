export const STORAGE_USER = "punch_user";
export const STORAGE_RECORDS = "punch_records";
export const STORAGE_SETTINGS = "punch_settings";
export const DEFAULT_WORK_HOURS = 8.5;

export interface PunchRecord {
  id: string;
  date: string;
  punchIn: string;
  punchOut: string | null;
  customEntry: boolean;
  workHours?: number;
}

export interface User {
  name: string;
  workHours: number;
}

export interface Settings {
  notificationsEnabled: boolean;
  punchInReminderTime: string;
  geofenceEnabled: boolean;
  geofenceLat: number | null;
  geofenceLng: number | null;
  geofenceRadius: number;
}

export const DEFAULT_SETTINGS: Settings = {
  notificationsEnabled: true,
  punchInReminderTime: "10:00",
  geofenceEnabled: false,
  geofenceLat: 28.49685,
  geofenceLng: 77.15953,
  geofenceRadius: 100,
};
