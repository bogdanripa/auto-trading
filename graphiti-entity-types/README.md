# BVB Entity Types for Graphiti

Custom Pydantic entity types so the Graphiti LLM extractor produces clean typed
nodes (`Trade`, `Catalyst`, `News`, `Session`, ...) instead of generic NER —
which otherwise lifts every price, ticker, and casual word into a standalone
node and clutters the graph.

## What's here

- `bvb_entity_types.py` — 12 entity types covering the BVB trading domain
- `Dockerfile` — minimal extension of the upstream getzep image to inject the types

## Deploy (Cloud Run)

Assumes you have an Artifact Registry repo named `graphiti` in your GCP project.
Adjust `<PROJECT>` and region if you're elsewhere than `europe-west3`.

```bash
cd graphiti-entity-types

# 1. Build & push the extended image.
gcloud builds submit \
  --tag europe-west3-docker.pkg.dev/<PROJECT>/graphiti/server:latest .

# 2. Redeploy the Cloud Run service with the new image.
gcloud run deploy graphiti-mcp \
  --image europe-west3-docker.pkg.dev/<PROJECT>/graphiti/server:latest \
  --region europe-west3 \
  --update-env-vars GRAPHITI_ENTITY_TYPES_PATH=/app/entities/bvb.py
```

After the rollout completes, hit the server's health endpoint or call
`add_memory` with a trial episode and inspect the resulting graph. You should
see only nodes of the declared types — no naked prices or generic-word nodes.

## Important — verify the entity-types loading mechanism for your graphiti version

Different graphiti-mcp versions expose entity types differently:

- **Recent versions** (≥ 0.4.x): `GRAPHITI_ENTITY_TYPES_PATH` env var
- **Older versions**: `--entities <path>` CLI arg passed to the server entrypoint
- **Config-yaml versions**: a top-level `entities_path:` key in the mounted
  `config.yaml`

Check the version your image runs:

```bash
docker run --rm zepai/knowledge-graph-mcp:latest --help
# or
docker run --rm zepai/knowledge-graph-mcp:latest --version
```

If the env-var approach doesn't take, switch to whichever mechanism your
version supports — the entity-types Python file itself is unchanged.

## Verifying it worked

After deploy, in any MCP client (claude.ai chat with the connector, or local
Claude Code CLI):

```
mcp__graphiti__add_memory(
  name="schema test",
  episode_body='{"ticker": "TLV", "entry_price": 38.54, "thesis": "test"}',
  source="json",
  group_id="auto_trader",
)
```

Then `search_nodes(query: "TLV")` and inspect what came back. With the schema
loaded, you should see a single `Company(ticker=TLV)` node — NOT separate
nodes for `38.54`, `entry_price`, etc.

## Alternative — Cloud Run volume mount (no rebuild)

If you'd rather not rebuild the image:

1. Upload `bvb_entity_types.py` to a GCS bucket: `gs://<bucket>/graphiti/bvb.py`
2. Mount the bucket on Cloud Run with `--add-volume name=entities,type=cloud-storage,bucket=<bucket>` and `--add-volume-mount volume=entities,mount-path=/app/entities`
3. Set `GRAPHITI_ENTITY_TYPES_PATH=/app/entities/graphiti/bvb.py` env var

Slower to iterate (need to re-upload to GCS each time), but you skip the
build pipeline entirely.
