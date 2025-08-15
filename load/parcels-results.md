# Parcels Performance Test Results

This file contains a test run analysis, for parcels endpoint.
The timing information for each sql query is stored in data.txt.

The run was for 20vus and 30 seconds.

This was run locally against a localy running api on a macbook pro.

## Summary

| Metric               | Value             | Rate        |
| -------------------- | ----------------- | ----------- |
| **Total Checks**     | 514               | 16.846301/s |
| **Checks Succeeded** | 100.00% (514/514) | ✅          |
| **Checks Failed**    | 0.00% (0/514)     | ✅          |

✅ **Status Check**: All requests returned status 200

## HTTP Performance

| Metric                         | Average | Min      | Median | Max   | p(90) | p(95) |
| ------------------------------ | ------- | -------- | ------ | ----- | ----- | ----- |
| **Request Duration**           | 1.18s   | 627.62ms | 1.18s  | 1.59s | 1.3s  | 1.4s  |
| **Expected Response Duration** | 1.18s   | 627.62ms | 1.18s  | 1.59s | 1.3s  | 1.4s  |

| Metric              | Value         | Rate        |
| ------------------- | ------------- | ----------- |
| **Failed Requests** | 0.00% (0/514) | ✅          |
| **Total Requests**  | 514           | 16.846301/s |

## Execution Metrics

| Metric                 | Average | Min      | Median | Max   | p(90) | p(95) |
| ---------------------- | ------- | -------- | ------ | ----- | ----- | ----- |
| **Iteration Duration** | 1.18s   | 627.72ms | 1.18s  | 1.59s | 1.3s  | 1.41s |

| Metric                  | Value | Rate           |
| ----------------------- | ----- | -------------- |
| **Iterations**          | 514   | 16.846301/s    |
| **Virtual Users (VUs)** | 20    | min=20, max=20 |
| **Max VUs**             | 20    | min=20, max=20 |

## Network Usage

| Metric            | Total  | Rate     |
| ----------------- | ------ | -------- |
| **Data Received** | 517 kB | 17 kB/s  |
| **Data Sent**     | 156 kB | 5.1 kB/s |

## SQL Queries for Multiple Requests (Load Test)

### Query Performance Summary

| Query Type                  | Count | Total Time         | Average Time | Percentage of Total |
| --------------------------- | ----- | ------------------ | ------------ | ------------------- |
| **getLandData**             | 514   | 46,766ms (46.8s)   | 90.98ms      | 8.0%                |
| **getAgreementsForParcel**  | 514   | 33,106ms (33.1s)   | 64.41ms      | 5.6%                |
| **getCompatibilityMatrix**  | 514   | 75,169ms (75.2s)   | 146.24ms     | 12.8%               |
| **getEnabledActions**       | 514   | 33,393ms (33.4s)   | 64.97ms      | 5.7%                |
| **getLandCoversForActions** | 4,112 | 179,372ms (179.4s) | 43.62ms      | 30.5%               |
| **getLandCoversForParcel**  | 2,056 | 142,194ms (142.2s) | 69.16ms      | 24.2%               |
| **getLandCoverDefinitions** | 2,056 | 77,557ms (77.6s)   | 37.72ms      | 13.2%               |

### Overall Load Test Statistics

| Metric                       | Value                                      |
| ---------------------------- | ------------------------------------------ |
| **Total Queries Executed**   | 10,280                                     |
| **Total Query Time**         | 587,557ms (9.79 minutes)                   |
| **Average Query Time**       | 57.14ms                                    |
| **Slowest Query Type (avg)** | getCompatibilityMatrix (146.24ms)          |
| **Fastest Query Type (avg)** | getLandCoverDefinitions (37.72ms)          |
| **Most Frequent Query**      | getLandCoversForActions (4,112 executions) |

### Performance Insights

**Query Efficiency Analysis:**

- **🔴 Performance Bottlenecks**: `getCompatibilityMatrix` (146ms avg) and `getLandData` (91ms avg)
- **🟡 Moderate Performance**: `getLandCoversForParcel` (69ms avg) and `getEnabledActions` (65ms avg)
- **🟢 High Performance**: `getLandCoverDefinitions` (38ms avg) and `getLandCoversForActions` (44ms avg)

**Resource Usage Distribution:**

- **getLandCoversForActions**: Highest volume (40% of all queries) with good efficiency
- **getCompatibilityMatrix**: Lowest volume but highest individual cost (146ms avg)
- **Combined land cover queries**: 67.9% of total query time (399s out of 588s)

**Performance Comparison vs Other Tests:**

- **Similar query volume**: ~10,280 queries vs ~10,360 in previous tests
- **Slightly slower overall**: 57.14ms avg vs 56.7ms in previous test
- **getCompatibilityMatrix degradation**: 146ms vs 129ms (13% slower)
