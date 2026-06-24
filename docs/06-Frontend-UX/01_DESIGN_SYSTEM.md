# Design System

## Стиль

`dark glassmorphism iphone last ios modern with bright colors on small details`

Перевод в UI:

- основа: глубокий темный фон;
- поверхности: полупрозрачные карточки с blur;
- акценты: яркие цвета только на CTA, статусах, графиках, бейджах;
- формы: крупные, мягкие, понятные;
- анимации: короткие, дорогие, без цирка;
- ощущение: iOS 18/26 style control center + premium finance app.

## Цвета

База:

```css
--bg: #05050B;
--bg-soft: #0B0B14;
--surface: rgba(255, 255, 255, 0.08);
--surface-strong: rgba(255, 255, 255, 0.12);
--border: rgba(255, 255, 255, 0.14);
--text: #F7F7FB;
--text-muted: rgba(247, 247, 251, 0.64);
```

Orchid accents:

```css
--orchid-yellow: #FFCB05;
--orchid-orange: #F58220;
--orchid-red: #D71920;
--orchid-blue: #00669B;
--orchid-graphite: #414141;
```

Дополнительные статусы:

```css
--success: #35F29A;
--warning: #FFCB05;
--danger: #FF4D6D;
--info: #4DA3FF;
```

## Компоненты

### AppShell

- dark gradient background;
- safe area paddings;
- mobile bottom navigation;
- desktop sidebar от 1024px.

### GlassCard

Основной контейнер:

- border 1px rgba white;
- backdrop blur;
- border radius 24px;
- subtle inner highlight;
- shadow.

### MoneyCard

Карточка KPI:

- крупная сумма;
- подпись;
- delta;
- маленький sparkline или accent glow.

### StatusBadge

Цветные бейджи:

- accepted — blue;
- in progress — orange;
- ready — success;
- issued — graphite;
- cancelled — danger.

### BottomSheetForm

Для mobile форм:

- drag handle;
- sticky submit button;
- крупные поля;
- автоскролл к ошибке;
- кнопка закрытия.

### FloatingActionButton

Одна главная кнопка `+`.

При клике открывает quick action sheet:

- Новый ремонт;
- Новый расход;
- Принять оплату;
- Новый клиент.

## Typography

- Заголовки: крупные, плотные.
- Цифры: tabular nums.
- Минимум мелкого текста.

## Motion

Framer Motion:

- page transition: 120–180ms;
- cards appear: 80–120ms stagger;
- bottom sheet spring;
- не анимировать всё подряд.
