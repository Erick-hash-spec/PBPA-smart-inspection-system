# backend/scripts/

One-off utility, analysis, patch, and standalone test scripts used during development.

These are **not** part of the application runtime. Do not import from these in production code.

| Script | Purpose |
|---|---|
| gen_cert.py | Generate self-signed TLS certificates for local HTTPS |
| load_sample_data.py | Seed the database with sample data |
| analyze_excel.py / extract_excel.py | Parse ASTM Excel tables |
| dump_astm.py / extract_astm_tables.py | Export ASTM lookup data to JSON |
| patch_*.py | One-time data/code patches applied during development |
| verify_*.py | Ad-hoc verification scripts |
| test_*.py | Standalone integration tests (not Django test runner) |
| reverse_engineer*.py | Schema reverse-engineering helpers |
| generate_proposal_docx.py | Generate proposal document |
| read_docs.py | Parse Word documents |
| run_calc_test.py | Quick calculation smoke test |
| map_cells.py / verify_cells.py | Excel cell mapping helpers |
