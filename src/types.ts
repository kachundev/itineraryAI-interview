/** Trip constraints accepted by POST /generate */
export type TripInput = {
  destination: string;
  dayCount: number;
  preferences?: string | string[];
};

export type Activity = {
  timeOfDay: "morning" | "afternoon" | "evening";
  title: string;
  description: string;
  tips?: string;
  transport?: string;
};

export type DayPlan = {
  day: number;
  title: string;
  activities: Activity[];
  meals?: {
    breakfast?: string;
    lunch?: string;
    dinner?: string;
  };
};

/** Successful itinerary JSON */
export type Itinerary = {
  destination: string;
  dayCount: number;
  tripDescription: string;
  days: DayPlan[];
};

export type ErrorCode =
  | "invalid_input"
  | "missing_api_key"
  | "timeout"
  | "parse_error"
  | "upstream_error";

export type ApiError = {
  error: ErrorCode;
  message: string;
};

export type GenerateResult =
  | { ok: true; itinerary: Itinerary }
  | { ok: false; status: number; body: ApiError };
