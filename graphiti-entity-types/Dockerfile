# Minimal extension of the upstream getzep/graphiti-mcp image.
# Adds BVB-specific entity types so the LLM extractor produces clean typed nodes
# instead of generic NER (which lifts every price / "cash" / "evening" into a node).
#
# Rebuild & redeploy:
#   gcloud builds submit --tag europe-west3-docker.pkg.dev/<PROJECT>/graphiti/server:latest .
#   gcloud run deploy graphiti-mcp \
#     --image europe-west3-docker.pkg.dev/<PROJECT>/graphiti/server:latest \
#     --region europe-west3 \
#     --update-env-vars GRAPHITI_ENTITY_TYPES_PATH=/app/entities/bvb.py

FROM zepai/knowledge-graph-mcp:latest

# Drop the BVB entity types module into a known location.
COPY bvb_entity_types.py /app/entities/bvb.py

# Tell the server where to load entity types from.
# (Exact env-var name varies by graphiti-mcp version — see README; adjust if your
#  version uses a different mechanism such as a config.yaml `entities_path:` key.)
ENV GRAPHITI_ENTITY_TYPES_PATH=/app/entities/bvb.py
