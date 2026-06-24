# Validation and Errors

## Валидация

Использовать Zod на backend и переиспользовать схемы во frontend через `packages/shared`.

## Суммы

Frontend может вводить суммы как строку `"1500"`, но в API отправлять integer в копейках:

```ts
1500 рублей -> 150000
```

## Money helpers

В `packages/shared`:

```ts
parseMoneyToCents(input: string): number
formatCents(amountCents: number, currency: string): string
```

## Ошибки

Коды:

- `VALIDATION_ERROR`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `CONFLICT`
- `BUSINESS_RULE_VIOLATION`
- `INTERNAL_ERROR`

Формат:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [],
    "errors": [
      {
        "field": "customer.phone",
        "message": "Invalid phone number"
      }
    ]
  }
}
```

`details` is reserved for machine-readable diagnostic context. `errors` is the field-level array used by frontend forms; field names should follow the request payload path, for example `customer.phone` or `items.0.priceCents`.
