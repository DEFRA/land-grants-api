lint:
	npm run lint
	npm run lint:types
	npm run format:check

lint-fix:
	npm run lint:fix
	npm run format

test:
	npm run test:quick

test/all:
	npm run test && npm run test:db && npm run test:e2e

test/contracts:
	npm run test:contracts
