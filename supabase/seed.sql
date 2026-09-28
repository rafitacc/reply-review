-- reply-review: local development seed
--
-- Runs after migrations on `supabase db reset`. Everything here is invented:
-- people, brands, customers and orders.
--
-- All users share the password `password123`.
--
--   Marta   marta@reply-review.test   lead of Voltra and Packwell
--   Nuria   nuria@reply-review.test   lead of Lumen
--   Dani    dani@reply-review.test    specialist on Voltra and Packwell
--   Lucía   lucia@reply-review.test   specialist on Packwell and Lumen
--   Tomás   tomas@reply-review.test   specialist on Voltra
--
-- Timestamps are relative to the day the seed runs, so "yesterday" is always
-- yesterday. Issue types are reference data and ship with the migration.

-- Midnight of today (database time zone) minus `days`, plus a time of day.
create function pg_temp.seed_at(days int, time_of_day text)
returns timestamptz
language sql
as $$
  select date_trunc('day', now()) - make_interval(days => days) + time_of_day::interval
$$;

-- ---------------------------------------------------------------------------
-- Users
-- GoTrue fails to sign in users whose token columns are null, so every token
-- column is set to an empty string.
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('password123', extensions.gen_salt('bf')),
  now(), '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', u.full_name),
  now() - interval '30 days', now() - interval '30 days',
  '', '', '', '', '', '', '', ''
from (values
  ('00000000-0000-4000-a000-000000000001'::uuid, 'marta@reply-review.test', 'Marta Soler'),
  ('00000000-0000-4000-a000-000000000002'::uuid, 'nuria@reply-review.test', 'Nuria Vidal'),
  ('00000000-0000-4000-a000-000000000003'::uuid, 'dani@reply-review.test',  'Dani Ferrer'),
  ('00000000-0000-4000-a000-000000000004'::uuid, 'lucia@reply-review.test', 'Lucía Romero'),
  ('00000000-0000-4000-a000-000000000005'::uuid, 'tomas@reply-review.test', 'Tomás Herrera')
) as u (id, email, full_name);

insert into auth.identities (
  id, user_id, provider_id, provider, identity_data,
  last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(), u.id, u.id::text, 'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  now(), u.created_at, u.created_at
from auth.users u
where u.email like '%@reply-review.test';

insert into public.profiles (id, full_name)
select id, raw_user_meta_data ->> 'full_name'
from auth.users
where email like '%@reply-review.test';

-- ---------------------------------------------------------------------------
-- Brands
-- ---------------------------------------------------------------------------
insert into public.brands (id, name, slug, voice_guidelines) values
(
  'b0000000-0000-4000-a000-000000000001', 'Voltra', 'voltra',
  $t$Voltra sells electric scooters (City, S2, S2 Pro). Most "it's broken" emails are usage errors, so a good reply diagnoses before it offers a return or refund.

- Warm and patient. The customer is often frustrated and standing next to a scooter that won't move.
- Ask one clarifying question at a time. Never send a checklist of five questions.
- Check the usual suspects first: battery lock in the app, firmware version, tyre pressure (S2 and S2 Pro only, the City has solid tyres), brake lever sensor.
- Offer a return or repair only once the basics are ruled out, and say why.
- Sign with your first name.$t$
),
(
  'b0000000-0000-4000-a000-000000000002', 'Packwell', 'packwell',
  $t$Packwell supplies industrial packaging to warehouses and fulfilment centres. The customer is a buyer or a warehouse manager with a delivery to plan around.

- Fast, exact, about three lines.
- Always state quantities, SKUs and dates. "Soon" or "in the coming days" is not a date.
- No small talk, no exclamation marks, no "I hope this email finds you well".
- If something is unknown, say when you will know it.
- Target first response: under 60 minutes during business hours.$t$
),
(
  'b0000000-0000-4000-a000-000000000003', 'Lumen', 'lumen',
  $t$Lumen sells skincare online (cleansers, serums, SPF, a monthly refill subscription).

- Gentle and reassuring. People write when their skin reacts or a gift is late; both feel personal.
- Never give medical advice. Do not say a product is safe for a condition, pregnancy or medication. Suggest a patch test and a pharmacist or dermatologist instead.
- Always check the order history before answering anything about delivery: split shipments, back-orders and subscription skips explain most "where is my order" emails.
- Offer a practical next step (replacement, refund, tracking link) in the same email.$t$
);

-- ---------------------------------------------------------------------------
-- Memberships
-- ---------------------------------------------------------------------------
insert into public.brand_members (brand_id, user_id, role) values
  -- Voltra: Marta leads, Dani and Tomás write
  ('b0000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000001', 'lead'),
  ('b0000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000003', 'specialist'),
  ('b0000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000005', 'specialist'),
  -- Packwell: Marta leads, Dani and Lucía write
  ('b0000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000001', 'lead'),
  ('b0000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000003', 'specialist'),
  ('b0000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000004', 'specialist'),
  -- Lumen: Nuria leads, Lucía writes
  ('b0000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000002', 'lead'),
  ('b0000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000004', 'specialist');

-- ---------------------------------------------------------------------------
-- Replies (6 per brand, last 14 days, 6 of them sent yesterday)
-- ---------------------------------------------------------------------------

-- Voltra ---------------------------------------------------------------------
insert into public.replies (id, brand_id, specialist_id, subject, customer_message, reply_body, sent_at, first_response_minutes) values
(
  -- Problem: refund offered straight away, no diagnosis.
  'c0000000-0000-4000-a000-000000000001',
  'b0000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000005',
  'Scooter dead after first charge',
  $t$Hi,

I got my S2 on Friday, charged it overnight like the manual says and this morning it won't do anything. The display lights up and shows a little padlock but when I push off and press the throttle nothing happens. I need this to get to work. Really disappointed.

Jordi Casals$t$,
  $t$Hi Jordi,

I'm really sorry to hear that your scooter isn't working. That's definitely not the experience we want you to have.

I've gone ahead and started a return for you. You'll receive a prepaid label by email within 24 hours, and once the scooter is back in our warehouse we'll issue a full refund to your original payment method.

Again, apologies for the trouble.

Tomás
Voltra Support$t$,
  pg_temp.seed_at(1, '09:12'), 35
),
(
  -- Excellent: diagnoses, one question, explains why.
  'c0000000-0000-4000-a000-000000000002',
  'b0000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000003',
  'S2 Pro cuts out on hills',
  $t$Hello,

My S2 Pro keeps cutting power when I go up the hill near my house. It's not even low on battery, it happens at 25-30%. The display goes blank for a second and then comes back. I've had it three months and it only started last week. Is the battery going?

Thanks,
Priya$t$,
  $t$Hi Priya,

Thanks for describing it so clearly, that helps a lot. A short blackout on a climb at 25-30% is usually not the battery itself. On the S2 Pro it's most often the power management in older firmware: on a steep hill the motor asks for more current than the firmware allows at that charge level, so it cuts out to protect the cells.

Before anything else, could you open the Voltra app, go to Settings > About scooter and tell me the firmware version you see there?

If it's below 2.4, the update fixes exactly this and takes about ten minutes. If you're already on 2.4, I'll walk you through a quick battery health check next.

Speak soon,
Dani
Voltra Support$t$,
  pg_temp.seed_at(2, '11:40'), 22
),
(
  -- Problem: wrong about the customer's own product (the City has solid tyres).
  'c0000000-0000-4000-a000-000000000003',
  'b0000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000005',
  'Ride feels very bumpy',
  $t$Hi there,

I bought the Voltra City in March. Lately the ride feels much harsher than it used to, every crack in the pavement goes straight up my knees. Is there something I can adjust or is this normal?

Best,
Hugo Marín$t$,
  $t$Hi Hugo,

Thanks for getting in touch! A harsher ride is almost always down to tyre pressure. Tyres lose a bit of air every week, so it's worth checking them regularly.

For the Voltra City we recommend 50 psi front and rear. You can use any bike pump with a Schrader valve. Once they're back up to pressure the ride should feel much smoother.

Let me know how you get on!

Tomás
Voltra Support$t$,
  pg_temp.seed_at(1, '14:05'), 48
),
(
  'c0000000-0000-4000-a000-000000000004',
  'b0000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000003',
  'Won''t move, lock symbol on screen',
  $t$My scooter shows a lock symbol and the motor won't engage. I lent it to my brother yesterday and now it doesn't work. Did he break something??

Sara$t$,
  $t$Hi Sara,

Good news: I don't think anything is broken. The lock symbol means the battery lock is on. It can be switched on from any phone that's paired with the scooter, so your brother may have tapped it in the app without noticing.

To switch it off, open the Voltra app on your phone, tap the scooter, and toggle "Battery lock" off. The symbol should disappear within a few seconds and the throttle will work again.

If the app doesn't show the scooter at all, reply and tell me, and we'll re-pair it together.

Dani
Voltra Support$t$,
  pg_temp.seed_at(1, '16:30'), 18
),
(
  -- Mediocre: fine content but three questions at once.
  'c0000000-0000-4000-a000-000000000005',
  'b0000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000005',
  'App won''t connect',
  $t$Hi, the app can't find my scooter anymore. It used to work fine. I have an iPhone 13. What should I do?

Marc$t$,
  $t$Hi Marc,

Sorry about that! To figure out what's going on, could you tell me:

1. Which scooter model do you have and what firmware version is it on?
2. Is Bluetooth enabled for the Voltra app in your iPhone settings?
3. Have you recently updated iOS or reinstalled the app?
4. Does the scooter show up in your iPhone's Bluetooth menu at all?

Once I have those answers I can point you in the right direction.

Thanks,
Tomás
Voltra Support$t$,
  pg_temp.seed_at(9, '10:20'), 95
),
(
  'c0000000-0000-4000-a000-000000000006',
  'b0000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000003',
  'Squeaky rear brake',
  $t$Rear brake started squeaking loudly when I stop. It still brakes fine but people turn around to look at me. S2, about 6 months old.

Álex$t$,
  $t$Hi Álex,

A squeak with normal braking power usually means a bit of dust or grease on the rear disc, which happens after riding in the rain. Nothing dangerous, and it's an easy fix.

Wipe the disc with a clean cloth and a little isopropyl alcohol (not WD-40, which makes it worse), let it dry for a minute and do a few gentle stops.

Does the squeak stay after that? If so, the pads may need a quick adjustment and I'll send you the two-minute guide.

Dani
Voltra Support$t$,
  pg_temp.seed_at(12, '12:15'), 27
);

-- Packwell -------------------------------------------------------------------
insert into public.replies (id, brand_id, specialist_id, subject, customer_message, reply_body, sent_at, first_response_minutes) values
(
  -- Problem: long, chatty, vague about the delivery date.
  'c0000000-0000-4000-a000-000000000007',
  'b0000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000004',
  'PO 88213 delivery date',
  $t$Hi,

PO 88213: 40 pallets of DW-600 double-wall boxes. Your confirmation said week 38. We have a peak-season intake booked and need a firm delivery date to schedule dock staff.

Laura Pons
Inbound Logistics, Nordhaven Fulfilment$t$,
  $t$Hi Laura,

I hope you're having a great week so far! Thank you so much for reaching out to us, and for being such a valued Packwell customer.

I completely understand how important it is to have visibility on your deliveries, especially as we head into the busy season. I know how hectic it can get in the warehouse at this time of year!

I've checked in with our production team and they're working hard on your order. There have been some delays on our side with corrugated board supply recently, which has affected a few orders, but the team is doing everything they can to get things back on track. Your boxes should be with you in the coming days, and I'll make sure to keep you posted if anything changes along the way.

Please don't hesitate to reach out if you have any other questions in the meantime. We're always happy to help!

Warm regards,
Lucía
Packwell Customer Service$t$,
  pg_temp.seed_at(1, '08:50'), 140
),
(
  -- Excellent: three lines, quantities, SKUs, dates.
  'c0000000-0000-4000-a000-000000000008',
  'b0000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000003',
  'Add to order 88407?',
  $t$Can we add 12 rolls of TP-48 brown tape and 5 more pallets of SW-300 to order 88407 before it ships? Same delivery address.

Iker Olaizola, Bidasoa Distribución$t$,
  $t$Hi Iker,

Added to order 88407: 12 x TP-48 (brown tape, 48 mm) and 5 pallets SW-300. Total is now 17 pallets SW-300.
Delivery date unchanged: Thursday, same address in Irun, 08:00-12:00 slot.
Updated confirmation attached.

Dani
Packwell$t$,
  pg_temp.seed_at(3, '10:05'), 14
),
(
  'c0000000-0000-4000-a000-000000000009',
  'b0000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000004',
  'Swap SKU on standing order',
  $t$From next month please replace SW-200 with SW-250 on our standing order. Same quantity (8 pallets/month).

Rosa Ibáñez, Levante Pack & Ship$t$,
  $t$Hi Rosa,

Done. From the next delivery your standing order is 8 pallets/month of SW-250 instead of SW-200.
SW-250 is 0.14 EUR/unit more; the new price is on the attached confirmation.

Lucía
Packwell$t$,
  pg_temp.seed_at(4, '15:20'), 32
),
(
  'c0000000-0000-4000-a000-000000000010',
  'b0000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000003',
  'Invoice copy',
  $t$Need a copy of invoice INV-24-10377, our accounts team can't find it.

Pau Riera$t$,
  $t$Hi Pau,

Copy of INV-24-10377 (order 87950, 22 pallets SW-300) attached.
It was also sent to accounts@riera-logistica.example on the invoice date.

Dani
Packwell$t$,
  pg_temp.seed_at(1, '11:30'), 9
),
(
  -- Problem: answered a different question (17 micron, customer asked 23), and slow.
  'c0000000-0000-4000-a000-000000000011',
  'b0000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000004',
  'Quote: stretch film 23 micron',
  $t$Please quote 60 rolls of machine stretch film, 23 micron, 500 mm. We run it on a turntable wrapper, the 17 micron we tried tears too often.

Óscar Gil, Almacenes Gil$t$,
  $t$Hi Óscar,

Quote for 60 rolls SF-17-500 (17 micron, 500 mm machine film): 18.90 EUR/roll, 1,134.00 EUR total ex. VAT.
Lead time 5 working days.

Lucía
Packwell$t$,
  pg_temp.seed_at(8, '13:45'), 610
),
(
  'c0000000-0000-4000-a000-000000000012',
  'b0000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000003',
  'Tape back-order?',
  $t$Our order 87711 arrived without the 30 rolls of TP-50-CLR clear tape. Delivery note says back-order. When will it come?

Elena Duarte$t$,
  $t$Hi Elena,

TP-50-CLR is back in stock on the 14th. Your 30 rolls ship that day and arrive the 15th, no delivery charge.
I'll email the tracking number when it leaves.

Dani
Packwell$t$,
  pg_temp.seed_at(13, '09:00'), 21
);

-- Lumen ----------------------------------------------------------------------
insert into public.replies (id, brand_id, specialist_id, subject, customer_message, reply_body, sent_at, first_response_minutes) values
(
  -- Problem: delivery answer without checking order history (split shipment).
  'c0000000-0000-4000-a000-000000000013',
  'b0000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000004',
  'Still missing part of my order',
  $t$Hi Lumen team,

I ordered the Calm Barrier cream and the Vitamin C serum on the 3rd. The cream arrived last week but there's no sign of the serum and it's been 10 days. It was meant to be a birthday present for my sister this weekend. Can you help?

Carmen$t$,
  $t$Hi Carmen,

Thank you so much for reaching out, and I'm sorry for the wait!

Our orders usually ship within 3-5 working days, and delivery can take up to 10 working days depending on your location. Sometimes the couriers are a little slower than we'd like, especially at busy times.

If your parcel hasn't arrived in the next few days, please let us know and we'll be happy to look into it for you.

Warmly,
Lucía
Lumen Care$t$,
  pg_temp.seed_at(1, '10:45'), 60
),
(
  -- Excellent: reassuring, no medical advice, practical next step.
  'c0000000-0000-4000-a000-000000000014',
  'b0000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000004',
  'Redness after the new serum',
  $t$I started the Retinal Night Serum four days ago and my cheeks are red and a bit itchy. I'm a bit worried. Should I keep using it? I paid quite a lot for it.

Irene$t$,
  $t$Hi Irene,

Thank you for telling us, and I'm sorry your skin is uncomfortable. I'd stop using the serum for now and go back to a simple routine: a gentle cleanser and a moisturiser you already know your skin is happy with.

I can't tell you whether this is a normal adjustment or a reaction, but a pharmacist or dermatologist can, and it's worth showing them if the redness hasn't settled in a few days. If you'd like to try the serum again later, a small patch test on your inner arm first is a good idea.

Either way, you won't be out of pocket: I've refunded the serum to your card today (order LM-40218), and you don't need to send it back.

Take care,
Lucía
Lumen Care$t$,
  pg_temp.seed_at(2, '15:10'), 40
),
(
  -- Problem: medical advice, and wrong.
  'c0000000-0000-4000-a000-000000000015',
  'b0000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000004',
  'Safe during pregnancy?',
  $t$Hello, I just found out I'm pregnant. Can I keep using the Retinal Night Serum?

Thanks,
Noa$t$,
  $t$Hi Noa,

Congratulations! Yes, the Retinal Night Serum is very gentle and perfectly safe to keep using during pregnancy. It's one of our most popular products and many of our customers use it every night.

Enjoy it!
Lucía
Lumen Care$t$,
  pg_temp.seed_at(6, '09:30'), 25
),
(
  'c0000000-0000-4000-a000-000000000016',
  'b0000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000004',
  'Pump broken on arrival',
  $t$My Daily Gel Cleanser arrived with the pump snapped off and some of it leaked in the box. Not the end of the world but a bit annoying.

Beatriz$t$,
  $t$Hi Beatriz,

I'm sorry, that's not how it should arrive. I can see the Daily Gel Cleanser on your order LM-39877 from Monday, so I've sent a replacement today by tracked post: it should reach you on Thursday. No need to return the broken one.

Thanks for letting us know,
Lucía
Lumen Care$t$,
  pg_temp.seed_at(7, '12:00'), 55
),
(
  'c0000000-0000-4000-a000-000000000017',
  'b0000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000004',
  'Skip next month''s refill',
  $t$Can I skip next month's refill box? I still have plenty left. I don't want to cancel.

Marina$t$,
  $t$Hi Marina,

Of course. I've skipped your refill box for next month, so nothing will be charged or sent. Your subscription picks up again the month after, same day as usual.

You can also skip from My Account > Subscription whenever you like.

Lucía
Lumen Care$t$,
  pg_temp.seed_at(10, '16:20'), 70
),
(
  'c0000000-0000-4000-a000-000000000018',
  'b0000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000004',
  'Discount code not working',
  $t$The code WELCOME15 from your newsletter says "invalid" at checkout. I'm trying to buy the SPF 50 Fluid.

Julia$t$,
  $t$Hi Julia,

Sorry about that. WELCOME15 is for a first order only, and I can see you've shopped with us before, which is why checkout rejected it. Thank you for coming back!

I've made a personal code for you instead: JULIA15, 15% off, valid until the end of the month and it works on the SPF 50 Fluid.

Lucía
Lumen Care$t$,
  pg_temp.seed_at(1, '13:15'), 45
);

-- ---------------------------------------------------------------------------
-- Reviews (12 of 18). Reviewer is always a lead of the reply's brand:
-- Marta for Voltra and Packwell, Nuria for Lumen.
-- created_at is a few hours after the reply was sent.
-- ---------------------------------------------------------------------------
insert into public.reviews (id, reply_id, reviewer_id, score, comment, created_at, updated_at)
select r.id, r.reply_id, r.reviewer_id, r.score, r.comment,
       rep.sent_at + r.delay, rep.sent_at + r.delay
from (values
  -- Voltra (Marta)
  ('d0000000-0000-4000-a000-000000000001'::uuid, 'c0000000-0000-4000-a000-000000000001'::uuid,
   '00000000-0000-4000-a000-000000000001'::uuid, 1::smallint,
   $t$Padlock on the display = battery lock. One line about the app toggle and Jordi would have been riding to work this afternoon. Instead we're paying return shipping on a scooter that works. Always diagnose first on Voltra, refunds come after the basics are ruled out.$t$,
   interval '5 hours'),
  ('d0000000-0000-4000-a000-000000000002', 'c0000000-0000-4000-a000-000000000002',
   '00000000-0000-4000-a000-000000000001', 5,
   $t$This is the model Voltra reply. Explains the likely cause in plain words, asks exactly one question, and tells her what happens next in both cases. Sharing this one with the team.$t$,
   interval '3 hours'),
  ('d0000000-0000-4000-a000-000000000003', 'c0000000-0000-4000-a000-000000000003',
   '00000000-0000-4000-a000-000000000001', 2,
   $t$The City has solid honeycomb tyres, there's nothing to inflate. He'll go looking for a valve and write back annoyed. Harsher ride on a City usually means worn tyres or a loose stem clamp. Check the model before giving specs.$t$,
   interval '2 hours'),
  ('d0000000-0000-4000-a000-000000000005', 'c0000000-0000-4000-a000-000000000005',
   '00000000-0000-4000-a000-000000000001', 3,
   $t$Right questions, wrong format. Four questions in a list reads like a form. Start with the one that fixes most cases (is Bluetooth allowed for the app in iOS settings?) and go from there. Also 95 minutes for a first response is on the slow side.$t$,
   interval '1 day'),

  -- Packwell (Marta)
  ('d0000000-0000-4000-a000-000000000007', 'c0000000-0000-4000-a000-000000000007',
   '00000000-0000-4000-a000-000000000001', 1,
   $t$She asked for one thing: a date. Fifteen lines and no date. "In the coming days" is exactly what we tell Packwell never to write. Get the date from production (or say when you'll have it) and send three lines. 2h20 first response on a PO question is also too slow.$t$,
   interval '4 hours'),
  ('d0000000-0000-4000-a000-000000000008', 'c0000000-0000-4000-a000-000000000008',
   '00000000-0000-4000-a000-000000000001', 5,
   $t$Perfect. Quantities, SKUs, new total, delivery slot, confirmation attached. 14 minutes. Nothing to add.$t$,
   interval '6 hours'),
  ('d0000000-0000-4000-a000-000000000009', 'c0000000-0000-4000-a000-000000000009',
   '00000000-0000-4000-a000-000000000001', 4,
   $t$Good and short. Would have been a 5 with the actual new unit price in the email instead of only in the attachment.$t$,
   interval '1 day'),
  ('d0000000-0000-4000-a000-000000000011', 'c0000000-0000-4000-a000-000000000011',
   '00000000-0000-4000-a000-000000000001', 2,
   $t$He asked for 23 micron and told us the 17 tears on his wrapper. We quoted the 17. Format is right but the content is for a different request, and it took 10 hours.$t$,
   interval '3 hours'),

  -- Lumen (Nuria)
  ('d0000000-0000-4000-a000-000000000013', 'c0000000-0000-4000-a000-000000000013',
   '00000000-0000-4000-a000-000000000002', 2,
   $t$She told us half the order arrived. That's a split shipment or a back-order, and the order history would have shown which. Generic delivery times don't help her, and it's a birthday present with a deadline. Check the order, give her the serum's status and a tracking link.$t$,
   interval '4 hours'),
  ('d0000000-0000-4000-a000-000000000014', 'c0000000-0000-4000-a000-000000000014',
   '00000000-0000-4000-a000-000000000002', 5,
   $t$Lovely. Reassuring, no diagnosis, sends her to a professional, patch test tip, and the refund is already done. This is exactly the Lumen voice.$t$,
   interval '2 hours'),
  ('d0000000-0000-4000-a000-000000000015', 'c0000000-0000-4000-a000-000000000015',
   '00000000-0000-4000-a000-000000000002', 1,
   $t$We can never tell a customer a product is safe in pregnancy, and retinoids are the ingredient most doctors ask people to stop. This needs a follow-up email today: congratulate, say we can't advise, suggest pausing until she's spoken to her midwife or GP. Let's talk 1:1 about this one.$t$,
   interval '1 hour'),
  ('d0000000-0000-4000-a000-000000000016', 'c0000000-0000-4000-a000-000000000016',
   '00000000-0000-4000-a000-000000000002', 5,
   $t$Checked the order first, replacement already on its way, delivery day given, no return needed. Short and kind. Nothing to change.$t$,
   interval '1 day')
) as r (id, reply_id, reviewer_id, score, comment, delay)
join public.replies rep on rep.id = r.reply_id;

insert into public.review_issues (review_id, issue_type_id)
select v.review_id::uuid, it.id
from (values
  ('d0000000-0000-4000-a000-000000000001', 'would_not_resolve'),
  ('d0000000-0000-4000-a000-000000000003', 'incorrect_information'),
  ('d0000000-0000-4000-a000-000000000003', 'skipped_order_history'),
  ('d0000000-0000-4000-a000-000000000005', 'wrong_tone'),
  ('d0000000-0000-4000-a000-000000000005', 'too_slow'),
  ('d0000000-0000-4000-a000-000000000007', 'wrong_tone'),
  ('d0000000-0000-4000-a000-000000000007', 'would_not_resolve'),
  ('d0000000-0000-4000-a000-000000000007', 'too_slow'),
  ('d0000000-0000-4000-a000-000000000011', 'answered_different_question'),
  ('d0000000-0000-4000-a000-000000000011', 'too_slow'),
  ('d0000000-0000-4000-a000-000000000013', 'skipped_order_history'),
  ('d0000000-0000-4000-a000-000000000013', 'would_not_resolve'),
  ('d0000000-0000-4000-a000-000000000015', 'incorrect_information'),
  ('d0000000-0000-4000-a000-000000000015', 'wrong_tone')
) as v (review_id, issue_slug)
join public.issue_types it on it.slug = v.issue_slug;
