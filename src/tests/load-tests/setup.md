# Load testing with k6

https://grafana.com/docs/k6/latest/

### Setup

```
brew install k6
```

### Supported Endpoints

#### /health

```
k6 run src/tests/load-tests/health.js --env ACCESS_TOKEN=12345
```

#### /parcels

```
k6 run src/tests/load-tests/parcels.js --env ACCESS_TOKEN=12345
```

#### /application-validate

```
k6 run src/tests/load-tests/application-validate.js --env ACCESS_TOKEN=12345
```

#### /payments-calculate

```
k6 run src/tests/load-tests/payments-calculate.js --env ACCESS_TOKEN=12345
```

#### /validation-run

```
k6 run src/tests/load-tests/validation-run.js --env ACCESS_TOKEN=12345
```

#### /validation-runs

```
k6 run src/tests/load-tests/validation-runs.js --env ACCESS_TOKEN=12345
```
