# Non-goals

## Не делаем в MVP

- Google Sheets integration.
- Google Forms integration.
- Apps Script.
- Drive API.
- Excel as database.
- Складской учет.
- Серийное производство гитар.
- Интеграции с 1С.
- Онлайн-кассы.
- Банковские интеграции.
- Сложный биллинг SaaS-тарифов.
- Нативные iOS/Android приложения.

## Не копируем из таблицы

- листы;
- ячейки;
- формулы;
- внешний вид;
- логику чекбокса `Оплачен` как source of truth.

Вместо чекбокса оплаты используется таблица `Payment` и вычисляемый/обновляемый `paymentStatus`.
