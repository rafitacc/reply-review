insert into replies (brand_id, specialist_id, customer_message, reply_body, sent_at)
select b.id, p.id, 'test', 'test', now()
from brands b, profiles p
where b.name = 'Packwell' and p.full_name like 'Tomás%';