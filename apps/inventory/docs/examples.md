# Example Documents

This document provides example MongoDB documents for the inventory management system.

## Product Document Example

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "sku": "LAPTOP-HP-E450",
  "name": "HP EliteBook 450 G9",
  "internationalName": "HP EliteBook 450 G9",
  "description": "Professional laptop with Intel Core i7, 16GB RAM, 512GB SSD",
  "barcode": "0195122027575",
  "scope": "organization",
  "organizationId": "507f1f77bcf86cd799439012",
  "type": "finished_good",
  "status": "active",
  "unit": "piece",
  "trackingType": "serial",
  "hazardLevel": "none",
  "storageConditions": {
    "temperatureMin": 10,
    "temperatureMax": 35,
    "requirements": ["dry", "ventilated"]
  },
  "minStockLevel": 5,
  "currentVersion": 1,
  "versionCreatedAt": "2024-01-10T00:00:00.000Z",
  "createdBy": "507f1f77bcf86cd799439014",
  "createdAt": "2024-01-10T00:00:00.000Z"
}
```

## Inventory Stock Document Example

```json
{
  "_id": "507f1f77bcf86cd799439031",
  "productId": "507f1f77bcf86cd799439011",
  "productSnapshot": {
    "id": "507f1f77bcf86cd799439011",
    "sku": "LAPTOP-HP-E450",
    "name": "HP EliteBook 450 G9",
    "unit": "piece"
  },
  "warehouseId": "507f1f77bcf86cd799439032",
  "availableQuantity": 45,
  "reservedQuantity": 5,
  "valuationMethod": "average",
  "averageCost": 25000000,
  "zone": "A",
  "aisle": "01",
  "rack": "05",
  "bin": "B3",
  "createdAt": "2024-01-05T00:00:00.000Z"
}
```

## Transaction Document (IN) Example

```json
{
  "_id": "507f1f77bcf86cd799439041",
  "transactionNumber": "TXN20240110001",
  "type": "in",
  "status": "completed",
  "productId": "507f1f77bcf86cd799439011",
  "destinationWarehouseId": "507f1f77bcf86cd799439032",
  "quantity": 10,
  "unitCost": 25000000,
  "referenceType": "purchase_order",
  "referenceNumber": "PO-2024-001",
  "notes": "Received from supplier",
  "stockBefore": 35,
  "stockAfter": 45,
  "transactionDate": "2024-01-10T12:30:00.000Z",
  "createdBy": "507f1f77bcf86cd799439014"
}
```

See the full documentation for more details.
