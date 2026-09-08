from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

print("--- TESTING GOVERNMENT MINES API ---")
# 1. /api/v1/mines
r_mines = client.get("/api/v1/mines")
print("GET /api/v1/mines status:", r_mines.status_code)
assert r_mines.status_code == 200
mines = r_mines.json()
print(f"Total canonical mines returned: {len(mines)}")
first_mine = mines[0]
print(f"Sample mine: {first_mine['mine_name']} ({first_mine['mine_id']})")
print(f"  Company: {first_mine['company_name']}, Subsidiary: {first_mine['subsidiary_name']}")
print(f"  FY 2024-25: {first_mine['production_fy24_25']} MT")
print(f"  FY 2025-26: {first_mine['production_fy25_26']} MT")
print(f"  FY 2026-27 YTD: {first_mine['production_fy26_27_ytd']} MT")
print(f"  YoY Growth: {first_mine['yoy_growth_percent']}%")
print(f"  Star Rating: {first_mine['star_rating']} Stars")
print(f"  Source: {first_mine['source_document']}")

# 2. /api/v1/mines/{mine_id}
r_detail = client.get(f"/api/v1/mines/{first_mine['mine_id']}")
print("\nGET /api/v1/mines/{mine_id} status:", r_detail.status_code)
assert r_detail.status_code == 200
detail = r_detail.json()
print(f"Detail yearly metrics count: {len(detail['yearly_metrics'])}")
print(f"Detail monthly metrics count: {len(detail['monthly_metrics'])}")
print(f"Detail aliases: {detail['aliases']}")
print(f"Detail provenance sources count: {len(detail['provenance_sources'])}")

# 3. /api/v1/coal-blocks
r_blocks = client.get("/api/v1/coal-blocks")
print("\nGET /api/v1/coal-blocks status:", r_blocks.status_code)
assert r_blocks.status_code == 200
print(f"Coal blocks count: {len(r_blocks.json())}")

# 4. /api/v1/data-sources
r_sources = client.get("/api/v1/data-sources")
print("\nGET /api/v1/data-sources status:", r_sources.status_code)
assert r_sources.status_code == 200
print(f"Data sources count: {len(r_sources.json())}")

# 5. /api/v1/data-conflicts
r_conflicts = client.get("/api/v1/data-conflicts")
print("\nGET /api/v1/data-conflicts status:", r_conflicts.status_code)
assert r_conflicts.status_code == 200
print(f"Data conflicts count: {len(r_conflicts.json())}")

# 6. /api/v1/data-validations
r_validations = client.get("/api/v1/data-validations")
print("\nGET /api/v1/data-validations status:", r_validations.status_code)
assert r_validations.status_code == 200
print(f"Data validations count: {len(r_validations.json())}")

# 7. /api/v1/mines-summary-stats
r_stats = client.get("/api/v1/mines-summary-stats")
print("\nGET /api/v1/mines-summary-stats status:", r_stats.status_code)
assert r_stats.status_code == 200
print("Summary stats:", r_stats.json())

print("\n--- ALL BACKEND TESTS PASSED SUCCESSFULLY! ---")
