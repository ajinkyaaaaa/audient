import asyncpg
from core.config import settings

pool: asyncpg.Pool | None = None


async def init_db():
    global pool
    if settings.DATABASE_URL:
        pool = await asyncpg.create_pool(dsn=settings.DATABASE_URL)
    else:
        pool = await asyncpg.create_pool(
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            database=settings.DB_NAME,
        )
    async with pool.acquire() as conn:
        # Organizations table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS organizations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)

        await conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(20) DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
                organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                login_count INTEGER DEFAULT 0
            );
        """)
        # Migrate existing tables
        await conn.execute("""
            ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;
        """)
        await conn.execute("""
            ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'employee';
        """)
        await conn.execute("""
            ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL;
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS location_profiles (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                type VARCHAR(50) NOT NULL CHECK (type IN ('base', 'client')),
                address TEXT,
                latitude DOUBLE PRECISION,
                longitude DOUBLE PRECISION,
                use_current_location BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS clients (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                client_name VARCHAR(255) NOT NULL,
                client_code VARCHAR(100) UNIQUE NOT NULL,
                industry_sector VARCHAR(255),
                company_size VARCHAR(100),
                headquarters_location TEXT,
                primary_office_location TEXT,
                website_domain VARCHAR(255),
                client_tier VARCHAR(50) DEFAULT 'Normal' CHECK (client_tier IN ('Strategic', 'Normal', 'Low Touch')),
                engagement_health VARCHAR(20) DEFAULT 'Neutral' CHECK (engagement_health IN ('Good', 'Neutral', 'Risk')),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS stakeholders (
                id SERIAL PRIMARY KEY,
                client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                contact_name VARCHAR(255) NOT NULL,
                designation_role VARCHAR(255),
                email VARCHAR(255),
                phone VARCHAR(50),
                notes TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS visits (
                id SERIAL PRIMARY KEY,
                client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                office_label TEXT NOT NULL,
                office_address TEXT,
                planned_at TIMESTAMP NOT NULL,
                start_location TEXT NOT NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS recordings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                transcript TEXT,
                duration_seconds INTEGER,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS attendance (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                login_at TIMESTAMP DEFAULT NOW(),
                latitude DOUBLE PRECISION,
                longitude DOUBLE PRECISION,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        # Migrate: org config columns
        await conn.execute("""
            ALTER TABLE organizations ADD COLUMN IF NOT EXISTS login_time TIME DEFAULT '09:00';
        """)
        await conn.execute("""
            ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logoff_time TIME DEFAULT '18:00';
        """)
        await conn.execute("""
            ALTER TABLE organizations ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'Asia/Kolkata';
        """)
        # Migrate: attendance period column
        await conn.execute("""
            ALTER TABLE attendance ADD COLUMN IF NOT EXISTS period VARCHAR(20);
        """)
        # Migrate: org join code
        await conn.execute("""
            ALTER TABLE organizations ADD COLUMN IF NOT EXISTS join_code VARCHAR(20) UNIQUE;
        """)
        # Migrate: live location sync columns on users
        await conn.execute("""
            ALTER TABLE users ADD COLUMN IF NOT EXISTS loc_lat DOUBLE PRECISION;
        """)
        await conn.execute("""
            ALTER TABLE users ADD COLUMN IF NOT EXISTS loc_lng DOUBLE PRECISION;
        """)
        await conn.execute("""
            ALTER TABLE users ADD COLUMN IF NOT EXISTS loc_synced_at TIMESTAMP;
        """)
        # Migrate: org location sync interval (seconds)
        await conn.execute("""
            ALTER TABLE organizations ADD COLUMN IF NOT EXISTS location_sync_interval INTEGER DEFAULT 5;
        """)
        # Migrate: client office GPS coordinates
        await conn.execute("""
            ALTER TABLE clients ADD COLUMN IF NOT EXISTS office_latitude DOUBLE PRECISION;
        """)
        await conn.execute("""
            ALTER TABLE clients ADD COLUMN IF NOT EXISTS office_longitude DOUBLE PRECISION;
        """)
        # Migrate: org base location
        await conn.execute("""
            ALTER TABLE organizations ADD COLUMN IF NOT EXISTS base_lat DOUBLE PRECISION;
        """)
        await conn.execute("""
            ALTER TABLE organizations ADD COLUMN IF NOT EXISTS base_lng DOUBLE PRECISION;
        """)
        await conn.execute("""
            ALTER TABLE organizations ADD COLUMN IF NOT EXISTS base_label VARCHAR(255) DEFAULT 'Base';
        """)
        await conn.execute("""
            ALTER TABLE organizations ADD COLUMN IF NOT EXISTS base_address TEXT;
        """)
        await conn.execute("""
            ALTER TABLE organizations ADD COLUMN IF NOT EXISTS base_geofence_radius INTEGER DEFAULT 120;
        """)
        await conn.execute("""
            ALTER TABLE organizations ADD COLUMN IF NOT EXISTS base_office_details TEXT;
        """)
        # Centralized geo-locator VIEW
        await conn.execute("""
            CREATE OR REPLACE VIEW geo_locations AS
              SELECT 'org_base'::text AS source_type,
                     o.id AS org_id, NULL::int AS user_id, NULL::int AS client_id,
                     COALESCE(o.base_label, 'Base') AS label, o.base_address AS address,
                     o.base_lat AS latitude, o.base_lng AS longitude,
                     150 AS radius_meters, 1 AS priority
              FROM organizations o
              WHERE o.base_lat IS NOT NULL AND o.base_lng IS NOT NULL
              UNION ALL
              SELECT 'client'::text, NULL, c.user_id, c.id,
                     c.client_name, c.primary_office_location,
                     c.office_latitude, c.office_longitude, 200, 2
              FROM clients c
              WHERE c.office_latitude IS NOT NULL AND c.office_longitude IS NOT NULL
              UNION ALL
              SELECT 'saved'::text, NULL, lp.user_id, NULL,
                     lp.name, lp.address, lp.latitude, lp.longitude, 100, 3
              FROM location_profiles lp
              WHERE lp.latitude IS NOT NULL AND lp.longitude IS NOT NULL;
        """)
    print("Database initialized — tables ready")


async def close_db():
    global pool
    if pool:
        await pool.close()
        pool = None


def get_pool() -> asyncpg.Pool:
    assert pool is not None, "Database pool not initialized"
    return pool
