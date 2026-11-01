-- Reference schema. The application creates these tables automatically on startup
-- (SQLAlchemy create_all); run this file manually only if you prefer SQL migrations.
 
CREATE TABLE IF NOT EXISTS users (
    id               SERIAL PRIMARY KEY,
    email            VARCHAR(255) NOT NULL UNIQUE,
    full_name        VARCHAR(120) NOT NULL,
    hashed_password  VARCHAR(255) NOT NULL,
    role             VARCHAR(20)  NOT NULL DEFAULT 'user'
                     CHECK (role IN ('user', 'researcher', 'admin')),
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_users_email ON users (email);
 
CREATE TABLE IF NOT EXISTS predictions (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    lead_time        INTEGER      NOT NULL CHECK (lead_time IN (3, 6, 9, 12)),
    inputs           JSON         NOT NULL,
    predicted_class  VARCHAR(40)  NOT NULL,
    probabilities    JSON         NOT NULL,
    contributions    JSON         NOT NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_predictions_user_id ON predictions (user_id);
CREATE INDEX IF NOT EXISTS ix_predictions_created_at ON predictions (created_at);
