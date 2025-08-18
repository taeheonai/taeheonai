CREATE TABLE "user" (
    id SERIAL PRIMARY KEY,
    industry TEXT,
    company_id INTEGER REFERENCES corporation(id),
    email TEXT,
    name TEXT,
    birth TEXT,
    auth_id TEXT,
    auth_pw TEXT
);
