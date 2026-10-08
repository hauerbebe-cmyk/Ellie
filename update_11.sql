-- Update 11: Appetit "Fast alles" (Wert 2,5) erlauben
alter table daily_log alter column appetite type numeric using appetite::numeric;
