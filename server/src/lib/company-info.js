/**
 * Static company knowledge fed to the AI assistant as grounding context.
 *
 * ⚠️ EDIT THIS FILE to teach the assistant about your business. Everything the
 * AI is allowed to say about the company (vs. the live product catalog, which
 * is pulled from the database) comes from here. Keep it factual and concise —
 * the whole text is sent on every request, so avoid padding.
 *
 * The assistant answers in the visitor's language (uz/ru/en), so this can stay
 * in a single language; the model translates facts as needed. Written in a
 * mostly language-neutral / English form for token efficiency.
 */
export const COMPANY_INFO = `
COMPANY: MANOKIP — manufacturer and supplier of industrial control & measuring instruments.
FOUNDED: 2018. Engineered and calibrated in Tashkent, Uzbekistan.
HEADQUARTERS / SHOWROOM: Tashkent, Uzbekistan — Bektemir district, Rohat 13A.
PRESENCE: Tashkent · Moscow · Almaty. Ships to 14 countries.
PHONE: +998 93 693-92-20.

WHAT WE MAKE (product families):
- Manometers / pressure gauges
- Pressure switches (pressure relays)
- Solar panels
- Level gauges
- Protection relays
(The live catalog with exact models, ranges, diameters, accuracy classes, prices
and stock is provided separately to you — always prefer it for specifics.)

SERVICES:
- Calibration
- Verification (metrological)
- Repair
- Custom / special orders
- Technical documentation
- Training

INDUSTRIES SERVED: oil & gas, mining, chemical, HVAC / heating, power generation, railway.

CERTIFICATIONS / STANDARDS: ISO 9001, GOST R, EAC, O'zStandart.

HOW TO BUY / GET A QUOTE:
- Add products to the cart and place an order on the site, or
- Use "Request a quote" (KP) on the Contacts page for bulk / custom needs.
- For anything the assistant cannot resolve, offer to connect a human operator.
`.trim();
