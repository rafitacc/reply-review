select
  (select count(*) from profiles) as usuarios,
  (select count(*) from brands)   as marcas,
  (select count(*) from replies)  as respuestas,
  (select count(*) from reviews)  as revisiones;