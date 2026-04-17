-- Speed up cron_maintenance_cleanup deletes on cron_heartbeat(ran_at)
create index if not exists cron_heartbeat_ran_at_idx on public.cron_heartbeat (ran_at asc);
