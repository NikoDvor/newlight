
-- Performance indexes for booking slot lookup
CREATE INDEX IF NOT EXISTS idx_appointments_calendar_start ON public.appointments (calendar_id, start_time) WHERE status != 'cancelled';
CREATE INDEX IF NOT EXISTS idx_appointments_client_calendar ON public.appointments (client_id, calendar_id);
CREATE INDEX IF NOT EXISTS idx_calendar_availability_calendar ON public.calendar_availability (calendar_id, day_of_week) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_calendar_blackout_dates_calendar ON public.calendar_blackout_dates (calendar_id, start_datetime, end_datetime);
CREATE INDEX IF NOT EXISTS idx_calendar_booking_links_slug ON public.calendar_booking_links (slug) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_appointments_assigned_user ON public.appointments (assigned_user_id, calendar_id) WHERE status != 'cancelled';
