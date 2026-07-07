CREATE TYPE public.product_status AS ENUM ('em_construcao', 'ativo');
CREATE TYPE public.sales_platform AS ENUM ('hotmart', 'kiwify', 'kirvano', 'stripe');

ALTER TABLE public.products
  ADD COLUMN status public.product_status NOT NULL DEFAULT 'em_construcao',
  ADD COLUMN project_link TEXT,
  ADD COLUMN sales_platform public.sales_platform,
  ADD COLUMN checkout_link TEXT,
  ADD COLUMN instagram TEXT,
  ADD COLUMN suggested_price NUMERIC(12,2);
