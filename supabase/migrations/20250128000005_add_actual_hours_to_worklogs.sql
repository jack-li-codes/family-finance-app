alter table public.worklogs
add column if not exists actual_hours numeric;

comment on column public.worklogs.actual_hours is '实际工时（可手动调整）；为空时默认取 hours';
