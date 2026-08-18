.PHONY: dev build lint

dev:
	@fuser -k 5188/tcp 2>/dev/null || true
	@npm run dev -- --host 0.0.0.0 --port 5188 --strictPort

build:
	@npm run build

lint:
	@npm run lint
