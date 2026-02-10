# Load testing with k6

By default the tests will run for 100 concurrent users, for 30 seconds, this can be configured here: `src/tests/load-tests/options.js`

### Install k6

https://grafana.com/docs/k6/latest/

```
brew install k6
```

### Configuration

Create a file `src/tests/load-tests/config.js`; add to it:

```
export const accessTokenLocal = 'YOUR_TOKEN'

```

### Supported Endpoints

#### /health

```
k6 run src/tests/load-tests/health.js
```

#### /parcels

```
k6 run src/tests/load-tests/parcels.js
```

#### /application-validate

```
k6 run src/tests/load-tests/application-validate.js
```

#### /payments-calculate

```
k6 run src/tests/load-tests/payments-calculate.js
```

#### /validation-run

```
k6 run src/tests/load-tests/validation-run.js
```

#### /validation-runs

```
k6 run src/tests/load-tests/validation-runs.js
```
