#!/usr/bin/env python3
"""
tools/generate-types.py — regenerate types/database.ts from the live schema.

2026-08-30. Reads information_schema directly, so the output cannot disagree with
the database. That distinction matters here: schema-snapshot.json is
hand-maintained and went stale TWICE in a single day, once within minutes of a
table being created.

WHAT IT PREVENTS, from one night of measured evidence:

  profiles.apps_used and profiles.last_active_app did not exist, and
  javari-components wrote to them on every sign-in. Sign-in tracking never worked
  for any app using that library. With generated types that is a compile error on
  the day the code is written.

  javari-realty carried 135 type errors; 78 of them were "Property does not exist
  on type {}" — the shape a Supabase client returns when it has no Database type.

  A CRM contacts page declared `[k: string]: unknown` and rendered blanks where
  customer names and emails belong.

USAGE
    python3 tools/generate-types.py > types/database.ts

The file is ~1.25 MB, which exceeds the GitHub contents API limit — push it with
the Git Data API (blob, tree, commit, ref) rather than a contents PUT.

RUN IT NIGHTLY. A generated file that is generated once is a snapshot, and a
snapshot is the thing this replaces.

CR AudioViz AI, LLC · EIN 39-3646201
"""

import os
import sys
import json
import urllib.request

# Postgres type -> TypeScript. Anything unmapped becomes `unknown` deliberately:
# a wrong guess is worse than an honest one, because `unknown` forces the caller
# to narrow while a wrong `string` silently compiles and fails at runtime.
TS_TYPES = {
    "text": "string",
    "character varying": "string",
    "character": "string",
    "uuid": "string",
    "date": "string",
    "timestamp with time zone": "string",
    "timestamp without time zone": "string",
    "time without time zone": "string",
    "time with time zone": "string",
    "integer": "number",
    "bigint": "number",
    "smallint": "number",
    "numeric": "number",
    "real": "number",
    "double precision": "number",
    "boolean": "boolean",
    "jsonb": "Json",
    "json": "Json",
    "ARRAY": "unknown[]",
    # USER-DEFINED is a postgres enum. Emitted as string rather than a union
    # because information_schema does not carry the enum members; widening to a
    # union needs a second query against pg_enum, which is worth doing when the
    # enums matter.
    "USER-DEFINED": "string",
    "bytea": "string",
    "interval": "string",
    "inet": "string",
    "tsvector": "string",
}

HEADER = '''/**
 * types/database.ts — GENERATED. Do not edit by hand.
 *
 * Regenerate: python3 tools/generate-types.py > types/database.ts
 *
 * Read from information_schema on the live database, so it cannot drift the way a
 * hand-maintained snapshot does.
 *
 * CR AudioViz AI, LLC · EIN 39-3646201
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {'''

FOOTER = """    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}"""


def fetch_columns() -> list[dict]:
    """Every column of every BASE TABLE in public, in ordinal order."""
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        sys.exit("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.")

    sql = """
        select c.table_name, c.column_name, c.data_type,
               c.is_nullable, c.column_default
        from information_schema.columns c
        join information_schema.tables t
          on t.table_schema = c.table_schema
         and t.table_name = c.table_name
        where c.table_schema = 'public'
          and t.table_type = 'BASE TABLE'
        order by c.table_name, c.ordinal_position
    """
    req = urllib.request.Request(
        f"{url}/rest/v1/rpc/exec_sql",
        data=json.dumps({"query": sql}).encode(),
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            # A browser User-Agent is REJECTED by the new sb_secret_ keys — that
            # broke four pipeline scripts on 2026-08-29.
            "User-Agent": "craudiovizai-typegen/1.0",
        },
        method="POST",
    )
    return json.loads(urllib.request.urlopen(req, timeout=120).read())


def emit(columns: list[dict]) -> str:
    tables: dict[str, list[dict]] = {}
    for row in columns:
        tables.setdefault(row["table_name"], []).append(row)

    out = [HEADER]
    for table, cols in sorted(tables.items()):
        out.append(f"      {table}: {{")

        # Row: what a select returns. Nullable columns are `| null`, because a
        # caller that forgets to check is the bug this file exists to catch.
        out.append("        Row: {")
        for c in cols:
            ts = TS_TYPES.get(c["data_type"], "unknown")
            nul = " | null" if c["is_nullable"] == "YES" else ""
            out.append(f"          {c['column_name']}: {ts}{nul}")
        out.append("        }")

        # Insert: a column is optional only if it is nullable OR has a default.
        # Getting this wrong in either direction is costly — too strict and every
        # insert needs filler, too loose and a NOT NULL column slips through to a
        # runtime constraint violation.
        out.append("        Insert: {")
        for c in cols:
            ts = TS_TYPES.get(c["data_type"], "unknown")
            nul = " | null" if c["is_nullable"] == "YES" else ""
            opt = "?" if (c["is_nullable"] == "YES" or c["column_default"] is not None) else ""
            out.append(f"          {c['column_name']}{opt}: {ts}{nul}")
        out.append("        }")

        # Update: everything optional, by definition of a partial update.
        out.append("        Update: {")
        for c in cols:
            ts = TS_TYPES.get(c["data_type"], "unknown")
            nul = " | null" if c["is_nullable"] == "YES" else ""
            out.append(f"          {c['column_name']}?: {ts}{nul}")
        out.append("        }")
        out.append("      }")

    out.append(FOOTER)
    return "\n".join(out) + "\n"


if __name__ == "__main__":
    sys.stdout.write(emit(fetch_columns()))
