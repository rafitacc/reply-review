select indexname, indexdef
from pg_indexes
where tablename = 'replies';