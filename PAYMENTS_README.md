<h1 style="color: mediumpurple;"> Land Grants Payment Hub Integration</h1>

## Overview

Our Land Grants system will allow farmers to easily find funding for their land or farms. In order to achieve this, we'll present an intuitive solution to guide them through the process of applying for specific funding. Once the user has completed the form and we've checked that everything is correct and we can provide funding, we'll be using Payment Hub to request a payment and a statement for the user.

## What is the Payment Hub

The Payment Hub is a strategic payment management service for paying customers within Defra and related Arm’s Length Bodies, such as the Rural Payments Agency (RPA). All payments processed by the Payment Hub are paid by the RPA’s D365 payment system.
The Payment Hub applies common processes and rules to payment requests or post payment adjustments, which reduces the need for this to be done on a per scheme basis. This patterned approach reduces time, cost and risk, as the validation, automation and error handling built into the service reduces the likelihood of errors.

## How we'll be using Payments Hub

In order to trigger a payment request to the Payment Hub, we'll be using their Service Bus Topic `fcc-pay-request`. We'll send messages to the topic with the relevant payment information.

### Authentication

The Payment Service Bus provides a connection string we'll use in our service to connect to it. The string comes with an authentication key which will be stored safely within our service infrastructure. It will look like this:

```
sb://<sb-namespace>.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=<key-value>`
```

### Core Workflows

1. Farmer Sarah has applied for action CSAM1 on her land parcel XYZ.
2. Farmer John has applied for actions CSAM1 and CSAM3 on his land parcel XYZ.
3. Farmer Peter has applied for CSAM1 on land parcel ABC and AHW10 on land parcel XYZ.
4. ????? Anything else ????

### Integration Points

To be completed, we are not sure at what specific point the payment will be triggered.

## Payload Format

### Request Format

This is an example of the payload sent to Payment Hub when requesting a payment:

```json
{
  "sourceSystem": "AHWR",
  "frn": 1234567890,
  "sbi": 123456789,
  "marketingYear": 2022,
  "paymentRequestNumber": 1,
  "paymentType": 1,
  "correlationId": "123e4567-e89b-12d3-a456-426655440000",
  "invoiceNumber": "S1234567S1234567V001",
  "agreementNumber": "AHWR12345678",
  "contractNumber": "S1234567",
  "currency": "GBP",
  "schedule": "Q4",
  "dueDate": "09/11/2022",
  "value": 500,
  "debtType": "irr",
  "recoveryDate": "09/11/2021",
  "pillar": "DA",
  "originalInvoiceNumber": "S1234567S1234567V001",
  "originalSettlementDate": "09/11/2021",
  "invoiceCorrectionReference": "S1234567S1234567V001",
  "trader": "123456A",
  "vendor": "123456A",
  "invoiceLines": [
    {
      "value": 500,
      "description": "G00 - Gross value of claim",
      "schemeCode": "A1234",
      "standardCode": "ahwr-cows",
      "accountCode": "SOS123",
      "deliveryBody": "RP00",
      "marketingYear": 2022,
      "convergence": false,
      "stateAid": false
    }
  ]
}
```

| Parameter                  | Type    | Required | Description                                           | FRPS notes                                                                  | Example                              |
| -------------------------- | ------- | -------- | ----------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------ |
| sourceSystem               | string  | Yes      | System identifier request originates from             | New record in payments hub for FRPS                                         | AHWR                                 |
| frn                        | number  | Yes      | Firm Reference Number                                 | We should record this alongside SBI                                         | 1234567890                           |
| sbi                        | number  | No       | Single Business Identifier                            |                                                                             | 123456789                            |
| marketingYear              | number  | Yes      | Scheme year for request (2021-2099)                   | How consequential is this? We will move away from scheme years              | 2022                                 |
| paymentRequestNumber       | number  | Yes      | Version of payment request starting with 1            | Is this schema version?                                                     | v1                                   |
| paymentType                | number  | No       | Defines type of payment request (1-3)                 |                                                                             | 1                                    |
| correlationId              | uuid    | No       | Correlation ID for payment request chain              | I assume we generate this depending on which requests we want to associate? | 123e4567-e89b-12d3-a456-426655440000 |
| invoiceNumber              | string  | No       | Invoice number                                        | Can we ignore this?                                                         | S1234567S1234567V001                 |
| agreementNumber            | string  | Yes      | Unique reference number for agreement/application     | What happens to this once sent? How does single agreement affect this?      | AHWR12345678                         |
| contractNumber             | string  | No       | Contract reference number of agreement                | Can we ignore this?                                                         | vS1234567                            |
| currency                   | string  | No       | Currency of values (Default: GBP)                     |                                                                             | GBP                                  |
| schedule                   | string  | No       | Payment frequency (Q4, M12, T4)                       | Which one is quarterly?                                                     | Q4                                   |
| dueDate                    | string  | No       | Date request should be issued (Default: Current date) | Can we ignore this?                                                         | 09/11/2022                           |
| value                      | decimal | Yes      | Decimal net value of request before enrichment        | Is this the annual total?                                                   | 500.00                               |
| debtType                   | string  | No       | Only for recoveries (irr/adm)                         | Out of scope for now                                                        | irr                                  |
| recoveryDate               | string  | No       | Only for recoveries, date debt was discovered         | Out of scope for now                                                        | 09/11/2021                           |
| pillar                     | string  | No       | Pillar of scheme for manual invoices                  | N/A                                                                         | DA                                   |
| originalInvoiceNumber      | string  | No       | Original invoice number (manual invoices only)        | N/A                                                                         | S1234567S1234567V001                 |
| originalSettlementDate     | string  | No       | Original date of settlement (manual invoices only)    | N/A                                                                         | 09/11/2021                           |
| invoiceCorrectionReference | string  | No       | Invoice number used for correction                    | Out of scope for now                                                        | S1234567S1234567V001                 |
| trader                     | string  | No       | Trader identifier                                     | N/A                                                                         | 123456A                              |
| vendor                     | string  | No       | Vendor identifier                                     | N/A                                                                         | 123456A                              |
| invoiceLines               | array   | Yes      | List of Invoice lines that make up request            | To discuss - what can we provide here?                                      | -                                    |

| Invoice Line Parameter | Type    | Required | Description                                     | Example                    |
| ---------------------- | ------- | -------- | ----------------------------------------------- | -------------------------- |
| value                  | decimal | Yes      | Value of invoice line                           | 500.00                     |
| description            | string  | Yes      | Description of invoice line item                | G00 - Gross value of claim |
| schemeCode             | string  | Yes      | Unique funding option code                      | A1234                      |
| standardCode           | string  | No       | Funding option code to be mapped to scheme code | ahwr-cows                  |
| accountCode            | string  | No       | Unique account code for budgeting               | SOS123                     |
| deliveryBody           | string  | No       | Delivery body responsible for payment           | RP00                       |
| marketingYear          | number  | No       | Scheme year                                     | 2022                       |
| convergence            | boolean | No       | Whether line is for convergence funding         | false                      |
| stateAid               | boolean | No       | Whether line is for state aid funding           | false                      |

_<p style="color: mediumpurple;">Currently the statement produced by the Payment Hub does not specify which action/s the payment is for.
This leaves the farmer with no way to know the purpose of the payment. It puts them in a position where they are reluctant to use the money for fear of breaking their agreement ans spending the money in the wrong area.
Going forward, we would like to provide this information to solve this problem.</p>_
