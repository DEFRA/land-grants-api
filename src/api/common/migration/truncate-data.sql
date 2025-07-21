DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'actions') THEN TRUNCATE TABLE public.actions;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agreements') THEN TRUNCATE TABLE public.agreements;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'compatibility_matrix') THEN TRUNCATE TABLE public.compatibility_matrix;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'land_cover_codes_actions') THEN TRUNCATE TABLE public.land_cover_codes_actions;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'land_cover_codes') THEN TRUNCATE TABLE public.land_cover_codes;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'land_covers') THEN TRUNCATE TABLE public.land_covers;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'land_parcels') THEN TRUNCATE TABLE public.land_parcels;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'moorland_designations') THEN TRUNCATE TABLE public.moorland_designations;
    END IF;
END $$;