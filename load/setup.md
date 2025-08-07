# Load testing with k6

https://grafana.com/docs/k6/latest/

### setup

```
brew install k6
```

### run local

```
k6 run load/health.js
```

```
k6 run load/parcels.js
```

### run dev

run against dev

```
k6 run load/health.js --env TEST_ENV=dev
```

```
k6 run load/parcels.js --env TEST_ENV=dev
```
