alter table subscriptions add column if not exists razorpay_plan_id text;
alter table subscriptions add column if not exists razorpay_subscription_id text;
alter table subscriptions add column if not exists razorpay_payment_id text;
alter table subscriptions add column if not exists cancel_at_period_end boolean not null default false;
